/**
 * 保单管理组件
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Upload,
  Dropdown,
  Popover,
  Typography
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  MoreOutlined,
  PaperClipOutlined,
  EyeOutlined
} from '@ant-design/icons';

const { Text } = Typography;
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  selectPolicies,
  selectPoliciesLoading,
  selectPoliciesPagination
} from '../policiesSlice';
import type { Policy, PolicyFormData } from '../types';
import DeviceSelectModal from './DeviceSelectModal';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const PolicyManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const policies = useAppSelector(selectPolicies);
  const loading = useAppSelector(selectPoliciesLoading);
  const pagination = useAppSelector(selectPoliciesPagination);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<Policy | null>(null);
  const [isDeviceModalVisible, setIsDeviceModalVisible] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const [form] = Form.useForm();

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = () => {
    dispatch(fetchPolicies({ page: pagination.page, pageSize: pagination.pageSize }));
  };

  // 获取保单状态
  const getPolicyStatus = (startDate: string, endDate: string) => {
    const today = dayjs();
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (today.isBefore(start) || today.isAfter(end)) {
      return { status: 'expired', text: '已过期', color: 'red' };
    }

    const daysToExpire = end.diff(today, 'day');
    if (daysToExpire <= 7) {
      return { status: 'expiring', text: '即将到期', color: 'orange' };
    }

    return { status: 'valid', text: '有效期内', color: 'green' };
  };

  // 打开新增保单弹窗
  const handleAdd = () => {
    setIsEditing(false);
    setCurrentPolicy(null);
    setSelectedDeviceIds([]);
    setFileList([]);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 打开编辑保单弹窗
  const handleEdit = (record: Policy) => {
    setIsEditing(true);
    setCurrentPolicy(record);

    // 设置表单值
    form.setFieldsValue({
      number: record.number,
      company: record.company,
      rate: record.rate,
      dateRange: [dayjs(record.start_date), dayjs(record.end_date)]
    });

    // 设置已选设备
    const deviceIds = record.equipments?.map(e => String(e.equipment_id)) || [];
    setSelectedDeviceIds(deviceIds);

    setIsModalVisible(true);
  };

  // 删除保单
  const handleDelete = async (id: string | number) => {
    try {
      await dispatch(deletePolicy(id)).unwrap();
      message.success('删除成功');
      loadPolicies();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      console.log('[PolicyManagement] Form values:', values);
      console.log('[PolicyManagement] Selected devices:', selectedDeviceIds);
      console.log('[PolicyManagement] File list:', fileList);

      // 创建FormData上传文件
      const formData = new FormData();
      formData.append('number', values.number);
      formData.append('company', values.company);
      formData.append('rate', values.rate.toString());
      formData.append('start_date', values.dateRange[0].format('YYYY-MM-DD'));
      formData.append('end_date', values.dateRange[1].format('YYYY-MM-DD'));

      selectedDeviceIds.forEach(id => {
        formData.append('equipment_ids[]', id);
      });

      // 添加附件
      fileList.forEach(file => {
        if (file.originFileObj) {
          formData.append('attachments', file.originFileObj);
        }
      });

      // 打印FormData内容（用于调试）
      console.log('[PolicyManagement] FormData entries:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const token = localStorage.getItem('auth_token');
      const url = isEditing && currentPolicy
        ? `/api/policies/${currentPolicy.id}`
        : '/api/policies';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      console.log('[PolicyManagement] Response:', result);

      if (result.ok || response.ok) {
        message.success(isEditing ? '更新成功' : '创建成功');
        setIsModalVisible(false);
        loadPolicies();
      } else {
        throw new Error(result.error || '操作失败');
      }
    } catch (error: any) {
      console.error('[PolicyManagement] Submit error:', error);
      message.error(error.message || '操作失败');
    }
  };

  // 打开设备选择弹窗
  const handleSelectDevices = () => {
    setIsDeviceModalVisible(true);
  };

  // 确认选择设备
  const handleDeviceConfirm = (devices: any[]) => {
    const deviceIds = devices.map(d => String(d.id));
    setSelectedDeviceIds(deviceIds);
    setIsDeviceModalVisible(false);
    message.success(`已选择 ${devices.length} 台设备`);
  };

  // 下载保单附件
  const handleDownloadAttachment = async (policyId: string | number, attachmentId: string | number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/policies/${policyId}/attachments/${attachmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('下载失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `保单附件_${attachmentId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('下载成功');
    } catch (error: any) {
      message.error(error.message || '下载失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      title: '保单编号',
      dataIndex: 'number',
      key: 'number',
      width: 140,
      ellipsis: true
    },
    {
      title: '投保公司',
      dataIndex: 'company',
      key: 'company',
      width: 150,
      ellipsis: true
    },
    {
      title: '费率',
      dataIndex: 'rate',
      key: 'rate',
      width: 80,
      render: (rate: number) => `${rate}%`
    },
    {
      title: '保单起始日期',
      key: 'dates',
      width: 220,
      render: (_: any, record: Policy) => {
        const statusConfig = getPolicyStatus(record.start_date, record.end_date);
        return (
          <Space direction="vertical" size={0}>
            <div style={{ fontSize: '12px' }}>
              {dayjs(record.start_date).format('YYYY-MM-DD')} ~ {dayjs(record.end_date).format('YYYY-MM-DD')}
            </div>
            <Tag color={statusConfig.color} style={{ fontSize: '11px' }}>{statusConfig.text}</Tag>
          </Space>
        );
      }
    },
    {
      title: '投保设备',
      key: 'equipment_codes',
      width: 220,
      render: (_: any, record: Policy) => {
        const equipments = record.equipments || [];
        
        if (equipments.length === 0) {
          return <span style={{ color: '#999' }}>无</span>;
        }

        // 显示策略：显示前3台设备，超过3台显示"+N台"
        const displayCount = 3;
        const displayEquipments = equipments.slice(0, displayCount);
        const remainingCount = equipments.length - displayCount;

        // Popover内容：完整设备列表
        const popoverContent = (
          <div style={{ maxWidth: 400, maxHeight: 300, overflow: 'auto' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {equipments.map((eq, index) => (
                <div 
                  key={index} 
                  style={{ 
                    padding: '4px 8px', 
                    background: '#f5f5f5', 
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <Space size="small">
                    <Text strong style={{ minWidth: 40 }}>{index + 1}.</Text>
                    <Text>{eq.custom_code || eq.code || '-'}</Text>
                    {eq.brand && <Text type="secondary">({eq.brand} {eq.model})</Text>}
                  </Space>
                </div>
              ))}
            </Space>
          </div>
        );

        // 如果设备数量 <= 3台，直接显示
        if (equipments.length <= displayCount) {
          return (
            <Space size={4} wrap>
              {displayEquipments.map((eq, index) => (
                <Tag key={index} color="blue">
                  {eq.custom_code || eq.code}
                </Tag>
              ))}
            </Space>
          );
        }

        // 如果设备数量 > 3台，显示前3台 + Popover
        return (
          <Space size={4} wrap>
            {displayEquipments.map((eq, index) => (
              <Tag key={index} color="blue">
                {eq.custom_code || eq.code}
              </Tag>
            ))}
            <Popover
              content={popoverContent}
              title={`共 ${equipments.length} 台投保设备`}
              trigger="hover"
              placement="right"
            >
              <Tag 
                color="orange" 
                style={{ cursor: 'pointer' }}
                icon={<EyeOutlined />}
              >
                +{remainingCount}台
              </Tag>
            </Popover>
          </Space>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: Policy) => {
        const items = [
          {
            key: 'edit',
            label: '修改',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record)
          },
          {
            key: 'download',
            label: '下载附件',
            icon: <DownloadOutlined />,
            disabled: !record.attachments || record.attachments.length === 0,
            onClick: () => {
              if (record.attachments && record.attachments.length > 0) {
                // 如果有多个附件，下载第一个
                handleDownloadAttachment(record.id, record.attachments[0].id);
              }
            }
          },
          {
            type: 'divider' as const
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '确定删除此保单吗？',
                content: '删除后不可恢复',
                okText: '确定',
                cancelText: '取消',
                okButtonProps: { danger: true },
                onOk: () => handleDelete(record.id)
              });
            }
          }
        ];

        return (
          <Dropdown
            menu={{ items }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button size="small">操作</Button>
          </Dropdown>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增保单
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={policies}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true
          }}
        />
      </Card>

      {/* 新增/编辑保单弹窗 */}
      <Modal
        title={isEditing ? '编辑保单' : '新增保单'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="保单编号"
            name="number"
            rules={[{ required: true, message: '请输入保单编号' }]}
          >
            <Input placeholder="请输入保单编号" />
          </Form.Item>

          <Form.Item
            label="投保公司"
            name="company"
            rules={[{ required: true, message: '请输入投保公司' }]}
          >
            <Input placeholder="请输入投保公司名称" />
          </Form.Item>

          <Form.Item
            label="费率（%）"
            name="rate"
            rules={[
              { required: true, message: '请输入费率' },
              { type: 'number', min: 0, max: 100, message: '费率范围为0-100' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入费率 (0-100)"
              min={0}
              max={100}
              precision={2}
              suffix="%"
            />
          </Form.Item>

          <Form.Item
            label="保单起止日期"
            name="dateRange"
            rules={[{ required: true, message: '请选择保单起止日期' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item label="投保设备">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button onClick={handleSelectDevices}>
                选择设备 {selectedDeviceIds.length > 0 && `(已选 ${selectedDeviceIds.length} 台)`}
              </Button>
              {selectedDeviceIds.length > 0 && (
                <div style={{ color: '#666', fontSize: '12px' }}>
                  已选择 {selectedDeviceIds.length} 台设备
                </div>
              )}
            </Space>
          </Form.Item>

          <Form.Item label="保单附件">
            <Upload
              fileList={fileList}
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
              beforeUpload={() => false}
              maxCount={5}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            >
              <Button icon={<PlusOutlined />}>上传保单附件</Button>
            </Upload>
            <div style={{ color: '#999', fontSize: '12px', marginTop: 4 }}>
              支持PDF、图片、Word文档，最多5个文件
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 设备选择弹窗 */}
      <DeviceSelectModal
        open={isDeviceModalVisible}
        onCancel={() => setIsDeviceModalVisible(false)}
        onConfirm={handleDeviceConfirm}
        initialSelectedIds={selectedDeviceIds}
      />
    </div>
  );
};

export default PolicyManagement;
