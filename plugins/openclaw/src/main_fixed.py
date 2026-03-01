#!/usr/bin/env python3
"""
SoulSync OpenClaw 插件主类 - 修复版
解决跨平台路径问题和导入问题
支持交互式认证
"""

import json
import os
import sys
import time
import re
import getpass

# 获取插件根目录
PLUGIN_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(PLUGIN_DIR, 'src')

# 添加 src 到路径
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

try:
    from client import OpenClawClient
    from watcher import OpenClawMultiWatcher
    from version_manager import VersionManager
    from profiles import ProfilesClient
    from sync import ProfileSync
except ImportError as e:
    print(f"导入错误: {e}")
    print(f"当前路径: {sys.path}")
    print(f"SRC_DIR: {SRC_DIR}")
    raise


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
    
    def get_input(self, prompt):
        """获取用户输入"""
        try:
            return input(prompt)
        except KeyboardInterrupt:
            print("\n\n操作已取消")
            sys.exit(0)
    
    def get_password(self, prompt):
        """获取密码（隐藏输入）"""
        try:
            return getpass.getpass(prompt)
        except KeyboardInterrupt:
            print("\n\n操作已取消")
            sys.exit(0)
    
    def is_valid_email(self, email):
        """验证邮箱格式"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def save_config(self):
        """保存配置文件"""
        config_path = os.path.normpath(os.path.join(PLUGIN_DIR, 'config.json'))
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"保存配置失败: {e}")
            return False
    
    def interactive_auth(self):
        """交互式认证流程"""
        print("\n" + "=" * 50)
        print("欢迎使用 SoulSync!")
        print("=" * 50)
        print()
        
        # 设置默认服务器
        if not self.config.get('cloud_url'):
            self.config['cloud_url'] = 'http://47.96.170.74:3000'
            print(f"使用默认服务器: {self.config['cloud_url']}")
            print()
        
        # 创建临时客户端
        self.client = OpenClawClient(self.config)
        
        # 询问登录或注册
        print("请选择:")
        print("1. 登录已有账号")
        print("2. 注册新账号")
        print()
        
        while True:
            choice = self.get_input("输入选项 (1/2): ").strip()
            if choice in ['1', '2']:
                break
            print("无效选项，请重新输入")
        
        if choice == '1':
            return self.interactive_login()
        else:
            return self.interactive_register()
    
    def interactive_login(self):
        """交互式登录"""
        print("\n--- 登录 ---")
        
        # 输入邮箱
        while True:
            email = self.get_input("邮箱: ").strip()
            if self.is_valid_email(email):
                break
            print("邮箱格式不正确，请重新输入")
        
        # 输入密码
        password = self.get_password("密码: ")
        
        print("\n正在登录...")
        
        try:
            result = self.client.login(email, password)
            print(f"✅ 登录成功!")
            
            # 保存到配置
            self.config['email'] = email
            self.config['password'] = password
            self.save_config()
            return True
        except Exception as e:
            print(f"❌ 登录失败: {e}")
            print("\n请重新选择:")
            return self.interactive_auth()
    
    def interactive_register(self):
        """交互式注册"""
        print("\n--- 注册新账号 ---")
        
        # 输入邮箱
        while True:
            email = self.get_input("邮箱: ").strip()
            if not self.is_valid_email(email):
                print("邮箱格式不正确，请重新输入")
                continue
            break
        
        # 发送验证码
        print(f"\n正在发送验证码到 {email}...")
        try:
            self.client.send_verification_code(email)
            print("✅ 验证码已发送!")
            print("请查看服务器控制台获取验证码")
        except Exception as e:
            print(f"❌ 发送验证码失败: {e}")
            return self.interactive_auth()
        
        # 输入验证码
        max_attempts = 3
        for attempt in range(max_attempts):
            code = self.get_input(f"请输入验证码 (剩余尝试 {max_attempts - attempt} 次): ").strip()
            
            if len(code) == 4 and code.isdigit():
                break
            else:
                print("❌ 验证码格式错误，应为4位数字")
                if attempt == max_attempts - 1:
                    print("验证失败次数过多，请重新注册")
                    return self.interactive_auth()
        
        # 输入密码
        while True:
            password = self.get_password("设置密码 (至少6位): ")
            if len(password) >= 6:
                break
            print("密码太短，请至少输入6位")
        
        # 确认密码
        while True:
            password2 = self.get_password("确认密码: ")
            if password == password2:
                break
            print("两次密码不一致，请重新输入")
        
        # 注册
        print("\n正在创建账号...")
        try:
            result = self.client.register(email, password, code)
            print("✅ 注册成功!")
            
            # 保存配置
            self.config['email'] = email
            self.config['password'] = password
            self.save_config()
            
            return True
        except Exception as e:
            print(f"❌ 注册失败: {e}")
            print("\n请重新选择:")
            return self.interactive_auth()
    
    def load_config(self):
        """加载配置文件"""
        config_path = os.path.normpath(os.path.join(PLUGIN_DIR, 'config.json'))
        
        print(f"Looking for config at: {config_path}")
        
        # 如果配置文件不存在，创建默认配置并进行交互式认证
        if not os.path.exists(config_path):
            print("Config file not found, starting interactive setup...")
            self.config = {}
            
            # 设置默认 workspace
            workspace = os.path.normpath(os.path.join(PLUGIN_DIR, 'workspace'))
            self.config['workspace'] = './workspace'
            self.config['watch_files'] = [
                "SOUL.md",
                "IDENTITY.md",
                "USER.md",
                "AGENTS.md",
                "TOOLS.md",
                "skills.json",
                "memory/",
                "MEMORY.md"
            ]
            
            # 交互式认证
            if not self.interactive_auth():
                raise RuntimeError("Authentication failed")
            
            return
        
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
        
        watch_files = self.config.get('watch_files', ['MEMORY.md', 'memory/'])
        
        self.config['workspace'] = workspace
        self.config['watch_files'] = watch_files
        
        print(f"Config loaded:")
        print(f"  Cloud URL: {self.config.get('cloud_url')}")
        print(f"  Workspace: {workspace}")
        print(f"  Watch files: {watch_files}")
        
        # 检查是否需要认证
        email = self.config.get('email', '').strip()
        password = self.config.get('password', '').strip()
        
        if not email or not password:
            print("\n邮箱或密码未配置，需要进行认证...")
            if not self.interactive_auth():
                raise RuntimeError("Authentication failed")
    
    def initialize(self):
        """初始化组件"""
        print("\n=== Initializing SoulSync Plugin ===\n")
        
        self.client = OpenClawClient(self.config)
        
        email = self.config.get('email')
        password = self.config.get('password')
        
        if not email or not password:
            self.interactive_auth()
        else:
            try:
                self.client.authenticate(email, password)
                print(f"\n✅ 登录成功: {email}")
            except Exception as e:
                print(f"\n❌ 登录失败: {e}")
                print("将进入交互式认证...")
                self.interactive_auth()
        
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
