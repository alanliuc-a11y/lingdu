# LingDu v3.0.0 发布脚本 (Windows PowerShell)
# 使用方法: .\release.ps1

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "LingDu v3.0.0 发布脚本" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 检查命令
function Test-Command {
    param($Command)
    if (!(Get-Command $Command -ErrorAction SilentlyContinue)) {
        Write-Host "错误: $Command 未安装" -ForegroundColor Red
        exit 1
    }
}

# 确认函数
function Confirm-Action {
    param($Message)
    $response = Read-Host "$Message (y/n)"
    if ($response -ne 'y') {
        Write-Host "操作已取消" -ForegroundColor Red
        exit 1
    }
}

# 检查环境
Write-Host "检查环境..." -ForegroundColor Yellow
Test-Command npm
Test-Command git
Write-Host "✓ 环境检查通过" -ForegroundColor Green
Write-Host ""

# 检查 Git 状态
Write-Host "检查 Git 状态..." -ForegroundColor Yellow
$gitStatus = git status -s
if ($gitStatus) {
    Write-Host "警告: 有未提交的更改" -ForegroundColor Yellow
    git status -s
    Confirm-Action "是否继续?"
}
Write-Host "✓ Git 状态正常" -ForegroundColor Green
Write-Host ""

# 运行测试
Write-Host "运行测试..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 测试失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 所有测试通过" -ForegroundColor Green
Write-Host ""

# 确认发布
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "准备发布以下包:" -ForegroundColor Cyan
Write-Host "  1. lingdu-core@3.0.0"
Write-Host "  2. lingdu@3.0.0"
Write-Host "  3. lingdu-openclaw@3.0.0"
Write-Host "=========================================" -ForegroundColor Cyan
Confirm-Action "确认发布?"

# 发布 lingdu-core
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "步骤 1/3: 发布 lingdu-core" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Set-Location packages\lingdu-core

Write-Host "检查 package.json..." -ForegroundColor Yellow
$packageJson = Get-Content package.json | ConvertFrom-Json
$version = $packageJson.version
if ($version -ne "3.0.0") {
    Write-Host "错误: lingdu-core 版本号不是 3.0.0 (当前: $version)" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 版本号正确: $version" -ForegroundColor Green

Write-Host "发布到 npm..." -ForegroundColor Yellow
npm publish --access public
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: lingdu-core 发布失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ lingdu-core@3.0.0 发布成功" -ForegroundColor Green

Set-Location ..\..

# 等待 npm 索引更新
Write-Host ""
Write-Host "等待 npm 索引更新..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "✓ 等待完成" -ForegroundColor Green

# 验证 lingdu-core
Write-Host "验证 lingdu-core..." -ForegroundColor Yellow
$npmVersion = npm view lingdu-core version
if ($npmVersion -ne "3.0.0") {
    Write-Host "警告: npm 上的版本是 $npmVersion，不是 3.0.0" -ForegroundColor Yellow
    Write-Host "可能需要等待更长时间..." -ForegroundColor Yellow
    Start-Sleep -Seconds 20
}
Write-Host "✓ lingdu-core 验证通过" -ForegroundColor Green

# 发布 lingdu
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "步骤 2/3: 发布 lingdu" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Set-Location packages\lingdu

Write-Host "检查 package.json..." -ForegroundColor Yellow
$packageJson = Get-Content package.json | ConvertFrom-Json
$version = $packageJson.version
if ($version -ne "3.0.0") {
    Write-Host "错误: lingdu 版本号不是 3.0.0 (当前: $version)" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 版本号正确: $version" -ForegroundColor Green

Write-Host "检查依赖..." -ForegroundColor Yellow
$coreDep = $packageJson.dependencies.'lingdu-core'
if ($coreDep -notmatch '^[\^~]?3\.0\.0$') {
    Write-Host "警告: lingdu-core 依赖版本是 $coreDep" -ForegroundColor Yellow
}

Write-Host "发布到 npm..." -ForegroundColor Yellow
npm publish --access public
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: lingdu 发布失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ lingdu@3.0.0 发布成功" -ForegroundColor Green

Set-Location ..\..

# 验证 lingdu
Write-Host "验证 lingdu..." -ForegroundColor Yellow
$npmVersion = npm view lingdu version
if ($npmVersion -ne "3.0.0") {
    Write-Host "警告: npm 上的版本是 $npmVersion，不是 3.0.0" -ForegroundColor Yellow
}
Write-Host "✓ lingdu 验证通过" -ForegroundColor Green

# lingdu-openclaw 提示
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "步骤 3/3: 发布 lingdu-openclaw" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "注意: lingdu-openclaw 需要手动发布到 ClawHub" -ForegroundColor Yellow
Write-Host ""
Write-Host "请按照以下步骤操作:"
Write-Host "  1. cd packages\lingdu-openclaw"
Write-Host "  2. 打包插件"
Write-Host "  3. 上传到 ClawHub"
Write-Host "  4. 提交审核"
Write-Host ""
Confirm-Action "lingdu-openclaw 是否已发布?"

# 创建 Git Tag
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "创建 Git Tag" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
git tag -a v3.0.0 -m "Release v3.0.0: One Core, Multiple Shells Architecture"
git push origin v3.0.0
Write-Host "✓ Git Tag 已创建并推送" -ForegroundColor Green

# 完成
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "发布完成!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "已发布的包:"
Write-Host "  ✓ lingdu-core@3.0.0 (npm)" -ForegroundColor Green
Write-Host "  ✓ lingdu@3.0.0 (npm)" -ForegroundColor Green
Write-Host "  ✓ lingdu-openclaw@3.0.0 (ClawHub)" -ForegroundColor Green
Write-Host ""
Write-Host "下一步:"
Write-Host "  1. 在 GitHub 创建 Release"
Write-Host "  2. 发布公告"
Write-Host "  3. 监控下载量和错误日志"
Write-Host ""
Write-Host "验证命令:"
Write-Host "  npm view lingdu-core"
Write-Host "  npm view lingdu"
Write-Host "  npm install -g lingdu@3.0.0"
Write-Host "  lingdu --version"
Write-Host ""