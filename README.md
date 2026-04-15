# LingDu（灵渡）

> **Cross-device memory synchronization for AI assistants.**  
> **AI 助手的跨设备记忆同步系统。**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/soulsync.svg)](https://www.npmjs.com/package/soulsync)
[![Downloads](https://img.shields.io/npm/dm/soulsync.svg)](https://www.npmjs.com/package/soulsync)

🌐 [English](#english) | [中文](#中文)

---

## ⚠️ Rebranding Notice

**This project has been renamed from SoulSync to LingDu (灵渡).**

- **npm package**: `soulsync` (legacy, will be deprecated) → `lingdu` (coming soon)
- **OpenClaw plugin**: Now available as `lingdu`
- **Purpose**: The rebranding reflects our commitment to Chinese-first naming and resolves naming conflicts on ClawHub.

**Existing users**: Your data is safe. The service domain `soulsync.work` remains unchanged.

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

**Problem 4: Inefficient Manual Sync**
- Git? Commit + push + pull every time
- Cloud storage? File conflicts, sync delays, version chaos
- rsync? Complex setup, no real-time sync

---

### ✅ LingDu's Solution

LingDu is a **cloud-based memory synchronization system** designed for AI assistants:

| Pain Point | Traditional Solution | LingDu |
|------------|---------------------|---------|
| Memory not synced | Manual file copying | ⚡ Real-time auto-sync (< 1s) |
| Duplicate config | Reconfigure every device | ☁️ Set once, works everywhere |
| Data silos | Local storage, easy to lose | 🔒 Cloud encrypted storage, permanent |
| Manual sync inefficiency | Git/Cloud/rsync | 🤖 Zero-config, plugin handles it |

**Core Features**:
- 📝 **Three-file soul sync**: SOUL.md (personality), USER.md (user info), MEMORY.md (conversation history)
- ⚡ **Real-time sync**: File changes detected and synced in < 1s
- 🔐 **Encrypted cloud storage**: AES-256-GCM encryption, AWS KMS key management
- 🌍 **Multi-device support**: Unlimited devices, all stay in sync
- 🤖 **Zero-config**: Install plugin → authorize → auto sync
- 🔌 **Multi-AI support**: Works with OpenClaw, CoPaw, Claude Desktop, and more (coming soon)

---

### 📦 Installation

#### For OpenClaw Users (Recommended)

```bash
# Install LingDu plugin from ClawHub
openclaw plugin install lingdu

# Authorize and start syncing
# The AI will guide you through the setup
```

#### For npm Users

```bash
# Legacy package name (will be deprecated)
npm install soulsync

# New package name (coming soon)
npm install lingdu
```

#### For Other AI Assistants

We're working on support for:
- CoPaw (coming soon)
- Claude Desktop (coming soon)
- ChatGPT Desktop (planned)
- Other MCP-compatible assistants

---

### 🚀 Quick Start

1. **Install the plugin** (see Installation above)

2. **Authorize your account**

   In your AI chat:
   ```
   You: Connect LingDu
   AI: Opening browser for authorization...
   ```

   Or use command:
   ```bash
   openclaw lingdu:start
   ```

3. **Start syncing automatically**

   Your AI's memory files are now synced across all devices in real-time!

---

### 🎯 Use Cases

#### 1. Work-Life Balance
```
Office (Windows):
- Configure AI with work-related knowledge and tone
- Save project documentation and meeting notes

Home (macOS):
- Same AI personality and memories
- Continue conversations seamlessly
```

#### 2. Team Collaboration
```
Team Leader:
- Sets up shared AI configuration
- Defines team workflows and guidelines

Team Members:
- Inherit same AI setup
- Share collective knowledge base
```

#### 3. Multi-Device Developer
```
Desktop (coding):
- AI learns your coding patterns
- Saves project context and TODOs

Laptop (meetings):
- Same code knowledge available
- AI remembers project discussions
```

---

### 📚 Documentation

- [User Guide](docs/USER_GUIDE.md) (coming soon)
- [API Documentation](docs/API.md) (coming soon)
- [Migration Guide](docs/MIGRATION.md) (for SoulSync → LingDu)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

---

### 🛠️ Technical Architecture

```
┌─────────────────┐
│  Device A       │
│  ┌───────────┐  │         ┌──────────────┐
│  │ OpenClaw  │──┼────────▶│ LingDu Cloud │
│  │ + LingDu  │  │  HTTPS  │   Server     │
│  └───────────┘  │  WSS    │ (Encrypted)  │
└─────────────────┘         └──────────────┘
                                    │
┌─────────────────┐                 │
│  Device B       │                 │
│  ┌───────────┐  │                 │
│  │ OpenClaw  │──┼─────────────────┘
│  │ + LingDu  │  │
│  └───────────┘  │
└─────────────────┘
```

**Tech Stack**:
- **Client**: Node.js, WebSocket, File Watcher (chokidar)
- **Server**: Express.js, SQLite, WebSocket (ws)
- **Security**: AES-256-GCM, AWS KMS, JWT
- **Deployment**: AWS EC2, PM2

---

### 🔐 Security & Privacy

- **End-to-end encryption**: All files encrypted before leaving your device
- **Zero-knowledge architecture**: Server cannot decrypt your files
- **AWS KMS**: Military-grade key management
- **Open source**: Code is auditable and transparent
- **Self-hostable**: Run your own server if needed

---

### 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Fork and clone
git clone https://github.com/alanliuc-a11y/soulsync.git
cd soulsync

# Note: Repository will be renamed to 'lingdu' soon
```

---

### 📄 License

[MIT License](LICENSE) - Free to use and modify

---

### 💬 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/alanliuc-a11y/soulsync/issues)
- **Email**: support@soulsync.work
- **Documentation**: [Full docs](https://soulsync.work/docs)

---

## 中文

### 🔥 技术痛点

如果你在多台设备上使用 AI 助手（OpenClaw、CoPaw、Claude Desktop 等），一定遇到过这些问题：

**问题 1：记忆无法同步**
```
公司 MacBook：
你：总结一下今天的会议
AI：好的，已保存到 MEMORY.md

家里 Windows PC：
你：今天会议讨论了什么？
AI：抱歉，我没有这段记忆
```

**问题 2：重复配置**
- 每台设备重新配置 AI 的人格、说话风格、工作流程
- 手动复制粘贴自定义指令和提示词模板
- 新电脑？一切从头开始

**问题 3：数据孤岛**
- SOUL.md、USER.md、MEMORY.md 散落在各个设备
- 本地文件丢失 = 所有记忆丢失
- 无备份、无迁移、无分享

**问题 4：手动同步效率低**
- 用 Git？每次都要 commit + push + pull
- 用网盘？文件冲突、同步延迟、版本混乱
- 用 rsync？配置复杂、无法实时同步

---

### ✅ LingDu（灵渡）的解决方案

LingDu 是一个专为 AI 助手设计的**云端记忆同步系统**：

| 痛点 | 传统方案 | LingDu |
|------|---------|--------|
| 记忆不同步 | 手动复制文件 | ⚡ 实时自动同步（< 1秒） |
| 重复配置 | 每台设备重新配置 | ☁️ 一次设置，全局生效 |
| 数据孤岛 | 本地存储，易丢失 | 🔒 云端加密存储，永久保存 |
| 手动同步低效 | Git/网盘/rsync | 🤖 零配置，插件自动处理 |

**核心功能**：
- 📝 **三文件灵魂同步**：SOUL.md（人格）、USER.md（用户信息）、MEMORY.md（对话历史）
- ⚡ **实时同步**：文件变化 < 1 秒自动检测并同步
- 🔐 **加密云存储**：AES-256-GCM 加密，AWS KMS 密钥管理
- 🌍 **多设备支持**：无限设备，全部保持同步
- 🤖 **零配置**：安装插件 → 授权 → 自动同步
- 🔌 **多 AI 支持**：支持 OpenClaw、CoPaw、Claude Desktop 等（持续扩展中）

---

### 📦 安装

#### OpenClaw 用户（推荐）

```bash
# 从 ClawHub 安装 LingDu 插件
openclaw plugin install lingdu

# 授权并开始同步
# AI 会引导你完成设置
```

#### npm 用户

```bash
# 旧包名（将被废弃）
npm install soulsync

# 新包名（即将发布）
npm install lingdu
```

#### 其他 AI 助手

我们正在开发支持：
- CoPaw（开发中）
- Claude Desktop（开发中）
- ChatGPT Desktop（计划中）
- 其他 MCP 兼容助手

---

### 🚀 快速开始

1. **安装插件**（参见上方安装说明）

2. **授权账号**

   在 AI 对话中：
   ```
   你：连接 LingDu
   AI：正在打开浏览器进行授权...
   ```

   或使用命令：
   ```bash
   openclaw lingdu:start
   ```

3. **自动开始同步**

   你的 AI 记忆文件现在会在所有设备间实时同步！

---

### 🎯 使用场景

#### 1. 工作生活平衡
```
公司（Windows）：
- 配置 AI 为工作相关的知识和语气
- 保存项目文档和会议记录

家里（macOS）：
- 相同的 AI 人格和记忆
- 无缝继续对话
```

#### 2. 团队协作
```
团队负责人：
- 设置共享的 AI 配置
- 定义团队工作流程和指南

团队成员：
- 继承相同的 AI 设置
- 共享集体知识库
```

#### 3. 多设备开发者
```
台式机（编码）：
- AI 学习你的编码模式
- 保存项目上下文和 TODO

笔记本（会议）：
- 相同的代码知识可用
- AI 记住项目讨论
```

---

### 📚 文档

- [用户指南](docs/USER_GUIDE_CN.md)（即将发布）
- [API 文档](docs/API_CN.md)（即将发布）
- [迁移指南](docs/MIGRATION_CN.md)（SoulSync → LingDu）
- [故障排除](docs/TROUBLESHOOTING_CN.md)

---

### 🛠️ 技术架构

```
┌─────────────────┐
│  设备 A         │
│  ┌───────────┐  │         ┌──────────────┐
│  │ OpenClaw  │──┼────────▶│ LingDu 云端  │
│  │ + LingDu  │  │  HTTPS  │   服务器     │
│  └───────────┘  │  WSS    │   (加密)     │
└─────────────────┘         └──────────────┘
                                    │
┌─────────────────┐                 │
│  设备 B         │                 │
│  ┌───────────┐  │                 │
│  │ OpenClaw  │──┼─────────────────┘
│  │ + LingDu  │  │
│  └───────────┘  │
└─────────────────┘
```

**技术栈**：
- **客户端**：Node.js、WebSocket、文件监听（chokidar）
- **服务端**：Express.js、SQLite、WebSocket (ws)
- **安全**：AES-256-GCM、AWS KMS、JWT
- **部署**：AWS EC2、PM2

---

### 🔐 安全与隐私

- **端到端加密**：所有文件在离开设备前加密
- **零知识架构**：服务器无法解密你的文件
- **AWS KMS**：军用级密钥管理
- **开源透明**：代码可审计和验证
- **可自托管**：如需要可运行自己的服务器

---

### 🤝 贡献

欢迎贡献！查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

```bash
# Fork 并克隆
git clone https://github.com/alanliuc-a11y/soulsync.git
cd soulsync

# 注意：仓库即将更名为 'lingdu'
```

---

### 📄 许可证

[MIT 许可证](LICENSE) - 自由使用和修改

---

### 💬 支持

- **GitHub Issues**：[报告问题或请求功能](https://github.com/alanliuc-a11y/soulsync/issues)
- **邮箱**：support@soulsync.work
- **文档**：[完整文档](https://soulsync.work/docs)

---

**Formerly known as SoulSync | 原名 SoulSync**
