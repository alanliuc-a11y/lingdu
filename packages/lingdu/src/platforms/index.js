const path = require('path');
const os = require('os');
const workbuddy = require('./workbuddy');

const platforms = {
  openclaw: {
    name: 'OpenClaw',
    profilesDir: path.join(os.homedir(), '.openclaw', 'workspace'),
    configDir: path.join(os.homedir(), '.lingdu')
  },
  workbuddy: workbuddy,
  copaw: {
    name: 'CoPaw',
    profilesDir: path.join(os.homedir(), '.copaw', 'workspace'),
    configDir: path.join(os.homedir(), '.lingdu')
  }
};

function getPlatform(name) {
  return platforms[name] || null;
}

function listPlatforms() {
  return Object.entries(platforms).map(([key, val]) => ({
    key,
    name: val.name,
    profilesDir: val.profilesDir
  }));
}

module.exports = { platforms, getPlatform, listPlatforms };
