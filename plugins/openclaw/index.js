const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

let pythonProcess = null;
let config = null;

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
    
    if (mode === '--setup' && code === 0) {
      console.log('[SoulSync] Setup completed, starting sync service...');
      startPythonService('--start');
    }
  });
  
  pythonProcess.on('error', (err) => {
    console.error(`[SoulSync] Failed to start Python process: ${err}`);
    pythonProcess = null;
  });
  
  return pythonProcess;
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
        message: 'SoulSync is not configured. Would you like to register a new account or login to an existing one?'
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
        message: 'SoulSync token has expired. Please login again.'
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
    name: 'soulsync_send_code',
    description: 'Send verification code for SoulSync OpenClaw plugin (小龙虾插件) registration. Call when user wants to register/signup for SoulSync plugin and provides email.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string' }
      },
      required: ['email']
    }
  }, async ({ email }) => {
    try {
      const result = await makeRequest('POST', '/api/auth/send-code', { email });
      
      if (result.status === 200) {
        return {
          success: true,
          message: `Verification code has been sent to ${email}. Please check your inbox and provide the 6-digit code.`
        };
      } else {
        return {
          success: false,
          message: result.body.error || 'Failed to send verification code.'
        };
      }
    } catch (err) {
      return {
        success: false,
        message: `Error: ${err.message}`
      };
    }
  });

  api.registerTool({
    name: 'soulsync_register',
    description: 'Complete SoulSync OpenClaw plugin (小龙虾插件) registration with email, verification code and password.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        code: { type: 'string' },
        password: { type: 'string' }
      },
      required: ['email', 'code', 'password']
    }
  }, async ({ email, code, password }) => {
    try {
      const result = await makeRequest('POST', '/api/auth/register', {
        email,
        password,
        code
      });
      
      if (result.status === 201) {
        const token = result.body.token;
        const pluginDir = getPluginDir();
        saveConfig(pluginDir, {
          email,
          token,
          cloud_url: getCloudUrl(pluginDir)
        });
        
        const cloudData = await makeRequest('GET', '/api/profiles', null, token);
        
        let syncMessage = '';
        if (cloudData.status === 200 && cloudData.body.content && Object.keys(cloudData.body.content).length > 0) {
          syncMessage = 'Pulled your existing soul files from cloud.';
        } else {
          syncMessage = 'No existing soul files found. Your local files will be synced to cloud.';
        }
        
        startPythonService('--start');
        
        return {
          success: true,
          message: `Registration successful! ${syncMessage} For security, please clear this chat history which contains your password.`
        };
      } else {
        return {
          success: false,
          message: result.body.error || 'Registration failed.'
        };
      }
    } catch (err) {
      return {
        success: false,
        message: `Error: ${err.message}`
      };
    }
  });

  api.registerTool({
    name: 'soulsync_login',
    description: 'Login to existing SoulSync account for OpenClaw plugin (小龙虾插件). Call when user wants to login/connect SoulSync plugin.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' }
      },
      required: ['email', 'password']
    }
  }, async ({ email, password }) => {
    try {
      const result = await makeRequest('POST', '/api/auth/login', {
        email,
        password
      });
      
      if (result.status === 200) {
        const token = result.body.token;
        const pluginDir = getPluginDir();
        saveConfig(pluginDir, {
          email,
          token,
          cloud_url: getCloudUrl(pluginDir)
        });
        
        const cloudData = await makeRequest('GET', '/api/profiles', null, token);
        
        let syncMessage = '';
        if (cloudData.status === 200 && cloudData.body.content && Object.keys(cloudData.body.content).length > 0) {
          syncMessage = 'Pulled your existing soul files from cloud.';
        } else {
          syncMessage = 'No existing soul files found. Your local files will be synced to cloud.';
        }
        
        startPythonService('--start');
        
        return {
          success: true,
          message: `Login successful! ${syncMessage} For security, please clear this chat history which contains your password.`
        };
      } else {
        return {
          success: false,
          message: result.body.error || 'Login failed. Please check your email and password.'
        };
      }
    } catch (err) {
      return {
        success: false,
        message: `Error: ${err.message}`
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
        message: 'SoulSync is not configured. Please register or login first.'
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

  api.registerCli(
    ({ program }) => {
      program
        .command('soulsync:setup')
        .description('首次配置：注册或登录 SoulSync 账号')
        .action(() => {
          console.log('[SoulSync] Starting setup...');
          startPythonService('--setup');
        });
    },
    { commands: ['soulsync:setup'] }
  );

  api.registerCli(
    ({ program }) => {
      program
        .command('soulsync:start')
        .description('启动 SoulSync 同步服务')
        .action(() => {
          const pluginDir = getPluginDir();
          
          if (!checkConfigExists(pluginDir)) {
            console.log('[SoulSync] Not configured. Starting setup...');
            startPythonService('--setup');
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
          if (pythonProcess) {
            console.log('[SoulSync] Stopping Python service...');
            pythonProcess.kill();
            pythonProcess = null;
          } else {
            console.log('[SoulSync] Service not running');
          }
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
