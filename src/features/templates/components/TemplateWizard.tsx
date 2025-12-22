/**
 * 模板创建向导 - 为非专业人士设计
 * 通过步骤引导创建模板，无需技术知识
 */

import React, { useState } from 'react';
import { Modal, Steps, Button, Form, Input, Select, Card, Space, message, Alert, Radio, Typography, Tag, Divider } from 'antd';
import { FileTextOutlined, ToolOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons';
import type { TemplateType } from '../types';
import { TEMPLATE_TYPE_OPTIONS } from '../types';
import { getPreviewData } from '../templateDataMapper';
import { renderTemplate } from '../templateEngine';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

interface Props {
  visible: boolean;
  onCancel: () => void;
  onFinish: (values: any) => void;
}

// 预设模板库
const PRESET_TEMPLATES: Record<TemplateType, { name: string; description: string; content: string }[]> = {
  '合同': [
    {
      name: '简约合同模板',
      description: '简洁大方的合同格式，包含基本要素',
      content: `<div style="font-family: Microsoft YaHei; max-width: 900px; margin: 0 auto; padding: 20px;">
  <h1 style="text-align: center; margin-bottom: 30px;">设备租赁合同</h1>
  
  <div style="margin-bottom: 20px;">
    <p><strong>合同编号：</strong>{{contract_number}}</p>
    <p><strong>签订日期：</strong>{{print_date}}</p>
  </div>
  
  <h3>甲方（出租方）</h3>
  <p>{{lessor_name}}</p>
  
  <h3>乙方（承租方）</h3>
  <p>{{lessee_name}}</p>
  
  <h3>项目信息</h3>
  <p><strong>项目名称：</strong>{{project_name}}</p>
  <p><strong>交机地点：</strong>{{delivery_location}}</p>
  
  <h3>设备清单</h3>
  <table border="1" style="width:100%; border-collapse:collapse;">
    <tr style="background:#f0f0f0;">
      <th style="padding:8px;">序号</th>
      <th style="padding:8px;">设备类型</th>
      <th style="padding:8px;">高度</th>
      <th style="padding:8px;">日租金</th>
      <th style="padding:8px;">月租金</th>
    </tr>
    {{#each items}}
    <tr>
      <td style="padding:8px; text-align:center;">{{index}}</td>
      <td style="padding:8px;">{{equipment_type}}</td>
      <td style="padding:8px; text-align:center;">{{height}}</td>
      <td style="padding:8px; text-align:right;">{{daily_price}}</td>
      <td style="padding:8px; text-align:right;">{{monthly_rate}}</td>
    </tr>
    {{/each}}
  </table>
  
  <div style="margin-top: 50px; display: flex; justify-content: space-between;">
    <div>
      <p>甲方签字：___________</p>
      <p>日期：___________</p>
    </div>
    <div>
      <p>乙方签字：___________</p>
      <p>日期：___________</p>
    </div>
  </div>
</div>`,
    },
  ],
  '进场': [
    {
      name: '标准进场单',
      description: '包含设备清单和物流信息',
      content: `<div style="font-family: Microsoft YaHei; max-width: 900px; margin: 0 auto; padding: 20px;">
  <h1 style="text-align: center; margin-bottom: 30px;">设备进场单</h1>
  
  <table border="1" style="width:100%; border-collapse:collapse; margin-bottom:20px;">
    <tr>
      <td style="padding:8px; width:25%; background:#f0f0f0;"><strong>进场单号</strong></td>
      <td style="padding:8px; width:25%;">{{entry_number}}</td>
      <td style="padding:8px; width:25%; background:#f0f0f0;"><strong>打印日期</strong></td>
      <td style="padding:8px; width:25%;">{{print_date}}</td>
    </tr>
    <tr>
      <td style="padding:8px; background:#f0f0f0;"><strong>客户名称</strong></td>
      <td style="padding:8px;">{{customer_name}}</td>
      <td style="padding:8px; background:#f0f0f0;"><strong>项目名称</strong></td>
      <td style="padding:8px;">{{project_name}}</td>
    </tr>
    <tr>
      <td style="padding:8px; background:#f0f0f0;"><strong>交车位置</strong></td>
      <td style="padding:8px;" colspan="3">{{delivery_location}}</td>
    </tr>
    <tr>
      <td style="padding:8px; background:#f0f0f0;"><strong>物流方式</strong></td>
      <td style="padding:8px;">{{logistics_type}}</td>
      <td style="padding:8px; background:#f0f0f0;"><strong>出库门店</strong></td>
      <td style="padding:8px;">{{store_name}}</td>
    </tr>
  </table>
  
  <h3>进场设备清单</h3>
  <p>本次进场：<strong>{{entry_current_count}}</strong> 台　|　累计在租：<strong>{{rented_total_count}}</strong> 台</p>
  
  <table border="1" style="width:100%; border-collapse:collapse;">
    <tr style="background:#f0f0f0;">
      <th style="padding:8px; width:10%;">序号</th>
      <th style="padding:8px; width:30%;">设备编号</th>
      <th style="padding:8px; width:30%;">设备类型</th>
      <th style="padding:8px; width:30%;">高度</th>
    </tr>
    {{#each items}}
    <tr>
      <td style="padding:8px; text-align:center;">{{index}}</td>
      <td style="padding:8px;">{{equipment_code}}</td>
      <td style="padding:8px;">{{equipment_type}}</td>
      <td style="padding:8px; text-align:center;">{{height}}</td>
    </tr>
    {{/each}}
  </table>
  
  <div style="margin-top: 50px; display: flex; justify-content: space-between;">
    <div>
      <p>出租方签字：___________</p>
    </div>
    <div>
      <p>承租方签字：___________</p>
    </div>
  </div>
</div>`,
    },
  ],
  '退场': [],
  '结算': [],
  '索赔': [],
  '报停': [],
};

const TemplateWizard: React.FC<Props> = ({ visible, onCancel, onFinish }) => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [templateType, setTemplateType] = useState<TemplateType>('合同');
  const [creationMethod, setCreationMethod] = useState<'preset' | 'custom' | 'import'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [customContent, setCustomContent] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  const steps = [
    { title: '选择类型', icon: <FileTextOutlined /> },
    { title: '创建内容', icon: <ToolOutlined /> },
    { title: '预览效果', icon: <EyeOutlined /> },
    { title: '完成', icon: <CheckOutlined /> },
  ];

  const handleNext = async () => {
    if (current === 0) {
      // 第一步：验证类型选择
      try {
        await form.validateFields(['name', 'type']);
        const type = form.getFieldValue('type');
        setTemplateType(type);
        setCurrent(current + 1);
      } catch (error) {
        // 表单验证失败
      }
    } else if (current === 1) {
      // 第二步：生成预览
      let content = '';
      if (creationMethod === 'preset') {
        const preset = PRESET_TEMPLATES[templateType][selectedPreset];
        content = preset.content;
      } else if (creationMethod === 'custom') {
        content = customContent;
      }
      
      if (!content) {
        message.warning('请输入模板内容或选择预设模板');
        return;
      }
      
      // 生成预览
      try {
        const testData = getPreviewData(templateType);
        const html = renderTemplate(content, testData);
        setPreviewHtml(html);
        form.setFieldValue('content', content);
        setCurrent(current + 1);
      } catch (error) {
        message.error('模板内容格式错误，请检查');
      }
    } else if (current === 2) {
      // 第三步：完成
      setCurrent(current + 1);
    }
  };

  const handlePrev = () => {
    setCurrent(current - 1);
  };

  const handleFinish = async () => {
    try {
      const values = await form.validateFields();
      onFinish(values);
      // 重置表单
      form.resetFields();
      setCurrent(0);
      setCreationMethod('preset');
      setSelectedPreset(0);
      setCustomContent('');
      setPreviewHtml('');
    } catch (error) {
      message.error('请完善表单信息');
    }
  };

  return (
    <Modal
      title="📝 模板创建向导"
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={null}
    >
      <Steps current={current} items={steps} style={{ marginBottom: 30 }} />

      <div style={{ minHeight: 400 }}>
        {/* 步骤1：选择类型 */}
        {current === 0 && (
          <div>
            <Title level={4}>第一步：填写基本信息</Title>
            <Form form={form} layout="vertical">
              <Form.Item
                name="name"
                label="模板名称"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input 
                  placeholder="例如：我公司的标准合同模板" 
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="type"
                label="单据类型"
                rules={[{ required: true, message: '请选择单据类型' }]}
              >
                <Select 
                  placeholder="这个模板用于打印什么单据？" 
                  size="large"
                  onChange={(value) => setTemplateType(value as TemplateType)}
                >
                  {TEMPLATE_TYPE_OPTIONS.map(opt => (
                    <Option key={opt} value={opt}>
                      <Space>
                        <span style={{ fontSize: 16 }}>{opt}</span>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {opt === '合同' && '租赁协议文档'}
                          {opt === '进场' && '设备送达客户现场'}
                          {opt === '退场' && '设备从现场撤回'}
                          {opt === '结算' && '租金费用结算单'}
                        </Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="description"
                label="模板说明（可选）"
              >
                <TextArea 
                  placeholder="简单描述这个模板的用途，例如：用于大客户的正式合同" 
                  rows={3}
                />
              </Form.Item>

              <Form.Item
                name="isDefault"
                label="设为默认模板"
              >
                <Radio.Group>
                  <Radio value={true}>是（推荐）- 默认使用这个模板</Radio>
                  <Radio value={false}>否 - 作为备用模板</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </div>
        )}

        {/* 步骤2：创建内容 */}
        {current === 1 && (
          <div>
            <Title level={4}>第二步：选择创建方式</Title>
            
            <Radio.Group 
              value={creationMethod} 
              onChange={(e) => setCreationMethod(e.target.value)}
              style={{ marginBottom: 20, width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card 
                  size="small"
                  hoverable
                  style={{ 
                    cursor: 'pointer',
                    border: creationMethod === 'preset' ? '2px solid #1890ff' : '1px solid #d9d9d9'
                  }}
                  onClick={() => setCreationMethod('preset')}
                >
                  <Radio value="preset">
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: 16 }}>使用预设模板（推荐）</Text>
                      <Text type="secondary">从现成的模板中选择，快速上手</Text>
                    </Space>
                  </Radio>
                </Card>

                <Card 
                  size="small"
                  hoverable
                  style={{ 
                    cursor: 'pointer',
                    border: creationMethod === 'custom' ? '2px solid #1890ff' : '1px solid #d9d9d9'
                  }}
                  onClick={() => setCreationMethod('custom')}
                >
                  <Radio value="custom">
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: 16 }}>自己编写内容</Text>
                      <Text type="secondary">如果您熟悉HTML，可以自定义</Text>
                    </Space>
                  </Radio>
                </Card>

                <Card 
                  size="small"
                  hoverable
                  style={{ 
                    cursor: 'pointer',
                    border: creationMethod === 'import' ? '2px solid #1890ff' : '1px solid #d9d9d9'
                  }}
                  onClick={() => setCreationMethod('import')}
                >
                  <Radio value="import">
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: 16 }}>导入Word文档</Text>
                      <Text type="secondary">从现有的Word文件导入</Text>
                    </Space>
                  </Radio>
                </Card>
              </Space>
            </Radio.Group>

            <Divider />

            {/* 预设模板选择 */}
            {creationMethod === 'preset' && (
              <div>
                <Alert
                  message="选择一个预设模板"
                  description="我们为您准备了一些常用模板，可以直接使用或稍作修改"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <Radio.Group 
                  value={selectedPreset} 
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {(PRESET_TEMPLATES[templateType] || []).map((preset, index) => (
                      <Card 
                        key={index}
                        size="small"
                        hoverable
                        style={{ 
                          cursor: 'pointer',
                          border: selectedPreset === index ? '2px solid #1890ff' : '1px solid #d9d9d9'
                        }}
                        onClick={() => setSelectedPreset(index)}
                      >
                        <Radio value={index}>
                          <Space direction="vertical" size={0}>
                            <Text strong>{preset.name}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{preset.description}</Text>
                          </Space>
                        </Radio>
                      </Card>
                    ))}
                  </Space>
                </Radio.Group>
              </div>
            )}

            {/* 自定义编写 */}
            {creationMethod === 'custom' && (
              <div>
                <Alert
                  message="编写模板内容"
                  description={
                    <div>
                      <p>您可以使用HTML编写模板，使用占位符来显示动态数据。</p>
                      <p>常用占位符：
                        <Tag>{'{{customer_name}}'}</Tag>
                        <Tag>{'{{project_name}}'}</Tag>
                        <Tag>{'{{print_date}}'}</Tag>
                      </p>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <TextArea
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="在这里粘贴或编写HTML内容..."
                  rows={15}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>
            )}

            {/* 导入Word */}
            {creationMethod === 'import' && (
              <div>
                <Alert
                  message="导入Word文档"
                  description='请返回主界面，点击"导入模板"按钮上传Word文件'
                  type="warning"
                  showIcon
                />
              </div>
            )}
          </div>
        )}

        {/* 步骤3：预览效果 */}
        {current === 2 && (
          <div>
            <Title level={4}>第三步：预览效果</Title>
            
            <Alert
              message="👀 这是使用测试数据生成的预览效果"
              description="实际使用时，这些内容会自动替换为真实的订单数据"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Card 
              size="small" 
              style={{ 
                maxHeight: 500, 
                overflow: 'auto',
                background: '#f5f5f5',
                border: '2px dashed #d9d9d9'
              }}
            >
              <div 
                style={{ 
                  background: 'white', 
                  padding: 20,
                  minHeight: 400
                }}
                dangerouslySetInnerHTML={{ __html: previewHtml }} 
              />
            </Card>
          </div>
        )}

        {/* 步骤4：完成 */}
        {current === 3 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 72, color: '#52c41a', marginBottom: 20 }}>✅</div>
            <Title level={3}>模板创建成功！</Title>
            <Paragraph style={{ fontSize: 16, color: '#666', marginTop: 16 }}>
              您的模板已保存，现在可以在业务流程中使用了
            </Paragraph>
            
            <div style={{ marginTop: 40, textAlign: 'left', maxWidth: 500, margin: '40px auto' }}>
              <Alert
                message="🎯 如何使用这个模板？"
                description={
                  <ol style={{ marginLeft: 20, marginTop: 10 }}>
                    <li>进入订单管理页面</li>
                    <li>打开任意订单详情</li>
                    <li>在相关操作标签页选择这个模板</li>
                    <li>点击【预览】或【打印】按钮</li>
                  </ol>
                }
                type="success"
                showIcon
              />
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onCancel}>取消</Button>
        <Space>
          {current > 0 && current < 3 && (
            <Button onClick={handlePrev}>上一步</Button>
          )}
          {current < 2 && (
            <Button type="primary" onClick={handleNext}>下一步</Button>
          )}
          {current === 2 && (
            <Button type="primary" onClick={handleFinish}>完成创建</Button>
          )}
          {current === 3 && (
            <Button type="primary" onClick={onCancel}>关闭</Button>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default TemplateWizard;

