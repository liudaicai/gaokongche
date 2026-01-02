#!/bin/bash

################################################################################
# 高空车租赁管理系统 - 部署检查脚本
# 用于验证部署后系统是否正常运行
################################################################################

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 统计变量
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS_COUNT++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL_COUNT++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN_COUNT++))
}

# 配置变量
PROJECT_DIR=${1:-/www/wwwroot/gaokongche}
API_PORT=${2:-3001}

print_header "高空车租赁管理系统 - 部署检查"

echo "项目目录: $PROJECT_DIR"
echo "API 端口: $API_PORT"
echo ""

# ============================================================================
# 1. 检查目录和文件
# ============================================================================
print_header "1. 检查目录和文件结构"

if [ -d "$PROJECT_DIR" ]; then
    check_pass "项目目录存在"
else
    check_fail "项目目录不存在: $PROJECT_DIR"
    exit 1
fi

cd $PROJECT_DIR

# 检查关键文件
FILES_TO_CHECK=(
    "package.json"
    "server/index.js"
    ".env"
    "dist/index.html"
    "ecosystem.config.js"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        check_pass "文件存在: $file"
    else
        check_fail "文件缺失: $file"
    fi
done

# 检查关键目录
DIRS_TO_CHECK=(
    "server"
    "dist"
    "uploads"
    "logs"
    "sql/mysql"
)

for dir in "${DIRS_TO_CHECK[@]}"; do
    if [ -d "$dir" ]; then
        check_pass "目录存在: $dir"
    else
        check_warn "目录缺失: $dir"
    fi
done

# ============================================================================
# 2. 检查环境配置
# ============================================================================
print_header "2. 检查环境配置"

if [ -f ".env" ]; then
    check_pass ".env 文件存在"
    
    # 检查必要的环境变量
    ENV_VARS=(
        "DB_HOST"
        "DB_USER"
        "DB_PASSWORD"
        "DB_NAME"
        "JWT_SECRET"
        "API_PORT"
    )
    
    for var in "${ENV_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            check_pass "环境变量已配置: $var"
        else
            check_fail "环境变量未配置: $var"
        fi
    done
    
    # 检查 JWT_SECRET 长度
    JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2)
    if [ ${#JWT_SECRET} -ge 32 ]; then
        check_pass "JWT_SECRET 长度符合要求 (>= 32)"
    else
        check_warn "JWT_SECRET 长度不足 32 位，建议更换"
    fi
else
    check_fail ".env 文件不存在"
fi

# ============================================================================
# 3. 检查 Node.js 环境
# ============================================================================
print_header "3. 检查 Node.js 环境"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_pass "Node.js 已安装: $NODE_VERSION"
    
    # 检查版本号
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ $NODE_MAJOR -ge 18 ]; then
        check_pass "Node.js 版本符合要求 (>= 18)"
    else
        check_warn "Node.js 版本偏低，建议升级到 18+"
    fi
else
    check_fail "Node.js 未安装"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_pass "npm 已安装: $NPM_VERSION"
else
    check_fail "npm 未安装"
fi

# 检查 node_modules
if [ -d "node_modules" ]; then
    check_pass "依赖已安装 (node_modules 存在)"
    
    # 检查关键依赖
    KEY_DEPS=("express" "mysql2" "jsonwebtoken" "bcryptjs")
    for dep in "${KEY_DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            check_pass "依赖存在: $dep"
        else
            check_warn "依赖缺失: $dep"
        fi
    done
else
    check_fail "依赖未安装，请运行: npm install"
fi

# ============================================================================
# 4. 检查数据库连接
# ============================================================================
print_header "4. 检查数据库连接"

if command -v mysql &> /dev/null; then
    check_pass "MySQL 客户端已安装"
    
    # 从 .env 读取数据库配置
    if [ -f ".env" ]; then
        DB_HOST=$(grep "^DB_HOST=" .env | cut -d'=' -f2)
        DB_USER=$(grep "^DB_USER=" .env | cut -d'=' -f2)
        DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2)
        DB_NAME=$(grep "^DB_NAME=" .env | cut -d'=' -f2)
        
        # 测试数据库连接
        mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT 1;" &> /dev/null
        if [ $? -eq 0 ]; then
            check_pass "数据库连接成功"
            
            # 检查关键表
            TABLES=("users" "companies" "equipments" "orders" "customers" "finance_records")
            for table in "${TABLES[@]}"; do
                mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES LIKE '$table';" 2>/dev/null | grep -q "$table"
                if [ $? -eq 0 ]; then
                    check_pass "数据表存在: $table"
                else
                    check_warn "数据表不存在: $table"
                fi
            done
        else
            check_fail "数据库连接失败，请检查配置"
        fi
    fi
else
    check_warn "MySQL 客户端未安装"
fi

# ============================================================================
# 5. 检查 PM2 进程
# ============================================================================
print_header "5. 检查 PM2 进程"

if command -v pm2 &> /dev/null; then
    check_pass "PM2 已安装"
    
    # 检查进程状态
    pm2 list | grep -q "gaokongche-api"
    if [ $? -eq 0 ]; then
        check_pass "PM2 进程存在: gaokongche-api"
        
        # 检查进程状态
        STATUS=$(pm2 list | grep "gaokongche-api" | awk '{print $10}')
        if [[ "$STATUS" == *"online"* ]]; then
            check_pass "PM2 进程运行正常"
        else
            check_fail "PM2 进程状态异常: $STATUS"
        fi
        
        # 检查内存使用
        MEMORY=$(pm2 list | grep "gaokongche-api" | awk '{print $8}')
        check_pass "内存使用: $MEMORY"
    else
        check_fail "PM2 进程不存在，请运行: pm2 start ecosystem.config.js"
    fi
else
    check_fail "PM2 未安装，请运行: npm install -g pm2"
fi

# ============================================================================
# 6. 检查后端 API
# ============================================================================
print_header "6. 检查后端 API"

# 检查端口监听
netstat -tuln 2>/dev/null | grep -q ":$API_PORT"
if [ $? -eq 0 ]; then
    check_pass "后端端口监听正常: $API_PORT"
else
    check_fail "后端端口未监听: $API_PORT"
fi

# 测试健康检查接口
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$API_PORT/api/health)
    if [ "$HTTP_CODE" == "200" ]; then
        check_pass "后端健康检查接口正常: /api/health"
    else
        check_fail "后端健康检查接口异常: HTTP $HTTP_CODE"
    fi
    
    # 测试其他关键接口
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$API_PORT/api/auth/login)
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "400" ]; then
        check_pass "登录接口可访问: /api/auth/login"
    else
        check_warn "登录接口异常: HTTP $HTTP_CODE"
    fi
else
    check_warn "curl 未安装，跳过 API 测试"
fi

# ============================================================================
# 7. 检查 Nginx 配置
# ============================================================================
print_header "7. 检查 Nginx 配置"

if command -v nginx &> /dev/null; then
    check_pass "Nginx 已安装"
    
    # 测试配置文件
    nginx -t &> /dev/null
    if [ $? -eq 0 ]; then
        check_pass "Nginx 配置文件正确"
    else
        check_fail "Nginx 配置文件有误"
    fi
    
    # 检查 Nginx 状态
    systemctl is-active nginx &> /dev/null
    if [ $? -eq 0 ]; then
        check_pass "Nginx 服务运行中"
    else
        check_warn "Nginx 服务未运行"
    fi
    
    # 检查配置文件是否存在
    NGINX_CONF_DIRS=(
        "/www/server/panel/vhost/nginx"
        "/etc/nginx/conf.d"
        "/etc/nginx/sites-enabled"
    )
    
    FOUND_CONF=false
    for dir in "${NGINX_CONF_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            ls $dir/*.conf 2>/dev/null | grep -q "gaokongche\|your-domain"
            if [ $? -eq 0 ]; then
                check_pass "Nginx 配置文件已创建"
                FOUND_CONF=true
                break
            fi
        fi
    done
    
    if [ "$FOUND_CONF" = false ]; then
        check_warn "未找到项目 Nginx 配置文件"
    fi
else
    check_fail "Nginx 未安装"
fi

# ============================================================================
# 8. 检查文件权限
# ============================================================================
print_header "8. 检查文件权限"

# 检查关键目录权限
PERM_DIRS=("uploads" "logs" "dist")
for dir in "${PERM_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        OWNER=$(stat -c '%U' "$dir" 2>/dev/null || stat -f '%Su' "$dir" 2>/dev/null)
        if [ "$OWNER" == "www" ] || [ "$OWNER" == "www-data" ]; then
            check_pass "目录权限正确: $dir (owner: $OWNER)"
        else
            check_warn "目录所有者可能不正确: $dir (owner: $OWNER, expected: www)"
        fi
    fi
done

# 检查上传目录是否可写
if [ -w "uploads" ]; then
    check_pass "上传目录可写"
else
    check_fail "上传目录不可写，请执行: chmod 755 uploads && chown www:www uploads"
fi

# ============================================================================
# 9. 检查日志文件
# ============================================================================
print_header "9. 检查日志文件"

if [ -d "logs" ]; then
    # 检查最近的错误日志
    if [ -f "logs/error.log" ]; then
        ERROR_COUNT=$(tail -n 100 logs/error.log 2>/dev/null | wc -l)
        if [ $ERROR_COUNT -gt 0 ]; then
            RECENT_ERRORS=$(tail -n 100 logs/error.log | grep -c "ERROR")
            if [ $RECENT_ERRORS -gt 10 ]; then
                check_warn "最近有较多错误日志 ($RECENT_ERRORS 条)，请检查"
            else
                check_pass "错误日志数量正常 ($RECENT_ERRORS 条)"
            fi
        else
            check_pass "暂无错误日志"
        fi
    fi
    
    # 检查日志大小
    for log in logs/*.log; do
        if [ -f "$log" ]; then
            SIZE=$(du -h "$log" | cut -f1)
            if [[ $SIZE == *G ]]; then
                check_warn "日志文件较大: $log ($SIZE)"
            else
                check_pass "日志文件大小正常: $log ($SIZE)"
            fi
        fi
    done
fi

# ============================================================================
# 10. 系统资源检查
# ============================================================================
print_header "10. 系统资源检查"

# 检查磁盘空间
DISK_USAGE=$(df -h $PROJECT_DIR | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    check_pass "磁盘空间充足 (使用率: ${DISK_USAGE}%)"
else
    check_warn "磁盘空间紧张 (使用率: ${DISK_USAGE}%)"
fi

# 检查内存使用
if command -v free &> /dev/null; then
    MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
    if [ $MEM_USAGE -lt 85 ]; then
        check_pass "内存使用正常 (使用率: ${MEM_USAGE}%)"
    else
        check_warn "内存使用较高 (使用率: ${MEM_USAGE}%)"
    fi
fi

# 检查 CPU 负载
if [ -f /proc/loadavg ]; then
    LOAD_AVG=$(cat /proc/loadavg | awk '{print $1}')
    CPU_COUNT=$(nproc)
    check_pass "系统负载: $LOAD_AVG (CPU 核心数: $CPU_COUNT)"
fi

# ============================================================================
# 总结
# ============================================================================
print_header "检查结果总结"

TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))

echo -e "总计检查项: ${BLUE}$TOTAL${NC}"
echo -e "通过: ${GREEN}$PASS_COUNT${NC}"
echo -e "失败: ${RED}$FAIL_COUNT${NC}"
echo -e "警告: ${YELLOW}$WARN_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ 系统检查通过，部署成功！${NC}"
    echo ""
    echo "访问地址："
    echo "  前端: http://your-domain.com"
    echo "  API:  http://your-domain.com/api"
    echo ""
    echo "默认账号："
    echo "  用户名: admin"
    echo "  密码: admin123"
    echo ""
    exit 0
else
    echo -e "${RED}✗ 系统检查发现 $FAIL_COUNT 个错误，请修复后重试${NC}"
    echo ""
    echo "常见问题排查："
    echo "  1. PM2 进程未启动: pm2 start ecosystem.config.js"
    echo "  2. 数据库连接失败: 检查 .env 中的数据库配置"
    echo "  3. Nginx 未配置: 参考 docs/宝塔部署指南.md"
    echo "  4. 文件权限问题: chown -R www:www $PROJECT_DIR"
    echo ""
    exit 1
fi

