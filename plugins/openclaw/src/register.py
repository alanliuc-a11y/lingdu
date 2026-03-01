import getpass
import sys


class Register:
    def __init__(self, client):
        self.client = client

    def run(self):
        print("\n" + "=" * 50)
        print("SoulSync User Registration / SoulSync 用户注册")
        print("=" * 50 + "\n")

        email = self.get_email()
        if not email:
            return None

        self.send_code(email)
        code = self.get_code()
        if not code:
            return None

        password = self.get_password()
        if not password:
            return None

        result = self.register(email, password, code)
        return result

    def get_email(self):
        while True:
            email = input("Please enter your email / 请输入您的邮箱: ").strip()
            if email:
                if '@' in email and '.' in email:
                    return email
                else:
                    print("Please enter a valid email address / 请输入有效的邮箱地址")
            else:
                print("Email cannot be empty / 邮箱不能为空")

    def send_code(self, email):
        print(f"\nSending verification code to {email} / 正在发送验证码到 {email}...")
        try:
            result = self.client.send_verification_code(email)
            print("Verification code sent! / 验证码已发送！")
            print("Please check server console for the code / 请查看服务器控制台获取验证码")
            print(f"Code expires in / 验证码有效期: {result.get('expires_in', 300)} seconds\n")
        except Exception as e:
            print(f"Failed to send code: {e} / 发送验证码失败: {e}")
            sys.exit(1)

    def get_code(self):
        max_retries = 3
        retries = 0
        while retries < max_retries:
            code = input("Please enter verification code / 请输入验证码: ").strip()
            if code and len(code) == 6 and code.isdigit():
                return code
            else:
                retries += 1
                remaining = max_retries - retries
                if remaining > 0:
                    print(f"Invalid code, please enter 6-digit code / 请输入6位数字验证码, remaining attempts: {remaining}")
                else:
                    print("Max retries exceeded, exiting / 超过最大重试次数，退出")
                    sys.exit(1)

    def get_password(self):
        while True:
            password = getpass.getpass("Please enter password / 请输入密码: ")
            if len(password) < 6:
                print("Password must be at least 6 characters / 密码至少6位")
                continue

            confirm = getpass.getpass("Please confirm password / 请确认密码: ")
            if password == confirm:
                return password
            else:
                print("Passwords do not match, please try again / 两次密码不一致，请重新输入")

    def register(self, email, password, code):
        print("\nRegistering... / 正在注册...")
        try:
            result = self.client.register(email, password, code)
            print("\nRegistration successful! / 注册成功！")
            return result
        except Exception as e:
            print(f"\nRegistration failed: {e} / 注册失败: {e}")
            sys.exit(1)


class Login:
    def __init__(self, client):
        self.client = client

    def run(self):
        print("\n" + "=" * 50)
        print("SoulSync User Login / SoulSync 用户登录")
        print("=" * 50 + "\n")

        email = self.get_email()
        password = self.get_password()

        result = self.login(email, password)
        return result

    def get_email(self):
        while True:
            email = input("Please enter your email / 请输入您的邮箱: ").strip()
            if email:
                return email
            else:
                print("Email cannot be empty / 邮箱不能为空")

    def get_password(self):
        while True:
            password = getpass.getpass("Please enter password / 请输入密码: ")
            if password:
                return password
            else:
                print("Password cannot be empty / 密码不能为空")

    def login(self, email, password):
        print("\nLogging in... / 正在登录...")
        try:
            result = self.client.login(email, password)
            print("\nLogin successful! / 登录成功！")
            return result
        except Exception as e:
            print(f"\nLogin failed: {e} / 登录失败: {e}")
            sys.exit(1)
