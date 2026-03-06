const { spawn } = require('child_process');
const path = require('path');

let pythonProcess = null;

// 函数形式导出（推荐）
module.exports = function register(api) {
  console.log('[SoulSync] Registering plugin...');

  // 自动启动 Python 服务
  function startPythonService() {
    const pluginDir = path.dirname(__filename);
    const pythonScript = path.join(pluginDir, 'src', 'main.py');
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    
    console.log('[SoulSync] Auto-starting Python service...');
    
    pythonProcess = spawn(pythonPath, [pythonScript], {
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
  }

  // 注册CLI命令：启动 SoulSync
  api.registerCli(
    ({ program }) => {
      program
        .command('soulsync:start')
        .description('启动 SoulSync 同步服务')
        .action(() => {
          if (pythonProcess) {
            console.log('[SoulSync] Service already running');
            return;
          }
          startPythonService();
        });
    },
    { commands: ['soulsync:start'] }
  );

  // 注册CLI命令：停止 SoulSync
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

  // 自动启动服务
  startPythonService();

  console.log('[SoulSync] Plugin registered successfully');
};
