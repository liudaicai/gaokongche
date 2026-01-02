import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input, Select, Table, Space, Tag, Modal, Form, Upload, App, Card, Row, Col, Typography, Empty, Statistic, Dropdown, InputNumber, DatePicker, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, PaperClipOutlined, ShareAltOutlined, MoreOutlined, FileAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import type { AppDispatch } from '../../app/store';
import { apiGet, apiPost, apiPut, apiDelete, API_BASE } from '../../api/client';
import * as XLSX from 'xlsx';
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
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
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

import EquipmentDetailDrawer from './components/EquipmentDetailDrawer';

const EquipmentProfile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { message } = App.useApp();
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [detailEquipment, setDetailEquipment] = useState<Equipment | null>(null);
  
  const showDetail = (record: Equipment) => {
    setDetailEquipment(record);
    setDetailDrawerVisible(true);
  };
  const equipmentList = useSelector(selectEquipmentList);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const [searchParams, setSearchParams] = useState({
    category: '',
    type: '',
    brand: '',
    model: '',
    code: '',
    customCode: '',
    height: ''
  });
  const [filteredList, setFilteredList] = useState<Equipment[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState<Partial<Equipment>>({});
  const [form] = Form.useForm();
  const [isAttachmentModalVisible, setIsAttachmentModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [policyAttachments, setPolicyAttachments] = useState<any[]>([]);
  const [isBatchImportModalVisible, setIsBatchImportModalVisible] = useState(false);
  const [batchImportProgress, setBatchImportProgress] = useState(0);
  const [batchImportResult, setBatchImportResult] = useState<{ success: number, failed: number, failedItems: Array<{ index: number, data: any, error: string }> } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // 新增：门店、型号、附件状态与加载逻辑
  const stores = useSelector(selectStores);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<UploadFile[]>([]);
  const [modelLocked, setModelLocked] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  // 级联逻辑：类别 → 类型 → 品牌 → 型号
  const categoryOptions = useMemo(() => Array.from(new Set(models.map(m => m.category))), [models]);
  const typeOptions = useMemo(() => {
    let list = models;
    if (selectedCategory) list = list.filter(m => m.category === selectedCategory);
    return Array.from(new Set(list.map(m => m.type)));
  }, [models, selectedCategory]);
  const brandOptions = useMemo(() => {
    let list = models;
    if (selectedCategory) list = list.filter(m => m.category === selectedCategory);
    if (selectedType) list = list.filter(m => m.type === selectedType);
    return Array.from(new Set(list.map(m => m.brand)));
  }, [models, selectedCategory, selectedType]);
  const visibleModels = useMemo(() => {
    let list = models;
    if (selectedCategory) list = list.filter(m => m.category === selectedCategory);
    if (selectedType) list = list.filter(m => m.type === selectedType);
    if (selectedBrand) list = list.filter(m => m.brand === selectedBrand);
    return list;
  }, [models, selectedCategory, selectedType, selectedBrand]);

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

  // 修复：当models加载完成后，自动更新modelId（解决首次编辑时models为空的问题）
  useEffect(() => {
    if (isModalVisible && isEditing && currentEquipment && models.length > 0) {
      const currentModelId = form.getFieldValue('modelId');
      
      // 如果modelId未设置，尝试重新查找并设置
      if (!currentModelId && currentEquipment.model) {
        const matchedModel = models.find(m => 
          m.category === currentEquipment.category &&
          m.brand === currentEquipment.brand &&
          m.model === currentEquipment.model &&
          parseFloat(m.height as any) === parseFloat(currentEquipment.height as any)
        );
        
        if (matchedModel) {
          form.setFieldsValue({ modelId: matchedModel.id });
        }
      }
    }
  }, [isModalVisible, isEditing, models, currentEquipment, form]);

  const loadModels = async () => {
    try {
      const data = await apiGet<EquipmentModel[]>('/models');
      setModels(data || []);
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
        model: m.model,  // 添加型号名称字段
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

  // 过滤数据（按照：类别 → 类型 → 品牌 → 型号 的顺序）
  useEffect(() => {
    const filtered = equipmentList.filter(equipment =>
      (searchParams.category === '' || equipment.category === searchParams.category) &&
      (searchParams.type === '' || equipment.type === searchParams.type) &&
      (searchParams.brand === '' || equipment.brand === searchParams.brand) &&
      (searchParams.model === '' || equipment.model?.includes(searchParams.model)) &&
      (searchParams.code === '' || equipment.code.includes(searchParams.code)) &&
      (searchParams.customCode === '' || equipment.customCode.includes(searchParams.customCode)) &&
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
    // 重置保存按钮状态
    setSaveDisabled(false);
    setIsSaving(false);
    setIsModalVisible(true);
  };

  const handleEditEquipment = (equipment: Equipment) => {
    setIsEditing(true);
    setCurrentEquipment(equipment);
    
    // 重置保存按钮状态
    setSaveDisabled(false);
    setIsSaving(false);
    
    // 根据设备的model查找对应的modelId
    const matchedModel = models.find(m => 
      m.category === equipment.category &&
      m.brand === equipment.brand &&
      m.model === equipment.model &&
      parseFloat(m.height as any) === parseFloat(equipment.height as any)
    );
    
    // 设置级联选择状态
    setSelectedCategory(equipment.category);
    setSelectedType(equipment.type);
    setSelectedBrand(equipment.brand);
    
    const normalized = {
      ...equipment,
      modelId: matchedModel?.id, // 设置modelId以显示型号选择
      storeId: equipment.storeId ? String(equipment.storeId) : undefined, // 确保storeId是字符串类型
      purchaseDate:
        equipment?.purchaseDate && dayjs(equipment.purchaseDate).isValid()
          ? dayjs(equipment.purchaseDate)
          : undefined,
      factoryDate:
        equipment?.factoryDate && dayjs(equipment.factoryDate).isValid()
          ? dayjs(equipment.factoryDate)
          : undefined,
      // warehouse字段已经是仓库名称，保持不变
    };
    
    form.setFieldsValue(normalized);
    
    // 处理附件
    if (equipment.attachments && Array.isArray(equipment.attachments)) {
      const files = equipment.attachments.map((att: any, idx: number) => ({
        uid: att.id || `${idx}`,
        name: att.name || '附件',
        status: 'done',
        url: att.url,
        size: att.size,
        type: att.type,
      }));
      setAttachmentFiles(files as any);
    }
    
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

      // 确保使用表单中的值，这些值已经通过handleModelSelect从型号库自动填充
      const basePayload = {
        code: values.code,
        customCode: values.customCode,
        // 使用表单值，确保与型号库一致
        brand: values.brand,           // 品牌
        type: values.type,             // 设备类型
        category: values.category,     // 设备类别
        height: Number(values.height), // 高度
        model: selectedModel?.model || values.model || currentEquipment.model || '', // 型号
        source: values.source || 'self-owned',
        rentalStatus: values.rentalStatus || 'waiting',
        insuranceStatus: values.insuranceStatus || 'insured',
        storeId: values.storeId,
        // 确保库存统计聚合使用的仓库字段在新增/更新时写入
        warehouse: store?.name || '',
        purchaseDate: purchaseDateStr,
        factoryDate: factoryDateStr,
        purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : 0, // 采购价格
        attachments,
      };
      const payload = basePayload;

      // 新增前唯一性校验（客户端+服务端前置查询）
      if (!isEditing) {
        const codeTrimmed = String(values.code || '').trim();
        const customCodeTrimmed = String(values.customCode || '').trim();

        // 校验出厂编号是否存在（仅当有值时）
        if (codeTrimmed) {
          const codeCheck = await apiGet<Equipment[]>(`/equipments?code=${encodeURIComponent(codeTrimmed)}`);
          const codeExists = Array.isArray(codeCheck) && codeCheck.some(e => String(e.code || '').trim() === codeTrimmed);
          if (codeExists) {
            form.setFields([{ name: 'code', errors: [`出厂编号[ ${codeTrimmed} ]已存在`] }]);
            message.error(`出厂编号[ ${codeTrimmed} ]已存在`);
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
        // 使用后端返回的最新数据作为乐观更新，避免本地payload字段混淆
        const newEquipment: Equipment = {
          id: String(r?.id || `EQ${Date.now()}`),
          code: r?.code || payload.code || '',
          customCode: r?.customCode || payload.customCode || '',
          model: r?.model || payload.model || '',
          brand: r?.brand || payload.brand || '',
          type: r?.type || payload.type || '',
          category: r?.category || payload.category,
          height: Number(r?.height ?? payload.height ?? 0),
          source: (r?.source || payload.source || 'self-owned') as Equipment['source'],
          rentalStatus: (r?.rentalStatus || payload.rentalStatus || 'waiting') as Equipment['rentalStatus'],
          insuranceStatus: (r?.insuranceStatus || payload.insuranceStatus || 'insured') as Equipment['insuranceStatus'],
          warehouse: r?.warehouse || payload.warehouse || '',
          storeId: r?.storeId || payload.storeId,
          storeName: r?.storeName || store?.name || '',
          purchaseDate: r?.purchaseDate || payload.purchaseDate,
          factoryDate: r?.factoryDate || payload.factoryDate,
          attachments: Array.isArray(r?.attachments) ? r.attachments : (payload.attachments || []),
          createdAt: r?.createdAt || new Date().toISOString(),
          updatedAt: r?.updatedAt || new Date().toISOString(),
        };
        dispatch(addEquipmentSuccess(newEquipment));
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

  const showAttachmentModal = async (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsAttachmentModalVisible(true);

    // 查询该设备关联的有效保单附件
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`/api/equipments/${equipment.id}/policy-attachments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setPolicyAttachments(result.data || result || []);
      } else {
        setPolicyAttachments([]);
      }
    } catch (error) {
      console.error('获取保单附件失败:', error);
      setPolicyAttachments([]);
    }
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
  const handleImportFile = async (file: File) => {
    setIsImporting(true);
    setBatchImportProgress(0);
    setBatchImportResult(null);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        // 使用 XLSX 读取数据（支持 Excel 和 CSV）
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 转换为二维数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          throw new Error('文件没有数据行');
        }

        const dataRows = jsonData.slice(1);
        const total = dataRows.length;
        if (total === 0) throw new Error('没有可导入的数据');

        // 辅助函数：处理 Excel 日期
        const formatDate = (val: any) => {
          if (!val) return undefined;
          if (typeof val === 'number') {
            const date = XLSX.SSF.parse_date_code(val);
            if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
          }
          if (typeof val === 'string') {
            const match = val.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
            if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          }
          return undefined;
        };

        // 辅助函数：根据名称查找门店ID
        const findStoreId = (name: string): string | undefined => {
          if (!name || !stores) return undefined;
          const store = stores.find(s => s.name === name || s.name.includes(name));
          return store ? store.id : undefined;
        };

        let successCount = 0;
        let failCount = 0;
        const failedItems: any[] = [];

        const defaultStoreId = stores && stores.length > 0 ? stores[0].id : undefined;

        for (let i = 0; i < total; i++) {
          const cols = dataRows[i];
          if (!cols || cols.length === 0 || !cols[0]) continue;

          // 解析列 - 注意列索引变化
          // 0:出厂编号, 1:自编号, 2:所属区域/门店, 3:设备类别, 4:品牌, 5:型号, 6:设备类型, 7:高度, 8:来源, 9:采购日期, 10:出厂日期
          const code = String(cols[0] || '').trim();
          const customCode = cols[1] ? String(cols[1]).trim() : undefined;
          const storeName = cols[2] ? String(cols[2]).trim() : undefined;
          const category = cols[3] ? String(cols[3]).trim() : undefined;
          const brand = cols[4] ? String(cols[4]).trim() : undefined;
          const model = cols[5] ? String(cols[5]).trim() : undefined;
          const type = cols[6] ? String(cols[6]).trim() : undefined;
          const height = Number(cols[7] || 0);
          const sourceStr = cols[8] ? String(cols[8]) : '';
          const pDateRaw = cols[9];
          const fDateRaw = cols[10];

          // 匹配门店
          let targetStoreId = defaultStoreId;
          if (storeName) {
            const foundId = findStoreId(storeName);
            if (foundId) {
              targetStoreId = foundId;
            }
          }

          const payload: any = {
            code,
            customCode,
            storeId: targetStoreId,
            category,
            brand,
            model,
            type,
            height,
            source: sourceStr.includes('转租') ? 'sublease' : 'self-owned',
            rentalStatus: 'available',  // 修复：统一使用 'available' 表示待租
            insuranceStatus: 'uninsured'
          };

          const pDate = formatDate(pDateRaw);
          if (pDate) payload.purchaseDate = pDate;

          const fDate = formatDate(fDateRaw);
          if (fDate) payload.factoryDate = fDate;

          if (!payload.code) {
            failCount++;
            failedItems.push({ index: i + 1, data: payload, error: '出厂编号为空' });
            setBatchImportProgress(Math.floor(((i + 1) / total) * 100));
            continue;
          }

          try {
            await apiPost('/equipments', payload);
            successCount++;
          } catch (err: any) {
            failCount++;
            failedItems.push({ index: i + 1, data: payload, error: err.message || '创建失败' });
          }

          setBatchImportProgress(Math.floor(((i + 1) / total) * 100));
        }

        setBatchImportResult({ success: successCount, failed: failCount, failedItems });

        if (successCount > 0 && failCount === 0) {
          message.success(`✅ 成功导入 ${successCount} 台设备`);
          fetchEquipments();
          try {
            dispatch(fetchInventoryStart());
            const stats = await apiGet<any[]>('/equipments/inventory/stats');
            dispatch(fetchInventorySuccess(stats));
          } catch (e) { console.error(e); }
        } else if (successCount > 0 && failCount > 0) {
          message.warning(`⚠️ 部分导入成功：成功 ${successCount} 台，失败 ${failCount} 台，请查看详情`);
          fetchEquipments();
          try {
            dispatch(fetchInventoryStart());
            const stats = await apiGet<any[]>('/equipments/inventory/stats');
            dispatch(fetchInventorySuccess(stats));
          } catch (e) { console.error(e); }
        } else {
          message.error(`❌ 导入失败：所有 ${failCount} 条记录都未能导入，请查看详情`);
        }

      } catch (error: any) {
        console.error('Import error:', error);
        message.error(error.message || '文件解析失败');
      } finally {
        setIsImporting(false);
      }
    };

    reader.onerror = () => { message.error('文件读取失败'); setIsImporting(false); };
    reader.readAsBinaryString(file as any);
  };

  const downloadImportTemplate = () => {
    // 定义表头
    const headers = [
      '出厂编号(必填)',
      '自编号',
      '所属区域/门店', // New column
      '设备类别',
      '品牌',
      '型号',
      '设备类型',
      '高度(米)',
      '设备来源(自有/转租)',
      '采购日期(YYYY-MM-DD)',
      '出厂日期(YYYY-MM-DD)'
    ];

    const defaultStoreName = stores && stores.length > 0 ? stores[0].name : '默认门店';

    // Updated sample data
    const sampleData = [
      ['EQ2023001', 'Z001', defaultStoreName, '高空车', '鼎力', 'JCPT1212DC', '剪叉车', '12', '自有', '2023-01-01', '2022-12-01'],
      ['EQ2023002', 'Z002', defaultStoreName, '高空车', '徐工', 'XG1212DO', '剪叉车', '12', '转租', '2023-02-15', '2023-01-10']
    ];

    // 构建 CSV 内容
    const bom = '\uFEFF';
    const csvContent = bom + [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    // 创建 Blob 对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // 创建下载链接
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', '设备导入模板.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('模板下载成功');
    }
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
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem('auth_token') || ''}`
    },
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
      title: '出厂编号/自编号',
      key: 'code-custom',
      width: 180,
      fixed: 'left',
      ellipsis: true,
      render: (_: any, record: Equipment) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => showDetail(record)}>
            <Typography.Text strong style={{ color: '#1677ff', cursor: 'pointer' }}>{record.code}</Typography.Text>
          </a>
          {record.customCode && (
            <a onClick={() => showDetail(record)}>
              <Typography.Text type="secondary" style={{ fontSize: '12px', cursor: 'pointer' }}>
                {record.customCode}
              </Typography.Text>
            </a>
          )}
        </Space>
      )
    },
    {
      title: '设备类别/品牌',
      key: 'category-brand',
      width: 150,
      ellipsis: true,
      filters: [
        { text: '高空车', value: '高空车' },
        { text: '叉车', value: '叉车' },
        { text: '吊车', value: '吊车' },
        { text: '车载高空车', value: '车载高空车' }
      ],
      onFilter: (value: React.Key | boolean, record: Equipment) => record.category === value,
      render: (_: any, record: Equipment) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{record.category || '-'}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
            {record.brand || '-'}
          </Typography.Text>
        </Space>
      )
    },
    {
      title: '设备类型/型号',
      key: 'type-model',
      width: 180,
      filters: [
        { text: '剪叉车', value: '剪叉车' },
        { text: '直臂车', value: '直臂车' },
        { text: '曲臂车', value: '曲臂车' },
        { text: '履带剪叉', value: '履带剪叉' },
        { text: '套筒车', value: '套筒车' },
        { text: '蜘蛛车', value: '蜘蛛车' },
        { text: '吸盘车', value: '吸盘车' }
      ],
      onFilter: (value: React.Key | boolean, record: Equipment) => record.type === value,
      render: (_: any, record: Equipment) => {
        let color = '';
        const type = record.type || '';
        switch (type) {
          case '剪叉车':
            color = '#1890ff';
            break;
          case '直臂车':
            color = '#52c41a';
            break;
          case '曲臂车':
            color = '#faad14';
            break;
          case '履带剪叉':
            color = '#722ed1';
            break;
          case '套筒车':
            color = '#13c2c2';
            break;
          case '蜘蛛车':
            color = '#eb2f96';
            break;
          case '吸盘车':
            color = '#fa8c16';
            break;
          default:
            color = '#8c8c8c';
        }
        return (
          <Space direction="vertical" size={0}>
            <Tag color={color}>{type || '-'}</Tag>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              {record.model || '-'}
            </Typography.Text>
          </Space>
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
        { text: '待租', value: 'available' },
        { text: '在租', value: 'renting' },
        { text: '维修中', value: 'repairing' },
        { text: '已退役', value: 'retired' }
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
      width: 140,
      filters: [
        { text: '在保', value: 'insured' },
        { text: '即将到期', value: 'expiring' },
        { text: '脱保', value: 'uninsured' }
      ],
      onFilter: (value: React.Key | boolean, record: Equipment) => record.insuranceStatus === value,
      render: (status: string, record: Equipment) => renderInsuranceStatus(status, record)
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
              <Select
                placeholder="设备类别"
                allowClear
                style={{ width: 150 }}
                onChange={(value) => handleSearch('category', value)}
              >
                <Option value="高空车">高空车</Option>
                <Option value="叉车">叉车</Option>
                <Option value="吊车">吊车</Option>
                <Option value="车载高空车">车载高空车</Option>
              </Select>
              <Select
                placeholder="设备类型"
                allowClear
                style={{ width: 150 }}
                onChange={(value) => handleSearch('type', value)}
              >
                <Option value="剪刀车">剪刀车</Option>
                <Option value="直臂车">直臂车</Option>
                <Option value="曲臂车">曲臂车</Option>
                <Option value="蜘蛛车">蜘蛛车</Option>
                <Option value="吸盘车">吸盘车</Option>
              </Select>
              <Select
                placeholder="品牌"
                allowClear
                style={{ width: 150 }}
                onChange={(value) => handleSearch('brand', value)}
              >
                {brandOptions.map(brand => (
                  <Option key={brand} value={brand}>{brand}</Option>
                ))}
              </Select>
              <Input
                placeholder="设备型号"
                allowClear
                style={{ width: 150 }}
                onChange={(e) => handleSearch('model', e.target.value)}
              />
              <Input
                placeholder="出厂编号"
                allowClear
                style={{ width: 150 }}
                onChange={(e) => handleSearch('code', e.target.value)}
              />
              <Input
                placeholder="自编码"
                allowClear
                style={{ width: 150 }}
                onChange={(e) => handleSearch('customCode', e.target.value)}
              />
              <Input
                placeholder="高度"
                allowClear
                style={{ width: 120 }}
                onChange={(e) => handleSearch('height', e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button type="default" icon={<PlusOutlined />} onClick={handleBatchImport}>
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
            rentalStatus: 'available',  // 修复：使用标准状态值
            insuranceStatus: 'insured',
          }}
          className="equipment-form"
        >
          {/* 第一行：设备类别、设备类型 */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="设备类别"
                rules={[{ required: true, message: '请选择设备类别' }]}
              >
                <Select
                  placeholder="请选择设备类别"
                  showSearch
                  optionFilterProp="children"
                  disabled={modelLocked}
                  onChange={(cat) => {
                    setSelectedCategory(cat);
                    setSelectedType(undefined);
                    setSelectedBrand(undefined);
                    form.setFieldsValue({ type: undefined, brand: undefined, modelId: undefined });
                    setModelLocked(false);
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
                name="type"
                label="设备类型"
                rules={[{ required: true, message: '请选择设备类型' }]}
              >
                <Select
                  placeholder={selectedCategory ? '请选择设备类型（已按类别过滤）' : '请先选择设备类别'}
                  showSearch
                  optionFilterProp="children"
                  disabled={!selectedCategory || modelLocked}
                  notFoundContent={selectedCategory ? <Empty description="该类别下暂无类型，请先维护型号数据" /> : null}
                  onChange={(type) => {
                    setSelectedType(type);
                    setSelectedBrand(undefined);
                    form.setFieldsValue({ brand: undefined, modelId: undefined });
                  }}
                >
                  {typeOptions.map(t => (
                    <Option key={t} value={t}>{t}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 第二行：品牌、设备型号 */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="brand"
                label="品牌"
                rules={[{ required: true, message: '请选择设备品牌' }]}
                extra="选择类别和类型后，品牌将动态过滤"
              >
                <Select
                  placeholder={selectedType ? '请选择品牌（已按类别/类型过滤）' : '请先选择类别和类型'}
                  showSearch
                  allowClear
                  optionFilterProp="children"
                  disabled={!selectedCategory || !selectedType || modelLocked}
                  notFoundContent={selectedType ? <Empty description="该类别/类型下暂无品牌，请先维护型号数据" /> : null}
                  onChange={(brand) => {
                    setSelectedBrand(brand);
                    form.setFieldsValue({ modelId: undefined });
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
                name="modelId"
                label="设备型号"
                rules={[{ required: true, message: '请选择设备型号' }]}
              >
                <Select
                  placeholder={
                    selectedCategory
                      ? (selectedType
                        ? (selectedBrand
                          ? '请选择型号（已按类别/类型/品牌过滤）'
                          : '请选择型号（已按类别/类型过滤）')
                        : '请选择型号（已按类别过滤）')
                      : '请先选择设备类别'
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

          {/* 隐藏字段：存储型号名称 */}
          <Form.Item name="model" hidden>
            <Input />
          </Form.Item>

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
                label="出厂编号"
                rules={[{ required: true, message: '请输入出厂编号' }]}
              >
                <Input
                  placeholder="请输入出厂编号"
                  onChange={() => {
                    // 修正后解除禁用
                    setSaveDisabled(false);
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="purchasePrice" 
                label="采购价格"
                tooltip="设备的采购价格，用于计算资产利用率"
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  min={0}
                  precision={2}
                  placeholder="请输入采购价格"
                  addonAfter="元"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              {/* 预留位置，可添加其他字段 */}
            </Col>
          </Row>

          <Form.Item label="附件上传">
            <Upload
              {...attachmentUploadProps}
              listType="picture-card"
              fileList={attachmentFiles}
              onChange={onAttachmentChange}
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传</div>
              </div>
            </Upload>
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
          <Upload
            {...attachmentUploadProps}
            listType="picture-card"
          >
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 8 }}>上传</div>
            </div>
          </Upload>
        </div>
        {/* 设备自身附件 */}
        <Divider>设备附件</Divider>
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
            <Empty description="暂无设备附件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>

        {/* 保单附件 */}
        <Divider>保单附件（在保时显示）</Divider>
        <div>
          {policyAttachments && policyAttachments.length > 0 ? (
            <Space direction="vertical" style={{ display: 'block' }}>
              {policyAttachments.map((item) => (
                <div key={`${item.policy_id}-${item.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px', border: '1px solid #e6f7ff', borderRadius: '4px', backgroundColor: '#f0f9ff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Tag color="green">保单</Tag>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    <Tag color="blue">{friendlyType(item.mime_type, item.name)}</Tag>
                    <Typography.Text type="secondary">{formatBytes(item.size)}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                      保单号: {item.policy_number}
                    </Typography.Text>
                  </div>
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        const token = sessionStorage.getItem('auth_token');
                        fetch(`/api/policies/${item.policy_id}/attachments/${item.id}`, {
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        })
                          .then(response => response.blob())
                          .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = item.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            message.success('下载成功');
                          })
                          .catch(error => {
                            console.error('下载失败:', error);
                            message.error('下载失败');
                          });
                      }}
                    >
                      下载
                    </Button>
                  </Space>
                </div>
              ))}
            </Space>
          ) : (
            <Empty description="该设备暂无有效保单附件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                <Upload {...batchImportUploadProps}>
                  <Button icon={<PlusOutlined />}>点击上传文件</Button>
                </Upload>

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
                      <div style={{ marginBottom: '6px' }}>
                        <Typography.Text type="danger" strong>
                          第 {item.index} 行：{item.error}
                        </Typography.Text>
                      </div>
                      <div style={{ color: '#666', fontSize: '12px', lineHeight: '20px' }}>
                        <div><strong>出厂编号：</strong>{item.data.code || '-'}</div>
                        <div><strong>自编号：</strong>{item.data.customCode || '-'}</div>
                        <div><strong>设备类型：</strong>{item.data.type || '-'} / {item.data.height || '-'}米</div>
                        <div><strong>品牌型号：</strong>{item.data.brand || '-'} {item.data.model || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 设备详情抽屉 */}
      <EquipmentDetailDrawer
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        equipment={detailEquipment}
      />

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