import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  InputNumber,
  message,
  Descriptions,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Typography,
  Divider,
} from 'antd';
import {
  EyeOutlined,
  DeleteOutlined,
  DollarOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch } from '../../app/store';
import {
  fetchBillings,
  fetchBillingById,
  recordPayment,
  cancelBilling,
  fetchBillingStats,
  selectBillings,
  selectCurrentBilling,
  selectBillingStats,
  selectBillingsLoading,
  Billing,
} from './billingsSlice';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

const BillingList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const billings = useSelector(selectBillings);
  const currentBilling = useSelector(selectCurrentBilling);
  const stats = useSelector(selectBillingStats);
  const loading = useSelector(selectBillingsLoading);

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<any[]>([]);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);

  const [paymentForm] = Form.useForm();

  useEffect(() => {
    loadBillings();
    loadStats();
  }, []);

  const loadBillings = () => {
    dispatch(
      fetchBillings({
        status: filterStatus || undefined,
      })
    );
  };

  const loadStats = () => {
    dispatch(
      fetchBillingStats({
        startDate: dateRange[0] ? dayjs(dateRange[0]).format('YYYY-MM-DD') : undefined,
        endDate: dateRange[1] ? dayjs(dateRange[1]).format('YYYY-MM-DD') : undefined,
      })
    );
  };

  const handleViewDetail = async (billing: Billing) => {
    try {
      await dispatch(fetchBillingById(billing.id)).unwrap();
      setSelectedBilling(billing);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error(error || '获取详情失败');
    }
  };

  const handleRecordPayment = (billing: Billing) => {
    setSelectedBilling(billing);
    paymentForm.setFieldsValue({
      amount: billing.totalAmount - billing.paidAmount,
      paymentDate: dayjs(),
    });
    setPaymentModalVisible(true);
  };

  const handlePaymentSubmit = async () => {
    try {
      const values = await paymentForm.validateFields();
      if (!selectedBilling) return;

      await dispatch(
        recordPayment({
          id: selectedBilling.id,
          amount: values.amount,
          paymentDate: dayjs(values.paymentDate).format('YYYY-MM-DD'),
        })
      ).unwrap();

      message.success('付款记录成功');
      setPaymentModalVisible(false);
      paymentForm.resetFields();
      loadBillings();
      loadStats();
    } catch (error: any) {
      message.error(error || '记录付款失败');
    }
  };

  const handleCancelBilling = async (id: string) => {
    try {
      await dispatch(cancelBilling(id)).unwrap();
      message.success('账单已取消');
      loadBillings();
      loadStats();
    } catch (error: any) {
      message.error(error || '取消账单失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string; icon: any }> = {
      unpaid: { color: 'red', text: '未支付', icon: <ExclamationCircleOutlined /> },
      partial: { color: 'orange', text: '部分支付', icon: <ExclamationCircleOutlined /> },
      paid: { color: 'green', text: '已支付', icon: <CheckCircleOutlined /> },
      overdue: { color: 'volcano', text: '已逾期', icon: <ExclamationCircleOutlined /> },
      cancelled: { color: 'default', text: '已取消', icon: null },
    };

    const config = statusConfig[status] || statusConfig.unpaid;

    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const columns: ColumnsType<Billing> = [
    {
      title: '账单编号',
      dataIndex: 'billingNumber',
      key: 'billingNumber',
      width: 180,
      fixed: 'left',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: '客户',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: '项目',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 180,
      render: (text) => text || '-',
    },
    {
      title: '账单类型',
      dataIndex: 'billingType',
      key: 'billingType',
      width: 100,
      render: (type) => {
        const typeMap: Record<string, string> = {
          initial: '首期',
          monthly: '月度',
          final: '尾款',
          adjustment: '调整',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '账期',
      key: 'period',
      width: 200,
      render: (_, record) => (
        <span>
          {record.periodStart} ~ {record.periodEnd}
        </span>
      ),
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#cf1322' }}>
          ¥{amount.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.totalAmount - b.totalAmount,
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 120,
      align: 'right',
      render: (amount) => (
        <Text style={{ color: '#52c41a' }}>¥{amount.toFixed(2)}</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
      filters: [
        { text: '未支付', value: 'unpaid' },
        { text: '部分支付', value: 'partial' },
        { text: '已支付', value: 'paid' },
        { text: '已逾期', value: 'overdue' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '到期日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date, record) => {
        const isOverdue = record.status === 'overdue';
        return (
          <Text type={isOverdue ? 'danger' : undefined}>
            {date}
            {record.overdueDays > 0 && (
              <div style={{ fontSize: 12, color: '#ff4d4f' }}>
                逾期 {record.overdueDays} 天
              </div>
            )}
          </Text>
        );
      },
      sorter: (a, b) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix(),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status !== 'paid' && record.status !== 'cancelled' && (
            <Button
              type="link"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handleRecordPayment(record)}
            >
              付款
            </Button>
          )}
          {record.status !== 'cancelled' && (
            <Popconfirm
              title="确定取消这个账单吗？"
              onConfirm={() => handleCancelBilling(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                取消
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待收金额"
              value={stats?.unpaidAmount || 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已收金额"
              value={stats?.paidAmount || 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="逾期账单"
              value={stats?.overdueCount || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="账单总数"
              value={stats?.totalCount || 0}
              prefix={<FileTextOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Input
              placeholder="搜索客户/项目"
              style={{ width: 200 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Select
              placeholder="账单状态"
              style={{ width: 150 }}
              value={filterStatus}
              onChange={(value) => {
                setFilterStatus(value);
                loadBillings();
              }}
              allowClear
            >
              <Option value="">全部</Option>
              <Option value="unpaid">未支付</Option>
              <Option value="partial">部分支付</Option>
              <Option value="paid">已支付</Option>
              <Option value="overdue">已逾期</Option>
            </Select>
            <RangePicker
              value={dateRange as any}
              onChange={(dates) => {
                setDateRange(dates || []);
                loadStats();
              }}
            />
          </Space>
        </Space>
      </Card>

      {/* 账单表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={billings}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 账单详情 Modal */}
      <Modal
        title="账单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {currentBilling && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="账单编号" span={2}>
                <Text code>{currentBilling.billingNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="合同编号">
                {currentBilling.contractNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="项目名称">
                {currentBilling.projectName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="客户名称">
                {currentBilling.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="账单类型">
                {currentBilling.billingType}
              </Descriptions.Item>
              <Descriptions.Item label="账期开始">
                {currentBilling.periodStart}
              </Descriptions.Item>
              <Descriptions.Item label="账期结束">
                {currentBilling.periodEnd}
              </Descriptions.Item>
            </Descriptions>

            <Divider>费用明细</Divider>

            <Descriptions column={2} bordered>
              <Descriptions.Item label="租金">
                ¥{currentBilling.rentalFee.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="押金">
                ¥{currentBilling.deposit.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="运费">
                ¥{currentBilling.shippingFee.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="改装费">
                ¥{currentBilling.modificationFee.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="滞纳金">
                <Text type="danger">¥{currentBilling.lateFee.toFixed(2)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="调整金额">
                ¥{currentBilling.adjustment.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="总金额" span={2}>
                <Text strong style={{ fontSize: 16, color: '#cf1322' }}>
                  ¥{currentBilling.totalAmount.toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider>支付信息</Divider>

            <Descriptions column={2} bordered>
              <Descriptions.Item label="已付金额">
                <Text style={{ color: '#52c41a', fontSize: 16 }}>
                  ¥{currentBilling.paidAmount.toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="待付金额">
                <Text strong style={{ fontSize: 16 }}>
                  ¥{(currentBilling.totalAmount - currentBilling.paidAmount).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(currentBilling.status)}
              </Descriptions.Item>
              <Descriptions.Item label="到期日期">
                {currentBilling.dueDate}
              </Descriptions.Item>
              {currentBilling.paidDate && (
                <Descriptions.Item label="支付日期" span={2}>
                  {currentBilling.paidDate}
                </Descriptions.Item>
              )}
              {currentBilling.overdueDays > 0 && (
                <Descriptions.Item label="逾期天数" span={2}>
                  <Text type="danger">{currentBilling.overdueDays} 天</Text>
                </Descriptions.Item>
              )}
              {currentBilling.remark && (
                <Descriptions.Item label="备注" span={2}>
                  {currentBilling.remark}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Space>
        )}
      </Modal>

      {/* 记录付款 Modal */}
      <Modal
        title="记录付款"
        open={paymentModalVisible}
        onOk={handlePaymentSubmit}
        onCancel={() => {
          setPaymentModalVisible(false);
          paymentForm.resetFields();
        }}
        okText="确认付款"
        cancelText="取消"
      >
        {selectedBilling && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="账单编号">
                {selectedBilling.billingNumber}
              </Descriptions.Item>
              <Descriptions.Item label="客户">
                {selectedBilling.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="总金额">
                ¥{selectedBilling.totalAmount.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="已付金额">
                ¥{selectedBilling.paidAmount.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="待付金额">
                <Text strong>
                  ¥{(selectedBilling.totalAmount - selectedBilling.paidAmount).toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Form form={paymentForm} layout="vertical">
              <Form.Item
                name="amount"
                label="付款金额"
                rules={[
                  { required: true, message: '请输入付款金额' },
                  {
                    validator: (_, value) => {
                      if (value <= 0) {
                        return Promise.reject('付款金额必须大于0');
                      }
                      if (value > selectedBilling.totalAmount - selectedBilling.paidAmount) {
                        return Promise.reject('付款金额不能超过待付金额');
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="¥"
                  precision={2}
                  min={0}
                  max={selectedBilling.totalAmount - selectedBilling.paidAmount}
                />
              </Form.Item>

              <Form.Item
                name="paymentDate"
                label="付款日期"
                rules={[{ required: true, message: '请选择付款日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default BillingList;

