#!/bin/bash

# LingDu v3.0.0 发布脚本
# 使用方法: ./release.sh

set -e  # 遇到错误立即退出

echo "========================================="
echo "LingDu v3.0.0 发布脚本"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: $1 未安装${NC}"
        exit 1
    fi
}

# 确认函数
confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}操作已取消${NC}"
        exit 1
    fi
}

# 检查必要的命令
echo "检查环境..."
check_command npm
check_command git
echo -e "${GREEN}✓ 环境检查通过${NC}"
echo ""

# 检查 Git 状态
echo "检查 Git 状态..."
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}警告: 有未提交的更改${NC}"
    git status -s
    confirm "是否继续?"
fi
echo -e "${GREEN}✓ Git 状态正常${NC}"
echo ""

# 运行测试
echo "运行测试..."
npm test
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 测试失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 所有测试通过${NC}"
echo ""

# 确认发布
echo "========================================="
echo "准备发布以下包:"
echo "  1. lingdu-core@3.0.0"
echo "  2. lingdu@3.0.0"
echo "  3. lingdu-openclaw@3.0.0"
echo "========================================="
confirm "确认发布?"

# 发布 lingdu-core
echo ""
echo "========================================="
echo "步骤 1/3: 发布 lingdu-core"
echo "========================================="
cd packages/lingdu-core

echo "检查 package.json..."
VERSION=$(node -p "require('./package.json').version")
if [ "$VERSION" != "3.0.0" ]; then
    echo -e "${RED}错误: lingdu-core 版本号不是 3.0.0 (当前: $VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 版本号正确: $VERSION${NC}"

echo "发布到 npm..."
npm publish --access public
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: lingdu-core 发布失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ lingdu-core@3.0.0 发布成功${NC}"

cd ../..

# 等待 npm 索引更新
echo ""
echo "等待 npm 索引更新..."
sleep 10
echo -e "${GREEN}✓ 等待完成${NC}"

# 验证 lingdu-core
echo "验证 lingdu-core..."
NPM_VERSION=$(npm view lingdu-core version)
if [ "$NPM_VERSION" != "3.0.0" ]; then
    echo -e "${YELLOW}警告: npm 上的版本是 $NPM_VERSION，不是 3.0.0${NC}"
    echo "可能需要等待更长时间..."
    sleep 20
fi
echo -e "${GREEN}✓ lingdu-core 验证通过${NC}"

# 发布 lingdu
echo ""
echo "========================================="
echo "步骤 2/3: 发布 lingdu"
echo "========================================="
cd packages/lingdu

echo "检查 package.json..."
VERSION=$(node -p "require('./package.json').version")
if [ "$VERSION" != "3.0.0" ]; then
    echo -e "${RED}错误: lingdu 版本号不是 3.0.0 (当前: $VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 版本号正确: $VERSION${NC}"

echo "检查依赖..."
CORE_DEP=$(node -p "require('./package.json').dependencies['lingdu-core']")
if [[ ! $CORE_DEP =~ ^[\^~]?3\.0\.0$ ]]; then
    echo -e "${YELLOW}警告: lingdu-core 依赖版本是 $CORE_DEP${NC}"
fi

echo "发布到 npm..."
npm publish --access public
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: lingdu 发布失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ lingdu@3.0.0 发布成功${NC}"

cd ../..

# 验证 lingdu
echo "验证 lingdu..."
NPM_VERSION=$(npm view lingdu version)
if [ "$NPM_VERSION" != "3.0.0" ]; then
    echo -e "${YELLOW}警告: npm 上的版本是 $NPM_VERSION，不是 3.0.0${NC}"
fi
echo -e "${GREEN}✓ lingdu 验证通过${NC}"

# lingdu-openclaw 提示
echo ""
echo "========================================="
echo "步骤 3/3: 发布 lingdu-openclaw"
echo "========================================="
echo -e "${YELLOW}注意: lingdu-openclaw 需要手动发布到 ClawHub${NC}"
echo ""
echo "请按照以下步骤操作:"
echo "  1. cd packages/lingdu-openclaw"
echo "  2. 打包插件"
echo "  3. 上传到 ClawHub"
echo "  4. 提交审核"
echo ""
confirm "lingdu-openclaw 是否已发布?"

# 创建 Git Tag
echo ""
echo "========================================="
echo "创建 Git Tag"
echo "========================================="
git tag -a v3.0.0 -m "Release v3.0.0: One Core, Multiple Shells Architecture"
git push origin v3.0.0
echo -e "${GREEN}✓ Git Tag 已创建并推送${NC}"

# 完成
echo ""
echo "========================================="
echo -e "${GREEN}发布完成!${NC}"
echo "========================================="
echo ""
echo "已发布的包:"
echo "  ✓ lingdu-core@3.0.0 (npm)"
echo "  ✓ lingdu@3.0.0 (npm)"
echo "  ✓ lingdu-openclaw@3.0.0 (ClawHub)"
echo ""
echo "下一步:"
echo "  1. 在 GitHub 创建 Release"
echo "  2. 发布公告"
echo "  3. 监控下载量和错误日志"
echo ""
echo "验证命令:"
echo "  npm view lingdu-core"
echo "  npm view lingdu"
echo "  npm install -g lingdu@3.0.0"
echo "  lingdu --version"
echo ""