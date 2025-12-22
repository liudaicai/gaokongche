/**
 * 模板系统快速参考卡片
 * 为用户提供快速帮助信息
 */

import React from 'react';
import { Card, Collapse, Tag, Typography, Table, Alert } from 'antd';
import type { CollapseProps } from 'antd';
import { QuestionCircleOutlined, BulbOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph, Title } = Typography;

const QuickReferenceCard: React.FC = () => {
  // 变量说明数据
  const autoVariables = [
    { name: 'print_date', desc: '打印日期', example: '2024-01-15' },
    { name: 'entry_number', desc: '进场单号', example: 'ENTRY2024011501' },
    { name: 'exit_number', desc: '退场单号', example: 'EXIT2024011502' },
    { name: 'settlement_number', desc: '结算单号', example: 'SETTLE2024011503' },
  ];

  const orderVariables = [
    { name: 'customer_name', desc: '客户名称', field: 'customerName' },
    { name: 'project_name', desc: '项目名称', field: 'projectName' },
    { name: 'contract_number', desc: '合同编号', field: 'contractNumber' },
    { name: 'delivery_location', desc: '交机地点', field: 'deliveryLocation' },
    { name: 'lessor_name', desc: '出租方名称', field: 'vendorName' },
    { name: 'lessee_name', desc: '承租方名称', field: 'customerName' },
  ];

  const customVariables = [
    { name: 'driver_name', desc: '司机姓名', usage: '进场单、退场单' },
    { name: 'claim_reason', desc: '索赔原因', usage: '索赔单' },
    { name: 'suspension_reason', desc: '报停原因', usage: '报停单' },
  ];

  const collapseItems: CollapseProps['items'] = [
    // 快速开始
    {
      key: 'quick-start',
      label: (
        <span>
          <BulbOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          <strong>快速开始 - 3步创建模板</strong>
        </span>
      ),
      children: (
        <>
          <Alert
            message="推荐使用向导模式创建模板"
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <div style={{ lineHeight: 2.2 }}>
            <div><Tag color="blue">步骤1</Tag> 点击【🧙 向导模式创建】按钮</div>
            <div><Tag color="blue">步骤2</Tag> 填写模板名称和单据类型</div>
            <div><Tag color="blue">步骤3</Tag> 选择预设模板或自己编写内容</div>
            <div style={{ marginTop: 16, color: '#666' }}>
              ✅ 系统会自动处理数据映射，大部分字段无需配置<br />
              ✅ 只有特殊字段（如司机姓名）需要在使用时填写
            </div>
          </div>
        </>
      ),
    },
    // 变量说明
    {
      key: 'variables',
      label: (
        <span>
          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
          <strong>模板变量说明</strong>
        </span>
      ),
      children: (
        <>
          <Title level={5}>✅ 自动填充变量（系统生成）</Title>
          <Table
            size="small"
            pagination={false}
            dataSource={autoVariables}
            rowKey="name"
            columns={[
              { title: '变量名', dataIndex: 'name', render: (text) => <Tag>{`{{${text}}}`}</Tag> },
              { title: '说明', dataIndex: 'desc' },
              { title: '示例值', dataIndex: 'example' },
            ]}
            style={{ marginBottom: 20 }}
          />

          <Title level={5}>✅ 订单数据变量（自动获取）</Title>
          <Table
            size="small"
            pagination={false}
            dataSource={orderVariables}
            rowKey="name"
            columns={[
              { title: '变量名', dataIndex: 'name', render: (text) => <Tag color="blue">{`{{${text}}}`}</Tag> },
              { title: '说明', dataIndex: 'desc' },
              { title: '订单字段', dataIndex: 'field' },
            ]}
            style={{ marginBottom: 20 }}
          />

          <Title level={5}>⚠️ 自定义变量（需要填写）</Title>
          <Table
            size="small"
            pagination={false}
            dataSource={customVariables}
            rowKey="name"
            columns={[
              { title: '变量名', dataIndex: 'name', render: (text) => <Tag color="orange">{`{{${text}}}`}</Tag> },
              { title: '说明', dataIndex: 'desc' },
              { title: '使用场景', dataIndex: 'usage' },
            ]}
          />
        </>
      ),
    },
    // 循环语法
    {
      key: 'loop',
      label: <strong>📋 设备清单循环语法</strong>,
      children: (
        <>
          <Paragraph>
            使用 <Text code>{'{{#each items}}'}</Text> 语法显示设备列表：
          </Paragraph>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto' }}>
{`<table>
  <tr>
    <th>序号</th>
    <th>设备类型</th>
    <th>高度</th>
    <th>日租金</th>
  </tr>
  {{#each items}}
  <tr>
    <td>{{index}}</td>
    <td>{{equipment_type}}</td>
    <td>{{height}}</td>
    <td>{{daily_price}}</td>
  </tr>
  {{/each}}
</table>`}
          </pre>
          <Paragraph style={{ marginTop: 12 }}>
            循环内可用字段：
          </Paragraph>
          <div style={{ lineHeight: 2 }}>
            <Tag>index</Tag> 序号（从1开始）<br />
            <Tag>equipment_code</Tag> 设备编号<br />
            <Tag>equipment_type</Tag> 设备类型<br />
            <Tag>height</Tag> 高度<br />
            <Tag>daily_price</Tag> 日租金<br />
            <Tag>monthly_rate</Tag> 月租金
          </div>
        </>
      ),
    },
    // 常见问题
    {
      key: 'faq',
      label: <strong>❓ 常见问题</strong>,
      children: (
        <div style={{ lineHeight: 2.2 }}>
          <div>
            <Text strong>Q：如何修改现有模板？</Text><br />
            <Text type="secondary">A：点击【维护】按钮，修改后保存，系统会自动创建新版本</Text>
          </div>
          <div style={{ marginTop: 16 }}>
            <Text strong>Q：改错了怎么办？</Text><br />
            <Text type="secondary">A：点击【版本历史】，选择正确版本回滚</Text>
          </div>
          <div style={{ marginTop: 16 }}>
            <Text strong>Q：如何添加公司Logo？</Text><br />
            <Text type="secondary">A：使用HTML的 &lt;img&gt; 标签插入图片</Text>
          </div>
          <div style={{ marginTop: 16 }}>
            <Text strong>Q：设备数量不固定怎么办？</Text><br />
            <Text type="secondary">A：使用 {'{{#each items}}'} 循环语法，系统会自动处理</Text>
          </div>
        </div>
      ),
    },
    // 最佳实践
    {
      key: 'best-practices',
      label: <strong>💡 最佳实践</strong>,
      children: (
        <div style={{ lineHeight: 2.2 }}>
          <Title level={5}>模板命名</Title>
          <div>
            ✅ 好的命名：<Tag color="green">公司标准合同模板-含税</Tag><br />
            ❌ 不好的命名：<Tag color="red">模板1</Tag>
          </div>

          <Title level={5} style={{ marginTop: 20 }}>模板设计</Title>
          <div>
            ✅ 保持简洁，只包含必要信息<br />
            ✅ 统一风格，各类单据保持一致<br />
            ✅ 预留签名、盖章位置<br />
            ✅ 注意A4纸张大小和页边距<br />
            ✅ 创建后先用测试订单预览
          </div>

          <Title level={5} style={{ marginTop: 20 }}>版本管理</Title>
          <div>
            ✅ 重大修改时建议先复制再修改<br />
            ✅ 在模板说明中注明修改内容<br />
            ✅ 定期清理不再使用的旧模板
          </div>
        </div>
      ),
    },
  ];

  return (
    <Card 
      title={
        <span>
          <QuestionCircleOutlined style={{ marginRight: 8 }} />
          模板系统快速参考
        </span>
      }
      size="small"
      style={{ maxWidth: 800, margin: '0 auto' }}
    >
      <Collapse items={collapseItems} />
    </Card>
  );
};

export default QuickReferenceCard;

