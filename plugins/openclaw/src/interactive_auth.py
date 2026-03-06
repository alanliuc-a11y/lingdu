#!/usr/bin/env python3
"""
SoulSync 交互式认证模块
处理用户注册、登录、邮箱验证
"""

import os
import sys
import json
import re
import getpass

# 获取插件目录
PLUGIN_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(PLUGIN_DIR, 'config.json')


def get_input(prompt):
    """获取用户输入"""
    try:
        return input(prompt)
    except KeyboardInterrupt:
        print("\n\nOperation cancelled / 操作已取消")
        sys.exit(0)


def get_password(prompt):
    """获取密码（隐藏输入）"""
    try:
        return getpass.getpass(prompt)
    except KeyboardInterrupt:
        print("\n\nOperation cancelled / 操作已取消")
        sys.exit(0)


def is_valid_email(email):
    """验证邮箱格式"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def load_config():
    """加载配置文件"""
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}


def save_config(config):
    """保存配置文件"""
    try:
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Failed to save config: {e} / 保存配置失败: {e}")
        return False


def check_existing_config():
    """检查是否已有配置"""
    config = load_config()
    email = config.get('email', '').strip()
    password = config.get('password', '').strip()
    
    if email and password:
        return config
    return None


def interactive_setup(client):
    """
    交互式设置流程
    返回配置好的 config 字典
    """
    print("\n" + "=" * 50)
    print("Welcome to SoulSync! / 欢迎使用 SoulSync!")
    print("=" * 50)
    print()
    
    # 检查现有配置
    existing = check_existing_config()
    if existing:
        print(f"Detected existing account / 已检测到现有账号: {existing['email']}")
        choice = get_input("Use existing account? (y/n) / 是否使用现有账号?: ").lower().strip()
        if choice in ['y', 'yes', '是']:
            return existing
        print()
    
    # 询问是否有账号
    print("Please select / 请选择:")
    print("1. Login / 登录已有账号")
    print("2. Register / 注册新账号")
    print()
    
    while True:
        choice = get_input("Enter option / 输入选项 (1/2): ").strip()
        if choice in ['1', '2']:
            break
        print("Invalid option / 无效选项，请重新输入")
    
    if choice == '1':
        return interactive_login(client)
    else:
        return interactive_register(client)


def interactive_login(client):
    """交互式登录"""
    print("\n--- Login / 登录 ---")
    
    # 输入邮箱
    while True:
        email = get_input("Email / 邮箱: ").strip()
        if is_valid_email(email):
            break
        print("Invalid email format / 邮箱格式不正确，请重新输入")
    
    # 输入密码
    password = get_password("Password / 密码: ")
    
    print("\nLogging in... / 正在登录...")
    
    try:
        # 尝试登录
        result = client.authenticate(email, password)
        
        if result:
            print("✅ Login successful! / 登录成功!")
            
            # 保存配置
            config = load_config()
            config['email'] = email
            config['password'] = password
            save_config(config)
            
            return config
        else:
            print("❌ Login failed, invalid email or password / 登录失败，邮箱或密码错误")
            return None
            
    except Exception as e:
        print(f"❌ Login error: {e} / 登录出错: {e}")
        return None


def interactive_register(client):
    """交互式注册"""
    print("\n--- Register / 注册新账号 ---")
    
    # 输入邮箱
    while True:
        email = get_input("Email / 邮箱: ").strip()
        if not is_valid_email(email):
            print("Invalid email format / 邮箱格式不正确，请重新输入")
            continue
        
        # 检查邮箱是否已注册
        print("Checking email availability... / 检查邮箱可用性...")
        # TODO: 调用后端 API 检查邮箱是否已存在
        # 暂时假设可用
        break
    
    # 输入密码
    while True:
        password = get_password("Set password (min 6 characters) / 设置密码 (至少6位): ")
        if len(password) >= 6:
            break
        print("Password too short, minimum 6 characters / 密码太短，请至少输入6位")
    
    # 确认密码
    while True:
        password2 = get_password("Confirm password / 确认密码: ")
        if password == password2:
            break
        print("Passwords do not match, please try again / 两次密码不一致，请重新输入")
    
    # 发送验证码
    print(f"\nSending verification code to {email} / 正在发送验证码到 {email}...")
    try:
        client.send_verification_code(email)
        print("✅ Verification code sent! / 验证码已发送!")
    except Exception as e:
        print(f"❌ Failed to send code: {e} / 发送验证码失败: {e}")
        return None
    
    # 输入验证码
    max_attempts = 3
    for attempt in range(max_attempts):
        code = get_input(f"Enter verification code / 请输入验证码 (remaining attempts / 剩余尝试: {max_attempts - attempt}): ").strip()
        
        # Verify code format (6 digits)
        if len(code) == 6 and code.isdigit():
            # Verify with server
            try:
                result = client.register(email, password, code)
                print("✅ Verification successful! / 验证成功!")
                break
            except Exception as e:
                print(f"❌ Verification failed: {e} / 验证失败: {e}")
                if attempt == max_attempts - 1:
                    print("Too many failed attempts, please re-register / 验证失败次数过多，请重新注册")
                    return None
        else:
            print("❌ Invalid code format, please enter 6-digit code / 验证码格式错误，请输入6位数字验证码")
            if attempt == max_attempts - 1:
                print("Too many failed attempts, please re-register / 验证失败次数过多，请重新注册")
                return None
    
    # 完成注册
    print("\nCreating account... / 正在创建账号...")
    try:
        print("✅ Registration successful! / 注册成功!")
        
        # 保存配置
        config = load_config()
        config['email'] = email
        config['password'] = password
        save_config(config)
        
        return config
        
    except Exception as e:
        print(f"❌ Registration failed: {e} / 注册失败: {e}")
        return None


def prompt_for_missing_config(client):
    """
    当配置缺失时，提示用户输入
    用于插件启动时自动检测
    """
    config = load_config()
    
    email = config.get('email', '').strip()
    password = config.get('password', '').strip()
    cloud_url = config.get('cloud_url', '').strip()
    
    # 检查是否需要交互式配置
    need_setup = not email or not password or not cloud_url
    
    if need_setup:
        print("\nFirst time using SoulSync, configuration required... / 首次使用 SoulSync，需要进行配置...")
        
        # 如果没有 cloud_url，设置默认值
        if not cloud_url:
            config['cloud_url'] = 'https://soulsync.work'
            print(f"Using default server / 使用默认服务器: {config['cloud_url']}")
        
        # 交互式登录/注册
        result = interactive_setup(client)
        
        if result:
            return result
        else:
            print("\n❌ Configuration failed, plugin cannot start / 配置失败，插件无法启动")
            return None
    
    return config


if __name__ == '__main__':
    # 测试代码
    print("Interactive Auth Module Test / 交互式认证模块测试")
    print("=" * 50)
    
    # 模拟客户端
    class MockClient:
        def authenticate(self, email, password):
            print(f"Simulating login / 模拟登录: {email}")
            return True
    
    client = MockClient()
    result = interactive_setup(client)
    
    if result:
        print(f"\nConfiguration complete / 配置完成: {result}")
    else:
        print("\nConfiguration failed / 配置失败")
