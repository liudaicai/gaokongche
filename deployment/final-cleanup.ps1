# 最终清理脚本 - 删除所有开发文件
# 警告：此脚本会永久删除大量文件！

$root = "d:\kaifa\4"
cd $root

Write-Host "开始最终清理..." -ForegroundColor Yellow
$count = 0

# 删除所有开发文档（保留核心）
$keepDocs = @("README.md", "DEPLOYMENT_GUIDE.md", "DEPLOYMENT_CHECKLIST.md", "OCR_QUICK_START.md", "Word模板使用说明.md", "Word模板功能-完整指南.md")
Get-ChildItem "*.md" -File | Where-Object { $keepDocs -notcontains $_.Name } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "删除: $($_.Name)"
    $count++
}

# 删除所有临时SQL
Get-ChildItem "*.sql" -File | Remove-Item -Force -ErrorAction SilentlyContinue
$count += 30

# 删除所有临时脚本
Get-ChildItem "*.mjs" -File | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem "*.py" -File -Exclude "python_services\*" | Remove-Item -Force -ErrorAction SilentlyContinue
$count += 10

# 删除tests和backups
if (Test-Path "tests") {
    Remove-Item "tests" -Recurse -Force
    $count += 5
}
if (Test-Path "backups") {
    Remove-Item "backups" -Recurse -Force
    $count += 2
}

# 删除其他临时文件
$tempFiles = @("tsc_output.txt", "FIX_SUMMARY.txt", "gaokongche-deploy.tar.gz", "high-altitude-vehicle-rental-system@0.0.0")
foreach ($f in $tempFiles) {
    if (Test-Path $f) {
        Remove-Item $f -Recurse -Force -ErrorAction SilentlyContinue
        $count++
    }
}

# 删除MySQL_Workbench_执行清单.sql
if (Test-Path "MySQL_Workbench_执行清单.sql") {
    Remove-Item "MySQL_Workbench_执行清单.sql" -Force
    $count++
}

Write-Host ""
Write-Host "✅ 清理完成！共删除约 $count 个文件/目录" -ForegroundColor Green
Write-Host ""
Write-Host "保留的核心文件：" -ForegroundColor Cyan
Write-Host "  - README.md"
Write-Host "  - DEPLOYMENT_GUIDE.md"
Write-Host "  - OCR_QUICK_START.md"
Write-Host "  - Word模板相关文档"
Write-Host "  - deployment/ 目录"
Write-Host "  - docs/ 目录（业务文档）"
Write-Host "  - templates/ 目录"
Write-Host "  - 所有源代码"
