/**
 * 用户提醒设置页面 - 重新设计版 (垂直Tabs + 现代化卡片)
 */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card,
  Form,
  Switch,
  TimePicker,
  Input,
  Button,
  Space,
  Row,
  Col,
  App,
  Typography,
  Tabs,
  Badge,
  Avatar,
  Tag,
  Divider
} from 'antd';
import {
  SaveOutlined,
  BellOutlined,
  MailOutlined,
  PhoneOutlined,
  WechatOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  NotificationOutlined,
  AppstoreOutlined,
  UndoOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  RightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AppDispatch } from '../../../app/store';
import {
  fetchUserSettings,
  updateUserSettings,
  selectUserSettings,
  selectSettingsLoading
} from '../remindersSlice';
import { RULE_TYPE_LABELS } from '../types';

const { Title, Text, Paragraph } = Typography;

const UserSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const { message } = App.useApp();

  const settings = useSelector(selectUserSettings);
  const loading = useSelector(selectSettingsLoading);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('channels');

  // 样式定义
  const styles = {
    pageContainer: {
      padding: '24px',
      background: '#f5f7fa',
      minHeight: '100vh',
    },
    mainCard: {
      borderRadius: '16px',
      border: 'none',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      minHeight: '600px',
    },
    leftPanel: {
      borderRight: '1px solid #f0f0f0',
      height: '100%',
      padding: '24px 0',
    },
    rightPanel: {
      padding: '32px 40px',
      height: '100%',
    },
    tabItem: (isActive: boolean) => ({
      padding: '16px 24px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: isActive ? '#e6f7ff' : 'transparent',
      borderRight: isActive ? '3px solid #1890ff' : '3px solid transparent',
      transition: 'all 0.3s',
      marginBottom: '8px',
    }),
    tabIcon: (isActive: boolean) => ({
      fontSize: '18px',
      marginRight: '12px',
      color: isActive ? '#1890ff' : '#8c8c8c',
    }),
    tabTitle: (isActive: boolean) => ({
      fontWeight: isActive ? 600 : 400,
      color: isActive ? '#1890ff' : '#595959',
      fontSize: '15px',
    }),
    channelCard: (enabled: boolean) => ({
      border: enabled ? '1px solid #1890ff' : '1px solid #f0f0f0',
      borderRadius: '12px',
      padding: '24px',
      background: enabled ? '#f0f5ff' : '#fff',
      transition: 'all 0.3s',
      height: '100%',
      cursor: 'pointer',
      position: 'relative' as const,
    }),
    channelIconWrapper: (color: string, enabled: boolean) => ({
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: enabled ? color : '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px',
      transition: 'all 0.3s',
    }),
    subscriptionItem: (selected: boolean) => ({
      padding: '16px',
      borderRadius: '8px',
      border: selected ? '1px solid #1890ff' : '1px solid #f0f0f0',
      background: selected ? '#f0f5ff' : '#fff',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    })
  };

  useEffect(() => {
    dispatch(fetchUserSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        isEnabled: settings.isEnabled,
        quietTimeStart: settings.quietTimeStart ? dayjs(settings.quietTimeStart, 'HH:mm:ss') : null,
        quietTimeEnd: settings.quietTimeEnd ? dayjs(settings.quietTimeEnd, 'HH:mm:ss') : null,
        enableSystemNotification: settings.enableSystemNotification,
        enableEmailNotification: settings.enableEmailNotification,
        enableSmsNotification: settings.enableSmsNotification,
        enableWechatNotification: settings.enableWechatNotification,
        email: settings.email,
        phone: settings.phone,
        wechatOpenid: settings.wechatOpenid,
        reminderTypeSettings: settings.reminderTypeSettings || {}
      });
    }
  }, [settings, form]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();

      const data: any = {
        ...values,
        quietTimeStart: values.quietTimeStart ? values.quietTimeStart.format('HH:mm:ss') : null,
        quietTimeEnd: values.quietTimeEnd ? values.quietTimeEnd.format('HH:mm:ss') : null
      };

      await dispatch(updateUserSettings(data)).unwrap();
      message.success('设置保存成功');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 自定义左侧导航项
  const NavItem = ({ id, icon, title, desc }: { id: string, icon: React.ReactNode, title: string, desc: string }) => (
    <div 
      style={styles.tabItem(activeTab === id)}
      onClick={() => setActiveTab(id)}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={styles.tabIcon(activeTab === id)}>{icon}</div>
        <div>
          <div style={styles.tabTitle(activeTab === id)}>{title}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{desc}</div>
        </div>
      </div>
      <RightOutlined style={{ fontSize: '12px', color: activeTab === id ? '#1890ff' : '#ccc' }} />
    </div>
  );

  return (
    <div style={styles.pageContainer}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 600 }}>提醒设置</Title>
            <Text type="secondary">管理您的通知接收方式和订阅内容</Text>
          </div>
          <Space>
            <Button icon={<UndoOutlined />} onClick={() => form.resetFields()}>重置</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} size="large" style={{ padding: '0 32px' }}>
              保存更改
            </Button>
          </Space>
        </div>

        <Card style={styles.mainCard} bodyStyle={{ padding: 0 }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              isEnabled: true,
              enableSystemNotification: true,
              enableEmailNotification: false,
              enableSmsNotification: false,
              enableWechatNotification: false
            }}
          >
            <Row style={{ minHeight: '600px' }}>
              {/* 左侧导航栏 */}
              <Col width="280px" style={{ flex: '0 0 280px', ...styles.leftPanel }}>
                <div style={{ padding: '0 24px 24px 24px' }}>
                  <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Settings Menu
                  </Text>
                </div>
                
                <NavItem 
                  id="channels" 
                  icon={<NotificationOutlined />} 
                  title="通知渠道" 
                  desc="管理接收通知的方式" 
                />
                <NavItem 
                  id="subscriptions" 
                  icon={<AppstoreOutlined />} 
                  title="订阅管理" 
                  desc="选择您关注的业务类型" 
                />
                <NavItem 
                  id="general" 
                  icon={<GlobalOutlined />} 
                  title="通用设置" 
                  desc="免打扰与全局开关" 
                />
              </Col>

              {/* 右侧内容区 */}
              <Col style={{ flex: 1, ...styles.rightPanel }}>
                
                {/* 1. 通知渠道面板 */}
                <div style={{ display: activeTab === 'channels' ? 'block' : 'none' }}>
                  <Title level={4} style={{ marginBottom: '24px' }}>通知渠道配置</Title>
                  
                  <Row gutter={[24, 24]}>
                    {/* 系统通知 */}
                    <Col span={12}>
                      <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue, setFieldsValue }) => {
                          const enabled = getFieldValue('enableSystemNotification');
                          return (
                            <div 
                              style={styles.channelCard(enabled)}
                              onClick={() => setFieldsValue({ enableSystemNotification: !enabled })}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={styles.channelIconWrapper('#e6f7ff', enabled)}>
                                  <BellOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                                </div>
                                <Form.Item name="enableSystemNotification" valuePropName="checked" noStyle>
                                  <Switch />
                                </Form.Item>
                              </div>
                              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>系统站内信</Text>
                              <Text type="secondary">在系统顶部的通知中心接收实时消息提醒。</Text>
                            </div>
                          );
                        }}
                      </Form.Item>
                    </Col>

                    {/* 邮件通知 */}
                    <Col span={12}>
                      <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue, setFieldsValue }) => {
                          const enabled = getFieldValue('enableEmailNotification');
                          return (
                            <div style={styles.channelCard(enabled)}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={styles.channelIconWrapper('#fff7e6', enabled)}>
                                  <MailOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                                </div>
                                <Form.Item name="enableEmailNotification" valuePropName="checked" noStyle>
                                  <Switch />
                                </Form.Item>
                              </div>
                              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>邮件通知</Text>
                              <Form.Item name="email" noStyle>
                                <Input 
                                  placeholder="输入邮箱地址" 
                                  bordered={false}
                                  disabled={!enabled}
                                  style={{ padding: 0, borderBottom: '1px solid #d9d9d9', borderRadius: 0 }}
                                />
                              </Form.Item>
                            </div>
                          );
                        }}
                      </Form.Item>
                    </Col>

                    {/* 短信通知 */}
                    <Col span={12}>
                      <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue, setFieldsValue }) => {
                          const enabled = getFieldValue('enableSmsNotification');
                          return (
                            <div style={styles.channelCard(enabled)}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={styles.channelIconWrapper('#f6ffed', enabled)}>
                                  <PhoneOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                                </div>
                                <Form.Item name="enableSmsNotification" valuePropName="checked" noStyle>
                                  <Switch />
                                </Form.Item>
                              </div>
                              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>短信通知</Text>
                              <Form.Item name="phone" noStyle>
                                <Input 
                                  placeholder="输入手机号码" 
                                  bordered={false}
                                  disabled={!enabled}
                                  style={{ padding: 0, borderBottom: '1px solid #d9d9d9', borderRadius: 0 }}
                                />
                              </Form.Item>
                            </div>
                          );
                        }}
                      </Form.Item>
                    </Col>

                    {/* 微信通知 */}
                    <Col span={12}>
                      <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue, setFieldsValue }) => {
                          const enabled = getFieldValue('enableWechatNotification');
                          return (
                            <div style={styles.channelCard(enabled)}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={styles.channelIconWrapper('#e6f7ff', enabled)}>
                                  <WechatOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                                </div>
                                <Form.Item name="enableWechatNotification" valuePropName="checked" noStyle>
                                  <Switch />
                                </Form.Item>
                              </div>
                              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>微信通知</Text>
                              <Form.Item name="wechatOpenid" noStyle>
                                <Input 
                                  placeholder="需先在个人中心绑定" 
                                  bordered={false}
                                  disabled
                                  style={{ padding: 0, borderBottom: '1px solid #d9d9d9', borderRadius: 0, color: '#999' }}
                                />
                              </Form.Item>
                            </div>
                          );
                        }}
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                {/* 2. 订阅管理面板 */}
                <div style={{ display: activeTab === 'subscriptions' ? 'block' : 'none' }}>
                  <Title level={4} style={{ marginBottom: '8px' }}>业务订阅</Title>
                  <Paragraph type="secondary" style={{ marginBottom: '24px' }}>
                    选择您关注的业务类型，系统将仅为您推送已勾选类型的提醒通知。
                  </Paragraph>

                  <Form.Item name="reminderTypeSettings" shouldUpdate>
                    {({ getFieldValue, setFieldsValue }) => {
                      const currentValues = getFieldValue('reminderTypeSettings') || [];
                      const toggle = (key: string) => {
                        const newValues = { ...currentValues };
                        // Checkbox.Group usually returns array of values, but here we might need to handle object if logic differs
                        // Assuming currentValues is array from Checkbox.Group
                        // Let's use Checkbox.Group natively for simpler state management
                      };
                      
                      return (
                        <Row gutter={[16, 16]}>
                          <Form.Item name="reminderTypeSettings" noStyle>
                            <Checkbox.Group style={{ width: '100%' }}>
                              <Row gutter={[16, 16]}>
                                {Object.entries(RULE_TYPE_LABELS).map(([key, label]) => (
                                  <Col span={8} key={key}>
                                    <div className="subscription-card-wrapper">
                                      {/* Hack: Render Checkbox inside a custom div and style it */}
                                      <Checkbox value={key} style={{ width: '100%', height: '100%' }}>
                                        {/* This text is rendered by Checkbox */}
                                      </Checkbox>
                                      {/* Custom overlay to style the checkbox item nicely */}
                                      <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
                                        display: 'flex', alignItems: 'center', padding: '16px',
                                        // We can't easily style the native checkbox this way without complex CSS or state mapping.
                                        // Let's fallback to standard mapping but with nice style.
                                      }} />
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            </Checkbox.Group>
                          </Form.Item>
                          
                          {/* Re-implementing with manual state control for better UI */}
                          {Object.entries(RULE_TYPE_LABELS).map(([key, label]) => {
                             // Access form data to check if selected
                             // Note: Antd Form Checkbox.Group uses an array of strings for values
                             const selected = (getFieldValue('reminderTypeSettings') || []).includes(key);
                             return (
                               <Col span={8} key={key}>
                                 <div 
                                   style={styles.subscriptionItem(selected)}
                                   onClick={() => {
                                     const current = getFieldValue('reminderTypeSettings') || [];
                                     const next = current.includes(key) 
                                       ? current.filter((k: string) => k !== key)
                                       : [...current, key];
                                     setFieldsValue({ reminderTypeSettings: next });
                                   }}
                                 >
                                   <Space>
                                      <Tag color={selected ? 'blue' : 'default'}>
                                        {selected ? <CheckCircleFilled /> : <div style={{ width: 12, height: 12 }} />}
                                      </Tag>
                                      <span style={{ fontWeight: selected ? 500 : 400 }}>{label}</span>
                                   </Space>
                                 </div>
                               </Col>
                             );
                          })}
                          {/* Hidden actual form item to hold value */}
                          <div style={{ display: 'none' }}>
                             <Form.Item name="reminderTypeSettings">
                               <Checkbox.Group />
                             </Form.Item>
                          </div>
                        </Row>
                      );
                    }}
                  </Form.Item>
                </div>

                {/* 3. 通用设置面板 */}
                <div style={{ display: activeTab === 'general' ? 'block' : 'none' }}>
                  <Title level={4} style={{ marginBottom: '24px' }}>通用设置</Title>
                  
                  <Card bordered={false} style={{ background: '#f9f9f9', borderRadius: '12px' }}>
                    <Row align="middle" justify="space-between">
                      <Col>
                        <Title level={5} style={{ margin: 0 }}>启用智能提醒</Title>
                        <Text type="secondary">关闭后将不再接收任何系统的自动提醒消息</Text>
                      </Col>
                      <Col>
                        <Form.Item name="isEnabled" valuePropName="checked" noStyle>
                          <Switch size="default" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>

                  <Divider />

                  <Title level={5} style={{ marginBottom: '16px' }}>
                    <ClockCircleOutlined style={{ marginRight: '8px' }} />
                    免打扰时段
                  </Title>
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item
                        label="开始时间"
                        name="quietTimeStart"
                        tooltip="在此时间段内不发送提醒"
                      >
                        <TimePicker
                          style={{ width: '100%' }}
                          format="HH:mm"
                          placeholder="例如 22:00"
                          size="large"
                          popupClassName="hide-disabled-options"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="结束时间"
                        name="quietTimeEnd"
                      >
                        <TimePicker
                          style={{ width: '100%' }}
                          format="HH:mm"
                          placeholder="例如 08:00"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

              </Col>
            </Row>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default UserSettingsPage;
