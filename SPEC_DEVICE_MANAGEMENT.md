# SoulSync 设备管理规范

## 概述

授权成功后，插件向服务端注册一个持久化设备标识（device_id），用于：
- 用户查看已连接设备列表
- 多设备冲突时识别设备来源
- 免费版限制设备数量（如最多 3 台）
- 远程踢掉某台设备

## 设计原则

- **device_code**：临时随机码，只用于授权阶段传递 token，用完即弃
- **device_id**：持久化 UUID，绑定到用户账户，长期存在
- **device_name**：用户可编辑的设备别名（如"MacBook Pro"、"云端 bot"）

---

## 一、数据库

### devices 表（新增）

```sql
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  device_id TEXT NOT NULL UNIQUE,  -- UUID，如 "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  device_name TEXT,                 -- 用户可编辑，默认 "Device {n}"
  device_type TEXT,                 -- 'local' | 'cloud' | 'mobile' | 'web'
  last_sync_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_device_id ON devices(device_id);
```

---

## 二、服务端新增 API

### POST /api/devices — 注册新设备

插件拿到 token 后，生成 UUID 调用此接口注册设备。

```
请求: POST /api/devices
Authorization: Bearer <JWT>
{
  "device_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "device_name": "Alan的MacBook",  // 可选，默认 "Device {n}"
  "device_type": "local"            // 可选，默认 "local"
}

响应 201: { "id": 1, "device_id": "...", "device_name": "...", "created_at": "..." }
响应 409: { "error": "Device already registered" }
响应 403: { "error": "Free tier max 3 devices reached" }
```

### GET /api/devices — 获取用户设备列表

```
请求: GET /api/devices
Authorization: Bearer <JWT>

响应 200: {
  "devices": [
    { "id": 1, "device_id": "...", "device_name": "Alan的MacBook", "device_type": "local", "last_sync_at": "...", "created_at": "..." },
    { "id": 2, "device_id": "...", "device_name": "云端bot", "device_type": "cloud", "last_sync_at": "...", "created_at": "..." }
  ]
}
```

### PUT /api/devices/:device_id — 更新设备信息

```
请求: PUT /api/devices/a1b2c3d4-...
Authorization: Bearer <JWT>
{
  "device_name": "新名字"
}

响应 200: { "device_id": "...", "device_name": "新名字", ... }
```

### DELETE /api/devices/:device_id — 删除设备（解绑）

```
请求: DELETE /api/devices/a1b2c3d4-...
Authorization: Bearer <JWT>

响应 200: { "success": true }
```

---

## 三、插件端改动

### 3.1 生成/读取 device_id

config.json 新增字段：

```json
{
  "cloud_url": "https://soulsync.work",
  "email": "alanliuc@gmail.com",
  "token": "eyJ...",
  "device_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "device_name": "Alan的MacBook"
}
```

首次授权成功后：
1. 生成 UUID（`uuid.uuid4()`）
2. 调用 POST /api/devices 注册
3. 把 device_id 写入 config.json

已有 config.json 但无 device_id：
1. 读取现有 device_id，调用 POST /api/devices 注册（可能 409，忽略）

### 3.2 同步时上报设备标识

PUT /api/profiles 请求头或 body 里带上 device_id：

```
PUT /api/profiles
Authorization: Bearer <JWT>
X-Device-ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890

{
  "content": {...},
  "version": 3
}
```

服务端记录 `last_sync_at` 到 devices 表。

### 3.3 新增工具

| 工具 | 用途 |
|------|------|
| soulsync_devices | 查看已连接设备列表 |
| soulsync_rename_device | 修改当前设备名称 |
| soulsync_logout | 解绑当前设备（DELETE /api/devices/:id） |

---

## 四、免费版限制

```javascript
// middleware/subscription.js
function checkDeviceLimit(userId) {
  const deviceCount = db.getDeviceCountByUserId(userId);
  const subscription = db.getUserSubscription(userId);
  
  if (subscription.status !== 'active' && deviceCount >= 3) {
    return { allowed: false, error: 'Free tier max 3 devices. Upgrade to add more.' };
  }
  return { allowed: true };
}
```

---

## 五、改动范围

| 文件 | 改动 |
|------|------|
| 服务端 database.js | 新增 devices 表和 CRUD 函数 |
| 服务端 routes/devices.js | 新增 4 个 API |
| 服务端 routes/profiles.js | 读取 X-Device-ID 头，更新 last_sync_at |
| 服务端 index.js | 挂载 devices 路由 |
| 服务端 middleware/subscription.js | 新增设备数量检查 |
| 插件 index.js | 生成 UUID、注册设备、新增 3 个工具 |
| 插件 client.py | 新增 devices API 调用 |
| 插件 config.json | 新增 device_id、device_name 字段 |

---

## 六、测试场景

1. 新用户首次授权 → 生成 device_id → 注册成功 → 写入 config
2. 同一设备重启 → 读取已有 device_id → 注册 409（已存在）→ 忽略
3. 第二台设备授权 → 同一用户下新增 device 记录
4. 免费版第 4 台设备 → 403 拒绝
5. 用户查看设备列表 → 看到所有设备
6. 用户修改设备名称 → 更新成功
7. 用户 logout → DELETE 设备 → 清除本地 config
8. 同步时检查 last_sync_at → 正确更新
