// 设备维修管理页面
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Card,
  Checkbox,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  CheckOutlined,
  StopOutlined,
  EyeOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchRepairs,
  createRepair,
  completeRepair,
  deleteRepair,
  // clearError,
} from './repairsSlice';
import type {
  EquipmentRepair,
  CreateRepairRequest,
  RepairStatus,
} from '../../types/equipmentRepair';
import {
  REPAIR_STATUS_OPTIONS,
  DAMAGE_TYPE_OPTIONS,
  DAMAGE_PART_OPTIONS,
  getRepairStatusLabel,
  getRepairStatusColor,
  getDamageTypeLabel,
  getDamagePartLabel,
} from '../../types/equipmentRepair';

const { RangePicker } = DatePicker;

const EquipmentRepairsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { repairs, loading, total, page, pageSize } = useSelector(
    (state: RootState) => state.repairs
  );

  const [searchForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [completeForm] = Form.useForm();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [currentRepair, setCurrentRepair] = useState<EquipmentRepair | null>(null);

  // 查询参数
  const [searchParams, setSearchParams] = useState({
    equipmentCode: '',
    status: undefined as RepairStatus | undefined,
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
  });

  // 加载数据
  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  const loadData = () => {
    const params: any = { page, pageSize };
    if (searchParams.equipmentCode) {
      params.equipmentCode = searchParams.equipmentCode;
    }
    if (searchParams.status) {
      params.status = searchParams.status;
    }
    if (searchParams.dateRange) {
      params.startDate = searchParams.dateRange[0].format('YYYY-MM-DD');
      params.endDate = searchParams.dateRange[1].format('YYYY-MM-DD');
    }
    dispatch(fetchRepairs(params));
  };

  // 搜索
  const handleSearch = () => {
    loadData();
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams({
      equipmentCode: '',
      status: undefined,
      dateRange: null,
    });
    dispatch(fetchRepairs({ page: 1, pageSize }));
  };

  // 创建维修单
  const handleCreate = async (values: any) => {
    try {
      const data: CreateRepairRequest = {
        equipmentCode: values.equipmentCode,
        damageType: values.damageType,
        damageParts: values.damageParts,
        damageDescription: values.damageDescription,
        repairPerson: values.repairPerson,
        repairStartDate: values.repairStartDate
          ? dayjs(values.repairStartDate).format('YYYY-MM-DD')
          : undefined,
        remark: values.remark,
      };

      await dispatch(createRepair(data)).unwrap();
      message.success('维修单创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error || '创建维修单失败');
    }
  };

  // 完成维修
  const handleComplete = async (values: any) => {
    if (!currentRepair) return;

    try {
      await dispatch(
        completeRepair({
          id: currentRepair.id,
          data: {
            repairCost: values.repairCost,
            remark: values.remark,
            usedParts: values.usedParts,
          },
        })
      ).unwrap();
      message.success('维修已完成');
      setCompleteModalVisible(false);
      completeForm.resetFields();
      setCurrentRepair(null);
      loadData();
    } catch (error: any) {
      message.error(error || '完成维修失败');
    }
  };

  // 取消维修
  const handleCancel = async (id: string) => {
    try {
      await dispatch(deleteRepair(id)).unwrap();
      message.success('维修单已取消');
      loadData();
    } catch (error: any) {
      message.error(error || '取消维修单失败');
    }
  };

  // 查看详情
  const handleViewDetail = (record: EquipmentRepair) => {
    setCurrentRepair(record);
    setDetailModalVisible(true);
  };

  // 打开完成维修对话框
  const handleOpenComplete = (record: EquipmentRepair) => {
    setCurrentRepair(record);
    completeForm.setFieldsValue({
      repairCost: record.repairCost,
      remark: record.remark,
    });
    setCompleteModalVisible(true);
  };

  // 表格列定义
  const columns: ColumnsType<EquipmentRepair> = [
    {
      title: '维修单号',
      dataIndex: 'repairNumber',
      key: 'repairNumber',
      width: 150,
      fixed: 'left',
    },
    {
      title: '设备编号',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 120,
    },
    {
      title: '自编号',
      dataIndex: 'customCode',
      key: 'customCode',
      width: 100,
    },
    {
      title: '设备类型',
      dataIndex: 'equipmentType',
      key: 'equipmentType',
      width: 120,
    },
    {
      title: '损坏类型',
      dataIndex: 'damageType',
      key: 'damageType',
      width: 100,
      render: (value) => (value ? getDamageTypeLabel(value) : '-'),
    },
    {
      title: '损坏部件',
      dataIndex: 'damageParts',
      key: 'damageParts',
      width: 150,
      render: (parts: string[]) =>
        parts && parts.length > 0
          ? parts.map((part) => getDamagePartLabel(part)).join('、')
          : '-',
    },
    {
      title: '维修人员',
      dataIndex: 'repairPerson',
      key: 'repairPerson',
      width: 100,
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      key: 'contactName',
      width: 120,
      render: (text: string, record: EquipmentRepair) => (
        <div>
          <div>{text || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.contactPhone}</div>
        </div>
      )
    },
    {
      title: '视频判断',
      dataIndex: 'isVideoDiagnosis',
      key: 'isVideoDiagnosis',
      width: 90,
      render: (val: boolean) => val ? '是' : '否'
    },
    {
      title: '维修费用',
      dataIndex: 'repairCost',
      key: 'repairCost',
      width: 100,
      render: (value) => (value ? `¥${value.toFixed(2)}` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: RepairStatus) => (
        <Tag color={getRepairStatusColor(status)}>
          {getRepairStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'pending' || record.status === 'repairing' ? (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleOpenComplete(record)}
              >
                完成
              </Button>
              <Popconfirm
                title="确定要取消此维修单吗？"
                onConfirm={() => handleCancel(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<StopOutlined />}>
                  取消
                </Button>
              </Popconfirm>
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        {/* 搜索栏 */}
        <Form
          form={searchForm}
          layout="inline"
          style={{ marginBottom: 16 }}
          onFinish={handleSearch}
        >
          <Form.Item name="equipmentCode" label="设备编号">
            <Input
              placeholder="请输入设备编号"
              value={searchParams.equipmentCode}
              onChange={(e) =>
                setSearchParams({ ...searchParams, equipmentCode: e.target.value })
              }
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="status" label="维修状态">
            <Select
              placeholder="请选择状态"
              value={searchParams.status}
              onChange={(value) =>
                setSearchParams({ ...searchParams, status: value })
              }
              style={{ width: 150 }}
              allowClear
            >
              {REPAIR_STATUS_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="创建时间">
            <RangePicker
              value={searchParams.dateRange}
              onChange={(dates) =>
                setSearchParams({
                  ...searchParams,
                  dateRange: dates as [dayjs.Dayjs, dayjs.Dayjs] | null,
                })
              }
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 操作栏 */}
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新增维修单
          </Button>
        </div>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={repairs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              dispatch(fetchRepairs({ page, pageSize, ...searchParams }));
            },
          }}
          scroll={{ x: 1500 }}
        />
      </Card>

      {/* 创建维修单对话框 */}
      <Modal
        title="新增维修单"
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        width={600}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="equipmentCode"
            label="设备编号"
            rules={[{ required: true, message: '请输入设备编号' }]}
          >
            <Input placeholder="请输入设备编号" />
          </Form.Item>
          <Form.Item name="damageType" label="损坏类型">
            <Select placeholder="请选择损坏类型" allowClear>
              {DAMAGE_TYPE_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="damageParts" label="损坏部件">
            <Select mode="multiple" placeholder="请选择损坏部件" allowClear>
              {DAMAGE_PART_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="damageDescription" label="损坏描述">
            <Input.TextArea rows={3} placeholder="请输入损坏描述" />
          </Form.Item>
          <Form.Item name="repairPerson" label="维修人员">
            <Input placeholder="请输入维修人员姓名" />
          </Form.Item>
          <Form.Item name="repairStartDate" label="开始维修日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情对话框 */}
      <Modal
        title="维修单详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setCurrentRepair(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {currentRepair && (
          <div>
            <p>
              <strong>维修单号：</strong>
              {currentRepair.repairNumber}
            </p>
            <p>
              <strong>设备编号：</strong>
              {currentRepair.equipmentCode}
            </p>
            <p>
              <strong>自编号：</strong>
              {currentRepair.customCode || '-'}
            </p>
            <p>
              <strong>设备类型：</strong>
              {currentRepair.equipmentType || '-'}
            </p>
            <p>
              <strong>损坏类型：</strong>
              {currentRepair.damageType
                ? getDamageTypeLabel(currentRepair.damageType)
                : '-'}
            </p>
            <p>
              <strong>损坏部件：</strong>
              {currentRepair.damageParts && currentRepair.damageParts.length > 0
                ? currentRepair.damageParts
                  .map((part) => getDamagePartLabel(part))
                  .join('、')
                : '-'}
            </p>
            <p>
              <strong>损坏描述：</strong>
              {currentRepair.damageDescription || '-'}
            </p>
            <p>
              <strong>维修人员：</strong>
              {currentRepair.repairPerson || '-'}
            </p>
            <p>
              <strong>是否视频判断：</strong>
              {currentRepair.isVideoDiagnosis ? '是' : '否'}
            </p>
            <p>
              <strong>联系人：</strong>
              {currentRepair.contactName || '-'} {currentRepair.contactPhone && `(${currentRepair.contactPhone})`}
            </p>
            <p>
              <strong>维修费用：</strong>
              {currentRepair.repairCost
                ? `¥${currentRepair.repairCost.toFixed(2)}`
                : '-'}
            </p>
            <p>
              <strong>开始日期：</strong>
              {currentRepair.repairStartDate || '-'}
            </p>
            <p>
              <strong>完成日期：</strong>
              {currentRepair.repairEndDate || '-'}
            </p>
            <p>
              <strong>状态：</strong>
              <Tag color={getRepairStatusColor(currentRepair.status)}>
                {getRepairStatusLabel(currentRepair.status)}
              </Tag>
            </p>
            <p>
              <strong>备注：</strong>
              {currentRepair.remark || '-'}
            </p>
            <p>
              <strong>创建人：</strong>
              {currentRepair.creatorName || '-'}
            </p>
            <p>
              <strong>创建时间：</strong>
              {currentRepair.createdAt
                ? dayjs(currentRepair.createdAt).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </p>
          </div>
        )}
      </Modal>

      {/* 完成维修对话框 */}
      <Modal
        title="完成维修"
        open={completeModalVisible}
        onOk={() => completeForm.submit()}
        onCancel={() => {
          setCompleteModalVisible(false);
          completeForm.resetFields();
          setCurrentRepair(null);
        }}
        width={700}
      >
        <Form form={completeForm} layout="vertical" onFinish={handleComplete}>
          <Form.Item name="repairCost" label="维修总费用" rules={[{ required: true }]}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入维修总费用"
              addonBefore="¥"
            />
          </Form.Item>

          <Divider orientation="left">配件使用记录</Divider>
          <Form.List name="usedParts">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card size="small" key={key} style={{ marginBottom: 16, background: '#f5f5f5' }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          label="配件名称"
                          rules={[{ required: true, message: '请输入配件名称' }]}
                        >
                          <Input placeholder="例如：驱动电机" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                         <Form.Item
                          {...restField}
                          name={[name, 'model']}
                          label="型号(选填)"
                        >
                          <Input placeholder="例如：X-200" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'cost']}
                          label="单价"
                          rules={[{ required: true, message: '请输入单价' }]}
                        >
                          <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="单价" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          label="数量"
                          initialValue={1}
                          rules={[{ required: true }]}
                        >
                          <InputNumber style={{ width: '100%' }} min={1} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                         <Form.Item
                          {...restField}
                          name={[name, 'isHighValue']}
                          label="高价值配件"
                          valuePropName="checked"
                        >
                          <Checkbox>生成追踪记录</Checkbox>
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prev, curr) => 
                            prev.usedParts?.[name]?.isHighValue !== curr.usedParts?.[name]?.isHighValue
                          }
                        >
                          {({ getFieldValue }) => {
                            const isHighValue = getFieldValue(['usedParts', name, 'isHighValue']);
                            return isHighValue ? (
                              <Form.Item
                                {...restField}
                                name={[name, 'categoryCode']}
                                label="配件类别"
                                rules={[{ required: true, message: '请选择类别' }]}
                              >
                                <Select placeholder="选择类别">
                                  <Select.Option value="BATTERY">电池</Select.Option>
                                  <Select.Option value="MOTOR">电机</Select.Option>
                                  <Select.Option value="HYDRAULIC">液压</Select.Option>
                                  <Select.Option value="ECU">电控</Select.Option>
                                </Select>
                              </Form.Item>
                            ) : null;
                          }}
                        </Form.Item>
                      </Col>
                    </Row>
                    <div style={{ textAlign: 'right' }}>
                      <Button type="link" danger onClick={() => remove(name)} icon={<MinusCircleOutlined />}>
                        移除此配件
                      </Button>
                    </div>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加使用的配件
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EquipmentRepairsPage;
