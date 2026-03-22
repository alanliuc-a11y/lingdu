const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

const { getDeviceName, loadConfig, saveConfig, isAuthenticated } = require('./src/config');

let pythonProcess = null;
let deviceCodePolling = null;

function getPluginDir() {
  return path.dirname(__filename);
}

function getCloudUrl() {
  const cfg = loadConfig();
  return (cfg && cfg.cloud_url) || 'https://soulsync.work';
}

function makeRequest(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const cloudUrl = getCloudUrl();
    const isHttps = cloudUrl.startsWith('https');
    const client = isHttps ? https : http;
    const urlObj = new URL(cloudUrl + urlPath);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
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
    console.error('[SoulSync] Failed to get user info:', e.message);
  }
  return `${userName}你好，我是三澍，非常高兴能在 ${deviceName} 再次与你相遇。\n\n已同步: SOUL.md / USER.md / MEMORY.md`;
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
  const { createOAuthServer } = require('./src/oauth-server');
  const open = require('open');
  
  try {
    const { server, port } = await createOAuthServer();
    const callbackUrl = `http://localhost:${port}/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = `${getCloudUrl()}/auth/oauth/start?port=${port}&callback=${encodeURIComponent(callbackUrl)}&state=${state}`;
    
    console.log('[SoulSync] Opening browser for authorization...');
    await open(authUrl);
    
    console.log('[SoulSync] Waiting for authorization...');
    
    const { token } = await new Promise((resolve, reject) => {
      server.on('close', () => reject(new Error('Server closed without receiving token')));
    });
    
    const deviceId = crypto.randomUUID();
    const deviceName = getDeviceName('local');
    
    saveConfig({
      email: 'device',
      token: token,
      device_id: deviceId,
      device_name: deviceName,
      device_type: 'local',
      cloud_url: getCloudUrl()
    });
    
    await registerDevice(deviceId, deviceName, 'local', token);
    startPythonService('--start');

    const greeting = await getUserGreeting(token, deviceName);
    return { success: true, message: greeting };
  } catch (err) {
    return { success: false, message: `OAuth Error: ${err.message}` };
  }
}

async function startDeviceCodeCLI() {
  try {
    const result = await makeRequest('POST', '/api/auth/device-code', {});
    
    if (result.status !== 200 || !result.body.device_code) {
      return { success: false, message: 'Failed to start device authorization.' };
    }
    
    const { device_code, auth_url } = result.body;
    
    const homeDir = os.homedir();
    const pendingDir = path.join(homeDir, '.soulsync');
    if (!fs.existsSync(pendingDir)) {
      fs.mkdirSync(pendingDir, { recursive: true });
    }
    fs.writeFileSync(path.join(pendingDir, '.pending_auth'), JSON.stringify({
      deviceCode: device_code,
      authUrl: auth_url,
      timestamp: Date.now()
    }));
    
    console.log('[SoulSync] Please visit the following URL to authorize:');
    console.log(`  ${auth_url}`);
    console.log('[SoulSync] Or say "connect SoulSync" in chat to continue...');
    
    const token = await waitForAuthCompletion(device_code);
    
    const deviceId = crypto.randomUUID();
    const deviceName = getDeviceName('ssh');
    
    saveConfig({
      email: 'device',
      token: token,
      device_id: deviceId,
      device_name: deviceName,
      device_type: 'ssh',
      cloud_url: getCloudUrl()
    });
    
    registerDevice(deviceId, deviceName, 'ssh', token);
    startPythonService('--start');

    const greeting = await getUserGreeting(token, deviceName);
    return { success: true, message: greeting };
  } catch (err) {
    return { success: false, message: `Error: ${err.message}` };
  }
}

async function waitForAuthCompletion(device_code) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (deviceCodePolling) {
        clearInterval(deviceCodePolling);
        deviceCodePolling = null;
      }
      reject(new Error('Authorization timeout'));
    }, 900000);
    
    deviceCodePolling = setInterval(async () => {
      try {
        const pollResult = await makeRequest('GET', `/api/auth/device-code/${device_code}/status`);
        
        if (pollResult.body.status === 'authorized' && pollResult.body.token) {
          clearInterval(deviceCodePolling);
          deviceCodePolling = null;
          clearTimeout(timeout);
          resolve(pollResult.body.token);
        } else if (pollResult.body.status === 'expired') {
          clearInterval(deviceCodePolling);
          deviceCodePolling = null;
          clearTimeout(timeout);
          reject(new Error('Authorization expired'));
        } else if (pollResult.body.status === 'not_found') {
          clearInterval(deviceCodePolling);
          deviceCodePolling = null;
          clearTimeout(timeout);
          reject(new Error('Device code not found'));
        }
      } catch (e) {
        clearInterval(deviceCodePolling);
        deviceCodePolling = null;
        clearTimeout(timeout);
        reject(e);
      }
    }, 3000);
  });
}

async function registerDevice(deviceId, deviceName, deviceType, token) {
  try {
    await makeRequest('POST', '/api/devices', {
      device_id: deviceId,
      device_name: deviceName,
      device_type: deviceType
    }, token);
  } catch (e) {
    console.error('[SoulSync] Failed to register device:', e.message);
  }
}

function startPythonService(mode = '--start') {
  const pluginDir = getPluginDir();
  const pythonScript = path.join(pluginDir, 'src', 'main.py');
  const pythonPath = process.env.PYTHON_PATH || 'python3';
  
  console.log(`[SoulSync] Starting Python service (${mode})...`);
  
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
  
  pythonProcess = spawn(pythonPath, [pythonScript, mode], {
    cwd: pluginDir,
    env: { ...process.env, OPENCLAW_PLUGIN: 'true', PLUGIN_DIR: pluginDir },
    stdio: 'inherit'
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`[SoulSync] Python process exited with code ${code}`);
    pythonProcess = null;
  });
  
  pythonProcess.on('error', (err) => {
    console.error(`[SoulSync] Failed to start Python process: ${err}`);
    pythonProcess = null;
  });
}

function stopPythonService() {
  if (pythonProcess) {
    console.log('[SoulSync] Stopping Python service...');
    pythonProcess.kill();
    pythonProcess = null;
  }
}

function checkConnection() {
  const cfg = loadConfig();
  if (!cfg || !cfg.token) {
    return Promise.resolve({ connected: false, reason: 'not_configured' });
  }
  
  return makeRequest('GET', '/api/profiles', null, cfg.token)
    .then(result => {
      if (result.status === 200) return { connected: true, data: result.body };
      if (result.status === 401) return { connected: false, reason: 'token_expired' };
      return { connected: false, reason: 'server_error', status: result.status };
    })
    .catch(err => ({ connected: false, reason: 'connection_error', error: err.message }));
}

async function startDeviceCodeFlow() {
  try {
    const result = await makeRequest('POST', '/api/auth/device-code', {});
    
    if (result.status !== 200 || !result.body.device_code) {
      return { success: false, message: 'Failed to start device authorization.' };
    }
    
    const { device_code, auth_url, expires_in } = result.body;
    
    const token = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (deviceCodePolling) {
          clearInterval(deviceCodePolling);
          deviceCodePolling = null;
        }
        reject(new Error('Authorization timeout'));
      }, expires_in * 1000);
      
      deviceCodePolling = setInterval(async () => {
        try {
          const pollResult = await makeRequest('GET', `/api/auth/device-code/${device_code}/status`);
          
          if (pollResult.body.status === 'authorized' && pollResult.body.token) {
            clearInterval(deviceCodePolling);
            deviceCodePolling = null;
            clearTimeout(timeout);
            resolve(pollResult.body.token);
          } else if (pollResult.body.status === 'expired') {
            clearInterval(deviceCodePolling);
            deviceCodePolling = null;
            clearTimeout(timeout);
            reject(new Error('Authorization expired'));
          } else if (pollResult.body.status === 'not_found') {
            clearInterval(deviceCodePolling);
            deviceCodePolling = null;
            clearTimeout(timeout);
            reject(new Error('Device code not found'));
          }
        } catch (e) {
          clearInterval(deviceCodePolling);
          deviceCodePolling = null;
          clearTimeout(timeout);
          reject(e);
        }
      }, 3000);
    });
    
    const deviceId = crypto.randomUUID();
    const deviceName = getDeviceName('cloud');
    
    saveConfig({
      email: 'device',
      token: token,
      device_id: deviceId,
      device_name: deviceName,
      device_type: 'cloud',
      cloud_url: getCloudUrl()
    });
    
    registerDevice(deviceId, deviceName, 'cloud', token);
    startPythonService('--start');

    const greeting = await getUserGreeting(token, deviceName);
    return { success: true, message: greeting };
  } catch (err) {
    return { success: false, message: `Error: ${err.message}` };
  }
}

module.exports = function register(api) {
  console.log('[SoulSync] Registering plugin...');
  
  const mode = detectAuthMode(api);
  console.log(`[SoulSync] Detected auth mode: ${mode}`);
  
  if (!isAuthenticated()) {
    switch (mode) {
      case 'oauth-local':
        console.log('[SoulSync] Starting OAuth local flow...');
        startOAuthLocal().then(result => {
          if (result.success) registerChatTools(api);
        });
        break;
      case 'device-code-cli':
        console.log('[SoulSync] Starting device code CLI flow...');
        startDeviceCodeCLI().then(result => {
          console.log('[SoulSync]', result.message);
        });
        break;
      case 'device-code-chat':
        console.log('[SoulSync] Waiting for user to say "connect SoulSync"...');
        break;
    }
  } else {
    console.log('[SoulSync] Already authenticated, starting sync...');
    startPythonService('--start');
    registerChatTools(api);
  }
  
  function registerChatTools(api) {
    api.registerTool({
      name: 'soulsync_status',
      description: 'Check SoulSync plugin status for OpenClaw (小龙虾). Call when user mentions SoulSync, soul sync, 灵魂同步, OpenClaw plugin, 小龙虾插件, or asks about sync status.',
      input_schema: { type: 'object', properties: {}, required: [] }
    }, async () => {
      const cfg = loadConfig();
      if (!cfg || !cfg.token) {
        return { configured: false, message: 'SoulSync is not configured. Would you like to connect your SoulSync account?' };
      }
      
      const conn = await checkConnection();
      if (conn.connected) {
        return { configured: true, connected: true, email: cfg.email, message: `SoulSync is connected and syncing for ${cfg.email}.` };
      } else if (conn.reason === 'token_expired') {
        return { configured: true, connected: false, message: 'SoulSync token has expired. Would you like to reconnect your account?' };
      } else {
        return { configured: true, connected: false, message: `SoulSync is configured but cannot connect to server: ${conn.reason}` };
      }
    });

    api.registerTool({
      name: 'soulsync_connect',
      description: '连接 SoulSync 灵魂同步服务。当用户说"安装soulsync"、"配置soulsync"、"连接soulsync"、"设置同步"、"开启灵魂同步"时调用。无需账号密码，会提供浏览器授权链接。',
      input_schema: { type: 'object', properties: {}, required: [] }
    }, async () => {
      if (isAuthenticated()) {
        return 'SoulSync 已连接。使用 soulsync_status 查看状态。';
      }

      const result = await startDeviceCodeFlow();
      return result.message;
    });

    api.registerTool({
      name: 'soulsync_sync',
      description: 'Manually trigger SoulSync sync. Call when user says "同步soulsync", "手动同步", "强制同步", or wants to force sync.',
      input_schema: { type: 'object', properties: {}, required: [] }
    }, async () => {
      const cfg = loadConfig();
      if (!cfg || !cfg.token) {
        return 'SoulSync is not configured. Please connect first.';
      }
      
      if (!pythonProcess) {
        startPythonService('--sync');
        return 'Sync triggered.';
      }
      return 'Sync already in progress.';
    });

    api.registerTool({
      name: 'soulsync_logout',
      description: 'Logout and unbind device from SoulSync. Call when user says "退出soulsync", "解绑设备", "断开soulsync连接".',
      input_schema: { type: 'object', properties: {}, required: [] }
    }, async () => {
      stopPythonService();
      
      const cfg = loadConfig();
      if (cfg && cfg.device_id && cfg.token) {
        try {
          await makeRequest('DELETE', `/api/devices/${cfg.device_id}`, null, cfg.token);
        } catch (e) {
          console.error('[SoulSync] Failed to delete device:', e.message);
        }
      }
      
      try {
        const pluginDir = getPluginDir();
        const configPath = path.join(pluginDir, 'config.json');
        if (fs.existsSync(configPath)) {
          const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          delete existing.token;
          delete existing.email;
          delete existing.device_id;
          delete existing.device_name;
          fs.writeFileSync(configPath, JSON.stringify(existing, null, 2));
        }
      } catch (e) {
        console.error('[SoulSync] Error clearing config:', e);
      }
      
      return 'Logged out successfully. Your local data is preserved. To reconnect, say "connect SoulSync".';
    });

    api.registerTool({
      name: 'soulsync_devices',
      description: 'List connected SoulSync devices. Call when user says "查看soulsync设备", "我的设备列表", "已连接设备", or asks about connected devices.',
      input_schema: { type: 'object', properties: {}, required: [] }
    }, async () => {
      const cfg = loadConfig();
      if (!cfg || !cfg.token) {
        return 'Not logged in / 未登录';
      }
      
      try {
        const result = await makeRequest('GET', '/api/devices', null, cfg.token);
        if (result.status === 200) {
          const devices = result.body.devices || [];
          if (devices.length === 0) return 'No devices found / 未找到设备';
          const list = devices.map(d => 
            `- ${d.device_name || 'Unnamed'} (${d.device_type || 'local'}) - Last sync: ${d.last_sync_at || 'Never'}`
          ).join('\n');
          return `Connected devices / 已连接设备:\n${list}`;
        }
        return 'Failed to get devices / 获取设备列表失败';
      } catch (e) {
        return `Error: ${e.message}`;
      }
    });

    api.registerTool({
      name: 'soulsync_rename_device',
      description: 'Rename current SoulSync device. Call when user says "重命名设备", "修改设备名称".',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'New device name / 新设备名称' }
        },
        required: ['name']
      }
    }, async ({ name }) => {
      const cfg = loadConfig();
      if (!cfg || !cfg.token || !cfg.device_id) {
        return 'Not logged in / 未登录';
      }
      
      try {
        const result = await makeRequest('PUT', `/api/devices/${cfg.device_id}`, { device_name: name }, cfg.token);
        if (result.status === 200) {
          const pluginDir = getPluginDir();
          const configPath = path.join(pluginDir, 'config.json');
          cfg.device_name = name;
          fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
          return `Device renamed to "${name}" / 设备已重命名为 "${name}"`;
        }
        return 'Failed to rename device / 重命名设备失败';
      } catch (e) {
        return `Error: ${e.message}`;
      }
    });
  }
  
  api.registerCli(
    ({ program }) => {
      program
        .command('soulsync:start')
        .description('启动 SoulSync 同步服务')
        .action(async () => {
          if (!isAuthenticated()) {
            console.log('[SoulSync] Not configured. Starting device authorization flow...');

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
              console.error(`[SoulSync] ${result.message}`);
            }
            return;
          }

          if (pythonProcess) {
            console.log('[SoulSync] Service already running');
            return;
          }

          startPythonService('--start');
        });
    },
    { commands: ['soulsync:start'] }
  );

  api.registerCli(
    ({ program }) => {
      program
        .command('soulsync:stop')
        .description('停止 SoulSync 同步服务')
        .action(() => {
          stopPythonService();
          console.log('[SoulSync] Service stopped');
        });
    },
    { commands: ['soulsync:stop'] }
  );

  if (isAuthenticated()) {
    console.log('[SoulSync] Auto-starting sync service...');
    startPythonService('--start');
    registerChatTools(api);
  }

  console.log('[SoulSync] Plugin loaded. Run "openclaw soulsync:start" to begin.');
  console.log('[SoulSync] Plugin registered successfully');
};