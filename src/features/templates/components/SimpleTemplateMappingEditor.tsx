/**
 * 简易模板映射编辑器 - 为非专业人士设计
 * 通过可视化界面配置模板变量，无需了解技术细节
 */

import React, { useState, useMemo } from 'react';
import { Card, Form, Select, Input, Button, Space, Table, Tag, Collapse, Alert, Tooltip, Typography, Row, Col } from 'antd';
import { InfoCircleOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { Template, TemplateType } from '../types';

const { Option } = Select;
const { Panel } = Collapse;
const { Text, Title } = Typography;

interface Props {
  template: Template;
  onSave?: (mappings: VariableMapping[]) => void;
}

// 变量映射配置
export interface VariableMapping {
  variable: string;           // 占位符名称（如 customer_name）
  label: string;              // 中文标签（如 "客户名称"）
  source: 'order' | 'system' | 'custom';  // 数据来源
  field?: string;             // 字段名（如果是订单数据）
  customValue?: string;       // 自定义值
  description?: string;       // 说明
}

// 预定义的字段映射配置
const FIELD_DEFINITIONS: Record<TemplateType, Record<string, { label: string; description: string; source: 'order' | 'system'; field?: string }>> = {
  '合同': {
    contract_number: { label: '合同编号', description: '订单的合同编号', source: 'order', field: 'contractNumber' },
    customer_name: { label: '客户名称', description: '承租方公司名称', source: 'order', field: 'customerName' },
    lessor_name: { label: '出租方名称', description: '我方公司名称', source: 'order', field: 'vendorName' },
    lessee_name: { label: '承租方名称', description: '客户公司名称', source: 'order', field: 'customerName' },
    project_name: { label: '项目名称', description: '施工项目名称', source: 'order', field: 'projectName' },
    delivery_location: { label: '交机地点', description: '设备交付位置', source: 'order', field: 'deliveryLocation' },
    payment_agreement: { label: '支付约定', description: '付款方式说明', source: 'order', field: 'paymentTerms' },
    month_calc_method: { label: '月份计算方式', description: '自然月或30天', source: 'order', field: 'monthCalculationMethod' },
    print_date: { label: '打印日期', description: '今天的日期', source: 'system' },
  },
  '进场': {
    entry_number: { label: '进场单号', description: '自动生成', source: 'system' },
    contract_name: { label: '合同名称', description: '关联的合同', source: 'order', field: 'contractNumber' },
    customer_name: { label: '客户名称', description: '承租方名称', source: 'order', field: 'customerName' },
    project_name: { label: '项目名称', description: '施工项目', source: 'order', field: 'projectName' },
    delivery_location: { label: '交车位置', description: '设备送达地点', source: 'order', field: 'deliveryLocation' },
    logistics_type: { label: '物流类型', description: '自送/第三方等', source: 'order', field: 'logisticsType' },
    store_name: { label: '出库门店', description: '设备所属门店', source: 'order', field: 'storeName' },
    entry_current_count: { label: '本次进场台数', description: '本批次数量', source: 'system' },
    rented_total_count: { label: '累计在租台数', description: '总在租数', source: 'system' },
    lessor_name: { label: '出租方', description: '我方公司', source: 'order', field: 'vendorName' },
    lessee_name: { label: '承租方', description: '客户公司', source: 'order', field: 'customerName' },
    print_date: { label: '打印日期', description: '今天的日期', source: 'system' },
  },
  '退场': {
    exit_number: { label: '退场单号', description: '自动生成', source: 'system' },
    customer_name: { label: '客户名称', description: '承租方名称', source: 'order', field: 'customerName' },
    project_name: { label: '项目名称', description: '施工项目', source: 'order', field: 'projectName' },
    pickup_location: { label: '收车位置', description: '设备回收地点', source: 'order', field: 'deliveryLocation' },
    return_store_name: { label: '回库门店', description: '设备返回门店', source: 'order', field: 'storeName' },
    logistics_type: { label: '物流类型', description: '自提/第三方等', source: 'order', field: 'logisticsType' },
    driver_name: { label: '司机姓名', description: '运输司机', source: 'custom' },
    settlement_date: { label: '租金结算日期', description: '最后结算日', source: 'order', field: 'settlementDate' },
    lessor_name: { label: '出租方', description: '我方公司', source: 'order', field: 'vendorName' },
    lessee_name: { label: '承租方', description: '客户公司', source: 'order', field: 'customerName' },
    print_date: { label: '打印日期', description: '今天的日期', source: 'system' },
  },
  '结算': {
    period_start: { label: '结算周期开始', description: '本期开始日期', source: 'order', field: 'settlementPeriodStart' },
    period_end: { label: '结算周期结束', description: '本期结束日期', source: 'order', field: 'settlementPeriodEnd' },
    customer_name: { label: '客户名称', description: '承租方名称', source: 'order', field: 'customerName' },
    project_name: { label: '项目名称', description: '施工项目', source: 'order', field: 'projectName' },
    total_amount: { label: '本期应付金额', description: '本次结算总额', source: 'order', field: 'totalAmount' },
    total_outstanding: { label: '累计欠款总额', description: '历史欠款', source: 'order', field: 'outstandingAmount' },
    lessor_name: { label: '出租方', description: '我方公司', source: 'order', field: 'vendorName' },
    lessee_name: { label: '承租方', description: '客户公司', source: 'order', field: 'customerName' },
    print_date: { label: '打印日期', description: '今天的日期', source: 'system' },
  },
  '索赔': {
    claim_number: { label: '索赔单号', description: '自动生成', source: 'system' },
    customer_name: { label: '客户名称', description: '承租方名称', source: 'order', field: 'customerName' },
    project_name: { label: '项目名称', description: '施工项目', source: 'order', field: 'projectName' },
    claim_date: { label: '索赔日期', description: '提出索赔日', source: 'system' },
    claim_reason: { label: '索赔原因', description: '损坏原因说明', source: 'custom' },
    claim_amount: { label: '索赔金额', description: '赔偿总额', source: 'custom' },
    lessor_name: { label: '出租方', description: '我方公司', source: 'order', field: 'vendorName' },
    lessee_name: { label: '承租方', description: '客户公司', source: 'order', field: 'customerName' },
    print_date: { label: '打印日期', description: '今天的日期', source: 'system' },
  },
  '报停': {
    suspension_number: { label: '报停单号', description: '自动生成', source: 'system' },
    customer_name: { label: '客户名称', description: '承租方名称', source: 'order', field: 'customerName' },
    project_name: { label: '项目名称', description: '施工项目', source: 'order', field: 'projectName' },
    suspension_start_date: { label: '报停开始日期', description: '停租开始', source: 'custom' },
    suspension_end_date: { label: '报停结束日期', description: '预计结束', source: 'custom' },
    suspension_reason: { label: '报停原因', description: '停租原因说明', source: 'custom' },
    lessor_name: { label: '出租方', description: '我方公司', source: 'order', field: 'vendorName' },
    lessee_name: { label: '承租方', description: '客户公司', source: 'order', field: 'customerName' },
    print_date: { label: '打印日期', description: '今天的日期', source: 'system' },
  },
};

// 从模板内容中提取变量
function extractVariables(content: string): string[] {
  const vars = new Set<string>();
  const regex = /{{\s*(\w+)(?:\|[\w]+)?\s*}}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars).filter(v => v !== 'index' && v !== 'each' && v !== 'if');
}

const SimpleTemplateMappingEditor: React.FC<Props> = ({ template, onSave }) => {
  const [form] = Form.useForm();
  
  // 提取模板中的变量
  const variables = useMemo(() => extractVariables(template.content), [template.content]);
  
  // 获取字段定义
  const fieldDefs = FIELD_DEFINITIONS[template.type] || {};
  
  // 分类变量
  const categorizedVariables = useMemo(() => {
    const auto: string[] = [];     // 自动填充（系统）
    const fromOrder: string[] = []; // 从订单获取
    const needCustom: string[] = []; // 需要自定义
    
    variables.forEach(v => {
      const def = fieldDefs[v];
      if (!def) {
        needCustom.push(v);
      } else if (def.source === 'system') {
        auto.push(v);
      } else if (def.source === 'order') {
        fromOrder.push(v);
      } else {
        needCustom.push(v);
      }
    });
    
    return { auto, fromOrder, needCustom };
  }, [variables, fieldDefs]);
  
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const mappings: VariableMapping[] = variables.map(v => {
        const def = fieldDefs[v];
        return {
          variable: v,
          label: def?.label || v,
          source: def?.source || 'custom',
          field: def?.field,
          customValue: values[v],
          description: def?.description,
        };
      });
      
      onSave?.(mappings);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };
  
  return (
    <div style={{ padding: 16 }}>
      <Alert
        message="💡 温馨提示"
        description={
          <div>
            <p>模板中的内容会自动填充，大部分信息来自订单数据，您无需手动配置。</p>
            <p>只有少数特殊字段需要您在使用时填写。</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Row gutter={16}>
        {/* 左侧：模板信息 */}
        <Col span={8}>
          <Card size="small" title="📋 模板信息">
            <div style={{ lineHeight: 2 }}>
              <div><Text strong>模板名称：</Text>{template.name}</div>
              <div><Text strong>单据类型：</Text><Tag color="blue">{template.type}</Tag></div>
              <div><Text strong>变量总数：</Text>{variables.length} 个</div>
            </div>
          </Card>
          
          <Card size="small" title="📊 数据来源统计" style={{ marginTop: 16 }}>
            <div style={{ lineHeight: 2 }}>
              <div>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                <Text>自动填充：{categorizedVariables.auto.length} 个</Text>
              </div>
              <div>
                <CheckCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                <Text>订单数据：{categorizedVariables.fromOrder.length} 个</Text>
              </div>
              {categorizedVariables.needCustom.length > 0 && (
                <div>
                  <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  <Text>需要填写：{categorizedVariables.needCustom.length} 个</Text>
                </div>
              )}
            </div>
          </Card>
        </Col>
        
        {/* 右侧：变量配置 */}
        <Col span={16}>
          <Card size="small" title="🔧 变量配置说明">
            <Form form={form} layout="vertical">
              <Collapse defaultActiveKey={categorizedVariables.needCustom.length > 0 ? ['custom'] : []}>
                {/* 自动填充的变量 */}
                {categorizedVariables.auto.length > 0 && (
                  <Panel 
                    header={
                      <span>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        自动填充（{categorizedVariables.auto.length}个）- 无需配置
                      </span>
                    } 
                    key="auto"
                  >
                    <Alert
                      message="这些信息由系统自动生成，无需您配置"
                      type="success"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={categorizedVariables.auto.map(v => ({
                        key: v,
                        variable: v,
                        label: fieldDefs[v]?.label || v,
                        description: fieldDefs[v]?.description || '',
                      }))}
                      columns={[
                        { title: '字段', dataIndex: 'label', width: 150 },
                        { title: '说明', dataIndex: 'description' },
                        { 
                          title: '来源', 
                          key: 'source',
                          width: 100,
                          render: () => <Tag color="green">系统自动</Tag>
                        },
                      ]}
                    />
                  </Panel>
                )}
                
                {/* 从订单获取的变量 */}
                {categorizedVariables.fromOrder.length > 0 && (
                  <Panel 
                    header={
                      <span>
                        <CheckCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                        订单数据（{categorizedVariables.fromOrder.length}个）- 自动获取
                      </span>
                    } 
                    key="order"
                  >
                    <Alert
                      message="这些信息从订单中自动获取，无需您配置"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={categorizedVariables.fromOrder.map(v => ({
                        key: v,
                        variable: v,
                        label: fieldDefs[v]?.label || v,
                        description: fieldDefs[v]?.description || '',
                        field: fieldDefs[v]?.field || '',
                      }))}
                      columns={[
                        { title: '字段', dataIndex: 'label', width: 150 },
                        { title: '说明', dataIndex: 'description' },
                        { 
                          title: '来源', 
                          dataIndex: 'field',
                          width: 150,
                          render: (field) => <Tag color="blue">订单.{field}</Tag>
                        },
                      ]}
                    />
                  </Panel>
                )}
                
                {/* 需要自定义的变量 */}
                {categorizedVariables.needCustom.length > 0 && (
                  <Panel 
                    header={
                      <span>
                        <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                        需要填写（{categorizedVariables.needCustom.length}个）- 使用时输入
                      </span>
                    } 
                    key="custom"
                  >
                    <Alert
                      message="这些信息需要在生成单据时由您填写"
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    {categorizedVariables.needCustom.map(v => {
                      const def = fieldDefs[v];
                      return (
                        <Form.Item
                          key={v}
                          name={v}
                          label={
                            <Space>
                              <Text>{def?.label || v}</Text>
                              {def?.description && (
                                <Tooltip title={def.description}>
                                  <InfoCircleOutlined style={{ color: '#999' }} />
                                </Tooltip>
                              )}
                            </Space>
                          }
                        >
                          <Input 
                            placeholder={`请在使用模板时填写${def?.label || v}`}
                            disabled
                            addonAfter="使用时填写"
                          />
                        </Form.Item>
                      );
                    })}
                  </Panel>
                )}
              </Collapse>
              
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Space>
                  <Button type="primary" onClick={handleSave}>
                    确认配置
                  </Button>
                  <Button>取消</Button>
                </Space>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SimpleTemplateMappingEditor;

