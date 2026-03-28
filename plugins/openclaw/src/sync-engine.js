const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const { APIClient } = require('./api-client');
const { getPluginDir } = require('./config');

class SyncEngine extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.api = new APIClient(config.cloud_url, config.token);
    this.profilesDir = path.join(getPluginDir(), 'profiles');
    this.watcher = null;
    this.ws = null;
    this.connected = false;
    this.localVersion = 0;
    this.serverVersion = 0;
  }

  async initialize() {
    console.log('[SoulSync] Initializing sync engine...');

    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
      console.log('[SoulSync] Created profiles directory');
    }

    await this.downloadAll();
    await this.connectWebSocket();

    console.log('[SoulSync] Sync engine initialized');
    return true;
  }

  async downloadAll() {
    try {
      const result = await this.api.getProfiles();
      if (result.status === 200 && result.body) {
        const { content, version } = result.body;
        this.serverVersion = version || 0;

        if (content && typeof content === 'object') {
          for (const [filename, fileContent] of Object.entries(content)) {
            const filePath = path.join(this.profilesDir, filename);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, fileContent, 'utf-8');
            console.log(`[SoulSync] Downloaded: ${filename}`);
          }
        }
        console.log(`[SoulSync] Downloaded ${Object.keys(content || {}).length} files (version ${this.serverVersion})`);
      }
    } catch (e) {
      console.error('[SoulSync] Failed to download profiles:', e.message);
    }
  }

  async uploadFile(filename) {
    try {
      const filePath = path.join(this.profilesDir, filename);
      if (!fs.existsSync(filePath)) {
        console.log(`[SoulSync] File not found: ${filename}`);
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
        console.log(`[SoulSync] Uploaded: ${filename} (version ${this.serverVersion})`);
      } else if (result.status === 409) {
        console.log(`[SoulSync] Conflict detected for: ${filename}`);
        await this.handleConflict(filename);
      }
    } catch (e) {
      console.error(`[SoulSync] Failed to upload ${filename}:`, e.message);
    }
  }

  async downloadFile(filename) {
    try {
      const result = await this.api.getProfiles();
      if (result.status === 200 && result.body && result.body.content) {
        const content = result.body.content[filename];
        if (content) {
          const filePath = path.join(this.profilesDir, filename);
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`[SoulSync] Downloaded: ${filename}`);
          return true;
        }
      }
    } catch (e) {
      console.error(`[SoulSync] Failed to download ${filename}:`, e.message);
    }
    return false;
  }

  async buildProfilesContent() {
    const profiles = {};
    const files = ['SOUL.md', 'USER.md', 'MEMORY.md'];

    for (const filename of files) {
      const filePath = path.join(this.profilesDir, filename);
      if (fs.existsSync(filePath)) {
        profiles[filename] = fs.readFileSync(filePath, 'utf-8');
      }
    }

    return profiles;
  }

  async handleConflict(filename) {
    const localPath = path.join(this.profilesDir, filename);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const conflictPath = path.join(this.profilesDir, `${filename}.conflict.${timestamp}`);

    try {
      fs.copyFileSync(localPath, conflictPath);
      console.log(`[SoulSync] Conflict saved: ${conflictPath}`);
    } catch (e) {
      console.error('[SoulSync] Failed to save conflict file:', e.message);
    }

    await this.downloadFile(filename);
  }

  startWatching() {
    if (this.watcher) {
      return;
    }

    this.watcher = chokidar.watch(this.profilesDir, {
      ignored: /\.conflict\./,
      persistent: true,
      ignoreInitial: true
    });

    this.watcher.on('change', async (filePath) => {
      const filename = path.basename(filePath);
      console.log(`[SoulSync] File changed: ${filename}`);
      await this.uploadFile(filename);
    });

    this.watcher.on('add', async (filePath) => {
      const filename = path.basename(filePath);
      if (!filename.includes('.conflict.')) {
        console.log(`[SoulSync] File added: ${filename}`);
        await this.uploadFile(filename);
      }
    });

    this.watcher.on('unlink', (filePath) => {
      const filename = path.basename(filePath);
      console.log(`[SoulSync] File removed: ${filename}`);
    });

    console.log('[SoulSync] Started watching profiles directory');
  }

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[SoulSync] Stopped watching');
    }
  }

  async connectWebSocket() {
    try {
      const wsUrl = this.config.cloud_url.replace('http', 'ws') + '/ws';
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        }
      });

      this.ws.on('open', () => {
        this.connected = true;
        console.log('[SoulSync] WebSocket connected');
        this.startWatching();
      });

      this.ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data);
          await this.handleWebSocketMessage(msg);
        } catch (e) {
          console.error('[SoulSync] WebSocket message parse error:', e.message);
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        console.log('[SoulSync] WebSocket disconnected');
        this.scheduleReconnect();
      });

      this.ws.on('error', (e) => {
        console.error('[SoulSync] WebSocket error:', e.message);
      });
    } catch (e) {
      console.error('[SoulSync] Failed to connect WebSocket:', e.message);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    setTimeout(() => {
      if (!this.connected) {
        console.log('[SoulSync] Attempting WebSocket reconnection...');
        this.connectWebSocket();
      }
    }, 5000);
  }

  async handleWebSocketMessage(msg) {
    switch (msg.type) {
      case 'profile_updated':
        if (msg.filename) {
          await this.downloadFile(msg.filename);
        } else {
          await this.downloadAll();
        }
        break;
      case 'pong':
        break;
      default:
        console.log('[SoulSync] Unknown WebSocket message:', msg.type);
    }
  }

  disconnect() {
    this.stopWatching();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    console.log('[SoulSync] Disconnected');
  }
}

module.exports = { SyncEngine };