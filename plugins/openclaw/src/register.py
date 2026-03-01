import getpass
import sys


class Register:
    def __init__(self, client):
        self.client = client

    def run(self):
        print("\n" + "=" * 50)
        print("SoulSync 用户注册")
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
            email = input("请输入您的邮箱: ").strip()
            if email:
                if '@' in email and '.' in email:
                    return email
                else:
                    print("请输入有效的邮箱地址")
            else:
                print("邮箱不能为空")

    def send_code(self, email):
        print(f"\n正在发送验证码到 {email}...")
        try:
            result = self.client.send_verification_code(email)
            print("验证码已发送！")
            print("请查看服务器控制台获取验证码")
            print(f"验证码有效期: {result.get('expires_in', 300)} 秒\n")
        except Exception as e:
            print(f"发送验证码失败: {e}")
            sys.exit(1)

    def get_code(self):
        while True:
            code = input("请输入验证码: ").strip()
            if code and len(code) == 4 and code.isdigit():
                return code
            else:
                print("请输入4位数字验证码")

    def get_password(self):
        while True:
            password = getpass.getpass("请输入密码: ")
            if len(password) < 6:
                print("密码至少6位")
                continue

            confirm = getpass.getpass("请确认密码: ")
            if password == confirm:
                return password
            else:
                print("两次密码不一致，请重新输入")

    def register(self, email, password, code):
        print("\n正在注册...")
        try:
            result = self.client.register(email, password, code)
            print("\n注册成功！")
            return result
        except Exception as e:
            print(f"\n注册失败: {e}")
            sys.exit(1)


class Login:
    def __init__(self, client):
        self.client = client

    def run(self):
        print("\n" + "=" * 50)
        print("SoulSync 用户登录")
        print("=" * 50 + "\n")

        email = self.get_email()
        password = self.get_password()

        result = self.login(email, password)
        return result

    def get_email(self):
        while True:
            email = input("请输入您的邮箱: ").strip()
            if email:
                return email
            else:
                print("邮箱不能为空")

    def get_password(self):
        while True:
            password = getpass.getpass("请输入密码: ")
            if password:
                return password
            else:
                print("密码不能为空")

    def login(self, email, password):
        print("\n正在登录...")
        try:
            result = self.client.login(email, password)
            print("\n登录成功！")
            return result
        except Exception as e:
            print(f"\n登录失败: {e}")
            sys.exit(1)
