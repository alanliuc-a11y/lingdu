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

- **End-to-end encryption**: AES-256-GCM before upload
- **User authorization required**: No automatic data collection
- **Open source**: Code is auditable at https://github.com/alanliuc-a11y/lingdu
- **Self-hostable**: Run your own server if needed

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
- **Version**: 2.0.0

## Support

- GitHub Issues: https://github.com/alanliuc-a11y/lingdu/issues
- Email: support@soulsync.work

---

**Formerly known as SoulSync**
