const { spawn } = require('child_process');
const path = require('path');

// 函数形式导出（推荐）
module.exports = function register(api) {
  console.log('[SoulSync] Registering plugin...');

  // 注册CLI命令：启动 SoulSync
  api.registerCli(
    ({ program }) => {
      program
        .command('soulsync:start')
        .description('启动 SoulSync 同步服务')
        .action(() => {
          const pluginDir = path.dirname(__filename);
          const pythonScript = path.join(pluginDir, 'src', 'main.py');
          const pythonPath = process.env.PYTHON_PATH || 'python3';
        
          console.log('[SoulSync] Starting Python service...');
        
          const pythonProcess = spawn(pythonPath, [pythonScript], {
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
          });
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
          console.log('[SoulSync] Stop command received');
          // 这里可以实现停止逻辑
        });
    },
    { commands: ['soulsync:stop'] }
  );

  console.log('[SoulSync] Plugin registered successfully');
};
