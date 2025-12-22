/**
 * 转租设备管理页面
 */

import React, { useEffect, useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Card,
  Dropdown,
  type MenuProps,
  Select,
  Tag,
  InputNumber,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  RollbackOutlined,
  PauseCircleOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import type { AppDispatch } from '../../app/store';
import {
  fetchEquipments,
  fetchCompanies,
  createEquipment,
  updateEquipment,
  returnEquipment,
  suspendEquipment,
  selectEquipments,
  selectCompanies,
  selectLoading,
  selectPagination,
  setPage,
  setPageSize,
  type SubleaseEquipment,
  type EquipmentStatus,
} from './subleaseSlice';
import { TabsContext } from '../common/TabsContext';
import dayjs from 'dayjs';

const { TextArea } = Input;

const SubleaseEquipmentPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { openTab } = useContext(TabsContext);
  
  const equipments = useSelector(selectEquipments);
  const companies = useSelector(selectCompanies);
  const loading = useSelector(selectLoading);
  const { page, pageSize, total } = useSelector(selectPagination);
  
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | ''>('');
  const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [suspendModalVisible, setSuspendModalVisible] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<SubleaseEquipment | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  
  const [equipmentForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [suspendForm] = Form.useForm();

  useEffect(() => {
    loadData();
    dispatch(fetchCompanies({ page: 1, pageSize: 1000 }));
  }, [page, pageSize]);

  const loadData = () => {
    dispatch(fetchEquipments({ 
      page, 
      pageSize, 
      search: searchText,
      status: statusFilter || undefined
    }));
  };

  const handleSearch = () => {
    dispatch(setPage(1));
    loadData();
  };

  const handleAddEquipment = () => {
    setEditingEquipment(null);
    equipmentForm.resetFields();
    setEquipmentModalVisible(true);
  };

  const handleEditEquipment = (equipment: SubleaseEquipment) => {
    setEditingEquipment(equipment);
    equipmentForm.setFieldsValue({
      companyId: equipment.companyId,
      equipmentCode: equipment.equipmentCode,
      factoryNumber: equipment.factoryNumber,
      category: equipment.category,
      equipmentType: equipment.equipmentType,
      model: equipment.model,
      brand: equipment.brand,
      height: equipment.height,
      dailyRate: equipment.dailyRate,
      monthlyRate: equipment.monthlyRate,
      deposit: equipment.deposit,
      startDate: equipment.startDate ? dayjs(equipment.startDate) : null,
      endDate: equipment.endDate ? dayjs(equipment.endDate) : null,
      remark: equipment.remark,
    });
    setEquipmentModalVisible(true);
  };

  const handleSaveEquipment = async (values: any) => {
    try {
      const data = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
        companyName: companies.find(c => c.id === values.companyId)?.companyName || '',
      };

      if (editingEquipment) {
        await dispatch(updateEquipment({ id: editingEquipment.id, data })).unwrap();
        message.success('更新成功');
      } else {
        await dispatch(createEquipment(data)).unwrap();
        message.success('创建成功');
      }
      setEquipmentModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error || '操作失败');
    }
  };

  const handleReturn = (equipment: SubleaseEquipment) => {
    setSelectedEquipmentId(equipment.id);
    returnForm.setFieldsValue({
      returnDate: dayjs(),
    });
    setReturnModalVisible(true);
  };

  const handleSaveReturn = async (values: any) => {
    try {
      await dispatch(returnEquipment({
        id: selectedEquipmentId!,
        returnDate: values.returnDate.format('YYYY-MM-DD'),
        remark: values.remark,
      })).unwrap();
      message.success('还租成功');
      setReturnModalVisible(false);
      returnForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error || '还租失败');
    }
  };

  const handleSuspend = (equipment: SubleaseEquipment) => {
    setSelectedEquipmentId(equipment.id);
    suspendForm.setFieldsValue({
      suspensionStartDate: dayjs(),
    });
    setSuspendModalVisible(true);
  };

  const handleSaveSuspend = async (values: any) => {
    try {
      await dispatch(suspendEquipment({
        id: selectedEquipmentId!,
        suspensionReason: values.suspensionReason,
        suspensionStartDate: values.suspensionStartDate.format('YYYY-MM-DD'),
        suspensionEndDate: values.suspensionEndDate?.format('YYYY-MM-DD'),
      })).unwrap();
      message.success('报停成功');
      setSuspendModalVisible(false);
      suspendForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error || '报停失败');
    }
  };

  const getStatusTag = (status: EquipmentStatus) => {
    const statusConfig = {
      idle: { color: 'default', text: '闲置' },
      renting: { color: 'blue', text: '转租中' },
      returned: { color: 'green', text: '已还租' },
      suspended: { color: 'orange', text: '报停' },
      maintenance: { color: 'red', text: '维修中' },
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '自编号',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 100,
      render: (text: string) => text || '—',
    },
    {
      title: '出厂编码',
      dataIndex: 'factoryNumber',
      key: 'factoryNumber',
      width: 120,
      render: (text: string) => text || '—',
    },
    {
      title: '设备类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '设备信息',
      key: 'equipmentInfo',
      width: 250,
      render: (_: any, record: SubleaseEquipment) => (
        <div>
          <div className="font-medium">{record.equipmentType}</div>
          <div className="text-gray-500 text-xs">
            {[record.model, record.brand, record.height].filter(Boolean).join(' / ')}
          </div>
        </div>
      ),
    },
    {
      title: '租期',
      key: 'rentalPeriod',
      width: 180,
      render: (_: any, record: SubleaseEquipment) => (
        <div>
          <div className="text-xs">
            起: {record.startDate ? dayjs(record.startDate).format('YYYY-MM-DD') : '—'}
          </div>
          <div className="text-xs">
            还: {record.actualReturnDate 
              ? dayjs(record.actualReturnDate).format('YYYY-MM-DD')
              : record.endDate 
                ? dayjs(record.endDate).format('YYYY-MM-DD')
                : '—'}
          </div>
        </div>
      ),
    },
    {
      title: '转租公司',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 150,
    },
    {
      title: '所在门店',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 120,
      render: (text: string) => text || '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: EquipmentStatus) => getStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 100,
      render: (_: any, record: SubleaseEquipment) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: '修改',
            onClick: () => handleEditEquipment(record),
          },
          {
            type: 'divider',
          },
          {
            key: 'return',
            icon: <RollbackOutlined />,
            label: '还租',
            disabled: record.status !== 'renting',
            onClick: () => handleReturn(record),
          },
          {
            key: 'suspend',
            icon: <PauseCircleOutlined />,
            label: '报停',
            disabled: record.status !== 'renting',
            onClick: () => handleSuspend(record),
          },
        ];

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="link" icon={<MoreOutlined />}>
              操作
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      {/* 搜索栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddEquipment}>
            新增设备
          </Button>
          <Input
            placeholder="自编号/出厂编码/公司名称"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="状态"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            style={{ width: 120 }}
            options={[
              { value: 'idle', label: '闲置' },
              { value: 'renting', label: '转租中' },
              { value: 'returned', label: '已还租' },
              { value: 'suspended', label: '报停' },
              { value: 'maintenance', label: '维修中' },
            ]}
          />
          <Button icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
        </Space>
      </Card>

      {/* 设备列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={equipments}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (newPage, newPageSize) => {
              dispatch(setPage(newPage));
              if (newPageSize !== pageSize) {
                dispatch(setPageSize(newPageSize));
              }
            },
          }}
        />
      </Card>

      {/* 新增/编辑设备弹窗 */}
      <Modal
        title={editingEquipment ? '编辑转租设备' : '新增转租设备'}
        open={equipmentModalVisible}
        onCancel={() => {
          setEquipmentModalVisible(false);
          equipmentForm.resetFields();
        }}
        onOk={() => equipmentForm.submit()}
        width={800}
      >
        <Form
          form={equipmentForm}
          layout="vertical"
          onFinish={handleSaveEquipment}
        >
          <Form.Item
            label="转租公司"
            name="companyId"
            rules={[{ required: true, message: '请选择转租公司' }]}
          >
            <Select
              placeholder="请选择转租公司"
              showSearch
              optionFilterProp="children"
              options={companies.map(c => ({
                value: c.id,
                label: c.companyName,
              }))}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="自编号"
              name="equipmentCode"
              style={{ width: 360 }}
            >
              <Input placeholder="自编号" />
            </Form.Item>

            <Form.Item
              label="出厂编码"
              name="factoryNumber"
              style={{ width: 360 }}
            >
              <Input placeholder="出厂编码" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="设备类别"
              name="category"
              rules={[{ required: true, message: '请输入设备类别' }]}
              style={{ width: 360 }}
            >
              <Input placeholder="设备类别" />
            </Form.Item>

            <Form.Item
              label="设备类型"
              name="equipmentType"
              rules={[{ required: true, message: '请输入设备类型' }]}
              style={{ width: 360 }}
            >
              <Input placeholder="设备类型" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="型号"
              name="model"
              style={{ width: 230 }}
            >
              <Input placeholder="型号" />
            </Form.Item>

            <Form.Item
              label="品牌"
              name="brand"
              style={{ width: 230 }}
            >
              <Input placeholder="品牌" />
            </Form.Item>

            <Form.Item
              label="高度"
              name="height"
              style={{ width: 230 }}
            >
              <Input placeholder="高度" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="日租金"
              name="dailyRate"
              style={{ width: 230 }}
            >
              <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="月租金"
              name="monthlyRate"
              style={{ width: 230 }}
            >
              <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="押金"
              name="deposit"
              style={{ width: 230 }}
            >
              <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="起租日期"
              name="startDate"
              style={{ width: 360 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="计划还租日期"
              name="endDate"
              style={{ width: 360 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item label="备注" name="remark">
            <TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 还租弹窗 */}
      <Modal
        title="还租设备"
        open={returnModalVisible}
        onCancel={() => {
          setReturnModalVisible(false);
          returnForm.resetFields();
        }}
        onOk={() => returnForm.submit()}
        width={500}
      >
        <Form
          form={returnForm}
          layout="vertical"
          onFinish={handleSaveReturn}
        >
          <Form.Item
            label="还租日期"
            name="returnDate"
            rules={[{ required: true, message: '请选择还租日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <TextArea rows={3} placeholder="还租备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 报停弹窗 */}
      <Modal
        title="报停设备"
        open={suspendModalVisible}
        onCancel={() => {
          setSuspendModalVisible(false);
          suspendForm.resetFields();
        }}
        onOk={() => suspendForm.submit()}
        width={500}
      >
        <Form
          form={suspendForm}
          layout="vertical"
          onFinish={handleSaveSuspend}
        >
          <Form.Item
            label="报停原因"
            name="suspensionReason"
            rules={[{ required: true, message: '请输入报停原因' }]}
          >
            <TextArea rows={3} placeholder="请说明报停原因" />
          </Form.Item>

          <Form.Item
            label="报停开始日期"
            name="suspensionStartDate"
            rules={[{ required: true, message: '请选择报停开始日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="报停结束日期" name="suspensionEndDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubleaseEquipmentPage;

