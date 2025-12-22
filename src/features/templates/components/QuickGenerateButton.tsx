/**
 * 一键生成按钮 - 最简单的模板使用方式
 * 无需选择模板，自动使用默认模板生成单据
 */

import React, { useState } from 'react';
import { Button, Dropdown, message, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { FileTextOutlined, PrinterOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { TemplateType } from '../types';
import type { OrderData } from '../templateDataMapper';
import { mapOrderToTemplateData } from '../templateDataMapper';
import { renderTemplate, printElement, exportElementAsPdf } from '../templateEngine';

interface Props {
  order: OrderData;
  type: TemplateType;
  defaultTemplateContent?: string;
  onGenerated?: () => void;
}

const QuickGenerateButton: React.FC<Props> = ({ 
  order, 
  type, 
  defaultTemplateContent,
  onGenerated 
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(false);

  // 生成HTML
  const generateHtml = (): string => {
    if (!defaultTemplateContent) {
      throw new Error('未找到默认模板');
    }
    
    const templateData = mapOrderToTemplateData(order, type);
    return renderTemplate(defaultTemplateContent, templateData);
  };

  // 快速预览
  const handleQuickPreview = () => {
    try {
      const html = generateHtml();
      setPreviewHtml(html);
      setPreviewVisible(true);
    } catch (error: any) {
      message.error(error.message || '生成预览失败');
    }
  };

  // 快速打印
  const handleQuickPrint = async () => {
    setLoading(true);
    try {
      const html = generateHtml();
      
      // 创建临时容器
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);
      
      // 打印
      await printElement(tempDiv);
      
      // 清理
      document.body.removeChild(tempDiv);
      
      message.success('已发送到打印机');
      onGenerated?.();
    } catch (error: any) {
      message.error(error.message || '打印失败');
    } finally {
      setLoading(false);
    }
  };

  // 快速导出PDF
  const handleQuickExport = async () => {
    setLoading(true);
    try {
      const html = generateHtml();
      
      // 创建临时容器
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);
      
      // 导出PDF
      const filename = `${type}_${order.customerName || 'unknown'}_${Date.now()}.pdf`;
      await exportElementAsPdf(tempDiv, filename);
      
      // 清理
      document.body.removeChild(tempDiv);
      
      message.success('PDF已下载');
      onGenerated?.();
    } catch (error: any) {
      message.error(error.message || '导出失败');
    } finally {
      setLoading(false);
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'preview',
      label: '快速预览',
      icon: <EyeOutlined />,
      onClick: handleQuickPreview,
    },
    {
      key: 'print',
      label: '直接打印',
      icon: <PrinterOutlined />,
      onClick: handleQuickPrint,
    },
    {
      key: 'export',
      label: '导出PDF',
      icon: <DownloadOutlined />,
      onClick: handleQuickExport,
    },
  ];

  if (!defaultTemplateContent) {
    return (
      <Button disabled>
        未设置默认{type}模板
      </Button>
    );
  }

  return (
    <>
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Button 
          type="primary" 
          icon={<FileTextOutlined />}
          loading={loading}
        >
          一键生成{type}
        </Button>
      </Dropdown>

      {/* 预览Modal */}
      <Modal
        title={`${type}预览`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="print" 
            type="primary" 
            icon={<PrinterOutlined />}
            onClick={() => {
              handleQuickPrint();
              setPreviewVisible(false);
            }}
          >
            打印
          </Button>,
          <Button 
            key="export" 
            icon={<DownloadOutlined />}
            onClick={() => {
              handleQuickExport();
              setPreviewVisible(false);
            }}
          >
            导出PDF
          </Button>,
        ]}
      >
        <div 
          style={{ 
            background: '#f5f5f5', 
            padding: 20,
            maxHeight: 600,
            overflow: 'auto'
          }}
        >
          <div 
            style={{ background: 'white', padding: 20 }}
            dangerouslySetInnerHTML={{ __html: previewHtml }} 
          />
        </div>
      </Modal>
    </>
  );
};

export default QuickGenerateButton;


