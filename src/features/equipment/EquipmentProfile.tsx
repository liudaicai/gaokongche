import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input, Select, Table, Space, Tag, Modal, Form, Upload, message, Card, Row, Col, Typography, Empty, Statistic, Dropdown, InputNumber, DatePicker, Divider } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, PaperClipOutlined, ShareAltOutlined, MoreOutlined, FileAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import type { AppDispatch } from '../../app/store';
import { apiGet, apiPost, apiPut, apiDelete, API_BASE } from '../../api/client';
import { selectStores, fetchStores } from '../stores/storesSlice';
import {
  fetchEquipmentsStart,
  fetchEquipmentsSuccess,
  fetchEquipmentsFailure,
  addEquipmentSuccess,
  deleteEquipmentSuccess,
  fetchInventoryStart,
  fetchInventorySuccess,
  fetchInventoryFailure,
  Equipment,
  selectEquipmentList,
  selectLoading,
  selectError
} from './equipmentslice';
import {
  renderEquipmentSource,
  renderRentalStatus,
  renderInsuranceStatus,
  renderContractName,
  formatHeight
} from './utils';

const { Search } = Input;
const { Option } = Select;

const buildFileUrl = (u?: string) => {
  const baseHost = API_BASE.replace(/\/api$/, '');
  if (!u) return '';
  if (/^https?:\/\//.test(u)) return u;
  const rel = u.startsWith('/') ? u : `/${u}`;
  return `${baseHost}${rel}`;
};
const inferExt = (name?: string) => {
  if (!name) return '';
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'JPG';
  if (lower.endsWith('.png')) return 'PNG';
  return '';
};
const friendlyType = (type?: string, name?: string) => {
  if (!type && name) return inferExt(name);
  if (!type) return '未知';
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('jpeg')) return 'JPG';
  if (type.includes('png')) return 'PNG';
  return type;
};
const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null) return '未知大小';
  const sizes = ['B','KB','MB','GB','TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes)/Math.log(1024));
  const val = bytes / Math.pow(1024,i);
  return `${val.toFixed(val >= 100 ? 0 : val >= 10 ? 1 : 2)} ${sizes[i]}`;
};
const handleDownloadAttachment = (file: { url?: string; name?: string }) => {
  const url = buildFileUrl(file.url);
  if (!url) {
    message.error('文件地址无效');
    return;
  }
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || '附件';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    window.open(url, '_blank');
  }
};

// 设备型号结构（用于从型号管理加载）
interface EquipmentModel {
  id: string;
  category: string;
  brand: string;
  model: string;
  type: string;
  height: number;
  driveType: string;
}

const EquipmentProfile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const equipmentList = useSelector(selectEquipmentList);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const [searchParams, setSearchParams] = useState({
    code: '',
    customCode: '',
    type: '',
    height: ''
  });
  const [filteredList, setFilteredList] = useState<Equipment[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState<Partial<Equipment>>({});
  const [form] = Form.useForm();
  const [isAttachmentModalVisible, setIsAttachmentModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isBatchImportModalVisible, setIsBatchImportModalVisible] = useState(false);
  const [batchImportProgress, setBatchImportProgress] = useState(0);
  const [batchImportResult, setBatchImportResult] = useState<{success: number, failed: number, failedItems: Array<{index: number, data: any, error: string}>} | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // 新增：门店、型号、附件状态与加载逻辑
  const stores = useSelector(selectStores);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<UploadFile[]>([]);
  const [modelLocked, setModelLocked] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  
  const brandOptions = useMemo(() => Array.from(new Set(models.map(m => m.brand))), [models]);
  const typeOptions = useMemo(() => {
    let list = models;
    if (selectedBrand) list = list.filter(m => m.brand === selectedBrand);
    return Array.from(new Set(list.map(m => m.type)));
  }, [models, selectedBrand]);
  const categoryOptions = useMemo(() => {
    let list = models;
    if (selectedBrand) list = list.filter(m => m.brand === selectedBrand);
    if (selectedType) list = list.filter(m => m.type === selectedType);
    return Array.from(new Set(list.map(m => m.category)));
  }, [models, selectedBrand, selectedType]);
  const visibleModels = useMemo(() => {
    let list = models;
    if (selectedBrand) list = list.filter(m => m.brand === selectedBrand);
    if (selectedType) list = list.filter(m => m.type === selectedType);
    if (selectedCategory) list = list.filter(m => m.category === selectedCategory);
    return list;
  }, [models, selectedBrand, selectedType, selectedCategory]);
  
  // 保持打开时品牌与表单同步（编辑场景）
  useEffect(() => {
    if (isModalVisible) {
      const currentBrand = form.getFieldValue('brand');
      const currentType = form.getFieldValue('type');
      const currentCategory = form.getFieldValue('category');
      if (currentBrand) setSelectedBrand(currentBrand);
      if (currentType) setSelectedType(currentType);
      if (currentCategory) setSelectedCategory(currentCategory);
    }
  }, [isModalVisible]);
  
  const loadModels = async () => {
    try {
      const data = await apiGet<EquipmentModel[]>('/models');
      setModels(data);
    } catch (err: any) {
      message.error(err?.message || '加载型号列表失败');
    }
  };
  
  useEffect(() => {
    if (isModalVisible) {
      loadModels();
    }
  }, [isModalVisible]);

  useEffect(() => {
    // 统一加载门店列表，避免使用初始模拟数据
    dispatch(fetchStores());
  }, [dispatch]);
  
  const handleModelSelect = (modelId?: string | null) => {
    const m = modelId ? models.find(x => x.id === modelId) : undefined;
    if (m) {
      form.setFieldsValue({
        modelId: m.id,
        brand: m.brand,
        type: m.type,
        height: m.height,
        category: m.category,
      });
      setSelectedBrand(m.brand);
      setSelectedType(m.type);
      setSelectedCategory(m.category);
      setModelLocked(true);
    } else {
      setModelLocked(false);
    }
  };
  
  const onAttachmentChange: UploadProps['onChange'] = (info) => {
    const { status } = info.file || {};
    if (status === 'done') {
      const baseHost = API_BASE.replace(/\/api$/, '');
      const resp: any = info.file?.response;
      const relative = resp?.file?.url || resp?.url || resp?.data?.url || '';
      if (relative) {
        info.file.url = `${baseHost}${relative}`;
      }
      message.success(`${info.file.name} 文件上传成功`);
    } else if (status === 'error') {
      message.error(`${info.file.name} 文件上传失败`);
    }
    setAttachmentFiles(info.fileList);
  };

  // 模态框配置
  const modalConfig = {
    width: 800,
    centered: true,
    styles: {
      body: {
        padding: '24px',
        maxHeight: '70vh',
        overflowY: 'auto' as const
      },
      footer: {
        padding: '16px 24px',
        borderTop: '1px solid #f0f0f0'
      }
    }
  };

  // 模拟数据获取
  useEffect(() => {
    fetchEquipments();
  }, []);

  // 过滤数据
  useEffect(() => {
    const filtered = equipmentList.filter(equipment => 
      (searchParams.code === '' || equipment.code.includes(searchParams.code)) &&
      (searchParams.customCode === '' || equipment.customCode.includes(searchParams.customCode)) &&
      (searchParams.type === '' || equipment.type === searchParams.type) &&
      (searchParams.height === '' || equipment.height.toString() === searchParams.height)
    );
    setFilteredList(filtered);
  }, [equipmentList, searchParams]);

  const fetchEquipments = async () => {
    dispatch(fetchEquipmentsStart());
    try {
      const list = await apiGet<Equipment[]>('/equipments');
      dispatch(fetchEquipmentsSuccess(list));
    } catch (err: any) {
      const msg = err?.message || '无法获取设备信息，仓库数据不可用';
      dispatch(fetchEquipmentsFailure(msg));
      message.error(msg);
    }
  };

  const handleSearch = (field: string, value: string) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
  };

  const handleAddEquipment = () => {
    setIsEditing(false);
    setCurrentEquipment({});
    form.resetFields();
    setAttachmentFiles([]);
    setSelectedBrand(undefined);
    setSelectedType(undefined);
    setSelectedCategory(undefined);
    setModelLocked(false);
    setIsModalVisible(true);
  };

  const handleEditEquipment = (equipment: Equipment) => {
    setIsEditing(true);
    setCurrentEquipment(equipment);
    const normalized = {
      ...equipment,
      purchaseDate:
        equipment?.purchaseDate && dayjs(equipment.purchaseDate).isValid()
          ? dayjs(equipment.purchaseDate)
          : undefined,
      factoryDate:
        equipment?.factoryDate && dayjs(equipment.factoryDate).isValid()
          ? dayjs(equipment.factoryDate)
          : undefined,
    };
    form.setFieldsValue(normalized);
    setIsModalVisible(true);
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      await apiDelete(`/equipments/${id}`);
      dispatch(deleteEquipmentSuccess(id));
      message.success('设备删除成功');
      fetchEquipments();
    } catch (err: any) {
      message.error(err?.message || '设备删除失败');
    }
  };

  const [saveDisabled, setSaveDisabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveEquipment = async () => {
    try {
      const values = await form.validateFields();
      const selectedModel = models.find(m => m.id === values.modelId);
      const purchaseDateStr = values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : undefined;
      const factoryDateStr = values.factoryDate ? values.factoryDate.format('YYYY-MM-DD') : undefined;
      const store = stores?.find?.((s: any) => s.id === values.storeId);

      const attachments = (attachmentFiles || []).map((f: any) => {
        const resp = f.response;
        const url = resp?.file?.url || resp?.url || resp?.data?.url || f.url || '';
        return {
          id: f.uid,
          name: f.name,
          url,
          size: f.size ?? resp?.file?.size,
          type: f.type ?? resp?.file?.type,
        };
      });

      const basePayload = {
        code: values.code,
        customCode: values.customCode,
        type: values.type,
        height: Number(values.height),
        model: selectedModel?.model || currentEquipment.model || '',
        brand: values.brand,
        source: values.source || 'self-owned',
        rentalStatus: values.rentalStatus || 'waiting',
        insuranceStatus: values.insuranceStatus || 'insured',
        category: values.category,
        storeId: values.storeId,
        // 确保库存统计聚合使用的仓库字段在新增/更新时写入
        warehouse: store?.name || '',
        purchaseDate: purchaseDateStr,
        factoryDate: factoryDateStr,
        attachments,
      };
      const payload = basePayload;

      // 新增前唯一性校验（客户端+服务端前置查询）
      if (!isEditing) {
        const codeTrimmed = String(values.code || '').trim();
        const customCodeTrimmed = String(values.customCode || '').trim();

        // 校验设备编码是否存在（仅当有值时）
        if (codeTrimmed) {
          const codeCheck = await apiGet<Equipment[]>(`/equipments?code=${encodeURIComponent(codeTrimmed)}`);
          const codeExists = Array.isArray(codeCheck) && codeCheck.some(e => String(e.code || '').trim() === codeTrimmed);
          if (codeExists) {
            form.setFields([{ name: 'code', errors: [`设备编码[ ${codeTrimmed} ]已存在`] }]);
            message.error(`设备编码[ ${codeTrimmed} ]已存在`);
            setSaveDisabled(true);
            return;
          }
        }

        // 校验自编号是否存在（仅当有值时）
        if (customCodeTrimmed) {
          const customCodeCheck = await apiGet<Equipment[]>(`/equipments?customCode=${encodeURIComponent(customCodeTrimmed)}`);
          const customCodeExists = Array.isArray(customCodeCheck) && customCodeCheck.some(e => String(e.customCode || '').trim() === customCodeTrimmed);
          if (customCodeExists) {
            form.setFields([{ name: 'customCode', errors: [`自编号[ ${customCodeTrimmed} ]已存在`] }]);
            message.error(`自编号[ ${customCodeTrimmed} ]已存在`);
            setSaveDisabled(true);
            return;
          }
        }
      }

      if (isEditing && currentEquipment.id) {
        await apiPut(`/equipments/${currentEquipment.id}`, payload);
        message.success('设备更新成功');
      } else {
        setIsSaving(true);
        const r: any = await apiPost('/equipments', payload);
        const newId = r?.id || `EQ${Date.now()}`;
        dispatch(addEquipmentSuccess({
          id: newId,
          storeName: store?.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...payload,
        } as Equipment));
        message.success('设备添加成功');
        setIsSaving(false);
      }

      setIsModalVisible(false);
      fetchEquipments();

      // 更新设备档案后刷新库存统计（仓库、在租/待租状态变更会影响统计）
      try {
        dispatch(fetchInventoryStart());
        const stats = await apiGet<any[]>('/equipments/inventory/stats');
        dispatch(fetchInventorySuccess(stats));
      } catch (err: any) {
        dispatch(fetchInventoryFailure(err?.message || '获取库存数据失败'));
      }
    } catch (errorInfo: any) {
      const msg = errorInfo?.message || '保存失败，请检查表单';
      message.error(msg);
    }
  };

  const showAttachmentModal = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsAttachmentModalVisible(true);
  };

  const handleShareEquipment = (equipment: Equipment) => {
    message.success(`设备 ${equipment.code} 分享成功`);
    // 实际应用中这里可以实现分享功能
  };

  // 批量导入功能
  const handleBatchImport = () => {
    setIsBatchImportModalVisible(true);
    setBatchImportProgress(0);
    setBatchImportResult(null);
  };

  const handleImportFile = async (_file: UploadFile) => {
    setIsImporting(true);
    setBatchImportProgress(0);
    setBatchImportResult(null);
    
    try {
      // 模拟文件处理和数据解析
      // 实际应用中，这里应该使用FileReader读取文件内容并解析
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      // 模拟进度更新
      for (let i = 1; i <= 100; i++) {
        await delay(20);
        setBatchImportProgress(i);
      }
      
      // 模拟导入结果
      const success = Math.floor(Math.random() * 20) + 1;
      const failed = Math.floor(Math.random() * 5);
      const failedItems = Array.from({ length: failed }, (_, i) => ({
        index: i + 1,
        data: { code: `模拟设备${i + 1}`, type: '剪刀车' },
        error: failed > 0 ? '部分字段验证失败' : ''
      })).filter(item => item.error);
      
      setBatchImportResult({ success, failed, failedItems });
      
      // 如果有成功导入的设备，重新获取设备列表
      if (success > 0) {
        // 实际应用中，这里应该重新调用API获取最新数据
        message.success(`成功导入 ${success} 台设备`);
      }
    } catch (error) {
      message.error('文件解析失败，请检查文件格式');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadImportTemplate = () => {
    // 实际应用中，这里应该提供一个真实的模板文件下载
    message.info('模板下载功能待实现');
  };

  const closeBatchImportModal = () => {
    setIsBatchImportModalVisible(false);
    setBatchImportProgress(0);
    setBatchImportResult(null);
    setIsImporting(false);
  };

  // 上传配置 - 附件上传
  const attachmentUploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    action: `${API_BASE}/upload`,
    accept: '.jpg,.jpeg,.png,.pdf',
    beforeUpload(file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const typeOk = allowedTypes.includes(file.type) || /\.(jpg|jpeg|png|pdf)$/i.test(file.name);
      if (!typeOk) {
        message.error('仅支持 jpg/jpeg/png/pdf 文件');
        return Upload.LIST_IGNORE;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    headers: {
      authorization: 'Bearer token',
    },
    onChange(info) {
      const { status } = info.file;
      if (status === 'done') {
        const baseHost = API_BASE.replace(/\/api$/, '');
        const resp: any = info.file?.response;
        const relative = resp?.file?.url || resp?.url || resp?.data?.url || '';
        if (relative) {
          info.file.url = `${baseHost}${relative}`;
        }
        message.success(`${info.file.name} 文件上传成功`);
      } else if (status === 'error') {
        message.error(`${info.file.name} 文件上传失败`);
      }
    },
    onDrop(_e) {
        // console.log('Dropped files', e.dataTransfer.files);
      },
  };

  // 上传配置 - 批量导入
  const batchImportUploadProps: UploadProps = {
    name: 'file',
    accept: '.xlsx,.xls,.csv',
    beforeUpload: (file) => {
      handleImportFile(file);
      return false; // 阻止默认上传行为
    },
    showUploadList: false,
  };

  // 表格列配置
  const columns: ColumnsType<Equipment> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 80,
    },
    {
      title: '设备编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      fixed: 'left',
      ellipsis: true,
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>
    },
    {
      title: '自编码',
      dataIndex: 'customCode',
      key: 'customCode',
      width: 150,
      ellipsis: true
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      filters: [
        { text: '剪刀车', value: '剪刀车' },
        { text: '直臂车', value: '直臂车' },
        { text: '曲臂车', value: '曲臂车' }
      ],
      onFilter: (value: React.Key | boolean, record: Equipment) => record.type === value,
      render: (text: string) => {
        let color = '';
        switch (text) {
          case '剪刀车':
            color = '#1890ff';
            break;
          case '直臂车':
            color = '#52c41a';
            break;
          case '曲臂车':
            color = '#faad14';
            break;
          default:
            color = '#8c8c8c';
        }
        return (
          <Tag color={color}>
            {text}
          </Tag>
        );
      }
    },
    {
      title: '高度',
      dataIndex: 'height',
      key: 'height',
      width: 100,
      sorter: (a: Equipment, b: Equipment) => Number(a.height) - Number(b.height),
      render: formatHeight
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 150,
      ellipsis: true
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 120,
      ellipsis: true
    },
    {
      title: '设备来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      filters: [
        { text: '自有', value: 'self-owned' },
        { text: '转租', value: 'sublease' }
      ],
      onFilter: (value: React.Key | boolean, record: Equipment) => record.source === value,
      render: renderEquipmentSource
    },
    {
      title: '租赁状态',
      dataIndex: 'rentalStatus',
      key: 'rentalStatus',
      width: 120,
      filters: [
        { text: '在租', value: 'renting' },
        { text: '待租', value: 'waiting' },
        { text: '维修', value: 'repairing' }
      ],
      onFilter: (value: React.Key | boolean, record: Equipment) => record.rentalStatus === value,
      render: renderRentalStatus
    },
    {
      title: '合同名称',
      dataIndex: 'contractName',
      key: 'contractName',
      render: renderContractName,
      width: 150,
      ellipsis: true
    },
    {
      title: '保险状态',
      dataIndex: 'insuranceStatus',
      key: 'insuranceStatus',
      width: 120,
      filters: [
        { text: '在保', value: 'insured' },
        { text: '脱保', value: 'uninsured' }
      ],
      onFilter: (value: React.Key | boolean, record: Equipment) => record.insuranceStatus === value,
      render: renderInsuranceStatus
    },
    {
      title: '所在仓库',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 150,
      ellipsis: true,
      render: (_text: string, record: Equipment) => {
        const storeName = record.storeName || stores.find((s) => s.id === record.storeId)?.name;
        if (storeName && String(storeName).trim()) return storeName;
        const warehouseText = record.warehouse;
        return warehouseText && String(warehouseText).trim() ? warehouseText : '未设置仓库';
      }
    },
    {
        title: '操作',
        key: 'action',
        width: 140,
        fixed: 'right',
        render: (_, record) => {
          const items = [
            {
              key: 'edit',
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <EditOutlined />
                  <span>编辑</span>
                </div>
              ),
            },
            {
              key: 'attachment',
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PaperClipOutlined />
                  <span>附件</span>
                </div>
              ),
            },
            { type: 'divider' as const },
            {
              key: 'share',
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShareAltOutlined />
                  <span>分享</span>
                </div>
              ),
            },
            {
              key: 'delete',
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ff4d4f' }}>
                  <DeleteOutlined />
                  <span>删除</span>
                </div>
              ),
            },
          ];
          return (
            <Dropdown
              trigger={["hover"]}
              placement="bottomRight"
              arrow
              menu={{
                items,
                onClick: ({ key }: { key: string }) => {
                  if (key === 'edit') return handleEditEquipment(record);
                  if (key === 'attachment') return showAttachmentModal(record);
                  if (key === 'share') return handleShareEquipment(record);
                  if (key === 'delete') {
                    Modal.confirm({
                      title: '确认删除',
                      content: '确定要删除该设备吗？删除后不可恢复。',
                      okText: '确认',
                      cancelText: '取消',
                      okButtonProps: { danger: true },
                      onOk: () => handleDeleteEquipment(record.id),
                    });
                  }
                },
              }}
            >
              <Button type="link" icon={<MoreOutlined />}>操作</Button>
            </Dropdown>
          );
        },
      }
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* 顶部操作栏 */}
      <Card className="equipment-profile-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>设备管理</Typography.Title>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Search
                placeholder="设备编码"
                allowClear
                style={{ width: 200 }}
                onChange={(e) => handleSearch('code', e.target.value)}
              />
              <Search
                placeholder="自编码"
                allowClear
                style={{ width: 200 }}
                onChange={(e) => handleSearch('customCode', e.target.value)}
              />
              <Select
                placeholder="设备类型"
                allowClear
                style={{ width: 150 }}
                onChange={(value) => handleSearch('type', value)}
              >
                <Option value="剪刀车">剪刀车</Option>
                <Option value="直臂车">直臂车</Option>
                <Option value="曲臂车">曲臂车</Option>
              </Select>
              <Input
                placeholder="高度"
                allowClear
                style={{ width: 120 }}
                onChange={(e) => handleSearch('height', e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button type="default" icon={<UploadOutlined />} onClick={handleBatchImport}>
              批量导入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddEquipment}>
              新增设备
            </Button>
          </div>
        </div>
      </Card>

      {/* 设备列表 */}
      <Card className="equipment-profile-table" style={{ overflow: 'hidden' }}>
        {filteredList.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredList}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条数据`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
            className="equipment-table"
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <Empty description="暂无设备数据" />
        )}
      </Card>

      {/* 添加/编辑设备模态框 */}
      <Modal
        title={isEditing ? '编辑设备' : '新增设备'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveEquipment} disabled={saveDisabled || isSaving}>
            保存
          </Button>
        ]}
        {...modalConfig}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            source: 'self-owned',
            rentalStatus: 'waiting',
            insuranceStatus: 'insured',
          }}
          className="equipment-form"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="brand"
                label="品牌"
                rules={[{ required: true, message: '请选择设备品牌' }]}
                extra="选择品牌后，类型与类别将动态过滤，型号最终按三项筛选"
              >
                <Select
                  placeholder="请选择品牌"
                  showSearch
                  allowClear
                  optionFilterProp="children"
                  disabled={modelLocked}
                  onChange={(brand) => {
                    setSelectedBrand(brand);
                    setSelectedType(undefined);
                    setSelectedCategory(undefined);
                    form.setFieldsValue({ type: undefined, category: undefined, modelId: undefined });
                    setModelLocked(false);
                  }}
                >
                  {brandOptions.map(b => (
                    <Option key={b} value={b}>{b}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="设备类型"
                rules={[{ required: true, message: '请选择设备类型' }]}
              >
                <Select
                  placeholder={selectedBrand ? '请选择设备类型（已按品牌过滤）' : '请先选择品牌'}
                  showSearch
                  optionFilterProp="children"
                  disabled={!selectedBrand || modelLocked}
                  notFoundContent={selectedBrand ? <Empty description="该品牌下暂无类型，请先维护型号数据" /> : null}
                  onChange={(type) => {
                    setSelectedType(type);
                    setSelectedCategory(undefined);
                    form.setFieldsValue({ category: undefined, modelId: undefined });
                  }}
                >
                  {typeOptions.map(t => (
                    <Option key={t} value={t}>{t}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
      
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="设备类别"
                rules={[{ required: true, message: '请选择设备类别' }]}
              >
                <Select
                  placeholder={selectedType ? '请选择设备类别（已按品牌/类型过滤）' : '请先选择品牌和类型'}
                  showSearch
                  optionFilterProp="children"
                  disabled={!selectedBrand || !selectedType || modelLocked}
                  notFoundContent={selectedBrand && selectedType ? <Empty description="该品牌/类型下暂无类别，请先维护型号数据" /> : null}
                  onChange={(cat) => {
                    setSelectedCategory(cat);
                    form.setFieldsValue({ modelId: undefined });
                  }}
                >
                  {categoryOptions.map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="modelId"
                label="型号"
                rules={[{ required: true, message: '请选择型号' }]}
              >
                <Select
                  placeholder={
                    selectedBrand
                      ? (selectedType
                        ? (selectedCategory
                          ? '请选择型号（已按品牌/类型/类别过滤）'
                          : '请选择型号（已按品牌/类型过滤）')
                        : '请选择型号（已按品牌过滤）')
                      : '请先选择品牌'
                  }
                  showSearch
                  allowClear
                  optionFilterProp="children"
                  onChange={handleModelSelect}
                  filterOption={(input, option) => {
                    const children = option?.children as any;
                    if (children && typeof children === 'string') {
                      return children.toLowerCase().includes(input.toLowerCase());
                    }
                    return false;
                  }}
                >
                  {visibleModels.map(m => (
                    <Option key={m.id} value={m.id}>{`${m.brand} ${m.model} (${m.type}/${m.height}米)`}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
      
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="height"
                label="高度（米）"
                rules={[{ required: true, message: '请输入或选择高度' }]}
              >
                <InputNumber min={1} max={200} precision={0} style={{ width: '100%' }} placeholder="自动填充或手动输入" disabled={modelLocked} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="storeId"
                label="区域（所属门店）"
                rules={[{ required: true, message: '请选择所属门店' }]}
              >
                <Select placeholder="请选择所属门店" showSearch optionFilterProp="children">
                  {(stores || []).map((s: any) => (
                    <Option key={s.id} value={s.id}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 已按要求删除“所在仓库”输入项 */}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="设备编码"
                rules={[{ required: true, message: '请输入设备编码' }]}
              >
                <Input
                  placeholder="请输入设备编码"
                  onChange={() => {
                    // 修正后解除禁用并清除错误
                    setSaveDisabled(false);
                    form.setFields([{ name: 'code', errors: [] }]);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="customCode"
                label="自编号"
                rules={[{ required: true, message: '请输入自编号' }]}
              >
                <Input
                  placeholder="请输入自编号"
                  onChange={() => {
                    setSaveDisabled(false);
                    form.setFields([{ name: 'customCode', errors: [] }]);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
      
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="purchaseDate" label="采购日期">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="factoryDate" label="出厂日期">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>
      
          <Form.Item label="附件上传">
            <Upload.Dragger
              {...attachmentUploadProps}
              fileList={attachmentFiles}
              onChange={onAttachmentChange}
            >
              <p className="ant-upload-drag-icon">
                <FileAddOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">支持多文件上传</p>
            </Upload.Dragger>
          </Form.Item>
      
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f0f0f0' }}>
            <Typography.Text type="secondary">
              带 <span style={{ color: '#ff4d4f' }}>*</span> 的为必填项
            </Typography.Text>
          </div>
        </Form>
      </Modal>

      {/* 附件管理模态框 */}
      <Modal
        title={`${selectedEquipment?.code} 附件管理`}
        open={isAttachmentModalVisible}
        onCancel={() => setIsAttachmentModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsAttachmentModalVisible(false)}>关闭</Button>
        ]}
        {...modalConfig}
      >
        <div style={{ marginBottom: '20px' }}>
          <Upload.Dragger {...attachmentUploadProps}>
            <p className="ant-upload-drag-icon">
              <FileAddOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持单个或批量上传附件</p>
          </Upload.Dragger>
        </div>
        <Divider>已上传附件</Divider>
        <div>
          {selectedEquipment?.attachments && selectedEquipment.attachments.length > 0 ? (
            <Space direction="vertical" style={{ display: 'block' }}>
              {selectedEquipment.attachments.map((file) => (
                <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 500 }}>{file.name}</span>
                    <Tag color="blue">{friendlyType((file as any).type, file.name)}</Tag>
                    <Typography.Text type="secondary">{formatBytes((file as any).size)}</Typography.Text>
                  </div>
                  <Space>
                    <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadAttachment(file)}>下载</Button>
                    <Button type="link" danger size="small">删除</Button>
                  </Space>
                </div>
              ))}
            </Space>
          ) : (
            <Empty description="暂无附件" />
          )}
        </div>
      </Modal>

      {/* 批量导入模态框 */}
      <Modal
        title="批量导入设备"
        open={isBatchImportModalVisible}
        onCancel={closeBatchImportModal}
        footer={[
          <Button key="cancel" onClick={closeBatchImportModal} disabled={isImporting}>
            关闭
          </Button>
        ]}
        {...modalConfig}
      >
        {!batchImportResult ? (
          <>
            <div style={{ marginBottom: '24px' }}>
              <Typography.Paragraph>
                请上传包含设备信息的Excel或CSV文件，支持的文件格式：.xlsx、.xls、.csv。
              </Typography.Paragraph>
              <Typography.Paragraph type="secondary">
                上传前请先下载模板，并按照模板格式填写数据。
              </Typography.Paragraph>
            </div>
            
            {!isImporting ? (
              <>
                <Upload.Dragger {...batchImportUploadProps}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                  <p className="ant-upload-hint">
                    支持 .xlsx, .xls, .csv 格式文件
                  </p>
                </Upload.Dragger>
                
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <Button type="default" onClick={downloadImportTemplate}>
                    下载导入模板
                  </Button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Typography.Text style={{ display: 'block', marginBottom: '20px' }}>
                  正在导入数据，请稍候...
                </Typography.Text>
                <div style={{ width: '80%', margin: '0 auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Typography.Text type="secondary">导入进度</Typography.Text>
                    <Typography.Text>{batchImportProgress}%</Typography.Text>
                  </div>
                  <div style={{ 
                    height: '8px', 
                    backgroundColor: '#f0f0f0', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${batchImportProgress}%`, 
                        backgroundColor: '#1890ff',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <Typography.Title level={5} style={{ marginBottom: '20px' }}>
              导入结果
            </Typography.Title>
            
            <div style={{ marginBottom: '24px' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Card>
                    <Statistic 
                      title="成功导入" 
                      value={batchImportResult.success}
                      suffix="台设备" 
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card>
                    <Statistic 
                      title="导入失败" 
                      value={batchImportResult.failed}
                      suffix="台设备" 
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Card>
                </Col>
              </Row>
            </div>
            
            {batchImportResult.failedItems.length > 0 && (
              <div>
                <Typography.Text strong style={{ display: 'block', marginBottom: '12px' }}>
                  失败详情：
                </Typography.Text>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {batchImportResult.failedItems.map((item, index) => (
                    <div key={index} style={{ 
                      padding: '12px', 
                      marginBottom: '8px', 
                      backgroundColor: '#fff2f0', 
                      border: '1px solid #ffccc7', 
                      borderRadius: '4px' 
                    }}>
                      <div style={{ marginBottom: '4px' }}>
                        <Typography.Text type="danger">
                          行 {item.index}：{item.error}
                        </Typography.Text>
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>
                        {JSON.stringify(item.data)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {error && (
        <div style={{ 
          color: '#ff4d4f', 
          marginTop: '16px', 
          padding: '12px 16px', 
          backgroundColor: '#fff2f0', 
          border: '1px solid #ffccc7', 
          borderRadius: '4px' 
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default EquipmentProfile;