/**
 * 转租公司管理页面
 */

import React, { useEffect, useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Card,
  Dropdown,
  type MenuProps,
  Descriptions,
  Tabs,
  InputNumber,
  Select,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MoreOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { AppDispatch } from '../../app/store';
import {
  fetchCompanies,
  fetchCompanyDetail,
  createCompany,
  updateCompany,
  deleteCompany,
  createPayment,
  createReconciliation,
  fetchPayments,
  fetchReconciliations,
  selectCompanies,
  selectCurrentCompany,
  selectPayments,
  selectReconciliations,
  selectLoading,
  selectPagination,
  setPage,
  setPageSize,
  type SubleaseCompany,
} from './subleaseSlice';
import { TabsContext } from '../common/TabsContext';
import SubleaseCreatePage from './SubleaseCreatePage';
import dayjs from 'dayjs';

const { TextArea } = Input;

const SubleaseCompanyPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { openTab } = useContext(TabsContext);
  
  const companies = useSelector(selectCompanies);
  const currentCompany = useSelector(selectCurrentCompany);
  const payments = useSelector(selectPayments);
  const reconciliations = useSelector(selectReconciliations);
  const loading = useSelector(selectLoading);
  const { page, pageSize, total } = useSelector(selectPagination);
  
  const [searchText, setSearchText] = useState('');
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [reconciliationModalVisible, setReconciliationModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<SubleaseCompany | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  
  const [companyForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [reconciliationForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []); // 移除 page, pageSize 依赖，避免无限循环

  const loadData = () => {
    console.log('[SubleaseCompanyPage] Loading data...', { page, pageSize, searchText });
    dispatch(fetchCompanies({ page, pageSize, search: searchText }));
  };

  const handleSearch = () => {
    dispatch(setPage(1));
    dispatch(fetchCompanies({ page: 1, pageSize, search: searchText }));
  };

  const handleAddCompany = () => {
    setEditingCompany(null);
    companyForm.resetFields();
    setCompanyModalVisible(true);
  };

  const handleEditCompany = (company: SubleaseCompany) => {
    setEditingCompany(company);
    companyForm.setFieldsValue({
      companyName: company.companyName,
      contactPerson: company.contactPerson,
      contactPhone: company.contactPhone,
      contactEmail: company.contactEmail,
      address: company.address,
      businessLicense: company.businessLicense,
      taxId: company.taxId,
      bankName: company.bankName,
      bankAccount: company.bankAccount,
      creditRating: company.creditRating,
      remark: company.remark,
    });
    setCompanyModalVisible(true);
  };

  const handleSaveCompany = async (values: any) => {
    try {
      if (editingCompany) {
        await dispatch(updateCompany({ id: editingCompany.id, data: values })).unwrap();
        message.success('更新成功');
      } else {
        await dispatch(createCompany(values)).unwrap();
        message.success('创建成功');
      }
      setCompanyModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error || '操作失败');
    }
  };

  const handleDeleteCompany = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除公司将无法恢复，确定要删除吗？',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await dispatch(deleteCompany(id)).unwrap();
          message.success('删除成功');
          loadData();
        } catch (error: any) {
          message.error(error || '删除失败');
        }
      },
    });
  };

  const handleViewDetail = async (company: SubleaseCompany) => {
    setSelectedCompanyId(company.id);
    await dispatch(fetchCompanyDetail(company.id));
    await dispatch(fetchPayments(company.id));
    await dispatch(fetchReconciliations(company.id));
    setDetailModalVisible(true);
  };

  const handlePayment = (company: SubleaseCompany) => {
    setSelectedCompanyId(company.id);
    paymentForm.setFieldsValue({
      companyId: company.id,
      companyName: company.companyName,
      paymentDate: dayjs(),
      paymentAmount: company.outstandingAmount,
      paymentMethod: 'transfer',
    });
    setPaymentModalVisible(true);
  };

  const handleSavePayment = async (values: any) => {
    try {
      await dispatch(createPayment({
        ...values,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
      })).unwrap();
      message.success('付款记录创建成功');
      setPaymentModalVisible(false);
      paymentForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error || '创建失败');
    }
  };

  const handleReconciliation = (company: SubleaseCompany) => {
    setSelectedCompanyId(company.id);
    reconciliationForm.setFieldsValue({
      companyId: company.id,
      companyName: company.companyName,
      reconciliationDate: dayjs(),
      reconciliationAmount: company.totalPayable - company.totalPaid,
    });
    setReconciliationModalVisible(true);
  };

  const handleSaveReconciliation = async (values: any) => {
    try {
      await dispatch(createReconciliation({
        ...values,
        reconciliationDate: values.reconciliationDate.format('YYYY-MM-DD'),
        startDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
      })).unwrap();
      message.success('对账记录创建成功');
      setReconciliationModalVisible(false);
      reconciliationForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error || '创建失败');
    }
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '公司名称',
      key: 'companyInfo',
      width: 200,
      render: (_: any, record: SubleaseCompany) => (
        <div>
          <div className="font-medium">{record.companyName}</div>
          {record.contactPerson && (
            <div className="text-gray-500 text-xs">
              {record.contactPerson} {record.contactPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '转租中（台）',
      dataIndex: 'rentingCount',
      key: 'rentingCount',
      width: 100,
      align: 'center' as const,
      render: (count: number) => (
        <span className="text-blue-600 font-medium">{count}</span>
      ),
    },
    {
      title: '已还租（台）',
      dataIndex: 'returnedCount',
      key: 'returnedCount',
      width: 100,
      align: 'center' as const,
      render: (count: number) => (
        <span className="text-green-600">{count}</span>
      ),
    },
    {
      title: '闲置（台）',
      dataIndex: 'idleCount',
      key: 'idleCount',
      width: 100,
      align: 'center' as const,
      render: (count: number) => (
        <span className="text-gray-500">{count}</span>
      ),
    },
    {
      title: '应付金额',
      dataIndex: 'totalPayable',
      key: 'totalPayable',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => (
        <span className="font-medium">¥{amount.toLocaleString()}</span>
      ),
    },
    {
      title: '已付金额',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => (
        <span className="text-green-600">¥{amount.toLocaleString()}</span>
      ),
    },
    {
      title: '剩余应付',
      dataIndex: 'outstandingAmount',
      key: 'outstandingAmount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => (
        <span className={amount > 0 ? 'text-red-600 font-medium' : ''}>
          ¥{amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 100,
      render: (_: any, record: SubleaseCompany) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: '编辑',
            onClick: () => handleEditCompany(record),
          },
          {
            key: 'sublease',
            icon: <SwapOutlined />,
            label: '转租',
            onClick: () => {
              // 使用 TabsContext 打开新增转租页面
              const tabKey = `sublease-create-${record.id}-${Date.now()}`;
              openTab({
                key: tabKey,
                label: `新增转租：${record.companyName}`,
                content: <SubleaseCreatePage companyId={record.id} companyName={record.companyName} tabKey={tabKey} />,
              });
            },
          },
          {
            type: 'divider',
          },
          {
            key: 'payment',
            icon: <DollarOutlined />,
            label: '付款',
            disabled: record.outstandingAmount <= 0,
            onClick: () => handlePayment(record),
          },
          {
            key: 'reconciliation',
            icon: <FileTextOutlined />,
            label: '对账',
            onClick: () => handleReconciliation(record),
          },
          {
            key: 'paymentHistory',
            icon: <HistoryOutlined />,
            label: '付款记录',
            onClick: () => handleViewDetail(record),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除',
            danger: true,
            onClick: () => handleDeleteCompany(record.id),
          },
        ];

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="link" icon={<MoreOutlined />}>
              操作
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      {/* 搜索栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCompany}>
            新增公司
          </Button>
          <Input
            placeholder="按公司名/联系人/电话搜索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <Button icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
        </Space>
      </Card>

      {/* 公司列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={companies}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (newPage, newPageSize) => {
              dispatch(setPage(newPage));
              if (newPageSize !== pageSize) {
                dispatch(setPageSize(newPageSize));
              }
            },
          }}
        />
      </Card>

      {/* 新增/编辑公司弹窗 */}
      <Modal
        title={editingCompany ? '编辑转租公司' : '新增转租公司'}
        open={companyModalVisible}
        onCancel={() => {
          setCompanyModalVisible(false);
          companyForm.resetFields();
        }}
        onOk={() => companyForm.submit()}
        width={600}
      >
        <Form
          form={companyForm}
          layout="vertical"
          onFinish={handleSaveCompany}
        >
          <Form.Item
            label="公司名称"
            name="companyName"
            rules={[{ required: true, message: '请输入公司名称' }]}
          >
            <Input placeholder="请输入公司名称" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="联系人"
              name="contactPerson"
              style={{ flex: 1 }}
            >
              <Input placeholder="联系人" />
            </Form.Item>

            <Form.Item
              label="联系电话"
              name="contactPhone"
              style={{ flex: 1 }}
            >
              <Input placeholder="联系电话" />
            </Form.Item>
          </Space>

          <Form.Item label="公司地址" name="address">
            <Input placeholder="公司地址" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 付款弹窗 */}
      <Modal
        title="创建付款记录"
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          paymentForm.resetFields();
        }}
        onOk={() => paymentForm.submit()}
        width={600}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handleSavePayment}
        >
          <Form.Item name="companyId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="companyName" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            label="付款日期"
            name="paymentDate"
            rules={[{ required: true, message: '请选择付款日期' }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            label="付款金额"
            name="paymentAmount"
            rules={[{ required: true, message: '请输入付款金额' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>

          <Form.Item
            label="付款方式"
            name="paymentMethod"
            rules={[{ required: true, message: '请选择付款方式' }]}
          >
            <Select
              options={[
                { value: 'cash', label: '现金' },
                { value: 'transfer', label: '转账' },
                { value: 'check', label: '支票' },
                { value: 'other', label: '其他' },
              ]}
            />
          </Form.Item>

          <Form.Item label="付款账户" name="paymentAccount">
            <Input placeholder="付款账户信息" />
          </Form.Item>

          <Form.Item label="经办人" name="handlerName">
            <Input placeholder="经办人姓名" />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 对账弹窗 */}
      <Modal
        title="创建对账记录"
        open={reconciliationModalVisible}
        onCancel={() => {
          setReconciliationModalVisible(false);
          reconciliationForm.resetFields();
        }}
        onOk={() => reconciliationForm.submit()}
        width={600}
      >
        <Form
          form={reconciliationForm}
          layout="vertical"
          onFinish={handleSaveReconciliation}
        >
          <Form.Item name="companyId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="companyName" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            label="对账日期"
            name="reconciliationDate"
            rules={[{ required: true, message: '请选择对账日期' }]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            label="对账金额"
            name="reconciliationAmount"
            rules={[{ required: true, message: '请输入对账金额' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="公司详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={900}
      >
        {currentCompany && (
          <Tabs
            items={[
              {
                key: 'info',
                label: '基本信息',
                children: (
                  <Descriptions column={2} bordered>
                    <Descriptions.Item label="公司名称" span={2}>{currentCompany.companyName}</Descriptions.Item>
                    <Descriptions.Item label="联系人">{currentCompany.contactPerson}</Descriptions.Item>
                    <Descriptions.Item label="联系电话">{currentCompany.contactPhone}</Descriptions.Item>
                    <Descriptions.Item label="公司地址" span={2}>{currentCompany.address}</Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'payments',
                label: `付款记录 (${payments.length})`,
                children: (
                  <Table
                    dataSource={payments}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      {
                        title: '付款单号',
                        dataIndex: 'paymentNumber',
                        key: 'paymentNumber',
                      },
                      {
                        title: '付款日期',
                        dataIndex: 'paymentDate',
                        key: 'paymentDate',
                        render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
                      },
                      {
                        title: '付款金额',
                        dataIndex: 'paymentAmount',
                        key: 'paymentAmount',
                        render: (amount: number) => `¥${amount.toLocaleString()}`,
                      },
                      {
                        title: '付款方式',
                        dataIndex: 'paymentMethod',
                        key: 'paymentMethod',
                        render: (method: string) => {
                          const map: any = {
                            cash: '现金',
                            transfer: '转账',
                            check: '支票',
                            other: '其他',
                          };
                          return map[method] || method;
                        },
                      },
                    ]}
                  />
                ),
              },
              {
                key: 'reconciliations',
                label: `对账记录 (${reconciliations.length})`,
                children: (
                  <Table
                    dataSource={reconciliations}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      {
                        title: '对账单号',
                        dataIndex: 'reconciliationNumber',
                        key: 'reconciliationNumber',
                      },
                      {
                        title: '对账日期',
                        dataIndex: 'reconciliationDate',
                        key: 'reconciliationDate',
                        render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
                      },
                      {
                        title: '对账金额',
                        dataIndex: 'reconciliationAmount',
                        key: 'reconciliationAmount',
                        render: (amount: number) => `¥${amount.toLocaleString()}`,
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => {
                          const map: any = {
                            pending: '待确认',
                            confirmed: '已确认',
                            rejected: '已拒绝',
                          };
                          return map[status] || status;
                        },
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default SubleaseCompanyPage;

