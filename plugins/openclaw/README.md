# LingDu (灵渡) - OpenClaw Plugin

> **Documentation Note**: This README serves as the official plugin documentation.  
> All security and privacy claims are backed by auditable source code at  
> https://github.com/alanliuc-a11y/lingdu

Cross-device memory synchronization for AI assistants.

## What This Plugin Does

Syncs your AI assistant's memory files across devices:
- **SOUL.md**: AI personality and configuration
- **USER.md**: User information and preferences  
- **MEMORY.md**: Conversation history

## How It Works

1. **Authorization**: Browser-based device code flow (OAuth-style)
2. **File Monitoring**: Watches OpenClaw workspace for changes
3. **Cloud Sync**: Encrypted upload to LingDu cloud server
4. **Background Service**: Daemon process ensures real-time sync

## Security & Privacy

### Encryption (AES-256-GCM)
Files are encrypted **client-side** before upload:
- **Algorithm**: AES-256-GCM (Authenticated encryption)
- **Implementation**: See `src/sync-engine.js` - `encryptData()` and `decryptData()` functions
- **Key management**: Encryption keys derived from user token (stored locally only)
- **Plaintext never leaves your device**: All encryption happens before network transmission

#### Encryption Verification

You can verify that all uploads are encrypted client-side:

1. **Code location**: `src/sync-engine.js` (encryptData/decryptData functions)
2. **Upload flow**: 
   ```
   File read → encryptData() → HTTP POST (encrypted data only)
   ```
3. **Audit steps**:
   - Search for `uploadFile` calls in codebase
   - Confirm `encryptData()` is called before all network requests
   - Verify no plaintext in request payloads

**Example encryption flow**:
```javascript
// src/sync-engine.js
async function uploadFile(filePath, content) {
  const encrypted = encryptData(content, derivedKey); // ← Client-side encryption
  await apiClient.post('/api/files', { data: encrypted }); // ← Only encrypted data sent
}
```

**Guarantee**: No plaintext file content is ever transmitted over the network.  
**Audit**: https://github.com/alanliuc-a11y/lingdu/blob/main/plugins/openclaw/src/sync-engine.js

### No Data Collection
- **User authorization required**: Browser-based OAuth-style flow
- **No automatic uploads**: Sync only starts after explicit user consent
- **No telemetry**: Plugin does not collect usage data or analytics

### Open Source & Auditable
- **Full source code**: https://github.com/alanliuc-a11y/lingdu
- **Transparent**: All encryption and network code is visible and reviewable
- **Self-hostable**: Run your own server for complete control

### Token Storage
- **Local only**: Token stored in `~/.lingdu/config.json`
- **Never shared**: Token is never transmitted to third parties
- **File permissions**: Config file should be readable only by you (chmod 600 recommended)

## Installation

```bash
openclaw plugin install clawhub:lingdu
```

## Configuration

The plugin requires:
- **Email**: For account verification
- **Cloud URL**: Server address (default: https://soulsync.work)
- **Token**: Auto-generated after authorization

**Note**: Your token is stored locally in the plugin directory and is never shared.  
Typical locations:
- macOS/Linux: `~/.openclaw/extensions/lingdu/plugins/openclaw/config.json`
- Windows: `%USERPROFILE%\.openclaw\extensions\lingdu\plugins\openclaw\config.json`

Ensure this file has appropriate permissions (chmod 600 recommended on Unix systems).

## Permissions

This plugin:
- ✅ **Reads files**: `SOUL.md`, `USER.md`, `MEMORY.md` from workspace
- ✅ **Writes files**: Downloads updates from cloud to workspace
- ✅ **Network access**: Connects to configured cloud server (default: https://soulsync.work)
- ✅ **Background process**: Runs daemon for file watching

### About Background Process (child_process)
The plugin uses Node.js `child_process.spawn()` to start a background daemon. This is necessary for:
- **Real-time file monitoring**: Watches workspace files for changes
- **Automatic sync**: Uploads changes without manual intervention
- **Process isolation**: Daemon runs independently from OpenClaw

**Security notes**:
- **No user input**: The spawn command uses fixed arguments only
- **Controlled execution**: Only starts/stops the daemon script (`src/daemon.js`)
- **No shell injection risk**: Uses `spawn()` with array arguments (not shell strings)
- **Auditable code**: See `index.js` line 240 for implementation

**Command executed**:
```javascript
spawn(process.execPath, [daemonScript, mode], {
  cwd: pluginDir,
  env: { OPENCLAW_PLUGIN: 'true', PLUGIN_DIR: pluginDir },
  detached: true,
  stdio: 'ignore'
})
```

This is standard practice for daemon management in Node.js plugins.

## Source Code

- **Repository**: https://github.com/alanliuc-a11y/lingdu
- **License**: MIT
- **Version**: 2.0.2

## Support

- GitHub Issues: https://github.com/alanliuc-a11y/lingdu/issues
- Email: support@soulsync.work

---

**Formerly known as SoulSync**
