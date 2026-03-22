# 对话式引导安装 — 代码审查修复清单

> 日期: 2026-03-11

---

## 问题 1（必修）：index.js — makeRequest 不走 TLSAdapter

**位置：** index.js → makeRequest()

**现状：** 用原生 Node.js http/https 模块发请求。soulsync.work 是 Let's Encrypt 证书，部分环境下 Node 原生 https 可能证书校验失败。

**修复：** 不需要改。Node.js 原生 https 对 Let's Encrypt 支持没问题，TLSAdapter 是 Python requests 库的问题。此条取消。

---

## 问题 2（必修）：index.js — soulsync_register 工具缺少自动首次同步

**位置：** index.js → soulsync_register 工具的 handler

**现状：** 注册成功后写入 config + 启动 Python 进程，但 Python 进程是 --start 模式，会等文件变更才同步。用户注册完看不到"已同步 SOUL.md / USER.md / MEMORY.md"的即时反馈。

**修复：** 注册/登录成功后，先调一次 GET /api/profiles 检查云端是否有数据：
- 有数据 → 拉取并写入本地文件，再启动 Python 进程
- 无数据 → 读取本地文件上传到云端，再启动 Python 进程

或者启动 Python 进程时用 `--start --initial-sync` 参数触发一次立即同步。

---

## 问题 3（必修）：client.py — _load_token 优先级问题

**位置：** client.py → _load_token()

**现状：** 先检查 config.token，再检查 token 文件。但 login() 方法成功后调用 _save_token() 只写了 token 文件，没更新 config.token。下次 _load_token 读到的 config.token 可能是旧的。

**修复：** login() 成功后同时更新 self.config['token'] 和 token 文件。或者统一只用一个来源（建议只用 config.json 里的 token，废弃 token 文件）。

---

## 问题 4（建议修）：main.py — --start 模式缺少 token 过期重试

**位置：** main.py → start_sync() 或 Python 同步循环

**现状：** JWT token 过期后（服务端返回 401），Python 进程会报错但不会自动处理。

**修复：** 捕获 401 响应时，打印提示"Token expired, please re-login via chat: say 'login SoulSync'"，然后优雅退出 Python 进程。index.js 检测到进程退出后，下次用户交互时 soulsync_status 会返回"需要重新登录"。

---

## 问题 5（建议修）：index.js — soulsync_login 密码在 LLM 上下文中暴露

**位置：** index.js → soulsync_login 工具

**现状：** 用户在对话中输入密码，密码会作为工具参数传给 LLM，存在上下文中。

**修复：** 工具返回结果中加一句提醒：
```
"Login successful! For security, consider clearing the chat messages that contain your password. / 登录成功！建议清除包含密码的聊天记录。"
```

这个在 SPEC 里已经提到了，确认代码里有没有加。

---

## 问题 6（可选）：config.json — 旧用户升级兼容

**现状：** 旧 config.json 有 password 字段没有 token 字段。index.js 的 checkConfigExists 检查 token 是否存在，旧用户会被判定为"未配置"。

**修复：** 已经没问题。旧用户启动后 soulsync_status 返回"未配置"，用户说"登录 SoulSync"重新登录一次就会写入 token。这是预期行为。
