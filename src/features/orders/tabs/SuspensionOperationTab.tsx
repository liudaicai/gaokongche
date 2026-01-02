import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Select, DatePicker, Upload, Button, Row, Col, Divider, Typography, message, Modal, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import { Order, SuspensionRecord } from '../types';
import { addSuspension, selectOrders, fetchOrderById, selectOrderById } from '../ordersSlice';
import { useTabs } from '../../common/TabsContext';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure } from '../../equipment/equipmentslice';
import { apiGet } from '../../../api/client';
import { FixedFooterButtons } from '../../../components/FixedFooterButtons';
import EquipmentPickerModal from '../components/EquipmentPickerModal';

const { Text } = Typography;

interface Props {
  order: Order;
  tabKey: string;
}

// 生成报停单号：SUSP + 时间戳后8位 + 随机3位；并在当前订单集内校验唯一性
const useUniqueSuspensionNumber = () => {
  const orders = useSelector(selectOrders);
  const gen = () => {
    const prefix = 'SUSP';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };
  const ensureUnique = (): string => {
    let candidate = gen();
    const seen = new Set(orders.flatMap(o => (o.suspensions || []).map(r => r.suspensionNumber)));
    while (seen.has(candidate)) {
      candidate = gen();
    }
    return candidate;
  };
  return useMemo(() => ensureUnique(), [orders]);
};

const SuspensionOperationTab: React.FC<Props> = ({ order, tabKey }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useTabs();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const equipmentList = useSelector(selectEquipmentList);
  const suspensionNumber = useUniqueSuspensionNumber();
  // 设备选择弹窗状态
  const [pickerOpen, setPickerOpen] = useState(false);
  
  // 获取完整订单数据（包含 rentedEquipmentIds）
  const fullOrder = useSelector((state: any) => selectOrderById(state, order.id));
  const effectiveOrder = useMemo(() => {
    // 如果缓存中有完整订单数据，使用缓存；否则使用传入的 order
    if (fullOrder && fullOrder.rentedEquipmentIds) {
      return fullOrder;
    }
    return order;
  }, [fullOrder, order]);

  // ⚠️ 关键修复：每次打开报停操作时，强制刷新订单详情以获取最新的在租设备列表
  useEffect(() => {
    if (order?.id) {
      console.log('[报停] 🔄 强制刷新订单详情以获取最新在租设备列表', order.id);
      dispatch(fetchOrderById(order.id));
    }
  }, [dispatch, order?.id]);

  // 加载设备列表（如果为空或数量不足）
  useEffect(() => {
    // 如果设备列表为空，或者需要查找的设备不在列表中，重新加载
    const rentedCodes = (effectiveOrder?.rentedEquipmentIds || []).flat();
    const needsReload = !equipmentList || equipmentList.length === 0 || 
      (rentedCodes.length > 0 && rentedCodes.some(code => !equipmentList.find(e => e.code === code)));
    
    if (needsReload) {
      dispatch(fetchEquipmentsStart());
      // 使用较大的 size 参数确保获取所有设备
      apiGet<any>('/equipments?size=10000')
        .then((response: any) => {
          // 处理分页响应：可能是 { ok: true, data: [...], page: 1, pageSize: 100, total: 100 }
          // 或者直接是数组
          let data: any[] = [];
          if (Array.isArray(response)) {
            data = response;
          } else if (response?.data && Array.isArray(response.data)) {
            data = response.data;
          } else if (response?.ok && Array.isArray(response.data)) {
            data = response.data;
          }
          dispatch(fetchEquipmentsSuccess(data));
        })
        .catch((err: any) => dispatch(fetchEquipmentsFailure(err?.message || '获取设备列表失败')));
    }
  }, [dispatch, equipmentList, effectiveOrder]);

  useEffect(() => {
    if (effectiveOrder) {
      form.resetFields();
      setFileList([]);
      form.setFieldsValue({
        suspensionNumber,
        contractName: `${effectiveOrder.customerName}/${effectiveOrder.projectName}`,
        suspensionType: undefined,
        reason: undefined,
        startDate: undefined,
        endDate: undefined,
        suspensionSelections: []
      });
    }
  }, [effectiveOrder, form, suspensionNumber]);

  const confirmSubmit = async (count: number): Promise<boolean> => new Promise((resolve) => {
    Modal.confirm({
      title: '确认提交报停',
      content: `即将提交对 ${count} 台设备的报停。是否继续？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

  const handleSave = async () => {
    try {
      // 先验证表单字段
      const values = await form.validateFields().catch((errorInfo) => {
        // 如果有验证错误，显示第一个错误信息
        if (errorInfo?.errorFields && errorInfo.errorFields.length > 0) {
          const firstError = errorInfo.errorFields[0];
          const errorMessage = firstError?.errors?.[0] || '请检查表单输入';
          message.error(errorMessage);
          throw new Error(errorMessage);
        }
        throw errorInfo;
      });
      if (!order) return;

      const start = values.startDate;
      const end = values.endDate;
      if (!start) throw new Error('请选择报停开始日期');
      if (!end) throw new Error('请选择报停结束日期');
      const diffDays = end.diff(start, 'day');
      if (diffDays < 0) throw new Error('结束日期不得早于开始日期');
      const suspensionDays = diffDays + 1; // 按自然日计算，含首尾

      const selections: string[] = values.suspensionSelections || [];
      const rented: string[] = (effectiveOrder?.rentedEquipmentIds || []).flat();
      const totalSelected = selections.length;
      if (totalSelected === 0) {
        throw new Error('请至少选择一台在租设备进行报停');
      }
      // 校验选择的设备必须在在租列表中
      const invalid = selections.filter(id => !rented.includes(id));
      if (invalid.length > 0) {
        throw new Error(`包含非在租编号：${invalid.join(', ')}`);
      }
      // 注意：不再检查设备状态，因为 rentedEquipmentIds 已经是从进场记录计算的真实在租设备

      // 新增：校验报停期间内设备必须在场
      const suspensionStartStr = start.format('YYYY-MM-DD');
      const suspensionEndStr = end.format('YYYY-MM-DD');
      const entries = effectiveOrder.entries || [];
      const exits = effectiveOrder.exits || [];
      
      // 构建设备在场时间段映射：设备编码 -> 在场区间数组
      const equipmentPresencePeriods = new Map<string, Array<{ entryDate: string; exitDate: string | null }>>();
      
      // 收集每台设备的进场记录
      entries.forEach(entry => {
        const codes = entry.equipmentCodes || [];
        const entryDate = entry.entryDate ? entry.entryDate.split(' ')[0] : null; // 取日期部分
        if (!entryDate) return;
        
        codes.forEach(code => {
          if (!equipmentPresencePeriods.has(code)) {
            equipmentPresencePeriods.set(code, []);
          }
          equipmentPresencePeriods.get(code)!.push({ entryDate, exitDate: null });
        });
      });
      
      // 收集每台设备的退场记录，更新对应的在场区间的结束日期
      exits.forEach(exit => {
        const codes = exit.equipmentCodes || [];
        const exitDate = exit.exitDate ? exit.exitDate.split(' ')[0] : null;
        if (!exitDate) return;
        
        codes.forEach(code => {
          const periods = equipmentPresencePeriods.get(code);
          if (periods && periods.length > 0) {
            // 找到最近的未结束的进场记录
            const lastOpenPeriod = periods.find(p => p.exitDate === null);
            if (lastOpenPeriod) {
              lastOpenPeriod.exitDate = exitDate;
            }
          }
        });
      });
      
      // 校验每台选中的设备在报停期间内是否在场
      const notPresentEquipments: string[] = [];
      selections.forEach(code => {
        const periods = equipmentPresencePeriods.get(code) || [];
        
        // 检查是否存在一个覆盖整个报停期间的在场区间
        const isPresent = periods.some(period => {
          const entryDate = period.entryDate;
          const exitDate = period.exitDate || '9999-12-31'; // 未退场视为仍在场
          
          // 报停期间必须完全包含在进退场区间内
          return entryDate <= suspensionStartStr && suspensionEndStr <= exitDate;
        });
        
        if (!isPresent) {
          notPresentEquipments.push(code);
        }
      });
      
      if (notPresentEquipments.length > 0) {
        throw new Error(`以下设备在报停期间 ${suspensionStartStr} 至 ${suspensionEndStr} 内未在场，无法报停：${notPresentEquipments.join(', ')}`);
      }

      // 二次确认
      const ok = await confirmSubmit(totalSelected);
      if (!ok) return;

      const attachments = fileList.map((f) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));

      const record: SuspensionRecord = {
        id: Date.now().toString(),
        suspensionNumber: values.suspensionNumber,
        contractName: values.contractName,
        suspensionType: values.suspensionType,
        reason: values.reason?.trim(),
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
        suspensionDays,
        equipmentSelections: [selections],
        attachments,
        createdAt: new Date().toISOString(),
      };

      await dispatch(addSuspension({ orderId: effectiveOrder.id, record })).unwrap();
      message.success('报停属性配置已保存');
      
      // 刷新订单详情以更新报停记录列表
      await dispatch(fetchOrderById(effectiveOrder.id));
      
      closeTab(tabKey);
    } catch (e: any) {
      // 如果是表单验证错误，已经在上面的 catch 中处理了
      if (e?.errorFields) {
        return;
      }
      
      console.error('[Suspension] Save error:', e);
      console.error('[Suspension] Error details:', {
        message: e?.message,
        error: e?.error,
        payload: e?.payload,
        stack: e?.stack
      });
      
      // 处理 501 错误（Not Implemented）
      const errorMessage = e?.message || e?.error || e?.payload || '请检查表单输入';
      
      // 如果错误消息包含 "not implemented" 或 "501"，显示更明确的提示
      if (errorMessage.includes('not implemented') || errorMessage.includes('501') || errorMessage.includes('未实现')) {
        message.error('功能未实现，请重启后端服务以加载最新代码');
      } else {
        message.error(errorMessage);
      }
    }
  };

  return (
    <div style={{ padding: 16 }} className="page-with-fixed-footer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>报停属性配置</Typography.Title>
      </div>
      <Form form={form} layout="vertical">
        {!effectiveOrder ? (
          <Text type="secondary">请选择一个订单后再进行报停配置</Text>
        ) : (
          <React.Fragment>
          {/* 一、基本信息 */}
          <Divider orientation="left">一、基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="suspensionNumber" label="报停单号">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contractName" label="合同信息">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="suspensionType" label="报停类型" rules={[{ required: true, message: '请选择报停类型' }]}> 
                <Select placeholder="请选择报停类型">
                  <Select.Option value="weather">天气原因</Select.Option>
                  <Select.Option value="site_stop">工地停工</Select.Option>
                  <Select.Option value="maintenance">设备维修</Select.Option>
                  <Select.Option value="customer_request">客户要求</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item 
                name="reason" 
                label="报停原因" 
                rules={[{ required: true, message: '请填写报停原因' }]}
              >
                <Input.TextArea rows={3} placeholder="请详细说明报停原因" maxLength={500} showCount />
              </Form.Item>
            </Col>
          </Row>

          {/* 二、报停设备 */}
          <Divider orientation="left">二、报停设备</Divider>
          <Form.Item shouldUpdate noStyle>
            {() => {
              const rentedCodes = (effectiveOrder.rentedEquipmentIds || []).flat();
              const rentedSet = new Set(rentedCodes);
              // 修复：不检查设备状态，只要在 rentedEquipmentIds 中即可（在租设备列表已经是从进场记录计算的）
              const rentedEquipments = (equipmentList || []).filter(e => rentedSet.has(e.code));
              const selectedCodes: string[] = form.getFieldValue('suspensionSelections') || [];
              
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text type="secondary">
                      {rentedEquipments.length > 0 
                        ? `当前订单在租设备共 ${rentedEquipments.length} 台，已选 ${selectedCodes.length} 台`
                        : rentedCodes.length > 0 
                          ? `在租设备编码: ${rentedCodes.join(', ')}，但设备列表中未找到对应设备`
                          : '当前订单暂无在租设备'}
                    </Text>
                    <Button
                      type="primary"
                      disabled={rentedEquipments.length === 0}
                      onClick={() => setPickerOpen(true)}
                    >
                      选择报停设备
                    </Button>
                  </div>
                  
                  {selectedCodes.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        {selectedCodes.slice(0, 10).map(code => {
                          const eq = equipmentList.find(e => e.code === code);
                          return (
                            <Tag key={code} closable onClose={() => {
                              const current = form.getFieldValue('suspensionSelections') || [];
                              form.setFieldsValue({
                                suspensionSelections: current.filter((c: string) => c !== code)
                              });
                            }}>
                              {code} ({eq?.type}/{eq?.height})
                            </Tag>
                          );
                        })}
                        {selectedCodes.length > 10 && <Text>等 {selectedCodes.length} 台设备</Text>}
                      </div>
                      <Button 
                        danger 
                        size="small"
                        onClick={() => {
                          Modal.confirm({
                            title: '确认清空已选设备？',
                            content: '清空后需要重新选择设备。',
                            okText: '清空',
                            cancelText: '取消',
                            okButtonProps: { danger: true },
                            onOk: () => {
                              form.setFieldsValue({ suspensionSelections: [] });
                            },
                          });
                        }}
                      >
                        清空所选
                      </Button>
                    </div>
                  )}
                  
                  <Form.Item name="suspensionSelections" style={{ display: 'none' }}>
                    <Input />
                  </Form.Item>
                </div>
              );
            }}
          </Form.Item>

          {/* 三、日期设置与附件上传 */}
          <Divider orientation="left">三、日期与附件</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="startDate" label="报停开始日期" rules={[{ required: true, message: '请选择开始日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="endDate" label="报停结束日期" rules={[{ required: true, message: '请选择结束日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item shouldUpdate={(prev, curr) => prev.startDate !== curr.startDate || prev.endDate !== curr.endDate} label="报停天数">
                {() => {
                  const s = form.getFieldValue('startDate');
                  const e = form.getFieldValue('endDate');
                  let daysText = '-';
                  if (s && e) {
                    const d = e.diff(s, 'day');
                    daysText = d < 0 ? '日期不合法' : `${d + 1} 天`;
                  }
                  return <Text>{daysText}</Text>;
                }}
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="附件上传">
                <Upload
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(fileList)}
                  beforeUpload={() => false}
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
                  <Button icon={<PlusOutlined />}>上传报停单据</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
          </React.Fragment>
        )}
      </Form>
      
      {/* 设备选择弹窗 */}
      {effectiveOrder && pickerOpen && (
        <EquipmentPickerModal
          open={pickerOpen}
          item={{ equipmentType: '全部', height: '', quantity: 0 }}
          equipmentList={equipmentList}
          initialSelectedCodes={form.getFieldValue('suspensionSelections') || []}
          allowedCodes={(effectiveOrder.rentedEquipmentIds || []).flat()}
          onlyWaitingDefault={false}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(selectedCodes: string[]) => {
            form.setFieldsValue({ suspensionSelections: selectedCodes });
            setPickerOpen(false);
          }}
        />
      )}
      
      <FixedFooterButtons>
        <Button onClick={() => closeTab(tabKey)}>返回</Button>
        <Button type="primary" onClick={handleSave}>保存</Button>
      </FixedFooterButtons>
    </div>
  );
};

export default SuspensionOperationTab;