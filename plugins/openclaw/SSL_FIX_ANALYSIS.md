# SSL 连接问题分析与解决方案

## 问题现状
- **现象**: Windows Python 3.13 连接 `https://soulsync.work` 时出现 `ConnectionResetError(10054)`
- **环境**: 
  - 客户端: Windows 11, Python 3.13, urllib3 1.26.18
  - 服务器: Ubuntu, Nginx, 阿里云 DigiCert 证书
- **特征**:
  - 浏览器能正常访问
  - 服务器上 Python 3.10 能正常连接
  - Windows Python 3.13 连接其他 HTTPS 站点（如百度）正常
  - 抓包显示 TCP 握手成功，但 SSL 握手时连接被重置

## 根本原因分析

### 1. Python 3.13 SSL 变更
根据搜索结果\cite{web_aa3377ba:0}，Python 3.13 对 SSL 证书验证变得更严格：
- 证书链验证更严格
- 某些 SSL 参数被弃用
- `ssl_version` 参数被移除，需使用 `ssl_minimum_version` 和 `ssl_maximum_version`

### 2. urllib3 与 Python 3.13 兼容性
- urllib3 1.26.x 是旧版本，可能与 Python 3.13 不完全兼容
- urllib3 2.x 对 Python 3.13 有更好的支持

### 3. 当前代码问题
```python
class TLSAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.maximum_version = ssl.TLSVersion.TLSv1_2
        kwargs['ssl_context'] = ctx
        return super().init_poolmanager(*args, **kwargs)
```

**问题点**:
1. `ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)` 在 Python 3.13 + Windows 可能有 bug
2. 强制 TLS 1.2 可能过于严格
3. 没有加载默认证书

## 解决方案

### 方案 1: 使用 ssl.create_default_context()（推荐）
```python
import ssl
from requests.adapters import HTTPAdapter

class TLSAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        ctx = ssl.create_default_context()
        # 可选：设置最低 TLS 版本
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        kwargs['ssl_context'] = ctx
        return super().init_poolmanager(*args, **kwargs)
```

### 方案 2: 升级 urllib3 到 2.x
```bash
pip install 'urllib3>=2.0'
```

### 方案 3: 降级 Python 到 3.12
```bash
# 下载 Python 3.12
# https://www.python.org/downloads/release/python-3120/
```

### 方案 4: 禁用 SSL 验证（仅测试用）
```python
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
```

## 推荐执行顺序
1. **先尝试方案 1**（修改代码使用 `ssl.create_default_context()`）
2. 如果不行，**尝试方案 2**（升级 urllib3）
3. 如果还不行，**尝试方案 3**（降级 Python）
4. 最后才考虑方案 4（仅用于确认是 SSL 问题）

## 参考资料
- Python 3.13 SSL 变更: https://discuss.python.org/t/ssl-errors-in-python-3-13/89447
- urllib3 SSL 配置: https://urllib3.readthedocs.io/en/stable/advanced-usage.html#ssl-warnings
- requests SSL 适配器: https://requests.readthedocs.io/en/latest/user/advanced/#transport-adapters
