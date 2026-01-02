#!/usr/bin/env node
/**
 * 批量修复多租户数据隔离脚本
 * 为所有路由文件自动添加 tenantMiddleware
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要修复的文件列表
const FILES_TO_FIX = [
  // 高优先级
  'invoices.mysql.js',
  'equipment-purchases.mysql.js',
  'contracts.mysql.js',
  'billings.mysql.js',
  'sublease.mysql.js',
  'employees.mysql.js',
  'logistics.mysql.js',
  // 中优先级
  'equipment-repairs.mysql.js',
  'equipment-replacements.mysql.js',
  'equipment-usage.mysql.js',
  'part-replacements.mysql.js',
  'parts.mysql.js',
  'policies.mysql.js',
  'order-pause.mysql.js',
  'order-suspensions.mysql.js',
  'contract-renewals.mysql.js',
  'equipment-rent-stats.mysql.js',
  'dashboard.mysql.js',
  // 低优先级
  'departments.mysql.js',
  'positions.mysql.js',
  'reminders.mysql.js',
  'reminder-settings.mysql.js',
  'approval-config.mysql.js',
  'approvals.mysql.js',
  'workflows.mysql.js',
];

const ROUTES_DIR = path.join(__dirname, '../server/routes');

function fixFile(filename) {
  const filepath = path.join(ROUTES_DIR, filename);
  
  console.log(`\n🔧 修复: ${filename}`);
  
  if (!fs.existsSync(filepath)) {
    console.log(`  ⚠️  文件不存在，跳过`);
    return { success: false, reason: '文件不存在' };
  }
  
  let content = fs.readFileSync(filepath, 'utf-8');
  let modified = false;
  
  // 1. 检查是否已导入 tenantMiddleware
  if (!content.includes('tenantMiddleware')) {
    // 查找 import express 的位置
    const importMatch = content.match(/(import express from ['"]express['"];?\n)/);
    if (importMatch) {
      const importSection = importMatch[0];
      const newImport = importSection + "import { tenantMiddleware } from '../middleware/tenant.js';\n";
      content = content.replace(importSection, newImport);
      modified = true;
      console.log(`  ✅ 添加导入语句`);
    }
  } else {
    console.log(`  ℹ️  已有导入语句`);
  }
  
  // 2. 为路由添加 tenantMiddleware
  // 查找所有 router.get/post/put/delete 的路由定义
  const routePattern = /(router\.(get|post|put|delete)\(['"]\/?[^'"]*['"],\s*)(async\s*\()/g;
  const matches = [];
  let match;
  
  while ((match = routePattern.exec(content)) !== null) {
    // 检查这个路由是否已经有 tenantMiddleware
    const beforeRoute = content.substring(Math.max(0, match.index - 100), match.index);
    if (!beforeRoute.includes('tenantMiddleware') && 
        !match[0].includes('tenantMiddleware')) {
      matches.push(match);
    }
  }
  
  if (matches.length > 0) {
    // 从后往前替换，避免索引变化
    matches.reverse();
    for (const match of matches) {
      const original = match[0];
      const replacement = match[1] + 'tenantMiddleware, ' + match[3];
      const index = content.lastIndexOf(original);
      if (index !== -1) {
        content = content.substring(0, index) + replacement + content.substring(index + original.length);
        modified = true;
      }
    }
    console.log(`  ✅ 添加了 ${matches.length} 个路由的中间件`);
  } else {
    console.log(`  ℹ️  路由已有中间件或无需添加`);
  }
  
  // 3. 保存文件
  if (modified) {
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`  💾 文件已保存`);
    return { success: true, modified: true };
  } else {
    console.log(`  ✨ 无需修改`);
    return { success: true, modified: false };
  }
}

function main() {
  console.log('🚀 开始批量修复多租户数据隔离...\n');
  console.log(`📁 路由目录: ${ROUTES_DIR}`);
  console.log(`📝 需要修复的文件: ${FILES_TO_FIX.length} 个\n`);
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    modified: 0,
  };
  
  for (const filename of FILES_TO_FIX) {
    const result = fixFile(filename);
    if (result.success) {
      results.success++;
      if (result.modified) {
        results.modified++;
      } else {
        results.skipped++;
      }
    } else {
      results.failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 修复结果统计:');
  console.log(`  ✅ 成功: ${results.success} 个`);
  console.log(`  📝 修改: ${results.modified} 个`);
  console.log(`  ⏭️  跳过: ${results.skipped} 个`);
  console.log(`  ❌ 失败: ${results.failed} 个`);
  console.log('='.repeat(60));
  
  if (results.modified > 0) {
    console.log('\n⚠️  重要提示:');
    console.log('  1. 请重启后端服务器: npm run api');
    console.log('  2. 请检查修改的文件，确保SQL查询正确使用租户过滤');
    console.log('  3. 建议测试各个模块的数据隔离效果');
  }
  
  console.log('\n✅ 批量修复完成！\n');
}

main();
