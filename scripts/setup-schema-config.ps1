# 配置Schema基准数据库的快捷脚本
# 使用方法：.\scripts\setup-schema-config.ps1

Write-Host "=" * 60
Write-Host "Schema管理 - 配置向导"
Write-Host "=" * 60
Write-Host ""

# 检查 .env 文件
$envFile = ".env"
if (!(Test-Path $envFile)) {
    Write-Host "❌ 未找到 .env 文件" -ForegroundColor Red
    Write-Host "   请先创建 .env 文件" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 找到 .env 文件" -ForegroundColor Green
Write-Host ""

# 检查是否已配置
$content = Get-Content $envFile -Raw
if ($content -match "SCHEMA_MASTER_DB") {
    Write-Host "⚠️  已存在 SCHEMA_MASTER_DB 配置：" -ForegroundColor Yellow
    $currentValue = ($content | Select-String "SCHEMA_MASTER_DB=(.+)" -AllMatches).Matches.Groups[1].Value
    Write-Host "   当前值: $currentValue" -ForegroundColor Cyan
    Write-Host ""
    
    $overwrite = Read-Host "是否覆盖？(y/n)"
    if ($overwrite -ne 'y') {
        Write-Host "已取消" -ForegroundColor Yellow
        exit 0
    }
    
    # 删除旧配置
    $content = $content -replace "(?m)^SCHEMA_MASTER_DB=.*`r?`n", ""
    Set-Content $envFile -Value $content -NoNewline
}

# 列出可用的租户数据库
Write-Host "📊 查找租户数据库..." -ForegroundColor Cyan
try {
    $output = node scripts/list-tenant-databases.mjs 2>&1 | Out-String
    Write-Host $output
} catch {
    Write-Host "⚠️  无法列出租户数据库" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "请选择基准数据库：" -ForegroundColor Yellow
Write-Host "  1. gaokongche_tenant_5 (推荐 - 表最多)" -ForegroundColor Green
Write-Host "  2. gaokongche_tenant_6"
Write-Host "  3. 其他（手动输入）"
Write-Host ""

$choice = Read-Host "选择 (1/2/3)"

$masterDb = switch ($choice) {
    "1" { "gaokongche_tenant_5" }
    "2" { "gaokongche_tenant_6" }
    "3" { 
        Read-Host "请输入数据库名称（如：gaokongche_tenant_1）"
    }
    default { "gaokongche_tenant_5" }
}

Write-Host ""
Write-Host "配置基准数据库为：$masterDb" -ForegroundColor Cyan

# 添加配置
$configLine = "`n# Schema基准数据库`nSCHEMA_MASTER_DB=$masterDb`n"
Add-Content $envFile -Value $configLine

Write-Host "✅ 配置已添加到 .env 文件" -ForegroundColor Green
Write-Host ""

# 测试配置
Write-Host "🧪 测试配置..." -ForegroundColor Cyan
Write-Host ""

$env:SCHEMA_MASTER_DB = $masterDb
$testOutput = node scripts/export-master-schema.mjs 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 测试成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "现在可以直接运行：" -ForegroundColor Yellow
    Write-Host "  npm run schema:export" -ForegroundColor Cyan
    Write-Host "  npm run schema:verify" -ForegroundColor Cyan
} else {
    Write-Host "❌ 测试失败" -ForegroundColor Red
    Write-Host $testOutput
}

Write-Host ""
Write-Host "=" * 60
