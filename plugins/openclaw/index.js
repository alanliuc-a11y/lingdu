const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

let pythonProcess = null;
let config = null;
let deviceCodePolling = null;

function getPluginDir() {
  return path.dirname(__filename);
}

function loadConfig(pluginDir) {
  const configPath = path.join(pluginDir, 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.error('[SoulSync] Error loading config:', e);
  }
  return null;
}

function checkConfigExists(pluginDir) {
  const configPath = path.join(pluginDir, 'config.json');
  if (!fs.existsSync(configPath)) {
    const examplePath = path.join(pluginDir, 'config.json.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, configPath);
      console.log('[SoulSync] Created config.json from template');
    }
    return false;
  }
  
  config = loadConfig(pluginDir);
  if (!config) return false;
  
  const email = (config.email || '').trim();
  const token = config.token;
  return email && token && email !== 'your-email@example.com';
}

function saveConfig(pluginDir, newConfig) {
  const configPath = path.join(pluginDir, 'config.json');
  try {
    let existing = {};
    if (fs.existsSync(configPath)) {
      existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    const merged = { ...existing, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
    config = merged;
    return true;
  } catch (e) {
    console.error('[SoulSync] Error saving config:', e);
    return false;
  }
}

function getCloudUrl(pluginDir) {
  const cfg = loadConfig(pluginDir);
  return (cfg && cfg.cloud_url) || 'https://soulsync.work';
}

function makeRequest(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const cloudUrl = getCloudUrl(getPluginDir());
    const isHttps = cloudUrl.startsWith('https');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(cloudUrl + urlPath);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
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
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function startPythonService(mode = '--start') {
  const pluginDir = getPluginDir();
  const pythonScript = path.join(pluginDir, 'src', 'main.py');
  const pythonPath = process.env.PYTHON_PATH || 'python3';
  
  console.log(`[SoulSync] Starting Python service (${mode})...`);
  
  pythonProcess = spawn(pythonPath, [pythonScript, mode], {
    cwd: pluginDir,
    env: {
      ...process.env,
      OPENCLAW_PLUGIN: 'true',
      PLUGIN_DIR: pluginDir
    },
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
  
  return pythonProcess;
}

function stopPythonService() {
  if (pythonProcess) {
    console.log('[SoulSync] Stopping Python service...');
    pythonProcess.kill();
    pythonProcess = null;
  }
}

function checkConnection() {
  const pluginDir = getPluginDir();
  const cfg = loadConfig(pluginDir);
  
  if (!cfg || !cfg.token) {
    return { connected: false, reason: 'not_configured' };
  }
  
  return makeRequest('GET', '/api/profiles', null, cfg.token)
    .then(result => {
      if (result.status === 200) {
        return { connected: true, data: result.body };
      } else if (result.status === 401) {
        return { connected: false, reason: 'token_expired' };
      } else {
        return { connected: false, reason: 'server_error', status: result.status };
      }
    })
    .catch(err => {
      return { connected: false, reason: 'connection_error', error: err.message };
    });
}

async function startDeviceCodeFlow() {
  try {
    const result = await makeRequest('POST', '/api/auth/device-code', {});
    
    if (result.status !== 200 || !result.body.device_code) {
      return {
        success: false,
        message: 'Failed to start device authorization. Please try again.'
      };
    }
    
    const { device_code, auth_url, expires_in } = result.body;
    
    deviceCodePolling = setInterval(async () => {
      try {
        const pollResult = await makeRequest('GET', `/api/auth/device-code/${device_code}/status`);
        
        if (pollResult.body.status === 'authorized' && pollResult.body.token) {
          clearInterval(deviceCodePolling);
          deviceCodePolling = null;
          
          const deviceId = crypto.randomUUID();
          const pluginDir = getPluginDir();
          saveConfig(pluginDir, {
            email: 'device',
            token: pollResult.body.token,
            device_id: deviceId,
            device_name: 'Device',
            cloud_url: getCloudUrl(pluginDir)
          });
          
          makeRequest('POST', '/api/devices', {
            device_id: deviceId,
            device_name: 'Device',
            device_type: 'local'
          }, pollResult.body.token).catch(err => {
            console.error('[SoulSync] Failed to register device:', err.message);
          });
          
          startPythonService('--start');
          
          console.log('[SoulSync] Authorization successful! Syncing started.');
        } else if (pollResult.body.status === 'expired') {
          clearInterval(deviceCodePolling);
          deviceCodePolling = null;
          console.log('[SoulSync] Authorization expired. Please try again.');
        } else if (pollResult.body.status === 'not_found') {
          clearInterval(deviceCodePolling);
          deviceCodePolling = null;
          console.log('[SoulSync] Device code not found. Please try again.');
        }
      } catch (e) {
        console.error('[SoulSync] Polling error:', e);
      }
    }, 3000);
    
    setTimeout(() => {
      if (deviceCodePolling) {
        clearInterval(deviceCodePolling);
        deviceCodePolling = null;
      }
    }, expires_in * 1000);
    
    return {
      success: true,
      message: `Please open ${auth_url} in your browser to complete authorization. This page will expire in ${Math.floor(expires_in / 60)} minutes.`
    };
  } catch (err) {
    return {
      success: false,
      message: `Error: ${err.message}`
    };
  }
}

module.exports = function register(api) {
  console.log('[SoulSync] Registering plugin...');

  api.registerTool({
    name: 'soulsync_status',
    description: 'Check SoulSync plugin status for OpenClaw (小龙虾). Call when user mentions SoulSync, soul sync, 灵魂同步, OpenClaw plugin, 小龙虾插件, or asks about sync status.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  }, async () => {
    const pluginDir = getPluginDir();
    const cfg = loadConfig(pluginDir);
    
    if (!cfg || !cfg.token) {
      return {
        configured: false,
        message: 'SoulSync is not configured. Would you like to connect your SoulSync account?'
      };
    }
    
    const conn = await checkConnection();
    
    if (conn.connected) {
      return {
        configured: true,
        connected: true,
        email: cfg.email,
        message: `SoulSync is connected and syncing for ${cfg.email}.`
      };
    } else if (conn.reason === 'token_expired') {
      return {
        configured: true,
        connected: false,
        message: 'SoulSync token has expired. Would you like to reconnect your account?'
      };
    } else {
      return {
        configured: true,
        connected: false,
        message: `SoulSync is configured but cannot connect to server: ${conn.reason}`
      };
    }
  });

  api.registerTool({
    name: 'soulsync_sync',
    description: 'Manually trigger SoulSync OpenClaw plugin (小龙虾插件) to sync soul files (SOUL.md, USER.md, MEMORY.md) between local and cloud.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  }, async () => {
    const pluginDir = getPluginDir();
    const cfg = loadConfig(pluginDir);
    
    if (!cfg || !cfg.token) {
      return {
        success: false,
        message: 'SoulSync is not configured. Would you like to connect your SoulSync account?'
      };
    }
    
    const conn = await checkConnection();
    
    if (!conn.connected) {
      return {
        success: false,
        message: `Cannot sync: ${conn.reason}. Please check your connection.`
      };
    }
    
    if (pythonProcess) {
      return {
        success: true,
        message: 'Sync is already running in the background.'
      };
    }
    
    startPythonService('--start');
    
    return {
      success: true,
      message: 'Sync started. Your soul files are being synchronized.'
    };
  });

  api.registerTool({
    name: 'soulsync_connect',
    description: 'Connect SoulSync account using device authorization flow. User will be given a URL to open in browser to complete login/registration. Call when user wants to register, login, connect, or setup SoulSync.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  }, async () => {
    if (deviceCodePolling) {
      return {
        success: false,
        message: 'Authorization in progress. Please check your browser and complete the authorization.'
      };
    }
    
    return await startDeviceCodeFlow();
  });

  api.registerTool({
    name: 'soulsync_logout',
    description: 'Disconnect SoulSync account and stop sync service. This will remove local authentication token.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  }, async () => {
    stopPythonService();
    
    const pluginDir = getPluginDir();
    const configPath = path.join(pluginDir, 'config.json');
    const cfg = loadConfig(pluginDir);
    
    if (cfg && cfg.device_id && cfg.token) {
      try {
        await makeRequest('DELETE', `/api/devices/${cfg.device_id}`, null, cfg.token);
      } catch (e) {
        console.error('[SoulSync] Failed to delete device:', e.message);
      }
    }
    
    try {
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
    
    if (deviceCodePolling) {
      clearInterval(deviceCodePolling);
      deviceCodePolling = null;
    }
    
    return {
      success: true,
      message: 'SoulSync disconnected. Your local data is preserved. To reconnect, say "connect SoulSync".'
    };
  });

  api.registerTool({
    name: 'soulsync_devices',
    description: 'List all devices connected to your SoulSync account / 查看已连接设备列表',
    schema: {
      type: 'object',
      properties: {},
      required: []
    },
    async handler() {
      const pluginDir = getPluginDir();
      const cfg = loadConfig(pluginDir);
      
      if (!cfg || !cfg.token) {
        return 'Not logged in / 未登录';
      }
      
      try {
        const result = await makeRequest('GET', '/api/devices', null, cfg.token);
        if (result.status === 200) {
          const devices = result.body.devices || [];
          if (devices.length === 0) {
            return 'No devices found / 未找到设备';
          }
          const list = devices.map(d => 
            `- ${d.device_name || 'Unnamed'} (${d.device_type || 'local'}) - Last sync: ${d.last_sync_at || 'Never'}`
          ).join('\n');
          return `Connected devices / 已连接设备:\n${list}`;
        }
        return 'Failed to get devices / 获取设备列表失败';
      } catch (e) {
        return `Error: ${e.message}`;
      }
    }
  });

  api.registerTool({
    name: 'soulsync_rename_device',
    description: 'Rename the current device / 重命名当前设备',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'New device name / 新设备名称' }
      },
      required: ['name']
    },
    async handler({ name }) {
      const pluginDir = getPluginDir();
      const cfg = loadConfig(pluginDir);
      
      if (!cfg || !cfg.token || !cfg.device_id) {
        return 'Not logged in / 未登录';
      }
      
      try {
        const result = await makeRequest('PUT', `/api/devices/${cfg.device_id}`, { device_name: name }, cfg.token);
        if (result.status === 200) {
          const configPath = path.join(pluginDir, 'config.json');
          cfg.device_name = name;
          fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
          return `Device renamed to "${name}" / 设备已重命名为 "${name}"`;
        }
        return 'Failed to rename device / 重命名设备失败';
      } catch (e) {
        return `Error: ${e.message}`;
      }
    }
  });

  api.registerCli(
    ({ program }) => {
      program
        .command('soulsync:start')
        .description('启动 SoulSync 同步服务')
        .action(() => {
          const pluginDir = getPluginDir();
          
          if (!checkConfigExists(pluginDir)) {
            console.log('[SoulSync] Not configured. Starting device authorization flow...');
            startDeviceCodeFlow().then(result => {
              console.log('[SoulSync]', result.message);
            });
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

  const pluginDir = getPluginDir();
  if (checkConfigExists(pluginDir)) {
    console.log('[SoulSync] Auto-starting sync service...');
    startPythonService('--start');
  }

  console.log('[SoulSync] Plugin loaded. Run "openclaw soulsync:start" to begin.');
  console.log('[SoulSync] Plugin registered successfully');
};
