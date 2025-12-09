import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Input, Select, Row, Col, Divider, Typography, message, Upload, Button, Space, Modal, Tag, DatePicker, Affix } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '../../../app/store';
import { Order, ExitRecord } from '../types';
import { selectVehicles, selectDrivers, selectCompanies, addLedgerItem, LogisticsLedgerItem, fetchVehiclesStart, fetchVehiclesSuccess, fetchVehiclesFailure, fetchDriversStart, fetchDriversSuccess, fetchDriversFailure, fetchCompaniesStart, fetchCompaniesSuccess, fetchCompaniesFailure, selectLoading as selectLogisticsLoading, selectError as selectLogisticsError } from '../../logistics/logisticsSlice';
import { selectStores as selectStoresFromStore, fetchStores, selectStoresLoading, selectStoresError } from '../../stores/storesSlice';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure, Equipment, updateEquipmentSuccess, addTransferOrderSuccess } from '../../equipment/equipmentslice';
import { selectDefaultTemplate } from '../../templates/templatesSlice';
import { renderTemplate, printElement, exportElementAsPdf } from '../../templates/templateEngine';
import { addExit, updateOrder } from '../ordersSlice';
import { apiGet, apiPut } from '../../../api/client';
import { useTabs } from '../../common/TabsContext';
import EquipmentPickerModal from '../components/EquipmentPickerModal';
import dayjs from 'dayjs';

 const { Text } = Typography;

 type LogisticsUIType = '客户自提' | '我方物流' | '第三方物流';

 interface Props {
   order: Order;
   tabKey: string;
 }

 // 简易退场单号生成：OUT + 时间戳后8位 + 随机3位
 const generateExitNumber = (): string => {
   const prefix = 'OUT';
   const timestamp = Date.now().toString().slice(-8);
   const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
   return `${prefix}${timestamp}${random}`;
 };

 const ExitOperationTab: React.FC<Props> = ({ order, tabKey }) => {
   const dispatch = useDispatch<AppDispatch>();
   const { closeTab } = useTabs();
   const [form] = Form.useForm();
   const [exitAttachmentMap, setExitAttachmentMap] = useState<Record<string, any[]>>({});
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
 const defaultExitTemplate = useSelector(selectDefaultTemplate('退场'));
  const customers = useSelector((state: RootState) => state.customers.customers);
  // 基于角色的权限门控：仅允许 superadmin 进行退场操作
  const { user: authUser } = useSelector((state: RootState) => state.auth);
  const roleFromLS = (() => {
    try { const u = localStorage.getItem('user'); return u ? (JSON.parse(u)?.role) : undefined; } catch { return undefined; }
  })();
  const userRole = authUser?.role ?? roleFromLS ?? '';
  const canExit = userRole === 'superadmin';
   const [previewVisible, setPreviewVisible] = useState(false);
   const [previewHtml, setPreviewHtml] = useState('');
   const previewRef = useRef<HTMLDivElement | null>(null);
   const exitNumber = useMemo(generateExitNumber, []);
   // 新增：有效订单（带设备需求）
   const [effectiveOrder, setEffectiveOrder] = useState<Order>(order);
   
   useEffect(() => { setEffectiveOrder(order); }, [order]);
   
   useEffect(() => {
     if (effectiveOrder) {
       form.resetFields();
       setExitAttachmentMap({});
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
         exitNumber,
         contractName: `${effectiveOrder.customerName}/${effectiveOrder.projectName}`,
         businessManager: effectiveOrder.businessManagerName,
         contactName: defaultName,
         contactPhone: defaultPhone,
         logisticsType: '客户自提' as LogisticsUIType,
         pickupLocation: effectiveOrder.projectName,
         returnStoreId: stores?.[0]?.id,
         vehicleId: undefined,
         driverId: undefined,
         companyId: undefined,
         companyContactName: undefined,
         companyContactPhone: undefined,
         logisticsCost: undefined,
         receiverPerson: undefined,
         exitDate: dayjs(),
        settlementDate: dayjs(),
        returnSelections: (effectiveOrder.rentedEquipmentIds || (effectiveOrder.equipmentItems || []).map(() => []))
      });
    }
  }, [effectiveOrder, form, exitNumber, stores, customers]);

  // 加载门店列表（仅在为空时触发一次）
  useEffect(() => {
    if (!stores || stores.length === 0) {
      dispatch(fetchStores());
    }
  }, [dispatch]);
   
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

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    form.setFieldsValue({
      companyContactName: company?.contactPerson,
      companyContactPhone: company?.contactPhone,
    });
  };
  // 统一高度数值化：兼容字符串（如“12m/12米/12”）与数字
  const toHeightNumber = (h: any): number => {
    if (h == null) return NaN;
    const s = String(h).trim();
    const n = typeof h === 'number' ? h : parseFloat(s.replace(/[^0-9.\-]/g, '')); // 去除单位字符
    return Number.isFinite(n) ? n : NaN;
  };
  
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

       // 校验设备选择：允许超额退场，但至少选择一台
       const items = effectiveOrder?.equipmentItems || [];
       const selections: string[][] = values.returnSelections || [];
       const totalSelected = selections.reduce((sum, arr) => sum + ((arr || []).length), 0);
       if (totalSelected === 0) {
         throw new Error('请至少选择一台设备进行退场');
       }

       // 进一步校验：所选设备必须为当前在场设备（按类型/高度匹配且在 rentedEquipmentIds 中）
       const rentedSetAll = new Set((effectiveOrder.rentedEquipmentIds || []).flat());
       const invalidCodes: string[] = [];
       const seenAll: Set<string> = new Set();
       const duplicateCodes: string[] = [];
       (items || []).forEach((it, idx) => {
         const chosen = selections?.[idx] || [];
         const allowedForItem = (equipmentList || [])
           .filter(e => e.type === it.equipmentType && toHeightNumber(e.height) === toHeightNumber(it.height) && rentedSetAll.has(e.code))
           .map(e => e.code);
         const allowSet = new Set(allowedForItem);
         chosen.forEach(code => {
           if (!allowSet.has(code)) invalidCodes.push(code);
           if (seenAll.has(code)) duplicateCodes.push(code); else seenAll.add(code);
         });
       });
       if (invalidCodes.length > 0) {
         throw new Error(`检测到非在场设备编码：${Array.from(new Set(invalidCodes)).slice(0, 5).join('、')}${invalidCodes.length > 5 ? ' 等' : ''}，请仅选择在场设备`);
       }
       if (duplicateCodes.length > 0) {
         throw new Error(`检测到重复选择的设备编码：${Array.from(new Set(duplicateCodes)).slice(0, 5).join('、')}${duplicateCodes.length > 5 ? ' 等' : ''}，请避免重复选择`);
       }

       // 更新在租列表：在租 - 本次退场（逐项差集）
       const prevRented = effectiveOrder?.rentedEquipmentIds || [];
       const updatedRented: string[][] = (items || []).map((_, idx) => {
         const prev = prevRented?.[idx] || [];
         const chosen = selections?.[idx] || [];
       const next = prev.filter(code => !chosen.includes(code));
       return next;
      });

      // 当前物流 UI 类型（后续台账与自动调拨共用）
      const lt: LogisticsUIType = values.logisticsType;

      if (effectiveOrder) {
         // 构造设备退场附件映射（仅针对本次选择的设备编码）
         const selectedCodes = selections.flat();
         const attachmentsMap: Record<string, Array<{ uid: string; name: string; type?: string; size?: number }>> = {};
         selectedCodes.forEach(code => {
           const files = exitAttachmentMap[code] || [];
           attachmentsMap[code] = files.map((f: any) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));
         });

         // 生成退场记录 equipmentSummary（格式：设备类型/高度/数量台；…）
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

         const record: ExitRecord = {
           id: Date.now().toString(),
           exitNumber: values.exitNumber,
           exitDate: dayjs(values.exitDate).format('YYYY-MM-DD HH:mm'),
           settlementDate: values.settlementDate ? dayjs(values.settlementDate).format('YYYY-MM-DD') : undefined,
           equipmentCodes: selectedCodes,
           equipmentSummary,
           transportMethod,
           businessManagerName: effectiveOrder.businessManagerName,
           handoverPerson: values.receiverPerson,
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

         // 先新增单条退场记录，避免通过整单 PUT 覆盖历史记录
         await dispatch(addExit({ orderId: effectiveOrder.id, record })).unwrap();

         // 再仅更新在租列表与退场附件（不传 entries/exits，避免后端清空重建）
         const updatedBase = {
           ...effectiveOrder,
           status: undefined,
           rentedEquipmentIds: updatedRented,
           exitAttachments: { ...(effectiveOrder.exitAttachments || {}), ...attachmentsMap },
           entries: undefined,
           exits: undefined,
         } as any;
         await dispatch(updateOrder(updatedBase)).unwrap();

         // 记录物流台账（除客户自提外）
         if (lt !== '客户自提') {
           const vehicle = vehicles.find(v => v.id === values.vehicleId);
           const driver = drivers.find(d => d.id === values.driverId);
           const company = companies.find(c => c.id === values.companyId);
           const storeName = stores.find(s => s.id === values.returnStoreId)?.name || '';
           const ledgerItem: LogisticsLedgerItem = {
             id: `LED-${Date.now()}`,
             orderNumber: values.exitNumber,
             logisticsType: lt === '我方物流' ? 'own' : 'third',
             orderType: 'outbound',
             storeId: values.returnStoreId,
             storeName,
             amount: lt === '第三方物流' ? Number(values.logisticsCost || 0) : 0,
             date: new Date().toISOString(),
             vehicleInfo: lt === '我方物流' ? [vehicle?.plateNumber, vehicle?.spec].filter(Boolean).join(' ') || undefined : undefined,
             driverInfo: lt === '我方物流' ? [driver?.name, driver?.phone].filter(Boolean).join('/') || undefined : undefined,
           companyInfo: lt === '第三方物流' ? (company ? `${company.name} (${company.contactPerson}/${company.contactPhone})` : undefined) : undefined
          };
          dispatch(addLedgerItem(ledgerItem));
        }
      }

      // 同步更新所选设备的门店与仓库；若仓库不一致则自动创建调拨单
      try {
        const returnStoreId: string = values.returnStoreId;
        const newStoreName: string = stores.find(s => s.id === returnStoreId)?.name || '';
        const selectedCodes: string[] = (values.returnSelections || []).flat();
        const selectedEquipments = (equipmentList || []).filter(e => selectedCodes.includes(e.code));
        const mismatchGroups: Record<string, { source: string; ids: string[] }> = {};
        // 批量更新设备门店/仓库
        for (const eq of selectedEquipments) {
          const oldWarehouseName = eq.storeName || eq.warehouse || '';
          try {
            await apiPut(`/equipments/${eq.id}`, {
              storeId: returnStoreId,
              storeName: newStoreName,
              warehouse: newStoreName,
            });
            dispatch(updateEquipmentSuccess({
              ...eq,
              storeId: returnStoreId,
              storeName: newStoreName,
              warehouse: newStoreName,
              updatedAt: new Date().toISOString(),
            }));
          } catch (err: any) {
            message.warning(`设备 ${eq.code} 门店更新失败：${err?.message || '未知错误'}`);
          }
          if (oldWarehouseName && newStoreName && oldWarehouseName !== newStoreName) {
            if (!mismatchGroups[oldWarehouseName]) {
              mismatchGroups[oldWarehouseName] = { source: oldWarehouseName, ids: [] };
            }
            mismatchGroups[oldWarehouseName].ids.push(eq.id);
          }
        }
        // 自动创建调拨单（按来源仓库分组）
        const logisticsCompany = companies.find(c => c.id === values.companyId);
        for (const group of Object.values(mismatchGroups)) {
          const orderNumber = `TR-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
          dispatch(addTransferOrderSuccess({
            id: orderNumber,
            orderNumber,
            applicant: effectiveOrder.businessManagerName || '系统自动',
            sourceWarehouse: group.source,
            targetWarehouse: newStoreName,
            useLogistics: lt !== '客户自提',
            logisticsCompany: lt === '第三方物流' ? logisticsCompany?.name : undefined,
            logisticsCost: lt === '第三方物流' ? Number(values.logisticsCost || 0) : undefined,
            logisticsContact: lt === '第三方物流' ? logisticsCompany?.contactPerson : undefined,
            logisticsPhone: lt === '第三方物流' ? logisticsCompany?.contactPhone : undefined,
            reason: '退场目标仓库与设备当前仓库不一致，自动调拨',
            equipmentIds: group.ids,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
        }
      } catch (err: any) {
        message.warning(err?.message || '设备门店更新或自动调拨创建出现问题，请稍后检查');
      }

       message.success('退场属性配置已保存');
       closeTab(tabKey);
     } catch (e: any) {
       message.error(e?.message || '请检查表单输入');
     }
   };

   const renderLogisticsFields = () => {
     const logisticsType: LogisticsUIType = form.getFieldValue('logisticsType');
     if (logisticsType === '客户自提') return null;
     if (logisticsType === '我方物流') {
       return (
         <Row gutter={16}>
           <Col span={12}>
             <Form.Item
               name="vehicleId"
               label="物流车辆"
               rules={[
                 { required: true, message: '请选择物流车辆' },
                 { validator: (_, value) => { if (!value) return Promise.resolve(); return vehicles.find(v => v.id === value) ? Promise.resolve() : Promise.reject(new Error('所选车辆不存在，请重新选择')); } }
               ]}
               validateStatus={logisticsError ? 'error' : undefined}
               help={logisticsError || undefined}
             >
               <Select
                 placeholder="请选择车辆（车牌号）"
                 loading={logisticsLoading}
                 showSearch
                 allowClear
                 optionFilterProp="children"
                 notFoundContent={logisticsLoading ? '加载中...' : '暂无车辆'}
               >
                 {vehicles.map(v => (
                   <Select.Option key={v.id} value={v.id}>{v.plateNumber}</Select.Option>
                 ))}
               </Select>
             </Form.Item>
           </Col>
           <Col span={12}>
             <Form.Item
               name="driverId"
               label="司机姓名/电话"
               rules={[
                 { required: true, message: '请选择司机' },
                 { validator: (_, value) => { if (!value) return Promise.resolve(); return drivers.find(d => d.id === value) ? Promise.resolve() : Promise.reject(new Error('所选司机不存在，请重新选择')); } }
               ]}
               validateStatus={logisticsError ? 'error' : undefined}
               help={logisticsError || undefined}
             >
               <Select
                 placeholder="请选择司机"
                 loading={logisticsLoading}
                 showSearch
                 allowClear
                 optionFilterProp="children"
                 notFoundContent={logisticsLoading ? '加载中...' : '暂无司机'}
               >
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
             <Form.Item
               name="companyId"
               label="物流公司"
               rules={[
                 { required: true, message: '请选择物流公司' },
                 { validator: (_, value) => { if (!value) return Promise.resolve(); return companies.find(c => c.id === value) ? Promise.resolve() : Promise.reject(new Error('所选物流公司不存在，请重新选择')); } }
               ]}
               validateStatus={logisticsError ? 'error' : undefined}
               help={logisticsError || undefined}
             >
               <Select
                 placeholder="请选择物流公司"
                 onChange={handleCompanyChange}
                 loading={logisticsLoading}
                 showSearch
                 allowClear
                 optionFilterProp="children"
                 notFoundContent={logisticsLoading ? '加载中...' : '暂无物流公司'}
               >
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
 
   // 预览数据构建
   const buildPreviewData = () => {
     const v = form.getFieldsValue(true);
     const returnStoreName = stores.find(s => s.id === v.returnStoreId)?.name || '—';
     const selections: string[][] = v.returnSelections || [];
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
     const driverName = drivers.find(d => d.id === v.driverId)?.name || '—';
     const data = {
       exit_number: v.exitNumber || '—',
       print_date: new Date().toLocaleDateString(),
       customer_name: effectiveOrder.customerName,
       project_name: effectiveOrder.projectName,
       pickup_location: v.pickupLocation || effectiveOrder.projectName,
       return_store_name: returnStoreName,
       logistics_type: v.logisticsType || '—',
       driver_name: driverName,
       receiver_name: v.receiverPerson || '—',
       settlement_date: v.settlementDate ? dayjs(v.settlementDate).format('YYYY-MM-DD') : '—',
       items,
     };
     return data;
   };
 
   // 打开预览
   const openPreview = () => {
     if (!defaultExitTemplate) {
       message.error('尚未设置默认退场模板');
       return;
     }
     const html = renderTemplate(defaultExitTemplate.content || '', buildPreviewData());
     setPreviewHtml(html);
     setPreviewVisible(true);
   };
 
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>退场属性配置</Typography.Title>
      </div>
      <Form form={form} layout="vertical">
         {(
           <React.Fragment>
             {!canExit && (
               <div style={{ marginBottom: 12 }}>
                 <Text type="danger">当前账号无权限进行退场操作，请联系管理员。</Text>
               </div>
             )}
             <Divider orientation="left">一、退场信息</Divider>
             <Row gutter={16}>
               <Col span={8}>
                 <Form.Item name="exitNumber" label="退场单号" rules={[{ required: true, message: '请输入退场单号' }]}> 
                   <Input value={exitNumber} readOnly />
                 </Form.Item>
               </Col>
               <Col span={8}>
                 <Form.Item name="contractName" label="合同名称" rules={[{ required: true, message: '请输入合同名称' }]}> 
                   <Input placeholder="自动显示项目/客户名，可修改" />
                 </Form.Item>
               </Col>
               <Col span={8}>
                 <Form.Item name="businessManager" label="业务经理" rules={[{ required: true, message: '请输入业务经理' }]}> 
                   <Input placeholder="自动显示经理姓名，可修改" />
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
                 <Form.Item name="receiverPerson" label="接机人" rules={[{ required: true, message: '请输入接机人' }]}> 
                   <Input placeholder="请输入接机人" />
                 </Form.Item>
               </Col>
             </Row>
             <Row gutter={16}>
               <Col span={8}>
                 <Form.Item name="exitDate" label="退场时间" rules={[{ required: true, message: '请选择退场时间' }]}> 
                   <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                 </Form.Item>
               </Col>
               <Col span={8}>
                 <Form.Item name="settlementDate" label="租金结算日期" rules={[{ required: true, message: '请选择租金结算日期' }]}> 
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
                 <Form.Item name="pickupLocation" label="收车位置" rules={[{ required: true, message: '请输入收车位置' }]}> 
                   <Input placeholder="默认项目名称，可修改" />
                 </Form.Item>
               </Col>
               <Col span={8}>
                 <Form.Item name="returnStoreId" label="回库门店" rules={[{ required: true, message: '请选择回库门店' }]} validateStatus={storesError ? 'error' : undefined} help={storesError || undefined}> 
                   <Select placeholder="请选择门店" loading={storesLoading} showSearch optionFilterProp="children" allowClear notFoundContent={storesLoading ? '加载中...' : '暂无门店'}>
                     {stores.map(s => (
                       <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                     ))}
                   </Select>
                 </Form.Item>
               </Col>
             </Row>

             {/* 三、物流信息 （联动显示）*/}
             <Form.Item shouldUpdate={(prev, curr) => prev.logisticsType !== curr.logisticsType} noStyle>
               {() => renderLogisticsFields()}
             </Form.Item>

            {/* 四、退场设备选择 */}
            <Divider orientation="left">三、退场设备</Divider>
            {(() => {
              const items = effectiveOrder.equipmentItems || [];
              const allRentedSet = new Set((effectiveOrder.rentedEquipmentIds || []).flat());
              const firstIndex = items.findIndex(it => (equipmentList || []).some(e => e.type === it.equipmentType && toHeightNumber(e.height) === toHeightNumber(it.height) && allRentedSet.has(e.code)));
              const disabledQuick = firstIndex < 0;
              return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <Button
                    type="primary"
                    size="small"
                    disabled={disabledQuick || !canExit}
                    onClick={() => {
                      if (disabledQuick) return;
                      const selected: string[] = form.getFieldValue(["returnSelections", firstIndex]) || [];
                      setPickerState({ open: true, index: firstIndex, item: items[firstIndex], initialCodes: selected });
                    }}
                  >
                    选择设备
                  </Button>
                </div>
              );
            })()}
            {!(effectiveOrder.equipmentItems || []).length && (
              <Text type="secondary">当前订单尚未配置“设备需求”，请先在订单的“设备需求”中添加设备类型/高度/数量再进行退场设备选择。</Text>
            )}
            {(effectiveOrder.equipmentItems || []).map((item, index) => {
               // 允许选择的设备：该订单下已进场且当前在租的设备（按类型/高度匹配当前项）
               const allRentedSet = new Set((effectiveOrder.rentedEquipmentIds || []).flat());
               const allowedCodesForItem = (equipmentList || [])
                 .filter(e => e.type === item.equipmentType && toHeightNumber(e.height) === toHeightNumber(item.height) && allRentedSet.has(e.code))
                 .map(e => e.code);
               const disabled = allowedCodesForItem.length === 0;
               return (
                 <Row gutter={16} key={item.id ?? `exit-equip-${index}`}>
                   <Col span={24}>
                     <Form.Item label={`设备 ${index + 1}（类型：${item.equipmentType} / 高度：${item.height}，可选 ${allowedCodesForItem.length} 台在租设备）`}>
                       <Form.Item shouldUpdate noStyle>
                         {() => {
                           const selected: string[] = form.getFieldValue(["returnSelections", index]) || [];
                           return (
                             <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                               <Button type="primary" disabled={disabled || !canExit} onClick={() => setPickerState({ open: true, index, item, initialCodes: selected })}>
                                 选择设备
                               </Button>
                               <Text type="secondary">{disabled ? '该项无在租设备可选，请先完成进场记录' : `已选 ${selected.length}/${allowedCodesForItem.length} 台`}</Text>
                               {selected.length > 0 && (
                                 <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                   {selected.slice(0, 5).map(code => <Tag key={code}>{code}</Tag>)}
                                   {selected.length > 5 ? <Text>等 {selected.length} 台</Text> : null}
                                 </div>
                               )}
                               <Button disabled={!canExit} onClick={() => {
                                 Modal.confirm({
                                   title: '确认清空已选设备？',
                                   content: '清空后需要重新选择设备。',
                                   okText: '清空',
                                   cancelText: '取消',
                                   okButtonProps: { danger: true },
                                   onOk: () => {
                                     const current = form.getFieldValue('returnSelections') || [];
                                     const next = [...current];
                                     next[index] = [];
                                     form.setFieldsValue({ returnSelections: next });
                                   },
                                 });
                               }}>清空所选</Button>
                             </div>
                           );
                         }}
                       </Form.Item>
                       <Form.Item name={["returnSelections", index]} style={{ display: 'none' }}>
                         <Input />
                       </Form.Item>
                     </Form.Item>
                   </Col>
                   {/* 退场附件渲染 */}
                   <Col span={24}>
                     <Form.Item shouldUpdate={(prev, curr) => {
                       const a = prev?.returnSelections?.[index] || [];
                       const b = curr?.returnSelections?.[index] || [];
                       return JSON.stringify(a) !== JSON.stringify(b);
                     }} noStyle>
                       {() => {
                         const selected: string[] = form.getFieldValue(["returnSelections", index]) || [];
                         if (!selected.length) return null;
                         return (
                           <div>
                             <Divider orientation="left">设备 {index + 1} 退场附件</Divider>
                             {selected.map(code => (
                               <Row gutter={8} key={code}>
                                 <Col span={24}>
                                   <Form.Item label={`设备编码 ${code} 的退场附件`}>
                                     <Upload
                                       fileList={exitAttachmentMap[code] || []}
                                       beforeUpload={() => false}
                                       onChange={({ fileList }) => setExitAttachmentMap(prev => ({ ...prev, [code]: fileList }))}
                                       accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                                       listType="text"
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
                                       <Button icon={<UploadOutlined />}>上传附件</Button>
                                     </Upload>
                                   </Form.Item>
                                 </Col>
                               </Row>
                             ))}
                           </div>
                         );
                       }}
                     </Form.Item>
                   </Col>
                 </Row>
               );
             })}
           </React.Fragment>
         )}
       </Form>
       <EquipmentPickerModal
         open={!!pickerState?.open}
         item={pickerState?.item || { equipmentType: '', height: 0, quantity: 0 }}
         equipmentList={equipmentList}
         initialSelectedCodes={pickerState?.initialCodes || []}
         allowedCodes={(pickerState?.item && (() => {
           const set = new Set((effectiveOrder.rentedEquipmentIds || []).flat());
           return (equipmentList || [])
             .filter(e => e.type === (pickerState.item as any).equipmentType && Number(e.height) === Number((pickerState.item as any).height) && set.has(e.code))
             .map(e => e.code);
         })()) || []}
         onlyWaitingDefault={false}
         onCancel={() => setPickerState(null)}
       onConfirm={(codes) => {
          // 保险过滤：仅保留允许的在场设备编码
          const allowed = (() => {
            const set = new Set((effectiveOrder.rentedEquipmentIds || []).flat());
            return (equipmentList || [])
              .filter(e => e.type === (pickerState?.item as any).equipmentType && Number(e.height) === Number((pickerState?.item as any).height) && set.has(e.code))
              .map(e => e.code);
          })();
          const filteredCodes = (codes || []).filter(c => allowed.includes(c));
          if (filteredCodes.length < (codes || []).length) {
            message.warning('已自动移除非在场设备编码');
          }
          const current = form.getFieldValue('returnSelections') || [];
          const next = [...current];
          if (pickerState) next[pickerState.index] = filteredCodes;
          form.setFieldsValue({ returnSelections: next });
          setPickerState(null);
        }}
      />
      <Modal
         title="退场模板预览"
         open={previewVisible}
         onCancel={() => setPreviewVisible(false)}
         width={980}
         footer={
           <Space>
             <Button onClick={() => setPreviewVisible(false)}>关闭</Button>
             <Button type="primary" onClick={() => previewRef.current && printElement(previewRef.current)}>打印</Button>
             <Button onClick={() => previewRef.current && exportElementAsPdf(previewRef.current, '退场单')}>导出PDF</Button>
           </Space>
         }
       >
         <div ref={previewRef} style={{ background: '#fff', padding: 16 }}>
           <div style={{ marginBottom: 8, fontSize: 14 }}>
             <Text>租金结算日期：{form.getFieldValue('settlementDate') ? dayjs(form.getFieldValue('settlementDate')).format('YYYY-MM-DD') : '—'}</Text>
           </div>
           <div style={{ border: '1px solid #e8e8e8', padding: 8 }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
         </div>
       </Modal>
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
          <Button onClick={() => closeTab(tabKey)}>取消</Button>
          <Button onClick={openPreview}>预览</Button>
          <Button type="primary" onClick={handleSave} disabled={!order || !canExit}>提交</Button>
        </div>
      </Affix>
    </div>
  );
};

export default ExitOperationTab;