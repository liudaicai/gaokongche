import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Input, Select, Row, Col, Divider, Typography, message, Upload, Button, Space, Modal, Tag, DatePicker, Affix } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '../../../app/store';
import { Order, EntryRecord } from '../types';
import { selectVehicles, selectDrivers, selectCompanies, addLedgerItem, LogisticsLedgerItem, fetchVehiclesStart, fetchVehiclesSuccess, fetchVehiclesFailure, fetchDriversStart, fetchDriversSuccess, fetchDriversFailure, fetchCompaniesStart, fetchCompaniesSuccess, fetchCompaniesFailure, selectLoading as selectLogisticsLoading, selectError as selectLogisticsError } from '../../logistics/logisticsSlice';
import { selectStores as selectStoresFromStore, fetchStores, selectStoresLoading, selectStoresError } from '../../stores/storesSlice';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure, Equipment } from '../../equipment/equipmentslice';
import { selectDefaultTemplate } from '../../templates/templatesSlice';
import { renderTemplate, printElement, exportElementAsPdf } from '../../templates/templateEngine';
import { addEntry } from '../ordersSlice';
import { apiGet } from '../../../api/client';
import { useTabs } from '../../common/TabsContext';

import EquipmentPickerModal from '../components/EquipmentPickerModal';
import dayjs from 'dayjs';

const { Text } = Typography;

type LogisticsUIType = '客户自提' | '我方物流' | '第三方物流';

interface Props {
  order: Order;
  tabKey: string;
}

// 简易进场单号生成：IN + 时间戳后8位 + 随机3位
const generateEntryNumber = (): string => {
  const prefix = 'IN';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

const EntryOperationTab: React.FC<Props> = ({ order, tabKey }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useTabs();
  const [form] = Form.useForm();
  const [entryAttachmentMap, setEntryAttachmentMap] = useState<Record<string, any[]>>({});
  const [pickerState, setPickerState] = useState<{ open: boolean; index: number; item: any; initialCodes: string[] } | null>(null);
  const stores = useSelector(selectStoresFromStore);
  const storesLoading = useSelector(selectStoresLoading);
  const storesError = useSelector(selectStoresError);
  const vehicles = useSelector(selectVehicles);
  const drivers = useSelector(selectDrivers);
  const companies = useSelector(selectCompanies);
  const logisticsLoading = useSelector(selectLogisticsLoading);
  const logisticsError = useSelector(selectLogisticsError);
  const equipmentList = useSelector(selectEquipmentList);
  const defaultEntryTemplate = useSelector(selectDefaultTemplate('进场'));
  const customers = useSelector((state: RootState) => state.customers.customers);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const previewRef = useRef<HTMLDivElement | null>(null);

  const entryNumber = useMemo(generateEntryNumber, []);
  // 新增：有效订单（带设备需求）
  const [effectiveOrder, setEffectiveOrder] = useState<Order>(order);

  // 加载门店列表（仅在为空时触发一次）
  useEffect(() => {
    if (!stores || stores.length === 0) {
      dispatch(fetchStores());
    }
  }, [dispatch]);

  useEffect(() => {
    if (effectiveOrder) {
      form.resetFields();
      setEntryAttachmentMap({});
      const customer: any = customers.find(c => c.id === effectiveOrder.customerId);
      const defaultName: string = customer
        ? (customer.type === 'enterprise'
            ? ((customer.contacts || []).map((ct: any) => ct.name).find((n: string) => !!n) || customer.companyName || effectiveOrder.customerName)
            : (customer.name || effectiveOrder.customerName))
        : effectiveOrder.customerName;
      const defaultPhone: string = customer
        ? (customer.type === 'enterprise'
            ? ((customer.contacts || []).map((ct: any) => ct.phone).find((p: string) => !!p) || '')
            : (customer.phone || ''))
        : '';
      const items = effectiveOrder.equipmentItems || [];
      const scheduledDates = items.map((it: any) => it.scheduledEntryDate).filter((d: string) => !!d);
      const earliestLeaseStart = scheduledDates.length ? dayjs(scheduledDates.sort((a, b) => a.localeCompare(b))[0]) : dayjs();
      form.setFieldsValue({
        entryNumber,
        contractName: `${effectiveOrder.customerName}/${effectiveOrder.projectName}`,
        businessManager: effectiveOrder.businessManagerName,
        contactName: defaultName,
        contactPhone: defaultPhone,
        handoverPerson: effectiveOrder.businessManagerName,
        logisticsType: '客户自提' as LogisticsUIType,
        storeId: stores?.[0]?.id,
        deliveryLocation: effectiveOrder.projectName,
        vehicleId: undefined,
        driverId: undefined,
        companyId: undefined,
        companyContactName: undefined,
        companyContactPhone: undefined,
        logisticsCost: undefined,
        entryDate: dayjs(),
        leaseStartDate: earliestLeaseStart,
        equipmentSelections: (effectiveOrder.equipmentItems || []).map(() => [])
      });
    }
  }, [effectiveOrder, form, entryNumber, stores, customers]);

  // 如果客户列表晚于订单到达，则在字段为空时补全默认联系人与电话
  useEffect(() => {
    if (!effectiveOrder) return;
    const v = form.getFieldsValue(true) as any;
    const needName = !v.contactName;
    const needPhone = !v.contactPhone;
    if (needName || needPhone) {
      const customer: any = customers.find(c => c.id === effectiveOrder.customerId);
      const defaultName: string = customer
        ? (customer.type === 'enterprise'
            ? ((customer.contacts || []).map((ct: any) => ct.name).find((n: string) => !!n) || customer.companyName || effectiveOrder.customerName)
            : (customer.name || effectiveOrder.customerName))
        : effectiveOrder.customerName;
      const defaultPhone: string = customer
        ? (customer.type === 'enterprise'
            ? ((customer.contacts || []).map((ct: any) => ct.phone).find((p: string) => !!p) || '')
            : (customer.phone || ''))
        : '';
      form.setFieldsValue({
        contactName: needName ? defaultName : v.contactName,
        contactPhone: needPhone ? defaultPhone : v.contactPhone,
      });
    }
  }, [customers, effectiveOrder, form]);

  // 加载设备列表（标签页挂载时）
  useEffect(() => {
    dispatch(fetchEquipmentsStart());
    apiGet<Equipment[]>('/equipments')
      .then(list => dispatch(fetchEquipmentsSuccess(list)))
      .catch((err: any) => dispatch(fetchEquipmentsFailure(err?.message || '获取设备列表失败')));
  }, [dispatch]);

  // 加载我方物流（车辆/司机）与第三方物流公司列表（仅在为空时触发一次）
  useEffect(() => {
    (async () => {
      try {
        if (!vehicles || vehicles.length === 0) {
          dispatch(fetchVehiclesStart());
          try {
            const vs = await apiGet<any[]>('/logistics/vehicles');
            dispatch(fetchVehiclesSuccess(vs));
          } catch (err: any) {
            dispatch(fetchVehiclesFailure(err?.message || '获取车辆列表失败'));
            message.error(err?.message || '获取车辆列表失败');
          }
        }
        if (!drivers || drivers.length === 0) {
          dispatch(fetchDriversStart());
          try {
            const ds = await apiGet<any[]>('/logistics/drivers');
            dispatch(fetchDriversSuccess(ds));
          } catch (err: any) {
            dispatch(fetchDriversFailure(err?.message || '获取司机列表失败'));
            message.error(err?.message || '获取司机列表失败');
          }
        }
        if (!companies || companies.length === 0) {
          dispatch(fetchCompaniesStart());
          try {
            const cs = await apiGet<any[]>('/logistics/companies');
            dispatch(fetchCompaniesSuccess(cs));
          } catch (err: any) {
            dispatch(fetchCompaniesFailure(err?.message || '获取物流公司列表失败'));
            message.error(err?.message || '获取物流公司列表失败');
          }
        }
      } catch {}
    })();
  }, [dispatch]);

  // 校验选择项是否仍存在于最新数据（实时同步与提示）
  useEffect(() => {
    const vId = form.getFieldValue('vehicleId');
    if (vId && !vehicles.find(v => v.id === vId)) {
      form.setFieldsValue({ vehicleId: undefined });
      message.warning('所选车辆已不存在或被移除，请重新选择');
    }
  }, [vehicles]);
  useEffect(() => {
    const dId = form.getFieldValue('driverId');
    if (dId && !drivers.find(d => d.id === dId)) {
      form.setFieldsValue({ driverId: undefined });
      message.warning('所选司机已不存在或被移除，请重新选择');
    }
  }, [drivers]);
  useEffect(() => {
    const cId = form.getFieldValue('companyId');
    if (cId && !companies.find(c => c.id === cId)) {
      form.setFieldsValue({ companyId: undefined, companyContactName: undefined, companyContactPhone: undefined });
      message.warning('所选物流公司已不存在或被移除，请重新选择');
    }
  }, [companies]);

  // 新增：订单详情加载以获取设备需求
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (order && (!order.equipmentItems || order.equipmentItems.length === 0)) {
          const detail: any = await apiGet<any>(`/orders/${order.id}`);
          if (mounted) {
            const items = detail?.equipmentItems || [];
            setEffectiveOrder({ ...order, equipmentItems: items });
            const v = form.getFieldsValue(true) as any;
            const curSelections: string[][] = v.equipmentSelections || [];
            if ((curSelections?.length || 0) !== items.length) {
              form.setFieldsValue({ equipmentSelections: (items || []).map(() => []) });
            }
          }
        } else {
          setEffectiveOrder(order);
        }
      } catch (e) {
        // 保守处理：不影响页面，其它逻辑可继续使用基础订单字段
      }
    })();
    return () => { mounted = false; };
  }, [order, form]);

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    form.setFieldsValue({
      companyContactName: company?.contactPerson,
      companyContactPhone: company?.contactPhone,
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // 注意：equipmentSelections 未显式注册为 Form.Item 时不会出现在 validateFields 的返回值中
      // 为避免误判“未选择设备”，改为从完整表单值中读取设备选择
      const allValues = form.getFieldsValue(true) as any;

      // 业务校验：起租日期不能早于进场时间（按天比较）
      if (values.entryDate && values.leaseStartDate) {
        const entryMoment = dayjs(values.entryDate);
        const leaseMoment = dayjs(values.leaseStartDate);
        if (leaseMoment.isBefore(entryMoment, 'day')) {
          throw new Error('起租日期不能早于进场时间');
        }
      }

      // 允许超额进场：至少选择一台设备即可
      const items = effectiveOrder?.equipmentItems || [];
      const selections: string[][] = allValues.equipmentSelections || [];
      const totalSelected = selections.reduce((sum, arr) => sum + ((arr || []).length), 0);
      if (totalSelected === 0) {
        throw new Error('请至少选择一台设备进行进场');
      }

      // 合并在租列表逻辑已暂不使用，移除未读变量以通过类型检查

      // 简化处理：仅更新订单的进场数量用于列表展示
      if (effectiveOrder) {
        // 构造设备进场附件映射（仅针对本次选择的设备编码）
        const selectedCodes = selections.flat();
        const attachmentsMap: Record<string, Array<{ uid: string; name: string; type?: string; size?: number }>> = {};
        selectedCodes.forEach(code => {
          const files = entryAttachmentMap[code] || [];
          attachmentsMap[code] = files.map((f: any) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));
        });

        // 生成进场记录 equipmentSummary（格式：设备类型/高度/数量台；…）
        const equipmentSummaryParts: string[] = items.map((it, idx) => {
          const chosen = selections?.[idx] || [];
          const count = chosen.length;
          if (count <= 0) return '';
          return `${it.equipmentType}/${it.height}/${count}台`;
        }).filter(Boolean);
        const equipmentSummary = equipmentSummaryParts.join('；');

        // 运输方式=物流类型（相应单据显示）
        const logisticsType: '客户自提' | '我方物流' | '第三方物流' = values.logisticsType;
        const transportMethod: '客户自提' | '我方物流' | '第三方物流' | '陆运' | '海运' | '空运' = logisticsType;

        // 记录级附件：聚合本次选择设备的附件
        const recordAttachments = Object.values(attachmentsMap).flat();

        const record: EntryRecord = {
          id: Date.now().toString(),
          entryNumber: values.entryNumber,
          entryDate: dayjs(values.entryDate).format('YYYY-MM-DD HH:mm'),
          leaseStartDate: values.leaseStartDate ? dayjs(values.leaseStartDate).format('YYYY-MM-DD') : undefined,
          equipmentCodes: selectedCodes,
          equipmentSummary,
          transportMethod,
          businessManagerName: effectiveOrder.businessManagerName,
          handoverPerson: values.handoverPerson,
          attachments: recordAttachments.length > 0 ? recordAttachments : undefined,
          // 新增：物流关联与展示字段
          vehicleId: logisticsType === '我方物流' ? values.vehicleId : undefined,
          driverId: logisticsType === '我方物流' ? values.driverId : undefined,
          companyId: logisticsType === '第三方物流' ? values.companyId : undefined,
          companyContactName: logisticsType === '第三方物流' ? values.companyContactName : undefined,
          companyContactPhone: logisticsType === '第三方物流' ? values.companyContactPhone : undefined,
          logisticsCost: logisticsType === '第三方物流' ? (values.logisticsCost ? Number(values.logisticsCost) : undefined) : undefined,
          vehiclePlate: logisticsType === '我方物流' ? (vehicles.find(v => v.id === values.vehicleId)?.plateNumber) : undefined,
          driverName: logisticsType === '我方物流' ? (drivers.find(d => d.id === values.driverId)?.name) : undefined,
          driverPhone: logisticsType === '我方物流' ? (drivers.find(d => d.id === values.driverId)?.phone) : undefined,
          companyName: logisticsType === '第三方物流' ? (companies.find(c => c.id === values.companyId)?.name) : undefined,
        };

        const currentEntryCountForRecord = (selections || []).flat().length;
        const enrichedRecord: EntryRecord = { ...record, equipmentCount: currentEntryCountForRecord };

        // 使用专用接口新增进场记录，避免整单更新覆盖已有记录
        await dispatch(addEntry({ orderId: String(effectiveOrder.id), record: enrichedRecord })).unwrap();

        // 新增：记录物流台账（我方物流/第三方物流）
        const lt: LogisticsUIType = values.logisticsType;
        if (lt !== '客户自提') {
          const store = stores.find(s => s.id === values.storeId);
          const storeName = store?.name || '—';
          const vehicle = vehicles.find(v => v.id === values.vehicleId);
          const driver = drivers.find(d => d.id === values.driverId);
          const company = companies.find(c => c.id === values.companyId);
          const ledgerItem: LogisticsLedgerItem = {
            id: Date.now().toString(),
            orderNumber: values.entryNumber,
            logisticsType: lt === '我方物流' ? 'own' : 'third',
            orderType: 'inbound',
            storeId: values.storeId,
            storeName,
            amount: lt === '第三方物流' ? (Number(values.logisticsCost) || 0) : 0,
            date: new Date().toISOString(),
            vehicleInfo: lt === '我方物流' ? [vehicle?.plateNumber, vehicle?.spec].filter(Boolean).join(' ') || undefined : undefined,
            driverInfo: lt === '我方物流' ? [driver?.name, driver?.phone].filter(Boolean).join('/') || undefined : undefined,
            companyInfo: lt === '第三方物流' ? (company ? `${company.name} (${company.contactPerson}/${company.contactPhone})` : undefined) : undefined
          };
          dispatch(addLedgerItem(ledgerItem));
        }
      }

      message.success('进场属性配置已保存');
      closeTab(tabKey);
    } catch (e: any) {
      message.error(e?.message || '请检查表单输入');
    }
  };

  const buildPreviewData = () => {
    const v = form.getFieldsValue(true);
    const storeName = stores.find(s => s.id === v.storeId)?.name || '—';
    const selections: string[][] = v.equipmentSelections || [];
    const flatCodes = (selections || []).flat();
    const items = flatCodes.map((code: string, idx: number) => {
      const eq = equipmentList.find(e => e.code === code);
      return {
        index: idx + 1,
        equipment_code: code,
        equipment_type: (eq as any)?.type || '—',
        height: (eq as any)?.height || '—'
      };
    });

    // 新增：本次进场台数与累计在租台数（按合并后的在租列表计算）
    const currentEntryCount = flatCodes.length;
    const prevRented = effectiveOrder?.rentedEquipmentIds || [];
    const totalRentedCount = (effectiveOrder?.equipmentItems || []).map((_, idx) => {
      const prev = prevRented?.[idx] || [];
      const chosen = selections?.[idx] || [];
      return Array.from(new Set([...(prev || []), ...chosen])).length;
    }).reduce((sum, n) => sum + n, 0);

    const data = {
      entry_number: v.entryNumber || '—',
      print_date: new Date().toLocaleDateString(),
      contract_name: v.contractName || `${effectiveOrder.customerName}/${effectiveOrder.projectName}`,
      delivery_location: v.deliveryLocation || effectiveOrder.projectName,
      customer_name: effectiveOrder.customerName,
      project_name: effectiveOrder.projectName,
      logistics_type: v.logisticsType || '—',
      store_name: storeName,
      lessee_name: effectiveOrder.customerName,
      lessor_name: (effectiveOrder as any)?.vendorName || '惠州振鸿工程机械租赁有限公司',
      handover_person: v.handoverPerson || '—',
      lease_start_date: v.leaseStartDate ? dayjs(v.leaseStartDate).format('YYYY-MM-DD') : '—',
      entry_current_count: currentEntryCount,
      rented_total_count: totalRentedCount,
      items,
    };
    return data;
  };

  const openPreview = () => {
    if (!defaultEntryTemplate) {
      message.error('尚未设置默认进场模板');
      return;
    }
    const html = renderTemplate(defaultEntryTemplate.content || '', buildPreviewData());
    setPreviewHtml(html);
    setPreviewVisible(true);
  };

  // 计算分组后的门店（按名称首字符分组，并按名称排序）
  const groupedStores = useMemo(() => {
    const list = (stores || []).filter(s => s && s.id && s.name);
    const sorted = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'));
    const groups: Record<string, typeof sorted> = {} as any;
    sorted.forEach(s => {
      const key = (s.name?.[0] || '#').toUpperCase();
      (groups[key] || (groups[key] = [])).push(s);
    });
    return groups;
  }, [stores]);

  const renderLogisticsFields = () => {
    const logisticsType: LogisticsUIType = form.getFieldValue('logisticsType');
    if (logisticsType === '客户自提') return null;
    if (logisticsType === '我方物流') {
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="vehicleId" label="物流车辆" 
              rules={[{ required: true, message: '请选择物流车辆' }, { validator: async (_,_val) => { const val = form.getFieldValue('vehicleId'); if (!val) return Promise.resolve(); return vehicles.find(v => v.id === val) ? Promise.resolve() : Promise.reject(new Error('选择的车辆不存在')); } }]} 
              validateStatus={logisticsError ? 'error' : undefined} help={logisticsError || undefined}>
              <Select placeholder="请选择车辆（车牌号）" 
                      loading={logisticsLoading} showSearch allowClear optionFilterProp="children" 
                      notFoundContent={logisticsLoading ? '加载中...' : '暂无车辆'}>
                {vehicles.map(v => (
                  <Select.Option key={v.id} value={v.id}>{v.plateNumber}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="driverId" label="司机姓名/电话" 
              rules={[{ required: true, message: '请选择司机' }, { validator: async (_,_val) => { const val = form.getFieldValue('driverId'); if (!val) return Promise.resolve(); return drivers.find(d => d.id === val) ? Promise.resolve() : Promise.reject(new Error('选择的司机不存在')); } }]} 
              validateStatus={logisticsError ? 'error' : undefined} help={logisticsError || undefined}>
              <Select placeholder="请选择司机" 
                      loading={logisticsLoading} showSearch allowClear optionFilterProp="children" 
                      notFoundContent={logisticsLoading ? '加载中...' : '暂无司机'}>
                {drivers.map(d => (
                  <Select.Option key={d.id} value={d.id}>{`${d.name} / ${d.phone}`}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      );
    }
    // 第三方物流
    return (
      <React.Fragment>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="companyId" label="物流公司" 
              rules={[{ required: true, message: '请选择物流公司' }, { validator: async (_,_val) => { const val = form.getFieldValue('companyId'); if (!val) return Promise.resolve(); return companies.find(c => c.id === val) ? Promise.resolve() : Promise.reject(new Error('选择的物流公司不存在')); } }]} 
              validateStatus={logisticsError ? 'error' : undefined} help={logisticsError || undefined}>
              <Select placeholder="请选择物流公司" onChange={handleCompanyChange} 
                      loading={logisticsLoading} showSearch allowClear optionFilterProp="children" 
                      notFoundContent={logisticsLoading ? '加载中...' : '暂无物流公司'}>
                {companies.map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="联系人姓名/电话">
              <Space.Compact>
                <Form.Item name="companyContactName" noStyle>
                  <Input style={{ width: '50%' }} placeholder="自动显示联系人" disabled />
                </Form.Item>
                <Form.Item name="companyContactPhone" noStyle>
                  <Input style={{ width: '50%' }} placeholder="自动显示电话" disabled />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="logisticsCost" label="物流成本" rules={[{ required: true, message: '请输入物流成本' }]}> 
              <Input placeholder="请输入物流成本" />
            </Form.Item>
          </Col>
        </Row>
      </React.Fragment>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>进场属性配置</Typography.Title>
      </div>
      <Form form={form} layout="vertical">
        {!order ? (
          <Text type="secondary">请选择一个订单后再进行进场配置</Text>
        ) : (
          <React.Fragment>
          {/* 一、基本信息 */}
          <Divider orientation="left">一、基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="entryNumber" label="进场单号">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contractName" label="合同名称">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="businessManager" label="业务负责人">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="contactName" label="客户联系人" rules={[{ required: true, message: '请输入客户联系人' }]}> 
                <Input placeholder="请输入客户联系人" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contactPhone" label="电话" rules={[{ required: true, message: '请输入电话' }]}> 
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="handoverPerson" label="交机人" rules={[{ required: true, message: '请输入交机人' }]}> 
                <Input placeholder="请输入交机人" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="entryDate" label="进场时间" rules={[{ required: true, message: '请选择进场时间' }]}> 
                <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="leaseStartDate"
                label="起租日期"
                dependencies={["entryDate"]}
                rules={[
                  { required: true, message: '请选择起租日期' },
                  ({ getFieldValue }) => ({
                    validator: (_, value) => {
                      const entry = getFieldValue('entryDate');
                      if (!value || !entry) return Promise.resolve();
                      // 起租日期不能早于进场时间（按天比较）
                      return dayjs(value).isBefore(dayjs(entry), 'day')
                        ? Promise.reject(new Error('起租日期不能早于进场时间'))
                        : Promise.resolve();
                    }
                  })
                ]}
              > 
                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 二、物流配置 */}
          <Divider orientation="left">二、物流配置</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="logisticsType" label="物流类型" rules={[{ required: true, message: '请选择物流类型' }]}> 
                <Select placeholder="请选择物流类型">
                  <Select.Option value="客户自提">客户自提</Select.Option>
                  <Select.Option value="我方物流">我方物流</Select.Option>
                  <Select.Option value="第三方物流">第三方物流</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="storeId" label="出库门店" rules={[{ required: true, message: '请选择出库门店' }]} validateStatus={storesError ? 'error' : undefined} help={storesError || undefined}> 
                <Select placeholder="请选择门店" loading={storesLoading} showSearch optionFilterProp="children" allowClear notFoundContent={storesLoading ? '加载中...' : '暂无门店'}>
                  {
                    Object.keys(groupedStores).sort((a, b) => a.localeCompare(b)).map(group => (
                      <Select.OptGroup key={group} label={group}>
                        {groupedStores[group].map((s: any) => (
                          <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                        ))}
                      </Select.OptGroup>
                    ))
                  }
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="deliveryLocation" label="交车位置" rules={[{ required: true, message: '请输入交车位置' }]}> 
                <Input placeholder="默认项目名称，可修改" />
              </Form.Item>
            </Col>
          </Row>

          {/* 三、物流信息 （联动显示）*/}
          <Form.Item shouldUpdate={(prev, curr) => prev.logisticsType !== curr.logisticsType} noStyle>
            {() => renderLogisticsFields()}
          </Form.Item>

          {/* 四、进场设备选择 */}
          {/* 替换渲染数据源为有效订单 */}
          {/* 提示“尚未配置设备需求”仅在详情加载后仍为空时显示 */}
          <Divider orientation="left">三、进场设备</Divider>
          {((effectiveOrder.equipmentItems || []).length === 0) && (
            <Text type="secondary">当前订单尚未配置“设备需求”，请先在订单的“设备需求”中添加设备类型/高度/数量再进行进场设备选择。</Text>
          )}
          {(effectiveOrder.equipmentItems || []).map((item, index) => (
            <Row gutter={16} key={item.id ?? `entry-equip-${index}`}>
              <Col span={24}>
                <Form.Item label={`设备 ${index + 1}（类型：${item.equipmentType} / 高度：${item.height}，建议选 ${item.quantity} 台，可超额）`}>
                  <Form.Item shouldUpdate noStyle>
                    {() => {
                      const selected: string[] = form.getFieldValue(["equipmentSelections", index]) || [];
                      return (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Button type="primary" onClick={() => setPickerState({ open: true, index, item, initialCodes: selected })}>
                            选择设备
                          </Button>
                          <Text type="secondary">已选 {selected.length}/{item.quantity} 台</Text>
                          {selected.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {selected.slice(0, 5).map(code => <Tag key={code}>{code}</Tag>)}
                              {selected.length > 5 ? <Text>等 {selected.length} 台</Text> : null}
                            </div>
                          )}
                          <Button onClick={() => {
                            Modal.confirm({
                              title: '确认清空已选设备？',
                              content: '清空后需要重新选择设备。',
                              okText: '清空',
                              cancelText: '取消',
                              okButtonProps: { danger: true },
                              onOk: () => {
                                const current = form.getFieldValue('equipmentSelections') || [];
                                const next = [...current];
                                next[index] = [];
                                form.setFieldsValue({ equipmentSelections: next });
                              },
                            });
                          }}>清空选择</Button>
                          <Upload
                            multiple
                            beforeUpload={() => false}
                            listType="text"
                            onChange={({ fileList }) => {
                              const currentMap = { ...entryAttachmentMap };
                              currentMap[item.id] = (fileList || []).map((f: any) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));
                              setEntryAttachmentMap(currentMap);
                            }}
                            onRemove={(file) => new Promise((resolve) => {
                              Modal.confirm({
                                title: '确认删除该附件？',
                                content: `附件 ${file.name || ''} 将被移除。`,
                                okText: '删除',
                                cancelText: '取消',
                                okButtonProps: { danger: true },
                                onOk: () => resolve(true),
                                onCancel: () => resolve(false),
                              });
                            })}
                          >
                            <Button icon={<UploadOutlined />}>上传附件（与本次设备选择关联）</Button>
                          </Upload>
                        </div>
                      );
                    }}
                  </Form.Item>
                </Form.Item>
              </Col>
            </Row>
          ))}

          {/* 设备选择器模态框（过滤订单已在租与其他项已选的设备） */}
          {pickerState && (() => {
            const alreadyRentedCodes: string[] = (effectiveOrder?.rentedEquipmentIds || []).flat();
            const allSelections: string[][] = form.getFieldValue('equipmentSelections') || [];
            const otherSelectedCodes: string[] = (allSelections || [])
              .filter((_, i) => i !== pickerState.index)
              .flat();
            const allowSet = new Set(pickerState.initialCodes || []);
            const excludeSet = new Set<string>([...alreadyRentedCodes, ...otherSelectedCodes]);
            const filteredEquipmentList = (equipmentList || []).filter(e => !excludeSet.has(e.code) || allowSet.has(e.code));

            return (
              <EquipmentPickerModal
                open={pickerState.open}
                item={pickerState.item}
                equipmentList={filteredEquipmentList}
                initialSelectedCodes={pickerState.initialCodes}
                onlyWaitingDefault={true}
                storeList={(stores || []).map((s: any) => ({ id: s.id, name: s.name }))}
                defaultStoreIds={(function(){ const sid = form.getFieldValue('storeId'); return sid ? [sid] : []; })()}
                onCancel={() => setPickerState(null)}
                onConfirm={(codes) => {
                  const current = form.getFieldValue('equipmentSelections') || [];
                  const next = [...current];
                  next[pickerState.index] = codes;
                  form.setFieldsValue({ equipmentSelections: next });
                  setPickerState(null);
                }}
              />
            );
          })()}

          {/* 模板预览 */}
          <Modal open={previewVisible} onCancel={() => setPreviewVisible(false)} width={1000} footer={null}>
            <div ref={previewRef} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
              <Button onClick={() => { const el = previewRef.current; if (!el) { message.warning('暂无预览内容'); return; } printElement(el); }}>打印</Button>
              <Button onClick={() => { const el = previewRef.current; if (!el) { message.warning('暂无预览内容'); return; } exportElementAsPdf(el, `进场单_${entryNumber}.pdf`); }}>导出PDF</Button>
            </div>
          </Modal>
          </React.Fragment>
        )}
      </Form>
      <Affix offsetBottom={0}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 16px',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <Button onClick={() => closeTab(tabKey)}>返回</Button>
          <Button onClick={openPreview} disabled={!order}>预览</Button>
          <Button type="primary" onClick={handleSave} disabled={!order}>保存</Button>
        </div>
      </Affix>
    </div>
  );
};

export default EntryOperationTab;

// EquipmentItemSelector 已迁移为通用弹窗组件 EquipmentPickerModal