const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let pythonProcess = null;

function getPluginDir() {
  return path.dirname(__filename);
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
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const email = (config.email || '').trim();
    const password = (config.password || '').trim();
    return email && password && email !== 'your-email@example.com' && password !== 'your-password';
  } catch (e) {
    return false;
  }
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

module.exports = function register(api) {
  console.log('[SoulSync] Registering plugin...');

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
          const configPath = path.join(pluginDir, 'config.json');
          
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

  console.log('[SoulSync] Plugin loaded. Run "openclaw soulsync:start" to begin.');
  console.log('[SoulSync] Plugin registered successfully');
};
