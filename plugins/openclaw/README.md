# LingDu (灵渡) - OpenClaw Plugin

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

**Note**: Your token is stored locally in `~/.lingdu/config.json` and is never shared.

## Permissions

This plugin:
- ✅ Reads files: `SOUL.md`, `USER.md`, `MEMORY.md` from workspace
- ✅ Writes files: Downloads updates from cloud to workspace
- ✅ Network access: Connects to configured cloud server
- ✅ Background process: Runs daemon for file watching

## Source Code

- **Repository**: https://github.com/alanliuc-a11y/lingdu
- **License**: MIT
- **Version**: 2.0.2

## Support

- GitHub Issues: https://github.com/alanliuc-a11y/lingdu/issues
- Email: support@soulsync.work

---

**Formerly known as SoulSync**
