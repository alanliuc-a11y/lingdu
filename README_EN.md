# SoulSync

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SoulSync is a **cross-bot soul synchronization system**. It allows your AI assistants (like OpenClaw) to share the same memory, personality, and skills across multiple devices and platforms.

## Features

- **Cloud-based memory storage** – All memories are stored in the cloud, accessible from anywhere.
- **Real-time synchronization** – Changes are instantly synced via WebSocket.
- **Multi-bot support** – Currently supports OpenClaw; more bots (CoPaw, etc.) coming soon.
- **Progressive open source** – Backend code will be open-sourced after each major phase.

## Backend Service

The backend service is officially hosted and maintained by the SoulSync team. Users only need to install the plugin and connect to the official cloud service.

**Current Phase**: Phase 1 - Basic sync (v1.0.x)

> 🎉 **SoulSync is currently free for all users during the early access period!**

**Planned Pricing** (not yet in effect):

| Tier | Monthly | Yearly | Synced Files |
|------|---------|--------|--------------|
| **Free** | $0 | - | MEMORY.md, USER.md |
| **Basic** | $1.19 | $11.9 | + IDENTITY.md, SOUL.md, TOOLS.md |
| **Pro** | $3.99 | $39.9 | + AGENTS.md, skills.json, memory/ |

- Free tier provides essential emotional connection - your bot remembers your name and preferences immediately.
- Upgrade anytime to unlock more files.

## Open Source Roadmap

SoulSync follows a **5-phase progressive open-source strategy**. After each phase, the previous phase's backend code will be open-sourced.

| Phase | Version | Features | Open Source Timeline |
|-------|---------|----------|---------------------|
| **Phase 1** | v1.0.x | Basic sync, single user | After Phase 2 release |
| **Phase 2** | v2.0.0 | Multi-bot collaboration | After Phase 3 release |
| **Phase 3** | v3.0.0 | "Singularity" | After Phase 4 release |
| **Phase 4** | v4.0.0 | "Fusion" | After Phase 5 release |
| **Phase 5** | v5.0.0 | "Evolution" | Fully open source |

This approach ensures:
- ✅ Sustainable development with subscription revenue
- ✅ Community trust through progressive transparency
- ✅ Self-hosting option for users who need it
- ✅ Continuous innovation and feature development

## Project Structure

```
soulsync/
├── plugins/
│   ├── base/            # Base classes for future bots
│   └── openclaw/        # OpenClaw plugin (this repo)
│       ├── src/
│       ├── config.json.example
│       └── requirements.txt
└── README.md

Note: Backend server code is maintained separately and will be open-sourced progressively.
```

## Getting Started

### 1. Register account

Visit our official website (coming soon) to register an account. All features are currently free during early access.

### 2. Install the OpenClaw plugin

```bash
openclaw plugins install soulsync
```

Or install from local directory:

```bash
openclaw plugins install /path/to/soulsync/plugins/openclaw
```

### 3. Configure the plugin

Edit `~/.openclaw/extensions/soulsync/config.json`:

```json
{
  "cloud_url": "https://soulsync.work",
  "email": "your-email@example.com",
  "password": "your-password"
}
```

Note: The cloud_url points to the official SoulSync server. Self-hosting will be available after the corresponding phase is open-sourced.

### 4. Start the plugin

```bash
openclaw soulsync:start
```

## Self-Hosting (Future)

According to our Open Source Roadmap, backend code will be progressively open-sourced:

- **Phase 1 code**: Available after v2.0.0 release (estimated Q3 2026)
- **Phase 2 code**: Available after v3.0.0 release (estimated Q1 2027)
- **Phase 3 code**: Available after v4.0.0 release (estimated Q3 2027)
- **Phase 4 code**: Available after v5.0.0 release (estimated 2028)
- **Phase 5 code**: Fully open source

If you need self-hosting immediately, please consider:
- Supporting the project through subscription
- Contributing to the plugin development
- Waiting for the corresponding phase release

## How It Works

SoulSync creates a persistent memory layer for your AI assistants:

1. **Memory Files** – Store your bot's identity, skills, and memories in Markdown files
2. **Cloud Sync** – All changes are automatically uploaded to the cloud
3. **Multi-Device** – Access the same memory from any device with OpenClaw installed
4. **Real-time** – WebSocket connection ensures instant synchronization

## Documentation

- [Installation Guide](plugins/openclaw/INSTALL.md)
- [Troubleshooting](plugins/openclaw/TROUBLESHOOTING.md)
- [Deployment Checklist](plugins/openclaw/DEPLOY_CHECKLIST.md)

## License

MIT License - see [LICENSE](LICENSE) file for details.
