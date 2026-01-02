#!/usr/bin/env node
/**
 * 修复组织管理（部门/职位）的多租户隔离
 * 为所有路由添加 tenantMiddleware 并在 SQL 中使用 company_id 过滤
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROUTES_DIR = path.join(__dirname, '../server/routes');

function fixDepartments() {
  const filepath = path.join(ROUTES_DIR, 'departments.mysql.js');
  let content = fs.readFileSync(filepath, 'utf-8');
  
  console.log('🔧 修复 departments.mysql.js');
  
  // 修复 GET /tree 路由
  content = content.replace(
    /router\.get\(\s*'\/tree',\s*asyncHandler/,
    "router.get('/tree', tenantMiddleware, asyncHandler"
  );
  
  // 修复 tree 路由的 SQL
  content = content.replace(
    /const \[departments\] = await connection\.query\(`\s*SELECT[^`]+FROM departments d\s*WHERE 1=1/,
    function(match) {
      return match.replace(
        'WHERE 1=1',
        `WHERE d.company_id = ?' + (req.user?.role === 'super_admin' ? ' OR 1=1' : '') + '`
      ).replace(
        'SELECT',
        `const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
        const [departments] = await connection.query(\`
          SELECT`
      ).replace(
        'WHERE d.company_id',
        `WHERE \${tenantWhere.replace(/\\bcompany_id\\b/g, 'd.company_id')}`
      );
    }
  );
  
  // 修复 GET /:id 路由
  content = content.replace(
    /router\.get\(\s*'\/:id',\s*asyncHandler/,
    "router.get('/:id', tenantMiddleware, asyncHandler"
  );
  
  // 修复 POST / 路由
  content = content.replace(
    /router\.post\(\s*'\/',\s*asyncHandler/,
    "router.post('/', tenantMiddleware, asyncHandler"
  );
  
  // 修复 PUT /:id 路由
  content = content.replace(
    /router\.put\(\s*'\/:id',\s*asyncHandler/,
    "router.put('/:id', tenantMiddleware, asyncHandler"
  );
  
  // 修复 DELETE /:id 路由
  content = content.replace(
    /router\.delete\(\s*'\/:id',\s*asyncHandler/,
    "router.delete('/:id', tenantMiddleware, asyncHandler"
  );
  
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log('  ✅ departments.mysql.js 已修复');
}

function fixPositions() {
  const filepath = path.join(ROUTES_DIR, 'positions.mysql.js');
  let content = fs.readFileSync(filepath, 'utf-8');
  
  console.log('🔧 修复 positions.mysql.js');
  
  // 修复所有路由，添加 tenantMiddleware
  const routes = [
    { pattern: /router\.get\(\s*'\/tree',\s*asyncHandler/, replacement: "router.get('/tree', tenantMiddleware, asyncHandler" },
    { pattern: /router\.get\(\s*'\/:id',\s*asyncHandler/, replacement: "router.get('/:id', tenantMiddleware, asyncHandler" },
    { pattern: /router\.post\(\s*'\/',\s*asyncHandler/, replacement: "router.post('/', tenantMiddleware, asyncHandler" },
    { pattern: /router\.put\(\s*'\/:id',\s*asyncHandler/, replacement: "router.put('/:id', tenantMiddleware, asyncHandler" },
    { pattern: /router\.delete\(\s*'\/:id',\s*asyncHandler/, replacement: "router.delete('/:id', tenantMiddleware, asyncHandler" },
  ];
  
  routes.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
    }
  });
  
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log('  ✅ positions.mysql.js 已修复');
}

function main() {
  console.log('🚀 开始修复组织管理的多租户隔离...\n');
  
  fixDepartments();
  fixPositions();
  
  console.log('\n✅ 修复完成！');
  console.log('\n⚠️  重要提示:');
  console.log('  1. 请先执行数据库迁移脚本: sql/mysql/209_add_company_id_to_org_tables.sql');
  console.log('  2. 然后重启后端服务器: npm run api');
  console.log('  3. 测试验证组织管理的数据隔离效果');
}

main();
