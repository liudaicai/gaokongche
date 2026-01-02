import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Card, message, Popconfirm, Space, Modal, Form, Input, Switch, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch } from '../../app/store';
import {
  fetchTenantCompanies,
  addTenantCompany,
  updateTenantCompany,
  deleteTenantCompany,
  setDefaultTenantCompany,
  selectTenantCompanies,
  selectTenantCompaniesLoading
} from './storesSlice';
import { TenantCompany } from './types';

const CompanyVerificationList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const tenantCompanies = useSelector(selectTenantCompanies);
  const loading = useSelector(selectTenantCompaniesLoading);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<TenantCompany | null>(null);
  const [form] = Form.useForm();
  
  // 加载数据
  useEffect(() => {
    dispatch(fetchTenantCompanies());
  }, [dispatch]);
  
  // 处理新增公司主体
  const handleAddCompany = () => {
    setCurrentCompany(null);
    form.resetFields();
    setIsModalVisible(true);
  };
  
  // 处理修改公司主体
  const handleEditCompany = (company: TenantCompany) => {
    setCurrentCompany(company);
    form.setFieldsValue({
      companyName: company.companyName,
      companyAddress: company.companyAddress,
      creditCode: company.creditCode,
      bankAccount: company.bankAccount,
      bankName: company.bankName,
      legalPerson: company.legalPerson,
      contactName: company.contactName,
      contactPhone: company.contactPhone,
      isDefault: company.isDefault,
      status: company.status || 'active',
      remark: company.remark
    });
    setIsModalVisible(true);
  };
  
  // 处理删除公司主体
  const handleDeleteCompany = async (companyId: string) => {
    try {
      await dispatch(deleteTenantCompany(companyId)).unwrap();
      message.success('公司主体删除成功');
    } catch (error: any) {
      message.error(error?.message || '公司主体删除失败');
    }
  };
  
  // 处理设置默认
  const handleSetDefault = async (companyId: string) => {
    try {
      await dispatch(setDefaultTenantCompany(companyId)).unwrap();
      message.success('默认公司设置成功');
      // 重新加载列表
      dispatch(fetchTenantCompanies());
    } catch (error: any) {
      message.error(error?.message || '设置默认公司失败');
    }
  };
  
  // 保存公司主体信息
  const handleSaveCompany = async () => {
    try {
      const values = await form.validateFields();
      
      const companyData: Omit<TenantCompany, 'id' | 'createdAt' | 'updatedAt'> = {
        companyName: values.companyName,
        companyAddress: values.companyAddress,
        creditCode: values.creditCode,
        bankAccount: values.bankAccount,
        bankName: values.bankName,
        legalPerson: values.legalPerson,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        isDefault: values.isDefault || false,
        status: values.status || 'active',
        remark: values.remark
      };
      
      if (currentCompany) {
        // 更新公司主体
        await dispatch(updateTenantCompany({
          ...currentCompany,
          ...companyData
        })).unwrap();
        message.success('公司主体更新成功');
      } else {
        // 新增公司主体
        await dispatch(addTenantCompany(companyData)).unwrap();
        message.success('公司主体新增成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      // 重新加载列表
      dispatch(fetchTenantCompanies());
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };
  
  // 公司主体列表列配置
  const columns: ColumnsType<TenantCompany> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 60,
    },
    {
      title: '公司名称',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (text, record) => (
        <Space>
          {text}
          {record.isDefault && (
            <Tag color="gold" icon={<StarFilled />}>默认</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '信用代码',
      dataIndex: 'creditCode',
      key: 'creditCode',
      width: 180,
    },
    {
      title: '法人代表',
      dataIndex: 'legalPerson',
      key: 'legalPerson',
      width: 100,
    },
    {
      title: '联系人/电话',
      key: 'contact',
      width: 150,
      render: (_, record) => (
        record.contactName || record.contactPhone ? (
          <div>
            {record.contactName && <div>{record.contactName}</div>}
            {record.contactPhone && <div className="text-gray-500 text-sm">{record.contactPhone}</div>}
          </div>
        ) : '-'
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {!record.isDefault && (
            <Button
              type="link"
              size="small"
              icon={<StarOutlined />}
              onClick={() => handleSetDefault(record.id)}
            >
              设为默认
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditCompany(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个公司主体吗？"
            onConfirm={() => handleDeleteCompany(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  return (
    <div className="p-4">
      <Card
        title="公司主体管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddCompany}
          >
            新增公司
          </Button>
        }
        className="mb-4"
      >
        <Table
          columns={columns}
          dataSource={tenantCompanies}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      
      {/* 新增/修改公司主体模态框 */}
      <Modal
        title={currentCompany ? '编辑公司主体' : '新增公司主体'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveCompany}>确认</Button>
        ]}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="companyName"
            label="公司名称"
            rules={[{ required: true, message: '请输入公司名称' }]}
          >
            <Input placeholder="请输入公司名称" />
          </Form.Item>
          
          <Form.Item
            name="creditCode"
            label="统一社会信用代码"
            rules={[
              { required: true, message: '请输入统一社会信用代码' },
              { pattern: /^[A-Z0-9]{18}$/, message: '请输入正确的18位信用代码' }
            ]}
          >
            <Input placeholder="请输入18位统一社会信用代码" maxLength={18} />
          </Form.Item>
          
          <Form.Item
            name="companyAddress"
            label="公司地址"
          >
            <Input.TextArea rows={2} placeholder="请输入公司地址" />
          </Form.Item>
          
          <Form.Item
            name="legalPerson"
            label="法人代表"
          >
            <Input placeholder="请输入法人代表姓名" />
          </Form.Item>
          
          <Form.Item label="银行信息">
            <Input.Group compact>
              <Form.Item
                name="bankAccount"
                noStyle
                rules={[{ pattern: /^\d+$/, message: '请输入正确的银行账号' }]}
              >
                <Input style={{ width: '50%' }} placeholder="银行账号" />
              </Form.Item>
              <Form.Item
                name="bankName"
                noStyle
              >
                <Input style={{ width: '50%' }} placeholder="开户行" />
              </Form.Item>
            </Input.Group>
          </Form.Item>
          
          <Form.Item label="联系人信息">
            <Input.Group compact>
              <Form.Item
                name="contactName"
                noStyle
              >
                <Input style={{ width: '50%' }} placeholder="联系人姓名" />
              </Form.Item>
              <Form.Item
                name="contactPhone"
                noStyle
                rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}
              >
                <Input style={{ width: '50%' }} placeholder="联系人电话" />
              </Form.Item>
            </Input.Group>
          </Form.Item>
          
          <Form.Item
            name="isDefault"
            label="设为默认"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
            initialValue="active"
          >
            <Select>
              <Select.Option value="active">启用</Select.Option>
              <Select.Option value="inactive">停用</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyVerificationList;