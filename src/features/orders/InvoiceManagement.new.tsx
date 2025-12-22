import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  DatePicker,
  Select,
  InputNumber,
  Input,
  message,
  Space,
  Typography,
  Card,
  Upload,
  Dropdown,
} from 'antd';
import type { MenuProps, UploadFile } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  UploadOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchInvoicesByOrder,
  createInvoice,
  deleteInvoice,
  clearError,
  Invoice,
} from './invoicesSlice';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface InvoiceManagementProps {
  orderId: string;
  orderContractNumber?: string;
  customerName?: string;
}

/**
 * 订单发票管理组件
 * 发票记录页面：序号、开票日期、发票类型、开票金额、开票公司、收票公司、操作（下拉删除）
 */
const InvoiceManagement: React.FC<InvoiceManagementProps> = ({
  orderId,
  customerName,
}) => {
  const dispatch = useAppDispatch();
  const { list: invoices, loading, error } = useAppSelector((state) => state.invoices);

  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 加载发票列表
  useEffect(() => {
    if (orderId) {
      dispatch(fetchInvoicesByOrder(orderId));
    }
  }, [dispatch, orderId]);

  // 显示错误信息
  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // 发票类型选项（专票、普票）
  const invoiceTypes = [
    { value: 'vat_special', label: '专票' },
    { value: 'vat_normal', label: '普票' },
  ];

  // 计算税额和价税合计
  const calculateTax = (amount: number, taxRate: number) => {
    const taxAmount = (amount * taxRate) / 100;
    const totalAmount = amount + taxAmount;
    return { taxAmount, totalAmount };
  };

  // 打开发票申请对话框
  const handleOpenModal = () => {
    form.resetFields();
    form.setFieldsValue({
      invoiceType: 'vat_special',
      taxRate: 6,
      receiverCompany: customerName || '',
    });
    setFileList([]);
    setModalVisible(true);
  };

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 计算税额和价税合计
      const { taxAmount, totalAmount } = calculateTax(values.amount, values.taxRate);

      // 生成发票号码
      const invoiceNumber = `FP-${dayjs().format('YYYYMMDD')}-${Date.now().toString().slice(-6)}`;

      const formData = {
        orderId,
        invoiceNumber,
        invoiceType: values.invoiceType,
        invoiceDate: values.invoiceDate ? dayjs(values.invoiceDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        invoiceTitle: values.receiverCompany || '',
        taxNumber: '',
        amount: Number(values.amount),
        taxRate: Number(values.taxRate),
        taxAmount: Number(taxAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        issuerCompany: values.issuerCompany,
        receiverCompany: values.receiverCompany,
        attachments: fileList.map(f => ({
          uid: f.uid,
          name: f.name,
          url: f.url || f.thumbUrl,
        })),
      };

      await dispatch(createInvoice(formData as any)).unwrap();
      message.success('发票申请成功');
      setModalVisible(false);
      form.resetFields();
      setFileList([]);
      dispatch(fetchInvoicesByOrder(orderId));
    } catch (error: any) {
      message.error(error || '操作失败');
    }
  };

  // 删除发票
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确认要删除这条发票记录吗？',
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await dispatch(deleteInvoice(id)).unwrap();
          message.success('发票删除成功');
          dispatch(fetchInvoicesByOrder(orderId));
        } catch (error: any) {
          message.error(error || '删除失败');
        }
      },
    });
  };

  // 操作菜单
  const getActionMenu = (record: Invoice): MenuProps => ({
    items: [
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(record.id),
      },
    ],
  });

  // 表格列定义
  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: Invoice, index: number) => index + 1,
    },
    {
      title: '开票日期',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      width: 120,
    },
    {
      title: '发票类型',
      dataIndex: 'invoiceType',
      key: 'invoiceType',
      width: 100,
      render: (type: string) => {
        const typeOption = invoiceTypes.find((t) => t.value === type);
        return typeOption?.label || type;
      },
    },
    {
      title: '开票金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => `¥${(amount || 0).toFixed(2)}`,
    },
    {
      title: '开票公司',
      dataIndex: 'issuerCompany',
      key: 'issuerCompany',
      width: 180,
      render: (text: string) => text || '-',
    },
    {
      title: '收票公司',
      dataIndex: 'receiverCompany',
      key: 'receiverCompany',
      width: 180,
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: Invoice) => (
        <Dropdown menu={getActionMenu(record)} trigger={['click']}>
          <Button size="small">
            操作 <DownOutlined />
          </Button>
        </Dropdown>
      ),
    },
  ];

  // 上传配置
  const uploadProps = {
    fileList,
    onChange: ({ fileList: newFileList }: any) => setFileList(newFileList),
    beforeUpload: () => false, // 阻止自动上传
    multiple: true,
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5} style={{ margin: 0 }}>
          <FileTextOutlined /> 发票记录
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
          发票申请
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={invoices}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ x: 900 }}
        size="small"
      />

      {/* 发票申请对话框 */}
      <Modal
        title="发票申请"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setFileList([]);
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="invoiceType"
            label="发票类型"
            rules={[{ required: true, message: '请选择发票类型' }]}
          >
            <Select placeholder="请选择发票类型">
              {invoiceTypes.map((type) => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="taxRate"
            label="税率%"
            rules={[{ required: true, message: '请输入税率' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={2}
              placeholder="请输入税率"
              addonAfter="%"
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="开票金额"
            rules={[{ required: true, message: '请输入开票金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入开票金额"
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            name="issuerCompany"
            label="开票公司"
            rules={[{ required: true, message: '请输入开票公司' }]}
          >
            <Input placeholder="请输入开票公司名称" />
          </Form.Item>

          <Form.Item
            name="receiverCompany"
            label="收票公司"
            rules={[{ required: true, message: '请输入收票公司' }]}
          >
            <Input placeholder="请输入收票公司名称" />
          </Form.Item>

          <Form.Item
            name="attachments"
            label="附件（上传开票资料）"
          >
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>

          {/* 底部固定按钮 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => {
              setModalVisible(false);
              form.resetFields();
              setFileList([]);
            }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              提交
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceManagement;
