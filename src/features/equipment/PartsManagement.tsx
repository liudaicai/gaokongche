import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input, Select, Table, Modal, Form, Space, message, Card, Statistic } from 'antd';
import { PlusOutlined, MinusOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch } from '../../app/store';
import {
  fetchAccessoriesStart,
  fetchAccessoriesSuccess,
  fetchAccessoriesFailure,
  updateAccessorySuccess,
  addAccessoryTransactionSuccess,
  selectAccessories,
  selectLoading,
  selectError,
  Accessory,
  AccessoryTransaction
} from './equipmentslice';

const { Option } = Select;

const PartsManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const accessories = useSelector(selectAccessories);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const [searchParams, setSearchParams] = useState({
    partNumber: '',
    model: '',
    name: '',
    category: '',
    warehouse: ''
  });

  const [isInventoryModalVisible, setIsInventoryModalVisible] = useState(false);
  const [isReceiveModalVisible, setIsReceiveModalVisible] = useState(false);
  const [currentPart, setCurrentPart] = useState<Accessory | null>(null);
  const [inventoryForm] = Form.useForm();
  const [receiveForm] = Form.useForm();
  const [filteredParts, setFilteredParts] = useState<Accessory[]>([]);

  // 模拟数据获取
  useEffect(() => {
    fetchAccessories();
  }, []);

  // 根据搜索条件过滤配件
  useEffect(() => {
    if (accessories.length > 0) {
      const filtered = accessories.filter(part => {
        return (
          (searchParams.partNumber ? part.materialNumber.includes(searchParams.partNumber) : true) &&
          (searchParams.model ? part.modelSpec.includes(searchParams.model) : true) &&
          (searchParams.name ? part.name.includes(searchParams.name) : true) &&
          (searchParams.category ? part.category === searchParams.category : true) &&
          (searchParams.warehouse ? part.warehouse === searchParams.warehouse : true)
        );
      });
      setFilteredParts(filtered);
    }
  }, [accessories, searchParams]);

  const fetchAccessories = async () => {
    dispatch(fetchAccessoriesStart());
    try {
      // 在实际应用中，这里应该是API调用
      // 模拟数据
      const mockAccessories: Accessory[] = [
        {
          id: 'P001',
          materialNumber: 'P-2024-001',
          name: '液压油滤芯',
          modelSpec: 'H12-456',
          category: '滤芯类',
          totalQuantity: 100,
          usedQuantity: 20,
          availableQuantity: 80,
          applicableScope: '适用于PC200-8, PC220-8等型号挖掘机',
          warehouse: '上海仓库',
          area: '华东区',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'P002',
          materialNumber: 'P-2024-002',
          name: '挖掘机斗齿',
          modelSpec: 'T45-789',
          category: '易损件',
          totalQuantity: 50,
          usedQuantity: 15,
          availableQuantity: 35,
          applicableScope: '适用于各类挖掘机铲斗',
          warehouse: '北京仓库',
          area: '华北区',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'P003',
          materialNumber: 'P-2024-003',
          name: '高压油管',
          modelSpec: 'H25-321',
          category: '液压件',
          totalQuantity: 30,
          usedQuantity: 8,
          availableQuantity: 22,
          applicableScope: '适用于各类液压设备',
          warehouse: '广州仓库',
          area: '华南区',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      dispatch(fetchAccessoriesSuccess(mockAccessories));
    } catch (err) {
      dispatch(fetchAccessoriesFailure('获取配件列表失败'));
    }
  };

  const handleSearch = (value: string, field: keyof typeof searchParams) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
  };

  const handleResetSearch = () => {
    setSearchParams({
      partNumber: '',
      model: '',
      name: '',
      category: '',
      warehouse: ''
    });
    setFilteredParts(accessories);
  };

  const handleInventory = (part: Accessory) => {
    setCurrentPart(part);
    inventoryForm.resetFields();
    setIsInventoryModalVisible(true);
  };

  const handleReceive = (part: Accessory) => {
    setCurrentPart(part);
    receiveForm.resetFields();
    setIsReceiveModalVisible(true);
  };

  const handleSaveInventory = async () => {
    if (!currentPart) return;
    
    try {
      const values = await inventoryForm.validateFields();
      const inventoryData: AccessoryTransaction = {
        id: `INV${Date.now()}`,
        accessoryId: currentPart.id,
        type: 'in',
        quantity: values.quantity,
        reason: values.remark || '配件入库',
        operator: '系统管理员',
        createdAt: new Date().toISOString()
      };

      // 更新配件库存
      const updatedPart: Accessory = {
        ...currentPart,
        totalQuantity: currentPart.totalQuantity + values.quantity,
        availableQuantity: currentPart.availableQuantity + values.quantity,
        updatedAt: new Date().toISOString()
      };

      dispatch(addAccessoryTransactionSuccess(inventoryData));
      dispatch(updateAccessorySuccess(updatedPart));
      message.success('入库成功');
      setIsInventoryModalVisible(false);
    } catch (errorInfo) {
      message.error('表单验证失败');
    }
  };

  const handleSaveReceive = async () => {
    if (!currentPart) return;
    
    try {
      const values = await receiveForm.validateFields();
      
      if (values.quantity > currentPart.availableQuantity) {
        message.error(`领用量不能超过可用量（${currentPart.availableQuantity}）`);
        return;
      }

      const receiveData: AccessoryTransaction = {
        id: `REC${Date.now()}`,
        accessoryId: currentPart.id,
        type: 'out',
        quantity: values.quantity,
        reason: values.remark || '配件领用',
        operator: '系统管理员',
        createdAt: new Date().toISOString()
      };

      // 更新配件库存
      const updatedPart: Accessory = {
        ...currentPart,
        usedQuantity: currentPart.usedQuantity + values.quantity,
        availableQuantity: currentPart.availableQuantity - values.quantity,
        updatedAt: new Date().toISOString()
      };

      dispatch(addAccessoryTransactionSuccess(receiveData));
      dispatch(updateAccessorySuccess(updatedPart));
      message.success('领用成功');
      setIsReceiveModalVisible(false);
    } catch (errorInfo) {
      message.error('表单验证失败');
    }
  };

  // 表格列配置
  const columns: ColumnsType<Accessory> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 60,
    },
    {
      title: '物料号',
      dataIndex: 'materialNumber',
      key: 'materialNumber',
    },
    {
      title: '型号规格',
      dataIndex: 'modelSpec',
      key: 'modelSpec',
    },
    {
      title: '总量/领用量/可用数量',
      key: 'quantityInfo',
      render: (_, record) => (
        <div>
          总量：<span style={{ color: '#1890ff' }}>{record.totalQuantity}</span><br />
          领用量：<span style={{ color: '#ff4d4f' }}>{record.usedQuantity}</span><br />
          可用：<span style={{ color: '#52c41a' }}>{record.availableQuantity}</span>
        </div>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '适用范围',
      dataIndex: 'applicableScope',
      key: 'applicableScope',
    },
    {
      title: '所在仓库',
      dataIndex: 'warehouse',
      key: 'warehouse',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />}>详情</Button>
          <Button type="link" icon={<PlusOutlined />} onClick={() => handleInventory(record)}>入库</Button>
          <Button type="link" icon={<MinusOutlined />} onClick={() => handleReceive(record)}>领用</Button>
        </Space>
      ),
    },
  ];

  // 计算统计数据
  const totalParts = filteredParts.length;
  const lowStockParts = filteredParts.filter(part => part.availableQuantity <= 10).length; // 假设安全库存为10
  const totalAvailableQuantity = filteredParts.reduce((sum, part) => sum + part.availableQuantity, 0);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>配件管理</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button type="primary" icon={<MinusOutlined />}>批量领用</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setCurrentPart(null);
            inventoryForm.resetFields();
            setIsInventoryModalVisible(true);
          }}>
            入库
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '16px' }}>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic title="配件总数" value={totalParts} />
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic 
            title="可用总量" 
            value={totalAvailableQuantity} 
            suffix="个" 
          />
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic 
            title="低库存配件" 
            value={lowStockParts} 
            valueStyle={{ color: lowStockParts > 0 ? '#ff4d4f' : '#3f8600' }}
          />
        </Card>
      </div>

      {/* 查询区 */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>物料号</label>
            <Input
              placeholder="请输入物料号"
              value={searchParams.partNumber}
              onChange={(e) => handleSearch(e.target.value, 'partNumber')}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>型号</label>
            <Input
              placeholder="请输入型号"
              value={searchParams.model}
              onChange={(e) => handleSearch(e.target.value, 'model')}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>名称</label>
            <Input
              placeholder="请输入名称"
              value={searchParams.name}
              onChange={(e) => handleSearch(e.target.value, 'name')}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>类别</label>
            <Select
              placeholder="请选择类别"
              value={searchParams.category || undefined}
              onChange={(value) => handleSearch(value, 'category')}
              allowClear
            >
              <Option value="滤芯类">滤芯类</Option>
              <Option value="液压件">液压件</Option>
              <Option value="易损件">易损件</Option>
              <Option value="电子件">电子件</Option>
            </Select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>所在仓库</label>
            <Select
              placeholder="请选择仓库"
              value={searchParams.warehouse || undefined}
              onChange={(value) => handleSearch(value, 'warehouse')}
              allowClear
            >
              <Option value="上海仓库">上海仓库</Option>
              <Option value="北京仓库">北京仓库</Option>
              <Option value="广州仓库">广州仓库</Option>
              <Option value="武汉仓库">武汉仓库</Option>
            </Select>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            <Button type="primary" onClick={() => setFilteredParts(accessories.filter(part => 
              (searchParams.partNumber ? part.materialNumber.includes(searchParams.partNumber) : true) &&
              (searchParams.model ? part.modelSpec.includes(searchParams.model) : true) &&
              (searchParams.name ? part.name.includes(searchParams.name) : true) &&
              (searchParams.category ? part.category === searchParams.category : true) &&
              (searchParams.warehouse ? part.warehouse === searchParams.warehouse : true)
            ))}>查询</Button>
            <Button onClick={handleResetSearch}>重置</Button>
          </div>
        </div>
      </Card>

      {/* 配件列表 */}
      <Table
        columns={columns}
        dataSource={filteredParts}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无配件数据' }}
      />

      {/* 入库模态框 */}
      <Modal
        title={currentPart ? `入库 - ${currentPart.name}` : "新增配件入库"}
        open={isInventoryModalVisible}
        onCancel={() => setIsInventoryModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsInventoryModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveInventory}>保存</Button>
        ]}
      >
        <Form
          form={inventoryForm}
          layout="vertical"
        >
          {!currentPart && (
            <>
              <Form.Item
                name="partNumber"
                label="物料号"
                rules={[{ required: true, message: '请输入物料号' }]}
              >
                <Input placeholder="请输入物料号" />
              </Form.Item>
              <Form.Item
                name="name"
                label="名称"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input placeholder="请输入名称" />
              </Form.Item>
              <Form.Item
                name="model"
                label="型号规格"
                rules={[{ required: true, message: '请输入型号规格' }]}
              >
                <Input placeholder="请输入型号规格" />
              </Form.Item>
              <Form.Item
                name="category"
                label="类别"
                rules={[{ required: true, message: '请选择类别' }]}
              >
                <Select placeholder="请选择类别">
                  <Option value="滤芯类">滤芯类</Option>
                  <Option value="液压件">液压件</Option>
                  <Option value="易损件">易损件</Option>
                  <Option value="电子件">电子件</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="application"
                label="适用范围"
                rules={[{ required: true, message: '请输入适用范围' }]}
              >
                <Input.TextArea rows={2} placeholder="请输入适用范围" />
              </Form.Item>
              <Form.Item
                name="safetyStock"
                label="安全库存"
                rules={[{ required: true, message: '请输入安全库存' }]}
              >
                <Input type="number" placeholder="请输入安全库存" />
              </Form.Item>
              <Form.Item
                name="unit"
                label="单位"
                rules={[{ required: true, message: '请输入单位' }]}
              >
                <Input placeholder="请输入单位" />
              </Form.Item>
            </>
          )}
          {currentPart && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <p>物料号：{currentPart.materialNumber}</p>
              <p>名称：{currentPart.name}</p>
              <p>型号：{currentPart.modelSpec}</p>
              <p>当前可用库存：{currentPart.availableQuantity}</p>
            </div>
          )}
          <Form.Item
            name="warehouse"
            label="入库仓库"
            rules={[{ required: true, message: '请选择入库仓库' }]}
            initialValue={currentPart?.warehouse}
          >
            <Select placeholder="请选择入库仓库">
              <Option value="上海仓库">上海仓库</Option>
              <Option value="北京仓库">北京仓库</Option>
              <Option value="广州仓库">广州仓库</Option>
              <Option value="武汉仓库">武汉仓库</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="quantity"
            label="入库数量"
            rules={[{ required: true, message: '请输入入库数量' }]}
          >
            <Input type="number" min={1} placeholder="请输入入库数量" />
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 领用模态框 */}
      <Modal
        title={currentPart ? `领用 - ${currentPart.name}` : "配件领用"}
        open={isReceiveModalVisible}
        onCancel={() => setIsReceiveModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsReceiveModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveReceive}>确认领用</Button>
        ]}
        width={600}
      >
        {currentPart && (
          <>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <p>物料号：{currentPart.materialNumber}</p>
              <p>名称：{currentPart.name}</p>
              <p>型号：{currentPart.modelSpec}</p>
              <p>所在仓库：{currentPart.warehouse}</p>
              <p>当前可用库存：<span style={{ color: currentPart.availableQuantity > 0 ? '#52c41a' : '#ff4d4f' }}>{currentPart.availableQuantity}</span></p>
            </div>
            
            <Form
              form={receiveForm}
              layout="vertical"
            >
              <Form.Item
                name="quantity"
                label="领用数量"
                rules={[
                  { required: true, message: '请输入领用数量' },
                  { type: 'number', min: 1, message: '领用量不能小于1' },
                  () => ({
                    validator(_, value) {
                      if (!value || value <= currentPart!.availableQuantity) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(`领用量不能超过可用库存（${currentPart!.availableQuantity}）`));
                    }
                  }),
                ]}
              >
                <Input type="number" min={1} max={currentPart.availableQuantity} placeholder="请输入领用数量" />
              </Form.Item>
              <Form.Item
                name="receiver"
                label="领用人"
                rules={[{ required: true, message: '请输入领用人' }]}
              >
                <Input placeholder="请输入领用人姓名" />
              </Form.Item>
              <Form.Item
                name="remark"
                label="领用原因"
                rules={[{ required: true, message: '请输入领用原因' }]}
              >
                <Input.TextArea rows={3} placeholder="请输入领用原因" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {error && <div style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>{error}</div>}
    </div>
  );
};

// 已经从equipmentSlice中导入了所需的selectors
export default PartsManagement;