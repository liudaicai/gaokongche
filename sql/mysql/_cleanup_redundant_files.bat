@echo off
REM ============================================
REM 清理冗余的迭代文件
REM 作者: AI 开发助手
REM 日期: 2026-01-02
REM 说明: 将失败的迭代文件移动到 _archive 文件夹
REM ============================================

echo ============================================
echo   清理冗余的数据库优化文件
echo ============================================
echo.

REM 创建归档文件夹
if not exist "_archive" mkdir "_archive"
echo ✓ 归档文件夹已创建

echo.
echo 正在移动失败的迭代文件到归档...
echo.

REM 移动财务记录合并的失败版本
move "217_merge_finance_records.sql" "_archive\" 2>nul
move "217_merge_finance_records_fixed.sql" "_archive\" 2>nul
move "217_merge_finance_records_simple.sql" "_archive\" 2>nul
move "217_merge_finance_records_ultimate.sql" "_archive\" 2>nul
move "217_merge_finance_SUPER_SIMPLE.sql" "_archive\" 2>nul
move "217_merge_finance_ABSOLUTE_SAFE.sql" "_archive\" 2>nul
move "217_merge_finance_FINAL.sql" "_archive\" 2>nul
echo ✓ 财务记录合并脚本（7个失败版本）

REM 移动审批系统的失败版本
move "219_simplify_approval_system_fixed.sql" "_archive\" 2>nul
move "219_simplify_approval_SAFE.sql" "_archive\" 2>nul
echo ✓ 审批系统脚本（2个失败版本）

REM 移动辅助文档
move "快速执行指南-极简版.md" "_archive\" 2>nul
move "修复错误后的执行指南.md" "_archive\" 2>nul
move "使用管理工具执行指南.md" "_archive\" 2>nul
move "手动执行步骤.txt" "_archive\" 2>nul
echo ✓ 迭代过程文档（4个）

echo.
echo ============================================
echo   ✅ 清理完成！
echo ============================================
echo.
echo 已移动文件到: _archive 文件夹
echo.
echo 保留的核心文件:
echo   - 216_optimize_database_schema_plan.sql
echo   - 217_merge_finance_SUCCESS.sql ⭐
echo   - 218_optimize_reminder_system.sql
echo   - 219_simplify_approval_MINIMAL.sql ⭐
echo   - 220_validate_SUCCESS.sql ⭐
echo   - 完成数据库优化.md
echo   - README_数据库优化.md
echo.
echo 提示: 如需恢复文件，请从 _archive 文件夹中复制回来
echo.
pause

