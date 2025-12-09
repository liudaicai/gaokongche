import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Card, message, Popconfirm, Space, Modal, Form, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch } from '../../app/store';
import {
  fetchCompanyVerifications,
  addCompanyVerification,
  updateCompanyVerification,
  deleteCompanyVerification,
  selectCompanyVerifications,
  selectCompanyVerificationsLoading
} from './storesSlice';
import { CompanyVerification } from './types';

const CompanyVerificationList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const companyVerifications = useSelector(selectCompanyVerifications);
  const loading = useSelector(selectCompanyVerificationsLoading);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentVerification, setCurrentVerification] = useState<CompanyVerification | null>(null);
  const [form] = Form.useForm();
  
  // 加载数据
  useEffect(() => {
    dispatch(fetchCompanyVerifications());
  }, [dispatch]);
  
  // 处理新增公司认证
  const handleAddVerification = () => {
    setCurrentVerification(null);
    form.resetFields();
    setIsModalVisible(true);
  };
  
  // 处理修改公司认证
  const handleEditVerification = (verification: CompanyVerification) => {
    setCurrentVerification(verification);
    form.setFieldsValue({
      companyName: verification.companyName,
      companyAddress: verification.companyAddress,
      creditCode: verification.creditCode,
      bankAccount: verification.bankAccount,
      bankName: verification.bankName
    });
    setIsModalVisible(true);
  };
  
  // 处理删除公司认证
  const handleDeleteVerification = async (verificationId: string) => {
    try {
      await dispatch(deleteCompanyVerification(verificationId)).unwrap();
      message.success('公司认证删除成功');
    } catch (error) {
      message.error('公司认证删除失败');
    }
  };
  
  // 保存公司认证信息
  const handleSaveVerification = async () => {
    try {
      const values = await form.validateFields();
      
      const verificationData = {
        companyName: values.companyName,
        companyAddress: values.companyAddress,
        creditCode: values.creditCode,
        bankAccount: values.bankAccount,
        bankName: values.bankName
      };
      
      if (currentVerification) {
        // 更新公司认证
        await dispatch(updateCompanyVerification({
          ...currentVerification,
          ...verificationData
        })).unwrap();
        message.success('公司认证信息更新成功');
      } else {
        // 新增公司认证
        await dispatch(addCompanyVerification(verificationData)).unwrap();
        message.success('公司认证新增成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (errorInfo) {
      message.error('表单验证失败');
    }
  };
  
  // 公司认证列表列配置
  const columns: ColumnsType<CompanyVerification> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 80,
    },
    {
      title: '公司名称',
      dataIndex: 'companyName',
      key: 'companyName',
    },
    {
      title: '公司地址',
      dataIndex: 'companyAddress',
      key: 'companyAddress',
    },
    {
      title: '企业信用代码',
      dataIndex: 'creditCode',
      key: 'creditCode',
    },
    {
      title: '账号/开户行',
      key: 'bankInfo',
      render: (_, record) => (
        <div>
          <div>{record.bankAccount}</div>
          <div className="text-gray-500 text-sm">{record.bankName}</div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditVerification(record)}
          >
            修改
          </Button>
          <Popconfirm
            title="确定要删除这个公司认证吗？"
            onConfirm={() => handleDeleteVerification(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
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
        title="公司认证列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddVerification}
          >
            新增
          </Button>
        }
        className="mb-4"
      >
        <Table
          columns={columns}
          dataSource={companyVerifications}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      
      {/* 新增/修改公司认证模态框 */}
      <Modal
        title={currentVerification ? '修改公司认证' : '新增公司认证'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveVerification}>确认</Button>
        ]}
        width={600}
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
            name="companyAddress"
            label="公司地址"
            rules={[{ required: true, message: '请输入公司地址' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入公司地址" />
          </Form.Item>
          <Form.Item
            name="creditCode"
            label="企业信用代码"
            rules={[
              { required: true, message: '请输入企业信用代码' },
              { pattern: /^[A-Z0-9]{18}$/, message: '请输入正确的18位企业信用代码' }
            ]}
          >
            <Input placeholder="请输入18位企业信用代码" />
          </Form.Item>
          <Form.Item
            name="bankAccount"
            label="账号"
            rules={[{ required: true, message: '请输入银行账号' }]}
          >
            <Input placeholder="请输入银行账号" />
          </Form.Item>
          <Form.Item
            name="bankName"
            label="开户行"
            rules={[{ required: true, message: '请输入开户行名称' }]}
          >
            <Input placeholder="请输入开户行名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyVerificationList;