# Changelog

All notable changes to the SoulSync plugin will be documented in this file.

## [1.2.2] - 2026-04-12

### Fixed
- **CONFIG-FIELD-001**: Fixed config field inconsistency between `server_url` and `cloud_url`
  - `loadConfig()`: Auto-map `server_url` to `cloud_url` when后者 is missing
  - `loadConfig()`: Use default value `https://soulsync.work` when both fields are missing
  - `saveConfig()`: Unify field naming by mapping `server_url` to `cloud_url` and removing redundant field
  - This fix ensures new device installations work correctly without manual config editing

## [1.2.0] - 2026-04-09

### Added
- Initial release with multi-device sync support
- WebSocket real-time synchronization
- File watching with chokidar
- Conflict resolution with backup creation
- Cross-platform support (Windows/macOS/Linux)
