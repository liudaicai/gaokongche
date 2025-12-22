import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  message,
  Tag,
  Popconfirm,
  Descriptions,
  Row,
  Col,
  Statistic,
  InputNumber,
  DatePicker,
  Upload,
  Divider,
  AutoComplete,
  Dropdown,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  UploadOutlined,
  MinusCircleOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { apiGet } from '../../api/client';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchPurchases,
  fetchPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
  fetchPurchaseStats,
  fetchManufacturers,
} from './purchasesSlice';
import type { EquipmentPurchase, PurchaseFormData, PurchaseType, PurchaseItem } from './types';

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Text } = Typography;

// 型号管理数据（用于设备明细联动选择）
interface EquipmentModel {
  id: number | string;
  category: string;
  brand: string;
  type: string;
  model: string;
  height: number;
  driveType: string;
}

const PurchasesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    purchases,
    currentPurchase,
    purchaseStats,
    manufacturers,
    pagination,
    loading,
  } = useSelector((state: RootState) => state.purchases);
  
  const user = useSelector((state: RootState) => state.auth.user);
  const isSuperAdmin = user?.role === 'superadmin';

  const [searchForm] = Form.useForm();
  const [form] = Form.useForm();

  const [models, setModels] = useState<EquipmentModel[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const [searchParams, setSearchParams] = useState<{
    purchaseType?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const [monthlyRepayment, setMonthlyRepayment] = useState<{
    totalScheduled: number;
    totalPaid: number;
    remaining: number;
    activePurchases: number;
    paidCount: number;
  } | null>(null);

  const [repaymentModalVisible, setRepaymentModalVisible] = useState(false);
  const [selectedPurchaseForRepayment, setSelectedPurchaseForRepayment] = useState<EquipmentPurchase | null>(null);
  const [repaymentForm] = Form.useForm();

  // 计算首付和贷款金额的函数
  const calculateFinance = () => {
    const items = form.getFieldValue('items') || [];
    const downPaymentRatio = form.getFieldValue('downPaymentRatio') || 0;
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item?.quantity || 0) * (item?.unitPrice || 0);
    }, 0);
    
    const downPayment = totalAmount * (downPaymentRatio / 100);
    const loanAmount = totalAmount * (1 - downPaymentRatio / 100);
    
    form.setFieldsValue({
      downPayment,
      loanAmount,
    });
  };

  const loadModels = async () => {
    try {
      const data = await apiGet<EquipmentModel[]>('/models');
      setModels(data || []);
    } catch (error) {
      console.error('加载型号列表失败:', error);
    }
  };

  const uniqSorted = (arr: string[]) =>
    Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN'));

  const updateItemAt = (index: number, patch: Partial<PurchaseItem>) => {
    const items = (form.getFieldValue('items') || []) as PurchaseItem[];
    const next = [...items];
    next[index] = { ...(next[index] || ({} as any)), ...patch } as PurchaseItem;
    form.setFieldsValue({ items: next });
  };

  const handleCategoryChange = (category: string | undefined, index: number) => {
    updateItemAt(index, {
      equipmentCategory: category || '',
      brand: '',
      equipmentType: '',
      equipmentModel: '',
      modelId: undefined,
      equipmentHeight: undefined,
      driveType: '',
    });
  };

  const handleBrandChange = (brand: string | undefined, index: number) => {
    updateItemAt(index, {
      brand: brand || '',
      equipmentType: '',
      equipmentModel: '',
      modelId: undefined,
      equipmentHeight: undefined,
      driveType: '',
    });
  };

  const handleTypeChange = (type: string | undefined, index: number) => {
    updateItemAt(index, {
      equipmentType: type || '',
      equipmentModel: '',
      modelId: undefined,
      equipmentHeight: undefined,
      driveType: '',
    });
  };

  const handleModelChange = (modelId: number | string | undefined, index: number) => {
    if (modelId === undefined || modelId === null) {
      updateItemAt(index, { modelId: undefined, equipmentModel: '', equipmentHeight: undefined, driveType: '' });
      return;
    }
    const selected = models.find((m) => String(m.id) === String(modelId));
    if (!selected) return;
    updateItemAt(index, {
      modelId: selected.id,
      equipmentCategory: selected.category,
      brand: selected.brand,
      equipmentType: selected.type,
      equipmentModel: selected.model,
      equipmentHeight: selected.height,
      driveType: selected.driveType,
    });
  };

  useEffect(() => {
    loadData();
    loadMonthlyRepayment();
    dispatch(fetchPurchaseStats());
    dispatch(fetchManufacturers());
    loadModels();
  }, [pagination.page, pagination.pageSize]);

  const loadData = () => {
    dispatch(
      fetchPurchases({
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...searchParams,
      })
    );
  };

  // 加载当月还款统计
  const loadMonthlyRepayment = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const response = await fetch(`/api/equipment-purchases/repayments/monthly-summary?year=${year}&month=${month}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      if (result.ok) {
        setMonthlyRepayment(result.data);
      }
    } catch (error) {
      console.error('加载月度还款统计失败:', error);
    }
  };

  // 打开还款记录弹窗
  const handleRecordRepayment = (purchase: EquipmentPurchase) => {
    setSelectedPurchaseForRepayment(purchase);
    const currentDate = new Date();
    repaymentForm.setFieldsValue({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      actualAmount: purchase.monthlyPayment || 0,
      repaymentDate: dayjs(),
    });
    setRepaymentModalVisible(true);
  };

  // 提交还款记录
  const handleRepaymentSubmit = async () => {
    try {
      const values = await repaymentForm.validateFields();
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      
      const response = await fetch(`/api/equipment-purchases/${selectedPurchaseForRepayment?.id}/repayment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          year: values.year,
          month: values.month,
          actualAmount: values.actualAmount,
          repaymentDate: dayjs(values.repaymentDate).format('YYYY-MM-DD'),
          remark: values.remark,
        }),
      });

      const result = await response.json();
      if (result.ok) {
        message.success('还款记录成功');
        setRepaymentModalVisible(false);
        repaymentForm.resetFields();
        loadMonthlyRepayment(); // 重新加载统计
      } else {
        message.error(result.error || '记录失败');
      }
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
    }
  };

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    const dateRange = values.dateRange;
    const params = {
      ...values,
      startDate: dateRange ? dayjs(dateRange[0]).format('YYYY-MM-DD') : undefined,
      endDate: dateRange ? dayjs(dateRange[1]).format('YYYY-MM-DD') : undefined,
      dateRange: undefined,
    };
    setSearchParams(params);
    dispatch(fetchPurchases({ page: 1, pageSize: pagination.pageSize, ...params }));
  };

  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams({});
    dispatch(fetchPurchases({ page: 1, pageSize: pagination.pageSize }));
  };

  const handleAdd = async () => {
    setIsEditing(false);
    form.resetFields();
    
    // 生成采购单号 CG+年月日-X
    const purchaseOrderNumber = await generatePurchaseOrderNumber();
    
    form.setFieldsValue({
      purchaseOrderNumber,
      purchaseDate: dayjs(),
      paymentTerms: 0,
      taxRate: 13,
      purchaseType: 'cash',
      warrantyPeriod: 12,
      items: [
        {
          modelId: undefined,
          equipmentCategory: '',
          brand: '',
          equipmentType: '',
          equipmentModel: '',
          equipmentHeight: undefined,
          driveType: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
    });
    setFileList([]);
    setModalVisible(true);
  };

  // 生成采购单号
  const generatePurchaseOrderNumber = async () => {
    const today = dayjs().format('YYYYMMDD');
    try {
      // 获取今天已有的采购记录数量
      const response = await apiGet<{ data: EquipmentPurchase[] }>(`/equipment-purchases?purchaseDate=${today}`);
      const count = response.data?.length || 0;
      return `CG${today}-${count + 1}`;
    } catch (error) {
      // 如果获取失败，使用时间戳作为后缀
      return `CG${today}-${Date.now() % 1000}`;
    }
  };

  // 监听购买方式变化，清空相关字段
  const handlePurchaseTypeChange = (value: PurchaseType) => {
    if (value === 'cash') {
      // 全款：清空所有分期和融资字段
      form.setFieldsValue({
        downPaymentRatio: undefined,
        downPayment: undefined,
        loanAmount: undefined,
        installmentPeriods: undefined,
        installmentStartMonth: undefined,
        installmentEndMonth: undefined,
        annualInterestRate: undefined,
        financingPeriods: undefined,
        flexibleLoanPeriods: undefined,
        financingStartMonth: undefined,
        financingEndMonth: undefined,
        monthlyPayment: undefined,
      });
    } else if (value === 'installment') {
      // 分期：清空融资相关字段
      form.setFieldsValue({
        annualInterestRate: undefined,
        financingPeriods: undefined,
        flexibleLoanPeriods: undefined,
        financingStartMonth: undefined,
        financingEndMonth: undefined,
      });
    } else if (value === 'financing') {
      // 融资：清空分期相关字段
      form.setFieldsValue({
        installmentPeriods: undefined,
        installmentStartMonth: undefined,
        installmentEndMonth: undefined,
      });
    }
  };

  // 计算财务数据
  const calculatePaymentInfo = () => {
    const purchaseType = form.getFieldValue('purchaseType');
    const items = form.getFieldValue('items') || [];
    
    // 计算设备总额
    let totalAmount = 0;
    items.forEach((item: any) => {
      if (item && item.quantity && item.unitPrice) {
        totalAmount += item.quantity * item.unitPrice;
      }
    });

    if (purchaseType === 'installment' || purchaseType === 'financing') {
      const downPaymentRatio = form.getFieldValue('downPaymentRatio') || 0;
      
      // 计算首付金额
      const downPayment = totalAmount * (downPaymentRatio / 100);
      
      // 计算分期/融资金额
      const loanAmount = totalAmount - downPayment;
      
      form.setFieldsValue({
        downPayment: downPayment.toFixed(2),
        loanAmount: loanAmount.toFixed(2),
      });

      if (purchaseType === 'installment') {
        // 分期：计算月供金额和起止月份
        const installmentPeriods = form.getFieldValue('installmentPeriods') || 1;
        const purchaseDate = form.getFieldValue('purchaseDate');
        const paymentTerms = form.getFieldValue('paymentTerms') || 0;
        const monthlyPayment = loanAmount / installmentPeriods;
        
        const updates: any = {
          monthlyPayment: monthlyPayment.toFixed(2),
        };
        
        // 计算起止月份
        if (purchaseDate) {
          // 起始月份 = 采购日期当月 + 1个月 + 账期数
          const startMonth = dayjs(purchaseDate).add(1 + paymentTerms, 'month');
          // 结束月份 = 起始月份 + 分期数 - 1个月
          const endMonth = startMonth.add(installmentPeriods - 1, 'month');
          
          updates.installmentStartMonth = startMonth.format('YYYY-MM');
          updates.installmentEndMonth = endMonth.format('YYYY-MM');
        }
        
        form.setFieldsValue(updates);
      } else if (purchaseType === 'financing') {
        // 融资：计算还款起始和结束月份
        const purchaseDate = form.getFieldValue('purchaseDate');
        const paymentTerms = form.getFieldValue('paymentTerms') || 0;
        const flexibleLoanPeriods = form.getFieldValue('flexibleLoanPeriods') || 0;
        const financingPeriods = form.getFieldValue('financingPeriods') || 1;
        
        if (purchaseDate) {
          // 开始日期 = 购买月 + 账期月 + 灵活贷期数月
          const startMonth = dayjs(purchaseDate).add(paymentTerms + flexibleLoanPeriods, 'month');
          // 结束日期 = 开始月 + 融资期数月
          const endMonth = startMonth.add(financingPeriods, 'month');
          
          form.setFieldsValue({
            financingStartMonth: startMonth.format('YYYY-MM'),
            financingEndMonth: endMonth.format('YYYY-MM'),
          });
        }
        
        // 融资月供计算（简化版，实际需要考虑利率）
        const annualInterestRate = form.getFieldValue('annualInterestRate') || 0;
        const monthlyRate = annualInterestRate / 100 / 12;
        
        let monthlyPayment;
        if (monthlyRate === 0) {
          monthlyPayment = loanAmount / financingPeriods;
        } else {
          // 等额本息计算公式
          monthlyPayment = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, financingPeriods) / 
            (Math.pow(1 + monthlyRate, financingPeriods) - 1);
        }
        
        form.setFieldsValue({
          monthlyPayment: monthlyPayment.toFixed(2),
        });
      }
    }
  };

  const handleEdit = async (record: EquipmentPurchase) => {
    setIsEditing(true);
    await dispatch(fetchPurchase(record.id));
    const purchase = currentPurchase || record;

    const itemsWithModelId = (purchase.items || []).map((it: any) => {
      const match = models.find(
        (m) =>
          m.category === it.equipmentCategory &&
          m.brand === it.brand &&
          m.type === it.equipmentType &&
          m.model === it.equipmentModel
      );
      return {
        ...it,
        modelId: match ? match.id : undefined,
        equipmentHeight: it.equipmentHeight ?? match?.height,
        driveType: it.driveType ?? match?.driveType ?? '',
      };
    });

    // 根据购买方式映射起止月份字段
    const formValues: any = {
      ...purchase,
      purchaseDate: dayjs(purchase.purchaseDate),
      items: itemsWithModelId,
    };
    
    // 将后端的 repaymentStartDate/repaymentEndDate/repaymentPeriod 映射到前端对应字段
    if (purchase.purchaseType === 'installment') {
      formValues.installmentStartMonth = purchase.repaymentStartDate 
        ? dayjs(purchase.repaymentStartDate.substring(0, 7)) 
        : null;
      formValues.installmentEndMonth = purchase.repaymentEndDate 
        ? dayjs(purchase.repaymentEndDate.substring(0, 7)) 
        : null;
      formValues.installmentPeriods = purchase.repaymentPeriod;
    } else if (purchase.purchaseType === 'financing') {
      formValues.financingStartMonth = purchase.repaymentStartDate 
        ? dayjs(purchase.repaymentStartDate.substring(0, 7)) 
        : null;
      formValues.financingEndMonth = purchase.repaymentEndDate 
        ? dayjs(purchase.repaymentEndDate.substring(0, 7)) 
        : null;
      formValues.financingPeriods = purchase.repaymentPeriod;
    }
    
    form.setFieldsValue(formValues);

    // 设置附件列表
    if (purchase.attachments && purchase.attachments.length > 0) {
      const files: UploadFile[] = purchase.attachments.map((att, index) => ({
        uid: String(index),
        name: att.name,
        status: 'done',
        url: att.url,
      }));
      setFileList(files);
    } else {
      setFileList([]);
    }

    setModalVisible(true);
  };

  const handleView = async (record: EquipmentPurchase) => {
    await dispatch(fetchPurchase(record.id));
    setDetailModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deletePurchase(id)).unwrap();
      message.success('删除成功');
      loadData();
      dispatch(fetchPurchaseStats());
    } catch (error: any) {
      message.error(error || '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理附件
      const attachments = fileList.map(file => ({
        name: file.name,
        url: file.url || file.response?.url || '',
        size: file.size,
      }));

      const cleanedItems = (values.items || []).map((it: any) => {
        const { modelId, ...rest } = it || {};
        return rest;
      });

      // 根据购买方式映射起止月份和还款期数
      let repaymentStartDate: string | undefined;
      let repaymentEndDate: string | undefined;
      let repaymentPeriod: number | undefined;
      
      if (values.purchaseType === 'installment') {
        // 分期付款：使用 installmentStartMonth/installmentEndMonth
        repaymentStartDate = values.installmentStartMonth
          ? dayjs(values.installmentStartMonth).format('YYYY-MM') + '-01'
          : undefined;
        repaymentEndDate = values.installmentEndMonth
          ? dayjs(values.installmentEndMonth).format('YYYY-MM') + '-01'
          : undefined;
        repaymentPeriod = values.installmentPeriods;
      } else if (values.purchaseType === 'financing') {
        // 融资：使用 financingStartMonth/financingEndMonth
        repaymentStartDate = values.financingStartMonth
          ? dayjs(values.financingStartMonth).format('YYYY-MM') + '-01'
          : undefined;
        repaymentEndDate = values.financingEndMonth
          ? dayjs(values.financingEndMonth).format('YYYY-MM') + '-01'
          : undefined;
        repaymentPeriod = values.financingPeriods;
      }

      const data: PurchaseFormData = {
        ...values,
        purchaseDate: dayjs(values.purchaseDate).format('YYYY-MM-DD'),
        repaymentStartDate,
        repaymentEndDate,
        repaymentPeriod,
        attachments,
        items: cleanedItems,
      };

      if (isEditing && currentPurchase) {
        await dispatch(updatePurchase({ id: currentPurchase.id, data })).unwrap();
        message.success('更新成功');
      } else {
        await dispatch(createPurchase(data)).unwrap();
        message.success('创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      setFileList([]);
      loadData();
      dispatch(fetchPurchaseStats());
    } catch (error: any) {
      message.error(error || '操作失败');
    }
  };

  const getPurchaseTypeTag = (type: PurchaseType) => {
    const typeConfig = {
      cash: { color: 'green', text: '全款' },
      installment: { color: 'blue', text: '分期' },
      financing: { color: 'orange', text: '融资' },
    };
    const config = typeConfig[type] || { color: 'default', text: type || '未知' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<EquipmentPurchase> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      fixed: 'left',
      render: (_, __, index) => (pagination.page - 1) * pagination.pageSize + index + 1,
    },
    {
      title: '厂家名称',
      dataIndex: 'manufacturerName',
      key: 'manufacturerName',
      width: 150,
      fixed: 'left',
    },
    {
      title: '采购日期',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 110,
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '购买方式',
      dataIndex: 'purchaseType',
      key: 'purchaseType',
      width: 100,
      render: (type) => getPurchaseTypeTag(type),
    },
    {
      title: '采购设备',
      key: 'equipment',
      width: 350,
      render: (_, record) => {
        const items = record.items || [];
        if (items.length === 0) return '-';
        return (
          <div>
            {items.map((item, index) => (
              <div key={index} style={{ lineHeight: '1.8', borderBottom: index < items.length - 1 ? '1px dashed #f0f0f0' : 'none', paddingBottom: index < items.length - 1 ? '4px' : '0', marginBottom: index < items.length - 1 ? '4px' : '0' }}>
                <Text strong>{item.equipmentType}</Text> / {item.equipmentModel} 
                {item.equipmentHeight && <Text type="secondary"> / {item.equipmentHeight}m</Text>}
                <Text type="secondary"> × {item.quantity}台</Text>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: '采购总金额',
      dataIndex: 'totalWithTax',
      key: 'totalWithTax',
      width: 130,
      align: 'right',
      render: (amount) => {
        const num = typeof amount === 'number' ? amount : parseFloat(amount);
        return <Text strong>¥{!isNaN(num) ? num.toFixed(2) : '0.00'}</Text>;
      },
    },
    {
      title: '还款起止时间',
      key: 'repaymentPeriod',
      width: 140,
      render: (_, record) => {
        if (!['installment', 'financing'].includes(record.purchaseType)) {
          return <Text type="secondary">-</Text>;
        }
        if (!record.repaymentStartDate || !record.repaymentEndDate) {
          return <Text type="secondary">未设置</Text>;
        }
        return (
          <div>
            <div>{dayjs(record.repaymentStartDate).format('YYYY-MM')}</div>
            <div style={{ color: '#999', fontSize: '12px' }}>至</div>
            <div>{dayjs(record.repaymentEndDate).format('YYYY-MM')}</div>
          </div>
        );
      },
    },
    {
      title: '月供金额',
      dataIndex: 'monthlyPayment',
      key: 'monthlyPayment',
      width: 120,
      align: 'right',
      render: (payment, record) => {
        if (!['installment', 'financing'].includes(record.purchaseType)) {
          return <Text type="secondary">-</Text>;
        }
        if (!payment) return <Text type="secondary">未设置</Text>;
        const num = typeof payment === 'number' ? payment : parseFloat(payment);
        return <Text strong style={{ color: '#1890ff' }}>¥{!isNaN(num) ? num.toFixed(2) : '0.00'}</Text>;
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 80,
      render: (_, record) => {
        const menuItems = [
          {
            key: 'view',
            label: '详情',
            icon: <EyeOutlined />,
            onClick: () => handleView(record),
          },
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          },
        ];

        // 如果是分期或融资，添加还款记录选项
        if (['installment', 'financing'].includes(record.purchaseType) && record.monthlyPayment) {
          menuItems.push({
            key: 'repayment',
            label: '还款',
            icon: <DollarOutlined />,
            onClick: () => handleRecordRepayment(record),
          });
        }

        menuItems.push({
          type: 'divider' as const,
        });

        menuItems.push({
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => {
            Modal.confirm({
              title: '确定要删除此采购记录吗？',
              onOk: () => handleDelete(record.id),
            });
          },
        });

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="primary" size="small" icon={<MoreOutlined />}>
              操作
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  // 明细表格列（用于详情展示）
  const itemColumns: ColumnsType<PurchaseItem> = [
    {
      title: '设备类别',
      dataIndex: 'equipmentCategory',
      key: 'equipmentCategory',
    },
    {
      title: '设备类型',
      dataIndex: 'equipmentType',
      key: 'equipmentType',
    },
    {
      title: '设备型号',
      dataIndex: 'equipmentModel',
      key: 'equipmentModel',
    },
    {
      title: '高度',
      dataIndex: 'equipmentHeight',
      key: 'equipmentHeight',
      width: 80,
      render: (height) => (height ? `${height}m` : '-'),
    },
    {
      title: '驱动类型',
      dataIndex: 'driveType',
      key: 'driveType',
      width: 100,
      render: (driveType) => driveType || '-',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (qty) => `${qty}台`,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (price) => {
        const num = typeof price === 'number' ? price : parseFloat(price);
        return `¥${!isNaN(num) ? num.toFixed(2) : '0.00'}`;
      },
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 120,
      render: (subtotal) => {
        const num = typeof subtotal === 'number' ? subtotal : parseFloat(subtotal);
        return `¥${!isNaN(num) ? num.toFixed(2) : '0.00'}`;
      },
    },
  ];

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {purchaseStats && (
          <>
            <Col span={6}>
              <Card>
                <Statistic
                  title="采购总数"
                  value={purchaseStats.totalPurchases}
                  prefix={<ShoppingCartOutlined />}
                  suffix="单"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="采购总额"
                  value={purchaseStats.totalWithTax}
                  prefix={<DollarOutlined />}
                  precision={2}
                  suffix="元"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="全款采购"
                  value={purchaseStats.cashAmount}
                  precision={2}
                  valueStyle={{ color: '#52c41a' }}
                  suffix="元"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="分期/融资"
                  value={purchaseStats.financingAmount}
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                  suffix="元"
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* 当月还款统计 */}
      {monthlyRepayment && (
        <Card style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space size="large">
                <div>
                  <Text type="secondary">当月应还款</Text>
                  <div>
                    <Text strong style={{ fontSize: 24, color: '#1890ff' }}>
                      ¥{(monthlyRepayment.totalScheduled || 0).toFixed(2)}
                    </Text>
                  </div>
                </div>
                <Divider type="vertical" style={{ height: 40 }} />
                <div>
                  <Text type="secondary">已还款</Text>
                  <div>
                    <Text strong style={{ fontSize: 20, color: '#52c41a' }}>
                      ¥{(monthlyRepayment.totalPaid || 0).toFixed(2)}
                    </Text>
                  </div>
                </div>
                <Divider type="vertical" style={{ height: 40 }} />
                <div>
                  <Text type="secondary">待还款</Text>
                  <div>
                    <Text strong style={{ fontSize: 20, color: (monthlyRepayment.remaining || 0) > 0 ? '#ff4d4f' : '#52c41a' }}>
                      ¥{(monthlyRepayment.remaining || 0).toFixed(2)}
                    </Text>
                  </div>
                </div>
                <Divider type="vertical" style={{ height: 40 }} />
                <div>
                  <Text type="secondary">还款笔数</Text>
                  <div>
                    <Text strong style={{ fontSize: 18 }}>
                      {monthlyRepayment.paidCount} / {monthlyRepayment.activePurchases}
                    </Text>
                  </div>
                </div>
              </Space>
            </Col>
            <Col>
              <Button type="primary" onClick={() => loadMonthlyRepayment()}>
                刷新统计
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 搜索栏 */}
        <Form form={searchForm} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item name="purchaseType" label="购买方式">
            <Select placeholder="请选择" style={{ width: 120 }} allowClear>
              <Select.Option value="cash">全款</Select.Option>
              <Select.Option value="installment">分期</Select.Option>
              <Select.Option value="financing">融资</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="采购日期">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 操作按钮 */}
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增采购
          </Button>
        </div>

        {/* 表格 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            columns={columns}
            dataSource={purchases}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1500 }}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                dispatch(fetchPurchases({ page, pageSize, ...searchParams }));
              },
            }}
          />
        </div>
      </Card>

      {/* 新增/编辑对话框 */}
      <Modal
        title={isEditing ? '编辑采购记录' : '新增采购记录'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setFileList([]);
        }}
        width={1200}
      >
        <Form form={form} layout="vertical">
          {isSuperAdmin && !isEditing && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item 
                  name="companyId" 
                  label="公司ID（必填）" 
                  rules={[{ required: true, message: 'Superadmin 必须指定公司ID' }]}
                  extra="请输入要创建采购记录的公司ID"
                >
                  <InputNumber style={{ width: '100%' }} placeholder="请输入公司ID" min={1} />
                </Form.Item>
              </Col>
            </Row>
          )}
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="purchaseOrderNumber" label="采购单号" rules={[{ required: true }]}>
                <Input placeholder="系统自动生成" disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="purchaseDate" label="采购日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">设备明细</Divider>

          <Form.List name="items" rules={[{ required: true, message: '至少添加一个设备' }]}>
            {(fields, { add, remove }) => (
              <>
                <Table
                  dataSource={fields}
                  columns={[
                    {
                      title: '设备类别',
                      dataIndex: 'equipmentCategory',
                      key: 'equipmentCategory',
                      width: 130,
                      render: (_, field) => (
                        <Form.Item
                          name={[field.name, 'equipmentCategory']}
                          rules={[{ required: true, message: '必填' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="请选择类别"
                            showSearch
                            allowClear
                            options={uniqSorted(models.map((m) => m.category)).map((v) => ({ label: v, value: v }))}
                            onChange={(v) => handleCategoryChange(v, field.name)}
                            filterOption={(input, option) =>
                              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '品牌',
                      dataIndex: 'brand',
                      key: 'brand',
                      width: 120,
                      render: (_, field) => (
                        <Form.Item noStyle shouldUpdate>
                          {() => {
                            const items = (form.getFieldValue('items') || []) as PurchaseItem[];
                            const current = items[field.name] || ({} as PurchaseItem);
                            const brands = uniqSorted(
                              models
                                .filter((m) => !current.equipmentCategory || m.category === current.equipmentCategory)
                                .map((m) => m.brand)
                            );
                            return (
                        <Form.Item
                          name={[field.name, 'brand']}
                          rules={[{ required: true, message: '必填' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="请选择品牌"
                            showSearch
                            allowClear
                            disabled={!current.equipmentCategory}
                            options={brands.map((v) => ({ label: v, value: v }))}
                            onChange={(v) => handleBrandChange(v, field.name)}
                            filterOption={(input, option) =>
                              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          />
                        </Form.Item>
                            );
                          }}
                        </Form.Item>
                      ),
                    },
                    {
                      title: '设备类型',
                      dataIndex: 'equipmentType',
                      key: 'equipmentType',
                      width: 120,
                      render: (_, field) => (
                        <Form.Item noStyle shouldUpdate>
                          {() => {
                            const items = (form.getFieldValue('items') || []) as PurchaseItem[];
                            const current = items[field.name] || ({} as PurchaseItem);
                            const types = uniqSorted(
                              models
                                .filter(
                                  (m) =>
                                    (!current.equipmentCategory || m.category === current.equipmentCategory) &&
                                    (!current.brand || m.brand === current.brand)
                                )
                                .map((m) => m.type)
                            );
                            return (
                        <Form.Item
                          name={[field.name, 'equipmentType']}
                          rules={[{ required: true, message: '必填' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="请选择类型"
                            showSearch
                            allowClear
                            disabled={!current.equipmentCategory || !current.brand}
                            options={types.map((v) => ({ label: v, value: v }))}
                            onChange={(v) => handleTypeChange(v, field.name)}
                            filterOption={(input, option) =>
                              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          />
                        </Form.Item>
                            );
                          }}
                        </Form.Item>
                      ),
                    },
                    {
                      title: '设备型号',
                      dataIndex: 'modelId',
                      key: 'modelId',
                      width: 130,
                      render: (_, field) => (
                        <Form.Item noStyle shouldUpdate>
                          {() => {
                            const items = (form.getFieldValue('items') || []) as PurchaseItem[];
                            const current = items[field.name] || ({} as PurchaseItem);
                            const candidates = models.filter(
                              (m) =>
                                (!current.equipmentCategory || m.category === current.equipmentCategory) &&
                                (!current.brand || m.brand === current.brand) &&
                                (!current.equipmentType || m.type === current.equipmentType)
                            );
                            const options = candidates
                              .sort((a, b) => a.model.localeCompare(b.model, 'zh-CN'))
                              .map((m) => ({
                                value: m.id,
                                label: `${m.model} (${m.height}m/${m.driveType})`,
                              }));
                            return (
                        <Form.Item
                          name={[field.name, 'modelId']}
                          rules={[{ required: true, message: '必填' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="请选择型号"
                            showSearch
                            allowClear
                            disabled={!current.equipmentCategory || !current.brand || !current.equipmentType}
                            options={options}
                            onChange={(v) => handleModelChange(v, field.name)}
                            filterOption={(input, option) =>
                              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          />
                        </Form.Item>
                            );
                          }}
                        </Form.Item>
                      ),
                    },
                    {
                      title: '高度（米）',
                      dataIndex: 'equipmentHeight',
                      key: 'equipmentHeight',
                      width: 100,
                      render: (_, field) => (
                        <Form.Item
                          name={[field.name, 'equipmentHeight']}
                          rules={[{ required: true, message: '必填' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="自动填充" disabled />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '驱动类型',
                      dataIndex: 'driveType',
                      key: 'driveType',
                      width: 110,
                      render: (_, field) => (
                        <Form.Item
                          name={[field.name, 'driveType']}
                          rules={[{ required: true, message: '必填' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="自动填充" disabled />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '采购数量',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      width: 90,
                      render: (_, field) => (
                        <Form.Item
                          name={[field.name, 'quantity']}
                          rules={[{ required: true, message: '必填' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={1} style={{ width: '100%' }} onChange={calculateFinance} />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '单价（元）',
                      dataIndex: 'unitPrice',
                      key: 'unitPrice',
                      width: 110,
                      render: (_, field) => (
                        <Form.Item
                          name={[field.name, 'unitPrice']}
                          rules={[{ required: true, message: '必填' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={0} precision={2} style={{ width: '100%' }} onChange={calculateFinance} />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '操作',
                      key: 'action',
                      width: 80,
                      render: (_, field, index) => (
                        <Button
                          type="link"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(field.name)}
                          disabled={fields.length === 1}
                        >
                          删除
                        </Button>
                      ),
                    },
                  ]}
                  pagination={false}
                  size="small"
                  rowKey="key"
                />
                <Button
                  type="dashed"
                  onClick={() =>
                    add({
                      modelId: undefined,
                      equipmentCategory: '',
                      brand: '',
                      equipmentType: '',
                      equipmentModel: '',
                      equipmentHeight: undefined,
                      driveType: '',
                      quantity: 1,
                      unitPrice: 0,
                    })
                  }
                  block
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                >
                  添加设备
                </Button>
              </>
            )}
          </Form.List>

          <Divider orientation="left">付款信息</Divider>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="purchaseType" label="购买方式" rules={[{ required: true }]}>
                <Select placeholder="请选择购买方式" onChange={handlePurchaseTypeChange}>
                  <Select.Option value="cash">全款</Select.Option>
                  <Select.Option value="installment">分期</Select.Option>
                  <Select.Option value="financing">融资</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="taxRate" label="税率（%）">
                <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="warrantyPeriod" label="质保期（月）">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.purchaseType !== currentValues.purchaseType}>
            {({ getFieldValue }) => {
              const purchaseType = getFieldValue('purchaseType');
              
              if (purchaseType === 'installment') {
                // 分期付款字段
                return (
                  <>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item name="downPaymentRatio" label="首付比例（%）" rules={[{ required: true }]}>
                          <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={calculatePaymentInfo} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="paymentTerms" label="账期（月）" rules={[{ required: true }]}>
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="downPayment" label="首付金额（元）">
                          <Input disabled placeholder="自动计算" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="loanAmount" label="分期金额（元）">
                          <Input disabled placeholder="自动计算" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item name="installmentPeriods" label="分期期数（月）" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} onChange={calculatePaymentInfo} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="installmentStartMonth" label="月供起始月份">
                          <Input disabled placeholder="自动计算" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="installmentEndMonth" label="月供结束月份">
                          <Input disabled placeholder="自动计算" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="monthlyPayment" label="月供金额（元）">
                          <Input disabled placeholder="自动计算" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                );
              } else if (purchaseType === 'financing') {
                // 融资字段
                return (
                  <>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item name="downPaymentRatio" label="首付比例（%）" rules={[{ required: true }]}>
                          <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={calculatePaymentInfo} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="paymentTerms" label="账期（月）" rules={[{ required: true }]}>
                          <InputNumber min={0} style={{ width: '100%' }} onChange={calculatePaymentInfo} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="downPayment" label="首付金额（元）">
                          <Input disabled placeholder="自动计算" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="loanAmount" label="融资金额（元）">
                          <Input disabled placeholder="自动计算" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item name="financingPeriods" label="融资期数（月）" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} onChange={calculatePaymentInfo} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="annualInterestRate" label="融资年利率（%）" rules={[{ required: true }]}>
                          <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} onChange={calculatePaymentInfo} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="flexibleLoanPeriods" label="灵活贷期数（月）" rules={[{ required: true }]}>
                          <InputNumber min={0} style={{ width: '100%' }} onChange={calculatePaymentInfo} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="monthlyPayment" label="月供金额（元）">
                          <Input disabled placeholder="自动计算" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="financingStartMonth" label="融资还款起始月份">
                          <Input disabled placeholder="自动计算" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="financingEndMonth" label="融资还款结束月份">
                          <Input disabled placeholder="自动计算" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                );
              }
              
              return null; // 全款不显示额外字段
            }}
          </Form.Item>

          <Divider orientation="left">附件</Divider>

          <Form.Item label="合同及相关单据">
            <Upload
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              multiple
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情对话框 */}
      <Modal
        title="采购记录详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={1000}
      >
        {currentPurchase && (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="采购单号" span={2}>
                {currentPurchase.purchaseNumber}
              </Descriptions.Item>
              <Descriptions.Item label="厂家">{currentPurchase.manufacturerName}</Descriptions.Item>
              <Descriptions.Item label="品牌">{currentPurchase.brand || '-'}</Descriptions.Item>
              <Descriptions.Item label="采购日期" span={2}>
                {dayjs(currentPurchase.purchaseDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="首付比例">{currentPurchase.downPaymentRatio ? `${currentPurchase.downPaymentRatio}%` : '-'}</Descriptions.Item>
              <Descriptions.Item label="账期">{currentPurchase.paymentTerms}月</Descriptions.Item>
              <Descriptions.Item label="税率">{currentPurchase.taxRate}%</Descriptions.Item>
              <Descriptions.Item label="质保期">{currentPurchase.warrantyPeriod}月</Descriptions.Item>
              <Descriptions.Item label="购买方式">
                {getPurchaseTypeTag(currentPurchase.purchaseType)}
              </Descriptions.Item>
              {['installment', 'financing'].includes(currentPurchase.purchaseType) && (
                <>
                  <Descriptions.Item label="首付金额">
                    {currentPurchase.downPayment ? `¥${parseFloat(currentPurchase.downPayment).toFixed(2)}` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="贷款/分期金额">
                    {currentPurchase.loanAmount ? `¥${parseFloat(currentPurchase.loanAmount).toFixed(2)}` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="年利率">
                    {currentPurchase.annualInterestRate ? `${currentPurchase.annualInterestRate}%` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="还款期限">
                    {currentPurchase.repaymentPeriod ? `${currentPurchase.repaymentPeriod}月` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="还款开始">
                    {currentPurchase.repaymentStartDate
                      ? dayjs(currentPurchase.repaymentStartDate).format('YYYY-MM')
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="还款结束">
                    {currentPurchase.repaymentEndDate
                      ? dayjs(currentPurchase.repaymentEndDate).format('YYYY-MM')
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="月供金额">
                    {currentPurchase.monthlyPayment ? `¥${parseFloat(currentPurchase.monthlyPayment).toFixed(2)}` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="还款账户名称">
                    {currentPurchase.repaymentAccountName || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="还款账号">
                    {currentPurchase.repaymentAccountNumber || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="还款银行">
                    {currentPurchase.repaymentBank || '-'}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="总金额">¥{currentPurchase.totalAmount ? parseFloat(currentPurchase.totalAmount).toFixed(2) : '0.00'}</Descriptions.Item>
              <Descriptions.Item label="税额">¥{currentPurchase.taxAmount ? parseFloat(currentPurchase.taxAmount).toFixed(2) : '0.00'}</Descriptions.Item>
              <Descriptions.Item label="含税总额">¥{currentPurchase.totalWithTax ? parseFloat(currentPurchase.totalWithTax).toFixed(2) : '0.00'}</Descriptions.Item>
              {currentPurchase.remark && (
                <Descriptions.Item label="备注" span={2}>
                  {currentPurchase.remark}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left">设备明细</Divider>
            <Table
              columns={itemColumns}
              dataSource={currentPurchase.items || []}
              rowKey="id"
              pagination={false}
              size="small"
            />

            {currentPurchase.attachments && currentPurchase.attachments.length > 0 && (
              <>
                <Divider orientation="left">附件</Divider>
                <Space direction="vertical">
                  {currentPurchase.attachments.map((att, index) => (
                    <a key={index} href={att.url} target="_blank" rel="noopener noreferrer">
                      {att.name}
                    </a>
                  ))}
                </Space>
              </>
            )}
          </>
        )}
      </Modal>

      {/* 还款记录Modal */}
      <Modal
        title="记录还款"
        open={repaymentModalVisible}
        onOk={handleRepaymentSubmit}
        onCancel={() => {
          setRepaymentModalVisible(false);
          repaymentForm.resetFields();
        }}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <Form form={repaymentForm} layout="vertical">
          <Form.Item label="采购单号">
            <Input value={selectedPurchaseForRepayment?.purchaseNumber} disabled />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="还款年份"
                name="year"
                rules={[{ required: true, message: '请选择年份' }]}
              >
                <InputNumber style={{ width: '100%' }} min={2020} max={2050} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="还款月份"
                name="month"
                rules={[{ required: true, message: '请选择月份' }]}
              >
                <InputNumber style={{ width: '100%' }} min={1} max={12} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="实际还款金额"
            name="actualAmount"
            rules={[
              { required: true, message: '请输入还款金额' },
              { type: 'number', min: 0, message: '金额必须大于0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              precision={2}
              addonAfter="元"
            />
          </Form.Item>

          <Form.Item
            label="还款日期"
            name="repaymentDate"
            rules={[{ required: true, message: '请选择还款日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <TextArea rows={3} placeholder="可选填写还款备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PurchasesPage;
