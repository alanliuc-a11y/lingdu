const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const { APIClient } = require('./api-client');

const SCENE_FIRST_DEVICE = 'SCENE_FIRST_DEVICE';
const SCENE_EMPTY_DEVICE = 'SCENE_EMPTY_DEVICE';
const SCENE_USED_DEVICE = 'SCENE_USED_DEVICE';
const SCENE_NO_DATA = 'SCENE_NO_DATA';

const SYNC_FILES = ['SOUL.md', 'USER.md', 'MEMORY.md', 'TOOLS.md'];
const ADDITIVE_FILES = ['MEMORY.md', 'TOOLS.md'];
const EXCLUSIVE_FILES = ['SOUL.md'];
const BACKUP_FILE_PATTERN = /_backup_\d{8}_\d{6}_[a-zA-Z0-9]+\.md$/;
const BACKUP_KEEP_COUNT = 10;

class SyncEngine extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.api = new APIClient(config.cloud_url, config.token);
    this.profilesDir = path.join(os.homedir(), '.openclaw', 'workspace');
    this.watcher = null;
    this.ws = null;
    this.connected = false;
    this.localVersion = 0;
    this.serverVersion = 0;
    this.heartbeatInterval = null;
    this.deviceId = this.config.device_id || 'unknown';
    this.deviceIdShort = this.deviceId.substring(0, 8);
    this.pendingChanges = [];
    this.isSyncing = false;
  }

  async initialize() {
    console.log('[LingDu] Initializing sync engine...');
    console.log(`[LingDu] Profiles directory: ${this.profilesDir}`);
    console.log(`[LingDu] Device ID: ${this.deviceIdShort}`);

    const result = await this.api.getProfiles();
    const serverContent = (result.status === 200 && result.body && result.body.content) ? result.body.content : {};
    const serverVersion = (result.status === 200 && result.body) ? result.body.version || 0 : 0;

    const { scene } = this.detectScene(serverContent);
    this.serverVersion = serverVersion;

    const sceneResult = await this.handleScene(scene, serverContent);

    if (sceneResult && !sceneResult.success) {
      console.log(`[LingDu] ${sceneResult.message}`);
    }

    await this.connectWebSocket();

    console.log(`[LingDu] Sync engine initialized - localVersion: ${this.localVersion}, serverVersion: ${this.serverVersion}`);
    return sceneResult;
  }

  detectScene(serverContent) {
    const localFileStates = {};
    let localNonEmptyCount = 0;
    let localEmptyCount = 0;

    for (const filename of SYNC_FILES) {
      const filePath = path.join(this.profilesDir, filename);
      const exists = fs.existsSync(filePath);
      const stats = exists ? fs.statSync(filePath) : null;
      const size = stats ? stats.size : 0;
      const isNonEmpty = exists && size > 10;

      localFileStates[filename] = { exists, size, isNonEmpty };

      if (isNonEmpty) {
        localNonEmptyCount++;
      } else {
        localEmptyCount++;
      }
    }

    const serverHasData = serverContent && Object.keys(serverContent).length > 0;
    const serverNonEmptyKeys = serverHasData ? Object.keys(serverContent).filter(k => serverContent[k] && serverContent[k].length > 10) : [];
    const serverHasNonEmptyData = serverNonEmptyKeys.length > 0;

    let scene;
    if (!serverHasNonEmptyData && localNonEmptyCount > 0) {
      scene = SCENE_FIRST_DEVICE;
    } else if (serverHasNonEmptyData && localNonEmptyCount === 0) {
      scene = SCENE_EMPTY_DEVICE;
    } else if (serverHasNonEmptyData && localNonEmptyCount > 0) {
      scene = SCENE_USED_DEVICE;
    } else {
      scene = SCENE_NO_DATA;
    }

    console.log(`[LingDu] Scene detected: ${scene}`);
    console.log(`[LingDu] Local non-empty: ${localNonEmptyCount}, Server has data: ${serverHasNonEmptyData}`);

    return { scene, localFileStates };
  }

  async handleScene(scene, serverContent) {
    switch (scene) {
      case SCENE_FIRST_DEVICE:
        console.log('[LingDu] Uploading local data to cloud (first device)');
        await this.uploadAll();
        return { success: true, message: '已将本地灵魂数据上传至云端，完成初始�? };

      case SCENE_EMPTY_DEVICE:
        console.log('[LingDu] Downloading cloud data to local (empty device)');
        await this.downloadAll();
        return { success: true, message: '已从云端拉取最新配置，设备已对齐全局基准' };

      case SCENE_USED_DEVICE:
        console.log('[LingDu] Merging local and cloud data (used device)');
        await this.mergeAll(serverContent);
        return { success: true, message: '本地数据与云端数据已安全合并，历史内容均已保�? };

      case SCENE_NO_DATA:
        console.log('[LingDu] No data available');
        return { success: false, message: '未检测到灵魂数据，请初始�?OpenClaw 配置后重�? };

      default:
        return { success: false, message: 'Unknown scene' };
    }
  }

  async downloadAll() {
    try {
      console.log('[LingDu] downloadAll() called');

      const result = await this.api.getProfiles();
      console.log(`[LingDu] API getProfiles response:`, JSON.stringify(result).substring(0, 200));

      if (result.status === 200 && result.body) {
        const profile = result.body;
        console.log(`[LingDu] Profile:`, JSON.stringify(profile).substring(0, 200));

        if (profile.content) {
          const { scene } = this.detectScene(profile.content);

          if (scene === SCENE_NO_DATA) {
            console.log('[LingDu] No data in cloud');
            this.serverVersion = profile.version || 0;
            this.localVersion = this.getLocalVersion();
            return;
          }

          if (scene === SCENE_EMPTY_DEVICE) {
            for (const [filename, content] of Object.entries(profile.content)) {
              await this.writeFileSafe(filename, content);
            }
          } else if (scene === SCENE_USED_DEVICE) {
            await this.mergeAll(profile.content);
          } else if (scene === SCENE_FIRST_DEVICE) {
            console.log('[LingDu] First device - uploading local data');
          }

          this.serverVersion = profile.version || 0;
          this.localVersion = this.getLocalVersion();
          console.log(`[LingDu] Updated versions - server: ${this.serverVersion}, local: ${this.localVersion}`);
        } else {
          console.log('[LingDu] No content in profile');
          this.localVersion = this.getLocalVersion();
        }
      } else {
        console.log(`[LingDu] getProfiles failed: ${result.status}`);
        this.localVersion = this.getLocalVersion();
      }
    } catch (e) {
      console.error('[LingDu] downloadAll error:', e.message);
      this.localVersion = this.getLocalVersion();
    }
  }

  getLocalVersion() {
    let maxMtime = 0;
    for (const filename of SYNC_FILES) {
      const filePath = path.join(this.profilesDir, filename);
      if (fs.existsSync(filePath)) {
        const mtime = fs.statSync(filePath).mtime.getTime();
        if (mtime > maxMtime) {
          maxMtime = mtime;
        }
      }
    }
    return maxMtime;
  }

  async mergeAll(serverContent) {
    for (const filename of SYNC_FILES) {
      const serverData = serverContent ? serverContent[filename] : null;
      const localPath = path.join(this.profilesDir, filename);
      const localExists = fs.existsSync(localPath);
      const localContent = localExists ? fs.readFileSync(localPath, 'utf-8') : '';

      const localIsEmpty = !localExists || localContent.length <= 10;
      const serverIsEmpty = !serverData || serverData.length <= 10;

      if (localIsEmpty && serverIsEmpty) {
        continue;
      }

      if (localIsEmpty) {
        await this.writeFileSafe(filename, serverData);
      } else if (serverIsEmpty) {
        continue;
      } else {
        const merged = await this.mergeFile(filename, localContent, serverData);
        await this.writeFileSafe(filename, merged);
      }
    }
  }

  async mergeFile(filename, localContent, serverContent) {
    if (ADDITIVE_FILES.includes(filename)) {
      return this.mergeAdditive(localContent, serverContent);
    } else if (EXCLUSIVE_FILES.includes(filename)) {
      return this.mergeExclusive(filename, localContent, serverContent);
    } else {
      return localContent;
    }
  }

  async mergeAdditive(localContent, serverContent) {
    const localItems = this.parseAdditiveItems(localContent);
    const serverItems = this.parseAdditiveItems(serverContent);

    const localItemMap = new Map();
    for (const item of localItems) {
      const ts = this.extractItemTimestamp(item);
      localItemMap.set(item, { item, timestamp: ts, source: 'local' });
    }

    const mergedItems = [...localItems.map(item => ({ item, timestamp: this.extractItemTimestamp(item), source: 'local' }))];

    for (const item of serverItems) {
      const isDuplicate = localItemMap.has(item);
      if (!isDuplicate) {
        mergedItems.push({ item, timestamp: this.extractItemTimestamp(item), source: 'server' });
      }
    }

    mergedItems.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      if (a.timestamp && !b.timestamp) {
        return -1;
      }
      if (!a.timestamp && b.timestamp) {
        return 1;
      }
      return 0;
    });

    return mergedItems.map(entry => `- ${entry.item}`).join('\n');
  }

  extractItemTimestamp(itemContent) {
    const match = itemContent.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s/);
    if (match) {
      return new Date(match[1]).getTime();
    }
    return null;
  }

  parseAdditiveItems(content) {
    if (!content || typeof content !== 'string') return [];
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('- ') && line.length > 2)
      .map(line => line.substring(2));
  }

  deduplicateItems(items) {
    const seen = new Set();
    const unique = [];
    for (const item of items) {
      if (!seen.has(item)) {
        seen.add(item);
        unique.push(item);
      }
    }
    return unique;
  }

  async mergeExclusive(filename, localContent, serverContent) {
    const localData = this.parseSoulFields(localContent, filename);
    const serverData = this.parseSoulFields(serverContent, filename);

    const merged = { ...serverData };

    for (const [field, localValue] of Object.entries(localData)) {
      const serverValue = serverData[field];
      const localTime = this.parseTimestamp(localValue?.last_modified);
      const serverTime = this.parseTimestamp(serverValue?.last_modified);

      if (!localTime && !serverTime) {
        merged[field] = localValue;
      } else if (!localTime) {
        merged[field] = serverValue;
      } else if (!serverTime) {
        merged[field] = localValue;
      } else if (localTime > serverTime) {
        merged[field] = localValue;
      } else {
        merged[field] = serverValue;
      }
    }

    return this.formatSoulContent(merged);
  }

  parseSoulFields(content, filename) {
    if (!content || typeof content !== 'string') return {};

    const fields = {};

    const fieldDefs = [
      { name: 'ai_name', label: 'AI名称' },
      { name: 'core_personality', label: '核心人格' },
      { name: 'self_awareness', label: '自我认知' }
    ];

    for (const { name, label } of fieldDefs) {
      const valuePattern = new RegExp(`^[#\\s]*${label}[�?]\\s*(.+?)\\s*$`, 'im');
      const valueMatch = content.match(valuePattern);

      const lastModifiedPattern = new RegExp(`^${name}_last_modified[�?]\\s*(\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2})`, 'im');
      const lastModifiedMatch = content.match(lastModifiedPattern);

      const devicePattern = new RegExp(`^${name}_modified_device[�?]\\s*(.+?)\\s*$`, 'im');
      const deviceMatch = content.match(devicePattern);

      if (valueMatch) {
        let lastModified = null;
        if (lastModifiedMatch) {
          lastModified = this.parseTimestamp(lastModifiedMatch[1]);
        }
        if (!lastModified) {
          const globalTimestamp = this.extractTimestamp(content);
          if (globalTimestamp) {
            lastModified = globalTimestamp;
          } else {
            lastModified = this.getFileMtime(filename);
          }
        }

        fields[name] = {
          value: valueMatch[1].trim(),
          last_modified: lastModified,
          modified_device: deviceMatch ? deviceMatch[1].trim() : null
        };
      }
    }

    return fields;
  }

  extractTimestamp(content) {
    const timeMatch = content.match(/最后更新[�?]\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
    if (timeMatch) {
      return this.parseTimestamp(timeMatch[1]);
    }
    return null;
  }

  parseTimestamp(timeStr) {
    if (!timeStr) return 0;
    try {
      const date = new Date(timeStr.replace(/\s+/g, ' '));
      if (isNaN(date.getTime())) return 0;
      return date.getTime();
    } catch {
      return 0;
    }
  }

  getFileMtime(filename) {
    const filePath = path.join(this.profilesDir, filename);
    if (fs.existsSync(filePath)) {
      return fs.statSync(filePath).mtime.getTime();
    }
    return 0;
  }

  formatSoulContent(fields) {
    let content = '';
    const fieldLabels = {
      ai_name: 'AI名称',
      core_personality: '核心人格',
      self_awareness: '自我认知'
    };

    for (const [field, data] of Object.entries(fields)) {
      const label = fieldLabels[field];
      if (label && data?.value) {
        const timestamp = this.formatTimestamp(data.last_modified);
        content += `${label}�?{data.value}\n`;
        if (timestamp) {
          content += `最后更新：${timestamp}\n`;
        }
        content += '\n';
      }
    }

    return content.trim();
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().slice(0, 19) + 'Z';
  }

  async writeFileSafe(filename, content) {
    const filePath = path.join(this.profilesDir, filename);

    await this.createBackup(filename);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[LingDu] Written: ${filename} (${content.length} chars)`);
  }

  async createBackup(filename) {
    const filePath = path.join(this.profilesDir, filename);
    if (!fs.existsSync(filePath)) {
      return;
    }

    const timestamp = this.formatTimestampForBackup(Date.now());
    const backupName = `${filename}_backup_${timestamp}_${this.deviceIdShort}.md`;
    const backupPath = path.join(this.profilesDir, backupName);

    try {
      fs.copyFileSync(filePath, backupPath);
      console.log(`[LingDu] Backup created: ${backupName}`);

      await this.cleanOldBackups(filename);
    } catch (e) {
      console.error(`[LingDu] Failed to create backup: ${e.message}`);
    }
  }

  formatTimestampForBackup(timestamp) {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  async cleanOldBackups(filename) {
    const backupFiles = fs.readdirSync(this.profilesDir)
      .filter(f => f.startsWith(`${filename}_backup_`) && f.endsWith('.md'))
      .map(f => ({
        name: f,
        path: path.join(this.profilesDir, f),
        mtime: fs.statSync(path.join(this.profilesDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (backupFiles.length > BACKUP_KEEP_COUNT) {
      const toDelete = backupFiles.slice(BACKUP_KEEP_COUNT);
      for (const backup of toDelete) {
        try {
          fs.unlinkSync(backup.path);
          console.log(`[LingDu] Deleted old backup: ${backup.name}`);
        } catch (e) {
          console.error(`[LingDu] Failed to delete backup: ${e.message}`);
        }
      }
    }
  }

  isBackupFile(filename) {
    return BACKUP_FILE_PATTERN.test(filename);
  }

  async uploadAll() {
    try {
      const profiles = await this.buildProfilesContent();
      const result = await this.api.updateProfiles(profiles, this.serverVersion);

      if (result.status === 200) {
        const newVersion = result.body.version || this.serverVersion + 1;
        this.localVersion = newVersion;
        this.serverVersion = newVersion;
        console.log(`[LingDu] Uploaded all (version ${this.serverVersion})`);
      } else if (result.status === 409) {
        console.log('[LingDu] Conflict on uploadAll, merging...');
        const serverResult = await this.api.getProfiles();
        if (serverResult.status === 200 && serverResult.body) {
          await this.mergeAll(serverResult.body.content);
        }
      }
    } catch (e) {
      console.error(`[LingDu] Failed to upload all: ${e.message}`);
    }
  }

  async uploadFile(filename) {
    try {
      if (this.isBackupFile(filename)) {
        console.log(`[LingDu] Skipping backup file: ${filename}`);
        return;
      }

      console.log(`[LingDu] uploadFile() called for: ${filename}`);
      const filePath = path.join(this.profilesDir, filename);

      if (!fs.existsSync(filePath)) {
        console.log(`[LingDu] File not found: ${filename}`);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const profiles = await this.buildProfilesContent();
      profiles[filename] = content;

      const result = await this.api.updateProfiles(profiles, this.serverVersion);

      if (result.status === 200) {
        const newVersion = result.body.version || this.serverVersion + 1;
        this.localVersion = newVersion;
        this.serverVersion = newVersion;
        console.log(`[LingDu] Uploaded: ${filename} (version ${this.serverVersion})`);
      } else if (result.status === 409) {
        console.log(`[LingDu] Conflict detected for: ${filename}`);
        await this.handleConflict(filename);
      }
    } catch (e) {
      console.error(`[LingDu] Failed to upload ${filename}:`, e.message);
    }
  }

  async downloadFile(filename) {
    try {
      const result = await this.api.getProfiles();
      if (result.status === 200 && result.body && result.body.content) {
        const content = result.body.content[filename];
        if (content) {
          await this.writeFileSafe(filename, content);
          console.log(`[LingDu] Downloaded: ${filename}`);
          return true;
        }
      }
    } catch (e) {
      console.error(`[LingDu] Failed to download ${filename}: ${e.message}`);
    }
    return false;
  }

  async buildProfilesContent() {
    const profiles = {};

    for (const filename of SYNC_FILES) {
      const filePath = path.join(this.profilesDir, filename);
      if (fs.existsSync(filePath) && !this.isBackupFile(filename)) {
        profiles[filename] = fs.readFileSync(filePath, 'utf-8');
      }
    }

    return profiles;
  }

  async handleConflict(filename) {
    const localPath = path.join(this.profilesDir, filename);
    if (fs.existsSync(localPath)) {
      await this.createBackup(filename);
    }

    const serverResult = await this.api.getProfiles();
    if (serverResult.status === 200 && serverResult.body && serverResult.body.content) {
      const serverContent = serverResult.body.content[filename];
      if (serverContent) {
        const localContent = fs.existsSync(localPath) ? fs.readFileSync(localPath, 'utf-8') : '';
        const merged = await this.mergeFile(filename, localContent, serverContent);
        await this.writeFileSafe(filename, merged);
        console.log(`[LingDu] Conflict resolved for: ${filename}`);
      }
    }
  }

  startWatching() {
    if (this.watcher) {
      return;
    }

    this.watcher = chokidar.watch(this.profilesDir, {
      ignored: (filePath) => {
        const basename = path.basename(filePath);
        return this.isBackupFile(basename) || basename.includes('.conflict.');
      },
      persistent: true,
      ignoreInitial: true
    });

    this.watcher.on('change', async (filePath) => {
      const filename = path.basename(filePath);
      if (this.isBackupFile(filename) || filename.includes('.conflict.')) {
        return;
      }
      if (!SYNC_FILES.includes(filename)) {
        return;
      }
      console.log(`[LingDu] File changed: ${filename}`);
      await this.uploadFile(filename);
    });

    this.watcher.on('add', async (filePath) => {
      const filename = path.basename(filePath);
      if (this.isBackupFile(filename) || filename.includes('.conflict.')) {
        return;
      }
      if (!SYNC_FILES.includes(filename)) {
        return;
      }
      console.log(`[LingDu] File added: ${filename}`);
      await this.uploadFile(filename);
    });

    this.watcher.on('unlink', (filePath) => {
      const filename = path.basename(filePath);
      console.log(`[LingDu] File removed: ${filename}`);
    });

    console.log('[LingDu] Started watching profiles directory');
  }

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[LingDu] Stopped watching');
    }
  }

  async connectWebSocket() {
    try {
      const wsUrl = this.config.cloud_url.replace(/^http/, 'ws') + '/ws';
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        }
      });

      this.ws.on('open', () => {
        this.connected = true;
        console.log('[LingDu] WebSocket connected');
        this.startWatching();
        this.startHeartbeat();
      });

      this.ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'pong') {
            console.log('[LingDu] Heartbeat received');
          } else {
            await this.handleWebSocketMessage(msg);
          }
        } catch (e) {
          console.error('[LingDu] WebSocket message parse error:', e.message);
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        console.log('[LingDu] WebSocket disconnected');
        this.stopHeartbeat();
        this.scheduleReconnect();
      });

      this.ws.on('error', (e) => {
        console.error('[LingDu] WebSocket error:', e.message);
      });
    } catch (e) {
      console.error('[LingDu] Failed to connect WebSocket:', e.message);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    setTimeout(() => {
      if (!this.connected) {
        console.log('[LingDu] Attempting WebSocket reconnection...');
        this.connectWebSocket();
      }
    }, 5000);
  }

  async handleWebSocketMessage(msg) {
    switch (msg.type) {
      case 'profile_updated':
        console.log(`[LingDu] Received update notification, version: ${msg.version}`);
        await this.downloadAll();
        break;
      case 'pong':
        break;
      default:
        console.log('[LingDu] Unknown WebSocket message:', msg.type);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        console.log('[LingDu] Heartbeat sent');
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.stopWatching();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    console.log('[LingDu] Disconnected');
  }
}

module.exports = { SyncEngine, SCENE_FIRST_DEVICE, SCENE_EMPTY_DEVICE, SCENE_USED_DEVICE, SCENE_NO_DATA };