#!/bin/bash

################################################################################
# 高空车租赁管理系统 - 宝塔自动部署脚本
# 使用前请确保：
# 1. 已安装宝塔面板
# 2. 已安装 Node.js 18+, MySQL 8.0+, Nginx
# 3. 已创建数据库和用户
################################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "\n${GREEN}===================================================${NC}"
    echo -e "${GREEN}  $1${NC}"
    echo -e "${GREEN}===================================================${NC}\n"
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    print_error "请使用 root 用户运行此脚本"
    exit 1
fi

print_step "开始部署高空车租赁管理系统"

# 配置变量（请根据实际情况修改）
read -p "请输入项目部署目录 [默认: /www/wwwroot/gaokongche]: " PROJECT_DIR
PROJECT_DIR=${PROJECT_DIR:-/www/wwwroot/gaokongche}

read -p "请输入数据库名称 [默认: gaokongche]: " DB_NAME
DB_NAME=${DB_NAME:-gaokongche}

read -p "请输入数据库用户名 [默认: gaokongche_user]: " DB_USER
DB_USER=${DB_USER:-gaokongche_user}

read -sp "请输入数据库密码: " DB_PASSWORD
echo

read -p "请输入后端 API 端口 [默认: 3001]: " API_PORT
API_PORT=${API_PORT:-3001}

read -p "请输入域名或 IP 地址: " DOMAIN

# 步骤 1: 检查依赖
print_step "步骤 1/10: 检查系统依赖"

check_command() {
    if command -v $1 &> /dev/null; then
        print_info "$1 已安装 ✓"
        return 0
    else
        print_error "$1 未安装 ✗"
        return 1
    fi
}

check_command node || { print_error "请先安装 Node.js 18+"; exit 1; }
check_command npm || { print_error "请先安装 npm"; exit 1; }
check_command mysql || { print_error "请先安装 MySQL 8.0+"; exit 1; }
check_command nginx || { print_error "请先安装 Nginx"; exit 1; }
check_command pm2 || { print_warn "PM2 未安装，正在安装..."; npm install -g pm2; }
check_command git || { print_warn "Git 未安装，正在安装..."; yum install -y git || apt install -y git; }

# 步骤 2: 创建项目目录
print_step "步骤 2/10: 准备项目目录"

if [ -d "$PROJECT_DIR" ]; then
    print_warn "目录已存在，备份到 ${PROJECT_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    mv $PROJECT_DIR ${PROJECT_DIR}.backup.$(date +%Y%m%d_%H%M%S)
fi

mkdir -p $PROJECT_DIR
cd $(dirname $PROJECT_DIR)

# 步骤 3: 克隆代码
print_step "步骤 3/10: 克隆项目代码"

if [ -d ".git" ]; then
    print_info "检测到 Git 仓库，拉取最新代码"
    cd $PROJECT_DIR
    git pull origin main
else
    print_info "从 GitHub 克隆代码"
    git clone https://github.com/liudaicai/gaokongche.git $PROJECT_DIR
    cd $PROJECT_DIR
fi

# 步骤 4: 安装依赖
print_step "步骤 4/10: 安装项目依赖"

print_info "配置 npm 镜像源（使用阿里云镜像）"
npm config set registry https://registry.npmmirror.com

print_info "安装生产环境依赖"
npm install --production

# 步骤 5: 配置环境变量
print_step "步骤 5/10: 配置环境变量"

if [ -f ".env" ]; then
    print_warn ".env 文件已存在，备份到 .env.backup"
    mv .env .env.backup
fi

print_info "生成 JWT_SECRET"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

print_info "创建 .env 文件"
cat > .env << EOF
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT 密钥
JWT_SECRET=$JWT_SECRET

# API 端口
API_PORT=$API_PORT

# 前端 URL
FRONTEND_URL=http://$DOMAIN

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# 环境标识
NODE_ENV=production

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs

# CORS 允许的域名
CORS_ORIGIN=http://$DOMAIN,https://$DOMAIN
EOF

print_info ".env 文件创建成功 ✓"

# 步骤 6: 数据库初始化
print_step "步骤 6/10: 初始化数据库"

print_info "测试数据库连接"
mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_info "数据库连接成功 ✓"
else
    print_error "数据库连接失败，请检查配置"
    exit 1
fi

read -p "是否执行数据库迁移脚本？(y/n) [y]: " RUN_MIGRATION
RUN_MIGRATION=${RUN_MIGRATION:-y}

if [ "$RUN_MIGRATION" = "y" ]; then
    print_info "执行数据库迁移脚本"
    cd sql/mysql
    
    # 执行核心迁移脚本
    CORE_SCRIPTS=(
        "200_add_multi_tenant_support_safe.sql"
        "215_create_blacklist_table.sql"
        "217_merge_finance_SUCCESS.sql"
        "221_add_finance_records_fields.sql"
    )
    
    for script in "${CORE_SCRIPTS[@]}"; do
        if [ -f "$script" ]; then
            print_info "执行 $script"
            mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME < $script
            if [ $? -eq 0 ]; then
                print_info "$script 执行成功 ✓"
            else
                print_warn "$script 执行失败，继续下一个"
            fi
        fi
    done
    
    cd ../..
fi

# 步骤 7: 创建必要目录
print_step "步骤 7/10: 创建必要目录"

mkdir -p uploads logs
chmod -R 755 uploads logs
chown -R www:www uploads logs

print_info "目录创建成功 ✓"

# 步骤 8: 构建前端
print_step "步骤 8/10: 构建前端"

print_info "开始构建前端（可能需要几分钟）"
npm run build

if [ -d "dist" ]; then
    print_info "前端构建成功 ✓"
    chmod -R 755 dist
    chown -R www:www dist
else
    print_error "前端构建失败"
    exit 1
fi

# 步骤 9: 配置 PM2
print_step "步骤 9/10: 配置 PM2 管理后端"

print_info "创建 PM2 配置文件"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'gaokongche-api',
    script: './server/index.js',
    cwd: '$PROJECT_DIR',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $API_PORT
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    watch: false
  }]
};
EOF

print_info "停止旧的 PM2 进程（如果存在）"
pm2 delete gaokongche-api 2>/dev/null || true

print_info "启动后端服务"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

sleep 3

print_info "检查后端服务状态"
pm2 status gaokongche-api

# 测试后端 API
print_info "测试后端 API"
sleep 2
curl -s http://localhost:$API_PORT/api/health > /dev/null
if [ $? -eq 0 ]; then
    print_info "后端 API 运行正常 ✓"
else
    print_warn "后端 API 测试失败，请检查日志"
fi

# 步骤 10: 配置 Nginx
print_step "步骤 10/10: 配置 Nginx"

NGINX_CONF="/www/server/panel/vhost/nginx/${DOMAIN}.conf"

print_info "创建 Nginx 配置文件: $NGINX_CONF"
cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    root $PROJECT_DIR/dist;
    index index.html;
    
    access_log /www/wwwlogs/gaokongche_access.log;
    error_log /www/wwwlogs/gaokongche_error.log;
    
    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_vary on;
    gzip_min_length 1024;
    
    # API 反向代理
    location /api {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
    }
    
    # 上传文件
    location /uploads {
        alias $PROJECT_DIR/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA 路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # 安全设置
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    server_tokens off;
}
EOF

print_info "测试 Nginx 配置"
nginx -t

if [ $? -eq 0 ]; then
    print_info "Nginx 配置正确 ✓"
    print_info "重载 Nginx"
    nginx -s reload
    print_info "Nginx 重载成功 ✓"
else
    print_error "Nginx 配置测试失败"
    exit 1
fi

# 设置文件权限
print_info "设置文件权限"
chown -R www:www $PROJECT_DIR
chmod -R 755 $PROJECT_DIR

# 完成
print_step "部署完成！"

echo ""
print_info "========================================="
print_info "部署信息汇总："
print_info "========================================="
print_info "项目目录: $PROJECT_DIR"
print_info "前端地址: http://$DOMAIN"
print_info "后端地址: http://$DOMAIN/api"
print_info "后端端口: $API_PORT"
print_info "数据库名: $DB_NAME"
print_info "========================================="
echo ""
print_info "默认管理员账号："
print_info "用户名: admin"
print_info "密码: admin123"
print_warn "请登录后立即修改密码！"
echo ""
print_info "常用命令："
print_info "  查看后端状态: pm2 status gaokongche-api"
print_info "  查看后端日志: pm2 logs gaokongche-api"
print_info "  重启后端: pm2 restart gaokongche-api"
print_info "  重载 Nginx: nginx -s reload"
echo ""
print_info "详细文档请查看: $PROJECT_DIR/docs/宝塔部署指南.md"
echo ""

read -p "是否立即打开浏览器访问？(y/n) [n]: " OPEN_BROWSER
if [ "$OPEN_BROWSER" = "y" ]; then
    print_info "尝试打开浏览器..."
    xdg-open "http://$DOMAIN" 2>/dev/null || open "http://$DOMAIN" 2>/dev/null || print_warn "请手动打开浏览器访问 http://$DOMAIN"
fi

print_info "部署脚本执行完毕！"
print_info "如有问题，请查看日志文件："
print_info "  - $PROJECT_DIR/logs/combined.log"
print_info "  - $PROJECT_DIR/logs/error.log"
print_info "  - /www/wwwlogs/gaokongche_error.log"

exit 0

