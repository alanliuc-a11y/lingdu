const path = require('path');
const os = require('os');

const OPENCLAW_PLATFORM = {
  name: 'OpenClaw',
  profilesDir: path.join(os.homedir(), '.openclaw', 'workspace'),
  configDir: path.join(os.homedir(), '.lingdu')
};

module.exports = { OPENCLAW_PLATFORM };
