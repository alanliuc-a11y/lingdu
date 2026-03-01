#!/usr/bin/env python3
"""
SoulSync OpenClaw 插件主类
"""

import json
import os
import sys
import time

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
from register import Register, Login
from interactive_auth import prompt_for_missing_config, interactive_setup, check_existing_config


class SoulSyncPlugin:
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
      
        print(f"Looking for config at: {config_path}")
      
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found: {config_path}")
      
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in config.json: {e}")
      
        # 处理 workspace 路径
        workspace = self.config.get('workspace', './workspace')
        if workspace.startswith('./'):
            workspace = workspace[2:]
        workspace = os.path.normpath(os.path.join(PLUGIN_DIR, workspace))
      
        watch_files = self.config.get('watch_files', [])
      
        self.config['workspace'] = workspace
        self.config['watch_files'] = watch_files
      
        print(f"Config loaded:")
        print(f"  Cloud URL: {self.config.get('cloud_url')}")
        print(f"  Workspace: {workspace}")
        print(f"  Watch files: {watch_files}")
  
    def initialize(self):
        """初始化组件"""
        print("\n=== Initializing SoulSync Plugin ===\n")
      
        self.client = OpenClawClient(self.config)

        token = self.client._load_token()
        if token:
            try:
                profile = self.client.get_profile()
                print(f"Using existing token, user: {profile.get('email', 'unknown')}")
            except Exception as e:
                print(f"Token invalid, please login again")
                token = None

        if not token:
            print("\n=== 首次运行，请先登录或注册 ===\n")
            print("1. 登录（已有账号）")
            print("2. 注册（新用户）")

            choice = input("请选择 (1/2): ").strip()

            if choice == '1':
                login = Login(self.client)
                result = login.run()
            elif choice == '2':
                register = Register(self.client)
                result = register.run()
            else:
                print("无效选择")
                sys.exit(1)

        email = self.config.get('email')
        password = self.config.get('password')

        try:
            profile = self.client.get_profile()
            print(f"\nLogged in as: {profile.get('email')}")
            subscription = profile.get('subscription', {})
            print(f"Subscription: {subscription.get('status')} (days remaining: {subscription.get('daysRemaining', 0)})\n")
        except Exception as e:
            print(f"Warning: Could not get profile: {e}")
      
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
    plugin = SoulSyncPlugin()
    plugin.run()
if __name__ == '__main__':
    main()
