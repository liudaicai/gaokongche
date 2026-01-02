# 高空车租赁管理系统 - 生产环境打包脚本 (Windows PowerShell)
# 用途：构建前端、清理文件、创建部署压缩包

$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "  $Message" -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host ""
}

# 获取项目根目录
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# 配置变量
$PackageName = "gaokongche-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$PackageDir = "dist-package"
$BuildDir = "dist"

Write-Step "开始打包生产环境代码"

# 步骤 1: 检查环境
Write-Step "步骤 1/7: 检查构建环境"

try {
    $NodeVersion = node -v
    Write-Info "Node.js 版本: $NodeVersion"
} catch {
    Write-Error "Node.js 未安装，请先安装 Node.js 18+"
    exit 1
}

try {
    $NpmVersion = npm -v
    Write-Info "npm 版本: $NpmVersion"
} catch {
    Write-Error "npm 未安装"
    exit 1
}

# 步骤 2: 清理旧的构建
Write-Step "步骤 2/7: 清理旧的构建文件"

if (Test-Path $BuildDir) {
    Write-Info "清理旧的 dist 目录"
    Remove-Item -Recurse -Force $BuildDir
}

if (Test-Path $PackageDir) {
    Write-Info "清理旧的打包目录"
    Remove-Item -Recurse -Force $PackageDir
}

# 步骤 3: 安装依赖（如果需要）
Write-Step "步骤 3/7: 检查并安装依赖"

if (-not (Test-Path "node_modules")) {
    Write-Info "安装生产依赖..."
    npm install --production
} else {
    Write-Info "依赖已存在，跳过安装"
}

# 步骤 4: 构建前端
Write-Step "步骤 4/7: 构建前端代码"

Write-Info "开始构建前端（可能需要几分钟）..."
npm run build

if (-not (Test-Path $BuildDir)) {
    Write-Error "前端构建失败，dist 目录不存在"
    exit 1
}

if (-not (Test-Path "$BuildDir/index.html")) {
    Write-Error "前端构建失败，index.html 不存在"
    exit 1
}

Write-Info "前端构建成功 ✓"
$BuildSize = (Get-ChildItem $BuildDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Info "构建文件大小: $([math]::Round($BuildSize, 2)) MB"

# 步骤 5: 创建打包目录结构
Write-Step "步骤 5/7: 创建打包目录结构"

New-Item -ItemType Directory -Force -Path $PackageDir | Out-Null

# 复制前端构建文件
Write-Info "复制前端构建文件..."
Copy-Item -Recurse "$BuildDir\*" "$PackageDir\dist\" -Force

# 复制后端代码
Write-Info "复制后端代码..."
New-Item -ItemType Directory -Force -Path "$PackageDir\server" | Out-Null
Copy-Item -Recurse "server\*" "$PackageDir\server\" -Force

# 复制配置文件
Write-Info "复制配置文件..."
Copy-Item "package.json" "$PackageDir\" -Force
if (Test-Path "package-lock.json") {
    Copy-Item "package-lock.json" "$PackageDir\" -Force
}

# 复制环境变量示例
if (Test-Path ".env.example") {
    Copy-Item ".env.example" "$PackageDir\.env.example" -Force
} else {
    Write-Warn ".env.example 不存在，创建默认示例..."
    @"
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
"@ | Out-File -FilePath "$PackageDir\.env.example" -Encoding UTF8
}

# 复制 SQL 迁移脚本
Write-Info "复制数据库迁移脚本..."
if (Test-Path "sql\mysql") {
    New-Item -ItemType Directory -Force -Path "$PackageDir\sql\mysql" | Out-Null
    Get-ChildItem "sql\mysql\*.sql" | Copy-Item -Destination "$PackageDir\sql\mysql\" -Force
    Write-Info "已复制 SQL 迁移脚本"
}

# 复制部署文档
Write-Info "复制部署文档..."
if (Test-Path "docs") {
    New-Item -ItemType Directory -Force -Path "$PackageDir\docs" | Out-Null
    if (Test-Path "docs\宝塔部署指南.md") {
        Copy-Item "docs\宝塔部署指南.md" "$PackageDir\docs\" -Force
    }
    if (Test-Path "docs\宝塔部署-快速参考.md") {
        Copy-Item "docs\宝塔部署-快速参考.md" "$PackageDir\docs\" -Force
    }
}

# 复制部署脚本
Write-Info "复制部署脚本..."
if (Test-Path "scripts") {
    New-Item -ItemType Directory -Force -Path "$PackageDir\scripts" | Out-Null
    if (Test-Path "scripts\deploy-baota.sh") {
        Copy-Item "scripts\deploy-baota.sh" "$PackageDir\scripts\" -Force
    }
    if (Test-Path "scripts\check-deployment.sh") {
        Copy-Item "scripts\check-deployment.sh" "$PackageDir\scripts\" -Force
    }
}

# 创建 PM2 配置文件
Write-Info "创建 PM2 配置文件..."
@"
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
"@ | Out-File -FilePath "$PackageDir\ecosystem.config.js" -Encoding UTF8

# 创建必要的目录
Write-Info "创建必要的目录..."
New-Item -ItemType Directory -Force -Path "$PackageDir\uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "$PackageDir\logs" | Out-Null

# 创建部署说明文件
Write-Info "创建部署说明文件..."
@"
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
\`\`\`bash
tar -xzf gaokongche-deploy-*.tar.gz
cd gaokongche-deploy-*
\`\`\`

### 2. 配置环境变量
\`\`\`bash
cp .env.example .env
nano .env  # 编辑数据库和 JWT_SECRET 配置
\`\`\`

### 3. 安装依赖
\`\`\`bash
npm install --production
\`\`\`

### 4. 初始化数据库
\`\`\`bash
# 执行数据库迁移脚本
mysql -u your_user -p your_database < sql/mysql/000_init_database_baota.sql
mysql -u your_user -p your_database < sql/mysql/200_add_multi_tenant_support_safe.sql
mysql -u your_user -p your_database < sql/mysql/215_create_blacklist_table.sql
mysql -u your_user -p your_database < sql/mysql/217_merge_finance_SUCCESS.sql
mysql -u your_user -p your_database < sql/mysql/221_add_finance_records_fields.sql
\`\`\`

### 5. 启动服务
\`\`\`bash
# 使用 PM2 启动
pm2 start ecosystem.config.js
pm2 save
\`\`\`

### 6. 配置 Nginx
参考 `docs/宝塔部署指南.md` 配置 Nginx 反向代理

## 📖 详细文档

请查看 `docs/宝塔部署指南.md` 获取完整的部署说明。

## 🔧 自动化部署

如果使用宝塔面板，可以运行：
\`\`\`bash
chmod +x scripts/deploy-baota.sh
./scripts/deploy-baota.sh
\`\`\`

## ✅ 部署验证

部署完成后运行：
\`\`\`bash
chmod +x scripts/check-deployment.sh
./scripts/check-deployment.sh
\`\`\`

## 📞 技术支持

如遇问题，请查看：
- `docs/宝塔部署指南.md` - 完整部署文档
- `docs/宝塔部署-快速参考.md` - 快速参考手册
"@ | Out-File -FilePath "$PackageDir\README-DEPLOY.md" -Encoding UTF8

# 创建 .gitignore
@"
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
"@ | Out-File -FilePath "$PackageDir\.gitignore" -Encoding UTF8

# 步骤 6: 清理不必要的文件
Write-Step "步骤 6/7: 清理不必要的文件"

# 删除开发文件
Get-ChildItem -Path $PackageDir -Recurse -Include "*.test.js", "*.spec.js", ".DS_Store", "Thumbs.db" | Remove-Item -Force -ErrorAction SilentlyContinue

# 删除 TypeScript 源文件（只保留编译后的 JS）
Get-ChildItem -Path "$PackageDir\server" -Recurse -Include "*.ts", "*.tsx" | Where-Object { $_.FullName -notmatch "node_modules" } | Remove-Item -Force -ErrorAction SilentlyContinue

# 删除开发依赖的配置文件
$DevConfigFiles = @("tsconfig.json", "vite.config.ts", ".eslintrc*")
foreach ($file in $DevConfigFiles) {
    if (Test-Path "$PackageDir\$file") {
        Remove-Item "$PackageDir\$file" -Force -ErrorAction SilentlyContinue
    }
}

Write-Info "文件清理完成"

# 步骤 7: 创建压缩包
Write-Step "步骤 7/7: 创建部署压缩包"

# 计算打包大小
$PackageSize = (Get-ChildItem $PackageDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Info "打包目录大小: $([math]::Round($PackageSize, 2)) MB"

# 创建 ZIP 压缩包
Write-Info "创建 ZIP 压缩包..."
$ZipFile = "$PackageName.zip"
Compress-Archive -Path $PackageDir -DestinationPath $ZipFile -Force

if (Test-Path $ZipFile) {
    $ZipSize = (Get-Item $ZipFile).Length / 1MB
    Write-Info "ZIP 压缩包创建成功: $ZipFile"
    Write-Info "ZIP 压缩包大小: $([math]::Round($ZipSize, 2)) MB"
} else {
    Write-Error "ZIP 压缩包创建失败"
    exit 1
}

# 生成文件清单
Write-Info "生成文件清单..."
$FileList = Get-ChildItem -Path $PackageDir -Recurse -File | Select-Object -ExpandProperty FullName | ForEach-Object { $_.Replace("$PWD\$PackageDir\", "") }
$FileList | Sort-Object | Out-File -FilePath "$PackageName-filelist.txt" -Encoding UTF8
$FileCount = ($FileList | Measure-Object).Count
Write-Info "打包文件总数: $FileCount"

# 完成
Write-Step "打包完成！"

Write-Host ""
Write-Info "========================================="
Write-Info "打包结果"
Write-Info "========================================="
Write-Info "压缩包名称: $ZipFile"
Write-Info "压缩包大小: $([math]::Round($ZipSize, 2)) MB"
Write-Info "文件总数: $FileCount"
Write-Info "打包目录: $PackageDir"
Write-Info "========================================="
Write-Host ""
Write-Info "文件位置:"
Write-Info "  $PWD\$ZipFile"
Write-Info "  $PWD\$PackageName-filelist.txt"
Write-Host ""
Write-Info "下一步操作："
Write-Info "  1. 将压缩包上传到服务器"
Write-Info "  2. 解压: unzip $ZipFile 或使用解压工具"
Write-Info "  3. 按照 README-DEPLOY.md 进行部署"
Write-Host ""

