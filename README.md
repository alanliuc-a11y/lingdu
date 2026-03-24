# SoulSync（灵渡）

> **Cross-device soul synchronization for AI assistants.**  
> **AI 助手的跨设备灵魂同步系统。**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/soulsync.svg)](https://www.npmjs.com/package/soulsync)
[![Downloads](https://img.shields.io/npm/dm/soulsync.svg)](https://www.npmjs.com/package/soulsync)

🌐 [English](#english) | [中文](#中文)

---

## 中文

### 🔥 技术痛点

如果你在多台设备上使用 AI 助手（OpenClaw、CoPaw、Claude Desktop 等），你一定遇到过这些问题：

**问题 1：记忆不同步**
```
办公室 MacBook：
你：帮我总结今天的会议要点
AI：好的，已记录到 MEMORY.md

家里 Windows PC：
你：今天会议讨论了什么？
AI：抱歉，我没有相关记忆
```

**问题 2：配置重复设置**
- 每台设备都要重新配置 AI 的性格、说话风格、工作流程
- 自定义指令、Prompt 模板需要手动复制粘贴
- 换新电脑？从头再来一遍

**问题 3：数据孤岛**
- SOUL.md、USER.md、MEMORY.md 分散在各台设备
- 本地文件丢失 = 所有记忆丢失
- 无法备份、无法迁移、无法共享

**问题 4：手动同步低效**
- 用 Git？每次都要 commit + push + pull
- 用网盘？文件冲突、同步延迟、版本混乱
- 用 rsync？配置复杂、不支持实时同步

---

### ✅ SoulSync 的解决方案

SoulSync 是一个**云端灵魂同步系统**，专为 AI 助手设计：

| 痛点 | 传统方案 | SoulSync |
|------|----------|----------|
| 记忆不同步 | 手动复制文件 | ⚡ 实时自动同步（< 1 秒） |
| 配置重复设置 | 每台设备重新配置 | ☁️ 一次设置，全设备生效 |
| 数据孤岛 | 本地存储，易丢失 | 🔒 云端加密存储，永久保存 |
| 手动同步低效 | Git/网盘/rsync | 🤖 零配置，插件自动处理 |

**核心特性**：
- 📝 **三大灵魂文件同步**：SOUL.md（性格）、USER.md（用户信息）、MEMORY.md（记忆）
- ⚡ **WebSocket 实时推送**：修改后 1 秒内同步到所有设备
- 🔒 **端到端加密**：数据传输和存储全程加密（即将推出）
- 🤖 **零配置**：安装插件后，对话式授权即可使用
- 🌍 **跨平台**：Windows、macOS、Linux 全支持
- 🆓 **免费开始**：基础功能永久免费

---

### 🚀 快速开始（命令行模式）

> **注意**：当前仅测试了命令行安装模式。对话式安装和混合模式正在测试中，暂不推荐使用。

#### 前置条件
- 已安装 [OpenClaw](https://openclaw.ai)
- Node.js 16+ 或 Python 3.8+

#### 1. 安装插件

```bash
# 方式 1：从 npm 安装（推荐）
npm install -g soulsync

# 方式 2：从 GitHub 安装
git clone https://github.com/alanliuc-a11y/soulsync.git
cd soulsync/plugins/openclaw
npm install
npm link  # 全局链接
```

#### 2. 授权设备

安装完成后，在 OpenClaw 对话框中输入：
```
授权 SoulSync
```
或
```
连接 SoulSync
```

AI 助手会返回一个授权链接，例如：
```
请在浏览器中打开以下链接完成授权：
https://soulsync.work/auth?code=ABC123XYZ
```

#### 3. 在浏览器中完成授权

**首次使用（注册）**：
1. 打开授权链接
2. 输入邮箱（例如：user@example.com）
3. 收到 6 位验证码（检查邮箱）
4. 输入验证码
5. 设置密码（8 位以上）
6. 注册成功，自动跳转

**已有账号（登录）**：
1. 打开授权链接
2. 输入邮箱和密码
3. 登录成功，自动跳转

#### 4. 返回 OpenClaw

授权成功后，AI 助手会显示：
```
Alan你好，我是三澍，非常高兴能在 MacBook Pro 再次与你相遇。

已同步: SOUL.md / USER.md / MEMORY.md
```

完成！现在你的灵魂文件已经开始自动同步。

---

### 📖 工作原理

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   设备 A        │         │   SoulSync Cloud     │         │   设备 B        │
│   OpenClaw      │◄───────►│   soulsync.work      │◄───────►│   OpenClaw      │
│                 │WebSocket│                      │WebSocket│                 │
│  ~/.openclaw/   │         │  ┌────────────────┐  │         │  ~/.openclaw/   │
│  └─ profiles/   │         │  │ PostgreSQL DB  │  │         │  └─ profiles/   │
│     └─ SOUL.md  │         │  │ File Storage   │  │         │     └─ SOUL.md  │
│     └─ USER.md  │         │  │ Sync Engine    │  │         │     └─ USER.md  │
│     └─ MEMORY.md│         │  └────────────────┘  │         │     └─ MEMORY.md│
└─────────────────┘         └──────────────────────┘         └─────────────────┘
```

**同步流程**：
1. 设备 A 的 OpenClaw 修改 `MEMORY.md`（例如添加一条新记忆）
2. SoulSync 插件通过文件监听检测到变化
3. 通过 WebSocket 实时推送到云端（HTTPS 加密）
4. 云端验证 token，更新数据库
5. 云端通过 WebSocket 广播给所有已连接设备
6. 设备 B 的 SoulSync 插件接收更新，写入本地文件
7. 设备 B 的 OpenClaw 自动加载新的 `MEMORY.md`

**延迟**：通常 < 1 秒（取决于网络状况）

---

### 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `授权 SoulSync` | 授权当前设备（首次使用） |
| `查看我的 SoulSync 设备` | 查看所有已连接设备 |
| `同步 SoulSync` | 手动触发同步（通常不需要） |
| `登出 SoulSync` | 解绑当前设备 |

---

### 🎯 使用场景

#### 场景 1：多设备开发者
```
办公室 Ubuntu 工作站
  ↓ 实时同步
家里 MacBook Pro
  ↓ 实时同步
出差时的 Windows 笔记本
```

AI 助手在所有设备上都记得你的：
- 项目上下文
- 代码风格偏好
- 常用命令和工作流程

#### 场景 2：团队协作（即将推出）
```
团队成员 A
  ↓ 共享灵魂文件
团队成员 B
  ↓ 共享灵魂文件
团队成员 C
```

团队共享同一个 AI 助手的知识库：
- 新成员加入时，AI 已经了解团队的工作方式
- 项目文档、代码规范自动同步
- 减少重复培训时间

#### 场景 3：数据备份与迁移
- **本地文件丢失**：云端永久保存，随时恢复
- **换新电脑**：重新授权即可恢复所有记忆
- **跨 Bot 迁移**：从 OpenClaw 切换到其他 AI 助手，灵魂文件无缝迁移

---

### 📚 技术文档

- [安装指南](docs/INSTALL.md) - 详细安装步骤和环境配置
- [故障排除](docs/TROUBLESHOOTING.md) - 常见问题和解决方案
- [部署检查清单](docs/DEPLOY_CHECKLIST.md) - 自托管部署指南
- [API 文档](docs/API.md) - RESTful API 和 WebSocket 协议
- [更新日志](CHANGELOG.md) - 版本历史和新特性

---

### 🤝 社区与支持

- **GitHub Issues**：[报告 Bug 或请求新功能](https://github.com/alanliuc-a11y/soulsync/issues)
- **GitHub Discussions**：[技术讨论和问答](https://github.com/alanliuc-a11y/soulsync/discussions)
- **邮件支持**：support@soulsync.work

---

### 🌟 Roadmap

#### ✅ v1.0（已完成）
- [x] OpenClaw 插件
- [x] 云端存储（AWS + SQLite）
- [x] 实时同步（WebSocket）
- [x] 设备管理
- [x] 命令行授权

#### 🚧 v1.1（进行中）
- [ ] 对话式授权（测试中）
- [ ] 混合授权模式（SSH 环境）
- [ ] 端到端加密
- [ ] Web 管理面板

#### 🔮 v1.5（计划中）
- [ ] CoPaw 支持
- [ ] Claude Desktop 支持
- [ ] 团队协作功能
- [ ] 灵魂文件版本控制

#### 🚀 v2.0（未来）
- [ ] 移动端 App
- [ ] AI 助手市场（分享和购买定制化 AI）
- [ ] 区块链存储（去中心化）
- [ ] 数字永生（终极愿景）

---

### 🔐 隐私与安全

- **数据加密**：所有数据传输使用 HTTPS/WSS 加密
- **Token 认证**：JWT token 验证，防止未授权访问
- **访问控制**：只有你能访问自己的灵魂文件
- **数据主权**：支持自托管部署，完全掌控数据
- **开源透明**：客户端代码完全开源，服务端逐步开源

**即将推出**：
- 端到端加密（E2EE）
- 零知识证明（Zero-Knowledge Proof）
- 多因素认证（MFA）

---

### 🙏 致谢

SoulSync 的诞生离不开以下开源项目：
- [OpenClaw](https://openclaw.ai) - 强大的 AI 助手平台
- [Node.js](https://nodejs.org) - 服务端运行时
- [SQLite](https://sqlite.org) - 轻量级数据库
- [Socket.IO](https://socket.io) - 实时通信框架
- [Express](https://expressjs.com) - Web 框架

---

### 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE)

---

### 💰 定价

#### 免费版（永久免费）
- ✅ 3 台设备同步
- ✅ 基础灵魂文件（SOUL.md, USER.md, MEMORY.md）
- ✅ 实时同步
- ✅ 社区支持

#### 专业版（$9.9/月，v1.5 后推出）
- ✅ 无限设备
- ✅ 高级灵魂文件（自定义字段）
- ✅ 团队协作（最多 5 人）
- ✅ 优先支持
- ✅ 数据导出

#### 企业版（联系我们）
- ✅ 私有部署
- ✅ 定制化开发
- ✅ SLA 保障
- ✅ 专属客户经理

**注**：当前所有功能免费开放，付费功能将在 v1.5 后推出。早期用户将享受永久折扣。

---

### 🚀 开始使用

```bash
# 安装
npm install -g soulsync

# 在 OpenClaw 中授权
"授权 SoulSync"

# 享受跨设备的灵魂同步！
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

**Problem 4: Inefficient Manual Sync**
- Git? Commit + push + pull every time
- Cloud storage? File conflicts, sync delays, version chaos
- rsync? Complex setup, no real-time sync

---

### ✅ SoulSync's Solution

SoulSync is a **cloud-based soul synchronization system** designed for AI assistants:

| Pain Point | Traditional Solution | SoulSync |
|------------|---------------------|----------|
| Memory not synced | Manual file copying | ⚡ Real-time auto-sync (< 1s) |
| Duplicate config | Reconfigure every device | ☁️ Set once, works everywhere |
| Data silos | Local storage, easy to lose | 🔒 Cloud encrypted storage, permanent |
| Manual sync inefficiency | Git/Cloud/rsync | 🤖 Zero-config, plugin handles it |

**Core Features**:
- 📝 **Three Soul Files Sync**: SOUL.md (personality), USER.md (user info), MEMORY.md (memory)
- ⚡ **WebSocket Real-time Push**: Syncs to all devices within 1 second
- 🔒 **End-to-End Encryption**: Data transmission and storage fully encrypted (coming soon)
- 🤖 **Zero Configuration**: Install plugin, conversational auth, done
- 🌍 **Cross-Platform**: Windows, macOS, Linux all supported
- 🆓 **Free to Start**: Basic features free forever

---

### 🚀 Quick Start (Command Line Mode)

> **Note**: Currently only command-line installation has been tested. Conversational install and hybrid mode are under testing and not recommended yet.

#### Prerequisites
- [OpenClaw](https://openclaw.ai) installed
- Node.js 16+ or Python 3.8+

#### 1. Install Plugin

```bash
# Method 1: Install from npm (recommended)
npm install -g soulsync

# Method 2: Install from GitHub
git clone https://github.com/alanliuc-a11y/soulsync.git
cd soulsync/plugins/openclaw
npm install
npm link  # Global link
```

#### 2. Authorize Device

After installation, type in OpenClaw chat:
```
Authorize SoulSync
```
or
```
Connect SoulSync
```

The AI assistant will return an authorization link, for example:
```
Please open the following link in your browser to complete authorization:
https://soulsync.work/auth?code=ABC123XYZ
```

#### 3. Complete Authorization in Browser

**First-time Use (Register)**:
1. Open authorization link
2. Enter email (e.g., user@example.com)
3. Receive 6-digit verification code (check email)
4. Enter verification code
5. Set password (8+ characters)
6. Registration successful, auto-redirect

**Existing Account (Login)**:
1. Open authorization link
2. Enter email and password
3. Login successful, auto-redirect

#### 4. Return to OpenClaw

After successful authorization, the AI assistant will display:
```
Hello Alan, I'm Sanshu, delighted to meet you again on MacBook Pro.

Synced: SOUL.md / USER.md / MEMORY.md
```

Done! Your soul files are now automatically syncing.

---

### 📖 How It Works

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   Device A      │         │   SoulSync Cloud     │         │   Device B      │
│   OpenClaw      │◄───────►│   soulsync.work      │◄───────►│   OpenClaw      │
│                 │WebSocket│                      │WebSocket│                 │
│  ~/.openclaw/   │         │  ┌────────────────┐  │         │  ~/.openclaw/   │
│  └─ profiles/   │         │  │ PostgreSQL DB  │  │         │  └─ profiles/   │
│     └─ SOUL.md  │         │  │ File Storage   │  │         │     └─ SOUL.md  │
│     └─ USER.md  │         │  │ Sync Engine    │  │         │     └─ USER.md  │
│     └─ MEMORY.md│         │  └────────────────┘  │         │     └─ MEMORY.md│
└─────────────────┘         └──────────────────────┘         └─────────────────┘
```

**Sync Flow**:
1. Device A's OpenClaw modifies `MEMORY.md` (e.g., adds a new memory)
2. SoulSync plugin detects change via file watching
3. Pushes to cloud via WebSocket in real-time (HTTPS encrypted)
4. Cloud validates token, updates database
5. Cloud broadcasts to all connected devices via WebSocket
6. Device B's SoulSync plugin receives update, writes to local file
7. Device B's OpenClaw automatically loads new `MEMORY.md`

**Latency**: Usually < 1 second (depends on network)

---

### 🛠️ Common Commands

| Command | Description |
|---------|-------------|
| `Authorize SoulSync` | Authorize current device (first-time use) |
| `View my SoulSync devices` | View all connected devices |
| `Sync SoulSync` | Manually trigger sync (usually not needed) |
| `Logout SoulSync` | Unbind current device |

---

### 🎯 Use Cases

#### Case 1: Multi-Device Developer
```
Office Ubuntu Workstation
  ↓ Real-time sync
Home MacBook Pro
  ↓ Real-time sync
Travel Windows Laptop
```

AI assistant remembers on all devices:
- Project context
- Code style preferences
- Common commands and workflows

#### Case 2: Team Collaboration (Coming Soon)
```
Team Member A
  ↓ Shared soul files
Team Member B
  ↓ Shared soul files
Team Member C
```

Team shares the same AI assistant's knowledge base:
- New members join, AI already knows team's workflow
- Project docs, code standards auto-synced
- Reduce repetitive training time

#### Case 3: Data Backup & Migration
- **Local file loss**: Cloud permanently saves, restore anytime
- **New computer**: Re-authorize to restore all memories
- **Cross-bot migration**: Switch from OpenClaw to another AI, soul files migrate seamlessly

---

### 📚 Technical Documentation

- [Installation Guide](docs/INSTALL.md) - Detailed installation steps and environment setup
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Deployment Checklist](docs/DEPLOY_CHECKLIST.md) - Self-hosting deployment guide
- [API Documentation](docs/API.md) - RESTful API and WebSocket protocol
- [Changelog](CHANGELOG.md) - Version history and new features

---

### 🤝 Community & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/alanliuc-a11y/soulsync/issues)
- **GitHub Discussions**: [Technical discussions and Q&A](https://github.com/alanliuc-a11y/soulsync/discussions)
- **Email Support**: support@soulsync.work

---

### 🌟 Roadmap

#### ✅ v1.0 (Completed)
- [x] OpenClaw plugin
- [x] Cloud storage (AWS + SQLite)
- [x] Real-time sync (WebSocket)
- [x] Device management
- [x] Command-line authorization

#### 🚧 v1.1 (In Progress)
- [ ] Conversational authorization (testing)
- [ ] Hybrid authorization mode (SSH environment)
- [ ] End-to-end encryption
- [ ] Web management panel

#### 🔮 v1.5 (Planned)
- [ ] CoPaw support
- [ ] Claude Desktop support
- [ ] Team collaboration
- [ ] Soul file version control

#### 🚀 v2.0 (Future)
- [ ] Mobile app
- [ ] AI assistant marketplace (share and buy customized AIs)
- [ ] Blockchain storage (decentralized)
- [ ] Digital immortality (ultimate vision)

---

### 🔐 Privacy & Security

- **Data Encryption**: All data transmission uses HTTPS/WSS encryption
- **Token Authentication**: JWT token validation, prevents unauthorized access
- **Access Control**: Only you can access your soul files
- **Data Sovereignty**: Supports self-hosting, full control of data
- **Open Source Transparency**: Client code fully open source, server code gradually open sourced

**Coming Soon**:
- End-to-end encryption (E2EE)
- Zero-knowledge proof
- Multi-factor authentication (MFA)

---

### 🙏 Acknowledgments

SoulSync wouldn't exist without these open source projects:
- [OpenClaw](https://openclaw.ai) - Powerful AI assistant platform
- [Node.js](https://nodejs.org) - Server runtime
- [SQLite](https://sqlite.org) - Lightweight database
- [Socket.IO](https://socket.io) - Real-time communication framework
- [Express](https://expressjs.com) - Web framework

---

### 📄 License

MIT License - See [LICENSE](LICENSE)

---

### 💰 Pricing

#### Free Plan (Forever Free)
- ✅ 3 devices sync
- ✅ Basic soul files (SOUL.md, USER.md, MEMORY.md)
- ✅ Real-time sync
- ✅ Community support

#### Pro Plan ($9.9/month, launching after v1.5)
- ✅ Unlimited devices
- ✅ Advanced soul files (custom fields)
- ✅ Team collaboration (up to 5 people)
- ✅ Priority support
- ✅ Data export

#### Enterprise Plan (Contact us)
- ✅ Private deployment
- ✅ Custom development
- ✅ SLA guarantee
- ✅ Dedicated account manager

**Note**: All features currently free, paid features will launch after v1.5. Early users will enjoy permanent discounts.

---

### 🚀 Get Started

```bash
# Install
npm install -g soulsync

# Authorize in OpenClaw
"Authorize SoulSync"

# Enjoy cross-device soul sync!
```
