# SoulSync

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🌐 [English](README_EN.md) | [中文](README_CN.md)

---

## English

SoulSync is a **cross-bot soul synchronization system**. It allows your AI assistants (like OpenClaw) to share the same memory, personality, and skills across multiple devices and platforms.

### Features

- **Cloud-based memory storage** – All memories are stored in the cloud, accessible from anywhere.
- **Real-time synchronization** – Changes are instantly synced via WebSocket.
- **Multi-bot support** – Currently supports OpenClaw; more bots (CoPaw, etc.) coming soon.
- **Progressive open source** – Backend code will be open-sourced after each major phase.

### Quick Start

#### 1. Install OpenClaw Plugin

```bash
openclaw plugins install https://github.com/alanliuc-a11y/soulsync.git
```

Or install from local directory:

```bash
openclaw plugins install /path/to/soulsync/plugins/openclaw
```

#### 2. Connect SoulSync (Conversational Auth)

After installation, type in OpenClaw chat:

```
Connect SoulSync
```

Or:

```
/Install SoulSync plugin
```

The bot will reply with an authorization link. Click the link to complete login/register in your browser:
- **Existing user**: Login directly
- **New user**: Enter email → Receive verification code → Set password → Registration complete

Return to OpenClaw after authorization, the plugin will automatically start syncing your soul files.

#### 3. View Connected Devices

```
View my SoulSync devices
```

#### 4. Manual Sync

```
Sync SoulSync
```

#### 5. Logout (Unbind Current Device)

```
Logout SoulSync
```

---

**Cloud Bot Users**: Cloud-deployed OpenClaw cannot use CLI to install plugins. Use conversational install: simply say "Connect SoulSync" in the chat box.

### Backend Service

The backend service is officially hosted and maintained by the SoulSync team. Users only need to install the plugin and connect to the official cloud service.

**Current Phase**: Phase 1 - Basic sync (v1.0.x)

> 🎉 **SoulSync is currently free for all users during the early access period!**

**Planned Pricing** (not yet in effect):

| Tier | Monthly | Yearly | Synced Files |
|------|---------|--------|--------------|
| **Free** | $0 | - | SOUL.md, USER.md, MEMORY.md |
| **Basic** | $1.19 | $11.9 | + IDENTITY.md, TOOLS.md |
| **Pro** | $3.99 | $39.9 | + AGENTS.md, skills.json, memory/ |

- **Free tier** syncs 3 core files — your bot knows who it is (SOUL.md), who you are (USER.md), and what it remembers about you (MEMORY.md). Switch devices and your AI recognizes you instantly.
- Upgrade anytime to unlock more files.

### Open Source Roadmap

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

### Project Structure

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

### Getting Started

#### 1. Register account

Visit our official website (coming soon) to register an account. All features are currently free during early access.

#### 2. Install the OpenClaw plugin

```bash
openclaw plugins install soulsync
```

Or install from local directory:

```bash
openclaw plugins install /path/to/soulsync/plugins/openclaw
```

#### 3. Configure the plugin

Edit `~/.openclaw/extensions/soulsync/config.json`:

```json
{
  "cloud_url": "https://soulsync.work",
  "email": "your-email@example.com",
  "password": "your-password"
}
```

Note: The cloud_url points to the official SoulSync server. Self-hosting will be available after the corresponding phase is open-sourced.

#### 4. Start the plugin

```bash
openclaw soulsync:start
```

### Self-Hosting (Future)

According to our Open Source Roadmap, backend code will be progressively open-sourced:

- **Phase 1 code**: Available after v2.0.0 release (estimated Q3 2026)
- **Phase 2 code**: Available after v3.0.0 release (estimated Q1 2027)
- **Phase 3 code**: Available after v4.0.0 release (estimated Q3 2027)
- **Phase 4 code**: Available after v5.0.0 release (estimated 2028)
- **Phase 5 code**: Fully open source

### How It Works

SoulSync creates a persistent memory layer for your AI assistants:

1. **Memory Files** – Store your bot's identity, skills, and memories in Markdown files
2. **Cloud Sync** – All changes are automatically uploaded to the cloud
3. **Multi-Device** – Access the same memory from any device with OpenClaw installed
4. **Real-time** – WebSocket connection ensures instant synchronization

### Documentation

- [Installation Guide](plugins/openclaw/INSTALL.md)
- [Troubleshooting](plugins/openclaw/TROUBLESHOOTING.md)
- [Deployment Checklist](plugins/openclaw/DEPLOY_CHECKLIST.md)

---

## 中文

SoulSync 是一个**跨机器人灵魂同步系统**，让你的 AI 助理（如 OpenClaw）在多设备、多平台之间共享相同的记忆、人格和技能。

### 功能特性

- **云端记忆存储** – 所有记忆都存储在云端，随时随地可访问
- **实时同步** – 通过 WebSocket 实现即时同步
- **多机器人支持** – 目前已支持 OpenClaw，后续将支持 CoPaw 等更多机器人
- **渐进式开源** – 后端代码将在每个大阶段完成后开源

### 后端服务

后端服务由 SoulSync 团队官方托管和维护。用户只需安装插件，连接官方云服务即可。

**当前阶段**：Phase 1 - 基础同步 (v1.0.x)

> 🎉 **SoulSync 目前处于早期体验阶段，所有功能免费开放！**

**预计收费模式**（尚未生效）：

| 层级 | 月付 | 年付 | 同步文件 |
|------|------|------|----------|
| **免费版** | ¥0 | - | SOUL.md, USER.md, MEMORY.md |
| **初级版** | ¥4.9 | ¥49 | + IDENTITY.md, TOOLS.md |
| **高级版** | ¥12.9 | ¥129 | + AGENTS.md, skills.json, memory/ |

- **免费版**同步 3 个核心文件 — bot 知道自己是谁（SOUL.md）、用户是谁（USER.md）、以及对用户的记忆（MEMORY.md）。换台设备，AI 立刻认识你。
- 随时升级解锁更多文件

### 开源路线图

SoulSync 采用**五阶段渐进式开源策略**。每个阶段完成后，前一阶段的后端代码将开源。

| 阶段 | 版本 | 功能特性 | 开源时间 |
|------|------|----------|----------|
| **Phase 1** | v1.0.x | 基础同步、单用户 | Phase 2 发布后 |
| **Phase 2** | v2.0.0 | 多机器人协作 | Phase 3 发布后 |
| **Phase 3** | v3.0.0 | "奇点" | Phase 4 发布后 |
| **Phase 4** | v4.0.0 | "融合" | Phase 5 发布后 |
| **Phase 5** | v5.0.0 | "进化" | 完全开源 |

这种策略确保：
- ✅ 通过订阅收入维持可持续开发
- ✅ 通过渐进式透明建立社区信任
- ✅ 为需要自托管的用户提供选择
- ✅ 持续创新和功能开发

### 项目结构

```
soulsync/
├── plugins/
│   ├── base/            # 基础类（供后续机器人使用）
│   └── openclaw/        # OpenClaw 插件（本仓库）
│       ├── src/
│       ├── config.json.example
│       └── requirements.txt
└── README.md

注意：后端服务代码单独维护，将根据路线图逐步开源。
```

### 快速开始

#### 1. 注册账号

访问我们的官方网站（即将上线）注册账号。早期体验阶段所有功能免费。

#### 2. 安装 OpenClaw 插件

```bash
openclaw plugins install soulsync
```

或从本地目录安装：

```bash
openclaw plugins install /path/to/soulsync/plugins/openclaw
```

#### 3. 配置插件

编辑 `~/.openclaw/extensions/soulsync/config.json`：

```json
{
  "cloud_url": "https://soulsync.work",
  "email": "your-email@example.com",
  "password": "your-password"
}
```

注意：cloud_url 指向官方 SoulSync 服务器。自托管将在对应阶段开源后可用。

#### 4. 启动插件

```bash
openclaw soulsync:start
```

### 自托管（未来）

根据我们的开源路线图，后端代码将逐步开源：

- **Phase 1 代码**：v2.0.0 发布后可用（预计 2026年Q3）
- **Phase 2 代码**：v3.0.0 发布后可用（预计 2027年Q1）
- **Phase 3 代码**：v4.0.0 发布后可用（预计 2027年Q3）
- **Phase 4 代码**：v5.0.0 发布后可用（预计 2028年）
- **Phase 5 代码**：完全开源

### 工作原理

SoulSync 为你的 AI 助理创建了一个持久化的记忆层：

1. **记忆文件** – 将机器人的身份、技能和记忆存储在 Markdown 文件中
2. **云端同步** – 所有更改自动上传到云端
3. **多设备** – 在任何安装了 OpenClaw 的设备上访问相同的记忆
4. **实时** – WebSocket 连接确保即时同步

### 文档

- [安装指南](plugins/openclaw/INSTALL.md)
- [故障排除](plugins/openclaw/TROUBLESHOOTING.md)
- [部署检查清单](plugins/openclaw/DEPLOY_CHECKLIST.md)

---

## License / 许可证

MIT License - see [LICENSE](LICENSE) file for details.

MIT 许可证 – 详情见 [LICENSE](LICENSE) 文件
