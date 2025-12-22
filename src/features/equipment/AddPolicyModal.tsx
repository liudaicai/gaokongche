import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, Upload, Button, message, Tag, Space } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { apiGet, apiPost, apiPut, getAuthHeaders } from '../../api/client';
import DeviceSelectModal from './DeviceSelectModal';
type DeviceRow = { id: string; code: string; customCode?: string };

type Props = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'update';
  policyId?: number;
};

export default function AddPolicyModal({ open, onCancel, onSuccess, mode = 'create', policyId }: Props) {
  const [form] = Form.useForm();
  const [uploadFiles, setUploadFiles] = useState<UploadFile<any>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<DeviceRow[]>([]);

  // 设备选择弹窗仅在用户明确点击"选择设备"按钮时打开

  // 更新模式：加载详情并回填
  useEffect(() => {
    (async () => {
      if (open && mode === 'update' && policyId) {
        try {
          const d: any = await apiGet(`/policies/${policyId}`);
          form.setFieldsValue({
            number: d.number,
            company: d.company,
            rate: Number(d.rate),
            dateRange: [dayjs(d.startDate, 'YYYY-MM-DD'), dayjs(d.endDate, 'YYYY-MM-DD')],
          });
          const ids = (d.equipments || []).map((e: any) => String(e.id));
          setSelectedDeviceIds(ids);
          form.setFieldsValue({ equipmentIds: ids });
        } catch (err: any) {
          message.error(err?.message || '加载保单详情失败');
        }
      }
    })();
  }, [open, mode, policyId]);

  const handleDeviceConfirm = (devices: DeviceRow[]) => {
    const ids = devices.map(d => String(d.id));
    setSelectedDeviceIds(ids);
    setSelectedDevices(devices);
    form.setFieldsValue({ equipmentIds: ids });
    setDeviceModalOpen(false);
    message.success(`已选择 ${ids.length} 台设备`);
  };

  // const disabledDate = (current: dayjs.Dayjs) => {
  //   // 结束日期不能早于当前日期（对于范围选择，限制结束选择）
  //   return false; // 由表单校验统一处理逻辑
  // };

  const beforeUpload = (file: File) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];
    const okType = allowed.includes(file.type);
    const okSize = file.size <= 10 * 1024 * 1024;
    if (!okType) message.error('仅支持PDF/Word/图片格式');
    if (!okSize) message.error('单个文件不能超过10MB');
    return okType && okSize;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [start, end] = values.dateRange || [];
      const startDate = dayjs(start).format('YYYY-MM-DD');
      const endDate = dayjs(end).format('YYYY-MM-DD');
      const today = dayjs().format('YYYY-MM-DD');
      if (dayjs(startDate).isAfter(dayjs(endDate))) {
        return message.error('开始日期不能晚于结束日期');
      }
      if (dayjs(endDate).isBefore(dayjs(today))) {
        return message.error('结束日期不能早于当前日期');
      }
      setSubmitting(true);
      const payload = {
        number: values.number,
        company: values.company,
        rate: Number(values.rate),
        startDate,
        endDate,
        equipmentIds: (values.equipmentIds || []).map((v: string) => Number(v)),
      };
      const resp: any = mode === 'update' && policyId
        ? await apiPut(`/policies/${policyId}`, payload)
        : await apiPost('/policies', payload);
      const id = String(resp?.id || resp?.data?.id || resp);
      // 上传附件（逐个）
      for (const uf of uploadFiles) {
        const f = uf.originFileObj as File;
        if (!f) continue;
        const fd = new FormData();
        fd.append('file', f);
        const res = await fetch(`${import.meta.env.VITE_API_BASE || '/api'}/policies/${id}/attachments`, {
          method: 'POST',
          body: fd,
          headers: { ...getAuthHeaders() },
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || (j && j.ok === false)) {
          throw new Error(j?.error || '附件上传失败');
        }
      }
      message.success(mode === 'update' ? '保单更新成功' : '保单新增成功');
      onSuccess?.();
      form.resetFields();
      setUploadFiles([]);
    } catch (err: any) {
      const msg = String(err?.message || '保单新增失败');
      if (msg.includes('409') || msg.includes('已存在') || msg.includes('编号')) {
        message.error('保单编号已存在，请更换');
      } else {
        message.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="新增设备保单"
      onCancel={onCancel}
      onOk={handleSubmit}
      okButtonProps={{ loading: submitting }}
      destroyOnHidden
      width={720}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="number"
          label="保单编号"
          rules={[{ required: true, message: '请输入保单编号' }]}
        >
          <Input allowClear placeholder="唯一编号，必填" />
        </Form.Item>
        <Form.Item
          name="company"
          label="投保公司"
          rules={[{ required: true, message: '请输入投保公司' }]}
        >
          <Input allowClear placeholder="支持模糊输入" />
        </Form.Item>

        <Form.Item
          name="rate"
          label="费率(%)"
          rules={[{ required: true, message: '请输入费率' }]}
        >
          <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} placeholder="0-100，保留两位小数" />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="保单起止日期"
          rules={[{ required: true, message: '请选择起止日期' }]}
        >
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="equipmentIds"
          label="投保设备"
          rules={[{ required: true, message: '请选择投保设备' }]}
        >
          <div>
            <Space style={{ marginBottom: 8 }}>
              <Button onClick={() => setDeviceModalOpen(true)}>选择设备</Button>
              {selectedDeviceIds.length > 0 && <Tag color="blue">已选 {selectedDeviceIds.length} 台</Tag>}
            </Space>
            {selectedDevices.length > 0 && (
              <Space wrap>
                {selectedDevices.map(dev => (
                  <Tag
                    key={dev.id}
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      const ids = selectedDeviceIds.filter(id => id !== dev.id);
                      const list = selectedDevices.filter(d => d.id !== dev.id);
                      setSelectedDeviceIds(ids);
                      setSelectedDevices(list);
                      form.setFieldsValue({ equipmentIds: ids });
                    }}
                    color="geekblue"
                  >{`${dev.customCode || '-'} | ${dev.code}`}</Tag>
                ))}
              </Space>
            )}
          </div>
        </Form.Item>

        <Form.Item label="附件上传">
          <Upload
            multiple
            fileList={uploadFiles}
            beforeUpload={beforeUpload}
            onRemove={(file) => {
              setUploadFiles(prev => prev.filter(f => f.uid !== file.uid));
            }}
            customRequest={({ file, onSuccess }) => {
              // 先缓存到本地，提交成功后统一上传
              setUploadFiles(prev => [...prev, file as UploadFile]);
              setTimeout(() => onSuccess && onSuccess({}, file as any), 0);
            }}
          >
            <Button>选择文件（PDF/Word/图片，≤10MB）</Button>
          </Upload>
        </Form.Item>
      </Form>

      <DeviceSelectModal
        open={deviceModalOpen}
        onCancel={() => setDeviceModalOpen(false)}
        onConfirm={handleDeviceConfirm}
        initialSelectedIds={selectedDeviceIds}
      />
    </Modal>
  );
}