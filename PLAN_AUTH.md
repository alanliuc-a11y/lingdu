# SoulSync 用户注册与验证码功能开发计划

## 一、需求概述

为 SoulSync 添加用户注册和验证码功能，提升安全性和用户体验。

---

## 二、云端服务修改 (server/)

### 2.1 需要修改的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 添加 bcrypt 依赖 |
| `src/database.js` | 修改 | 添加 verification_codes 表 |
| `src/routes/auth.js` | 修改 | 新增注册和验证码接口 |

### 2.2 数据库设计

**修改 users 表**（已有，需调整）
```sql
-- 已有字段保持不变，password 字段改为存储 hash
-- 添加 email 为必填唯一字段
```

**新增 verification_codes 表**
```sql
CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
```

### 2.3 API 设计

#### POST /api/auth/send-code
- **说明**: 发送验证码
- **认证**: 不需要
- **请求体**:
```json
{
  "email": "user@example.com"
}
```
- **响应 (200)**:
```json
{
  "message": "Verification code sent",
  "expires_in": 300
}
```
- **响应 (429)**: 发送太频繁
```json
{
  "error": "Please wait before requesting another code"
}
```

#### POST /api/auth/register
- **说明**: 用户注册
- **认证**: 不需要
- **请求体**:
```json
{
  "email": "user@example.com",
  "password": "user_password",
  "code": "1234"
}
```
- **响应 (201)**:
```json
{
  "message": "Registration successful",
  "user_id": 1,
  "email": "user@example.com"
}
```
- **响应 (400)**:
```json
{
  "error": "Invalid verification code"
}
```
- **响应 (409)**:
```json
{
  "error": "Email already registered"
}
```

#### POST /api/auth/login
- **说明**: 用户登录（已有，需调整支持邮箱密码登录）
- **请求体**:
```json
{
  "email": "user@example.com",
  "password": "user_password"
}
```
- **响应 (200)**:
```json
{
  "user_id": 1,
  "email": "user@example.com",
  "token": "1:uuid-token"
}
```

---

## 三、插件端修改 (plugins/openclaw/)

### 3.1 需要修改的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/register.py` | 新增 | 注册交互流程 |
| `src/client.py` | 修改 | 添加注册相关 API 调用 |
| `src/main.py` | 修改 | 首次运行时引导注册 |

### 3.2 注册流程

```
1. 检查本地是否有 token
   ├── 有 token → 尝试登录验证
   └── 无 token → 进入注册流程

2. 注册流程:
   ├── 提示输入邮箱
   ├── 调用 /api/auth/send-code
   ├── 显示"验证码已发送，请查看服务器控制台"
   ├── 提示输入验证码
   ├── 提示输入密码（隐藏输入）
   ├── 调用 /api/auth/register
   └── 保存 token 到本地

3. 密码输入:
   ├── 使用 getpass 模块隐藏输入
   └── 要求确认密码
```

### 3.3 交互示例

```
=== SoulSync 首次运行 ===

请输入您的邮箱: user@example.com
验证码已发送，请查看服务器控制台
请输入验证码: 1234
请输入密码: ********
请确认密码: ********

注册成功！
```

---

## 四、开发顺序

### 4.1 云端服务
1. [ ] 安装 bcrypt 依赖
2. [ ] 创建 verification_codes 表
3. [ ] 实现 POST /api/auth/send-code
4. [ ] 实现 POST /api/auth/register（带验证码校验）
5. [ ] 修改 POST /api/auth/login（支持邮箱密码）
6. [ ] 测试 API

### 4.2 插件端
1. [ ] 创建 register.py（注册交互）
2. [ ] 修改 client.py（添加注册 API）
3. [ ] 修改 main.py（首次运行引导）
4. [ ] 测试完整流程

---

## 五、安全考虑

| 项目 | 说明 |
|------|------|
| 密码存储 | 使用 bcrypt 加密，cost factor = 10 |
| 验证码有效期 | 5 分钟 |
| 验证码长度 | 4 位数字 |
| 发送频率限制 | 同一邮箱 60 秒内只能发送一次 |
| 验证码使用后删除 | 验证成功后立即删除 |

---

## 六、测试方案

### 6.1 API 测试

```bash
# 发送验证码
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 注册（需先获取验证码）
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","code":"1234"}'

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

### 6.2 插件测试

1. 删除本地 token 文件
2. 运行插件
3. 按提示完成注册
4. 验证 token 已保存
5. 重启插件，验证自动登录

---

## 七、注意事项

1. **兼容性**: 保留原有的设备ID登录方式，新增邮箱密码方式
2. **迁移**: 现有用户数据不受影响
3. **控制台验证码**: 第一阶段验证码打印到服务器控制台，后续可接入邮件服务
