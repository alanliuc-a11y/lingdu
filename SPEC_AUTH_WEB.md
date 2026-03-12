# SoulSync 认证网页 + 双模式授权规范

## 概述

在 soulsync.work 上搭建认证网页，支持两种授权模式接入插件：

- **Device Code Flow**：适用所有环境（云端 bot、本地 bot），用户在浏览器打开链接完成注册/登录，插件后台轮询拿 token
- **OAuth 本地回调**：适用本地终端用户，自动弹浏览器 → 登录 → 回调本地端口 → 直接拿 token

两条路共用同一个认证网页和同一套 JWT token。

---

## 一、认证网页 (soulsync.work)

### 1.1 页面

用 Express 静态页面或简单模板引擎，不上前端框架，保持轻量。

| 路径 | 用途 |
|------|------|
| `/auth/device/:code` | Device Code 授权页（注册/登录表单） |
| `/auth/callback` | OAuth 本地回调中转页 |
| `/auth/success` | 授权成功提示页 |

### 1.2 `/auth/device/:code` 页面流程

```
用户打开链接 → 页面显示 SoulSync 登录/注册表单
  → 新用户：输入邮箱 → 收验证码 → 设密码 → 注册
  → 老用户：输入邮箱 + 密码 → 登录
  → 成功后：服务端将 JWT 绑定到该 device_code
  → 页面跳转到 /auth/success 显示"授权成功，可以关闭此页面"
```

### 1.3 `/auth/callback` 页面流程（OAuth 本地回调）

```
用户从浏览器登录成功后
  → 服务端 302 重定向到 http://localhost:{port}/callback?token={jwt}
  → 本地临时 HTTP 服务器接收 token
  → 浏览器显示"授权成功"
```

---

## 二、服务端新增 API

### 2.1 POST /api/auth/device-code — 申请设备码

```
请求: {}
响应: {
  "device_code": "abc123",
  "auth_url": "https://soulsync.work/auth/device/abc123",
  "expires_in": 300,
  "interval": 3
}
```

服务端生成随机 device_code，存入数据库，5 分钟过期。

### 2.2 GET /api/auth/device-code/:code/status — 轮询设备码状态

```
未授权: { "status": "pending" }
已授权: { "status": "authorized", "token": "eyJ..." }
已过期: { "status": "expired" }
```

插件每 3 秒轮询，拿到 token 后停止。

### 2.3 POST /api/auth/device-code/:code/authorize — 网页端完成授权

```
请求: { "email": "x@x.com", "password": "xxx" }
  或: { "email": "x@x.com", "password": "xxx", "code": "123456" }（注册）
响应: { "success": true }
```

网页表单提交到此接口，服务端验证后将 JWT 绑定到 device_code。

### 2.4 GET /auth/oauth/start?port=12345 — OAuth 模式入口

重定向到登录页，登录成功后 302 到 `http://localhost:12345/callback?token=jwt`。

---

## 三、数据库

新增 device_codes 表：

```sql
CREATE TABLE IF NOT EXISTS device_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  token TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);
```

status: pending / authorized / expired

---

## 四、插件端改造 (index.js)

### 4.1 Device Code Flow（默认，云端+本地通用）

```
soulsync_status 工具被调用 → 检测未配置
  → 调用 POST /api/auth/device-code 获取 device_code + auth_url
  → 返回给 LLM："请打开 https://soulsync.work/auth/device/abc123 完成登录"
  → 启动后台轮询 GET /api/auth/device-code/abc123/status
  → 拿到 token → 写入 config.json → 启动同步
  → 返回："授权成功！已开始同步你的灵魂文件"
```

### 4.2 OAuth 本地回调（技术用户，终端命令触发）

```
用户终端执行 soulsync login（或 openclaw 触发）
  → 本地起临时 HTTP 服务器监听随机端口
  → 自动打开浏览器 https://soulsync.work/auth/oauth/start?port=12345
  → 用户在浏览器登录
  → 服务端 302 回调到 http://localhost:12345/callback?token=jwt
  → 本地服务器接收 token → 写入 config.json → 关闭临时服务器
```

### 4.3 工具调整

保留 5 个工具，修改 soulsync_status 和删除 soulsync_send_code/soulsync_register/soulsync_login：

| 工具 | 变化 |
|------|------|
| soulsync_status | 保留，未配置时自动触发 Device Code Flow |
| soulsync_send_code | 删除（注册移到网页） |
| soulsync_register | 删除（注册移到网页） |
| soulsync_login | 删除（登录移到网页） |
| soulsync_sync | 保留 |
| soulsync_logout | 新增，清除本地 token |

工具从 5 个精简为 3 个，LLM 判断更准确。

---

## 五、改动范围

| 文件 | 改动 |
|------|------|
| 服务端 src/routes/auth.js | 新增 device-code 和 oauth 相关接口 |
| 服务端 src/database.js | 新增 device_codes 表 |
| 服务端 public/ | 新建认证网页（HTML/CSS/JS） |
| 服务端 src/index.js | 挂载静态文件和网页路由 |
| 插件 index.js | 改为 3 个工具，实现 Device Code 轮询 |
| 插件 SPEC_CONVERSATIONAL_INSTALL.md | 替换为本文件 |

---

## 六、测试场景

1. 云端 bot 用户说"安装 SoulSync" → 收到链接 → 浏览器注册 → 插件自动拿到 token
2. 本地 bot 用户说"安装 SoulSync" → 同上
3. 技术用户终端触发 OAuth → 浏览器弹出 → 登录 → 自动回调拿 token
4. device_code 5 分钟过期 → 提示重新获取
5. 已配置用户重启 → 自动同步，无需交互
6. 同一账号两台设备 → 多设备同步正常
