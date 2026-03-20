# SoulSync

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SoulSync 是一个**跨机器人灵魂同步系统**，让你的 AI 助理（如 OpenClaw）在多设备、多平台之间共享相同的记忆、人格和技能。

## 功能特性

- **云端记忆存储** – 所有记忆都存储在云端，随时随地可访问
- **实时同步** – 通过 WebSocket 实现即时同步
- **多机器人支持** – 目前已支持 OpenClaw，后续将支持 CoPaw 等更多机器人
- **渐进式开源** – 后端代码将在每个大阶段完成后开源

## 后端服务

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

## 开源路线图

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

## 项目结构

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

## 快速开始

### 1. 安装 OpenClaw 插件

```bash
openclaw plugins install https://github.com/alanliuc-a11y/soulsync.git
```

或从本地目录安装：

```bash
openclaw plugins install /path/to/soulsync/plugins/openclaw
```

### 2. 连接 SoulSync（对话式授权）

安装完成后，在 OpenClaw 聊天框中输入：

```
连接 SoulSync
```

或：

```
/安装 小龙虾插件
```

Bot 会回复一个授权链接，点击链接在浏览器中完成登录/注册：
- **已有账号**：直接登录
- **新用户**：输入邮箱 → 收验证码 → 设置密码 → 注册成功

授权成功后返回 OpenClaw，插件会自动开始同步你的灵魂文件。

### 3. 查看已连接设备

```
查看我的 SoulSync 设备
```

### 4. 手动触发同步

```
同步 SoulSync
```

### 5. 退出登录（解绑当前设备）

```
退出 SoulSync
```

---

**云端 Bot 用户注意**：云端部署的 OpenClaw 无法使用命令行安装插件，请使用对话式安装：直接在聊天框说"连接 SoulSync"即可。 SoulSync 服务器。自托管将在对应阶段开源后可用。

### 4. 启动插件

```bash
openclaw soulsync:start
```

## 自托管（未来）

根据我们的开源路线图，后端代码将逐步开源：

- **Phase 1 代码**：v2.0.0 发布后可用（预计 2026年Q3）
- **Phase 2 代码**：v3.0.0 发布后可用（预计 2027年Q1）
- **Phase 3 代码**：v4.0.0 发布后可用（预计 2027年Q3）
- **Phase 4 代码**：v5.0.0 发布后可用（预计 2028年）
- **Phase 5 代码**：完全开源

如果您需要立即自托管，请考虑：
- 通过订阅支持项目
- 参与插件开发
- 等待对应阶段发布

## 工作原理

SoulSync 为你的 AI 助理创建了一个持久化的记忆层：

1. **记忆文件** – 将机器人的身份、技能和记忆存储在 Markdown 文件中
2. **云端同步** – 所有更改自动上传到云端
3. **多设备** – 在任何安装了 OpenClaw 的设备上访问相同的记忆
4. **实时** – WebSocket 连接确保即时同步

## 文档

- [安装指南](plugins/openclaw/INSTALL.md)
- [故障排除](plugins/openclaw/TROUBLESHOOTING.md)
- [部署检查清单](plugins/openclaw/DEPLOY_CHECKLIST.md)

## 许可证

MIT 许可证 – 详情见 [LICENSE](LICENSE) 文件
