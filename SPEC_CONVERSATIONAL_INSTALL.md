# SoulSync 对话式引导安装规范

## 概述

用户在 OpenClaw 聊天框中说"安装 SoulSync"或使用斜杠命令 `/soulsync`，bot 自动完成注册/登录 → 写入配置 → 启动同步，全程不碰命令行。

## 当前安装流程（需要命令行）

```
终端: openclaw plugins install soulsync
终端: 手动编辑 config.json（填 email/password）
终端: openclaw plugins start soulsync（或重启 OpenClaw）
```

## 目标安装流程（纯对话）

```
用户: "帮我安装 SoulSync" 或 "/soulsync setup"
Bot:  "SoulSync 可以让我在不同设备上记住你。需要先注册一个账号，请告诉我你的邮箱？"
用户: "alanliuc@gmail.com"
Bot:  "验证码已发送到 alanliuc@gmail.com，请告诉我 6 位验证码"
用户: "382916"
Bot:  "请设置一个密码（至少 6 位）"
用户: "mypassword123"
Bot:  "注册成功！正在同步你的灵魂文件... 完成！
      已同步: SOUL.md / USER.md / MEMORY.md
      从现在起，换任何设备我都认识你了。"
```

已有账号的用户：
```
用户: "/soulsync login"
Bot:  "请告诉我你的 SoulSync 邮箱？"
用户: "alanliuc@gmail.com"
Bot:  "请告诉我密码"
用户: "mypassword123"
Bot:  "登录成功！正在拉取你的灵魂文件... 完成！
      已同步: SOUL.md / USER.md / MEMORY.md"
```

---

## 一、实现方案

### 方案选择：registerTool（LLM 工具调用）

不用斜杠命令（本地才能用），不用 registerCommand（云端不支持）。
用 registerTool 注册工具，LLM 判断用户意图后自动调用。云端和本地都能用。

### 注册的工具列表

```javascript
// 工具 1: 检查 SoulSync 状态
api.registerTool({
  name: "soulsync_status",
  description: "Check SoulSync connection status. Call when user asks about SoulSync status or sync status.",
  input_schema: { type: "object", properties: {} }
});

// 工具 2: 注册新账号 - 发送验证码
api.registerTool({
  name: "soulsync_send_code",
  description: "Send verification code to email for SoulSync registration. Call when user wants to register/signup for SoulSync and provides email.",
  input_schema: {
    type: "object",
    properties: { email: { type: "string" } },
    required: ["email"]
  }
});

// 工具 3: 注册新账号 - 完成注册
api.registerTool({
  name: "soulsync_register",
  description: "Complete SoulSync registration with email, verification code and password.",
  input_schema: {
    type: "object",
    properties: {
      email: { type: "string" },
      code: { type: "string" },
      password: { type: "string" }
    },
    required: ["email", "code", "password"]
  }
});

// 工具 4: 登录已有账号
api.registerTool({
  name: "soulsync_login",
  description: "Login to existing SoulSync account. Call when user wants to login to SoulSync.",
  input_schema: {
    type: "object",
    properties: {
      email: { type: "string" },
      password: { type: "string" }
    },
    required: ["email", "password"]
  }
});

// 工具 5: 手动触发同步
api.registerTool({
  name: "soulsync_sync",
  description: "Manually trigger SoulSync to sync soul files (SOUL.md, USER.md, MEMORY.md) between local and cloud.",
  input_schema: { type: "object", properties: {} }
});
```

---

## 二、index.js 改造

当前 index.js 是纯 child_process 启动 Python，不走 OpenClaw 插件 API。
改造为标准插件格式，同时保留 Python 后台同步进程。

```javascript
module.exports = function(api) {

  // --- 工具注册 ---
  api.registerTool({ name: "soulsync_status", ... }, async () => {
    // 读 config.json，检查是否已配置
    // 如果已配置，尝试调用 GET /api/profiles 检查连接
    // 返回状态信息
  });

  api.registerTool({ name: "soulsync_send_code", ... }, async ({ email }) => {
    // POST /api/auth/send-code { email }
    // 返回 "验证码已发送到 xxx"
  });

  api.registerTool({ name: "soulsync_register", ... }, async ({ email, code, password }) => {
    // POST /api/auth/register { email, password, code }
    // 成功后写入 config.json
    // 启动 Python 同步进程
    // 返回 "注册成功，同步已启动"
  });

  api.registerTool({ name: "soulsync_login", ... }, async ({ email, password }) => {
    // POST /api/auth/login { email, password }
    // 成功后写入 config.json（保存 token）
    // 启动 Python 同步进程
    // 返回 "登录成功，同步已启动"
  });

  api.registerTool({ name: "soulsync_sync", ... }, async () => {
    // 如果 Python 进程在运行，发信号触发同步
    // 如果没在运行，启动 Python 进程
    // 返回同步结果
  });

  // --- 插件启动时自动检查 ---
  const configOk = checkConfigExists();
  if (configOk) {
    startPythonService('--start');
  }
  // 如果没配置，不启动，等用户通过对话触发注册/登录
};
```

---

## 三、关键流程

### 3.1 注册流程

```
用户说"安装 SoulSync" → LLM 调用 soulsync_status
  → 返回"未配置，需要注册"
  → LLM 问用户要邮箱

用户给邮箱 → LLM 调用 soulsync_send_code(email)
  → index.js 调用 POST /api/auth/send-code
  → 返回"验证码已发送"
  → LLM 问用户要验证码

用户给验证码 → LLM 还需要密码，问用户设置密码

用户给密码 → LLM 调用 soulsync_register(email, code, password)
  → index.js 调用 POST /api/auth/register
  → 成功：写 config.json + 启动 Python 同步
  → 返回"注册成功，已同步 SOUL.md / USER.md / MEMORY.md"
```

### 3.2 登录流程

```
用户说"登录 SoulSync" → LLM 调用 soulsync_status
  → 返回"未配置"
  → LLM 问邮箱和密码

用户给邮箱密码 → LLM 调用 soulsync_login(email, password)
  → index.js 调用 POST /api/auth/login
  → 成功：写 config.json + 启动 Python 同步
  → 返回"登录成功，已同步"
```

### 3.3 已配置用户启动

```
OpenClaw 启动 → 加载 SoulSync 插件
  → checkConfigExists() = true
  → 自动启动 Python 同步进程
  → 用户无感知，后台静默同步
```

---

## 四、密码安全

用户在对话中输入密码，会出现在聊天记录里。处理方式：

1. config.json 存储的是 JWT token，不存明文密码
2. 登录/注册成功后，LLM 回复中提醒用户"建议清除包含密码的聊天记录"
3. 后续版本考虑 OAuth 链接跳转方式（点链接 → 浏览器注册 → 自动回调写入 token）

---

## 五、config.json 变化

注册/登录成功后自动写入：

```json
{
  "cloud_url": "https://soulsync.work",
  "email": "alanliuc@gmail.com",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "workspace": "./workspace",
  "watch_files": ["SOUL.md", "USER.md", "MEMORY.md"]
}
```

不再存密码，改存 JWT token。插件端 client.py 需要适配 token 直接使用（不再每次用 email+password 登录）。

---

## 六、改动范围

| 文件 | 改动 |
|------|------|
| index.js | 重写为 module.exports = function(api) 格式，注册 5 个工具 |
| config.json.example | 去掉 password，加 token 字段 |
| openclaw.plugin.json | 确认 configSchema 匹配新格式 |
| src/client.py | 支持直接用 token 认证，不再每次 login |
| src/main.py | 适配 token 模式启动 |
| 服务端 auth.js | 不改（现有 register/login 接口已返回 token） |

---

## 七、测试场景

1. 全新用户说"安装 SoulSync" → 完成注册 + 自动同步
2. 已有账号用户说"登录 SoulSync" → 登录 + 自动同步
3. 已配置用户重启 OpenClaw → 自动启动同步，无需交互
4. 云端 bot 用户完成安装 → 验证云端环境可用
5. 本地 bot 用户完成安装 → 验证本地环境可用
6. 同一账号两台设备 → 验证多设备同步 + 冲突处理
7. 输入错误验证码 → 提示重试
8. 输入错误密码登录 → 提示重试
9. token 过期 → 提示重新登录
