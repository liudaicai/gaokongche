/**
 * Word模板处理服务
 * 使用 docxtemplater 处理 .docx 模板文件
 */

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 模板存储目录
const TEMPLATE_DIR = path.join(__dirname, '../../templates');

// 确保模板目录存在
if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
  console.log(`[WordTemplate] 创建模板目录: ${TEMPLATE_DIR}`);
}

/**
 * 从Word模板生成文档
 * @param {string} templateName - 模板文件名（不含扩展名）或完整路径
 * @param {object} data - 要填充的数据
 * @param {string} outputPath - 输出文件路径（可选）
 * @returns {Buffer} 生成的文档Buffer
 */
export async function generateFromTemplate(templateName, data, outputPath = null) {
  try {
    // 确定模板文件路径
    let templatePath;
    if (path.isAbsolute(templateName)) {
      templatePath = templateName;
    } else {
      // 尝试查找模板文件
      const possibleExtensions = ['.docx', ''];
      let found = false;
      
      for (const ext of possibleExtensions) {
        const testPath = path.join(TEMPLATE_DIR, templateName + ext);
        if (fs.existsSync(testPath)) {
          templatePath = testPath;
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`模板文件未找到: ${templateName}`);
      }
    }

    console.log(`[WordTemplate] 使用模板: ${templatePath}`);

    // 读取模板文件
    const content = fs.readFileSync(templatePath, 'binary');

    // 创建 docxtemplater 实例
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      // 自定义错误处理
      parser: (tag) => {
        return {
          get: (scope, context) => {
            // 支持点号路径访问，如 customer.name
            const keys = tag.split('.');
            let value = scope;
            for (const key of keys) {
              if (value && typeof value === 'object' && key in value) {
                value = value[key];
              } else {
                return '';
              }
            }
            
            // 格式化处理
            if (typeof value === 'number') {
              // 如果是金额，格式化为货币
              if (tag.includes('amount') || tag.includes('Amount') || 
                  tag.includes('price') || tag.includes('Price')) {
                return value.toLocaleString('zh-CN', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                });
              }
              return value.toString();
            }
            
            // 日期格式化
            if (value instanceof Date) {
              return value.toLocaleDateString('zh-CN');
            }
            
            return value || '';
          }
        };
      }
    });

    // 渲染模板
    doc.render(data);

    // 生成文档
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // 如果指定了输出路径，保存文件
    if (outputPath) {
      fs.writeFileSync(outputPath, buf);
      console.log(`[WordTemplate] 文档已保存: ${outputPath}`);
    }

    return buf;

  } catch (error) {
    console.error('[WordTemplate] 生成失败:', error);
    
    // 提供更详细的错误信息
    if (error.properties && error.properties.errors) {
      const errorMessages = error.properties.errors.map(err => {
        return `${err.message} (位置: ${err.properties?.id || '未知'})`;
      }).join(', ');
      throw new Error(`Word模板错误: ${errorMessages}`);
    }
    
    throw error;
  }
}

/**
 * 列出所有可用的Word模板
 * @returns {Array} 模板列表
 */
export function listTemplates() {
  try {
    const files = fs.readdirSync(TEMPLATE_DIR);
    return files
      .filter(file => file.endsWith('.docx') && !file.startsWith('~')) // 排除临时文件
      .map(file => ({
        filename: file,
        name: path.basename(file, '.docx'),
        path: path.join(TEMPLATE_DIR, file),
        size: fs.statSync(path.join(TEMPLATE_DIR, file)).size,
        modifiedAt: fs.statSync(path.join(TEMPLATE_DIR, file)).mtime
      }));
  } catch (error) {
    console.error('[WordTemplate] 列出模板失败:', error);
    return [];
  }
}

/**
 * 上传Word模板
 * @param {Buffer} fileBuffer - 文件内容
 * @param {string} filename - 文件名
 */
export function uploadTemplate(fileBuffer, filename) {
  try {
    // 确保文件名安全
    const safeName = filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    const filePath = path.join(TEMPLATE_DIR, safeName);
    
    // 检查是否为有效的docx文件
    const zip = new PizZip(fileBuffer);
    // 如果能成功解析，说明是有效的docx
    
    fs.writeFileSync(filePath, fileBuffer);
    console.log(`[WordTemplate] 模板已上传: ${filePath}`);
    
    return {
      filename: safeName,
      path: filePath,
      size: fileBuffer.length
    };
  } catch (error) {
    console.error('[WordTemplate] 上传失败:', error);
    throw new Error('无效的Word文档格式');
  }
}

/**
 * 删除Word模板
 * @param {string} templateName - 模板名称
 */
export function deleteTemplate(templateName) {
  try {
    const filePath = path.join(TEMPLATE_DIR, templateName + '.docx');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[WordTemplate] 模板已删除: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[WordTemplate] 删除失败:', error);
    throw error;
  }
}

/**
 * 从Word模板提取变量
 * @param {string} templateName - 模板名称
 * @returns {Array} 变量列表
 */
export function extractVariables(templateName) {
  try {
    const templatePath = path.join(TEMPLATE_DIR, templateName + '.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    // 提取 document.xml 内容
    const xml = zip.files['word/document.xml'].asText();
    
    // 匹配所有变量: {{variable}}, {{#each list}}, etc.
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = new Set();
    
    let match;
    while ((match = variableRegex.exec(xml)) !== null) {
      const varName = match[1].trim();
      // 过滤掉控制语句
      if (!varName.startsWith('#') && !varName.startsWith('/')) {
        // 移除过滤器，如 |currency
        const cleanName = varName.split('|')[0].trim();
        variables.add(cleanName);
      }
    }
    
    return Array.from(variables).sort();
  } catch (error) {
    console.error('[WordTemplate] 提取变量失败:', error);
    return [];
  }
}

export default {
  generateFromTemplate,
  listTemplates,
  uploadTemplate,
  deleteTemplate,
  extractVariables,
  TEMPLATE_DIR
};
