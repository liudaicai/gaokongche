import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, DatePicker, Upload, Button, Row, Col, Divider, Typography, message, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import { Order, ClaimRecord } from '../types';
import { addClaim, selectOrders, fetchOrderById, selectOrderById } from '../ordersSlice';
import { useTabs } from '../../common/TabsContext';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure } from '../../equipment/equipmentslice';
import { apiGet } from '../../../api/client';
import { FixedFooterButtons } from '../../../components/FixedFooterButtons';
import EquipmentPickerModal from '../components/EquipmentPickerModal';
import { Tag } from 'antd';

const { Text } = Typography;

interface Props {
  order: Order;
  tabKey: string;
}

// 生成索赔单号：CLM + 时间戳后8位 + 随机3位；并在当前订单集内校验唯一性
const useUniqueClaimNumber = () => {
  const orders = useSelector(selectOrders);
  const gen = () => {
    const prefix = 'CLM';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };
  const ensureUnique = (): string => {
    let candidate = gen();
    const seen = new Set(orders.flatMap(o => (o.claims || []).map(r => r.claimNumber)));
    while (seen.has(candidate)) {
      candidate = gen();
    }
    return candidate;
  };
  return useMemo(() => ensureUnique(), [orders]);
};

const ClaimOperationTab: React.FC<Props> = ({ order, tabKey }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useTabs();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const equipmentList = useSelector(selectEquipmentList);
  const claimNumber = useUniqueClaimNumber();
  
  // 获取完整订单数据（包含 rentedEquipmentIds）
  const fullOrder = useSelector((state: any) => selectOrderById(state, order.id));
  const effectiveOrder = useMemo(() => {
    // 如果缓存中有完整订单数据，使用缓存；否则使用传入的 order
    if (fullOrder && fullOrder.rentedEquipmentIds) {
      return fullOrder;
    }
    return order;
  }, [fullOrder, order]);

  // ⚠️ 关键修复：每次打开索赔操作时，强制刷新订单详情以获取最新的在租设备列表
  useEffect(() => {
    if (order?.id) {
      console.log('[索赔] 🔄 强制刷新订单详情以获取最新在租设备列表', order.id);
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
        claimNumber,
        contractName: `${effectiveOrder.customerName}/${effectiveOrder.projectName}`,
        reason: undefined,
        claimDate: undefined,
        claimAmount: undefined,
        claimSelections: []
      });
    }
  }, [effectiveOrder, form, claimNumber]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!effectiveOrder) return;

      const date = values.claimDate;
      if (!date) throw new Error('请选择索赔日期');
      if (!values.reason || !values.reason.trim()) throw new Error('请填写索赔原因');

      const selections: string[] = values.claimSelections || [];
      const rented: string[] = (effectiveOrder?.rentedEquipmentIds || []).flat();
      const totalSelected = selections.length;
      if (totalSelected === 0) {
        throw new Error('请至少选择一台在租设备进行索赔');
      }
      // 校验选择的设备必须在在租列表中
      const invalid = selections.filter(id => !rented.includes(id));
      if (invalid.length > 0) {
        throw new Error(`包含非在租编号：${invalid.join(', ')}`);
      }

      const attachments = fileList.map((f) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));
      const amountNum = values.claimAmount ? Number(values.claimAmount) : undefined;

      const record: ClaimRecord = {
        id: Date.now().toString(),
        claimNumber: values.claimNumber,
        contractName: values.contractName,
        // 当前未提供索赔类型选择，默认归类为“其他”
        claimType: '其他',
        reason: values.reason.trim(),
        claimDate: date.format('YYYY-MM-DD'),
        claimAmount: isNaN(amountNum as number) ? undefined : amountNum,
        equipmentSelections: [selections],
        attachments,
        createdAt: new Date().toISOString(),
      };

      await dispatch(addClaim({ orderId: effectiveOrder.id, record })).unwrap();
      message.success('索赔属性配置已保存');
      
      // 刷新订单详情以更新索赔记录列表
      await dispatch(fetchOrderById(effectiveOrder.id));
      
      closeTab(tabKey);
    } catch (e: any) {
      message.error(e?.message || '请检查表单输入');
    }
  };

  return (
    <div style={{ padding: 16 }} className="page-with-fixed-footer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>索赔属性配置</Typography.Title>
      </div>
      <Form form={form} layout="vertical">
        {(() => {
          if (!effectiveOrder) {
            return <Text type="secondary">请选择一个订单后再进行索赔配置</Text>;
          }
          return (
            <React.Fragment>
              {/* 一、基本信息 */}
              <Divider orientation="left">一、基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="claimNumber" label="索赔单号">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="contractName" label="合同信息">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          {/* 二、索赔信息 */}
          <Divider orientation="left">二、索赔信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="claimDate" label="索赔日期" rules={[{ required: true, message: '请选择索赔日期' }]}> 
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="claimAmount" label="索赔金额（元）">
                <Input placeholder="请输入索赔金额（选填）" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="reason" label="索赔原因" rules={[{ required: true, message: '请填写索赔原因' }]}> 
                <Input placeholder="请输入索赔原因" />
              </Form.Item>
            </Col>
          </Row>

          {/* 三、索赔设备选择 */}
          <Divider orientation="left">三、索赔设备</Divider>
          <Form.Item shouldUpdate noStyle>
            {() => {
              const rentedCodes = (effectiveOrder.rentedEquipmentIds || []).flat();
              const rentedSet = new Set(rentedCodes);
              const rentedEquipments = (equipmentList || []).filter(e => rentedSet.has(e.code));
              const selectedCodes: string[] = form.getFieldValue('claimSelections') || [];
              
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
                      选择索赔设备
                    </Button>
                  </div>
                  
                  {selectedCodes.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        {selectedCodes.slice(0, 10).map(code => {
                          const eq = equipmentList.find(e => e.code === code);
                          return (
                            <Tag key={code} closable onClose={() => {
                              const current = form.getFieldValue('claimSelections') || [];
                              form.setFieldsValue({
                                claimSelections: current.filter((c: string) => c !== code)
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
                              form.setFieldsValue({ claimSelections: [] });
                            },
                          });
                        }}
                      >
                        清空所选
                      </Button>
                    </div>
                  )}
                  
                  <Form.Item name="claimSelections" style={{ display: 'none' }}>
                    <Input />
                  </Form.Item>
                </div>
              );
            }}
          </Form.Item>

          {/* 四、附件上传 */}
          <Divider orientation="left">四、附件上传</Divider>
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
                  <Button icon={<PlusOutlined />}>上传索赔单据</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
            </React.Fragment>
          );
        })()}
      </Form>
      
      {/* 设备选择弹窗 */}
      {effectiveOrder && pickerOpen && (
        <EquipmentPickerModal
          open={pickerOpen}
          item={{ equipmentType: '全部', height: '', quantity: 0 }}
          equipmentList={equipmentList}
          initialSelectedCodes={form.getFieldValue('claimSelections') || []}
          allowedCodes={(effectiveOrder.rentedEquipmentIds || []).flat()}
          onlyWaitingDefault={false}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(selectedCodes: string[]) => {
            form.setFieldsValue({ claimSelections: selectedCodes });
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

export default ClaimOperationTab;