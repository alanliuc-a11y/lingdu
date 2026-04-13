const fs = require('fs');
const path = require('path');
const os = require('os');

let config = null;

function getPluginDir() {
  return path.dirname(path.dirname(__filename));
}

function loadConfig() {
  if (config) return config;

  const pluginDir = getPluginDir();
  const configPath = path.join(pluginDir, 'config.json');

  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (!config.cloud_url && config.server_url) {
        config.cloud_url = config.server_url;
      }
      if (!config.cloud_url) {
        config.cloud_url = 'https://soulsync.work';
      }
      return config;
    }
  } catch (e) {
    console.error('[SoulSync] Error loading config:', e);
  }
  return null;
}

function saveConfig(newConfig) {
  const pluginDir = getPluginDir();
  const configPath = path.join(pluginDir, 'config.json');

  try {
    let existing = {};
    if (fs.existsSync(configPath)) {
      existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    if (newConfig.server_url && !newConfig.cloud_url) {
      newConfig.cloud_url = newConfig.server_url;
      delete newConfig.server_url;
    }
    config = { ...existing, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error('[SoulSync] Error saving config:', e);
    return false;
  }
}

function clearConfig() {
  const pluginDir = getPluginDir();
  const configPath = path.join(pluginDir, 'config.json');

  try {
    if (fs.existsSync(configPath)) {
      const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      delete existing.token;
      delete existing.email;
      delete existing.device_id;
      delete existing.device_name;
      fs.writeFileSync(configPath, JSON.stringify(existing, null, 2));
      config = existing;
    }
    return true;
  } catch (e) {
    console.error('[SoulSync] Error clearing config:', e);
    return false;
  }
}

function getDeviceName(deviceType = 'local') {
  const hostname = os.hostname();
  const platform = os.platform();
  const username = os.userInfo().username;

  let type = 'local';
  if (deviceType === 'cloud') type = '云端';
  else if (deviceType === 'ssh') type = 'SSH';
  else {
    if (platform === 'win32') type = 'Windows';
    else if (platform === 'darwin') type = 'Mac';
    else if (platform === 'linux') type = 'Linux';
  }

  if (deviceType === 'cloud') {
    return `${type} Bot`;
  }

  return `${username}的${type}`;
}

function isAuthenticated() {
  const cfg = loadConfig();
  return cfg && cfg.token && cfg.email && cfg.email !== 'your-email@example.com';
}

module.exports = {
  loadConfig,
  saveConfig,
  clearConfig,
  getDeviceName,
  isAuthenticated,
  getPluginDir
};