import React, { useState } from 'react';
import {
  Modal,
  Form,
  DatePicker,
  Input,
  Descriptions,
  Statistic,
  message
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { apiPut } from '../../api/client';
import type { OrderSuspension, EndSuspensionData } from './types';

const { TextArea } = Input;

interface EndSuspensionModalProps {
  visible: boolean;
  suspension: OrderSuspension;
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const EndSuspensionModal: React.FC<EndSuspensionModalProps> = ({
  visible,
  suspension,
  orderId,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [suspensionDays, setSuspensionDays] = useState(0);

  const handleDateChange = (date: Dayjs | null) => {
    setEndDate(date);
    if (date && suspension.startDate) {
      const start = dayjs(suspension.startDate);
      const days = date.diff(start, 'day') + 1;
      setSuspensionDays(Math.max(0, days));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: EndSuspensionData = {
        endDate: values.endDate.format('YYYY-MM-DD'),
        notes: values.notes
      };

      await apiPut(`/orders/${orderId}/suspensions/${suspension.id}/end`, data);
      message.success('报停已结束');
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

  React.useEffect(() => {
    handleDateChange(dayjs());
  }, []);

  return (
    <Modal
      title="结束报停"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={600}
      destroyOnClose={true}
    >
      {/* 报停信息 */}
      <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="设备">
          {suspension.equipmentCode || '整个订单'}
        </Descriptions.Item>
        <Descriptions.Item label="报停类型">
          {suspension.suspensionType}
        </Descriptions.Item>
        <Descriptions.Item label="开始日期">
          {dayjs(suspension.startDate).format('YYYY-MM-DD')}
        </Descriptions.Item>
        <Descriptions.Item label="计费方式">
          {suspension.isChargeFree ? '免费' : `${suspension.discountRate}%折扣`}
        </Descriptions.Item>
      </Descriptions>

      {/* 统计信息 */}
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <Statistic
          title="预计报停天数"
          value={suspensionDays}
          suffix="天"
          valueStyle={{ color: '#3f8600', fontSize: 32 }}
        />
      </div>

      {/* 结束表单 */}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          endDate: dayjs()
        }}
      >
        <Form.Item
          name="endDate"
          label="结束日期"
          rules={[
            { required: true, message: '请选择结束日期' },
            {
              validator: (_, value) => {
                if (!value) {
                  return Promise.resolve();
                }
                const start = dayjs(suspension.startDate);
                if (value.isBefore(start, 'day')) {
                  return Promise.reject(new Error('结束日期不能早于开始日期'));
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            onChange={handleDateChange}
            disabledDate={(current) => {
              const start = dayjs(suspension.startDate);
              return current && current.isBefore(start, 'day');
            }}
          />
        </Form.Item>

        <Form.Item name="notes" label="备注">
          <TextArea
            rows={3}
            placeholder="请输入备注信息（选填）"
            maxLength={200}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EndSuspensionModal;

