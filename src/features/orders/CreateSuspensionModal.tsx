import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Upload,
  Button,
  Alert,
  message
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiPost } from '../../api/client';
import type { CreateSuspensionData } from './types';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface CreateSuspensionModalProps {
  visible: boolean;
  orderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CreateSuspensionModal: React.FC<CreateSuspensionModalProps> = ({
  visible,
  orderId,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [suspensionType, setSuspensionType] = useState<string>('');

  const suspensionTypes = [
    {
      value: 'weather',
      label: '天气原因',
      description: '默认免费，最长7天，需要提供天气证明'
    },
    {
      value: 'site_stop',
      label: '工地停工',
      description: '需要审批，最长30天，需要提供停工证明'
    },
    {
      value: 'maintenance',
      label: '设备维修',
      description: '需要审批，我方责任免费'
    },
    {
      value: 'customer_request',
      label: '客户要求',
      description: '需要审批，默认50%计费，最短3天'
    }
  ];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: CreateSuspensionData = {
        equipmentId: values.equipmentId,
        suspensionType: values.suspensionType,
        reason: values.reason,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1] ? values.dateRange[1].format('YYYY-MM-DD') : undefined,
        attachments: values.attachments?.map((file: any) => file.response?.url || file.url) || []
      };

      await apiPost(`/orders/${orderId}/suspensions`, data);
      message.success('报停申请已提交');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(error.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = suspensionTypes.find(t => t.value === suspensionType);

  return (
    <Modal
      title="创建报停申请"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={600}
      destroyOnClose={true}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          suspensionType: 'weather'
        }}
      >
        <Form.Item
          name="suspensionType"
          label="报停类型"
          rules={[{ required: true, message: '请选择报停类型' }]}
        >
          <Select
            options={suspensionTypes.map(t => ({
              label: t.label,
              value: t.value
            }))}
            onChange={(value) => setSuspensionType(value)}
          />
        </Form.Item>

        {selectedType && (
          <Alert
            message={selectedType.description}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          name="equipmentId"
          label="报停范围"
          tooltip="不选择设备表示整个订单报停"
        >
          <Select
            placeholder="选择设备（不选表示整个订单）"
            allowClear
            // TODO: 从订单获取设备列表
            options={[]}
          />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="报停时间"
          rules={[{ required: true, message: '请选择报停时间' }]}
        >
          <RangePicker
            style={{ width: '100%' }}
            placeholder={['开始日期', '结束日期（可选）']}
            disabledDate={(current) => {
              // 不能选择过去的日期
              return current && current < dayjs().startOf('day');
            }}
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="报停原因"
          rules={[{ required: true, message: '请输入报停原因' }]}
        >
          <TextArea
            rows={4}
            placeholder="请详细说明报停原因"
            maxLength={500}
            showCount
          />
        </Form.Item>

        {['weather', 'site_stop'].includes(suspensionType) && (
          <Form.Item
            name="attachments"
            label="证明文件"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
            rules={[{ required: true, message: '请上传证明文件' }]}
          >
            <Upload
              action="/api/upload"
              listType="text"
              maxCount={5}
            >
              <Button icon={<PlusOutlined />}>上传证明文件</Button>
            </Upload>
          </Form.Item>
        )}

        <Alert
          message="提示"
          description={
            suspensionType === 'weather'
              ? '天气原因报停通常会自动批准，报停期间免费。'
              : '您的报停申请将提交给管理员审批，请耐心等待。'
          }
          type="warning"
          showIcon
        />
      </Form>
    </Modal>
  );
};

export default CreateSuspensionModal;

