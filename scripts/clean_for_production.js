#!/usr/bin/env node

/**
 * 生产环境部署前清理脚本
 * 清理日志文件和临时上传文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 需要清理的目录
const dirsToClean = [
  { path: 'logs', pattern: /\.(log|gz)$/, description: '日志文件' },
  { path: 'server/uploads', pattern: /\.(pdf|jpg|jpeg|png|doc|docx)$/, description: '上传文件（可选）' },
];

console.log('🧹 开始清理项目，准备生产环境部署...\n');

let totalFilesDeleted = 0;
let totalSizeFreed = 0;

// 递归删除目录中的文件
function cleanDirectory(dirPath, pattern, dryRun = false) {
  const fullPath = path.join(rootDir, dirPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  目录不存在: ${dirPath}`);
    return { count: 0, size: 0 };
  }

  let count = 0;
  let size = 0;

  try {
    const files = fs.readdirSync(fullPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(fullPath, file.name);
      const relativePath = path.relative(rootDir, filePath);
      
      if (file.isDirectory()) {
        // 递归处理子目录
        const result = cleanDirectory(relativePath, pattern, dryRun);
        count += result.count;
        size += result.size;
      } else if (file.isFile() && pattern.test(file.name)) {
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        
        if (!dryRun) {
          fs.unlinkSync(filePath);
          console.log(`  ✓ 删除: ${relativePath} (${formatSize(fileSize)})`);
        } else {
          console.log(`  - 将删除: ${relativePath} (${formatSize(fileSize)})`);
        }
        
        count++;
        size += fileSize;
      }
    }
  } catch (error) {
    console.error(`❌ 清理目录失败: ${dirPath}`, error.message);
  }

  return { count, size };
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const skipUploads = args.includes('--skip-uploads');

  if (dryRun) {
    console.log('🔍 预览模式：只显示将要删除的文件，不实际删除\n');
  }

  // 询问用户是否继续
  if (!dryRun) {
    console.log('⚠️  警告：此操作将删除以下内容：');
    console.log('  - logs/ 目录下的所有日志文件');
    if (!skipUploads) {
      console.log('  - server/uploads/ 目录下的所有上传文件（可选）');
    }
    console.log('\n按 Ctrl+C 取消，或等待5秒后自动继续...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // 清理各个目录
  for (const dir of dirsToClean) {
    if (dir.path === 'server/uploads' && skipUploads) {
      console.log(`⏭️  跳过: ${dir.description}`);
      continue;
    }

    console.log(`\n📂 清理 ${dir.description} (${dir.path}):`);
    const result = cleanDirectory(dir.path, dir.pattern, dryRun);
    
    if (result.count > 0) {
      console.log(`  ✅ 清理了 ${result.count} 个文件，释放 ${formatSize(result.size)}`);
      totalFilesDeleted += result.count;
      totalSizeFreed += result.size;
    } else {
      console.log(`  ℹ️  没有需要清理的文件`);
    }
  }

  // 显示总结
  console.log('\n' + '='.repeat(60));
  if (dryRun) {
    console.log(`\n🔍 预览完成：`);
    console.log(`  - 将删除 ${totalFilesDeleted} 个文件`);
    console.log(`  - 将释放 ${formatSize(totalSizeFreed)} 空间`);
    console.log(`\n💡 运行 'node scripts/clean_for_production.js' 执行实际清理`);
  } else {
    console.log(`\n✅ 清理完成！`);
    console.log(`  - 删除了 ${totalFilesDeleted} 个文件`);
    console.log(`  - 释放了 ${formatSize(totalSizeFreed)} 空间`);
    console.log(`\n🚀 项目已准备好部署到生产环境！`);
  }
  console.log('='.repeat(60) + '\n');

  // 提示下一步操作
  if (!dryRun) {
    console.log('📝 下一步：');
    console.log('  1. 检查 .env 文件中的生产环境配置');
    console.log('  2. 运行 npm run build 构建前端');
    console.log('  3. 参考 DEPLOYMENT_CHECKLIST.md 部署到服务器');
    console.log('');
  }
}

// 显示帮助
function showHelp() {
  console.log(`
用法: node scripts/clean_for_production.js [选项]

选项:
  --dry-run, -d       预览模式，只显示将要删除的文件
  --skip-uploads      跳过清理上传文件目录
  --help, -h          显示此帮助信息

示例:
  node scripts/clean_for_production.js              # 执行清理
  node scripts/clean_for_production.js --dry-run    # 预览清理
  node scripts/clean_for_production.js --skip-uploads  # 清理但保留上传文件
`);
}

// 运行
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
} else {
  main().catch(console.error);
}


