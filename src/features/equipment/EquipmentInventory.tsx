import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Input, Select, Table, Card, Statistic, Row, Col, Tag, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch } from '../../app/store';
import {
  fetchInventoryStart,
  fetchInventorySuccess,
  fetchInventoryFailure,
  selectInventoryList,
  selectLoading,
  selectError,
  EquipmentInventory as EquipmentInventoryType
} from './equipmentslice';

const { Search } = Input;
const { Option } = Select;

const EquipmentInventory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const inventoryList = useSelector(selectInventoryList);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  const [searchParams, setSearchParams] = useState({
    area: '',
    height: '',
    type: '',
    brand: ''
  });
  const [filteredList, setFilteredList] = useState<EquipmentInventoryType[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchTsRef = useRef<number>(0);

  const fetchInventory = useCallback(async () => {
    dispatch(fetchInventoryStart());
    try {
      // 取消上一条请求，避免在HMR/可见性切换时产生中断报错
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await fetch('/api/equipments/inventory/stats', { signal: controller.signal });
      const result = await response.json();
      
      if (result.ok) {
        dispatch(fetchInventorySuccess(result.data));
        setLastUpdated(new Date().toLocaleString());
        lastFetchTsRef.current = Date.now();
      } else {
        dispatch(fetchInventoryFailure(result.error || '获取库存数据失败'));
      }
    } catch (err: any) {
      // 忽略主动取消的请求
      if (err?.name === 'AbortError') return;
      dispatch(fetchInventoryFailure('获取库存数据失败'));
    }
  }, [dispatch]);

  // 初次加载获取数据
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // 自动刷新：窗口获得焦点、标签页可见时、每60秒轮询
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastFetchTsRef.current > 1500) {
        fetchInventory();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 延迟触发，避开HMR或tab切换的快速事件，减少ERR_ABORTED
        window.setTimeout(() => {
          if (Date.now() - lastFetchTsRef.current > 1500) {
            fetchInventory();
          }
        }, 250);
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const intervalId = window.setInterval(fetchInventory, 60000);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(intervalId);
      // 组件卸载时取消正在进行的请求
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchInventory]);

  // 过滤数据（排除默认仓库和未指定仓库）
  useEffect(() => {
    const excludedAreas = ['默认仓库', '未指定仓库'];
    
    const filtered = (inventoryList as EquipmentInventoryType[]).filter((inventory: EquipmentInventoryType) => 
      // 首先过滤掉默认仓库和未指定仓库
      !excludedAreas.includes(inventory.area) &&
      // 然后应用用户的筛选条件
      (searchParams.area === '' || inventory.area.includes(searchParams.area)) &&
      (searchParams.height === '' || inventory.height.toString() === searchParams.height) &&
      (searchParams.type === '' || inventory.type === searchParams.type) &&
      (searchParams.brand === '')
    );
    
    setFilteredList(filtered);
  }, [inventoryList, searchParams]);

  // 获取所有可用的区域选项（过滤掉默认仓库和未指定仓库）
  const availableAreas = React.useMemo(() => {
    const areas = new Set<string>();
    const excludedAreas = ['默认仓库', '未指定仓库'];
    
    (inventoryList as EquipmentInventoryType[]).forEach(item => {
      if (item.area && !excludedAreas.includes(item.area)) {
        areas.add(item.area);
      }
    });
    return Array.from(areas).sort();
  }, [inventoryList]);

  const handleSearch = (field: string, value: string) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
  };

  // 计算总统计数据
  const calculateTotalStats = () => {
    return filteredList.reduce(
      (acc, curr) => {
        acc.waitingCount += curr.waitingCount;
        acc.rentingCount += curr.rentingCount;
        acc.repairingCount += curr.repairingCount;
        acc.totalCount += curr.totalCount;
        return acc;
      },
      { waitingCount: 0, rentingCount: 0, repairingCount: 0, totalCount: 0 }
    );
  };

  const totalStats = calculateTotalStats();

  // 表格列配置
  const columns: ColumnsType<EquipmentInventoryType> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 80,
    },
    {
      title: '设备类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '高度',
      dataIndex: 'height',
      key: 'height',
      render: (height) => `${height}m`,
    },
    {
      title: '区域',
      dataIndex: 'area',
      key: 'area',
    },
    {
      title: '待租',
      dataIndex: 'waitingCount',
      key: 'waitingCount',
      render: (count) => <Tag color="green">{count}台</Tag>,
    },
    {
      title: '在租',
      dataIndex: 'rentingCount',
      key: 'rentingCount',
      render: (count) => <Tag color="red">{count}台</Tag>,
    },
    {
      title: '维修',
      dataIndex: 'repairingCount',
      key: 'repairingCount',
      render: (count) => <Tag color="gray">{count}台</Tag>,
    },
    {
      title: '合计',
      dataIndex: 'totalCount',
      key: 'totalCount',
      render: (count) => <Tag color="blue">{count}台</Tag>,
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="待租设备" 
              value={totalStats.waitingCount} 
              suffix="台" 
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="在租设备" 
              value={totalStats.rentingCount} 
              suffix="台" 
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="维修设备" 
              value={totalStats.repairingCount} 
              suffix="台" 
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="设备总计" 
              value={totalStats.totalCount} 
              suffix="台" 
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 刷新与状态 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ color: '#8c8c8c' }}>上次更新：{lastUpdated || '—'}</div>
        <Button onClick={fetchInventory} loading={loading} type="default">刷新数据</Button>
      </div>

      {/* 查询条件 */}
      <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Select
            placeholder="区域"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => handleSearch('area', value)}
          >
            {availableAreas.map(area => (
              <Option key={area} value={area}>{area}</Option>
            ))}
          </Select>
          <Input
            placeholder="高度"
            allowClear
            style={{ width: 120 }}
            onChange={(e) => handleSearch('height', e.target.value)}
          />
          <Select
            placeholder="设备类型"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => handleSearch('type', value)}
          >
            <Option value="剪刀车">剪刀车</Option>
            <Option value="直臂车">直臂车</Option>
            <Option value="曲臂车">曲臂车</Option>
          </Select>
          <Search
            placeholder="品牌"
            allowClear
            style={{ width: 180 }}
            onChange={(e) => handleSearch('brand', e.target.value)}
          />
        </div>
      </div>

      {/* 库存列表 */}
      <Table
        columns={columns}
        dataSource={filteredList}
        rowKey={(record) => `${record.type}-${record.height}-${record.area}`}
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无库存数据' }}
      />

      {error && <div style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>{error}</div>}
    </div>
  );
};

export default EquipmentInventory;