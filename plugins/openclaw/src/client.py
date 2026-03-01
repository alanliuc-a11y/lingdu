import json
import os
import uuid
import requests
import websocket


class OpenClawClient:
    """OpenClaw 插件的 API/WS 客户端"""
    
    def __init__(self, config: dict):
        self.config = config
        self.cloud_url = config.get('cloud_url', '').rstrip('/')
        self.token = None
        self.user_id = None
        self.device_id = self._load_or_generate_device_id()
        self.ws = None
        self.ws_thread = None
    
    def _load_or_generate_device_id(self) -> str:
        """加载或生成设备ID"""
        plugin_dir = os.path.dirname(os.path.dirname(__file__))
        device_id_file = os.path.join(plugin_dir, 'device_id')
        
        if os.path.exists(device_id_file):
            with open(device_id_file, 'r') as f:
                return f.read().strip()
        
        new_device_id = str(uuid.uuid4())
        with open(device_id_file, 'w') as f:
            f.write(new_device_id)
        
        print(f"Generated new device_id: {new_device_id}")
        return new_device_id
    
    def _save_token(self, token: str):
        """保存 token"""
        plugin_dir = os.path.dirname(os.path.dirname(__file__))
        token_file = os.path.join(plugin_dir, 'token')
        with open(token_file, 'w') as f:
            f.write(token)
        self.token = token
    
    def _load_token(self) -> str:
        """加载 token"""
        plugin_dir = os.path.dirname(os.path.dirname(__file__))
        token_file = os.path.join(plugin_dir, 'token')
        
        if os.path.exists(token_file):
            with open(token_file, 'r') as f:
                return f.read().strip()
        
        return None
    
    def _get_headers(self) -> dict:
        """获取请求头"""
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        return headers
    
    def authenticate(self, email: str = None, password: str = None) -> dict:
        """认证：注册或登录
        
        Args:
            email: 邮箱 (首次注册需要)
            password: 密码 (首次注册需要)
            
        Returns:
            认证结果
        """
        self.token = self._load_token()
        
        if self.token:
            try:
                profile = self.get_profile()
                print(f"Using existing token, user: {profile.get('email', 'unknown')}")
                return profile
            except Exception as e:
                print(f"Token invalid, re-authenticating: {e}")
                self.token = None
        
        if not email:
            email = self.config.get('email', '')
        if not password:
            password = self.config.get('password', '')
        
        if not email or not password:
            raise ValueError("Email and password required for first-time authentication")
        
        url = f"{self.cloud_url}/api/auth/device"
        data = {
            'device_id': self.device_id,
            'email': email,
            'password': password
        }
        
        response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
        
        if response.status_code == 201:
            result = response.json()
            self.token = result.get('token')
            self.user_id = result.get('user_id')
            self._save_token(self.token)
            print(f"Registered new user: {email}")
            return result
        elif response.status_code == 200:
            result = response.json()
            self.token = result.get('token')
            self.user_id = result.get('user_id')
            self._save_token(self.token)
            print(f"Logged in: {email}")
            return result
        else:
            error = response.json().get('error', 'Unknown error')
            raise Exception(f"Authentication failed: {error}")
    
    def upload_memory(self, content: str) -> dict:
        """上传记忆
        
        Args:
            content: 记忆内容
            
        Returns:
            上传结果
        """
        url = f"{self.cloud_url}/api/memories"
        data = {'content': content}
        
        response = requests.post(url, json=data, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 403:
            error = response.json().get('error', 'Subscription required')
            raise Exception(f"Upload failed: {error}")
        else:
            error = response.json().get('error', 'Unknown error')
            raise Exception(f"Upload failed: {error}")
    
    def download_memory(self) -> dict:
        """下载记忆
        
        Returns:
            包含 content, version 等信息的字典
        """
        url = f"{self.cloud_url}/api/memories"
        
        response = requests.get(url, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            return {'content': '', 'version': 0}
        else:
            error = response.json().get('error', 'Unknown error')
            raise Exception(f"Download failed: {error}")
    
    def get_profile(self) -> dict:
        """获取用户信息
        
        Returns:
            用户信息
        """
        url = f"{self.cloud_url}/api/memories/profile"
        
        response = requests.get(url, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            error = response.json().get('error', 'Unknown error')
            raise Exception(f"Get profile failed: {error}")
    
    def connect_websocket(self, on_message_callback):
        """连接 WebSocket
        
        Args:
            on_message_callback: 消息回调函数
        """
        ws_url = self.cloud_url.replace('http', 'ws') + '/ws'
        
        def on_ws_message(ws, message):
            try:
                data = json.loads(message)
                on_message_callback(data)
            except Exception as e:
                print(f"WebSocket message error: {e}")
        
        def on_ws_error(ws, error):
            print(f"WebSocket error: {error}")
        
        def on_ws_close(ws, close_status_code, close_msg):
            print(f"WebSocket closed: {close_status_code} - {close_msg}")
        
        def on_ws_open(ws):
            print("WebSocket connected")
            if self.token:
                ws.send(json.dumps({'type': 'auth', 'token': self.token}))
        
        self.ws = websocket.WebSocketApp(
            ws_url,
            on_message=on_ws_message,
            on_error=on_ws_error,
            on_close=on_ws_close,
            on_open=on_ws_open
        )
        
        self.ws.on_pong = lambda ws, data: None
        
        import threading
        self.ws_thread = threading.Thread(target=self.ws.run_forever, daemon=True)
        self.ws_thread.start()
    
    def disconnect_websocket(self):
        """断开 WebSocket 连接"""
        if self.ws:
            self.ws.close()
            self.ws = None
    
    def send_ping(self):
        """发送 ping 保持连接"""
        if self.ws and self.ws.sock and self.ws.sock.connected:
            self.ws.send(json.dumps({'type': 'ping'}))

    def send_verification_code(self, email: str) -> dict:
        """发送验证码
        
        Args:
            email: 邮箱地址
            
        Returns:
            发送结果
        """
        url = f"{self.cloud_url}/api/auth/send-code"
        data = {'email': email}

        response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})

        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            error = response.json().get('error', 'Rate limit')
            raise Exception(f"Send code failed: {error}")
        else:
            error = response.json().get('error', 'Unknown error')
            raise Exception(f"Send code failed: {error}")

    def register(self, email: str, password: str, code: str) -> dict:
        """用户注册
        
        Args:
            email: 邮箱地址
            password: 密码
            code: 验证码
            
        Returns:
            注册结果
        """
        url = f"{self.cloud_url}/api/auth/register"
        data = {'email': email, 'password': password, 'code': code}

        response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})

        if response.status_code == 201:
            result = response.json()
            self.token = result.get('token')
            self.user_id = result.get('user_id')
            self._save_token(self.token)
            return result
        else:
            error = response.json().get('error', 'Unknown error')
            raise Exception(f"Registration failed: {error}")

    def login(self, email: str, password: str) -> dict:
        """用户登录
        
        Args:
            email: 邮箱地址
            password: 密码
            
        Returns:
            登录结果
        """
        url = f"{self.cloud_url}/api/auth/login"
        data = {'email': email, 'password': password}

        response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})

        if response.status_code == 200:
            result = response.json()
            self.token = result.get('token')
            self.user_id = result.get('user_id')
            self._save_token(self.token)
            return result
        else:
            error = response.json().get('error', 'Unknown error')
            raise Exception(f"Login failed: {error}")
