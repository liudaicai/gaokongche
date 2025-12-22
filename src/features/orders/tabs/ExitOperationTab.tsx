import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Input, Select, Row, Col, Divider, Typography, message, Upload, Button, Space, Modal, Tag, DatePicker, Switch } from 'antd';
import { FixedFooterButtons } from '../../../components/FixedFooterButtons';
import { PlusOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '../../../app/store';
import { Order, ExitRecord } from '../types';
import { selectVehicles, selectDrivers, selectCompanies, addLedgerItem, LogisticsLedgerItem, fetchVehiclesStart, fetchVehiclesSuccess, fetchVehiclesFailure, fetchDriversStart, fetchDriversSuccess, fetchDriversFailure, fetchCompaniesStart, fetchCompaniesSuccess, fetchCompaniesFailure, selectLoading as selectLogisticsLoading, selectError as selectLogisticsError } from '../../logistics/logisticsSlice';
import { selectStores as selectStoresFromStore, fetchStores, selectStoresLoading, selectStoresError } from '../../stores/storesSlice';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure, Equipment, updateEquipmentSuccess, addTransferOrderSuccess } from '../../equipment/equipmentslice';
import { selectDefaultTemplate } from '../../templates/templatesSlice';
import { renderTemplate, printElement, exportElementAsPdf } from '../../templates/templateEngine';
import { addExit, updateOrder, fetchOrderById } from '../ordersSlice';
import { fetchCustomers } from '../../customers/customerSlice';
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
 const [pickerOpen, setPickerOpen] = useState(false);
  // 新增：转租设备还租标记 { [equipmentCode]: boolean }，默认为 true
  const [subleaseReturnMap, setSubleaseReturnMap] = useState<Record<string, boolean>>({});
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
  // 基于角色的权限门控：允许 admin 和 superadmin 进行退场操作
  const { user: authUser } = useSelector((state: RootState) => state.auth);
  const roleFromLS = (() => {
    try { const u = localStorage.getItem('user'); return u ? (JSON.parse(u)?.role) : undefined; } catch { return undefined; }
  })();
  const userRole = authUser?.role ?? roleFromLS ?? '';
  const canExit = userRole === 'admin' || userRole === 'superadmin';
   const [previewVisible, setPreviewVisible] = useState(false);
   const [previewHtml, setPreviewHtml] = useState('');
   const previewRef = useRef<HTMLDivElement | null>(null);
   const exitNumber = useMemo(generateExitNumber, []);
   // 新增：有效订单（带设备需求）
   const [effectiveOrder, setEffectiveOrder] = useState<Order | null>(order || null);
   
   // ⚠️ 关键修复：强制从 Redux store 获取最新的订单数据（包含 rentedEquipmentIds）
   const orderFromStore = useSelector((state: any) => 
     state.orders.orders.find((o: Order) => o.id === order?.id)
   );
   
   useEffect(() => {
     // ⚠️ 关键修复：每次打开退场操作时，强制刷新订单详情以获取最新的在租设备列表
     if (order?.id) {
       console.log('[退场] 🔄 强制刷新订单详情以获取最新在租设备列表', order.id);
       dispatch(fetchOrderById(order.id));
     }
   }, [dispatch, order?.id]);
   
   useEffect(() => { 
     // 优先使用 Redux store 中的订单数据（包含完整的 rentedEquipmentIds）
     const latestOrder = orderFromStore || order;
     console.log('[退场] 设置有效订单:', {
       orderId: latestOrder?.id,
       hasRentedIds: !!(latestOrder?.rentedEquipmentIds),
       rentedCount: (latestOrder?.rentedEquipmentIds || []).flat().length
     });
     setEffectiveOrder(latestOrder || null);
   }, [order, orderFromStore]);
   
   useEffect(() => {
     if (effectiveOrder) {
       form.resetFields();
       setExitAttachmentMap({});
       // 严格字符串比较查找客户
       const customer: any = customers.find(c => String(c.id) === String(effectiveOrder.customerId));
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
        selectedEquipmentCodes: []
      });
    }
  }, [effectiveOrder, form, exitNumber, stores, customers]);

  // 加载门店列表（仅在为空时触发一次）
  useEffect(() => {
    if (!stores || stores.length === 0) {
      dispatch(fetchStores());
    }
  }, [dispatch]);

  // 加载客户列表（仅在为空时触发一次）
  useEffect(() => {
    if (!customers || customers.length === 0) {
      dispatch(fetchCustomers() as any);
    }
  }, [dispatch, customers]);
   
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
  
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

       if (!effectiveOrder) {
         throw new Error('订单信息缺失，请重新打开页面');
       }

       // 校验设备选择：至少选择一台在租设备
       const selectedCodes: string[] = values.selectedEquipmentCodes || [];
       if (selectedCodes.length === 0) {
         throw new Error('请至少选择一台设备进行退场');
       }

       // 校验：所选设备必须为当前在租设备
       const rentedSet = new Set((effectiveOrder.rentedEquipmentIds || []).flat());
       const invalidCodes = selectedCodes.filter(code => !rentedSet.has(code));
       if (invalidCodes.length > 0) {
         throw new Error(`检测到非在租设备编码：${invalidCodes.slice(0, 5).join('、')}${invalidCodes.length > 5 ? ' 等' : ''}，请仅选择在租设备`);
       }

       // 更新在租列表：移除已退场设备
       const currentRented = new Set((effectiveOrder.rentedEquipmentIds || []).flat());
       selectedCodes.forEach(code => currentRented.delete(code));
       const updatedRented = [Array.from(currentRented)];

      // 当前物流 UI 类型（后续台账与自动调拨共用）
      const lt: LogisticsUIType = values.logisticsType;

      if (effectiveOrder) {
         // 构造设备退场附件映射
         const attachmentsMap: Record<string, Array<{ uid: string; name: string; type?: string; size?: number }>> = {};
         selectedCodes.forEach((code: string) => {
           const files = exitAttachmentMap[code] || [];
           attachmentsMap[code] = files.map((f: any) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));
         });

         // 生成退场记录 equipmentSummary
         const equipmentTypeSummary: Record<string, { type: string; height: string; count: number }> = {};
         selectedCodes.forEach((code: string) => {
           const eq = equipmentList.find(e => e.code === code);
           if (eq) {
             const key = `${eq.type}/${eq.height}`;
             if (!equipmentTypeSummary[key]) {
               equipmentTypeSummary[key] = { type: eq.type, height: String(eq.height), count: 0 };
             }
             equipmentTypeSummary[key].count++;
           }
         });
         const equipmentSummaryParts = Object.values(equipmentTypeSummary).map(
           item => `${item.type}/${item.height}/${item.count}台`
         );
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
          rentEndDate: values.settlementDate ? dayjs(values.settlementDate).format('YYYY-MM-DD') : undefined,
          settlementDate: values.settlementDate ? dayjs(values.settlementDate).format('YYYY-MM-DD') : undefined,
          equipmentCodes: selectedCodes,
           equipmentSummary,
           transportMethod,
           businessManagerName: effectiveOrder.businessManagerName,
           handoverPerson: values.receiverPerson,
           attachments: recordAttachments.length > 0 ? recordAttachments : undefined,
           // 新增：门店信息（入库门店）
           returnStoreId: values.returnStoreId,
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
         // ⚠️ 关键修复：必须保留 equipmentItems，否则后端会清空设备需求
         const updatedBase = {
           ...effectiveOrder,
           status: undefined,
           rentedEquipmentIds: updatedRented,
           exitAttachments: { ...(effectiveOrder.exitAttachments || {}), ...attachmentsMap },
           equipmentItems: effectiveOrder.equipmentItems, // 保留原有的设备需求
           entries: undefined,
           exits: undefined,
         } as any;
        await dispatch(updateOrder(updatedBase)).unwrap();

        // ℹ️ 物流台账由后端自动创建，无需前端重复创建
        console.log('✅ 退场记录创建完成，物流台账由后端自动生成');
      }

      // 同步更新所选设备的门店与仓库；若仓库不一致则自动创建调拨单
      try {
        const returnStoreId: string = values.returnStoreId;
        const newStoreName: string = stores.find(s => s.id === returnStoreId)?.name || '';
        const selectedCodes: string[] = values.selectedEquipmentCodes || [];
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

      // 处理转租设备还租
      try {
        const selectedCodes: string[] = values.selectedEquipmentCodes || [];
        const selectedEquipments = equipmentList.filter(e => selectedCodes.includes(e.code));
        const subleaseEquipments = selectedEquipments.filter(e => e.source === 'sublease');
        
        if (subleaseEquipments.length > 0) {
          console.log('[退场] 检测到转租设备:', subleaseEquipments.map(e => e.code));
          
          // 遍历转租设备，对勾选了"还租"的设备调用还租API
          for (const eq of subleaseEquipments) {
            const shouldReturn = subleaseReturnMap[eq.code] !== false; // 默认为 true
            
            if (shouldReturn) {
              try {
                console.log(`[退场] 还租转租设备: ${eq.code}`);
                
                // 通过出厂编号查询转租设备ID
                const subleaseEquipment = await apiGet<any>(`/sublease/equipments/by-factory-number/${eq.code}`);
                
                if (subleaseEquipment && subleaseEquipment.id) {
                  // 调用还租API
                  await apiPut(`/sublease/equipments/${subleaseEquipment.id}/return`, {
                    returnDate: dayjs(values.exitDate).format('YYYY-MM-DD'),
                    remark: `退场自动还租 - 退场单号: ${values.exitNumber}`
                  });
                  
                  console.log(`[退场] ✅ 转租设备 ${eq.code} 已成功还租`);
                } else {
                  console.warn(`[退场] ⚠️ 未找到转租设备记录: ${eq.code}`);
                }
              } catch (err: any) {
                console.error(`[退场] ❌ 还租失败 ${eq.code}:`, err);
                message.warning(`转租设备 ${eq.code} 还租失败: ${err?.message || '未知错误'}`);
              }
            } else {
              console.log(`[退场] 跳过还租: ${eq.code} (用户未勾选)`);
            }
          }
        }
      } catch (err: any) {
        console.error('[退场] 转租设备还租处理异常:', err);
        // 不阻断退场流程，仅记录错误
      }

       message.success('退场属性配置已保存');
       closeTab(tabKey);
     } catch (e: any) {
       message.error(e?.message || '请检查表单输入');
     }
   };

  const renderLogisticsFields = () => {
    const logisticsType: LogisticsUIType = form.getFieldValue('logisticsType');
    
    // 客户自提 - 不显示任何物流字段
    if (logisticsType === '客户自提') {
      return null;
    }
     
     // 我方物流
     if (logisticsType === '我方物流') {
       return (
         <React.Fragment>
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
           <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="logisticsCost" label="物流成本"> 
                 <Input placeholder="请输入物流成本（选填）" type="number" />
               </Form.Item>
             </Col>
           </Row>
         </React.Fragment>
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
               <Input placeholder="请输入物流成本" type="number" />
             </Form.Item>
           </Col>
          </Row>
          </React.Fragment>
     );
   };
 
   // 预览数据构建
   const buildPreviewData = () => {
     if (!effectiveOrder) return {};
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
    <div style={{ padding: 16 }} className="page-with-fixed-footer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>退场属性配置</Typography.Title>
      </div>
      {!effectiveOrder ? (
        <Text type="secondary">请选择一个订单后再进行退场配置</Text>
      ) : (
      <Form form={form} layout="vertical">
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
            <Form.Item shouldUpdate noStyle>
             {() => {
               const rentedSet = new Set((effectiveOrder.rentedEquipmentIds || []).flat());
               const rentedEquipments = (equipmentList || []).filter(e => rentedSet.has(e.code));
               const selectedCodes: string[] = form.getFieldValue('selectedEquipmentCodes') || [];
               
               return (
                 <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                     <Text type="secondary">
                       {rentedEquipments.length > 0 
                         ? `当前订单在租设备共 ${rentedEquipments.length} 台，已选 ${selectedCodes.length} 台`
                         : '当前订单暂无在租设备'}
                     </Text>
                     <Button
                       type="primary"
                       disabled={rentedEquipments.length === 0 || !canExit}
                       onClick={() => setPickerOpen(true)}
                     >
                       选择退场设备
                     </Button>
                   </div>
                   
                   {selectedCodes.length > 0 && (
                     <div style={{ marginTop: 16 }}>
                       <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                         {selectedCodes.slice(0, 10).map(code => {
                           const eq = equipmentList.find(e => e.code === code);
                           const isSublease = eq?.source === 'sublease';
                           const shouldReturn = subleaseReturnMap[code] !== false; // 默认为 true
                           
                           return (
                             <div key={code} style={{ 
                               display: 'inline-flex', 
                               alignItems: 'center', 
                               marginRight: 8, 
                               marginBottom: 8,
                             }}>
                               <Tag closable={canExit} onClose={() => {
                                 const current = form.getFieldValue('selectedEquipmentCodes') || [];
                                 form.setFieldsValue({
                                   selectedEquipmentCodes: current.filter((c: string) => c !== code)
                                 });
                               }}>
                                 {code} ({eq?.type}/{eq?.height})
                               </Tag>
                               {isSublease && (
                                 <div style={{ 
                                   display: 'inline-flex', 
                                   alignItems: 'center',
                                   marginLeft: 4,
                                   padding: '2px 8px',
                                   background: '#fff7e6',
                                   borderRadius: 4,
                                   border: '1px solid #ffd591'
                                 }}>
                                   <Tag color="orange" style={{ margin: 0, marginRight: 6 }}>转租</Tag>
                                   <Space size={4}>
                                     <Typography.Text type="secondary" style={{ fontSize: 12 }}>还租</Typography.Text>
                                     <Switch
                                       size="small"
                                       checked={shouldReturn}
                                       onChange={(checked) => {
                                         setSubleaseReturnMap(prev => ({ ...prev, [code]: checked }));
                                       }}
                                     />
                                   </Space>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                         {selectedCodes.length > 10 && <Text>等 {selectedCodes.length} 台设备</Text>}
                       </div>
                       <Button 
                         danger 
                         size="small"
                         disabled={!canExit}
                         onClick={() => {
                           Modal.confirm({
                             title: '确认清空已选设备？',
                             content: '清空后需要重新选择设备。',
                             okText: '清空',
                             cancelText: '取消',
                             okButtonProps: { danger: true },
                             onOk: () => {
                               form.setFieldsValue({ selectedEquipmentCodes: [] });
                             },
                           });
                         }}
                       >
                         清空所选
                       </Button>
                     </div>
                   )}
                   
                   <Form.Item name="selectedEquipmentCodes" style={{ display: 'none' }}>
                     <Input />
                   </Form.Item>
                 </div>
               );
             }}
           </Form.Item>
           
           {/* 退场附件 */}
           <Form.Item shouldUpdate={(prev, curr) => {
             const a = prev?.selectedEquipmentCodes || [];
             const b = curr?.selectedEquipmentCodes || [];
             return JSON.stringify(a) !== JSON.stringify(b);
           }} noStyle>
             {() => {
               const selectedCodes: string[] = form.getFieldValue('selectedEquipmentCodes') || [];
               if (!selectedCodes.length) return null;
               return (
                 <div style={{ marginTop: 16 }}>
                   <Divider orientation="left">退场设备附件</Divider>
                   {selectedCodes.map(code => (
                     <Row gutter={8} key={code} style={{ marginBottom: 12 }}>
                       <Col span={24}>
                         <Form.Item label={`出厂编号 ${code} 的退场附件`}>
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
                             <Button icon={<PlusOutlined />}>上传附件</Button>
                           </Upload>
                         </Form.Item>
                       </Col>
                     </Row>
                   ))}
                 </div>
               );
             }}
           </Form.Item>
       </Form>
      )}
      {effectiveOrder && pickerOpen && (
      <EquipmentPickerModal
        open={pickerOpen}
        item={{ equipmentType: '全部', height: '', quantity: 0 }}
        equipmentList={equipmentList}
        initialSelectedCodes={form.getFieldValue('selectedEquipmentCodes') || []}
        allowedCodes={(effectiveOrder.rentedEquipmentIds || []).flat()}
        onlyWaitingDefault={false}
        onCancel={() => setPickerOpen(false)}
       onConfirm={(codes) => {
          form.setFieldsValue({ selectedEquipmentCodes: codes });
          setPickerOpen(false);
        }}
      />
      )}
      {effectiveOrder && previewVisible && (
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
      )}
      <FixedFooterButtons>
        <Button onClick={() => closeTab(tabKey)}>取消</Button>
        <Button onClick={openPreview}>预览</Button>
        <Button type="primary" onClick={handleSave} disabled={!order || !canExit}>提交</Button>
      </FixedFooterButtons>
    </div>
  );
};

export default ExitOperationTab;