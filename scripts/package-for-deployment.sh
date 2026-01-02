#!/bin/bash

################################################################################
# 高空车租赁管理系统 - 生产环境打包脚本
# 用途：构建前端、清理文件、创建部署压缩包
################################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 配置变量
PACKAGE_NAME="gaokongche-deploy-$(date +%Y%m%d-%H%M%S)"
PACKAGE_DIR="dist-package"
BUILD_DIR="dist"

print_step "开始打包生产环境代码"

# 步骤 1: 检查环境
print_step "步骤 1/7: 检查构建环境"

if ! command -v node &> /dev/null; then
    print_error "Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v)
print_info "Node.js 版本: $NODE_VERSION"

if ! command -v npm &> /dev/null; then
    print_error "npm 未安装"
    exit 1
fi

NPM_VERSION=$(npm -v)
print_info "npm 版本: $NPM_VERSION"

# 步骤 2: 清理旧的构建
print_step "步骤 2/7: 清理旧的构建文件"

if [ -d "$BUILD_DIR" ]; then
    print_info "清理旧的 dist 目录"
    rm -rf "$BUILD_DIR"
fi

if [ -d "$PACKAGE_DIR" ]; then
    print_info "清理旧的打包目录"
    rm -rf "$PACKAGE_DIR"
fi

# 步骤 3: 安装依赖（如果需要）
print_step "步骤 3/7: 检查并安装依赖"

if [ ! -d "node_modules" ]; then
    print_info "安装生产依赖..."
    npm install --production
else
    print_info "依赖已存在，跳过安装"
fi

# 步骤 4: 构建前端
print_step "步骤 4/7: 构建前端代码"

print_info "开始构建前端（可能需要几分钟）..."
npm run build

if [ ! -d "$BUILD_DIR" ]; then
    print_error "前端构建失败，dist 目录不存在"
    exit 1
fi

if [ ! -f "$BUILD_DIR/index.html" ]; then
    print_error "前端构建失败，index.html 不存在"
    exit 1
fi

print_info "前端构建成功 ✓"
print_info "构建文件大小: $(du -sh $BUILD_DIR | cut -f1)"

# 步骤 5: 创建打包目录结构
print_step "步骤 5/7: 创建打包目录结构"

mkdir -p "$PACKAGE_DIR"

# 复制前端构建文件
print_info "复制前端构建文件..."
cp -r "$BUILD_DIR" "$PACKAGE_DIR/"

# 复制后端代码
print_info "复制后端代码..."
mkdir -p "$PACKAGE_DIR/server"
cp -r server/* "$PACKAGE_DIR/server/"

# 复制配置文件
print_info "复制配置文件..."
cp package.json "$PACKAGE_DIR/"
cp package-lock.json "$PACKAGE_DIR/" 2>/dev/null || true

# 复制环境变量示例
if [ -f ".env.example" ]; then
    cp .env.example "$PACKAGE_DIR/.env.example"
else
    print_warn ".env.example 不存在，创建默认示例..."
    cat > "$PACKAGE_DIR/.env.example" << 'EOF'
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=gaokongche_user
DB_PASSWORD=your_password
DB_NAME=gaokongche

# JWT 密钥（必须修改为随机字符串，至少32位）
JWT_SECRET=your_very_long_and_secure_random_secret_key_here

# API 端口
API_PORT=3001

# 前端 URL
FRONTEND_URL=http://your-domain.com

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# 环境标识
NODE_ENV=production

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs

# CORS 允许的域名
CORS_ORIGIN=http://your-domain.com,https://your-domain.com
EOF
fi

# 复制 SQL 迁移脚本
print_info "复制数据库迁移脚本..."
if [ -d "sql/mysql" ]; then
    mkdir -p "$PACKAGE_DIR/sql/mysql"
    cp -r sql/mysql/*.sql "$PACKAGE_DIR/sql/mysql/" 2>/dev/null || true
    print_info "已复制 SQL 迁移脚本"
fi

# 复制部署文档
print_info "复制部署文档..."
if [ -d "docs" ]; then
    mkdir -p "$PACKAGE_DIR/docs"
    cp docs/宝塔部署指南.md "$PACKAGE_DIR/docs/" 2>/dev/null || true
    cp docs/宝塔部署-快速参考.md "$PACKAGE_DIR/docs/" 2>/dev/null || true
fi

# 复制部署脚本
print_info "复制部署脚本..."
if [ -d "scripts" ]; then
    mkdir -p "$PACKAGE_DIR/scripts"
    cp scripts/deploy-baota.sh "$PACKAGE_DIR/scripts/" 2>/dev/null || true
    cp scripts/check-deployment.sh "$PACKAGE_DIR/scripts/" 2>/dev/null || true
    chmod +x "$PACKAGE_DIR/scripts"/*.sh 2>/dev/null || true
fi

# 复制 PM2 配置文件
print_info "创建 PM2 配置文件..."
cat > "$PACKAGE_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'gaokongche-api',
    script: './server/index.js',
    cwd: process.cwd(),
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
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

# 创建必要的目录
print_info "创建必要的目录..."
mkdir -p "$PACKAGE_DIR/uploads"
mkdir -p "$PACKAGE_DIR/logs"

# 创建部署说明文件
print_info "创建部署说明文件..."
cat > "$PACKAGE_DIR/README-DEPLOY.md" << 'EOF'
# 高空车租赁管理系统 - 部署包说明

## 📦 包内容

- `dist/` - 前端构建文件
- `server/` - 后端代码
- `sql/mysql/` - 数据库迁移脚本
- `docs/` - 部署文档
- `scripts/` - 部署脚本
- `ecosystem.config.js` - PM2 配置文件
- `.env.example` - 环境变量示例

## 🚀 快速部署

### 1. 解压文件
```bash
tar -xzf gaokongche-deploy-*.tar.gz
cd gaokongche-deploy-*
```

### 2. 配置环境变量
```bash
cp .env.example .env
nano .env  # 编辑数据库和 JWT_SECRET 配置
```

### 3. 安装依赖
```bash
npm install --production
```

### 4. 初始化数据库
```bash
# 执行数据库迁移脚本
mysql -u your_user -p your_database < sql/mysql/000_init_database_baota.sql
mysql -u your_user -p your_database < sql/mysql/200_add_multi_tenant_support_safe.sql
mysql -u your_user -p your_database < sql/mysql/215_create_blacklist_table.sql
mysql -u your_user -p your_database < sql/mysql/217_merge_finance_SUCCESS.sql
mysql -u your_user -p your_database < sql/mysql/221_add_finance_records_fields.sql
```

### 5. 启动服务
```bash
# 使用 PM2 启动
pm2 start ecosystem.config.js
pm2 save
```

### 6. 配置 Nginx
参考 `docs/宝塔部署指南.md` 配置 Nginx 反向代理

## 📖 详细文档

请查看 `docs/宝塔部署指南.md` 获取完整的部署说明。

## 🔧 自动化部署

如果使用宝塔面板，可以运行：
```bash
chmod +x scripts/deploy-baota.sh
./scripts/deploy-baota.sh
```

## ✅ 部署验证

部署完成后运行：
```bash
chmod +x scripts/check-deployment.sh
./scripts/check-deployment.sh
```

## 📞 技术支持

如遇问题，请查看：
- `docs/宝塔部署指南.md` - 完整部署文档
- `docs/宝塔部署-快速参考.md` - 快速参考手册
EOF

# 创建 .gitignore（防止打包时包含不必要的文件）
cat > "$PACKAGE_DIR/.gitignore" << 'EOF'
# 环境变量
.env
.env.local

# 日志
logs/
*.log

# 上传文件
uploads/

# 临时文件
*.tmp
*.temp
.cache

# 数据库备份
*.sql.backup
*.sql.bak
database_backups/
EOF

# 步骤 6: 清理不必要的文件
print_step "步骤 6/7: 清理不必要的文件"

# 删除开发文件
find "$PACKAGE_DIR" -name "*.test.js" -delete 2>/dev/null || true
find "$PACKAGE_DIR" -name "*.spec.js" -delete 2>/dev/null || true
find "$PACKAGE_DIR" -name ".DS_Store" -delete 2>/dev/null || true
find "$PACKAGE_DIR" -name "Thumbs.db" -delete 2>/dev/null || true

# 删除 TypeScript 源文件（只保留编译后的 JS）
find "$PACKAGE_DIR/server" -name "*.ts" -not -path "*/node_modules/*" -delete 2>/dev/null || true
find "$PACKAGE_DIR/server" -name "*.tsx" -not -path "*/node_modules/*" -delete 2>/dev/null || true

# 删除开发依赖的配置文件
rm -f "$PACKAGE_DIR/tsconfig.json" 2>/dev/null || true
rm -f "$PACKAGE_DIR/vite.config.ts" 2>/dev/null || true
rm -f "$PACKAGE_DIR/.eslintrc*" 2>/dev/null || true

print_info "文件清理完成"

# 步骤 7: 创建压缩包
print_step "步骤 7/7: 创建部署压缩包"

# 计算打包大小
PACKAGE_SIZE=$(du -sh "$PACKAGE_DIR" | cut -f1)
print_info "打包目录大小: $PACKAGE_SIZE"

# 创建 tar.gz 压缩包
print_info "创建 tar.gz 压缩包..."
tar -czf "${PACKAGE_NAME}.tar.gz" -C "$(dirname "$PACKAGE_DIR")" "$(basename "$PACKAGE_DIR")"

if [ -f "${PACKAGE_NAME}.tar.gz" ]; then
    ARCHIVE_SIZE=$(du -sh "${PACKAGE_NAME}.tar.gz" | cut -f1)
    print_info "压缩包创建成功: ${PACKAGE_NAME}.tar.gz"
    print_info "压缩包大小: $ARCHIVE_SIZE"
else
    print_error "压缩包创建失败"
    exit 1
fi

# 创建 ZIP 压缩包（可选，用于 Windows）
if command -v zip &> /dev/null; then
    print_info "创建 ZIP 压缩包..."
    zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_DIR" > /dev/null
    if [ -f "${PACKAGE_NAME}.zip" ]; then
        ZIP_SIZE=$(du -sh "${PACKAGE_NAME}.zip" | cut -f1)
        print_info "ZIP 压缩包创建成功: ${PACKAGE_NAME}.zip"
        print_info "ZIP 压缩包大小: $ZIP_SIZE"
    fi
fi

# 生成文件清单
print_info "生成文件清单..."
find "$PACKAGE_DIR" -type f | sort > "${PACKAGE_NAME}-filelist.txt"
FILE_COUNT=$(wc -l < "${PACKAGE_NAME}-filelist.txt")
print_info "打包文件总数: $FILE_COUNT"

# 完成
print_step "打包完成！"

echo ""
print_info "========================================="
print_info "打包结果"
print_info "========================================="
print_info "压缩包名称: ${PACKAGE_NAME}.tar.gz"
print_info "压缩包大小: $ARCHIVE_SIZE"
print_info "文件总数: $FILE_COUNT"
print_info "打包目录: $PACKAGE_DIR"
print_info "========================================="
echo ""
print_info "文件位置:"
print_info "  $(pwd)/${PACKAGE_NAME}.tar.gz"
if [ -f "${PACKAGE_NAME}.zip" ]; then
    print_info "  $(pwd)/${PACKAGE_NAME}.zip"
fi
print_info "  $(pwd)/${PACKAGE_NAME}-filelist.txt"
echo ""
print_info "下一步操作："
print_info "  1. 将压缩包上传到服务器"
print_info "  2. 解压: tar -xzf ${PACKAGE_NAME}.tar.gz"
print_info "  3. 按照 README-DEPLOY.md 进行部署"
echo ""

exit 0

