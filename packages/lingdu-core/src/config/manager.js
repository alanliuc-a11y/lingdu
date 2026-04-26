const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor(configDir) {
    this.configDir = configDir || this.detectConfigDir();
    this.config = null;
  }

  detectConfigDir() {
    return path.join(os.homedir(), '.lingdu');
  }

  getConfigPath() {
    return path.join(this.configDir, 'config.json');
  }

  load() {
    if (this.config) return this.config;

    const configPath = this.getConfigPath();

    try {
      if (fs.existsSync(configPath)) {
        this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (!this.config.cloud_url && this.config.server_url) {
          this.config.cloud_url = this.config.server_url;
        }
        if (!this.config.cloud_url) {
          this.config.cloud_url = 'https://soulsync.work';
        }
        return this.config;
      }
    } catch (e) {
      console.error('[LingDu] Error loading config:', e);
    }
    return null;
  }

  save(newConfig) {
    const configPath = this.getConfigPath();

    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      let existing = {};
      if (fs.existsSync(configPath)) {
        existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      if (newConfig.server_url && !newConfig.cloud_url) {
        newConfig.cloud_url = newConfig.server_url;
        delete newConfig.server_url;
      }
      this.config = { ...existing, ...newConfig };
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (e) {
      console.error('[LingDu] Error saving config:', e);
      return false;
    }
  }

  clear() {
    const configPath = this.getConfigPath();

    try {
      if (fs.existsSync(configPath)) {
        const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        delete existing.token;
        delete existing.email;
        delete existing.device_id;
        delete existing.device_name;
        fs.writeFileSync(configPath, JSON.stringify(existing, null, 2));
        this.config = existing;
      }
      return true;
    } catch (e) {
      console.error('[LingDu] Error clearing config:', e);
      return false;
    }
  }

  isAuthenticated() {
    const cfg = this.load();
    return cfg && cfg.token && cfg.email && cfg.email !== 'your-email@example.com';
  }

  static getDeviceName(deviceType = 'local') {
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

    return `${username}@${type}`;
  }
}

module.exports = { ConfigManager };
