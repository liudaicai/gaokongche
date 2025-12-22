/**
 * 合同续约提醒弹窗
 */
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  Modal,
  Form,
  Radio,
  DatePicker,
  InputNumber,
  Input,
  Alert,
  Space,
  Row,
  Col,
  Divider,
  App
} from 'antd';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { AppDispatch } from '../../../app/store';
import { createRenewalReminder } from '../remindersSlice';
import type { RenewalType, RenewalFormData } from '../types';

const { TextArea } = Input;

interface RenewalReminderModalProps {
  visible: boolean;
  orderId: number;
  contractNumber?: string;
  customerName?: string;
  currentExpiryDate?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const RenewalReminderModal: React.FC<RenewalReminderModalProps> = ({
  visible,
  orderId,
  contractNumber,
  customerName,
  currentExpiryDate,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const { message } = App.useApp();

  const [renewalType, setRenewalType] = useState<RenewalType>('renewal_period');
  const [loading, setLoading] = useState(false);
  const [calculatedDate, setCalculatedDate] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setRenewalType('renewal_period');
      setCalculatedDate('');
      setExpiryDate('');
    }
  }, [visible, form]);

  // 计算提醒日期
  const calculateDates = (startDate: Dayjs | null, months: number | null, advanceDays: number) => {
    if (!startDate || !months) {
      setCalculatedDate('');
      setExpiryDate('');
      return;
    }

    // 计算到期日期
    const expiry = startDate.add(months, 'month');
    setExpiryDate(expiry.format('YYYY-MM-DD'));

    // 计算提醒日期
    const reminder = expiry.subtract(advanceDays, 'day');
    setCalculatedDate(reminder.format('YYYY-MM-DD'));
  };

  // 监听表单字段变化
  const handleFieldsChange = () => {
    if (renewalType === 'renewal_period') {
      const startDate = form.getFieldValue('renewalStartDate');
      const months = form.getFieldValue('renewalPeriodMonths');
      const advanceDays = form.getFieldValue('advanceDays') || 7;
      
      calculateDates(startDate, months, advanceDays);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const data: RenewalFormData = {
        renewalType,
        advanceDays: values.advanceDays || 7,
        note: values.note
      };

      if (renewalType === 'specific_date') {
        data.nextReminderDate = values.nextReminderDate.format('YYYY-MM-DD');
      } else {
        data.renewalPeriodMonths = values.renewalPeriodMonths;
        data.renewalStartDate = values.renewalStartDate.format('YYYY-MM-DD');
      }

      await dispatch(createRenewalReminder({ orderId, data })).unwrap();
      message.success('续约提醒设置成功');
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '设置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="合同续约提醒设置"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={700}
      destroyOnHidden
    >
      {/* 合同信息 */}
      <Alert
        message="合同信息"
        description={
          <Space direction="vertical" size="small">
            {contractNumber && <div>合同编号：{contractNumber}</div>}
            {customerName && <div>客户名称：{customerName}</div>}
            {currentExpiryDate && <div>当前到期日：{currentExpiryDate}</div>}
          </Space>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFieldsChange={handleFieldsChange}
        initialValues={{
          renewalType: 'renewal_period',
          advanceDays: 7
        }}
      >
        {/* 续约模式选择 */}
        <Form.Item label="续约模式">
          <Radio.Group
            value={renewalType}
            onChange={(e) => {
              setRenewalType(e.target.value);
              setCalculatedDate('');
              setExpiryDate('');
              form.resetFields(['nextReminderDate', 'renewalPeriodMonths', 'renewalStartDate']);
            }}
          >
            <Space direction="vertical">
              <Radio value="specific_date">
                <Space>
                  <CalendarOutlined />
                  指定日期 - 直接指定下次提醒日期
                </Space>
              </Radio>
              <Radio value="renewal_period">
                <Space>
                  <ClockCircleOutlined />
                  续约期限 - 输入续约期限，自动计算提醒日期
                </Space>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Divider />

        {/* 指定日期模式 */}
        {renewalType === 'specific_date' && (
          <Form.Item
            label="下次提醒日期"
            name="nextReminderDate"
            rules={[{ required: true, message: '请选择提醒日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="选择提醒日期"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        )}

        {/* 续约期限模式 */}
        {renewalType === 'renewal_period' && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="续约期限"
                  name="renewalPeriodMonths"
                  rules={[{ required: true, message: '请选择续约期限' }]}
                >
                  <InputNumber
                    min={1}
                    max={36}
                    style={{ width: '100%' }}
                    placeholder="请输入月数"
                    addonAfter="个月"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="续约开始日期"
                  name="renewalStartDate"
                  rules={[{ required: true, message: '请选择开始日期' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder="选择开始日期"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="提前天数"
              name="advanceDays"
              tooltip="在到期前多少天提醒"
            >
              <InputNumber
                min={1}
                max={90}
                style={{ width: '100%' }}
                addonAfter="天"
              />
            </Form.Item>

            {/* 计算结果显示 */}
            {expiryDate && calculatedDate && (
              <Alert
                message="自动计算结果"
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <strong>合同到期日期：</strong>
                      <span style={{ color: '#1890ff', marginLeft: 8 }}>{expiryDate}</span>
                    </div>
                    <div>
                      <strong>提醒触发日期：</strong>
                      <span style={{ color: '#52c41a', marginLeft: 8 }}>{calculatedDate}</span>
                    </div>
                  </Space>
                }
                type="success"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </>
        )}

        {/* 备注 */}
        <Form.Item label="备注" name="note">
          <TextArea
            rows={3}
            placeholder="如：客户要求续约6个月，需提前联系确认..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RenewalReminderModal;

