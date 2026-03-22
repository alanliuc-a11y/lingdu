# Bug 修复：soulsync_devices 工具读取过期 config

## 问题

用户已完成 Device Code Flow 授权（在浏览器登录成功），但调用 `soulsync_devices` 工具时仍提示"尚未完成设备授权（token 为空）"。

## 原因

`soulsync_devices` 工具使用插件加载时读取的 `config` 变量来判断 token 是否存在。但：

1. 插件加载时 `config` 为 null（未授权）
2. `startDeviceCodeFlow` 轮询拿到 token 后调用 `saveConfig()` 写入 config.json
3. `saveConfig()` 更新了内存中的 `config` 变量
4. 但 `soulsync_devices` 工具在某些情况下可能读取到旧的 `config` 值

## 修复方案

在 `soulsync_devices` 工具执行时，重新从文件读取 config，而不是依赖内存中的 `config` 变量：

```javascript
api.registerTool({
  name: 'soulsync_devices',
  description: '...',
  input_schema: { type: 'object', properties: {} }
}, async () => {
  const pluginDir = getPluginDir();
  // 重新读取 config，而不是用内存中的 config 变量
  const currentConfig = loadConfig(pluginDir);
  
  if (!currentConfig || !currentConfig.token) {
    return {
      success: false,
      message: '尚未完成设备授权（token 为空）...'
    };
  }
  
  // 使用 currentConfig.token 而不是 config.token
  ...
});
```

同样检查 `soulsync_sync` 和 `soulsync_rename_device` 工具是否有相同问题，统一修复。

## 文件位置

`plugins/openclaw/index.js`

## 检查清单

- [ ] soulsync_devices 工具重新读取 config
- [ ] soulsync_sync 工具重新读取 config
- [ ] soulsync_rename_device 工具重新读取 config
- [ ] soulsync_logout 工具重新读取 config
