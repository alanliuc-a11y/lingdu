#!/usr/bin/env python3
"""
测试 SSL 修复是否有效
"""
import ssl
import sys

print(f"Python 版本: {sys.version}")
print(f"SSL 版本: {ssl.OPENSSL_VERSION}")
print()

# 测试 1: 使用 ssl.create_default_context()
print("测试 1: 使用 ssl.create_default_context()")
try:
    import urllib.request
    ctx = ssl.create_default_context()
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    req = urllib.request.Request('https://soulsync.work/api/health')
    response = urllib.request.urlopen(req, context=ctx)
    print(f"✅ 成功: {response.read().decode()}")
except Exception as e:
    print(f"❌ 失败: {e}")

print()

# 测试 2: 使用 requests + TLSAdapter
print("测试 2: 使用 requests + 自定义 TLSAdapter")
try:
    import requests
    from requests.adapters import HTTPAdapter

    class TLSAdapter(HTTPAdapter):
        def init_poolmanager(self, *args, **kwargs):
            ctx = ssl.create_default_context()
            ctx.minimum_version = ssl.TLSVersion.TLSv1_2
            kwargs['ssl_context'] = ctx
            return super().init_poolmanager(*args, **kwargs)

    session = requests.Session()
    session.mount('https://', TLSAdapter())
    response = session.get('https://soulsync.work/api/health')
    print(f"✅ 成功: {response.text}")
except Exception as e:
    print(f"❌ 失败: {e}")

print()

# 测试 3: 直接 requests（无适配器）
print("测试 3: 直接 requests（无适配器）")
try:
    import requests
    response = requests.get('https://soulsync.work/api/health')
    print(f"✅ 成功: {response.text}")
except Exception as e:
    print(f"❌ 失败: {e}")

print()
print("测试完成")
