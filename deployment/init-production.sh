#!/bin/bash
# ============================================
# 高空车租赁管理系统 - 生产环境初始化脚本
# ============================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  高空车租赁管理系统 - 生产环境初始化"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查环境
echo "📋 步骤 1/7: 检查环境..."
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未安装Node.js${NC}"
    echo "请先安装Node.js: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# 检查MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ 未安装MySQL${NC}"
    echo "请先安装MySQL"
    exit 1
fi
echo -e "${GREEN}✅ MySQL已安装${NC}"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ 未安装npm${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm已安装${NC}"
echo ""

# 2. 安装依赖
echo "📦 步骤 2/7: 安装依赖包..."
npm install --production
echo -e "${GREEN}✅ 依赖安装完成${NC}"
echo ""

# 3. 配置环境变量
echo "⚙️  步骤 3/7: 配置环境变量..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env文件不存在，正在创建...${NC}"
    cp .env.example .env
    
    # 生成随机JWT密钥
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # 替换JWT_SECRET
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/CHANGE_THIS_TO_A_VERY_LONG_RANDOM_SECRET_KEY_AT_LEAST_32_CHARACTERS/$JWT_SECRET/g" .env
    else
        # Linux
        sed -i "s/CHANGE_THIS_TO_A_VERY_LONG_RANDOM_SECRET_KEY_AT_LEAST_32_CHARACTERS/$JWT_SECRET/g" .env
    fi
    
    echo -e "${GREEN}✅ .env文件已创建${NC}"
    echo -e "${YELLOW}⚠️  请手动编辑 .env 文件，配置MySQL密码${NC}"
else
    echo -e "${GREEN}✅ .env文件已存在${NC}"
fi
echo ""

# 4. 数据库初始化
echo "💾 步骤 4/7: 初始化数据库..."
echo -e "${YELLOW}请输入MySQL root密码：${NC}"
read -s MYSQL_ROOT_PASSWORD

# 测试MySQL连接
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1;" &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ MySQL连接失败，请检查密码${NC}"
    exit 1
fi

echo "创建数据库和表结构..."
mysql -u root -p"$MYSQL_ROOT_PASSWORD" < deployment/sql/01_database_schema.sql
echo -e "${GREEN}✅ 数据库结构已创建${NC}"

echo "创建管理员账户..."
mysql -u root -p"$MYSQL_ROOT_PASSWORD" < deployment/sql/02_create_admin_user.sql
echo -e "${GREEN}✅ 管理员账户已创建${NC}"
echo ""

# 5. 验证数据库
echo "🔍 步骤 5/7: 验证数据库..."
TABLE_COUNT=$(mysql -u root -p"$MYSQL_ROOT_PASSWORD" -s -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='gaokongche';")
echo "数据库表数量: $TABLE_COUNT"

if [ "$TABLE_COUNT" -lt 30 ]; then
    echo -e "${RED}❌ 表数量异常（应该有40+个表）${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 数据库验证通过${NC}"
echo ""

# 6. 构建前端
echo "🏗️  步骤 6/7: 构建前端..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 前端构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 前端构建完成${NC}"
echo ""

# 7. 完成
echo "=========================================="
echo -e "${GREEN}✅ 系统初始化完成！${NC}"
echo "=========================================="
echo ""
echo "📝 默认管理员账户："
echo "   用户名: admin"
echo "   密码: admin123"
echo ""
echo -e "${RED}⚠️  重要：首次登录后立即修改密码！${NC}"
echo ""
echo "🚀 启动服务："
echo "   后端: npm run api"
echo "   前端（开发）: npm run dev"
echo "   前端（生产）: 使用Nginx托管 dist/ 目录"
echo ""
echo "📚 详细文档："
echo "   deployment/PRODUCTION_DEPLOYMENT_GUIDE.md"
echo "   deployment/SECURITY_CHECKLIST.md"
echo ""
echo "=========================================="
