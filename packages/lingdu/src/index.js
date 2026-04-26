const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { SyncEngine, ConfigManager, DeviceCodeFlow, APIClient } = require('lingdu-core');
const { getPlatform, listPlatforms } = require('./platforms');

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
  fs.writeFileSync(getLockFile(), process.pid.toString(), 'utf-8');
}

function removeLockFile() {
  const lockFile = getLockFile();
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
}

async function startSync(platformName) {
  const platform = getPlatform(platformName);
  if (!platform) {
    console.error(`[LingDu] Unknown platform: ${platformName}`);
    console.log('[LingDu] Available platforms:');
    listPlatforms().forEach(p => console.log(`  ${p.key} - ${p.name} (${p.profilesDir})`));
    process.exit(1);
  }

  const configMgr = new ConfigManager(platform.configDir);
  const config = configMgr.load();

  if (!config || !config.token) {
    console.error('[LingDu] Not configured. Run "lingdu auth" first.');
    process.exit(1);
  }

  if (checkAlreadyRunning()) {
    process.exit(0);
  }

  writeLockFile();

  const syncConfig = {
    ...config,
    profilesDir: platform.profilesDir
  };

  const engine = new SyncEngine(syncConfig);

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
    console.log(`[LingDu] Sync service started for ${platform.name}`);
  } catch (e) {
    console.error('[LingDu] Failed to start sync service:', e.message);
    engine.disconnect();
    removeLockFile();
    process.exit(1);
  }
}

async function authFlow(platformName) {
  const platform = getPlatform(platformName || 'openclaw');
  if (!platform) {
    console.error(`[LingDu] Unknown platform: ${platformName}`);
    process.exit(1);
  }

  const configMgr = new ConfigManager(platform.configDir);

  try {
    const flow = new DeviceCodeFlow(configMgr.load()?.cloud_url);
    const { device_code, auth_url, expires_in } = await flow.requestCode();

    console.log('[LingDu] Please visit the following URL to authorize:');
    console.log(`  ${auth_url}`);

    const token = await flow.waitForToken(device_code, expires_in);

    const deviceId = crypto.randomUUID();
    const deviceName = ConfigManager.getDeviceName('local');

    configMgr.save({
      email: 'device',
      token: token,
      device_id: deviceId,
      device_name: deviceName,
      device_type: 'local',
      cloud_url: configMgr.load()?.cloud_url || 'https://soulsync.work'
    });

    const api = new APIClient(configMgr.load().cloud_url, token);
    await api.registerDevice(deviceId, deviceName, 'local');

    console.log('[LingDu] Authorization successful!');
    console.log('[LingDu] Run "lingdu start <platform>" to begin syncing.');
  } catch (err) {
    console.error(`[LingDu] Authorization failed: ${err.message}`);
    process.exit(1);
  }
}

function showStatus() {
  const configMgr = new ConfigManager();
  const config = configMgr.load();

  if (!config || !config.token) {
    console.log('[LingDu] Not configured. Run "lingdu auth" first.');
    return;
  }

  console.log(`[LingDu] Status:`);
  console.log(`  Email: ${config.email || 'N/A'}`);
  console.log(`  Device: ${config.device_name || 'N/A'}`);
  console.log(`  Cloud URL: ${config.cloud_url || 'N/A'}`);

  const api = new APIClient(config.cloud_url, config.token);
  api.getProfiles().then(result => {
    if (result.status === 200) {
      console.log('  Connection: ✅ Connected');
    } else if (result.status === 401) {
      console.log('  Connection: ❌ Token expired');
    } else {
      console.log(`  Connection: ❌ Error (${result.status})`);
    }
  }).catch(() => {
    console.log('  Connection: ❌ Cannot reach server');
  });
}

module.exports = function cli(program) {
  program
    .name('lingdu')
    .description('LingDu (灵渡) - Cross-device memory synchronization')
    .version('3.0.0');

  program
    .command('start <platform>')
    .description('Start sync service for a platform (openclaw, workbuddy, copaw)')
    .action(async (platform) => {
      await startSync(platform);
    });

  program
    .command('auth [platform]')
    .description('Authorize LingDu for a platform (default: openclaw)')
    .action(async (platform) => {
      await authFlow(platform);
    });

  program
    .command('status')
    .description('Check LingDu connection status')
    .action(() => {
      showStatus();
    });

  program
    .command('platforms')
    .description('List supported platforms')
    .action(() => {
      console.log('[LingDu] Supported platforms:');
      listPlatforms().forEach(p => {
        console.log(`  ${p.key} - ${p.name}`);
        console.log(`    Profiles: ${p.profilesDir}`);
      });
    });
};
