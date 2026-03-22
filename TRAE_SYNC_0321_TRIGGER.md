# 触发词优化 + 自动问候机制

## 问题1：触发词太泛

**现状：** 工具描述里用"连接 SoulSync"，容易歧义（网上有其他同名软件）。

**修复：** 所有工具描述改为明确的触发词：
- "安装soulsync插件"
- "配置soulsync插件"
- "设置小龙虾同步"

**文件：** `plugins/openclaw/index.js`

**具体修改：**
```javascript
// soulsync_connect 工具
description: 'Install and configure SoulSync plugin for OpenClaw (小龙虾). Call when user says "安装soulsync插件", "配置soulsync插件", or "设置小龙虾同步". No credentials needed - will provide a browser link for authorization.'

// soulsync_devices 工具  
description: 'List connected SoulSync devices. Call when user says "查看soulsync设备", "我的设备列表", or asks about connected devices.'

// soulsync_sync 工具
description: 'Manually trigger SoulSync sync. Call when user says "同步soulsync", "手动同步", or wants to force sync.'

// soulsync_logout 工具
description: 'Logout and unbind current device from SoulSync. Call when user says "退出soulsync", "解绑设备", or wants to disconnect.'
```

---

## 问题2：安装完成自动问候

**需求：** 授权成功后，自动在对话框问候用户，格式：
```
Alan你好，我是三澍，非常高兴能在 MacBook-Pro 再次与你相遇
```

**实现方案：**

### 方案A：工具返回问候语（推荐）

`soulsync_connect` 工具在授权成功后，返回包含问候语的 message：

```javascript
// 授权成功后
const user = await getUserInfo(token);  // 从服务端获取用户信息
const device = config.device_name;

return {
  success: true,
  message: `${user.name || user.email}你好，我是三澍，非常高兴能在 ${device} 再次与你相遇。\n\n已同步: SOUL.md / USER.md / MEMORY.md`
};
```

### 方案B：新增问候工具

新增 `soulsync_greeting` 工具，授权成功后自动调用：

```javascript
api.registerTool({
  name: 'soulsync_greeting',
  description: 'Internal tool. Send greeting message after successful authorization. DO NOT call this tool directly.',
  input_schema: { type: 'object', properties: {} }
}, async () => {
  const config = loadConfig();
  const user = await getUserInfo(config.token);
  return {
    message: `${user.name || user.email}你好，我是三澍，非常高兴能在 ${config.device_name} 再次与你相遇。`
  };
});
```

然后在 `startDeviceCodeFlow` 轮询成功后，自动调用此工具。

**推荐方案A**，简单直接，不需要额外工具。

---

## 问题3：获取用户信息

**需要新增服务端接口：** GET /api/user/info

返回当前登录用户的信息：
```json
{
  "email": "alanliuc@gmail.com",
  "name": "Alan",  // 如果有的话
  "subscription_status": "trial"
}
```

**文件：** `server/src/routes/auth.js` 或新建 `server/src/routes/user.js`

---

## 问题4：设备名称优化

**现状：** device_name 默认是 "Device" 或 hostname。

**优化：** 根据设备类型生成更友好的名称：
- 本地 Mac: "Alan's MacBook Pro"
- 本地 Windows: "Alan's Windows PC"  
- 云端: "云端 Bot"
- SSH: "SSH 远程"

**实现：** 在 `getDeviceName()` 函数中，尝试从系统获取用户名 + hostname。

---

## 文件改动清单

| 文件 | 改动 |
|------|------|
| `plugins/openclaw/index.js` | 修改4个工具的description，授权成功后返回问候语 |
| `plugins/openclaw/src/config.js` | 优化 getDeviceName() |
| `server/src/routes/auth.js` 或 `user.js` | 新增 GET /api/user/info |
| `plugins/openclaw/src/client.js` | 新增 getUserInfo() 方法 |

---

## 测试验证

1. 用户说"安装soulsync插件" → 触发 soulsync_connect
2. 授权成功后 → 自动显示问候语
3. 问候语包含：用户邮箱/名称 + 设备名称
4. 用户说"查看我的设备" → 触发 soulsync_devices
