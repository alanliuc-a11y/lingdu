import requests
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from src.client import TLSAdapter


class ProfilesClient:
    """Profiles API 客户端 - 统一同步接口"""
    
    def __init__(self, cloud_url: str, token: str = None):
        self.cloud_url = cloud_url.rstrip('/')
        self.token = token
        self.session = requests.Session()
        self.session.mount('https://', TLSAdapter())
    
    def _get_headers(self) -> dict:
        """获取请求头"""
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        return headers
    
    def set_token(self, token: str):
        """设置 token"""
        self.token = token
    
    def get_profiles(self) -> dict:
        """获取用户的完整 profiles
        
        Returns:
            包含 content (dict), version, updated_at 的字典
            示例: {"content": {"SOUL.md": "...", "USER.md": "..."}, "version": 3, "updated_at": "..."}
        """
        url = f"{self.cloud_url}/api/profiles"
        
        response = self.session.get(url, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            error = response.json().get('error', 'Unknown error')
            raise Exception(f"Get profiles failed: {error}")
    
    def upload_profiles(self, content: dict, version: int) -> dict:
        """整体替换用户的 profiles
        
        Args:
            content: 包含所有文件的 dict，key 是文件名，value 是内容
                    示例: {"SOUL.md": "...", "USER.md": "...", "MEMORY.md": "..."}
            version: 客户端当前持有的版本号
            
        Returns:
            成功时返回 {"content": {...}, "version": N, "updated_at": "..."}
            冲突时抛出 ConflictError
        """
        url = f"{self.cloud_url}/api/profiles"
        data = {
            'content': content,
            'version': version
        }
        
        response = self.session.put(url, json=data, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 409:
            result = response.json()
            raise ConflictError(
                server_content=result.get('server_content', {}),
                server_version=result.get('server_version', 0)
            )
        elif response.status_code == 403:
            error = response.json().get('error', 'Subscription required')
            raise Exception(f"Upload failed: {error}")
        else:
            error = response.json().get('error', 'Unknown error')
            raise Exception(f"Upload failed: {error}")


class ConflictError(Exception):
    """版本冲突异常"""
    
    def __init__(self, server_content: dict, server_version: int):
        self.server_content = server_content
        self.server_version = server_version
        super().__init__(f"Version conflict: server version is {server_version}")
