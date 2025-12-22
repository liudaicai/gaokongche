/**
 * 批量生成对话框 - 一次生成多个单据
 * 适用于需要同时打印多个单据的场景
 */

import React, { useState } from 'react';
import { Modal, Checkbox, Space, Button, message, Alert, Divider } from 'antd';
import type { CheckboxProps } from 'antd';
import { FileTextOutlined, PrinterOutlined } from '@ant-design/icons';
import type { TemplateType } from '../types';
import type { OrderData } from '../templateDataMapper';
import { mapOrderToTemplateData } from '../templateDataMapper';
import { renderTemplate, printElement } from '../templateEngine';

interface Props {
  visible: boolean;
  order: OrderData;
  templates: Record<TemplateType, string | undefined>; // 各类型的默认模板内容
  onCancel: () => void;
  onSuccess?: () => void;
}

interface DocumentOption {
  type: TemplateType;
  label: string;
  description: string;
  enabled: boolean;
}

const BatchGenerateDialog: React.FC<Props> = ({ 
  visible, 
  order, 
  templates,
  onCancel,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  
  // 可批量生成的单据类型
  const [options, setOptions] = useState<DocumentOption[]>([
    { type: '合同', label: '租赁合同', description: '双方签订的租赁协议', enabled: !!templates['合同'] },
    { type: '进场', label: '进场单', description: '设备进场交接凭证', enabled: !!templates['进场'] },
    { type: '退场', label: '退场单', description: '设备退场交接凭证', enabled: false },
    { type: '结算', label: '结算单', description: '租金费用结算明细', enabled: false },
  ]);

  const handleCheckChange = (type: TemplateType, checked: boolean) => {
    setOptions(options.map(opt => 
      opt.type === type ? { ...opt, enabled: checked } : opt
    ));
  };

  const handleBatchGenerate = async () => {
    const selectedTypes = options.filter(opt => opt.enabled).map(opt => opt.type);
    
    if (selectedTypes.length === 0) {
      message.warning('请至少选择一个单据类型');
      return;
    }

    setLoading(true);
    try {
      // 生成所有选中的单据
      const htmls: string[] = [];
      
      for (const type of selectedTypes) {
        const templateContent = templates[type];
        if (!templateContent) {
          message.warning(`${type}模板未配置，已跳过`);
          continue;
        }
        
        const templateData = mapOrderToTemplateData(order, type);
        const html = renderTemplate(templateContent, templateData);
        htmls.push(html);
      }

      if (htmls.length === 0) {
        message.error('没有可生成的单据');
        return;
      }

      // 创建临时容器，包含所有单据
      const tempDiv = document.createElement('div');
      htmls.forEach((html, index) => {
        const docDiv = document.createElement('div');
        docDiv.innerHTML = html;
        docDiv.style.pageBreakAfter = 'always'; // 打印时自动分页
        if (index < htmls.length - 1) {
          docDiv.style.marginBottom = '50px'; // 预览时的间距
        }
        tempDiv.appendChild(docDiv);
      });
      
      document.body.appendChild(tempDiv);
      
      // 打印所有单据
      await printElement(tempDiv);
      
      // 清理
      document.body.removeChild(tempDiv);
      
      message.success(`已成功生成${htmls.length}个单据并发送到打印机`);
      onSuccess?.();
      onCancel();
    } catch (error: any) {
      message.error(error.message || '批量生成失败');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = options.filter(opt => opt.enabled).length;
  const availableCount = options.filter(opt => templates[opt.type]).length;

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>批量生成单据</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button 
          key="generate" 
          type="primary" 
          icon={<PrinterOutlined />}
          onClick={handleBatchGenerate}
          loading={loading}
          disabled={selectedCount === 0}
        >
          生成并打印（{selectedCount}个）
        </Button>,
      ]}
    >
      <Alert
        message="💡 提示"
        description={
          <div>
            <p>批量生成功能可一次性生成多个单据并连续打印。</p>
            <p>请选择需要生成的单据类型：</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {options.map((option) => {
          const hasTemplate = !!templates[option.type];
          const checkboxProps: CheckboxProps = {
            checked: option.enabled,
            disabled: !hasTemplate,
            onChange: (e) => handleCheckChange(option.type, e.target.checked),
          };

          return (
            <div 
              key={option.type}
              style={{
                padding: 16,
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                background: option.enabled ? '#f0f7ff' : 'white',
              }}
            >
              <Checkbox {...checkboxProps}>
                <Space direction="vertical" size={0}>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>
                    {option.label}
                    {!hasTemplate && (
                      <span style={{ color: '#ff4d4f', fontSize: 12, marginLeft: 8 }}>
                        （未配置模板）
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {option.description}
                  </div>
                </Space>
              </Checkbox>
            </div>
          );
        })}
      </Space>

      <Divider />

      <div style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
        共{availableCount}个可用模板，已选择{selectedCount}个
      </div>
    </Modal>
  );
};

export default BatchGenerateDialog;


