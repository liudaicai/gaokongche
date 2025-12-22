import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Button,
  Space,
  message,
  Collapse,
  Tag,
  Divider,
  Typography,
  Popconfirm,
  Spin,
  Row,
  Col,
  Select,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
  BellOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { apiGet, apiPut } from '../../api/client';

const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;

interface SettingItem {
  id: string;
  settingKey: string;
  settingName: string;
  settingValue: any;
  settingType: string;
  category: string;
  description: string;
  editable: boolean;
}

const ReminderSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingItem[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response: any = await apiGet('/reminder-settings');
      const data = response.data || response;
      
      if (Array.isArray(data) && data.length > 0) {
        setSettings(data);

        // 设置表单初始值
        const initialValues: Record<string, any> = {};
        data.forEach((setting: SettingItem) => {
          initialValues[setting.settingKey] = setting.settingValue;
        });
        form.setFieldsValue(initialValues);
      } else {
        console.error('未返回有效的设置数据');
        message.error('加载设置失败：未返回有效数据，请检查后端服务和数据库');
      }
    } catch (error: any) {
      console.error('加载设置错误:', error);
      const errorMsg = typeof error === 'string' ? error : (error?.message || '加载设置失败');
      message.error(`${errorMsg}。请确保：1)后端服务已启动 2)数据库表已创建`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      console.log('准备保存的值:', values);
      await apiPut('/reminder-settings', { settings: values });
      message.success('设置保存成功');
      loadSettings();
    } catch (error: any) {
      console.error('保存设置错误:', error);
      if (error?.errorFields) {
        message.error('请检查表单输入');
      } else {
        const errorMsg = typeof error === 'string' ? error : (error?.message || '保存失败');
        message.error(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    try {
      const response: any = await apiGet(`/reminder-settings/${key}`);
      const setting = response.data || response;
      
      // 重置单个字段
      form.setFieldsValue({ [key]: setting.settingValue });
      message.success('已重置为默认值');
    } catch (error: any) {
      console.error('重置错误:', error);
      const errorMsg = typeof error === 'string' ? error : (error?.message || '重置失败');
      message.error(errorMsg);
    }
  };

  const handleResetAll = async () => {
    try {
      // 为每个设置调用重置API
      for (const setting of settings) {
        if (setting.editable) {
          await apiGet(`/reminder-settings/${setting.settingKey}/reset`);
        }
      }
      message.success('所有设置已重置为默认值');
      loadSettings();
    } catch (error: any) {
      message.error(error || '批量重置失败');
    }
  };

  const renderDaysArrayField = (setting: SettingItem) => (
    <Form.Item
      name={setting.settingKey}
      label={
        <Space>
          <Text strong>{setting.settingName}</Text>
          <Popconfirm
            title="确定重置为默认值吗？"
            onConfirm={() => handleReset(setting.settingKey)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<ReloadOutlined />}>
              重置
            </Button>
          </Popconfirm>
        </Space>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {setting.description}
        </Text>
      }
      rules={[{ required: true, message: `请设置${setting.settingName}` }]}
    >
      <Select
        mode="tags"
        style={{ width: '100%' }}
        placeholder="输入天数后按回车添加"
        tokenSeparators={[',']}
        options={[1, 2, 3, 5, 7, 10, 15, 30, 60, 90].map((d) => ({
          label: `${d} 天`,
          value: d,
        }))}
      />
    </Form.Item>
  );

  const renderBooleanField = (setting: SettingItem) => (
    <Form.Item
      name={setting.settingKey}
      label={
        <Space>
          <Text strong>{setting.settingName}</Text>
          <Popconfirm
            title="确定重置为默认值吗？"
            onConfirm={() => handleReset(setting.settingKey)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<ReloadOutlined />}>
              重置
            </Button>
          </Popconfirm>
        </Space>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {setting.description}
        </Text>
      }
      valuePropName="checked"
    >
      <Switch checkedChildren="启用" unCheckedChildren="禁用" />
    </Form.Item>
  );

  const renderNumberField = (setting: SettingItem) => (
    <Form.Item
      name={setting.settingKey}
      label={
        <Space>
          <Text strong>{setting.settingName}</Text>
          <Popconfirm
            title="确定重置为默认值吗？"
            onConfirm={() => handleReset(setting.settingKey)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<ReloadOutlined />}>
              重置
            </Button>
          </Popconfirm>
        </Space>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          {setting.description}
        </Text>
      }
      rules={[
        { required: true, message: `请输入${setting.settingName}` },
        {
          validator: (_, value) => {
            if (value <= 0) {
              return Promise.reject(`${setting.settingName}必须大于0`);
            }
            return Promise.resolve();
          },
        },
      ]}
    >
      <InputNumber
        style={{ width: '100%' }}
        min={0}
        precision={setting.settingKey.includes('rate') ? 1 : 0}
      />
    </Form.Item>
  );

  const renderField = (setting: SettingItem) => {
    switch (setting.settingType) {
      case 'days_array':
        return renderDaysArrayField(setting);
      case 'boolean':
        return renderBooleanField(setting);
      case 'number':
        return renderNumberField(setting);
      default:
        return null;
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SettingItem[]>);

  const categoryConfig: Record<string, { title: string; icon: any; description: string }> = {
    equipment: {
      title: '设备提醒设置',
      icon: <SettingOutlined />,
      description: '设置设备到期和超期的提醒时间点',
    },
    billing: {
      title: '账单提醒设置',
      icon: <DollarOutlined />,
      description: '设置账单逾期提醒和付款相关参数',
    },
    contract: {
      title: '合同提醒设置',
      icon: <FileTextOutlined />,
      description: '设置合同到期提醒时间点',
    },
    system: {
      title: '通知设置',
      icon: <BellOutlined />,
      description: '配置邮件、短信等通知方式',
    },
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={3}>
              <SettingOutlined /> 提醒设置
            </Title>
            <Paragraph type="secondary">
              配置系统自动提醒的时间点和通知方式。修改后需要点击"保存设置"按钮才能生效。
            </Paragraph>
          </div>

          <Spin spinning={loading}>
            <Form form={form} layout="vertical">
              <Collapse
                defaultActiveKey={['equipment', 'billing', 'contract', 'system']}
                expandIconPosition="end"
              >
                {Object.entries(groupedSettings).map(([category, categorySettings]) => {
                  const config = categoryConfig[category] || {
                    title: category,
                    icon: <SettingOutlined />,
                    description: '',
                  };

                  return (
                    <Panel
                      key={category}
                      header={
                        <Space>
                          {config.icon}
                          <Text strong>{config.title}</Text>
                          <Tag color="blue">{categorySettings.length} 项</Tag>
                        </Space>
                      }
                      extra={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {config.description}
                        </Text>
                      }
                    >
                      <Row gutter={[16, 0]}>
                        {categorySettings.map((setting) => (
                          <Col span={24} key={setting.id}>
                            {renderField(setting)}
                          </Col>
                        ))}
                      </Row>
                    </Panel>
                  );
                })}
              </Collapse>
            </Form>
          </Spin>

          <Divider />

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Text type="secondary">
                <InfoCircleOutlined /> 修改后记得保存设置
              </Text>
            </Space>
            <Space>
              <Popconfirm
                title="确定重置所有设置为默认值吗？"
                description="此操作将重置所有可编辑的设置项"
                onConfirm={handleResetAll}
                okText="确定"
                cancelText="取消"
              >
                <Button icon={<ReloadOutlined />}>重置所有设置</Button>
              </Popconfirm>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
                size="large"
              >
                保存设置
              </Button>
            </Space>
          </Space>

          <Card
            style={{ backgroundColor: '#f0f5ff', border: '1px solid #adc6ff' }}
            size="small"
          >
            <Space direction="vertical">
              <Text strong>
                <BellOutlined /> 设置说明
              </Text>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>
                  <Text>
                    <strong>天数设置</strong>：支持多个时间点，例如设置 [7, 3, 1] 表示在到期前 7
                    天、3 天、1 天分别发送提醒
                  </Text>
                </li>
                <li>
                  <Text>
                    <strong>滞纳金费率</strong>：按千分之几每天计算，例如 1 表示 1‰/天（即
                    0.1%/天）
                  </Text>
                </li>
                <li>
                  <Text>
                    <strong>自动生成账单</strong>：启用后系统会在每月指定日期自动生成账单
                  </Text>
                </li>
                <li>
                  <Text>
                    <strong>通知方式</strong>：站内通知始终启用，邮件和短信需要配置相应服务才能使用
                  </Text>
                </li>
              </ul>
            </Space>
          </Card>
        </Space>
      </Card>
    </div>
  );
};

export default ReminderSettings;

// InfoCircleOutlined 组件
const InfoCircleOutlined = () => (
  <span role="img" aria-label="info-circle" style={{ color: '#1890ff' }}>
    ℹ️
  </span>
);

