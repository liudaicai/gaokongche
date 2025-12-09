import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal, Form, Input, Select, Upload, Button, Space, Card, message, Spin, notification, Empty } from 'antd';
import { UploadOutlined, MinusCircleOutlined, PlusCircleOutlined, UserOutlined, ShopOutlined, PhoneOutlined, IdcardOutlined, HomeOutlined, UserSwitchOutlined, CreditCardOutlined, FileAddOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { API_BASE } from '../../api/client';
import type { AppDispatch } from '../../app/store';
import {
  Customer,
  EnterpriseCustomer
} from './customerSlice';
import { fetchStores, selectStores } from '../stores/storesSlice';
import { fetchEmployees, selectEmployees } from '../employees/employeesSlice';

const { Option } = Select;
const { TextArea } = Input;

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
  const dispatch = useDispatch<AppDispatch>();
  const stores = useSelector(selectStores);
  const employees = useSelector(selectEmployees);
  const [form] = Form.useForm();
  const [customerType, setCustomerType] = useState<'personal' | 'enterprise'>('personal');
  const [contactForms, setContactForms] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 加载门店与员工列表
  useEffect(() => {
    if (visible) {
      dispatch(fetchStores());
      dispatch(fetchEmployees());
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
      const currentManagerId = (customer as any).businessManagerId || employees.find(e => e.name === ((customer as any).businessManagerName || (customer as any).businessManager))?.id;
      form.setFieldsValue({
        regionStoreId: currentStoreId,
        businessManagerId: currentManagerId,
      });
    }
  }, [visible, customer, stores, employees, form]);

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
    notification.success({
      message: '添加成功',
      description: '已添加新的联系人表单',
      placement: 'bottomRight',
      duration: 2
    });
  };

  // 移除联系人
  const removeContact = (index: number) => {
    Modal.confirm({
      title: '确定要移除这个联系人吗？',
      icon: <MinusCircleOutlined />,
      content: '移除后数据将无法恢复',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        const newContactForms = [...contactForms];
        newContactForms.splice(index, 1);
        setContactForms(newContactForms);
        notification.success({
          message: '移除成功',
          description: '已移除联系人',
          placement: 'bottomRight',
          duration: 2
        });
      }
    });
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
    headers: {
      authorization: 'authorization-text',
    },
    beforeUpload(file) {
      const isLessThan2M = file.size / 1024 / 1024 < 2;
      if (!isLessThan2M) {
        message.error('文件大小不能超过2MB!');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    onChange(info) {
      const { status } = info.file;
      if (status === 'done') {
        // 写入后端返回的可访问 URL 到文件项，便于后续提交映射
        const url = (info.file.response && (info.file.response.file?.url || info.file.response.url)) || info.file.url;
        if (url) {
          (info.file as any).url = url;
        }
        message.success({
          content: `${info.file.name} 文件上传成功`,
          duration: 2
        });
      } else if (status === 'error') {
        message.error({
          content: `${info.file.name} 文件上传失败`,
          duration: 2
        });
      } else if (status === 'uploading') {
        // 可以在这里显示上传进度
      }
    },
    onDrop(_e) {
        // console.log('Dropped files', e.dataTransfer.files);
      },
  };

  // Upload 与 Form 的值映射（避免 antd Upload value 警告）
  const normFile = (e: any) => {
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();

      const selectedStore = stores.find(s => s.id === values.regionStoreId);
      const selectedEmployee = employees.find(e => e.id === values.businessManagerId);

      let customerData: Customer | EnterpriseCustomer;
      if (customerType === 'personal') {
        const attachmentUrls = (values.attachments || []).map((f: any) => f?.response?.file?.url || f?.url || f?.name);
        customerData = {
          id: customer?.id || `new_${Date.now()}`,
          type: 'personal',
          region: selectedStore?.name || '',
          businessManager: selectedEmployee?.name || '',
          // 关联字段
          regionStoreId: selectedStore?.id,
          regionStoreName: selectedStore?.name,
          businessManagerId: selectedEmployee?.id,
          businessManagerName: selectedEmployee?.name,
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
          businessManager: selectedEmployee?.name || '',
          // 关联字段
          regionStoreId: selectedStore?.id,
          regionStoreName: selectedStore?.name,
          businessManagerId: selectedEmployee?.id,
          businessManagerName: selectedEmployee?.name,
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

      message.success({
        content: customer ? '客户更新成功' : '客户添加成功',
        duration: 2,
        onClose: () => {
          onSuccess(customerData);
        }
      });
    } catch (error: any) {
      message.error({
        content: '表单验证失败，请检查输入内容',
        duration: 3
      });
      console.error('表单验证失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 渲染个人客户字段
  const renderPersonalFields = () => (
    <Card className="mb-4" title={<span><UserOutlined className="mr-2" />个人基本信息</span>} variant="outlined">
      <Form.Item
        label="姓名"
        name="name"
        rules={[
          { required: true, message: '请输入姓名' }
        ]}
        className="mb-4"
      >
        <Input prefix={<UserOutlined />} placeholder="请输入姓名" size="large" />
      </Form.Item>
      
      <Form.Item
        label="电话"
        name="phone"
        rules={[
          { validator: validatePhone }
        ]}
        className="mb-4"
      >
        <Input prefix={<PhoneOutlined />} placeholder="请输入手机号码" size="large" />
      </Form.Item>
      
      <Form.Item
        label="身份证号码"
        name="idCardNumber"
        rules={[
          { validator: validateIdCard }
        ]}
        className="mb-4"
      >
        <Input prefix={<IdcardOutlined />} placeholder="请输入身份证号码" size="large" />
      </Form.Item>
    </Card>
  );

  // 渲染企业客户字段
  const renderEnterpriseFields = () => (
    <>
      <Card className="mb-4" title={<span><ShopOutlined className="mr-2" />企业基本信息</span>} variant="outlined">
        <Form.Item
          label="企业名称"
          name="companyName"
          rules={[
            { required: true, message: '请输入企业名称' }
          ]}
          className="mb-4"
        >
          <Input prefix={<ShopOutlined />} placeholder="请输入企业名称" size="large" />
        </Form.Item>
        
        <Form.Item
          label="企业信用代码"
          name="creditCode"
          rules={[
            { validator: validateCreditCode }
          ]}
          className="mb-4"
        >
          <Input prefix={<CreditCardOutlined />} placeholder="请输入企业信用代码" size="large" />
        </Form.Item>
        
        <Form.Item
          label="企业地址"
          name="address"
          rules={[
            { required: true, message: '请输入企业地址' }
          ]}
          className="mb-4"
        >
          <TextArea rows={3} placeholder="请输入企业地址" size="large" />
        </Form.Item>
      </Card>
      
      <Card className="mb-4" title={<span><UserSwitchOutlined className="mr-2" />联系人信息</span>} variant="outlined" extra={
        contactForms.length === 0 ? (
          <Button 
            type="primary" 
            size="small" 
            onClick={addContact}
            icon={<FileAddOutlined />}
          >
            添加联系人
          </Button>
        ) : null
      }>
        {contactForms.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <p>暂无联系人信息</p>
            <Button 
              type="dashed" 
              onClick={addContact}
              className="mt-2"
              icon={<PlusCircleOutlined />}
            >
              添加联系人
            </Button>
          </div>
        ) : (
          <>
            {contactForms.map((_, index) => (
              <Card key={index} size="small" title={`联系人 ${index + 1}`} variant="outlined" extra={
                contactForms.length > 1 ? (
                  <MinusCircleOutlined 
                    onClick={() => removeContact(index)}
                    className="text-red-500 hover:text-red-700 cursor-pointer"
                  />
                ) : null
              } className="mb-4">
                <Form.Item
                  label="姓名"
                  name={`contactName_${index}`}
                  rules={[
                    { required: true, message: '请输入联系人姓名' }
                  ]}
                  className="mb-3"
                >
                  <Input prefix={<UserOutlined />} placeholder="请输入联系人姓名" size="middle" />
                </Form.Item>
                
                <Form.Item
                  label="电话"
                  name={`contactPhone_${index}`}
                  rules={[
                    { validator: validatePhone }
                  ]}
                  className="mb-3"
                >
                  <Input prefix={<PhoneOutlined />} placeholder="请输入联系电话" size="middle" />
                </Form.Item>
                
                <Form.Item
                  label="职务"
                  name={`contactPosition_${index}`}
                  rules={[
                    { required: true, message: '请输入职务' }
                  ]}
                  className="mb-0"
                >
                  <Input prefix={<UserSwitchOutlined />} placeholder="请输入职务" size="middle" />
                </Form.Item>
              </Card>
            ))}
            <Button 
              type="dashed" 
              onClick={addContact} 
              block
              icon={<PlusCircleOutlined />}
              className="mt-2"
            >
              添加更多联系人
            </Button>
          </>
        )}
      </Card>
    </>
  );

  // 附件上传卡片
  const renderAttachmentSection = () => (
    <Card className="mb-4" title={<span><UploadOutlined className="mr-2" />附件上传</span>} variant="outlined">
      <Form.Item
        name="attachments"
        valuePropName="fileList"
        getValueFromEvent={normFile}
        className="mb-0"
      >
        <Upload.Dragger {...uploadProps} className="border-dashed border-gray-300 rounded-lg transition-all hover:border-blue-500">
          <div className="flex flex-col items-center justify-center py-10">
            <div className="text-blue-500 mb-4">
              <UploadOutlined style={{ fontSize: 48 }} />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">点击或拖拽文件到此区域上传</p>
            <p className="text-sm text-gray-500">
              {customerType === 'personal' 
                ? '支持上传身份证扫描件或照片 (最大2MB)' 
                : '支持上传企业营业执照和联系人证件 (最大2MB)'}
            </p>
          </div>
        </Upload.Dragger>
      </Form.Item>
    </Card>
  );

  return (
    <Modal
      title={
        <div className="flex items-center">
          {customer ? (
            <UserOutlined className="mr-2 text-blue-500" />
          ) : (
            <FileAddOutlined className="mr-2 text-blue-500" />
          )}
          <span>{customer ? '编辑客户' : '添加客户'}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      forceRender
      styles={{
        body: {
          maxHeight: '70vh',
          overflowY: 'auto'
        }
      }}
      maskClosable={false}
      keyboard={false}
    >
      <Spin spinning={isLoading} tip="加载中..." size="large">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: 'personal'
          }}
          className="space-y-4"
        >
          {/* 基础信息 */}
          <Card title={<span><HomeOutlined className="mr-2" />基础信息</span>} variant="outlined">
            <Form.Item
              label="所属区域"
              name="regionStoreId"
              rules={[
                { required: true, message: '请选择所属区域' }
              ]}
              className="mb-4"
            >
              <Select 
                placeholder="请选择所属区域" 
                size="large"
                showSearch
                optionFilterProp="children"
                notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无门店数据" />}
              >
                {stores.map((store) => (
                  <Option key={store.id} value={store.id}>{store.name}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              label="业务负责人"
              name="businessManagerId"
              rules={[
                { required: true, message: '请选择业务负责人' }
              ]}
              className="mb-0"
            >
              <Select 
                placeholder="请选择业务负责人" 
                size="large"
                showSearch
                optionFilterProp="children"
                notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无员工数据" />}
              >
                {employees.map((emp) => (
                  <Option key={emp.id} value={emp.id}>{emp.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Card>
          
          {/* 客户类型选择 */}
          <Card title={<span><UserSwitchOutlined className="mr-2" />客户类型</span>} variant="outlined">
            <Form.Item
              label="选择客户类型"
              name="type"
              rules={[
                { required: true, message: '请选择客户类型' }
              ]}
              className="mb-0"
            >
              <Select 
                onChange={handleTypeChange} 
                size="large"
                className="transition-all"
              >
                <Option value="personal">
                  <div className="flex items-center">
                    <UserOutlined className="mr-2" />
                    <span>个人客户</span>
                  </div>
                </Option>
                <Option value="enterprise">
                  <div className="flex items-center">
                    <ShopOutlined className="mr-2" />
                    <span>企业客户</span>
                  </div>
                </Option>
              </Select>
            </Form.Item>
          </Card>
          
          {/* 根据客户类型显示不同的字段 */}
          {customerType === 'personal' ? renderPersonalFields() : renderEnterpriseFields()}
          
          {/* 附件上传部分 */}
          {renderAttachmentSection()}
          
          {/* 提交按钮 */}
          <div className="flex justify-end pt-4 border-t">
            <Space size="middle">
              <Button onClick={onCancel} size="large">
                取消
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                loading={isSubmitting}
                className="px-6"
              >
                {customer ? '更新' : '添加'}
              </Button>
            </Space>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
};

export default AddCustomerModal;