#!/bin/bash

# ============================================
# 数据库优化一键执行脚本
# 作者: AI 开发助手
# 日期: 2026-01-02
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 数据库配置
DB_HOST="localhost"
DB_USER="root"
DB_NAME="gaokongche"
BACKUP_DIR="./backups"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  数据库表结构优化执行脚本（方案一）${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# 步骤1: 检查MySQL连接
echo -e "${YELLOW}[1/7] 检查MySQL连接...${NC}"
if ! mysql -h $DB_HOST -u $DB_USER -p$DB_PASS -e "USE $DB_NAME;" 2>/dev/null; then
    echo -e "${RED}❌ 无法连接到MySQL数据库${NC}"
    echo "请检查数据库配置并重试"
    exit 1
fi
echo -e "${GREEN}✓ MySQL连接正常${NC}"
echo ""

# 步骤2: 创建备份目录
echo -e "${YELLOW}[2/7] 创建备份目录...${NC}"
mkdir -p $BACKUP_DIR
echo -e "${GREEN}✓ 备份目录已创建: $BACKUP_DIR${NC}"
echo ""

# 步骤3: 备份数据库
echo -e "${YELLOW}[3/7] 备份当前数据库...${NC}"
echo "备份文件: $BACKUP_DIR/$BACKUP_FILE"
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 数据库备份完成${NC}"
    ls -lh "$BACKUP_DIR/$BACKUP_FILE"
else
    echo -e "${RED}❌ 数据库备份失败${NC}"
    exit 1
fi
echo ""

# 步骤4: 执行优化脚本
echo -e "${YELLOW}[4/7] 执行数据库优化脚本...${NC}"

echo "  → 财务记录合并..."
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < 217_merge_finance_records.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}    ✓ 财务记录合并完成${NC}"
else
    echo -e "${RED}    ❌ 财务记录合并失败${NC}"
    exit 1
fi

echo "  → 提醒系统优化..."
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < 218_optimize_reminder_system.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}    ✓ 提醒系统优化完成${NC}"
else
    echo -e "${RED}    ❌ 提醒系统优化失败${NC}"
    exit 1
fi

echo "  → 审批系统简化..."
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < 219_simplify_approval_system.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}    ✓ 审批系统简化完成${NC}"
else
    echo -e "${RED}    ❌ 审批系统简化失败${NC}"
    exit 1
fi

echo ""

# 步骤5: 验证数据迁移
echo -e "${YELLOW}[5/7] 验证数据迁移...${NC}"
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < 220_validate_migration.sql > validation_result.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 数据验证完成${NC}"
    echo "验证结果已保存到: validation_result.txt"
    echo ""
    echo "=== 验证摘要 ==="
    grep "✓\|✗" validation_result.txt | head -20
else
    echo -e "${RED}❌ 数据验证失败${NC}"
    exit 1
fi
echo ""

# 步骤6: 生成报告
echo -e "${YELLOW}[6/7] 生成优化报告...${NC}"
cat > optimization_report.txt << EOF
数据库表结构优化报告
执行时间: $(date +"%Y-%m-%d %H:%M:%S")
备份文件: $BACKUP_DIR/$BACKUP_FILE

优化内容:
1. ✓ 财务记录合并 (order_receipts + order_refunds → finance_records)
2. ✓ 提醒系统优化 (统一 reminder_records)
3. ✓ 审批系统简化 (删除冗余统计表)

后续步骤:
□ 更新后端 API 代码 (参考: 数据库优化实施指南.md)
□ 更新前端代码
□ 测试所有财务功能
□ 测试所有提醒功能
□ 测试审批统计功能
□ 30天后删除备份表

备注: 如遇问题，请使用备份文件恢复
EOF

echo -e "${GREEN}✓ 优化报告已生成: optimization_report.txt${NC}"
cat optimization_report.txt
echo ""

# 步骤7: 完成提示
echo -e "${YELLOW}[7/7] 优化完成${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ 数据库优化成功完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}📋 重要提醒:${NC}"
echo "1. 备份文件位置: $BACKUP_DIR/$BACKUP_FILE"
echo "2. 验证结果: validation_result.txt"
echo "3. 优化报告: optimization_report.txt"
echo "4. 请查看 '数据库优化实施指南.md' 了解后续代码更新步骤"
echo ""
echo -e "${YELLOW}⚠️  注意事项:${NC}"
echo "• 旧表已重命名为备份（_*_backup_20260102）"
echo "• 请立即更新后端和前端代码"
echo "• 测试所有相关功能"
echo "• 30天后删除备份表"
echo ""
echo -e "${BLUE}如遇问题，回滚命令:${NC}"
echo "mysql -u $DB_USER -p $DB_NAME < $BACKUP_DIR/$BACKUP_FILE"
echo ""

