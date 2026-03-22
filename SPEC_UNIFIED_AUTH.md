# SoulSync 统一授权流程规范

## 三种模式

| 模式 | 场景 | 触发方式 | 核心机制 |
|------|------|---------|---------|
| **模式1** | 本地终端、技术用户 | `openclaw plugins install soulsync` | OAuth本地回调：自动弹浏览器→回调本地端口 |
| **模式2** | 云端bot、普通用户 | 聊天框说"连接SoulSync" | Device Code Flow：给链接→轮询拿token |
| **模式3** | SSH远程、混合场景 | 命令行触发→对话框完成 | 生成code→打印链接→对话框检测继续 |

---

## 服务端新增接口

### GET /auth/oauth/start

```
请求: GET /auth/oauth/start?port=54321&callback=http://localhost:54321/callback&state=xxx
响应: 302重定向到登录页
```

登录成功后302回调到`callback`参数指定的URL，带上`token`和`state`。

### 登录页改造（device.html）

检测URL参数：
- `?code=xxx` → Device Code Flow
- `?state=xxx&callback=xxx` → OAuth本地回调

---

## 插件端模式检测

```javascript
function detectAuthMode(api) {
  const hasChatAPI = api && typeof api.registerTool === 'function';
  const isLocalTTY = process.stdin.isTTY && !process.env.SSH_CLIENT;
  const isSSH = process.env.SSH_CLIENT || process.env.SSH_TTY;
  
  if (!hasChatAPI && isLocalTTY) return 'oauth-local';
  if (!hasChatAPI && isSSH) return 'device-code-cli';
  return 'device-code-chat';
}
```

---

## 模式1：OAuth本地回调

```
用户执行: openclaw plugins install soulsync
    ↓
检测无config，模式='oauth-local'
    ↓
起临时HTTP服务器（随机端口）
    ↓
自动打开浏览器: /auth/oauth/start?port=xxx&callback=...
    ↓
用户登录 → 302回调到localhost:xxx/callback?token=xxx
    ↓
本地服务器接收token → 写config.json → 注册设备
    ↓
打印"授权成功！" → 启动同步
```

**关键代码：** 起HTTP服务器监听`/callback`，接收token后关闭。

---

## 模式2：Device Code Flow

```
用户: 连接SoulSync
    ↓
调用soulsync_connect工具
    ↓
POST /api/auth/device-code → 获取{device_code, auth_url}
    ↓
返回链接给用户，后台轮询/status
    ↓
用户浏览器授权 → 轮询拿到token
    ↓
写config → 注册设备 → 返回"授权成功"
```

---

## 模式3：SSH混合

```
用户SSH执行: openclaw plugins install soulsync
    ↓
检测模式='device-code-cli'
    ↓
POST /api/auth/device-code → 获取code和链接
    ↓
打印: "请在对话框输入'连接SoulSync'或访问: " + 链接
    ↓
把device_code写入~/.soulsync/.pending_auth
    ↓
用户去对话框: 连接SoulSync
    ↓
检测.pending_auth文件 → 直接返回链接 → 继续轮询
```

---

## 统一配置

三种模式最终都写入：

```json
{
  "cloud_url": "https://soulsync.work",
  "token": "eyJ...",
  "device_id": "uuid",
  "device_name": "设备名",
  "device_type": "local|cloud|ssh"
}
```

---

## 插件入口逻辑

```javascript
module.exports = function(api) {
  const mode = detectAuthMode(api);
  const config = loadConfig();
  
  if (!config?.token) {
    switch (mode) {
      case 'oauth-local': startOAuthLocal(); break;
      case 'device-code-cli': startDeviceCodeCLI(); break;
      case 'device-code-chat': registerChatTools(api); break;
    }
  } else {
    startPythonSync();
    registerChatTools(api);
  }
};
```

---

## 文件改动

| 文件 | 改动 |
|------|------|
| `index.js` | 重写入口，三种模式检测和启动 |
| `src/oauth-server.js` | 新增：临时HTTP服务器 |
| `src/device-code.js` | 新增：Device Code轮询 |
| `src/config.js` | 新增：统一配置读写 |
| `package.json` | 添加`open`依赖 |
| `server/src/routes/auth.js` | 添加`/auth/oauth/start` |
| `server/public/auth/device.html` | 支持OAuth回调 |

---

## 测试场景

1. 本地终端`plugins install` → 自动弹浏览器
2. 云端bot对话框 → 给链接
3. SSH远程 → 提示去对话框
4. 已配置重启 → 无交互直接同步
