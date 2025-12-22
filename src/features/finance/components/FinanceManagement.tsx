/**
 * 财务管理主界面 - 重构版
 * 功能：收款和付款管理
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  DatePicker,
  Select,
  Input,
  Modal,
  Form,
  InputNumber,
  message,
  Upload,
  Dropdown,
  Tag
} from 'antd';
import type { MenuProps, UploadFile } from 'antd';
import {
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  DownOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchReceipts,
  fetchPayments,
  createFinanceRecord,
  updateFinanceRecord,
  deleteFinanceRecord,
  exportReceipts,
  exportPayments
} from '../financeSlice';
import type { FinanceRecord } from '../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const FinanceManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { receipts, payments, loading, pagination } = useAppSelector(
    (state) => state.finance
  );

  const [activeTab, setActiveTab] = useState<'receipts' | 'payments'>('receipts');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  
  // 表单和模态框
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab, dateRange]);

  const loadData = () => {
    const params = {
      startDate: dateRange[0]?.format('YYYY-MM-DD'),
      endDate: dateRange[1]?.format('YYYY-MM-DD'),
      page: 1,
      pageSize: 50
    };

    if (activeTab === 'receipts') {
      dispatch(fetchReceipts(params));
    } else {
      dispatch(fetchPayments(params));
    }
  };

  // 打开创建模态框
  const handleCreate = () => {
    setModalMode('create');
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      record_type: activeTab === 'receipts' ? 'receipt' : 'payment',
      record_date: dayjs(),
      payment_method: 'cash'
    });
    setFileList([]);
    setModalVisible(true);
  };

  // 打开编辑模态框
  const handleEdit = (record: FinanceRecord) => {
    setModalMode('edit');
    setEditingRecord(record);
    form.setFieldsValue({
      record_type: record.record_type,
      record_date: dayjs(record.record_date),
      payment_method: record.payment_method,
      amount: record.amount,
      customer_name: record.customer_name,
      contract_number: record.contract_number,
      remark: record.remark
    });
    
    // 显示现有附件
    if (record.attachments_json) {
      try {
        const attachments = JSON.parse(record.attachments_json);
        setFileList(attachments.map((att: any, index: number) => ({
          uid: `${index}`,
          name: att.filename,
          status: 'done',
          url: att.path
        })));
      } catch (e) {
        setFileList([]);
      }
    } else {
      setFileList([]);
    }
    
    setModalVisible(true);
  };

  // 删除记录
  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteFinanceRecord(id)).unwrap();
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error || '删除失败');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 构建FormData
      const formData = new FormData();
      formData.append('record_type', values.record_type);
      formData.append('record_date', values.record_date.format('YYYY-MM-DD'));
      formData.append('payment_method', values.payment_method);
      formData.append('amount', values.amount.toString());
      
      if (values.customer_name) formData.append('customer_name', values.customer_name);
      if (values.contract_number) formData.append('contract_number', values.contract_number);
      if (values.remark) formData.append('remark', values.remark);
      
      // 添加新上传的文件
      fileList.forEach(file => {
        if (file.originFileObj) {
          formData.append('attachments', file.originFileObj);
        }
      });

      if (modalMode === 'create') {
        await dispatch(createFinanceRecord(formData)).unwrap();
        message.success('创建成功');
      } else if (editingRecord) {
        await dispatch(updateFinanceRecord({ 
          id: editingRecord.id, 
          formData 
        })).unwrap();
        message.success('更新成功');
      }

      setModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error || '操作失败');
    }
  };

  // 导出数据
  const handleExport = async () => {
    const params = {
      startDate: dateRange[0]?.format('YYYY-MM-DD'),
      endDate: dateRange[1]?.format('YYYY-MM-DD')
    };

    try {
      if (activeTab === 'receipts') {
        await dispatch(exportReceipts(params)).unwrap();
      } else {
        await dispatch(exportPayments(params)).unwrap();
      }
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '单号',
      dataIndex: 'record_number',
      key: 'record_number',
      width: 150,
      fixed: 'left' as const
    },
    {
      title: '日期',
      dataIndex: 'record_date',
      key: 'record_date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '合同编号/客户名称',
      key: 'contract_customer',
      width: 200,
      render: (_: any, record: FinanceRecord) => {
        const contractNo = record.contract_number || record.order_number || '-';
        const customerName = record.customer_name || '-';
        return `${contractNo} / ${customerName}`;
      }
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number | string) => `¥${Number(amount || 0).toFixed(2)}`
    },
    {
      title: '支付方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 100,
      render: (method: string) => {
        const methodMap: Record<string, string> = {
          cash: '现金',
          wechat: '微信',
          alipay: '支付宝',
          bank_transfer: '网银转账'
        };
        return methodMap[method] || method;
      }
    },
    {
      title: '来源',
      dataIndex: 'is_from_order',
      key: 'is_from_order',
      width: 80,
      render: (isFromOrder: number | boolean) => {
        return isFromOrder ? (
          <Tag color="blue">订单</Tag>
        ) : (
          <Tag>手动</Tag>
        );
      }
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 80,
      render: (_: any, record: FinanceRecord) => {
        // 订单来源的记录不可编辑删除
        if (record.is_from_order) {
          return <span style={{ color: '#999' }}>-</span>;
        }

        const items: MenuProps['items'] = [
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record)
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '确认删除',
                content: '确定要删除这条记录吗？',
                onOk: () => handleDelete(record.id)
              });
            }
          }
        ];

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="link" size="small">
              操作 <DownOutlined />
            </Button>
          </Dropdown>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
      {/* 工具栏 */}
      <Card style={{ marginBottom: 20 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <span>日期范围：</span>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
            />
            <Button onClick={loadData}>查询</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增
          </Button>
        </Space>
      </Card>

      {/* 收款/付款Tab */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'receipts' | 'payments')}
        items={[
          {
            key: 'receipts',
            label: '收款记录',
            children: (
              <Table
                columns={columns}
                dataSource={receipts}
                rowKey="id"
                loading={loading}
                scroll={{ x: 1300 }}
                pagination={{
                  current: pagination.page,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  showTotal: (total) => `共 ${total} 条`
                }}
              />
            )
          },
          {
            key: 'payments',
            label: '付款记录',
            children: (
              <Table
                columns={columns}
                dataSource={payments}
                rowKey="id"
                loading={loading}
                scroll={{ x: 1300 }}
                pagination={{
                  current: pagination.page,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  showTotal: (total) => `共 ${total} 条`
                }}
              />
            )
          }
        ]}
      />

      {/* 创建/编辑模态框 */}
      <Modal
        title={modalMode === 'create' ? '新增财务记录' : '编辑财务记录'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          {/* 类型：收款/付款 */}
          <Form.Item
            label="类型"
            name="record_type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select disabled={modalMode === 'edit'}>
              <Select.Option value="receipt">收款</Select.Option>
              <Select.Option value="payment">付款</Select.Option>
            </Select>
          </Form.Item>

          {/* 单号：仅编辑时显示（只读） */}
          {modalMode === 'edit' && editingRecord && (
            <Form.Item label="单号">
              <Input value={editingRecord.record_number} disabled />
            </Form.Item>
          )}
          
          {/* 日期 */}
          <Form.Item
            label="日期"
            name="record_date"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          {/* 支付方式 */}
          <Form.Item
            label="支付方式"
            name="payment_method"
            rules={[{ required: true, message: '请选择支付方式' }]}
          >
            <Select>
              <Select.Option value="cash">现金</Select.Option>
              <Select.Option value="wechat">微信</Select.Option>
              <Select.Option value="alipay">支付宝</Select.Option>
              <Select.Option value="bank_transfer">网银转账</Select.Option>
            </Select>
          </Form.Item>

          {/* 金额 */}
          <Form.Item
            label="金额"
            name="amount"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入金额"
              addonBefore="¥"
            />
          </Form.Item>

          {/* 客户名称 */}
          <Form.Item label="客户名称" name="customer_name">
            <Input placeholder="请输入客户名称" />
          </Form.Item>

          {/* 合同编号 */}
          <Form.Item label="合同编号" name="contract_number">
            <Input placeholder="请输入合同编号" />
          </Form.Item>

          {/* 备注 */}
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>

          {/* 附件：最多5个 */}
          <Form.Item label="附件">
            <Upload
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={5}
            >
              <Button icon={<UploadOutlined />}>上传附件（最多5个）</Button>
            </Upload>
            <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
              支持上传最多5个文件，单个文件不超过10MB
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FinanceManagement;
