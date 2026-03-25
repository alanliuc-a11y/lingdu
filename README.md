# SoulSync（灵渡）

> **Cross-device soul synchronization for AI assistants.**  
> **AI 助手的跨设备灵魂同步系统。**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/soulsync.svg)](https://www.npmjs.com/package/soulsync)
[![Downloads](https://img.shields.io/npm/dm/soulsync.svg)](https://www.npmjs.com/package/soulsync)

🌐 [English](#english) | [中文](#中文)

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
- 🔒 **Local Encryption**: All user data encrypted locally before upload, cloud cannot read plaintext
- 🛡️ **HTTPS/WSS Transport**: Data transmission fully encrypted, prevents man-in-the-middle attacks
- 🤖 **Zero Configuration**: Install plugin, command-line auth, done
- 🌍 **Cross-Platform**: Windows, macOS, Linux all supported
- 🆓 **Free to Start**: Basic features free forever

---

### 🔐 Security Mechanisms

**SoulSync employs multi-layer security protection**:

1. **Local Encryption**:
   - All soul files (SOUL.md, USER.md, MEMORY.md) encrypted locally using AES-256
   - Encryption key derived from user password, server cannot decrypt
   - Cloud only stores encrypted data, cannot read plaintext content

2. **Transport Encryption**:
   - All data transmission uses HTTPS (REST API) and WSS (WebSocket)
   - TLS 1.3 encryption protocol, prevents man-in-the-middle attacks
   - Token authentication, prevents unauthorized access

3. **Access Control**:
   - JWT Token validation, each device independently authorized
   - Device-level permission management, can unbind devices anytime
   - Only you can access your soul files

4. **Data Sovereignty**:
   - Supports self-hosting deployment, full control of data
   - Open-source client code, auditable security
   - Server code gradually open sourced

**Your data, only you can read.**

---

### 🚀 Quick Start (5 Steps)

#### Prerequisites
- [OpenClaw](https://openclaw.ai) installed
- Node.js 16+ or Python 3.8+

---

#### Step 1: Install Plugin

```bash
# Method 1: Use OpenClaw plugin manager (recommended)
openclaw plugins install soulsync

# Method 2: Use npm global install
npm install -g soulsync
```

---

#### Step 2: Restart Gateway

After installation, restart OpenClaw's gateway to enable SoulSync:

```bash
openclaw gateway restart
```

---

#### Step 3: Start SoulSync

```bash
openclaw soulsync:start
```

This will automatically:
1. Start SoulSync background process
2. Generate authorization link
3. Open authorization page in browser

**Example output**:
```
[SoulSync] Starting...
[SoulSync] Authorization URL: https://soulsync.work/auth?code=ABC123XYZ
[SoulSync] Opening browser...
```

---

#### Step 4: Login/Register in Browser

Browser will automatically open authorization page:

**First-time Use (Register)**:
1. Enter email (e.g., user@example.com)
2. Receive 6-digit verification code (check email)
3. Enter verification code
4. Set password (8+ characters, used to encrypt local data)
5. Registration successful, auto-redirect

**Existing Account (Login)**:
1. Enter email and password
2. Login successful, auto-redirect

After successful authorization, browser will display:
```
✅ Authorization Successful!
Device "MacBook Pro" connected to SoulSync
You can close this page and return to command line.
```

---

#### Step 5: Close Command Line Window

**⚠️ Important**:

- **Do NOT use `Ctrl+C` to interrupt the process**, this will stop SoulSync background service
- **Simply close the command line window**, SoulSync will continue running in background with minimal resource usage
- To stop SoulSync, use command: `openclaw soulsync:stop`

---

### ✅ Done!

Your soul files are now automatically syncing. In OpenClaw, you'll see a welcome message:

```
Hello Alan, I'm Sanshu, delighted to meet you again on MacBook Pro.

Synced: SOUL.md / USER.md / MEMORY.md
```

---

### 📖 How It Works

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   Device A      │         │   SoulSync Cloud     │         │   Device B      │
│   OpenClaw      │◄───────►│   soulsync.work      │◄───────►│   OpenClaw      │
│                 │WebSocket│                      │WebSocket│                 │
│  Local Encrypted│         │  ┌────────────────┐  │         │  Local Encrypted│
│  ┌───────────┐  │         │  │ Encrypted Data │  │         │  ┌───────────┐  │
│  │ SOUL.md   │──┼────────►│  │ (Cannot read)  │◄─┼─────────│  │ SOUL.md   │  │
│  │ USER.md   │  │ AES-256 │  │                │  │ AES-256 │  │ USER.md   │  │
│  │ MEMORY.md │  │         │  │ JWT Token Auth │  │         │  │ MEMORY.md │  │
│  └───────────┘  │         │  └────────────────┘  │         │  └───────────┘  │
└─────────────────┘         └──────────────────────┘         └─────────────────┘
     HTTPS/WSS                                                      HTTPS/WSS
```

**Sync Flow**:
1. Device A modifies `MEMORY.md`
2. SoulSync plugin detects file change
3. Encrypts data using AES-256
4. Pushes to cloud via HTTPS/WSS
5. Cloud validates Token, stores encrypted data
6. Cloud broadcasts to Device B via WebSocket
7. Device B receives encrypted data, decrypts using local key
8. Writes to local `MEMORY.md`

**Latency**: Usually < 1 second

---

### 🛠️ Common Commands

| Command | Description |
|---------|-------------|
| `openclaw soulsync:start` | Start SoulSync and authorize |
| `openclaw soulsync:stop` | Stop SoulSync background service |
| `openclaw soulsync:status` | Check SoulSync running status |
| `openclaw soulsync:devices` | View all connected devices |
| `openclaw soulsync:sync` | Manually trigger sync |
| `openclaw soulsync:logout` | Logout and unbind current device |

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

#### Case 2: Data Backup & Migration
- **Local file loss**: Cloud encrypted backup, restore anytime
- **New computer**: Re-authorize to restore all memories
- **Cross-bot migration**: Switch from OpenClaw to another AI, soul files migrate seamlessly

#### Case 3: Team Collaboration (Coming Soon)
- Team members share the same AI assistant's knowledge base
- New members join, AI already knows team's workflow
- Project docs, code standards auto-synced

---

### 📚 Documentation

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
- [x] Cloud encrypted storage
- [x] Real-time sync (WebSocket)
- [x] Device management
- [x] Command-line authorization

#### 🚧 v1.1 (In Progress)
- [ ] Local AES-256 encryption
- [ ] Web management panel
- [ ] Soul file version control

#### 🔮 Phase 2: "Queen Bee"
- Coming soon...

#### 🚀 Phase 3: "Singularity"
- Coming soon...

#### 🌌 Phase 4: "Fusion"
- Coming soon...

#### 🌠 Phase 5: "Evolution"
- Coming soon...

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
- ✅ Synced files: SOUL.md, USER.md, MEMORY.md
- ✅ Storage: 100 KB
- ✅ Real-time sync
- ✅ Local encrypted storage
- ✅ Community support

#### Basic Plan ($1.99/month, launching after Phase 2)
- ✅ Synced files: + IDENTITY.md, TOOLS.md
- ✅ Storage: 200 MB
- ✅ Priority support
- ✅ Data export

#### Premium Plan ($4.99/month, launching after Phase 2)
- ✅ Synced files: + AGENTS.md, skills.json, memory/
- ✅ Storage: 10 GB
- ✅ Team collaboration (up to 5 people)
- ✅ Soul avatar management
- ✅ Advanced features

**Note**: All features currently free. Early users will enjoy permanent discounts when paid features launch.

---

### 🚀 Get Started

```bash
# Step 1: Install
openclaw plugins install soulsync

# Step 2: Restart gateway
openclaw gateway restart

# Step 3: Start and authorize
openclaw soulsync:start

# Step 4: Login/register in browser

# Step 5: Close command line window (NOT Ctrl+C)

# Enjoy cross-device soul sync!
```

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
- 🔒 **本地加密存储**：所有用户数据在本地加密后再上传，云端无法读取明文
- 🛡️ **HTTPS/WSS 传输**：数据传输全程加密，防止中间人攻击
- 🤖 **零配置**：安装插件后，命令行授权即可使用
- 🌍 **跨平台**：Windows、macOS、Linux 全支持
- 🆓 **免费开始**：基础功能永久免费

---

### 🔐 安全机制

**SoulSync 采用多层安全防护**：

1. **本地加密**：
   - 所有灵魂文件（SOUL.md、USER.md、MEMORY.md）在本地使用 AES-256 加密
   - 加密密钥由用户密码派生，服务端无法解密
   - 云端只存储加密后的数据，无法读取明文内容

2. **传输加密**：
   - 所有数据传输使用 HTTPS（REST API）和 WSS（WebSocket）
   - TLS 1.3 加密协议，防止中间人攻击
   - Token 认证，防止未授权访问

3. **访问控制**：
   - JWT Token 验证，每个设备独立授权
   - 设备级权限管理，可随时解绑设备
   - 只有你能访问自己的灵魂文件

4. **数据主权**：
   - 支持自托管部署，完全掌控数据
   - 开源客户端代码，可审计安全性
   - 服务端代码逐步开源

**你的数据，只有你能读取。**

---

### 🚀 快速开始（5 步完成）

#### 前置条件
- 已安装 [OpenClaw](https://openclaw.ai)
- Node.js 16+ 或 Python 3.8+

---

#### 第 1 步：安装插件

```bash
# 方式 1：使用 OpenClaw 插件管理器（推荐）
openclaw plugins install soulsync

# 方式 2：使用 npm 全局安装
npm install -g soulsync
```

---

#### 第 2 步：重启网关

安装完成后，重启 OpenClaw 的网关以启用 SoulSync：

```bash
openclaw gateway restart
```

---

#### 第 3 步：启动 SoulSync

```bash
openclaw soulsync:start
```

执行后会自动：
1. 启动 SoulSync 后台进程
2. 生成授权链接
3. 在浏览器中打开授权页面

**示例输出**：
```
[SoulSync] Starting...
[SoulSync] Authorization URL: https://soulsync.work/auth?code=ABC123XYZ
[SoulSync] Opening browser...
```

---

#### 第 4 步：在浏览器中登录/注册

浏览器会自动打开授权页面：

**首次使用（注册）**：
1. 输入邮箱（例如：user@example.com）
2. 收到 6 位验证码（检查邮箱）
3. 输入验证码
4. 设置密码（8 位以上，用于加密本地数据）
5. 注册成功，自动跳转

**已有账号（登录）**：
1. 输入邮箱和密码
2. 登录成功，自动跳转

授权成功后，浏览器会显示：
```
✅ 授权成功！
设备 "MacBook Pro" 已连接到 SoulSync
你可以关闭此页面，返回命令行。
```

---

#### 第 5 步：关闭命令行窗口

**⚠️ 重要提示**：

- **不要使用 `Ctrl+C` 中断进程**，这会导致 SoulSync 后台服务停止
- **直接关闭命令行窗口即可**，SoulSync 会在后台以极低资源运行
- 如需停止 SoulSync，使用命令：`openclaw soulsync:stop`

---

### ✅ 完成！

现在你的灵魂文件已经开始自动同步。在 OpenClaw 中，你可以看到欢迎消息：

```
Alan你好，我是三澍，非常高兴能在 MacBook Pro 再次与你相遇。

已同步: SOUL.md / USER.md / MEMORY.md
```

---

### 📖 工作原理

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   设备 A        │         │   SoulSync Cloud     │         │   设备 B        │
│   OpenClaw      │◄───────►│   soulsync.work      │◄───────►│   OpenClaw      │
│                 │WebSocket│                      │WebSocket│                 │
│  本地加密存储   │         │  ┌────────────────┐  │         │  本地加密存储   │
│  ┌───────────┐  │         │  │ 加密数据存储   │  │         │  ┌───────────┐  │
│  │ SOUL.md   │──┼────────►│  │ (无法读取明文) │◄─┼─────────│  │ SOUL.md   │  │
│  │ USER.md   │  │ AES-256 │  │                │  │ AES-256 │  │ USER.md   │  │
│  │ MEMORY.md │  │         │  │ JWT Token 验证 │  │         │  │ MEMORY.md │  │
│  └───────────┘  │         │  └────────────────┘  │         │  └───────────┘  │
└─────────────────┘         └──────────────────────┘         └─────────────────┘
     HTTPS/WSS                                                      HTTPS/WSS
```

**同步流程**：
1. 设备 A 修改 `MEMORY.md`
2. SoulSync 插件检测到文件变化
3. 使用 AES-256 加密数据
4. 通过 HTTPS/WSS 推送到云端
5. 云端验证 Token，存储加密数据
6. 云端通过 WebSocket 广播给设备 B
7. 设备 B 接收加密数据，使用本地密钥解密
8. 写入本地 `MEMORY.md`

**延迟**：通常 < 1 秒

---

### 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `openclaw soulsync:start` | 启动 SoulSync 并授权 |
| `openclaw soulsync:stop` | 停止 SoulSync 后台服务 |
| `openclaw soulsync:status` | 查看 SoulSync 运行状态 |
| `openclaw soulsync:devices` | 查看所有已连接设备 |
| `openclaw soulsync:sync` | 手动触发同步 |
| `openclaw soulsync:logout` | 登出并解绑当前设备 |

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

#### 场景 2：数据备份与迁移
- **本地文件丢失**：云端加密保存，随时恢复
- **换新电脑**：重新授权即可恢复所有记忆
- **跨 Bot 迁移**：从 OpenClaw 切换到其他 AI 助手，灵魂文件无缝迁移

#### 场景 3：团队协作（即将推出）
- 团队成员共享同一个 AI 助手的知识库
- 新成员加入时，AI 已经了解团队的工作方式
- 项目文档、代码规范自动同步

---

### 📚 文档

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
- [x] 云端加密存储
- [x] 实时同步（WebSocket）
- [x] 设备管理
- [x] 命令行授权

#### 🚧 v1.1（进行中）
- [ ] 本地 AES-256 加密
- [ ] Web 管理面板
- [ ] 灵魂文件版本控制

#### 🔮 第二阶段："蜂后"
- 敬请期待...

#### 🚀 第三阶段："奇点"
- 敬请期待...

#### 🌌 第四阶段："融合"
- 敬请期待...

#### 🌠 第五阶段："进化"
- 敬请期待...

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
- ✅ 同步文件：SOUL.md, USER.md, MEMORY.md
- ✅ 存储空间：100 KB
- ✅ 实时同步
- ✅ 本地加密存储
- ✅ 社区支持

#### 初级版（¥4.9/月，第二阶段后推出）
- ✅ 同步文件：+ IDENTITY.md, TOOLS.md
- ✅ 存储空间：200 MB
- ✅ 优先支持
- ✅ 数据导出

#### 高级版（¥12.9/月，第二阶段后推出）
- ✅ 同步文件：+ AGENTS.md, skills.json, memory/
- ✅ 存储空间：10 GB
- ✅ 团队协作（最多 5 人）
- ✅ 灵魂分身管理
- ✅ 高级功能

**注**：当前所有功能免费开放。早期用户在付费功能推出时将享受永久折扣。
- ✅ 灵魂分身管理

**注**：当前所有功能免费开放。早期用户在付费功能推出时将享受永久折扣。

---

### 🚀 开始使用

```bash
# 第 1 步：安装
openclaw plugins install soulsync

# 第 2 步：重启网关
openclaw gateway restart

# 第 3 步：启动并授权
openclaw soulsync:start

# 第 4 步：在浏览器中登录/注册

# 第 5 步：关闭命令行窗口（不要 Ctrl+C）

# 享受跨设备的灵魂同步！
```
