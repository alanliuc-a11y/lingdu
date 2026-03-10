# SoulSync 多文件同步开发计划 (Plan)

## 一、需求概述

扩展 SoulSync 实现 OpenClaw 完整灵魂同步，按免费/付费分层同步：

### 免费版（灵魂三件套）
- `SOUL.md` — bot 是谁
- `USER.md` — 用户是谁
- `MEMORY.md` — bot 对用户的记忆

> 换台设备，AI 立刻认识你。三个文件加起来几 KB，零成本，情绪价值拉满。

### 付费版（完整工作空间）
- 人格扩展：`IDENTITY.md`
- 工作空间配置：`AGENTS.md`、`TOOLS.md`
- 技能配置：`skills.json`、`skills/` 目录下的个性化设置
- 增量记忆：`memory/` 目录

---

## 二、云端服务修改

### 2.1 需要新增/修改的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/database.js` | 修改 | 添加 `profiles` 表的创建和 CRUD 操作 |
| `src/routes/profiles.js` | 新增 | 新增 profiles API 路由 |
| `src/index.js` | 修改 | 挂载 `/api/profiles` 路由 |

### 2.2 数据库设计

**新增 profiles 表**

```sql
CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, file_path),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_file_path ON profiles(file_path);
```

### 2.3 API 详细设计

#### GET /api/profiles
- **说明**: 获取当前用户的所有文件或单个文件
- **认证**: 需要
- **订阅**: 不需要（只读）
- **请求参数**:
  - `path` (可选): 查询单个文件，如 `?path=SOUL.md`
- **响应 (200)**:
```json
{
  "files": [
    {
      "file_path": "SOUL.md",
      "content": "文件内容...",
      "version": 1,
      "updated_at": "2026-02-18T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/profiles
- **说明**: 上传/更新文件（带版本校验）
- **认证**: 需要
- **订阅**: 需要
- **请求体**:
```json
{
  "file_path": "SOUL.md",
  "content": "文件内容...",
  "version": 1
}
```
- **响应 (200)**:
```json
{
  "file_path": "SOUL.md",
  "version": 2,
  "updated_at": "2026-02-18T10:05:00.000Z"
}
```
- **响应 (409)** - 版本冲突:
```json
{
  "error": "Version conflict",
  "code": "VERSION_CONFLICT",
  "latest_content": "云端最新内容...",
  "latest_version": 3
}
```

#### GET /api/profiles/sync
- **说明**: 增量同步接口
- **认证**: 需要
- **订阅**: 需要
- **请求参数**:
  - `since` (可选): 时间戳，如 `?since=2026-02-18T10:00:00.000Z`，默认 0
- **响应 (200)**:
```json
{
  "files": [
    {
      "file_path": "SOUL.md",
      "content": "文件内容...",
      "version": 2,
      "updated_at": "2026-02-18T10:05:00.000Z"
    }
  ],
  "server_time": "2026-02-18T10:10:00.000Z"
}
```

---

## 三、OpenClaw 插件修改

### 3.1 需要新增/修改的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `config.json` | 修改 | 增加 `watch_files` 数组 |
| `src/watcher.py` | 重构 | 支持多文件/目录监听 |
| `src/profiles.py` | 新增 | profiles API 客户端 |
| `src/version_manager.py` | 新增 | 本地版本管理 |
| `src/sync.py` | 重构 | 支持多文件同步 |
| `src/main.py` | 修改 | 集成新功能 |
| `versions.json` | 新增 | 本地版本记录文件 |

### 3.2 配置文件扩展

```json
{
  "cloud_url": "http://your-server:3000",
  "email": "user@example.com",
  "password": "****",
  "workspace": "/home/user/.openclaw/workspace",
  "watch_files": [
    "SOUL.md",
    "IDENTITY.md",
    "USER.md",
    "AGENTS.md",
    "TOOLS.md",
    "skills.json",
    "skills/"
  ]
}
```

### 3.3 本地版本管理

**versions.json 格式**:
```json
{
  "SOUL.md": 1,
  "IDENTITY.md": 1,
  "USER.md": 1,
  "AGENTS.md": 1,
  "TOOLS.md": 1,
  "skills.json": 1,
  "skills/skill_config.json": 2,
  "memory/memory.json": 3
}
```

### 3.4 冲突处理流程

```
本地修改文件 → 读取本地版本 → 上传到云端
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
               版本匹配                版本冲突
                    ↓                   ↓
            更新成功                获取云端最新内容
            更新本地版本              覆盖本地文件
                                      更新本地版本
```

### 3.5 启动同步流程

```
1. 加载 versions.json
2. 调用 GET /api/profiles/sync?since=0
3. 遍历返回的文件列表
4. 对于每个文件:
   - 若本地不存在 → 创建并写入
   - 若版本落后 → 覆盖写入
5. 更新 versions.json
6. 启动文件监听器
```

### 3.6 文件监听逻辑

- 使用 watchdog 的 `Observer`
- 支持文件和目录监听
- 目录监听需递归扫描
- 防抖处理：文件变化后延迟 500ms 再上传
- 忽略临时文件和隐藏文件

---

## 四、可选：WebSocket 扩展

### 4.1 新增 WebSocket 事件

| 事件名 | 方向 | 说明 |
|--------|------|------|
| `file_updated` | Server → Client | 某个文件被更新，携带 `file_path` 和 `version` |

### 4.2 插件端处理

收到通知后：
1. 立即调用 `GET /api/profiles?path=xxx` 获取最新内容
2. 覆盖本地文件
3. 更新 versions.json

---

## 五、开发顺序

1. **云端服务** (server/)
   - [ ] 修改 database.js - 添加 profiles 表
   - [ ] 新增 routes/profiles.js - 实现 API
   - [ ] 修改 index.js - 挂载路由
   - [ ] 测试 API

2. **插件端** (plugins/openclaw/)
   - [ ] 修改 config.json - 添加 watch_files
   - [ ] 新增 version_manager.py - 版本管理
   - [ ] 新增 profiles.py - API 客户端
   - [ ] 重构 watcher.py - 多文件监听
   - [ ] 重构 sync.py - 多文件同步
   - [ ] 修改 main.py - 集成
   - [ ] 本地测试

3. **可选扩展**
   - [ ] WebSocket file_updated 事件

---

## 六、测试方案

### 6.1 云端 API 测试

```bash
# 测试注册/登录
curl -X POST http://localhost:3000/api/auth/device \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test","email":"test@test.com","password":"123456"}'

# 测试上传文件
curl -X POST http://localhost:3000/api/profiles \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"file_path":"SOUL.md","content":"My soul","version":0}'

# 测试获取文件
curl http://localhost:3000/api/profiles \
  -H "Authorization: Bearer {token}"

# 测试版本冲突
curl -X POST http://localhost:3000/api/profiles \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"file_path":"SOUL.md","content":"Old content","version":1}'
```

### 6.2 插件同步测试

1. 启动云端服务
2. 启动插件 A，修改多个文件，验证上传
3. 删除本地文件，重启插件，验证全量拉取
4. 手动修改云端版本，验证冲突处理

---

## 七、注意事项

1. **安全性**: 密码明文存储，待后续优化
2. **性能**: 大文件同步可能有延迟，建议添加进度反馈
3. **目录创建**: 下载时需自动创建不存在的目录
4. **文件权限**: 注意跨平台文件权限问题
