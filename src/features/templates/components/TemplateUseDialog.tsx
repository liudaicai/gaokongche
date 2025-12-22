/**
 * 模板使用对话框 - 为非专业人士设计
 * 引导用户填写必要信息后生成单据
 */

import React, { useState, useMemo } from 'react';
import { Modal, Form, Input, DatePicker, Button, Space, Alert, Divider, Typography, Card, Row, Col, Tag } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { Template } from '../types';
import type { OrderData, TemplateData } from '../templateDataMapper';
import { mapOrderToTemplateData } from '../templateDataMapper';
import { renderTemplate } from '../templateEngine';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Props {
  visible: boolean;
  template: Template;
  order: OrderData;
  extraData?: Record<string, any>;
  onCancel: () => void;
  onConfirm: (data: TemplateData) => void;
}

// 需要用户填写的字段配置
const CUSTOM_FIELDS: Record<string, { 
  label: string; 
  type: 'input' | 'textarea' | 'date'; 
  placeholder: string;
  required?: boolean;
}> = {
  driver_name: { 
    label: '司机姓名', 
    type: 'input', 
    placeholder: '请输入送货司机的姓名',
    required: false
  },
  pickup_location: { 
    label: '收车位置', 
    type: 'input', 
    placeholder: '请输入设备回收的具体地址',
    required: false
  },
  settlement_date: { 
    label: '租金结算日期', 
    type: 'date', 
    placeholder: '选择结算日期',
    required: false
  },
  claim_reason: { 
    label: '索赔原因', 
    type: 'textarea', 
    placeholder: '请详细描述索赔的原因，例如：设备损坏、配件丢失等',
    required: true
  },
  claim_amount: { 
    label: '索赔金额', 
    type: 'input', 
    placeholder: '请输入索赔金额，例如：5000',
    required: true
  },
  suspension_start_date: { 
    label: '报停开始日期', 
    type: 'date', 
    placeholder: '选择报停开始日期',
    required: true
  },
  suspension_end_date: { 
    label: '预计恢复日期', 
    type: 'date', 
    placeholder: '选择预计恢复租赁的日期',
    required: false
  },
  suspension_reason: { 
    label: '报停原因', 
    type: 'textarea', 
    placeholder: '请说明报停原因，例如：项目暂停、天气原因等',
    required: true
  },
  clearance_date: { 
    label: '清场日期', 
    type: 'date', 
    placeholder: '选择清场日期',
    required: true
  },
};

// 从模板内容中提取需要用户填写的变量
function extractCustomVariables(content: string): string[] {
  const vars = new Set<string>();
  const regex = /{{\s*(\w+)(?:\|[\w]+)?\s*}}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const varName = match[1];
    // 只提取在CUSTOM_FIELDS中定义的变量
    if (CUSTOM_FIELDS[varName]) {
      vars.add(varName);
    }
  }
  return Array.from(vars);
}

const TemplateUseDialog: React.FC<Props> = ({ 
  visible, 
  template, 
  order, 
  extraData = {},
  onCancel, 
  onConfirm 
}) => {
  const [form] = Form.useForm();
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // 提取需要填写的字段
  const customVariables = useMemo(() => 
    extractCustomVariables(template.content), 
    [template.content]
  );

  // 自动填充的数据统计
  const autoFillCount = useMemo(() => {
    // 基础信息字段
    const baseFields = ['customer_name', 'project_name', 'contract_number', 'lessor_name', 'lessee_name', 'print_date'];
    const templateVars = new Set(extractAllVariables(template.content));
    return baseFields.filter(f => templateVars.has(f)).length;
  }, [template.content]);

  // 生成预览
  const handlePreview = async () => {
    try {
      const customValues = await form.validateFields();
      
      // 转换日期格式
      Object.keys(customValues).forEach(key => {
        if (customValues[key] && typeof customValues[key] === 'object' && customValues[key].$d) {
          customValues[key] = dayjs(customValues[key]).format('YYYY-MM-DD');
        }
      });
      
      // 合并数据
      const fullData = {
        ...extraData,
        ...customValues,
      };
      
      // 映射订单数据
      const templateData = mapOrderToTemplateData(order, template.type, fullData);
      
      // 渲染模板
      const html = renderTemplate(template.content, templateData);
      setPreviewHtml(html);
      setShowPreview(true);
    } catch (error) {
      console.error('预览失败:', error);
    }
  };

  // 确认生成
  const handleConfirm = async () => {
    try {
      const customValues = await form.validateFields();
      
      // 转换日期格式
      Object.keys(customValues).forEach(key => {
        if (customValues[key] && typeof customValues[key] === 'object' && customValues[key].$d) {
          customValues[key] = dayjs(customValues[key]).format('YYYY-MM-DD');
        }
      });
      
      // 合并数据
      const fullData = {
        ...extraData,
        ...customValues,
      };
      
      // 映射订单数据
      const templateData = mapOrderToTemplateData(order, template.type, fullData);
      
      onConfirm(templateData);
    } catch (error) {
      console.error('数据验证失败:', error);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>生成{template.type}单据</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
    >
      <Alert
        message="📝 填写说明"
        description={
          <div>
            <p>✅ 订单基本信息（客户、项目等）会自动填充，无需您输入</p>
            <p>✅ 系统信息（日期、单号等）会自动生成</p>
            {customVariables.length > 0 ? (
              <p>⚠️ 请填写下方的{customVariables.length}个特殊字段</p>
            ) : (
              <p>🎉 当前模板无需填写任何信息，可以直接生成</p>
            )}
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Row gutter={16}>
        {/* 左侧：自动数据说明 */}
        <Col span={10}>
          <Card 
            size="small" 
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>自动填充（约{autoFillCount}项）</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
              <p>✓ 客户名称：{order.customerName || '（从订单获取）'}</p>
              <p>✓ 项目名称：{order.projectName || '（从订单获取）'}</p>
              <p>✓ 打印日期：{dayjs().format('YYYY-MM-DD')}</p>
              <p style={{ marginTop: 10, color: '#999' }}>
                还有更多信息会自动填充...
              </p>
            </div>
          </Card>
        </Col>

        {/* 右侧：需要填写的字段 */}
        <Col span={14}>
          {customVariables.length > 0 ? (
            <Card 
              size="small" 
              title={
                <Space>
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <span>需要填写（{customVariables.length}项）</span>
                </Space>
              }
            >
              <Form form={form} layout="vertical">
                {customVariables.map(varName => {
                  const fieldConfig = CUSTOM_FIELDS[varName];
                  if (!fieldConfig) return null;

                  return (
                    <Form.Item
                      key={varName}
                      name={varName}
                      label={fieldConfig.label}
                      rules={[{ required: fieldConfig.required, message: `请填写${fieldConfig.label}` }]}
                    >
                      {fieldConfig.type === 'input' && (
                        <Input placeholder={fieldConfig.placeholder} />
                      )}
                      {fieldConfig.type === 'textarea' && (
                        <TextArea 
                          placeholder={fieldConfig.placeholder}
                          rows={3}
                        />
                      )}
                      {fieldConfig.type === 'date' && (
                        <DatePicker 
                          style={{ width: '100%' }}
                          placeholder={fieldConfig.placeholder}
                        />
                      )}
                    </Form.Item>
                  );
                })}
              </Form>
            </Card>
          ) : (
            <Card size="small">
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                <Paragraph style={{ marginTop: 20, fontSize: 16 }}>
                  当前模板无需填写任何信息<br />
                  可以直接生成单据
                </Paragraph>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      <Divider />

      {/* 预览区域 */}
      {showPreview && (
        <Card 
          size="small" 
          title="📄 预览效果" 
          style={{ marginTop: 16, maxHeight: 400, overflow: 'auto' }}
        >
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </Card>
      )}

      {/* 底部按钮 */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button onClick={handlePreview}>预览效果</Button>
          <Button type="primary" onClick={handleConfirm}>
            确认生成
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

// 辅助函数：提取所有变量（包括循环内的）
function extractAllVariables(content: string): Set<string> {
  const vars = new Set<string>();
  const regex = /{{\s*(\w+)(?:\|[\w]+)?\s*}}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    vars.add(match[1]);
  }
  return vars;
}

export default TemplateUseDialog;


