import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, message, Radio, Checkbox, Alert } from 'antd';
import { apiGet, apiPost } from '../../api/client';

const { TextArea } = Input;
const { Option } = Select;

interface EquipmentReplacementModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: any;
  currentEquipmentId: number | string; // 🆕 支持ID或设备编号
}

interface Equipment {
  id: number;
  code: string;
  customCode?: string; // 🆕 自编码
  model: string;
  brand: string;
  height: number;
  status: string;
}

const EquipmentReplacementModal: React.FC<EquipmentReplacementModalProps> = ({
  visible,
  onClose,
  onSuccess,
  order,
  currentEquipmentId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [availableEquipments, setAvailableEquipments] = useState<Equipment[]>([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [allowDifferentHeight, setAllowDifferentHeight] = useState(false);

  // 加载可用设备
  useEffect(() => {
    if (visible) {
      // 重置状态
      setAllowDifferentHeight(false);
      loadAvailableEquipments();
      // 重置表单
      form.resetFields();
      form.setFieldsValue({
        responsibility_party: 'company',
        transport_fee_payer: 'company',
        transport_fee: 0,
      });
    }
  }, [visible]);

  const loadAvailableEquipments = async () => {
    try {
      setLoadingEquipments(true);
      // 🔧 后端 status 参数会查询 rental_status 字段
      // rental_status='available' 或 'idle' 表示待租状态
      const response: any = await apiGet('/equipments?status=available&limit=1000');

      console.log('[换机] API响应类型:', typeof response, Array.isArray(response));
      console.log('[换机] 可用设备数量:', Array.isArray(response) ? response.length : 0);
      console.log('[换机] 前3台设备:', Array.isArray(response) ? response.slice(0, 3) : response);

      // 🔧 修复：apiGet 自动提取 data，response 直接就是设备数组
      const equipments = Array.isArray(response) ? response : [];
      setAvailableEquipments(equipments);

      // 🆕 智能检测：如果原设备有高度，检查是否有相同高度的设备
      const current = findCurrentEquipment();
      if (current && current.height) {
        const sameHeightCount = equipments.filter(
          (eq: Equipment) => String(eq.height) === String(current.height)
        ).length;
        
        console.log('[换机] 原设备高度:', current.height);
        console.log('[换机] 相同高度设备数量:', sameHeightCount);
        
        // 如果没有相同高度的设备，自动允许跨高度换机
        if (sameHeightCount === 0 && equipments.length > 0) {
          setAllowDifferentHeight(true);
          message.warning('没有相同高度的可用设备，已自动允许选择其他高度');
        }
      }
    } catch (error: any) {
      console.error('[换机] 加载可用设备失败:', error);
      message.error(error.message || '加载可用设备失败');
    } finally {
      setLoadingEquipments(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        order_id: order.id,
        old_equipment_id: currentEquipmentId,
        new_equipment_id: values.new_equipment_id,
        reason: values.reason,
        responsibility_party: values.responsibility_party,
        transport_fee: values.transport_fee || 0,
        transport_fee_payer: values.transport_fee_payer,
        remarks: values.remarks || '',
      };

      await apiPost('/equipment-replacements', payload);

      message.success('换机申请已提交，等待审核');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请填写完整信息');
      } else {
        message.error(error.message || '提交失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取当前设备信息
  // 🆕 支持从进场记录的 equipmentDetails 中查找设备（通过编号或ID）
  const findCurrentEquipment = () => {
    // 优先从 order.equipments 查找（如果有的话）
    if (order.equipments) {
      const found = order.equipments.find((eq: any) => 
        eq.id === currentEquipmentId || eq.code === currentEquipmentId
      );
      if (found) return found;
    }
    
    // 从进场记录的 equipmentDetails 中查找
    if (order.entries && Array.isArray(order.entries)) {
      for (const entry of order.entries) {
        if (entry.equipmentDetails && Array.isArray(entry.equipmentDetails)) {
          const found = entry.equipmentDetails.find((detail: any) => 
            detail.code === currentEquipmentId || detail.id === currentEquipmentId
          );
          if (found) return found;
        }
      }
    }
    
    return null;
  };
  
  const currentEquipment = findCurrentEquipment();

  // 🆕 根据"允许不同高度"选项过滤设备列表
  const filteredEquipments = availableEquipments.filter((eq: Equipment) => {
    // 如果允许不同高度，显示所有设备
    if (allowDifferentHeight) return true;
    
    // 否则只显示相同高度的设备
    if (!currentEquipment || !currentEquipment.height) return true;
    return String(eq.height) === String(currentEquipment.height);
  });

  // 统计信息
  const sameHeightCount = currentEquipment && currentEquipment.height
    ? availableEquipments.filter((eq: Equipment) => String(eq.height) === String(currentEquipment.height)).length
    : availableEquipments.length;
  const totalCount = availableEquipments.length;

  return (
    <Modal
      title="设备更换申请"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose={true}
    >
      <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>订单信息：</strong>
          <span style={{ marginLeft: 8 }}>{order.order_number}</span>
          <span style={{ marginLeft: 16 }}>{order.customer_name}</span>
        </div>
        {currentEquipment && (
          <div>
            <strong>原设备：</strong>
            <span style={{ marginLeft: 8 }}>
              {currentEquipment.customCode || currentEquipment.code} - {currentEquipment.model} - {currentEquipment.height}米
            </span>
          </div>
        )}
      </div>

      {/* 设备筛选提示 */}
      {currentEquipment && currentEquipment.height && (
        <Alert
          message={
            allowDifferentHeight
              ? `已允许选择不同高度的设备（原设备：${currentEquipment.height}米，可选：${totalCount}台）`
              : `优先选择相同高度的设备（${currentEquipment.height}米，可选：${sameHeightCount}台）`
          }
          type={sameHeightCount === 0 ? 'warning' : 'info'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          responsibility_party: 'company',
          transport_fee_payer: 'company',
          transport_fee: 0,
        }}
      >
        <Form.Item
          name="new_equipment_id"
          label={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>选择新设备</span>
              {currentEquipment && currentEquipment.height && sameHeightCount > 0 && (
                <Checkbox
                  checked={allowDifferentHeight}
                  onChange={(e) => {
                    setAllowDifferentHeight(e.target.checked);
                    // 清空已选择的设备
                    form.setFieldsValue({ new_equipment_id: undefined });
                  }}
                >
                  允许选择不同高度
                </Checkbox>
              )}
            </div>
          }
          rules={[{ required: true, message: '请选择新设备' }]}
        >
          <Select
            placeholder={
              filteredEquipments.length === 0
                ? '暂无可用设备'
                : `请选择可用设备（共${filteredEquipments.length}台）`
            }
            loading={loadingEquipments}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={filteredEquipments.map((eq: Equipment) => {
              // 🔧 优先显示自编码，如果没有则显示设备编码
              const displayCode = eq.customCode || eq.code;
              return {
                value: eq.id,
                label: `${displayCode} - ${eq.model} - ${eq.brand} - ${eq.height}米`,
                disabled: eq.id === currentEquipmentId,
              };
            })}
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="更换原因"
          rules={[
            { required: true, message: '请输入更换原因' },
            { max: 500, message: '更换原因最多500字' },
          ]}
        >
          <TextArea
            rows={3}
            placeholder="请详细说明设备需要更换的原因，如：设备故障需要维修，客户着急使用等"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="responsibility_party"
          label="责任方"
          rules={[{ required: true, message: '请选择责任方' }]}
        >
          <Radio.Group>
            <Radio value="company">我方责任</Radio>
            <Radio value="customer">客户责任</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="transport_fee_payer"
          label="运输费用承担方"
          rules={[{ required: true, message: '请选择运输费用承担方' }]}
        >
          <Radio.Group>
            <Radio value="company">我方承担</Radio>
            <Radio value="customer">客户承担</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="transport_fee"
          label="运输费用（元）"
          rules={[{ required: true, message: '请输入运输费用' }]}
        >
          <InputNumber
            min={0}
            precision={2}
            style={{ width: '100%' }}
            placeholder="请输入运输费用"
          />
        </Form.Item>

        <Form.Item name="remarks" label="备注">
          <TextArea rows={2} placeholder="其他备注信息（选填）" maxLength={500} showCount />
        </Form.Item>
      </Form>

      <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
        <div style={{ color: '#fa8c16', marginBottom: 8 }}>
          <strong>⚠️ 温馨提示：</strong>
        </div>
        <div style={{ fontSize: 12, color: '#666', lineHeight: '20px' }}>
          <div>1. <strong>优先选择相同高度的设备</strong>，避免客户不满</div>
          <div>2. 新设备租金将保持与原设备相同，即使高度不同</div>
          <div>3. 租期与原设备一致，不会重新计算</div>
          <div>4. 运输费用另计，根据责任方承担</div>
          <div>5. 提交后需等待管理员审核通过才能完成换机</div>
          <div>6. 审核通过后，原设备退回仓库，新设备自动进场</div>
        </div>
      </div>
    </Modal>
  );
};

export default EquipmentReplacementModal;
