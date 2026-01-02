/**
 * 设备选择弹窗组件 - 用于保单管理
 */

import React, { useEffect, useState } from 'react';
import { Modal, Input, Table, message, Space, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface DeviceRow {
  id: string | number;
  code: string;
  customCode?: string;
  brand?: string;
  type?: string;
  model?: string;
}

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: (devices: DeviceRow[]) => void;
  initialSelectedIds?: string[];
}

const DeviceSelectModal: React.FC<Props> = ({
  open,
  onCancel,
  onConfirm,
  initialSelectedIds = []
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DeviceRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>(initialSelectedIds);
  // 维护完整的已选设备对象（跨页选择）
  const [selectedDevicesMap, setSelectedDevicesMap] = useState<Map<React.Key, DeviceRow>>(new Map());

  // 当Modal打开时，重置状态并加载数据
  useEffect(() => {
    if (open) {
      setPage(1);
      setSearchKeyword('');
      setSelectedRowKeys(initialSelectedIds);
      setSelectedDevicesMap(new Map()); // 重置已选设备
    }
  }, [open, initialSelectedIds]);

  // 当分页或搜索条件变化时，重新加载数据
  useEffect(() => {
    if (open) {
      fetchDevices();
    }
  }, [open, page, pageSize, searchKeyword]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize
      };

      if (searchKeyword) {
        params.keyword = searchKeyword;
      }

      const queryString = new URLSearchParams(params).toString();
      
      // 直接使用 fetch 获取完整响应（包含 total）
      const url = `/api/equipments?${queryString}`;
      const token = sessionStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const fetchResponse = await fetch(url, { headers });
      const json = await fetchResponse.json();
      
      if (!fetchResponse.ok || json.ok === false) {
        throw new Error(json.error || '获取设备列表失败');
      }
      
      // 后端返回格式：{ ok: true, data: [...], total: 100, page: 1, pageSize: 10 }
      const deviceList: DeviceRow[] = json.data || [];
      const totalCount = json.total || deviceList.length;
      
      setData(deviceList);
      setTotal(Number(totalCount));
    } catch (error: any) {
      message.error(error?.message || '获取设备列表失败');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setPage(1);
  };

  const handleConfirm = () => {
    // 返回所有已选设备（包括其他页的）
    const selectedDevices = Array.from(selectedDevicesMap.values());
    onConfirm(selectedDevices);
  };

  const columns: ColumnsType<DeviceRow> = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: any, __: any, index: number) => (page - 1) * pageSize + index + 1
    },
    {
      title: '出厂编号',
      dataIndex: 'code',
      key: 'code',
      width: 150
    },
    {
      title: '自编号',
      dataIndex: 'customCode',
      key: 'customCode',
      width: 150,
      render: (text: string) => text || '-'
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 120
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 150,
      ellipsis: true
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[], selectedRows: DeviceRow[]) => {
      setSelectedRowKeys(selectedKeys);
      
      // 更新已选设备映射
      const newMap = new Map(selectedDevicesMap);
      
      // 移除当前页中未选中的设备
      data.forEach(device => {
        if (!selectedKeys.includes(device.id)) {
          newMap.delete(device.id);
        }
      });
      
      // 添加当前页中新选中的设备
      selectedRows.forEach(device => {
        newMap.set(device.id, device);
      });
      
      setSelectedDevicesMap(newMap);
    }
  };

  const handleCancel = () => {
    // 关闭时重置状态
    setPage(1);
    setSearchKeyword('');
    setSelectedDevicesMap(new Map());
    onCancel();
  };

  return (
    <Modal
      title="选择投保设备"
      open={open}
      onCancel={handleCancel}
      onOk={handleConfirm}
      width={900}
      okText="确定"
      cancelText="取消"
      destroyOnHidden
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space.Compact style={{ width: 300 }}>
          <Input
            placeholder="搜索出厂编号或自编号"
            allowClear
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
          />
          <Button 
            type="primary" 
            icon={<SearchOutlined />}
            onClick={() => handleSearch(searchKeyword)}
          >
            搜索
          </Button>
        </Space.Compact>

        <div style={{ color: '#666', fontSize: '12px' }}>
          已选择 {selectedDevicesMap.size} 台设备
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize || 10);
            },
            showTotal: (total) => `共 ${total} 台设备`,
            showSizeChanger: true
          }}
          scroll={{ y: 400 }}
        />
      </Space>
    </Modal>
  );
};

export default DeviceSelectModal;

