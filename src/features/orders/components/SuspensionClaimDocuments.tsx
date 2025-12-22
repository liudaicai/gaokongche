import React, { useEffect, useState, useMemo } from 'react';
import { Card, Table, Space, Tag, Typography, Empty, Skeleton, Dropdown, Button, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiGet, apiDelete } from '../../../api/client';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import { fetchOrderById } from '../ordersSlice';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure } from '../../equipment/equipmentslice';
import type { Equipment } from '../../equipment/equipmentslice';
import { useSelector } from 'react-redux';

const { Text } = Typography;

interface SuspensionRecord {
  id: string;
  suspensionNumber?: string;
  contractName?: string;
  suspensionType: string;
  reason?: string;
  startDate: string;
  endDate?: string;
  suspensionDays?: number;
  equipmentSelections?: string[][];
  status?: string;
  createdAt?: string;
}

interface ClaimRecord {
  id: string;
  claimNumber?: string;
  contractName?: string;
  claimAmount: number;
  claimDate: string;
  equipmentSelections?: string[][];
  reason?: string;
  createdAt?: string;
}

interface SuspensionClaimDocumentsProps {
  orderId: string;
  order?: any; // 可选的订单对象，如果提供了可以直接使用其中的数据
}

const SuspensionClaimDocuments: React.FC<SuspensionClaimDocumentsProps> = ({ orderId, order }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [suspensions, setSuspensions] = useState<SuspensionRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const equipmentList = useSelector(selectEquipmentList);

  // 获取设备列表
  useEffect(() => {
    if (!equipmentList || equipmentList.length === 0) {
      dispatch(fetchEquipmentsStart());
      apiGet<Equipment[]>('/equipments')
        .then(list => {
          dispatch(fetchEquipmentsSuccess(list));
        })
        .catch((err: any) => {
          dispatch(fetchEquipmentsFailure(err?.message || '获取设备列表失败'));
        });
    }
  }, [dispatch, equipmentList]);

  // 监听数据变化，输出调试信息
  useEffect(() => {
    console.log('[SuspensionClaimDocuments] 📊 当前状态 - 报停数量:', suspensions.length, '索赔数量:', claims.length);
    if (suspensions.length > 0) {
      console.log('[SuspensionClaimDocuments] 📋 报停数据示例:', suspensions[0]);
    }
    if (claims.length > 0) {
      console.log('[SuspensionClaimDocuments] 📋 索赔数据示例:', claims[0]);
    }
  }, [suspensions, claims]);

  // 建立设备编号到自编号的映射
  const equipmentCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    (equipmentList || []).forEach((eq: Equipment) => {
      if (eq.code) {
        map.set(String(eq.code), eq.customCode || eq.code);
      }
    });
    return map;
  }, [equipmentList]);

  useEffect(() => {
    const fetchData = async () => {
      if (!orderId) {
        console.log('[SuspensionClaimDocuments] 订单ID为空，跳过数据获取');
        setLoading(false);
        return;
      }

      console.log('[SuspensionClaimDocuments] 🔄 开始获取数据，订单ID:', orderId);
      setLoading(true);

      try {
        // 获取报停记录
        try {
          console.log('[SuspensionClaimDocuments] 📞 调用API: /orders/' + orderId + '/suspensions');
          const suspensionsResponse = await apiGet<SuspensionRecord[]>(`/orders/${orderId}/suspensions`);
          console.log('[SuspensionClaimDocuments] ✅ 报停记录API响应:', suspensionsResponse);
          console.log('[SuspensionClaimDocuments] 响应类型:', typeof suspensionsResponse, '是否为数组:', Array.isArray(suspensionsResponse));
          
          // apiGet 已经自动提取了 data 字段，所以 suspensionsResponse 应该直接是数组
          const suspensionsData = Array.isArray(suspensionsResponse) 
            ? suspensionsResponse 
            : [];
          
          console.log('[SuspensionClaimDocuments] 📊 处理后的报停数据:', suspensionsData);
          console.log('[SuspensionClaimDocuments] 📊 报停数据数量:', suspensionsData?.length || 0);
          
          if (suspensionsData.length > 0) {
            console.log('[SuspensionClaimDocuments] 📋 第一条报停记录:', suspensionsData[0]);
          }
          
          setSuspensions(suspensionsData);
        } catch (suspError: any) {
          console.error('[SuspensionClaimDocuments] ❌ 获取报停记录失败:', suspError);
          console.error('[SuspensionClaimDocuments] 错误详情:', suspError?.message, suspError);
          setSuspensions([]);
        }

        // 获取索赔记录（始终调用API获取最新数据）
        try {
          console.log('[SuspensionClaimDocuments] 📞 调用API: /orders/' + orderId + '/claims');
          const claimsResponse = await apiGet<ClaimRecord[]>(`/orders/${orderId}/claims`);
          console.log('[SuspensionClaimDocuments] ✅ 索赔记录API响应:', claimsResponse);
          console.log('[SuspensionClaimDocuments] 响应类型:', typeof claimsResponse, '是否为数组:', Array.isArray(claimsResponse));
          
          // apiGet 已经自动提取了 data 字段，所以 claimsResponse 应该直接是数组
          const claimsData = Array.isArray(claimsResponse) 
            ? claimsResponse 
            : [];
          
          console.log('[SuspensionClaimDocuments] 📊 处理后的索赔数据:', claimsData);
          console.log('[SuspensionClaimDocuments] 📊 索赔数据数量:', claimsData?.length || 0);
          
          if (claimsData.length > 0) {
            console.log('[SuspensionClaimDocuments] 📋 第一条索赔记录:', claimsData[0]);
          }
          
          setClaims(claimsData);
        } catch (claimError: any) {
          console.error('[SuspensionClaimDocuments] ❌ 获取索赔记录失败:', claimError);
          console.error('[SuspensionClaimDocuments] 错误详情:', claimError?.message, claimError);
          setClaims([]);
        }
      } catch (error: any) {
        console.error('[SuspensionClaimDocuments] ❌ 获取数据异常:', error);
        // 即使出错也设置为空数组，确保UI能正常显示
        setSuspensions([]);
        setClaims([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId, order]);

  // 刷新数据
  const refreshData = async () => {
    try {
      const suspensionsData = await apiGet<SuspensionRecord[]>(`/orders/${orderId}/suspensions`);
      setSuspensions(Array.isArray(suspensionsData) ? suspensionsData : []);

      const claimsData = await apiGet<ClaimRecord[]>(`/orders/${orderId}/claims`);
      setClaims(Array.isArray(claimsData) ? claimsData : []);
      
      // 刷新订单详情
      dispatch(fetchOrderById(orderId));
    } catch (error: any) {
      console.error('[SuspensionClaimDocuments] Refresh error:', error);
    }
  };

  // 获取设备自编号（多个用/分隔）
  const getEquipmentCustomCodes = (equipmentCodes: string[]): string => {
    if (!equipmentCodes || equipmentCodes.length === 0) return '—';
    const customCodes = equipmentCodes
      .map(code => {
        const codeStr = String(code || '').trim();
        if (!codeStr) return null;
        return equipmentCodeMap.get(codeStr) || codeStr;
      })
      .filter((code): code is string => Boolean(code));
    return customCodes.length > 0 ? customCodes.join(' / ') : '—';
  };

  // 处理报停删除
  const handleDeleteSuspension = async (record: SuspensionRecord) => {
    try {
      await apiDelete(`/orders/${orderId}/suspensions/${record.id}`);
      message.success('报停记录已删除');
      refreshData();
    } catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  // 处理报停下载
  const handleDownloadSuspension = (record: SuspensionRecord) => {
    // TODO: 实现下载功能
    message.info('下载功能待实现');
  };

  // 处理报停编辑
  const handleEditSuspension = (record: SuspensionRecord) => {
    // TODO: 实现编辑功能
    message.info('编辑功能待实现');
  };

  // 处理索赔删除
  const handleDeleteClaim = async (record: ClaimRecord) => {
    try {
      await apiDelete(`/orders/${orderId}/claims/${record.id}`);
      message.success('索赔记录已删除');
      refreshData();
    } catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  // 处理索赔下载
  const handleDownloadClaim = (record: ClaimRecord) => {
    // TODO: 实现下载功能
    message.info('下载功能待实现');
  };

  // 处理索赔编辑
  const handleEditClaim = (record: ClaimRecord) => {
    // TODO: 实现编辑功能
    message.info('编辑功能待实现');
  };

  const suspensionColumns: ColumnsType<SuspensionRecord> = [
    {
      title: '报停单号',
      dataIndex: 'suspensionNumber',
      key: 'suspensionNumber',
      render: (text) => text || '—'
    },
    {
      title: '报停起止日期',
      key: 'dateRange',
      render: (_: any, record: SuspensionRecord) => {
        try {
          const start = record.startDate 
            ? (dayjs(record.startDate).isValid() 
                ? dayjs(record.startDate).format('YYYY-MM-DD') 
                : String(record.startDate).slice(0, 10))
            : '—';
          const end = record.endDate 
            ? (dayjs(record.endDate).isValid() 
                ? dayjs(record.endDate).format('YYYY-MM-DD') 
                : String(record.endDate).slice(0, 10))
            : '—';
          return `${start} 至 ${end}`;
        } catch (e) {
          return '—';
        }
      }
    },
    {
      title: '报停设备',
      dataIndex: 'equipmentSelections',
      key: 'equipmentSelections',
      render: (selections: any) => {
        if (!selections) return '—';
        try {
          // 处理各种可能的数据格式
          let allCodes: string[] = [];
          if (Array.isArray(selections)) {
            if (selections.length === 0) return '—';
            // 如果是二维数组 [[code1, code2], [code3]]
            if (Array.isArray(selections[0])) {
              allCodes = selections.flat();
            } else {
              // 如果是一维数组 [code1, code2]
              allCodes = selections;
            }
          }
          return getEquipmentCustomCodes(allCodes);
        } catch (e) {
          return '—';
        }
      }
    },
    {
      title: '报停原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => text || '—'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: SuspensionRecord) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => handleEditSuspension(record)
          },
          {
            key: 'delete',
            label: (
              <Popconfirm
                title="确认删除"
                description="确定要删除这条报停记录吗？"
                onConfirm={() => handleDeleteSuspension(record)}
                okText="确定"
                cancelText="取消"
              >
                <span>删除</span>
              </Popconfirm>
            ),
            icon: <DeleteOutlined />,
            danger: true
          },
          {
            key: 'download',
            label: '下载',
            icon: <DownloadOutlined />,
            onClick: () => handleDownloadSuspension(record)
          }
        ];

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['hover']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  const claimColumns: ColumnsType<ClaimRecord> = [
    {
      title: '索赔单号',
      dataIndex: 'claimNumber',
      key: 'claimNumber',
      render: (text) => text || '—'
    },
    {
      title: '索赔设备',
      dataIndex: 'equipmentSelections',
      key: 'equipmentSelections',
      render: (selections: any) => {
        if (!selections) return '—';
        try {
          // 处理各种可能的数据格式
          let allCodes: string[] = [];
          if (Array.isArray(selections)) {
            if (selections.length === 0) return '—';
            // 如果是二维数组 [[code1, code2], [code3]]
            if (Array.isArray(selections[0])) {
              allCodes = selections.flat();
            } else {
              // 如果是一维数组 [code1, code2]
              allCodes = selections;
            }
          }
          return getEquipmentCustomCodes(allCodes);
        } catch (e) {
          return '—';
        }
      }
    },
    {
      title: '索赔原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => text || '—'
    },
    {
      title: '索赔金额',
      dataIndex: 'claimAmount',
      key: 'claimAmount',
      render: (amount: any) => {
        const numAmount = Number(amount || 0);
        return `¥${numAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: ClaimRecord) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => handleEditClaim(record)
          },
          {
            key: 'delete',
            label: (
              <Popconfirm
                title="确认删除"
                description="确定要删除这条索赔记录吗？"
                onConfirm={() => handleDeleteClaim(record)}
                okText="确定"
                cancelText="取消"
              >
                <span>删除</span>
              </Popconfirm>
            ),
            icon: <DeleteOutlined />,
            danger: true
          },
          {
            key: 'download',
            label: '下载',
            icon: <DownloadOutlined />,
            onClick: () => handleDownloadClaim(record)
          }
        ];

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['hover']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  if (loading) {
    return <Skeleton active />;
  }

  console.log('[SuspensionClaimDocuments] 🎨 渲染组件 - 报停数量:', suspensions.length, '索赔数量:', claims.length);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {/* 报停单据 */}
      <Card 
        title={`报停单据${suspensions.length > 0 ? ` (${suspensions.length})` : ''}`}
        size="small"
        styles={{ body: { background: '#fff7e6' } }}
      >
        <Table<SuspensionRecord>
          size="small"
          rowKey={(r) => r.id || String(Math.random())}
          columns={suspensionColumns}
          dataSource={suspensions}
          pagination={suspensions.length > 0 ? { pageSize: 10 } : false}
          locale={{ emptyText: '暂无报停单据' }}
        />
      </Card>

      {/* 索赔单据 */}
      <Card 
        title={`索赔单据${claims.length > 0 ? ` (${claims.length})` : ''}`}
        size="small"
        styles={{ body: { background: '#fff1f0' } }}
      >
        <Table<ClaimRecord>
          size="small"
          rowKey={(r) => r.id || String(Math.random())}
          columns={claimColumns}
          dataSource={claims}
          pagination={claims.length > 0 ? { pageSize: 10 } : false}
          locale={{ emptyText: '暂无索赔单据' }}
        />
      </Card>
    </Space>
  );
};

export default SuspensionClaimDocuments;

