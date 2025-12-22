#!/bin/bash

# 高空车租赁管理系统 - 快速部署脚本
# 适用于：已安装宝塔面板的CentOS 7+ / Ubuntu 18+服务器
# 使用方法：bash deploy_quick_start.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    print_error "请使用root用户运行此脚本"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════╗"
echo "║     高空车租赁管理系统 - 快速部署脚本                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ==================== 配置信息收集 ====================
print_info "请输入配置信息（按回车使用默认值）"
echo ""

read -p "项目目录 [/www/wwwroot/gaokongche]: " PROJECT_DIR
PROJECT_DIR=${PROJECT_DIR:-/www/wwwroot/gaokongche}

read -p "Web目录 [/www/wwwroot/gaokongche_web]: " WEB_DIR
WEB_DIR=${WEB_DIR:-/www/wwwroot/gaokongche_web}

read -p "数据库名称 [high_altitude_rental_mysql]: " DB_NAME
DB_NAME=${DB_NAME:-high_altitude_rental_mysql}

read -p "数据库用户 [gaokongche]: " DB_USER
DB_USER=${DB_USER:-gaokongche}

read -sp "数据库密码: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    print_error "数据库密码不能为空"
    exit 1
fi

read -p "域名或IP [$(hostname -I | awk '{print $1}')]: " DOMAIN
DOMAIN=${DOMAIN:-$(hostname -I | awk '{print $1}')}

read -p "API端口 [3001]: " API_PORT
API_PORT=${API_PORT:-3001}

read -sp "JWT密钥（至少32个字符）: " JWT_SECRET
echo ""

if [ ${#JWT_SECRET} -lt 32 ]; then
    print_error "JWT密钥长度必须至少32个字符"
    exit 1
fi

echo ""
print_info "配置信息确认："
echo "项目目录: $PROJECT_DIR"
echo "Web目录: $WEB_DIR"
echo "数据库: $DB_NAME"
echo "数据库用户: $DB_USER"
echo "域名: $DOMAIN"
echo "API端口: $API_PORT"
echo ""

read -p "确认以上信息正确吗? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "部署已取消"
    exit 1
fi

# ==================== 检查环境 ====================
print_info "检查系统环境..."

# 检查宝塔面板
if ! command -v bt &> /dev/null; then
    print_warning "未检测到宝塔面板，请先安装宝塔面板"
    echo "安装命令: wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    print_error "未检测到Node.js，请在宝塔面板安装PM2管理器"
    exit 1
fi

# 检查MySQL
if ! command -v mysql &> /dev/null; then
    print_error "未检测到MySQL，请在宝塔面板安装MySQL 8.0"
    exit 1
fi

# 检查Nginx
if ! command -v nginx &> /dev/null; then
    print_error "未检测到Nginx，请在宝塔面板安装Nginx"
    exit 1
fi

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    print_error "未检测到PM2，请在宝塔面板安装PM2管理器"
    exit 1
fi

print_info "环境检查完成 ✓"

# ==================== 创建目录 ====================
print_info "创建项目目录..."

mkdir -p $PROJECT_DIR
mkdir -p $WEB_DIR
mkdir -p $PROJECT_DIR/logs
mkdir -p $PROJECT_DIR/server/uploads

print_info "目录创建完成 ✓"

# ==================== 提示上传代码 ====================
print_warning "请手动上传项目代码到: $PROJECT_DIR"
print_warning "上传完成后按回车继续..."
read

if [ ! -f "$PROJECT_DIR/package.json" ]; then
    print_error "未找到package.json，请确认代码已上传"
    exit 1
fi

# ==================== 创建环境配置 ====================
print_info "创建环境配置文件..."

cat > $PROJECT_DIR/.env << EOF
# 服务器配置
NODE_ENV=production
API_PORT=$API_PORT

# MySQL数据库配置
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=$DB_USER
MYSQL_PASSWORD=$DB_PASSWORD
MYSQL_DB=$DB_NAME

# JWT配置
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# CORS配置
CORS_ORIGIN=http://$DOMAIN

# 日志配置
LOG_LEVEL=info

# 时区配置
CRON_TIMEZONE=Asia/Shanghai
EOF

print_info "环境配置创建完成 ✓"

# ==================== 安装依赖 ====================
print_info "安装项目依赖（这可能需要几分钟）..."

cd $PROJECT_DIR

# 配置npm镜像
npm config set registry https://registry.npmmirror.com

# 安装依赖
npm install

print_info "依赖安装完成 ✓"

# ==================== 构建前端 ====================
print_info "构建前端项目..."

npm run build

if [ ! -d "$PROJECT_DIR/dist" ]; then
    print_error "前端构建失败，未找到dist目录"
    exit 1
fi

# 部署前端文件
rm -rf $WEB_DIR/*
cp -r $PROJECT_DIR/dist/* $WEB_DIR/
chown -R www:www $WEB_DIR

print_info "前端构建完成 ✓"

# ==================== 配置数据库 ====================
print_info "配置数据库..."

# 检查数据库是否存在
DB_EXISTS=$(mysql -u root -p"$DB_PASSWORD" -e "SHOW DATABASES LIKE '$DB_NAME';" | grep "$DB_NAME" > /dev/null; echo "$?")

if [ $DB_EXISTS -ne 0 ]; then
    print_info "创建数据库..."
    mysql -u root -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -u root -p"$DB_PASSWORD" -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    mysql -u root -p"$DB_PASSWORD" -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
    mysql -u root -p"$DB_PASSWORD" -e "FLUSH PRIVILEGES;"
fi

# 导入数据库结构
print_info "导入数据库结构..."

if [ -f "$PROJECT_DIR/sql/mysql/init_gaokongche.sql" ]; then
    mysql -u $DB_USER -p"$DB_PASSWORD" $DB_NAME < $PROJECT_DIR/sql/mysql/init_gaokongche.sql
fi

# 导入其他迁移文件
for file in $PROJECT_DIR/sql/mysql/*.sql; do
    if [ -f "$file" ] && [ "$file" != "$PROJECT_DIR/sql/mysql/init_gaokongche.sql" ]; then
        print_info "导入 $(basename $file)..."
        mysql -u $DB_USER -p"$DB_PASSWORD" $DB_NAME < "$file" 2>/dev/null || true
    fi
done

print_info "数据库配置完成 ✓"

# ==================== 配置PM2 ====================
print_info "配置PM2..."

cat > $PROJECT_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'gaokongche-api',
    script: './server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $API_PORT
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    restart_delay: 4000
  }]
};
EOF

# 停止旧的进程（如果存在）
pm2 delete gaokongche-api 2>/dev/null || true

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_info "PM2配置完成 ✓"

# ==================== 配置Nginx ====================
print_info "配置Nginx..."

NGINX_CONF="/www/server/panel/vhost/nginx/$DOMAIN.conf"

cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    root $WEB_DIR;
    index index.html;
    
    access_log /www/wwwlogs/gaokongche_access.log;
    error_log /www/wwwlogs/gaokongche_error.log;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
    
    location /uploads/ {
        alias $PROJECT_DIR/server/uploads/;
        expires 30d;
    }
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 测试nginx配置
nginx -t

if [ $? -eq 0 ]; then
    nginx -s reload
    print_info "Nginx配置完成 ✓"
else
    print_error "Nginx配置测试失败"
    exit 1
fi

# ==================== 设置权限 ====================
print_info "设置文件权限..."

chown -R www:www $PROJECT_DIR
chown -R www:www $WEB_DIR
chmod -R 755 $PROJECT_DIR
chmod -R 777 $PROJECT_DIR/server/uploads
chmod -R 777 $PROJECT_DIR/logs

print_info "权限设置完成 ✓"

# ==================== 部署完成 ====================
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                 部署完成！                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
print_info "访问地址: http://$DOMAIN"
print_info "管理员账号: admin"
print_info "管理员密码: admin123 (请登录后立即修改)"
echo ""
print_info "服务状态:"
pm2 list
echo ""
print_info "查看日志:"
echo "  pm2 logs gaokongche-api"
echo "  tail -f $PROJECT_DIR/logs/api-error.log"
echo ""
print_info "重启服务:"
echo "  pm2 restart gaokongche-api"
echo ""
print_warning "重要提示:"
echo "  1. 请立即修改默认管理员密码"
echo "  2. 配置SSL证书启用HTTPS"
echo "  3. 配置数据库自动备份"
echo "  4. 检查防火墙和安全组配置"
echo ""
print_info "部署文档: $PROJECT_DIR/DEPLOYMENT_GUIDE.md"
echo ""

