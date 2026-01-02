@echo off
REM ============================================
REM 数据库优化一键执行脚本 (Windows版本)
REM 作者: AI 开发助手
REM 日期: 2026-01-02
REM ============================================

setlocal enabledelayedexpansion
chcp 65001 >nul

REM 数据库配置
set DB_HOST=localhost
set DB_USER=root
set DB_NAME=gaokongche
set BACKUP_DIR=.\backups
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=backup_%TIMESTAMP%.sql

echo ============================================
echo   数据库表结构优化执行脚本（方案一）
echo ============================================
echo.

REM 步骤1: 检查MySQL
echo [1/7] 检查MySQL连接...
mysql -h %DB_HOST% -u %DB_USER% -p -e "USE %DB_NAME%;" 2>nul
if %errorlevel% neq 0 (
    echo ❌ 无法连接到MySQL数据库
    echo 请检查数据库配置并重试
    pause
    exit /b 1
)
echo ✓ MySQL连接正常
echo.

REM 步骤2: 创建备份目录
echo [2/7] 创建备份目录...
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
echo ✓ 备份目录已创建: %BACKUP_DIR%
echo.

REM 步骤3: 备份数据库
echo [3/7] 备份当前数据库...
echo 备份文件: %BACKUP_DIR%\%BACKUP_FILE%
echo 请输入MySQL密码:
mysqldump -h %DB_HOST% -u %DB_USER% -p %DB_NAME% > "%BACKUP_DIR%\%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo ✓ 数据库备份完成
    dir "%BACKUP_DIR%\%BACKUP_FILE%"
) else (
    echo ❌ 数据库备份失败
    pause
    exit /b 1
)
echo.

REM 步骤4: 执行优化脚本
echo [4/7] 执行数据库优化脚本...
echo.

echo   → 财务记录合并...
mysql -h %DB_HOST% -u %DB_USER% -p %DB_NAME% < 217_merge_finance_records.sql
if %errorlevel% equ 0 (
    echo     ✓ 财务记录合并完成
) else (
    echo     ❌ 财务记录合并失败
    pause
    exit /b 1
)

echo   → 提醒系统优化...
mysql -h %DB_HOST% -u %DB_USER% -p %DB_NAME% < 218_optimize_reminder_system.sql
if %errorlevel% equ 0 (
    echo     ✓ 提醒系统优化完成
) else (
    echo     ❌ 提醒系统优化失败
    pause
    exit /b 1
)

echo   → 审批系统简化...
mysql -h %DB_HOST% -u %DB_USER% -p %DB_NAME% < 219_simplify_approval_system.sql
if %errorlevel% equ 0 (
    echo     ✓ 审批系统简化完成
) else (
    echo     ❌ 审批系统简化失败
    pause
    exit /b 1
)

echo.

REM 步骤5: 验证数据迁移
echo [5/7] 验证数据迁移...
mysql -h %DB_HOST% -u %DB_USER% -p %DB_NAME% < 220_validate_migration.sql > validation_result.txt

if %errorlevel% equ 0 (
    echo ✓ 数据验证完成
    echo 验证结果已保存到: validation_result.txt
    echo.
    echo === 验证摘要 ===
    findstr /C:"✓" /C:"✗" validation_result.txt
) else (
    echo ❌ 数据验证失败
    pause
    exit /b 1
)
echo.

REM 步骤6: 生成报告
echo [6/7] 生成优化报告...
(
echo 数据库表结构优化报告
echo 执行时间: %date% %time%
echo 备份文件: %BACKUP_DIR%\%BACKUP_FILE%
echo.
echo 优化内容:
echo 1. ✓ 财务记录合并 ^(order_receipts + order_refunds → finance_records^)
echo 2. ✓ 提醒系统优化 ^(统一 reminder_records^)
echo 3. ✓ 审批系统简化 ^(删除冗余统计表^)
echo.
echo 后续步骤:
echo □ 更新后端 API 代码 ^(参考: 数据库优化实施指南.md^)
echo □ 更新前端代码
echo □ 测试所有财务功能
echo □ 测试所有提醒功能
echo □ 测试审批统计功能
echo □ 30天后删除备份表
echo.
echo 备注: 如遇问题，请使用备份文件恢复
) > optimization_report.txt

echo ✓ 优化报告已生成: optimization_report.txt
type optimization_report.txt
echo.

REM 步骤7: 完成提示
echo [7/7] 优化完成
echo ============================================
echo   ✅ 数据库优化成功完成！
echo ============================================
echo.
echo 📋 重要提醒:
echo 1. 备份文件位置: %BACKUP_DIR%\%BACKUP_FILE%
echo 2. 验证结果: validation_result.txt
echo 3. 优化报告: optimization_report.txt
echo 4. 请查看 "数据库优化实施指南.md" 了解后续代码更新步骤
echo.
echo ⚠️  注意事项:
echo • 旧表已重命名为备份（_*_backup_20260102）
echo • 请立即更新后端和前端代码
echo • 测试所有相关功能
echo • 30天后删除备份表
echo.
echo 如遇问题，回滚命令:
echo mysql -u %DB_USER% -p %DB_NAME% ^< %BACKUP_DIR%\%BACKUP_FILE%
echo.

pause

