#!/usr/bin/env node
/**
 * 验证并修复所有使用 tenantMiddleware 的文件的导入语句
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROUTES_DIR = path.join(__dirname, '../server/routes');

function fixFile(filepath) {
  const filename = path.basename(filepath);
  let content = fs.readFileSync(filepath, 'utf-8');
  
  // 检查是否使用了 tenantMiddleware
  const usesTenantMiddleware = content.includes('tenantMiddleware');
  
  if (!usesTenantMiddleware) {
    return { fixed: false, reason: '未使用 tenantMiddleware' };
  }
  
  // 检查是否已导入
  const hasImport = content.includes("from '../middleware/tenant.js'");
  
  if (hasImport) {
    return { fixed: false, reason: '已有导入' };
  }
  
  // 需要修复：使用了但没导入
  console.log(`🔧 修复: ${filename} - 添加导入语句`);
  
  // 找到第一个 import 语句后面插入
  const importMatch = content.match(/(^import [^\n]+\n)/m);
  if (importMatch) {
    const firstImport = importMatch[0];
    const newImport = firstImport + "import { tenantMiddleware } from '../middleware/tenant.js';\n";
    content = content.replace(firstImport, newImport);
    
    fs.writeFileSync(filepath, content, 'utf-8');
    return { fixed: true, reason: '已修复' };
  }
  
  return { fixed: false, reason: '无法找到导入位置' };
}

function main() {
  console.log('🔍 检查所有路由文件的 tenantMiddleware 导入...\n');
  
  const files = fs.readdirSync(ROUTES_DIR)
    .filter(f => f.endsWith('.mysql.js'))
    .map(f => path.join(ROUTES_DIR, f));
  
  const results = {
    fixed: 0,
    ok: 0,
    error: 0,
    notUsed: 0,
  };
  
  for (const filepath of files) {
    const filename = path.basename(filepath);
    const result = fixFile(filepath);
    
    if (result.fixed) {
      console.log(`  ✅ ${filename}: ${result.reason}`);
      results.fixed++;
    } else if (result.reason === '已有导入') {
      results.ok++;
    } else if (result.reason === '未使用 tenantMiddleware') {
      results.notUsed++;
    } else {
      console.log(`  ❌ ${filename}: ${result.reason}`);
      results.error++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 检查结果:');
  console.log(`  ✅ 已修复: ${results.fixed} 个`);
  console.log(`  ✓  正常: ${results.ok} 个`);
  console.log(`  -  未使用: ${results.notUsed} 个`);
  console.log(`  ❌ 错误: ${results.error} 个`);
  console.log('='.repeat(60));
  
  if (results.fixed > 0) {
    console.log('\n⚠️  已修复文件，请重启后端服务器！');
  } else {
    console.log('\n✅ 所有文件导入正常！');
  }
}

main();
