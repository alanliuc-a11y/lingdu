const fs = require('fs');
const path = require('path');
const os = require('os');
const { SyncEngine } = require('./sync-engine');
const { loadConfig, getPluginDir } = require('./config');

function getLockFile() {
  return path.join(os.tmpdir(), 'lingdu.lock');
}

function checkAlreadyRunning() {
  const lockFile = getLockFile();
  if (fs.existsSync(lockFile)) {
    try {
      const pid = parseInt(fs.readFileSync(lockFile, 'utf-8'));
      try {
        process.kill(pid, 0);
        console.log('[LingDu] Sync service already running (PID:', pid, ')');
        return true;
      } catch (e) {
        fs.unlinkSync(lockFile);
      }
    } catch (e) {
      fs.unlinkSync(lockFile);
    }
  }
  return false;
}

function writeLockFile() {
  const lockFile = getLockFile();
  fs.writeFileSync(lockFile, process.pid.toString(), 'utf-8');
}

function removeLockFile() {
  const lockFile = getLockFile();
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
}

async function main() {
  const config = loadConfig();
  if (!config || !config.token) {
    console.error('[LingDu] Not configured. Run "openclaw lingdu:start" first.');
    process.exit(1);
  }

  if (checkAlreadyRunning()) {
    process.exit(0);
  }

  writeLockFile();

  const engine = new SyncEngine(config);

  process.on('SIGTERM', () => {
    console.log('[LingDu] Received SIGTERM, shutting down...');
    engine.disconnect();
    removeLockFile();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[LingDu] Received SIGINT, shutting down...');
    engine.disconnect();
    removeLockFile();
    process.exit(0);
  });

  process.on('uncaughtException', (e) => {
    console.error('[LingDu] Uncaught exception:', e);
    engine.disconnect();
    removeLockFile();
    process.exit(1);
  });

  try {
    await engine.initialize();
    engine.startWatching();
    console.log('[LingDu] Sync service started');
  } catch (e) {
    console.error('[LingDu] Failed to start sync service:', e.message);
    engine.disconnect();
    removeLockFile();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SyncEngine, checkAlreadyRunning };