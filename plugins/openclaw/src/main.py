#!/usr/bin/env python3
"""
SoulSync OpenClaw 插件主类
"""

import json
import os
import sys
import time
import getpass
import argparse

# 获取插件根目录
PLUGIN_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(PLUGIN_DIR, 'src')

# 添加 src 到路径
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from client import OpenClawClient
from watcher import OpenClawMultiWatcher
from version_manager import VersionManager
from profiles import ProfilesClient
from sync import ProfileSync


class SoulSyncPlugin:
    """SoulSync OpenClaw 插件主类"""
  
    def __init__(self):
        self.config = None
        self.client = None
        self.profiles_client = None
        self.watcher = None
        self.version_manager = None
        self.profile_sync = None
        self.running = False
  
    def load_config(self):
        """加载配置文件"""
        config_path = os.path.normpath(os.path.join(PLUGIN_DIR, 'config.json'))
        config_example_path = os.path.normpath(os.path.join(PLUGIN_DIR, 'config.json.example'))
      
        print(f"[SoulSync] Looking for config at: {config_path}")
      
        if not os.path.exists(config_path):
            if os.path.exists(config_example_path):
                print("[SoulSync] Config file not found, copying from config.json.example...")
                import shutil
                shutil.copy(config_example_path, config_path)
                print("[SoulSync] Created config.json from template")
            else:
                raise FileNotFoundError(f"Config file not found: {config_path}")
      
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in config.json: {e}")
      
        cloud_url = self.config.get('cloud_url', '').strip()
        email = self.config.get('email', '').strip()
        password = self.config.get('password', '').strip()
        
        if not cloud_url:
            self.config['cloud_url'] = 'https://soulsync.work'
            print("[SoulSync] Cloud URL not set, using default: https://soulsync.work")
        
        if not email or not password or email == 'your-email@example.com' or password == 'your-password':
            print("\n[SoulSync] ========================================")
            print("[SoulSync] Please configure your account first / 请先配置账号")
            print("[SoulSync] ========================================")
            print("[SoulSync] Edit config file / 编辑配置文件:")
            print(f"           {config_path}")
            print("[SoulSync] Set your email and password, then restart / 填写邮箱和密码后重启")
            print("[SoulSync] ========================================\n")
            sys.exit(0)
        
        workspace = self.config.get('workspace', './workspace')
        if workspace.startswith('./'):
            workspace = workspace[2:]
        workspace = os.path.normpath(os.path.join(PLUGIN_DIR, workspace))
      
        watch_files = self.config.get('watch_files', [])
      
        self.config['workspace'] = workspace
        self.config['watch_files'] = watch_files
      
        print(f"[SoulSync] Config loaded:")
        print(f"           Cloud URL: {self.config.get('cloud_url')}")
        print(f"           Workspace: {workspace}")
        print(f"           Watch files: {watch_files}")
    
    def _save_auth_to_config(self, auth_result):
        """保存认证结果到 config.json"""
        config_path = os.path.normpath(os.path.join(PLUGIN_DIR, 'config.json'))
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except:
            config = {}
        
        # 保存 email 和 password（如果 auth_result 包含）
        if 'user' in auth_result:
            config['email'] = auth_result['user'].get('email', '')
        
        # 保存 token
        if 'token' in auth_result:
            config['token'] = auth_result['token']
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        print("[SoulSync] Auth info saved to config.json")
    
    def run_setup(self):
        """交互式设置：注册或登录"""
        print("\n[SoulSync] ========================================")
        print("[SoulSync] Welcome to SoulSync! / 欢迎使用 SoulSync!")
        print("[SoulSync] ========================================")
        print("[SoulSync] 1. Register / 注册")
        print("[SoulSync] 2. Login / 登录")
        print("[SoulSync] ========================================")
        
        choice = input("[SoulSync] Choose / 选择 (1/2): ").strip()
        
        if choice == '1':
            return self._interactive_register()
        elif choice == '2':
            return self._interactive_login()
        else:
            print("[SoulSync] Invalid choice / 无效选择")
            sys.exit(0)
    
    def _interactive_login(self):
        """交互式登录（带重试）"""
        from client import OpenClawClient
        
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            print("\n--- Login / 登录 ---")
            email = input("[SoulSync] Email / 邮箱: ").strip()
            if not email:
                print("[SoulSync] Email cannot be empty / 邮箱不能为空")
                continue
            
            password = getpass.getpass("[SoulSync] Password / 密码: ")
            if not password:
                print("[SoulSync] Password cannot be empty / 密码不能为空")
                continue
            
            try:
                temp_client = OpenClawClient(self.config)
                result = temp_client.authenticate(email, password)
                if result:
                    print("\n[SoulSync] ✓ Login successful! / 登录成功!")
                    self._save_auth_to_config(result)
                    return True
            except Exception as e:
                retry_count += 1
                remaining = max_retries - retry_count
                error_msg = str(e)
                
                if "429" in error_msg or "too many" in error_msg.lower():
                    print(f"\n[SoulSync] ❌ {e}")
                    print("\n[SoulSync] Too many failed attempts / 登录失败次数过多")
                    print("[SoulSync] Exiting... / 退出...")
                    sys.exit(0)
                
                if remaining > 0:
                    print(f"\n[SoulSync] ❌ Login failed: {e} / 登录失败: {e}")
                    print(f"[SoulSync] Remaining attempts / 剩余尝试次数: {remaining}")
                else:
                    print(f"\n[SoulSync] ❌ Login failed: {e} / 登录失败: {e}")
        
        print("\n[SoulSync] ❌ Too many failed attempts. Please try again in 15 minutes. / 登录失败次数过多，请15分钟后再试")
        print("[SoulSync] Exiting... / 退出...")
        sys.exit(0)
    
    def _interactive_register(self):
        """交互式注册（带重试）"""
        from client import OpenClawClient
        
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            print("\n--- Register / 注册 ---")
            email = input("[SoulSync] Email / 邮箱: ").strip()
            if not email or '@' not in email:
                print("[SoulSync] Invalid email / 无效邮箱")
                continue
            
            password = getpass.getpass("[SoulSync] Password / 密码: ")
            if len(password) < 6:
                print("[SoulSync] Password must be at least 6 characters / 密码至少6位")
                continue
            
            password2 = getpass.getpass("[SoulSync] Confirm password / 确认密码: ")
            if password != password2:
                print("[SoulSync] Passwords do not match / 两次密码不一致")
                continue
            
            print(f"\n[SoulSync] Sending verification code to {email}...")
            try:
                temp_client = OpenClawClient(self.config)
                temp_client.send_verification_code(email)
                print("[SoulSync] ✓ Verification code sent! / 验证码已发送!")
            except Exception as e:
                print(f"[SoulSync] ❌ Failed to send code: {e}")
                continue
            
            code_retry = 0
            while code_retry < max_retries:
                code = input(f"[SoulSync] Enter code / 输入验证码 ({max_retries - code_retry} attempts left): ").strip()
                if len(code) != 6 or not code.isdigit():
                    code_retry += 1
                    print("[SoulSync] Invalid code format / 验证码格式错误")
                    continue
                
                try:
                    result = temp_client.register(email, password, code)
                    print("\n[SoulSync] ✓ Registration successful! / 注册成功!")
                    self._save_auth_to_config(result)
                    return True
                except Exception as e:
                    code_retry += 1
                    remaining_code = max_retries - code_retry
                    if "invalid" in str(e).lower() or "expired" in str(e).lower():
                        if remaining_code > 0:
                            print(f"[SoulSync] ❌ Invalid or expired code: {e}")
                            print(f"[SoulSync] Remaining attempts / 剩余尝试: {remaining_code}")
                        else:
                            print("[SoulSync] ❌ Too many code attempts / 验证码错误次数过多")
                            break
                    else:
                        print(f"[SoulSync] ❌ Registration failed: {e}")
                        break
            
            if code_retry >= max_retries:
                print("\n[SoulSync] Too many code verification failures.")
                print("[SoulSync] 1. Resend code / 重新发送验证码")
                print("[SoulSync] 2. Start over / 重新开始")
                print("[SoulSync] 3. Exit / 退出")
                
                sub_choice = input("[SoulSync] Choose / 选择 (1/2/3): ").strip()
                if sub_choice == '1':
                    retry_count = 0
                    continue
                elif sub_choice == '2':
                    retry_count = 0
                    break
                else:
                    print("[SoulSync] Exiting... / 退出...")
                    sys.exit(0)
        
        print("\n[SoulSync] ❌ Too many registration attempts / 注册尝试次数过多")
        print("[SoulSync] Exiting... / 退出...")
        sys.exit(0)
    
    def initialize(self):
        """初始化组件"""
        print("\n[SoulSync] ========================================")
        print("[SoulSync] Initializing SoulSync Plugin")
        print("[SoulSync] ========================================\n")
      
        self.client = OpenClawClient(self.config)

        token = self.client._load_token()
        if token:
            try:
                profile = self.client.get_profile()
                print(f"[SoulSync] Using existing token, user: {profile.get('email', 'unknown')}")
            except Exception as e:
                print(f"[SoulSync] Token invalid, re-authenticating: {e}")
                token = None

        if not token:
            email = self.config.get('email', '').strip()
            password = self.config.get('password', '').strip()
            
            print("[SoulSync] No valid token, attempting auto-login...")
            try:
                result = self.client.authenticate(email, password)
                if result:
                    print("[SoulSync] Login successful! / 登录成功!")
                    self._save_auth_to_config(result)
                    token = self.client.token
            except Exception as e:
                error_msg = str(e)
                print(f"[SoulSync] Login failed: {e}")
                
                if "429" in error_msg or "too many" in error_msg.lower():
                    print("\n[SoulSync] ========================================")
                    print("[SoulSync] Too many failed attempts. Please try again later / 登录失败次数过多，请稍后再试")
                    print("[SoulSync] ========================================\n")
                else:
                    print("\n[SoulSync] ========================================")
                    print("[SoulSync] Login failed: invalid email or password / 登录失败：邮箱或密码错误")
                    print("[SoulSync] Please check your config file / 请检查配置文件:")
                    print(f"           {os.path.normpath(os.path.join(PLUGIN_DIR, 'config.json'))}")
                    print("[SoulSync] ========================================\n")
                
                sys.exit(0)

        email = self.config.get('email')
        password = self.config.get('password')

        try:
            profile = self.client.get_profile()
            print(f"\n[SoulSync] Logged in as: {profile.get('email')}")
            subscription = profile.get('subscription', {})
            print(f"[SoulSync] Subscription: {subscription.get('status')} (days remaining: {subscription.get('daysRemaining', 0)})\n")
        except Exception as e:
            print(f"[SoulSync] Warning: Could not get profile: {e}")
      
        # 版本管理器
        versions_file = os.path.normpath(os.path.join(PLUGIN_DIR, 'versions.json'))
        self.version_manager = VersionManager(versions_file)
      
        self.profiles_client = ProfilesClient(
            self.config.get('cloud_url'),
            self.client.token
        )
      
        self.profile_sync = ProfileSync(
            self.profiles_client,
            self.version_manager,
            self.config.get('workspace')
        )
      
        print("Pulling all profiles from cloud...")
        try:
            self.profile_sync.pull_all()
        except Exception as e:
            print(f"Warning: Could not pull profiles: {e}")
      
        print("\nStarting file watcher...")
        watch_files = self.config.get('watch_files', [])
        self.watcher = OpenClawMultiWatcher(
            self.config.get('workspace'),
            watch_files,
            self.on_file_change
        )
        self.watcher.start()
      
        print("\nConnecting to WebSocket...")
        try:
            self.client.connect_websocket(self.on_websocket_message)
        except Exception as e:
            print(f"Warning: Could not connect WebSocket: {e}")
      
        self.running = True
  
    def on_file_change(self, event_type: str, relative_path: str, absolute_path: str = None):
        """文件变化回调"""
        print(f"\n[File {event_type}] {relative_path}")
      
        if event_type in ['modified', 'created']:
            time.sleep(0.5)
          
            try:
                self.profile_sync.push_file(relative_path)
                print(f"Upload completed: {relative_path}")
            except Exception as e:
                print(f"Upload error: {e}")
      
        elif event_type == 'deleted':
            print(f"File deleted (not synced to cloud): {relative_path}")
  
    def on_websocket_message(self, data: dict):
        """WebSocket 消息回调"""
        event = data.get('event')
      
        if event == 'file_updated':
            file_path = data.get('file_path')
            version = data.get('version')
            print(f"\n[WebSocket] File updated: {file_path} (v{version})")
            try:
                self.profile_sync.on_remote_change(file_path, version)
            except Exception as e:
                print(f"Sync error: {e}")
      
        elif event == 'new_memory':
            print(f"\n[WebSocket] New memory available!")
            try:
                self.profile_sync.pull_all()
                print("Memory synced from remote")
            except Exception as e:
                print(f"Sync error: {e}")
      
        elif data.get('type') == 'authenticated':
            print(f"[WebSocket] Authenticated, socket_id: {data.get('socket_id')}")
        elif data.get('type') == 'error':
            print(f"[WebSocket] Error: {data.get('message')}")
  
    def run(self):
        """运行插件"""
        print("\n" + "=" * 50)
        print("SoulSync OpenClaw Plugin (Multi-File Sync)")
        print("=" * 50 + "\n")
      
        try:
            self.load_config()
            self.initialize()
          
            print("\n=== Plugin Running ===")
            print("Press Ctrl+C to stop\n")
          
            while self.running:
                time.sleep(1)
              
        except KeyboardInterrupt:
            print("\n\nShutting down...")
            self.shutdown()
        except Exception as e:
            print(f"\nError: {e}")
            import traceback
            traceback.print_exc()
            self.shutdown()
            raise
  
    def shutdown(self):
        """关闭插件"""
        print("Shutting down SoulSync plugin...")
        self.running = False
      
        if self.watcher:
            try:
                self.watcher.stop()
                print("File watcher stopped")
            except Exception as e:
                print(f"Error stopping watcher: {e}")
      
        if self.client:
            try:
                self.client.close()
                print("Client connection closed")
            except Exception as e:
                print(f"Error closing client: {e}")
      
        print("Plugin shutdown complete")
def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='SoulSync Plugin')
    parser.add_argument('--setup', action='store_true', help='Run interactive setup (register/login)')
    parser.add_argument('--start', action='store_true', help='Start sync service (auto-login from config)')
    
    args = parser.parse_args()
    
    plugin = SoulSyncPlugin()
    
    if args.setup:
        plugin.load_config()
        plugin.run_setup()
        print("\n[SoulSync] ✓ Setup complete! Run 'openclaw soulsync:start' to begin syncing.")
        print("[SoulSync] 设置完成！运行 'openclaw soulsync:start' 开始同步。")
        sys.exit(0)
    
    plugin.load_config()
    
    email = plugin.config.get('email', '').strip()
    password = plugin.config.get('password', '').strip()
    
    if not email or not password:
        print("\n[SoulSync] ========================================")
        print("[SoulSync] Not configured. Run 'openclaw soulsync:setup' first.")
        print("[SoulSync] 尚未配置，请先运行 'openclaw soulsync:setup'")
        print("[SoulSync] ========================================\n")
        sys.exit(0)
    
    plugin.initialize()
    plugin.run()
if __name__ == '__main__':
    main()
