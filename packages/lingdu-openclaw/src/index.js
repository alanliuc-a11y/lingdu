const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('module');

const { SyncEngine, ConfigManager, DeviceCodeFlow, APIClient, createOAuthServer } = require('lingdu-core');
const { OPENCLAW_PLATFORM } = require('./platform');

let nodeProcess = null;
let deviceCodePolling = null;

function getPluginDir() {
  return path.dirname(path.dirname(__filename));
}

function makeRequest(method, urlPath, body = null, token = null) {
  const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
  const cfg = configMgr.load();
  const cloudUrl = (cfg && cfg.cloud_url) || 'https://soulsync.work';
  const api = new APIClient(cloudUrl, token);
  return api.request(method, urlPath, body);
}

async function getUserGreeting(token, deviceName) {
  let userName = '朋友';
  try {
    const userResult = await makeRequest('GET', '/api/auth/user/info', null, token);
    if (userResult.status === 200 && userResult.body) {
      if (userResult.body.name) {
        userName = userResult.body.name;
      } else if (userResult.body.email) {
        userName = userResult.body.email.split('@')[0];
      }
    }
  } catch (e) {
    console.error('[LingDu] Failed to get user info:', e.message);
  }
  return `${userName}你好，我是三澍，非常高兴能在 ${deviceName} 再次与你相遇。\n\n已同步 SOUL.md / USER.md / MEMORY.md`;
}

function detectAuthMode(api) {
  const hasChatAPI = api && typeof api.registerTool === 'function';
  const isSSH = process.env.SSH_CONNECTION || process.env.SSH_CLIENT || process.env.SSH_TTY;
  const isLocalTTY = process.stdin.isTTY && !isSSH;

  if (!hasChatAPI && isLocalTTY) return 'oauth-local';
  if (!hasChatAPI && isSSH) return 'device-code-cli';
  return 'device-code-chat';
}

async function startOAuthLocal() {
  try {
    const { server, port, waitForToken } = await createOAuthServer();
    const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
    const cloudUrl = configMgr.load()?.cloud_url || 'https://soulsync.work';
    const callbackUrl = `http://localhost:${port}/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = `${cloudUrl}/auth/oauth/start?port=${port}&callback=${encodeURIComponent(callbackUrl)}&state=${state}`;

    console.log('[LingDu] Opening browser for authorization...');

    const require2 = createRequire(__filename);
    const openPath = require2.resolve('open');
    const open = (await import(openPath)).default;
    await open(authUrl);

    console.log('[LingDu] Waiting for authorization...');

    const { token } = await waitForToken();

    const deviceId = crypto.randomUUID();
    const deviceName = ConfigManager.getDeviceName('local');

    configMgr.save({
      email: 'device',
      token: token,
      device_id: deviceId,
      device_name: deviceName,
      device_type: 'local',
      cloud_url: cloudUrl
    });

    const api = new APIClient(cloudUrl, token);
    await api.registerDevice(deviceId, deviceName, 'local');
    startNodeService('--start');

    const greeting = await getUserGreeting(token, deviceName);
    return { success: true, message: greeting };
  } catch (err) {
    return { success: false, message: `OAuth Error: ${err.message}` };
  }
}

async function startDeviceCodeCLI() {
  try {
    const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
    const cloudUrl = configMgr.load()?.cloud_url || 'https://soulsync.work';
    const flow = new DeviceCodeFlow(cloudUrl);
    const { device_code, auth_url } = await flow.requestCode();

    const homeDir = os.homedir();
    const pendingDir = path.join(homeDir, '.lingdu');
    if (!fs.existsSync(pendingDir)) {
      fs.mkdirSync(pendingDir, { recursive: true });
    }
    fs.writeFileSync(path.join(pendingDir, '.pending_auth'), JSON.stringify({
      deviceCode: device_code,
      authUrl: auth_url,
      timestamp: Date.now()
    }));

    console.log('[LingDu] Please visit the following URL to authorize:');
    console.log(`  ${auth_url}`);

    const token = await flow.waitForToken(device_code);

    const deviceId = crypto.randomUUID();
    const deviceName = ConfigManager.getDeviceName('ssh');

    configMgr.save({
      email: 'device',
      token: token,
      device_id: deviceId,
      device_name: deviceName,
      device_type: 'ssh',
      cloud_url: cloudUrl
    });

    const api = new APIClient(cloudUrl, token);
    await api.registerDevice(deviceId, deviceName, 'ssh');
    startNodeService('--start');

    const greeting = await getUserGreeting(token, deviceName);
    return { success: true, message: greeting };
  } catch (err) {
    return { success: false, message: `Error: ${err.message}` };
  }
}

async function startDeviceCodeFlow() {
  try {
    const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
    const cloudUrl = configMgr.load()?.cloud_url || 'https://soulsync.work';
    const flow = new DeviceCodeFlow(cloudUrl);
    const { device_code, auth_url, expires_in } = await flow.requestCode();

    const token = await flow.waitForToken(device_code, expires_in);

    const deviceId = crypto.randomUUID();
    const deviceName = ConfigManager.getDeviceName('cloud');

    configMgr.save({
      email: 'device',
      token: token,
      device_id: deviceId,
      device_name: deviceName,
      device_type: 'cloud',
      cloud_url: cloudUrl
    });

    const api = new APIClient(cloudUrl, token);
    await api.registerDevice(deviceId, deviceName, 'cloud');
    startNodeService('--start');

    const greeting = await getUserGreeting(token, deviceName);
    return { success: true, message: greeting };
  } catch (err) {
    return { success: false, message: `Error: ${err.message}` };
  }
}

function startNodeService(mode = '--start') {
  const pluginDir = getPluginDir();
  const daemonScript = path.join(pluginDir, 'src', 'daemon.js');

  console.log(`[LingDu] Starting Node.js sync service (${mode})...`);

  if (nodeProcess) {
    nodeProcess.kill();
    nodeProcess = null;
  }

  nodeProcess = spawn(process.execPath, [daemonScript, mode], {
    cwd: pluginDir,
    env: { ...process.env, OPENCLAW_PLUGIN: 'true', PLUGIN_DIR: pluginDir },
    stdio: 'ignore',
    detached: true
  });

  nodeProcess.on('close', (code) => {
    console.log(`[LingDu] Node.js process exited with code ${code}`);
    nodeProcess = null;
  });

  nodeProcess.on('error', (err) => {
    console.error(`[LingDu] Failed to start Node.js process: ${err}`);
    nodeProcess = null;
  });

  nodeProcess.unref();
}

function stopNodeService() {
  if (nodeProcess) {
    console.log('[LingDu] Stopping Node.js service...');
    nodeProcess.kill();
    nodeProcess = null;
  }
}

function checkConnection() {
  const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
  const cfg = configMgr.load();
  if (!cfg || !cfg.token) {
    return Promise.resolve({ connected: false, reason: 'not_configured' });
  }

  const api = new APIClient(cfg.cloud_url, cfg.token);
  return api.getProfiles()
    .then(result => {
      if (result.status === 200) return { connected: true, data: result.body };
      if (result.status === 401) return { connected: false, reason: 'token_expired' };
      return { connected: false, reason: 'server_error', status: result.status };
    })
    .catch(err => ({ connected: false, reason: 'connection_error', error: err.message }));
}

module.exports = function register(api) {
  console.log('[LingDu] Registering plugin...');

  registerChatTools(api);

  api.registerCli(
    ({ program }) => {
      program
        .command('lingdu:start')
        .description('启动 LingDu（灵渡）同步服务')
        .action(async () => {
          const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
          if (!configMgr.isAuthenticated()) {
            console.log('[LingDu] Not configured. Starting device authorization flow...');

            const authMode = detectAuthMode(null);
            let result;

            if (authMode === 'oauth-local') {
              result = await startOAuthLocal();
            } else if (authMode === 'device-code-cli') {
              result = await startDeviceCodeCLI();
            } else {
              result = await startDeviceCodeFlow();
            }

            if (result.success) {
              console.log(result.message);
            } else {
              console.error(`[LingDu] ${result.message}`);
            }
            return;
          }

          if (nodeProcess) {
            console.log('[LingDu] Service already running');
            return;
          }

          startNodeService('--start');
        });
    },
    { commands: ['lingdu:start'] }
  );

  api.registerCli(
    ({ program }) => {
      program
        .command('lingdu:stop')
        .description('停止 LingDu（灵渡）同步服务')
        .action(() => {
          stopNodeService();
          console.log('[LingDu] Service stopped');
        });
    },
    { commands: ['lingdu:stop'] }
  );

  if (new ConfigManager(OPENCLAW_PLATFORM.configDir).isAuthenticated()) {
    console.log('[LingDu] Auto-starting sync service...');
    startNodeService('--start');
  }

  console.log('[LingDu] Plugin loaded. Run "openclaw lingdu:start" to begin.');
  console.log('[LingDu] Plugin registered successfully');
};

function registerChatTools(api) {
  api.registerTool({
    name: 'lingdu_status',
    description: 'Check LingDu plugin status for OpenClaw (小龙虾). Call when user mentions LingDu, 灵渡, soul sync, SoulSync, or asks about sync status.',
    input_schema: { type: 'object', properties: {}, required: [] }
  }, async () => {
    const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
    const cfg = configMgr.load();
    if (!cfg || !cfg.token) {
      return { configured: false, message: 'LingDu is not configured. Would you like to connect your account?' };
    }

    const conn = await checkConnection();
    if (conn.connected) {
      return { configured: true, connected: true, email: cfg.email, message: `LingDu is connected and syncing for ${cfg.email}.` };
    } else if (conn.reason === 'token_expired') {
      return { configured: true, connected: false, message: 'LingDu token has expired. Would you like to reconnect your account?' };
    } else {
      return { configured: true, connected: false, message: `LingDu is configured but cannot connect to server: ${conn.reason}` };
    }
  });

  api.registerTool({
    name: 'lingdu_connect',
    description: '连接 LingDu（灵渡）服务。当用户说"安装lingdu"、"配置lingdu"、"连接lingdu"、"设置同步"、"开启灵魂同步"时调用。无需账号密码，会提供浏览器授权链接。',
    input_schema: { type: 'object', properties: {}, required: [] }
  }, async () => {
    const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
    if (configMgr.isAuthenticated()) {
      return 'LingDu 已连接。使用 lingdu_status 查看状态。';
    }

    const result = await startDeviceCodeFlow();
    return result.message;
  });

  api.registerTool({
    name: 'lingdu_sync',
    description: 'Manually trigger LingDu sync. Call when user says "同步lingdu", "手动同步", "强制同步", or wants to force sync.',
    input_schema: { type: 'object', properties: {}, required: [] }
  }, async () => {
    const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
    const cfg = configMgr.load();
    if (!cfg || !cfg.token) {
      return 'LingDu is not configured. Please connect first.';
    }

    if (!nodeProcess) {
      startNodeService('--sync');
      return 'Sync triggered.';
    }
    return 'Sync already in progress.';
  });

  api.registerTool({
    name: 'lingdu_logout',
    description: 'Logout and unbind device from LingDu. Call when user says "退出lingdu", "解绑设备", "断开lingdu连接".',
    input_schema: { type: 'object', properties: {}, required: [] }
  }, async () => {
    stopNodeService();

    const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
    const cfg = configMgr.load();
    if (cfg && cfg.device_id && cfg.token) {
      try {
        const api = new APIClient(cfg.cloud_url, cfg.token);
        await api.deleteDevice(cfg.device_id);
      } catch (e) {
        console.error('[LingDu] Failed to delete device:', e.message);
      }
    }

    configMgr.clear();

    return 'Logged out successfully. Your local data is preserved. To reconnect, say "connect lingdu".';
  });

  api.registerTool({
    name: 'lingdu_devices',
    description: 'List connected LingDu devices. Call when user says "查看lingdu设备", "我的设备列表", "已连接设备", or asks about connected devices.',
    input_schema: { type: 'object', properties: {}, required: [] }
  }, async () => {
    const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
    const cfg = configMgr.load();
    if (!cfg || !cfg.token) {
      return 'Not logged in / 未登录';
    }

    try {
      const api = new APIClient(cfg.cloud_url, cfg.token);
      const result = await api.getDevices();
      if (result.status === 200) {
        const devices = result.body.devices || [];
        if (devices.length === 0) return 'No devices found / 未找到设备';
        const list = devices.map(d =>
          `- ${d.device_name || 'Unnamed'} (${d.device_type || 'local'}) - Last sync: ${d.last_sync_at || 'Never'}`
        ).join('\n');
        return `Connected devices / 已连接设备\n${list}`;
      }
      return 'Failed to get devices / 获取设备列表失败';
    } catch (e) {
      return `Error: ${e.message}`;
    }
  });

  api.registerTool({
    name: 'lingdu_rename_device',
    description: 'Rename current LingDu device. Call when user says "重命名设备", "修改设备名称".',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'New device name / 新设备名称' }
      },
      required: ['name']
    }
  }, async ({ name }) => {
    const configMgr = new ConfigManager(OPENCLAW_PLATFORM.configDir);
    const cfg = configMgr.load();
    if (!cfg || !cfg.token || !cfg.device_id) {
      return 'Not logged in / 未登录';
    }

    try {
      const api = new APIClient(cfg.cloud_url, cfg.token);
      const result = await api.renameDevice(cfg.device_id, name);
      if (result.status === 200) {
        cfg.device_name = name;
        configMgr.save(cfg);
        return `Device renamed to "${name}" / 设备已重命名为 "${name}"`;
      }
      return 'Failed to rename device / 重命名设备失败';
    } catch (e) {
      return `Error: ${e.message}`;
    }
  });
}
