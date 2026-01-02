import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Drawer, Form, Input, Select, Upload, Button, Space, Card, Spin, notification, Empty, Row, Col, Divider, Typography, Avatar, Alert, Modal, App } from 'antd';
import { UploadOutlined, MinusCircleOutlined, PlusCircleOutlined, UserOutlined, ShopOutlined, PhoneOutlined, IdcardOutlined, HomeOutlined, UserSwitchOutlined, CreditCardOutlined, FileAddOutlined, EnvironmentOutlined, FileTextOutlined, PlusOutlined, ScanOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { API_BASE, getAuthHeaders } from '../../api/client';
import type { AppDispatch, RootState } from '../../app/store';
import {
  Customer,
  EnterpriseCustomer
} from './customerSlice';
import { fetchStores, selectStores } from '../stores/storesSlice';
import { fetchUsers } from '../users/usersSlice';
import { recognizeIDCard, recognizeBusinessLicense, type IDCardOCRResult, type BusinessLicenseOCRResult } from '../../utils/ocr';
import { checkBlacklist } from '../blacklist/blacklistSlice';
import type { BlacklistRecord } from '../blacklist/types';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface AddCustomerModalProps {
  visible: boolean;
  customer: Customer | null;
  onCancel: () => void;
  onSuccess: (customerData: Customer | EnterpriseCustomer) => void;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ 
  visible, 
  customer, 
  onCancel, 
  onSuccess 
}) => {
  const { message: messageApi, modal } = App.useApp();
  const dispatch = useDispatch<AppDispatch>();
  const stores = useSelector(selectStores);
  const users = useSelector((state: RootState) => state.users?.users || []);
  const [form] = Form.useForm();
  const [customerType, setCustomerType] = useState<'personal' | 'enterprise'>('personal');
  const [contactForms, setContactForms] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<IDCardOCRResult | BusinessLicenseOCRResult | null>(null);

  // 加载门店与用户列表
  useEffect(() => {
    if (visible) {
      dispatch(fetchStores());
      dispatch(fetchUsers({ page: 1, pageSize: 100 }));
    }
  }, [visible, dispatch]);

  // 初始化表单数据
  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setTimeout(() => {
        if (customer) {
          // 编辑模式
          setCustomerType(customer.type);
          form.setFieldsValue({
            ...customer,
            ...(customer.type === 'personal' ? {
              name: customer.name,
              phone: customer.phone,
              idCardNumber: customer.idCardNumber
            } : {
              companyName: (customer as EnterpriseCustomer).companyName,
              creditCode: (customer as EnterpriseCustomer).creditCode,
              address: (customer as EnterpriseCustomer).address
            })
          });
          // 如果是企业客户，初始化联系人表单
          if (customer.type === 'enterprise') {
            const enterpriseCustomer = customer as EnterpriseCustomer;
            if (enterpriseCustomer.contacts && enterpriseCustomer.contacts.length > 0) {
              const ids = enterpriseCustomer.contacts.map((contact) => contact.id || `contact_${Date.now()}`);
              setContactForms(ids);

              const contactFields: Record<string, any> = {};
              enterpriseCustomer.contacts.forEach((contact, index) => {
                contactFields[`contactName_${index}`] = contact.name;
                contactFields[`contactPhone_${index}`] = contact.phone;
                contactFields[`contactPosition_${index}`] = contact.position;
              });
              form.setFieldsValue(contactFields);
            }
          }
        } else {
          // 添加模式
          form.resetFields();
          setCustomerType('personal');
          setContactForms([]);
        }
        setIsLoading(false);
      }, 300);
    }
  }, [visible, customer, form]);

  // 根据已有客户的名称映射到门店/员工ID（编辑模式）
  useEffect(() => {
    if (visible && customer) {
      const currentStoreId = (customer as any).regionStoreId || stores.find(s => s.name === ((customer as any).regionStoreName || (customer as any).region))?.id;
      const currentManagerId = (customer as any).businessManagerId || users.find((u: any) => u.name === ((customer as any).businessManagerName || (customer as any).businessManager))?.id;
      form.setFieldsValue({
        regionStoreId: currentStoreId,
        businessManagerId: currentManagerId,
      });
    }
  }, [visible, customer, stores, users, form]);

  // 处理客户类型变更
  const handleTypeChange = (type: 'personal' | 'enterprise') => {
    // 添加加载动画
    setIsLoading(true);
    setTimeout(() => {
      setCustomerType(type);
      form.resetFields(['name', 'phone', 'idCardNumber', 'companyName', 'creditCode', 'address']);
      setContactForms([]);
      setIsLoading(false);
    }, 300);
  };

  // 添加联系人
  const addContact = () => {
    setContactForms([...contactForms, `contact_${Date.now()}`]);
  };

  // 移除联系人
  const removeContact = (index: number) => {
    const newContactForms = [...contactForms];
    newContactForms.splice(index, 1);
    setContactForms(newContactForms);
  };

  // 自定义表单验证
  const validatePhone = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入手机号码'));
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(value)) {
      return Promise.reject(new Error('请输入正确的手机号码'));
    }
    return Promise.resolve();
  };

  const validateIdCard = (_: any, value: string) => {
    if (!value) {
      return Promise.resolve();
    }
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    if (!idCardRegex.test(value)) {
      return Promise.reject(new Error('请输入正确的身份证号码'));
    }
    return Promise.resolve();
  };

  const validateCreditCode = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入企业信用代码'));
    }
    const creditCodeRegex = /^[0-9A-Z]{18}$/;
    if (!creditCodeRegex.test(value)) {
      return Promise.reject(new Error('请输入正确的18位企业信用代码'));
    }
    return Promise.resolve();
  };

  // 上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    action: `${API_BASE}/upload`,
    headers: getAuthHeaders(),
    beforeUpload(file) {
      const isLessThan2M = file.size / 1024 / 1024 < 2;
      if (!isLessThan2M) {
        messageApi.error('文件大小不能超过2MB!');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    onChange(info) {
      const { status } = info.file;
      if (status === 'done') {
        const url = (info.file.response && (info.file.response.file?.url || info.file.response.url)) || info.file.url;
        if (url) {
          (info.file as any).url = url;
        }
        messageApi.success(`${info.file.name} 上传成功`);
      } else if (status === 'error') {
        messageApi.error(`${info.file.name} 上传失败`);
      }
    },
  };

  // Upload 与 Form 的值映射
  const normFile = (e: any) => {
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };

  // OCR 识别 - 身份证
  const handleIDCardOCR = async (file: File) => {
    setOcrProcessing(true);
    
    const handleProgress = (status: 'loading' | 'success' | 'error', msg: string) => {
      if (status === 'loading') {
        messageApi.loading({ content: msg, key: 'ocr', duration: 0 });
      } else if (status === 'success') {
        messageApi.success({ content: msg, key: 'ocr', duration: 2 });
      } else {
        messageApi.error({ content: msg, key: 'ocr', duration: 3 });
      }
    };
    
    try {
      const result = await recognizeIDCard(file, handleProgress);
      console.log('handleIDCardOCR 收到结果:', result);
      
      if (result) {
        setOcrResult(result);
        console.log('准备显示确认对话框');
        
        // 显示确认对话框
        modal.confirm({
          title: '识别成功',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          content: (
            <div>
              <p>已识别到以下信息，是否自动填充？</p>
              <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                {result.name && <div><strong>姓名：</strong>{result.name}</div>}
                {result.idNumber && <div><strong>身份证号：</strong>{result.idNumber}</div>}
                {result.gender && <div><strong>性别：</strong>{result.gender}</div>}
                {result.birth && <div><strong>出生日期：</strong>{result.birth}</div>}
                {result.address && <div><strong>地址：</strong>{result.address}</div>}
              </div>
            </div>
          ),
          onOk: () => {
            // 填充表单
            form.setFieldsValue({
              name: result.name || '',
              idCardNumber: result.idNumber || '',
            });
            
            // 将身份证图片添加到附件
            const currentAttachments = form.getFieldValue('attachments') || [];
            const fileObj: any = {
              uid: `id-card-${Date.now()}`,
              name: `身份证-${result.name || '未命名'}.${file.name.split('.').pop()}`,
              status: 'done',
              originFileObj: file,
              thumbUrl: URL.createObjectURL(file), // 创建预览URL
            };
            
            form.setFieldsValue({
              attachments: [...currentAttachments, fileObj]
            });
            
            messageApi.success('已自动填充表单并添加身份证附件');
          },
          onCancel: () => {
            console.log('用户取消自动填充');
          },
        });
      } else {
        console.warn('OCR返回结果为空');
        messageApi.warning('识别结果为空，请重试或手动输入');
      }
    } catch (error) {
      console.error('OCR识别失败:', error);
      messageApi.error('身份证识别失败，请手动输入');
    } finally {
      setOcrProcessing(false);
    }
  };

  // OCR 识别 - 营业执照
  const handleBusinessLicenseOCR = async (file: File) => {
    setOcrProcessing(true);
    
    const handleProgress = (status: 'loading' | 'success' | 'error', msg: string) => {
      if (status === 'loading') {
        messageApi.loading({ content: msg, key: 'ocr', duration: 0 });
      } else if (status === 'success') {
        messageApi.success({ content: msg, key: 'ocr', duration: 2 });
      } else {
        messageApi.error({ content: msg, key: 'ocr', duration: 3 });
      }
    };
    
    try {
      const result = await recognizeBusinessLicense(file, handleProgress);
      if (result) {
        setOcrResult(result);
        // 显示确认对话框
        modal.confirm({
          title: '识别成功',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          content: (
            <div>
              <p>已识别到以下信息，是否自动填充？</p>
              <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                {result.companyName && <div><strong>企业名称：</strong>{result.companyName}</div>}
                {result.creditCode && <div><strong>信用代码：</strong>{result.creditCode}</div>}
                {result.address && <div><strong>地址：</strong>{result.address}</div>}
                {result.legalPerson && <div><strong>法人：</strong>{result.legalPerson}</div>}
              </div>
            </div>
          ),
          onOk: () => {
            // 填充表单
            form.setFieldsValue({
              companyName: result.companyName || '',
              creditCode: result.creditCode || '',
              address: result.address || '',
            });
            
            // 将营业执照图片添加到附件
            const currentAttachments = form.getFieldValue('attachments') || [];
            const fileObj: any = {
              uid: `business-license-${Date.now()}`,
              name: `营业执照-${result.companyName || '未命名'}.${file.name.split('.').pop()}`,
              status: 'done',
              originFileObj: file,
              thumbUrl: URL.createObjectURL(file), // 创建预览URL
            };
            
            form.setFieldsValue({
              attachments: [...currentAttachments, fileObj]
            });
            
            messageApi.success('已自动填充表单并添加营业执照附件');
          },
        });
      }
    } catch (error) {
      console.error('OCR识别失败:', error);
    } finally {
      setOcrProcessing(false);
    }
  };

  // 检查黑名单
  const checkCustomerBlacklist = async (values: any): Promise<boolean> => {
    try {
      const checkParams: any = { context: '新增客户' };
      
      if (customerType === 'personal') {
        checkParams.customerName = values.name;
        checkParams.customerPhone = values.phone;
        checkParams.customerIdCard = values.idCardNumber;
      } else {
        checkParams.customerName = values.companyName;
      }
      
      const result = await dispatch(checkBlacklist(checkParams)).unwrap();
      
      if (result.isBlacklisted && result.records.length > 0) {
        // 显示黑名单警告
        return new Promise((resolve) => {
          const blacklistRecords = result.records;
          const getSeverityColor = (severity: string) => {
            switch (severity) {
              case 'critical': return '#d32f2f';
              case 'high': return '#f44336';
              case 'medium': return '#ff9800';
              case 'low': return '#2196f3';
              default: return '#666';
            }
          };
          
          const getSeverityText = (severity: string) => {
            switch (severity) {
              case 'critical': return '极高风险';
              case 'high': return '高风险';
              case 'medium': return '中风险';
              case 'low': return '低风险';
              default: return '未知';
            }
          };
          
          modal.confirm({
            title: '⚠️ 黑名单警告',
            width: 600,
            content: (
              <div>
                <Alert
                  message="该客户已在黑名单中"
                  description="系统检测到该客户存在黑名单记录，建议谨慎处理。"
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                {blacklistRecords.map((record: BlacklistRecord, index: number) => (
                  <div 
                    key={record.id} 
                    style={{ 
                      marginBottom: 12, 
                      padding: 12, 
                      background: '#fff3f3', 
                      border: '1px solid #ffccc7',
                      borderRadius: 4 
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: getSeverityColor(record.severity)
                      }}>
                        风险等级: {getSeverityText(record.severity)}
                      </span>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>客户名称：</strong>{record.customerName}
                    </div>
                    {record.customerPhone && (
                      <div style={{ marginBottom: 4 }}>
                        <strong>电话：</strong>{record.customerPhone}
                      </div>
                    )}
                    <div style={{ marginBottom: 4 }}>
                      <strong>加入原因：</strong>{record.reason}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      <strong>上传者：</strong>{record.uploaderName} | 
                      <strong> 上传时间：</strong>{new Date(record.uploadTime).toLocaleString()}
                    </div>
                  </div>
                ))}
                
                <p style={{ marginTop: 16, color: '#666', fontSize: 13 }}>
                  是否仍要继续添加该客户？
                </p>
              </div>
            ),
            okText: '继续添加',
            cancelText: '取消',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
      }
      
      return true;
    } catch (error: any) {
      console.error('黑名单检查失败:', error);
      // 检查失败时，询问用户是否继续
      return new Promise((resolve) => {
        modal.confirm({
          title: '黑名单检查失败',
          content: '无法连接到黑名单服务，是否继续添加客户？',
          okText: '继续',
          cancelText: '取消',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
    }
  };

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();

      // 黑名单检查（仅新增客户时检查，编辑客户不检查）
      if (!customer) {
        const canProceed = await checkCustomerBlacklist(values);
        if (!canProceed) {
          setIsSubmitting(false);
          return;
        }
      }

      const selectedStore = stores.find(s => s.id === values.regionStoreId);
      const selectedUser = users.find((u: any) => u.id === values.businessManagerId);

      let customerData: Customer | EnterpriseCustomer;
      if (customerType === 'personal') {
        const attachmentUrls = (values.attachments || []).map((f: any) => f?.response?.file?.url || f?.url || f?.name);
        customerData = {
          id: customer?.id || `new_${Date.now()}`,
          type: 'personal',
          region: selectedStore?.name || '',
          businessManager: selectedUser?.name || '',
          regionStoreId: selectedStore?.id,
          regionStoreName: selectedStore?.name,
          businessManagerId: selectedUser?.id,
          businessManagerName: selectedUser?.name,
          name: values.name,
          phone: values.phone,
          idCardNumber: values.idCardNumber,
          createdAt: customer?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attachments: attachmentUrls,
          equipmentCount: customer?.equipmentCount || 0,
          contractAmount: customer?.contractAmount || 0,
          outstandingAmount: customer?.outstandingAmount || 0,
          receivedAmount: customer?.receivedAmount || 0
        };
      } else {
        const contacts = (contactForms || []).map((_, index) => ({
          id: `c_${index}_${Date.now()}`,
          name: values[`contactName_${index}`],
          phone: values[`contactPhone_${index}`],
          position: values[`contactPosition_${index}`]
        }));
        const attachmentUrls = (values.attachments || []).map((f: any) => f?.response?.file?.url || f?.url || f?.name);
        customerData = {
          id: customer?.id || `new_${Date.now()}`,
          type: 'enterprise',
          region: selectedStore?.name || '',
          businessManager: selectedUser?.name || '',
          regionStoreId: selectedStore?.id,
          regionStoreName: selectedStore?.name,
          businessManagerId: selectedUser?.id,
          businessManagerName: selectedUser?.name,
          companyName: values.companyName,
          creditCode: values.creditCode,
          address: values.address,
          contacts: contacts,
          createdAt: customer?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attachments: attachmentUrls,
          equipmentCount: customer?.equipmentCount || 0,
          contractAmount: customer?.contractAmount || 0,
          outstandingAmount: customer?.outstandingAmount || 0,
          receivedAmount: customer?.receivedAmount || 0
        };
      }

      onSuccess(customerData);
      messageApi.success(customer ? '客户更新成功' : '客户添加成功');
    } catch (error: any) {
      console.error('表单验证失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <Avatar style={{ backgroundColor: '#1890ff' }} icon={customer ? <UserOutlined /> : <FileAddOutlined />} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>{customer ? '编辑客户资料' : '录入新客户'}</span>
        </Space>
      }
      width={720}
      open={visible}
      onClose={onCancel}
      styles={{ body: { paddingBottom: 80, background: '#f5f7fa' } }}
      extra={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button onClick={handleSubmit} type="primary" loading={isSubmitting}>
            提交
          </Button>
        </Space>
      }
    >
      <Spin spinning={isLoading} tip="加载数据中...">
        <Form form={form} layout="vertical" hideRequiredMark>
          <Row gutter={16}>
            <Col span={24}>
              <Card variant="borderless" title="基础信息" className="mb-4" style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="regionStoreId"
                      label="所属区域/门店"
                      rules={[{ required: true, message: '请选择所属区域' }]}
                    >
                      <Select placeholder="选择门店" showSearch optionFilterProp="children">
                        {stores.map((store) => (
                          <Option key={store.id} value={store.id}>{store.name}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="businessManagerId"
                      label="业务负责人"
                      rules={[{ required: true, message: '请选择业务负责人' }]}
                    >
                      <Select placeholder="选择负责人" showSearch optionFilterProp="children">
                        {users.map((emp: any) => (
                          <Option key={emp.id} value={emp.id}>{emp.name}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      name="type"
                      label="客户类型"
                      rules={[{ required: true, message: '请选择客户类型' }]}
                      initialValue="personal"
                    >
                      <Select onChange={handleTypeChange} style={{ width: '100%' }}>
                        <Option value="personal"><Space><UserOutlined /> 个人客户</Space></Option>
                        <Option value="enterprise"><Space><ShopOutlined /> 企业客户</Space></Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Card 
                variant="borderless" 
                title="详细信息" 
                className="mb-4" 
                style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                extra={
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      if (customerType === 'personal') {
                        handleIDCardOCR(file);
                      } else {
                        handleBusinessLicenseOCR(file);
                      }
                      return false;
                    }}
                  >
                    <Button 
                      icon={<ScanOutlined />} 
                      type="primary" 
                      ghost 
                      loading={ocrProcessing}
                      size="small"
                    >
                      {customerType === 'personal' ? '拍照识别身份证' : '拍照识别营业执照'}
                    </Button>
                  </Upload>
                }
              >
                {ocrProcessing && (
                  <Alert
                    message="正在识别中..."
                    description="请稍候，正在使用AI识别证件信息"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
                
                {customerType === 'personal' ? (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="name" label="客户姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                        <Input placeholder="请输入姓名或上传身份证识别" prefix={<UserOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="phone" label="联系电话" rules={[{ validator: validatePhone }]}>
                        <Input placeholder="请输入手机号码" prefix={<PhoneOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="idCardNumber" label="身份证号码" rules={[{ validator: validateIdCard }]}>
                        <Input placeholder="请输入身份证号码或上传身份证识别" prefix={<IdcardOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                  </Row>
                ) : (
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item name="companyName" label="企业名称" rules={[{ required: true, message: '请输入企业名称' }]}>
                        <Input placeholder="请输入企业全称或上传营业执照识别" prefix={<ShopOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="creditCode" label="统一社会信用代码" rules={[{ validator: validateCreditCode }]}>
                        <Input placeholder="18位信用代码或上传营业执照识别" prefix={<CreditCardOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="address" label="注册/经营地址" rules={[{ required: true }]}>
                        <TextArea rows={2} placeholder="详细地址" />
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </Card>
            </Col>
          </Row>

          {customerType === 'enterprise' && (
             <Card 
               variant="borderless" 
               title="联系人信息" 
               className="mb-4" 
               style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
               extra={<Button type="link" icon={<PlusCircleOutlined />} onClick={addContact}>添加联系人</Button>}
             >
               {contactForms.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无联系人" />}
               {contactForms.map((_, index) => (
                 <div key={index} style={{ background: '#fafafa', padding: 16, borderRadius: 6, marginBottom: 16, position: 'relative' }}>
                    <Button 
                      type="text" 
                      danger 
                      icon={<MinusCircleOutlined />} 
                      style={{ position: 'absolute', right: 8, top: 8 }} 
                      onClick={() => removeContact(index)}
                    />
                    <Row gutter={16}>
                       <Col span={8}>
                          <Form.Item name={`contactName_${index}`} label="姓名" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                             <Input placeholder="姓名" />
                          </Form.Item>
                       </Col>
                       <Col span={8}>
                          <Form.Item name={`contactPhone_${index}`} label="电话" rules={[{ validator: validatePhone }]} style={{ marginBottom: 0 }}>
                             <Input placeholder="电话" />
                          </Form.Item>
                       </Col>
                       <Col span={8}>
                          <Form.Item name={`contactPosition_${index}`} label="职务" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                             <Input placeholder="职务" />
                          </Form.Item>
                       </Col>
                    </Row>
                 </div>
               ))}
             </Card>
          )}

          <Card variant="borderless" title="附件资料" style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
             <Form.Item name="attachments" valuePropName="fileList" getValueFromEvent={normFile} noStyle>
                <Upload
                  {...uploadProps}
                  listType="picture-card"
                  className="avatar-uploader"
                >
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <PlusOutlined style={{ fontSize: 24, color: '#999' }} />
                      <div style={{ marginTop: 8, color: '#666' }}>上传附件</div>
                   </div>
                </Upload>
             </Form.Item>
          </Card>
        </Form>
      </Spin>
    </Drawer>
  );
};

export default AddCustomerModal;