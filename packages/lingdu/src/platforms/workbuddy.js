const path = require('path');
const os = require('os');
const fs = require('fs');

function getMemeryPath() {
  const dir = path.join(os.homedir(), '.workbuddy', 'memery');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const file = files.find(f => f.endsWith('_memery.md'));
  return file ? path.join(dir, file) : null;
}

function getOrCreateMemeryPath() {
  const dir = path.join(os.homedir(), '.workbuddy', 'memery');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const files = fs.readdirSync(dir);
  const existing = files.find(f => f.endsWith('_memery.md'));
  if (existing) return path.join(dir, existing);

  const uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });

  const file = path.join(dir, `${uid}_memery.md`);
  fs.writeFileSync(file, `# User Memory Profile\n\n> Last updated: ${new Date().toISOString()}\n> Version: 1\n\n## Basic Info\n\n- **UID**: ${uid}\n- **Name**: \n\n## Work Context\n\n_(Your work context)_\n\n---\n\n<!-- RAW_JSON_START\n{\n  "uid": "${uid}",\n  "name": "",\n  "memoryBlock": ""\n}\nRAW_JSON_END -->\n`, 'utf-8');

  return file;
}

module.exports = {
  name: 'WorkBuddy',
  profilesDir: path.join(os.homedir(), '.workbuddy'),
  getMemeryPath: getMemeryPath,
  getOrCreateMemeryPath: getOrCreateMemeryPath,
  configDir: path.join(os.homedir(), '.lingdu')
};
