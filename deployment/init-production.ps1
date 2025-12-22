# ============================================
# 高空车租赁管理系统 - 生产环境初始化脚本 (Windows)
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  高空车租赁管理系统 - 生产环境初始化" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查环境
Write-Host "📋 步骤 1/7: 检查环境..." -ForegroundColor Yellow
Write-Host ""

# 检查Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装Node.js" -ForegroundColor Red
    Write-Host "请先安装Node.js: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 检查MySQL
try {
    $mysqlVersion = mysql --version
    Write-Host "✅ MySQL已安装" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装MySQL" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. 安装依赖
Write-Host "📦 步骤 2/7: 安装依赖包..." -ForegroundColor Yellow
npm install --production
Write-Host "✅ 依赖安装完成" -ForegroundColor Green
Write-Host ""

# 3. 配置环境变量
Write-Host "⚙️  步骤 3/7: 配置环境变量..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env文件不存在，正在创建..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    
    # 生成随机JWT密钥
    $jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    
    # 替换JWT_SECRET
    (Get-Content ".env") -replace "CHANGE_THIS_TO_A_VERY_LONG_RANDOM_SECRET_KEY_AT_LEAST_32_CHARACTERS", $jwtSecret | Set-Content ".env"
    
    Write-Host "✅ .env文件已创建" -ForegroundColor Green
    Write-Host "⚠️  请手动编辑 .env 文件，配置MySQL密码" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env文件已存在" -ForegroundColor Green
}
Write-Host ""

# 4. 数据库初始化
Write-Host "💾 步骤 4/7: 初始化数据库..." -ForegroundColor Yellow
$mysqlPassword = Read-Host "请输入MySQL root密码" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysqlPassword)
$mysqlPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# 测试MySQL连接
$testQuery = "SELECT 1;" | mysql -u root -p"$mysqlPasswordPlain" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ MySQL连接失败，请检查密码" -ForegroundColor Red
    exit 1
}

Write-Host "创建数据库和表结构..." -ForegroundColor Cyan
Get-Content "deployment\sql\01_database_schema.sql" | mysql -u root -p"$mysqlPasswordPlain"
Write-Host "✅ 数据库结构已创建" -ForegroundColor Green

Write-Host "创建管理员账户..." -ForegroundColor Cyan
Get-Content "deployment\sql\02_create_admin_user.sql" | mysql -u root -p"$mysqlPasswordPlain"
Write-Host "✅ 管理员账户已创建" -ForegroundColor Green
Write-Host ""

# 5. 验证数据库
Write-Host "🔍 步骤 5/7: 验证数据库..." -ForegroundColor Yellow
$tableCount = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='gaokongche';" | mysql -u root -p"$mysqlPasswordPlain" -s -N
Write-Host "数据库表数量: $tableCount"

if ([int]$tableCount -lt 30) {
    Write-Host "❌ 表数量异常（应该有40+个表）" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 数据库验证通过" -ForegroundColor Green
Write-Host ""

# 6. 构建前端
Write-Host "🏗️  步骤 6/7: 构建前端..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 前端构建完成" -ForegroundColor Green
Write-Host ""

# 7. 完成
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ 系统初始化完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 默认管理员账户：" -ForegroundColor Yellow
Write-Host "   用户名: admin"
Write-Host "   密码: admin123"
Write-Host ""
Write-Host "⚠️  重要：首次登录后立即修改密码！" -ForegroundColor Red
Write-Host ""
Write-Host "🚀 启动服务：" -ForegroundColor Yellow
Write-Host "   后端: npm run api"
Write-Host "   前端（开发）: npm run dev"
Write-Host "   前端（生产）: 使用IIS或Nginx托管 dist\ 目录"
Write-Host ""
Write-Host "📚 详细文档：" -ForegroundColor Yellow
Write-Host "   deployment\PRODUCTION_DEPLOYMENT_GUIDE.md"
Write-Host "   deployment\SECURITY_CHECKLIST.md"
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
