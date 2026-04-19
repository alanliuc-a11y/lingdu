# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.4] - 2026-04-15

### Documentation
- Enhanced README with detailed `child_process` security documentation
- Clarified daemon management is standard practice for Node.js plugins
- Documented security measures: no user input, fixed arguments, no shell injection risk
- Added code reference to implementation (index.js:240)
- Addresses ClawHub static analysis warning about shell command execution

---

## [2.0.3] - 2026-04-15

### Fixed
- Fixed domain inconsistency: unified all references to `soulsync.work` (removed `LingDu.work`)
- Fixed `src/api-client.js` default URL
- Fixed `src/device-code.js` default URL

### Documentation
- Enhanced README with detailed encryption documentation
- Added explicit encryption implementation reference (`src/sync-engine.js`)
- Documented AES-256-GCM client-side encryption process
- Clarified token storage location and security

### Security
- Improved `.gitignore` to exclude `config.json`
- Ensured no sensitive files (token, config.json) are included in package
- Addressed ClawHub security scan concerns

---

## [2.0.2] - 2026-04-15

### Fixed
- Fixed `repository.url` in package.json (was pointing to old `soulsync` repo)
- Corrected to `https://github.com/alanliuc-a11y/lingdu`
- Fixes npm publish provenance verification error

---

## [2.0.1] - 2026-04-15

### Added
- Plugin description in `openclaw.plugin.json` for better ClawHub presentation
- Comprehensive README.md with security and permissions documentation

---

## [2.0.0] - 2026-04-15

### 🎉 Major Rebranding

**BREAKING CHANGE**: Project renamed from SoulSync to LingDu (灵渡)

### Changed

#### Client Plugin
- **Package name**: `soulsync` → `lingdu`
- **Plugin ID**: `soulsync` → `lingdu`
- **Display name**: `SoulSync` → `LingDu`
- **Commands**: `soulsync:*` → `lingdu:*`
  - `soulsync:start` → `lingdu:start`
  - `soulsync:stop` → `lingdu:stop`
- **Tools**: `soulsync_*` → `lingdu_*`
  - `soulsync_status` → `lingdu_status`
  - `soulsync_connect` → `lingdu_connect`
  - `soulsync_sync` → `lingdu_sync`
  - `soulsync_logout` → `lingdu_logout`
  - `soulsync_devices` → `lingdu_devices`
  - `soulsync_rename_device` → `lingdu_rename_device`
- **Log prefix**: `[SoulSync]` → `[LingDu]`
- **User directory**: `~/.soulsync` → `~/.lingdu`
- **Lock file**: `soulsync.lock` → `lingdu.lock`

#### Server
- **Package name**: `soulsync-server` → `lingdu-server`
- **PM2 app name**: `soulsync-server` → `lingdu-server`
- **Email sender**: `SoulSync` → `LingDu (灵渡)`
- **Email subject**: Updated to use "LingDu" branding
- **Console logs**: Display "LingDu (灵渡)" instead of "SoulSync"

### Added
- OpenClaw plugin metadata for ClawHub compatibility
  - `openclaw.compat.pluginApi`: `>=2026.3.24-beta.2`
  - `openclaw.build.openclawVersion`: `2026.3.24-beta.2`
- Backward compatible trigger words in tool descriptions
  - Tools still respond to "SoulSync" and "soul sync" for user convenience
- Comprehensive rename specification document
- Complete rename checklist for systematic migration

### Preserved (Unchanged)
- **Service domain**: `https://soulsync.work` (no change)
- **GitHub repository**: `alanliuc-a11y/soulsync` (to be renamed)
- **Database filename**: `soulsync.db` (no migration needed)
- **npm legacy package**: `soulsync` (will be deprecated in favor of `lingdu`)

### Migration Notes

**For existing users:**
1. Uninstall old `soulsync` plugin (if applicable)
2. Install new `lingdu` plugin from ClawHub or npm
3. User data directory change: `~/.soulsync` → `~/.lingdu`
   - Manual migration required, or wait for auto-migration feature
4. Service domain remains `soulsync.work` - no changes needed

**For developers:**
- GitHub repository will be renamed to `alanliuc-a11y/lingdu`
- Old URL will redirect automatically
- Update your git remote: `git remote set-url origin https://github.com/alanliuc-a11y/lingdu.git`

---

## [1.2.2] - 2026-04-13

### Fixed
- Fixed config field inconsistency between `server_url` and `cloud_url`
- Fixed path module naming conflict in sync engine
- Enhanced debug logging for upload, download, and profiles operations

---

## [1.2.1] - 2026-04-12

### Fixed
- Fixed WebSocket heartbeat mechanism for connection stability
- Improved daemon process lifecycle management

---

## [1.2.0] - 2026-04-12

### Changed
- **Major refactor**: Sync engine architecture redesign
- Improved file change detection and conflict resolution
- Better error handling and retry mechanisms

---

## [1.1.6] - 2026-04-11

### Fixed
- Enhanced debug logging for troubleshooting
- Fixed profiles directory path resolution

---

## [1.1.5] - 2026-04-10

### Fixed
- Removed nvm dependency, now uses `process.execPath`
- Improved cross-platform compatibility

---

## [1.1.4] - 2026-04-09

### Fixed
- Corrected profiles directory path to `~/.openclaw/workspace`
- Fixed WebSocket connection stability issues

---

## [1.1.3] - 2026-04-08

### Added
- WebSocket heartbeat keep-alive mechanism
- Connection status monitoring

---

## [1.1.2] - 2026-04-07

### Fixed
- Minor bug fixes in daemon process
- Improved error messages

---

## [1.1.1] - 2026-04-06

### Fixed
- Fixed daemon startup issues on Windows
- Improved process singleton check

---

## [1.1.0] - 2026-04-05

### Changed
- **Major refactor**: Complete Node.js rewrite, removed Python dependency
- **New architecture**: 
  - File watching: `chokidar`
  - WebSocket: `ws`
  - Daemon process with singleton check
- **Cross-platform**: Full support for Windows, macOS, and Linux

### Removed
- Python dependency completely removed
- No longer requires Python installation

---

## [1.0.21] - 2026-03-24

### Fixed
- Minor bug fixes and stability improvements

---

## [1.0.15] - 2026-03-23

### Fixed
- CLI authorization flow improvements
- Enhanced user experience for device code flow

---

## [1.0.4] - 2026-03-15

### Added
- Initial ClawHub skill submission (legacy)

---

## [1.0.0] - 2026-03-02

### Added
- Initial release of SoulSync
- Three-file synchronization: SOUL.md, USER.md, MEMORY.md
- Device code authorization flow
- Real-time WebSocket sync
- Encrypted cloud storage with AWS KMS
- Multi-device support

---

[2.0.4]: https://github.com/alanliuc-a11y/lingdu/compare/v2.0.3...v2.0.4
[2.0.3]: https://github.com/alanliuc-a11y/lingdu/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/alanliuc-a11y/lingdu/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/alanliuc-a11y/lingdu/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/alanliuc-a11y/lingdu/compare/v1.2.2...v2.0.0
[1.2.2]: https://github.com/alanliuc-a11y/soulsync/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/alanliuc-a11y/soulsync/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/alanliuc-a11y/soulsync/compare/v1.1.6...v1.2.0
[1.1.6]: https://github.com/alanliuc-a11y/soulsync/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/alanliuc-a11y/soulsync/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/alanliuc-a11y/soulsync/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/alanliuc-a11y/soulsync/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/alanliuc-a11y/soulsync/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/alanliuc-a11y/soulsync/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/alanliuc-a11y/soulsync/compare/v1.0.21...v1.1.0
[1.0.21]: https://github.com/alanliuc-a11y/soulsync/compare/v1.0.15...v1.0.21
[1.0.15]: https://github.com/alanliuc-a11y/soulsync/compare/v1.0.4...v1.0.15
[1.0.4]: https://github.com/alanliuc-a11y/soulsync/compare/v1.0.0...v1.0.4
[1.0.0]: https://github.com/alanliuc-a11y/soulsync/releases/tag/v1.0.0
