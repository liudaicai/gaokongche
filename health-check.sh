#!/bin/bash

###############################################################################
# 系统健康检查脚本
# 用于部署后快速验证系统是否正常运行
###############################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 计数器
PASS=0
FAIL=0

echo -e "${BLUE}"
echo "========================================"
echo "  高空车租赁系统 - 健康检查"
echo "========================================"
echo -e "${NC}"

# 检查函数
check() {
    local name=$1
    local command=$2
    
    echo -n "检查 $name... "
    
    if eval $command > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 通过${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        ((FAIL++))
        return 1
    fi
}

# 检查端口
check_port() {
    local name=$1
    local port=$2
    
    echo -n "检查 $name (端口 $port)... "
    
    if netstat -tuln | grep -q ":$port "; then
        echo -e "${GREEN}✓ 监听中${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗ 未监听${NC}"
        ((FAIL++))
        return 1
    fi
}

# 检查HTTP响应
check_http() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "检查 $name... "
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✓ 响应 $response${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗ 响应 $response (期望 $expected)${NC}"
        ((FAIL++))
        return 1
    fi
}

echo -e "${YELLOW}[系统环境检查]${NC}"
check "Node.js" "command -v node"
check "npm" "command -v npm"
check "PM2" "command -v pm2"
check "MySQL" "command -v mysql"
check "Nginx" "command -v nginx"

echo ""
echo -e "${YELLOW}[项目文件检查]${NC}"
check "项目目录" "test -d /www/wwwroot/gaokongche"
check ".env配置" "test -f /www/wwwroot/gaokongche/.env"
check "前端构建产物" "test -d /www/wwwroot/gaokongche/dist"
check "后端入口文件" "test -f /www/wwwroot/gaokongche/server/index.js"
check "node_modules" "test -d /www/wwwroot/gaokongche/node_modules"

echo ""
echo -e "${YELLOW}[服务状态检查]${NC}"
check "PM2进程" "pm2 list | grep -q 'gaokongche-api'"
check "Nginx服务" "systemctl is-active nginx"
check "MySQL服务" "systemctl is-active mysql || systemctl is-active mysqld"

echo ""
echo -e "${YELLOW}[端口监听检查]${NC}"
check_port "后端API" "3001"
check_port "Nginx HTTP" "80"

echo ""
echo -e "${YELLOW}[API接口检查]${NC}"

# 检查后端健康接口（如果有的话）
if curl -s http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    check_http "后端健康检查" "http://127.0.0.1:3001/api/health" "200"
fi

# 检查前端页面
if [ -n "$(netstat -tuln | grep ':80 ')" ]; then
    check_http "前端首页" "http://127.0.0.1/" "200"
fi

echo ""
echo -e "${YELLOW}[数据库连接检查]${NC}"

# 尝试从.env读取数据库配置
if [ -f "/www/wwwroot/gaokongche/.env" ]; then
    DB_NAME=$(grep "^MYSQL_DB=" /www/wwwroot/gaokongche/.env | cut -d '=' -f2)
    DB_USER=$(grep "^MYSQL_USER=" /www/wwwroot/gaokongche/.env | cut -d '=' -f2)
    
    echo -n "检查数据库连接... "
    if mysql -u"$DB_USER" -e "USE $DB_NAME; SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 连接成功${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ 连接失败${NC}"
        echo -e "${YELLOW}  提示: 请在.env中配置正确的数据库密码${NC}"
        ((FAIL++))
    fi
fi

echo ""
echo -e "${YELLOW}[日志检查]${NC}"

# 检查PM2日志
if pm2 list | grep -q 'gaokongche-api'; then
    echo "最近的PM2错误日志:"
    pm2 logs gaokongche-api --err --lines 5 --nostream 2>/dev/null || echo "  无错误日志"
fi

echo ""
echo -e "${YELLOW}[磁盘空间检查]${NC}"
df -h /www | tail -n 1

echo ""
echo "========================================"
echo -e "检查完成: ${GREEN}通过 $PASS${NC} / ${RED}失败 $FAIL${NC}"
echo "========================================"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ 系统运行正常！${NC}"
    exit 0
else
    echo -e "${RED}✗ 发现 $FAIL 个问题，请检查上述失败项${NC}"
    echo ""
    echo "常见问题排查："
    echo "1. 如果后端API端口未监听，执行: pm2 restart gaokongche-api"
    echo "2. 如果Nginx未运行，执行: systemctl start nginx"
    echo "3. 如果数据库连接失败，检查.env中的数据库配置"
    echo "4. 查看详细日志: pm2 logs gaokongche-api"
    exit 1
fi
