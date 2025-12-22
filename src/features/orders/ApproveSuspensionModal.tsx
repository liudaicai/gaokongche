import React, { useState } from 'react';
import {
  Modal,
  Form,
  Radio,
  InputNumber,
  Input,
  Descriptions,
  Alert,
  message,
  Tag
} from 'antd';
import dayjs from 'dayjs';
import { apiPut } from '../../api/client';
import type { OrderSuspension, ApproveSuspensionData } from './types';

const { TextArea } = Input;

interface ApproveSuspensionModalProps {
  visible: boolean;
  suspension: OrderSuspension;
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ApproveSuspensionModal: React.FC<ApproveSuspensionModalProps> = ({
  visible,
  suspension,
  orderId,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'rejected'>('approved');

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: ApproveSuspensionData = {
        status: values.status,
        isChargeFree: values.status === 'approved' ? values.isChargeFree : undefined,
        discountRate: values.status === 'approved' ? values.discountRate : undefined,
        notes: values.notes
      };

      await apiPut(`/orders/${orderId}/suspensions/${suspension.id}/approve`, data);
      message.success(values.status === 'approved' ? '报停已批准' : '报停已拒绝');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const getSuspensionTypeText = (type: string) => {
    const types: Record<string, string> = {
      weather: '天气原因',
      site_stop: '工地停工',
      maintenance: '设备维修',
      customer_request: '客户要求'
    };
    return types[type] || type;
  };

  const calculateDays = () => {
    if (!suspension.startDate || !suspension.endDate) {
      return '-';
    }
    const start = dayjs(suspension.startDate);
    const end = dayjs(suspension.endDate);
    return end.diff(start, 'day') + 1;
  };

  return (
    <Modal
      title="审批报停申请"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={700}
      destroyOnClose={true}
    >
      {/* 报停信息 */}
      <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="报停类型">
          {getSuspensionTypeText(suspension.suspensionType)}
        </Descriptions.Item>
        <Descriptions.Item label="设备">
          {suspension.equipmentCode || <Tag>整个订单</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="开始日期">
          {dayjs(suspension.startDate).format('YYYY-MM-DD')}
        </Descriptions.Item>
        <Descriptions.Item label="结束日期">
          {suspension.endDate ? dayjs(suspension.endDate).format('YYYY-MM-DD') : '未定'}
        </Descriptions.Item>
        <Descriptions.Item label="报停天数">
          {calculateDays()}天
        </Descriptions.Item>
        <Descriptions.Item label="申请人">
          {suspension.creatorName || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="报停原因" span={2}>
          {suspension.reason || '-'}
        </Descriptions.Item>
      </Descriptions>

      {/* 审批表单 */}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'approved',
          isChargeFree: suspension.isChargeFree,
          discountRate: suspension.discountRate || 100
        }}
      >
        <Form.Item
          name="status"
          label="审批结果"
          rules={[{ required: true, message: '请选择审批结果' }]}
        >
          <Radio.Group onChange={(e) => setApprovalStatus(e.target.value)}>
            <Radio.Button value="approved">批准</Radio.Button>
            <Radio.Button value="rejected">拒绝</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {approvalStatus === 'approved' && (
          <>
            <Form.Item
              name="isChargeFree"
              label="计费方式"
              rules={[{ required: true, message: '请选择计费方式' }]}
            >
              <Radio.Group>
                <Radio value={true}>免费报停</Radio>
                <Radio value={false}>折扣计费</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.isChargeFree !== currentValues.isChargeFree
              }
            >
              {({ getFieldValue }) =>
                !getFieldValue('isChargeFree') && (
                  <Form.Item
                    name="discountRate"
                    label="折扣率"
                    rules={[
                      { required: true, message: '请输入折扣率' },
                      {
                        type: 'number',
                        min: 0,
                        max: 100,
                        message: '折扣率必须在0-100之间'
                      }
                    ]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      precision={0}
                      suffix="%"
                      style={{ width: '100%' }}
                      placeholder="例如：50表示按50%计费"
                    />
                  </Form.Item>
                )
              }
            </Form.Item>

            <Alert
              message="计费说明"
              description={
                <>
                  <p>• 免费报停：报停期间不计费</p>
                  <p>• 折扣计费：按正常租金的指定比例计费</p>
                  <p>
                    • 例如：折扣率50%，日租金200元/天，则报停期间按100元/天计费
                  </p>
                </>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        <Form.Item name="notes" label="审批备注">
          <TextArea
            rows={3}
            placeholder="请输入审批意见或备注（选填）"
            maxLength={200}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ApproveSuspensionModal;

