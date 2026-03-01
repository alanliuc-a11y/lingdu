# SoulSync 插件端同步逻辑开发规范

## 目标

补全 `plugins/openclaw/src/sync.py`，实现完整的文件同步逻辑，使插件能与云端服务器双向同步文件。

---

## 现有代码概览

以下模块已完成，sync.py 需要调用它们：

### 1. ProfilesClient (profiles.py) - 已完成
```python
# 可用方法：
profiles_client.get_profiles(path=None)      # 获取云端文件列表
profiles_client.upload_profile(file_path, content, version)  # 上传文件
profiles_client.download_profile(file_path)   # 下载单个文件（如有）
```
- upload_profile 冲突时抛出 ConflictError(server_version, server_content)

### 2. VersionManager (version_manager.py) - 已完成
```python
# 可用方法：
version_manager.get_version(file_path)        # 获取本地版本号
version_manager.set_version(file_path, ver)   # 设置版本号
version_manager.get_all_versions()            # 获取所有版本
```

### 3. OpenClawMultiWatcher (watcher.py) - 已完成
- 监听 workspace 目录下的文件变化
- 变化时调用 callback(file_path)

### 4. OpenClawClient (client.py) - 已完成
- WebSocket 连接已实现
- 收到 ws 消息时调用 on_message_callback

### 5. 服务端 API (soulsync-server)
- `GET /api/profiles` → 返回 `{files: [{file_path, content, version, updated_at}]}`
- `GET /api/profiles?path=xxx` → 返回单个文件
- `POST /api/profiles` → 上传文件，body: `{file_path, content, version}`
  - 成功返回 `{file_path, version, updated_at}`
  - 冲突返回 409: `{error, server_version, server_content}`
- WebSocket 事件 `file_updated`: `{file_path, version, updated_at}`

---

## 开发任务

### 任务 1：实现 sync.py 的 pull_all 方法

启动时从云端拉取所有文件到本地：

```
流程：
1. 调用 profiles_client.get_profiles() 获取云端所有文件
2. 遍历每个文件：
   a. 读取本地文件内容（如果存在）
   b. 比较云端 version 和本地 version_manager 中的版本
   c. 如果云端版本更新 → 写入本地文件，更新 version_manager
   d. 如果本地版本更新（本地有修改但未推送）→ 调用 push_file
   e. 如果版本相同 → 跳过
3. 打印同步结果摘要
```

**注意**：写入本地文件时，watcher 会触发 callback，需要有机制避免"写入触发再次上传"的死循环。建议在 sync 中维护一个 `_syncing_files` 集合，watcher callback 中检查该集合来跳过。

### 任务 2：实现 sync.py 的 push_file 方法

本地文件变更时推送到云端：

```
流程：
1. 检查 file_path 是否在 _syncing_files 中，如果是则跳过（避免死循环）
2. 读取本地文件内容
3. 获取本地版本号 version_manager.get_version(file_path)
4. 调用 profiles_client.upload_profile(file_path, content, version)
5. 成功 → 更新 version_manager 为返回的新版本号
6. 冲突 → 处理冲突（见任务 4）
```

### 任务 3：实现 sync.py 的 on_remote_change 方法

收到 WebSocket 通知时拉取远程变更：

```
流程：
1. 收到 {file_path, version} 事件
2. 比较 version 和本地 version_manager 中的版本
3. 如果远程版本更新 → 下载文件内容，写入本地，更新 version_manager
4. 写入本地时加入 _syncing_files 避免触发 push
```

### 任务 4：冲突处理

当 push_file 遇到 ConflictError 时：

```
策略（第一阶段简单处理）：
1. 打印冲突警告信息
2. 保存本地版本为 .conflict 备份文件
3. 用云端版本覆盖本地文件
4. 更新 version_manager
5. 提示用户手动合并
```

### 任务 5：在 main.py 中连接 sync 与 watcher/websocket

确保以下联动正常：

```python
# watcher 的 callback 应调用 sync.push_file
def on_file_changed(file_path):
    sync.push_file(file_path)

# websocket 的 on_message 应调用 sync.on_remote_change
def on_ws_message(data):
    if data.get('event') == 'file_updated':
        sync.on_remote_change(data['file_path'], data['version'])

# 启动时应调用 sync.pull_all
sync.pull_all()
```

---

## 防死循环机制（关键）

```python
class ProfileSync:
    def __init__(self, ...):
        self._syncing_files = set()  # 正在同步的文件
        self._sync_lock = threading.Lock()
    
    def _is_syncing(self, file_path):
        return file_path in self._syncing_files
    
    def _mark_syncing(self, file_path):
        self._syncing_files.add(file_path)
    
    def _unmark_syncing(self, file_path):
        # 延迟移除，给 watcher 时间忽略事件
        import threading
        def remove():
            time.sleep(2)
            self._syncing_files.discard(file_path)
        threading.Thread(target=remove, daemon=True).start()
```

---

## 测试验证

完成后需要通过以下测试：

1. **启动同步**：插件启动 → pull_all 拉取云端文件到本地
2. **本地推送**：修改本地 MEMORY.md → 自动推送到云端
3. **远程拉取**：另一设备修改文件 → WebSocket 通知 → 本地自动更新
4. **冲突处理**：两端同时修改 → 生成 .conflict 文件 + 提示用户
5. **防死循环**：拉取写入本地时不触发再次推送

---

## 技术约束

1. 使用现有的 ProfilesClient、VersionManager，不要重写
2. 文件路径使用相对于 workspace 的路径（如 "MEMORY.md"、"memory/xxx.md"）
3. 所有文件读写使用 UTF-8 编码
4. 打印日志格式统一为 `[Sync] 操作描述`
5. 异常要捕获并打印，不能让插件崩溃
