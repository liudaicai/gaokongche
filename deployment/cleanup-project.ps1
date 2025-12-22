# 项目清理脚本 - 为部署做准备
# 执行前请先备份！

$rootPath = "d:\kaifa\4"
cd $rootPath

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "项目清理脚本 - 开始执行" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# 统计
$deletedCount = 0
$deletedFiles = @()

# 1. 删除开发过程文档
Write-Host "[1/6] 清理开发过程文档..." -ForegroundColor Yellow

$devDocs = @(
    "✅_*.md",
    "🎉_*.md",
    "403*.md",
    "500*.md",
    "*DEBUG*.md",
    "*FIX*.md",
    "*INVENTORY*.md",
    "*快速*.md",
    "*诊断*.md",
    "*修复*.md",
    "*问题*.md",
    "*多租户*.md",
    "*单租户*.md",
    "*company_id*.md",
    "*parts_*.md",
    "*控制台*.md",
    "*Schema*.md",
    "*TENANT*.md",
    "OCR_DEPLOYMENT.md",
    "OCR_ENHANCEMENT*.md",
    "OCR_FIX*.md",
    "OCR_IMPROVEMENTS*.md",
    "OCR服务最终状态.md",
    "*FINANCE_*.md",
    "*REFACTOR*.md",
    "*CLEANUP*.md",
    "*SYNC*.md",
    "*当前*.md",
    "*立即*.md",
    "*系统简化*.md",
    "*权限系统*.md",
    "*配件核销*.md",
    "*配件管理*.md",
    "*替代设备*.md",
    "*物流台账*.md",
    "*库存*.md",
    "*数据库*.md",
    "*服务器*.md",
    "*解决*.md",
    "*设备合同*.md",
    "*语法*.md",
    "*超管*.md",
    "*使用gaokongche*.md",
    "*清除*.md",
    "*配置*.txt",
    "INSURANCE*.md",
    "LATEST_IMPROVEMENTS*.md",
    "QUICK_FIX*.md",
    "QUICK_START_SCHEMA.md",
    "README_SCHEMA*.md"
)

foreach ($pattern in $devDocs) {
    $files = Get-ChildItem -Path $rootPath -Filter $pattern -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Remove-Item $file.FullName -Force
        $deletedFiles += $file.Name
        $deletedCount++
    }
}

Write-Host "  已删除 $($devDocs.Count) 类文档" -ForegroundColor Green

# 2. 删除临时SQL文件
Write-Host "[2/6] 清理临时SQL文件..." -ForegroundColor Yellow

$tempSqlPatterns = @(
    "check_*.sql",
    "diagnose_*.sql",
    "fix_*.sql",
    "verify_*.sql",
    "create_test_*.sql",
    "test_*.sql",
    "一键*.sql",
    "完整*.sql",
    "方案*.sql",
    "检查*.sql",
    "诊断*.sql",
    "修复*.sql",
    "删除*.sql",
    "补充*.sql",
    "查询*.sql",
    "创建*.sql",
    "最终*.sql",
    "add_test_models.sql",
    "quick_fix_template.sql",
    "create_policy*.sql",
    "create_simple_test_data.sql"
)

foreach ($pattern in $tempSqlPatterns) {
    $files = Get-ChildItem -Path $rootPath -Filter $pattern -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Remove-Item $file.FullName -Force
        $deletedFiles += $file.Name
        $deletedCount++
    }
}

Write-Host "  已删除临时SQL文件" -ForegroundColor Green

# 3. 删除备份文件
Write-Host "[3/6] 清理备份文件..." -ForegroundColor Yellow

$backupFiles = Get-ChildItem -Path $rootPath -Recurse -Filter "*.backup*" -File -ErrorAction SilentlyContinue
foreach ($file in $backupFiles) {
    Remove-Item $file.FullName -Force
    $deletedFiles += $file.FullName.Replace($rootPath + "\", "")
    $deletedCount++
}

Write-Host "  已删除 $($backupFiles.Count) 个备份文件" -ForegroundColor Green

# 4. 删除测试文件
Write-Host "[4/6] 清理测试文件..." -ForegroundColor Yellow

if (Test-Path "$rootPath\tests") {
    Remove-Item "$rootPath\tests" -Recurse -Force
    Write-Host "  已删除 tests 目录" -ForegroundColor Green
    $deletedCount += 10
}

$testScripts = Get-ChildItem -Path "$rootPath\scripts" -Filter "*test*.js" -File -ErrorAction SilentlyContinue
foreach ($file in $testScripts) {
    Remove-Item $file.FullName -Force
    $deletedFiles += "scripts\$($file.Name)"
    $deletedCount++
}

$testFiles = @(
    "test_*.mjs",
    "test_*.js",
    "test_*.py",
    "tsc_output.txt"
)

foreach ($pattern in $testFiles) {
    $files = Get-ChildItem -Path $rootPath -Filter $pattern -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Remove-Item $file.FullName -Force
        $deletedFiles += $file.Name
        $deletedCount++
    }
}

Write-Host "  已删除测试相关文件" -ForegroundColor Green

# 5. 删除临时脚本
Write-Host "[5/6] 清理临时脚本..." -ForegroundColor Yellow

$tempScripts = @(
    "auto_fix_database.mjs",
    "check_*.mjs",
    "browser_check_*.js",
    "批量清理*.mjs",
    "*_check_*.mjs",
    "fix_parse_idcard.py",
    "create_ocr.py"
)

foreach ($pattern in $tempScripts) {
    $files = Get-ChildItem -Path $rootPath -Filter $pattern -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Remove-Item $file.FullName -Force
        $deletedFiles += $file.Name
        $deletedCount++
    }
}

Write-Host "  已删除临时脚本文件" -ForegroundColor Green

# 6. 删除其他临时文件
Write-Host "[6/6] 清理其他临时文件..." -ForegroundColor Yellow

$otherTemp = @(
    "FIX_SUMMARY.txt",
    ".env.backup"
)

foreach ($file in $otherTemp) {
    if (Test-Path "$rootPath\$file") {
        Remove-Item "$rootPath\$file" -Force
        $deletedFiles += $file
        $deletedCount++
    }
}

# 删除backups目录
if (Test-Path "$rootPath\backups") {
    Remove-Item "$rootPath\backups" -Recurse -Force
    Write-Host "  已删除 backups 目录" -ForegroundColor Green
    $deletedCount += 5
}

Write-Host "  完成其他文件清理" -ForegroundColor Green

# 完成
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "清理完成!" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""
Write-Host "总计删除文件数: $deletedCount" -ForegroundColor Yellow
Write-Host ""
Write-Host "详细清单已保存到: deployment\deleted_files.txt" -ForegroundColor Cyan

# 保存删除清单
$deletedFiles | Out-File -FilePath "$rootPath\deployment\deleted_files.txt" -Encoding UTF8
Write-Host ""
Write-Host "✅ 项目已清理完成，可以开始部署准备！" -ForegroundColor Green
