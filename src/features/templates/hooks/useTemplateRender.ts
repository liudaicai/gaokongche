/**
 * 模板渲染 Hook
 * 用于在业务流程中渲染和打印模板
 */

import { useState } from 'react';
import { message } from 'antd';
import { apiGet, apiPost } from '../../../api/client';
import { renderTemplate, printElement, exportElementAsPdf } from '../templateEngine';
import type { TemplateType } from '../types';
import type { TemplateData } from '../templateDataMapper';

export const useTemplateRender = () => {
  const [loading, setLoading] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState<string>('');

  /**
   * 渲染模板并预览
   * @param templateId 模板ID
   * @param data 数据
   */
  const renderAndPreview = async (templateId: string | number, data: TemplateData) => {
    try {
      setLoading(true);

      // 1. 获取模板内容
      const template = await apiGet(`/templates/${templateId}`);

      // 2. 渲染模板
      const html = renderTemplate(template.content, data);
      setRenderedHtml(html);

      // 3. 在新窗口预览
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${template.name}</title>
            <style>
              body { margin: 20px; font-family: 'Microsoft YaHei', Arial, sans-serif; }
              @media print { 
                body { margin: 0; } 
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body>${html}</body>
          </html>
        `);
        previewWindow.document.close();
      }

      return html;
    } catch (error: any) {
      message.error(error.message || '渲染失败');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 渲染模板并打印
   * @param templateId 模板ID
   * @param data 数据
   */
  const renderAndPrint = async (templateId: string | number, data: TemplateData) => {
    try {
      setLoading(true);

      // 1. 渲染模板
      const html = await renderAndPreview(templateId, data);

      // 2. 等待窗口加载完成后打印
      setTimeout(() => {
        window.print();
      }, 500);

      return html;
    } catch (error: any) {
      message.error(error.message || '打印失败');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 渲染模板并导出 PDF
   * @param templateId 模板ID
   * @param data 数据
   * @param filename 文件名
   */
  const renderAndExportPdf = async (
    templateId: string | number,
    data: TemplateData,
    filename: string = 'document.pdf'
  ) => {
    try {
      setLoading(true);

      // 1. 获取模板内容
      const template = await apiGet(`/templates/${templateId}`);

      // 2. 渲染模板
      const html = renderTemplate(template.content, data);
      setRenderedHtml(html);

      // 3. 创建临时 DOM 元素用于导出
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);

      // 4. 导出 PDF
      await exportElementAsPdf(tempDiv, filename);

      // 5. 清理临时元素
      document.body.removeChild(tempDiv);

      message.success('PDF导出成功');
      return html;
    } catch (error: any) {
      message.error(error.message || '导出失败');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 渲染模板并保存使用记录
   * @param templateId 模板ID
   * @param orderId 订单ID
   * @param documentType 单据类型
   * @param data 数据
   */
  const renderAndSave = async (
    templateId: string | number,
    orderId: number,
    documentType: TemplateType,
    data: TemplateData
  ) => {
    try {
      setLoading(true);

      // 1. 渲染模板
      const html = await renderAndPreview(templateId, data);

      // 2. 保存生成记录
      await apiPost('/templates/usage/record', {
        orderId,
        templateId,
        documentType,
        generatedHtml: html,
      });

      message.success('单据已生成并保存');
      return html;
    } catch (error: any) {
      message.error(error.message || '保存失败');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取订单的模板使用记录
   * @param orderId 订单ID
   */
  const getOrderTemplateUsage = async (orderId: number) => {
    try {
      return await apiGet(`/templates/usage/${orderId}`);
    } catch (error: any) {
      message.error(error.message || '获取记录失败');
      throw error;
    }
  };

  return {
    loading,
    renderedHtml,
    renderAndPreview,
    renderAndPrint,
    renderAndExportPdf,
    renderAndSave,
    getOrderTemplateUsage,
  };
};

export default useTemplateRender;


