# Bug 修复：LLM 仍在要求填密码（应使用 Device Code Flow）

## 问题

用户说"连接soulsync插件"，bot 回复需要填 `email` 和 `password`，而不是给浏览器授权链接。

这说明 LLM 调用了**旧的认证工具**（要求填密码），而不是新的 `soulsync_connect` 工具（Device Code Flow）。

## 可能原因

1. **新旧工具并存** — index.js 里可能还有旧的 `soulsync_setup` 或类似工具没删除
2. **工具描述误导** — `soulsync_connect` 的描述可能还提到"需要账号信息"，让 LLM 以为要填密码
3. **LLM 上下文** — 之前的对话上下文让 LLM 以为要填密码

## 需要检查

### 1. 检查是否还有旧工具

搜索 index.js 中所有 `api.registerTool`，确认：
- [ ] 是否还有要求填 `password` 的工具
- [ ] 是否还有 `soulsync_setup`、`soulsync_login` 等旧工具
- [ ] 新的 `soulsync_connect` 工具描述是否明确说"浏览器授权"而不是"填密码"

### 2. 修复工具描述

`soulsync_connect` 工具的描述应该明确：
- 不需要用户提供任何账号信息
- 会给一个浏览器链接让用户去登录/注册
- 插件会自动轮询拿到 token

示例描述：
```javascript
description: 'Connect to SoulSync cloud service via browser-based Device Code Flow. No credentials needed from user - will provide a browser link for user to login/register. Call when user wants to connect/install SoulSync plugin for OpenClaw (小龙虾).'
```

### 3. 删除旧工具

如果有旧的 `soulsync_setup`、`soulsync_login` 等工具，删除它们。

## 文件位置

`plugins/openclaw/index.js`

## 测试验证

修复后，用户说"连接 SoulSync"，bot 应该回复类似：
```
请打开以下链接完成 SoulSync 授权：
https://soulsync.work/auth/device/xxxx

授权完成后我会自动开始同步你的灵魂文件。
```

而不是问用户要 email 和 password。
