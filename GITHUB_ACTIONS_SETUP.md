# GitHub Actions 自动发布配置指南

## 步骤 1：获取 npm Access Token

1. 登录 npm：https://www.npmjs.com/
2. 点击右上角头像 → "Access Tokens"
3. 点击 "Generate New Token" → "Classic Token"
4. 选择类型：**Automation**
5. 复制生成的 token（格式：`npm_xxxxxxxxxxxxxxxxxxxx`）

## 步骤 2：配置 GitHub Secrets

1. 打开：https://github.com/alanliuc-a11y/lingdu/settings/secrets/actions
2. 点击 "New repository secret"
3. 名称：`NPM_TOKEN`
4. 值：粘贴你的 npm token
5. 点击 "Add secret"

## 步骤 3：推送工作流和标签

```bash
# 提交工作流文件
git add .github/workflows/
git commit -m "Add GitHub Actions workflows"
git push origin dev-semantic

# 创建并推送标签（这会触发自动发布）
git tag -a v3.0.0 -m "Release v3.0.0"
git push origin v3.0.0
```

## 监控发布

访问：https://github.com/alanliuc-a11y/lingdu/actions

## 验证结果

```bash
npm view lingdu-core version  # 应该显示 3.0.0
npm view lingdu version       # 应该显示 3.0.0
```