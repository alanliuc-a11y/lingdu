const fs = require('fs');
const path = require('path');

class WorkBuddyAdapter {
  constructor(memeryPath) {
    this.memeryPath = memeryPath;
  }

  read() {
    if (!fs.existsSync(this.memeryPath)) {
      return { uid: '', name: '', preferences: [], facts: [], version: 0 };
    }
    const content = fs.readFileSync(this.memeryPath, 'utf-8');
    return this.parse(content);
  }

  parse(content) {
    const schema = { uid: '', name: '', preferences: [], facts: [], version: 1 };
    const uidMatch = content.match(/\*\*UID\*\*:\s*(.+)/);
    if (uidMatch) schema.uid = uidMatch[1].trim();
    const nameMatch = content.match(/\*\*Name\*\*:\s*(.+)/);
    if (nameMatch) schema.name = nameMatch[1].trim();
    const versionMatch = content.match(/> Version:\s*(\d+)/);
    if (versionMatch) schema.version = parseInt(versionMatch[1], 10);
    return schema;
  }

  write(schema) {
    const version = (schema.version || 0) + 1;
    const content = `# User Memory Profile\n\n> Last updated: ${new Date().toISOString()}\n> Version: ${version}\n\n## Basic Info\n\n- **UID**: ${schema.uid || ''}\n- **Name**: ${schema.name || ''}\n\n## Work Context\n\n${schema.workContext || '_(Your work context)_'}\n\n---\n\n<!-- RAW_JSON_START\n{\n  "uid": "${schema.uid || ''}",\n  "name": "${schema.name || ''}",\n  "memoryBlock": ""\n}\nRAW_JSON_END -->\n`;
    fs.writeFileSync(this.memeryPath, content, 'utf-8');

    const stateFile = path.join(path.dirname(this.memeryPath), 'user-memery-state.json');
    let state = {};
    if (fs.existsSync(stateFile)) {
      try {
        state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      } catch (e) {
        state = {};
      }
    }
    state[schema.uid] = { current_version: version };
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
  }
}

module.exports = WorkBuddyAdapter;
