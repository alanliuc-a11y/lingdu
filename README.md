# LingDu（灵渡）v3.0

> **Cross-device memory synchronization for AI assistants.**  
> **AI 助手的跨设备记忆同步系统。**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/lingdu-core.svg)](https://www.npmjs.com/package/lingdu-core)

🌐 [English](#english) | [中文](#中文)

---

## 🎉 v3.0 重大更新

**LingDu v3.0 采用全新的"一核多壳"架构**，实现：

- ✅ **核心库独立**：`lingdu-core` 可被任何平台复用
- ✅ **CLI 工具**：`lingdu` 命令行工具，支持 WorkBuddy、CoPaw 等平台
- ✅ **插件薄壳**：OpenClaw 插件只需 ~300 行代码
- ✅ **快速接入**：新平台接入时间从 3 天缩短到 < 1 天
- ✅ **维护成本低**：核心逻辑只写一次，多个平台共享

### 架构对比

**v2.x（旧架构）**：
```
每个平台都是独立的完整代码库
→ 维护成本随平台数量线性增长
```

**v3.0（新架构）**：
```
lingdu-core（核心库）
  ├── lingdu（CLI 工具）
  ├── lingdu-openclaw（OpenClaw 插件）
  ├── lingdu-mcp（MCP Server，未来）
  └── lingdu-xxx（其他平台）
→ 核心逻辑只写一次，接入新平台只需 < 300 行代码
```

---

## English

### 🔥 Technical Pain Points

If you use AI assistants (OpenClaw, CoPaw, Claude Desktop, etc.) across multiple devices, you've probably encountered these issues:

**Problem 1: Memory Not Synced**
```
Office MacBook:
You: Summarize today's meeting
AI: Done, saved to MEMORY.md

Home Windows PC:
You: What did we discuss in today's meeting?
AI: Sorry, I don't have that memory
```

**Problem 2: Duplicate Configuration**
- Reconfigure AI's personality, speaking style, and workflows on every device
- Manually copy-paste custom instructions and prompt templates
- New computer? Start from scratch

**Problem 3: Data Silos**
- SOUL.md, USER.md, MEMORY.md scattered across devices
- Local file loss = all memories lost
- No backup, no migration, no sharing

---

### ✅ LingDu's Solution

LingDu is a **cloud-based memory synchronization system** designed for AI assistants:

| Pain Point | LingDu Solution |
|-----------|----------------|
| Memory not synced | Real-time sync via WebSocket, < 1s latency |
| Duplicate configuration | One-time setup, auto-sync to all devices |
| Data silos | Cloud storage + local backup, never lose data |
| Manual sync | Auto-sync on file change, zero manual work |

---

### 📦 Installation

#### For OpenClaw Users

Install the plugin from ClawHub:

```bash
# Search for "lingdu" in ClawHub
# Or install via CLI
openclaw plugin install lingdu
```

#### For WorkBuddy / CoPaw Users

Install via npm:

```bash
npm install -g lingdu
```

#### For Developers

Install the core library:

```bash
npm install lingdu-core
```

---

### 🚀 Quick Start

#### OpenClaw Plugin

1. Install the plugin from ClawHub
2. Run the `auth` tool to authorize
3. Files will auto-sync in the background

#### CLI Tool

```bash
# Start sync for OpenClaw
lingdu start openclaw

# Start sync for WorkBuddy
lingdu start workbuddy

# Start sync for CoPaw
lingdu start copaw

# Check status
lingdu status

# List supported platforms
lingdu platforms
```

---

### 🏗️ Architecture (v3.0)

```
lingdu/
├── packages/
│   ├── lingdu-core/        # Core library (npm)
│   │   ├── sync/           # Sync engine
│   │   ├── api/            # API client
│   │   ├── auth/           # Authentication
│   │   ├── schema/         # Schema processing
│   │   └── config/         # Config management
│   │
│   ├── lingdu/             # CLI tool (npm)
│   │   ├── bin/lingdu.js   # CLI entry
│   │   └── platforms/      # Platform configs
│   │
│   └── lingdu-openclaw/    # OpenClaw plugin (ClawHub)
│       └── src/index.js    # Plugin adapter (~300 lines)
```

**Key Principles**:
- **One Core, Multiple Shells**: Core logic written once, shared by all platforms
- **Platform Agnostic**: Core library has zero platform-specific code
- **Thin Adapters**: Each platform only needs a thin adapter layer (< 300 lines)

---

### 🔧 For Developers

#### Using lingdu-core in Your Project

```javascript
const { SyncEngine, ConfigManager, APIClient } = require('lingdu-core');

// Initialize config
const configMgr = new ConfigManager('/path/to/config');
const config = configMgr.load();

// Create sync engine
const engine = new SyncEngine({
  ...config,
  profilesDir: '/path/to/profiles'
});

// Start syncing
await engine.initialize();
await engine.connect();
```

#### Adding a New Platform

1. Create a platform config (< 10 lines):
```javascript
// platforms/myplatform.js
module.exports = {
  name: 'MyPlatform',
  profilesDir: path.join(os.homedir(), '.myplatform', 'workspace'),
  configDir: path.join(os.homedir(), '.lingdu')
};
```

2. Register the platform:
```javascript
// platforms/index.js
const platforms = {
  myplatform: require('./myplatform'),
  // ... other platforms
};
```

3. Done! Users can now run:
```bash
lingdu start myplatform
```

---

### 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Platform Integration Guide](./docs/PLATFORM_INTEGRATION.md)
- [Migration Guide (v2.x → v3.0)](./docs/MIGRATION.md)

---

### 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

### 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 中文

### 🔥 技术痛点

如果你在多台设备上使用 AI 助手（OpenClaw、CoPaw、Claude Desktop 等），你可能遇到过这些问题：

**痛点 1：记忆不同步**
```
公司 MacBook：
你：总结今天的会议
AI：好的，已保存到 MEMORY.md

家里 Windows PC：
你：今天会议讨论了什么？
AI：抱歉，我没有这段记忆
```

**痛点 2：重复配置**
- 每台设备都要重新配置 AI 的性格、说话风格、工作流程
- 手动复制粘贴自定义指令和提示词模板
- 换新电脑？从头再来

**痛点 3：数据孤岛**
- SOUL.md、USER.md、MEMORY.md 散落在各个设备
- 本地文件丢失 = 所有记忆丢失
- 无备份、无迁移、无共享

---

### ✅ LingDu 的解决方案

LingDu 是为 AI 助手设计的**云端记忆同步系统**：

| 痛点 | LingDu 解决方案 |
|-----|---------------|
| 记忆不同步 | WebSocket 实时同步，延迟 < 1 秒 |
| 重复配置 | 一次配置，自动同步到所有设备 |
| 数据孤岛 | 云端存储 + 本地备份，永不丢失 |
| 手动同步 | 文件变化自动同步，零手动操作 |

---

### 📦 安装

#### OpenClaw 用户

从 ClawHub 安装插件：

```bash
# 在 ClawHub 搜索 "lingdu"
# 或通过 CLI 安装
openclaw plugin install lingdu
```

#### WorkBuddy / CoPaw 用户

通过 npm 安装：

```bash
npm install -g lingdu
```

#### 开发者

安装核心库：

```bash
npm install lingdu-core
```

---

### 🚀 快速开始

#### OpenClaw 插件

1. 从 ClawHub 安装插件
2. 运行 `auth` 工具进行授权
3. 文件将在后台自动同步

#### CLI 工具

```bash
# 为 OpenClaw 启动同步
lingdu start openclaw

# 为 WorkBuddy 启动同步
lingdu start workbuddy

# 为 CoPaw 启动同步
lingdu start copaw

# 检查状态
lingdu status

# 列出支持的平台
lingdu platforms
```

---

### 🏗️ 架构（v3.0）

```
lingdu/
├── packages/
│   ├── lingdu-core/        # 核心库（npm）
│   │   ├── sync/           # 同步引擎
│   │   ├── api/            # API 客户端
│   │   ├── auth/           # 认证
│   │   ├── schema/         # Schema 处理
│   │   └── config/         # 配置管理
│   │
│   ├── lingdu/             # CLI 工具（npm）
│   │   ├── bin/lingdu.js   # CLI 入口
│   │   └── platforms/      # 平台配置
│   │
│   └── lingdu-openclaw/    # OpenClaw 插件（ClawHub）
│       └── src/index.js    # 插件适配层（~300 行）
```

**核心原则**：
- **一核多壳**：核心逻辑只写一次，多个平台共享
- **平台无关**：核心库零平台特定代码
- **薄适配层**：每个平台只需薄适配层（< 300 行）

---

### 🔧 开发者指南

#### 在你的项目中使用 lingdu-core

```javascript
const { SyncEngine, ConfigManager, APIClient } = require('lingdu-core');

// 初始化配置
const configMgr = new ConfigManager('/path/to/config');
const config = configMgr.load();

// 创建同步引擎
const engine = new SyncEngine({
  ...config,
  profilesDir: '/path/to/profiles'
});

// 开始同步
await engine.initialize();
await engine.connect();
```

#### 接入新平台

1. 创建平台配置（< 10 行）：
```javascript
// platforms/myplatform.js
module.exports = {
  name: 'MyPlatform',
  profilesDir: path.join(os.homedir(), '.myplatform', 'workspace'),
  configDir: path.join(os.homedir(), '.lingdu')
};
```

2. 注册平台：
```javascript
// platforms/index.js
const platforms = {
  myplatform: require('./myplatform'),
  // ... 其他平台
};
```

3. 完成！用户现在可以运行：
```bash
lingdu start myplatform
```

---

### 📚 文档

- [架构概览](./docs/ARCHITECTURE.md)
- [API 参考](./docs/API.md)
- [平台接入指南](./docs/PLATFORM_INTEGRATION.md)
- [迁移指南（v2.x → v3.0）](./docs/MIGRATION.md)

---

### 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

---

### 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=alanliuc-a11y/lingdu&type=Date)](https://star-history.com/#alanliuc-a11y/lingdu&Date)