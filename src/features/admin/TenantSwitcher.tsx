/**
 * 租户切换器组件
 * 仅超级管理员可见
 * 功能：切换查看不同租户的数据
 */
import React, { useEffect, useState } from 'react';
import { Select, Card, Space, Typography, Divider } from 'antd';
import { GlobalOutlined, TeamOutlined } from '@ant-design/icons';
import { apiGet } from '../../api/client';

const { Option } = Select;
const { Text } = Typography;

interface Company {
  id: string;
  companyName: string;
}

interface TenantSwitcherProps {
  style?: React.CSSProperties;
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({ style }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 加载公司列表
  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Company[]>('/stores/company-verifications');
      setCompanies(data || []);
    } catch (error) {
      console.error('加载公司列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    
    // 检查是否有已设置的租户切换
    const savedTenant = sessionStorage.getItem('tenant-override');
    if (savedTenant && savedTenant !== 'null') {
      setCurrentTenant(savedTenant);
    }
  }, []);

  // 切换租户
  const handleSwitch = (tenantId: string | null) => {
    if (tenantId === null || tenantId === 'null') {
      // 清除租户切换
      sessionStorage.removeItem('tenant-override');
      setCurrentTenant(null);
    } else {
      // 设置租户切换
      sessionStorage.setItem('tenant-override', tenantId);
      setCurrentTenant(tenantId);
    }
    
    // 刷新页面以应用新的租户过滤
    window.location.reload();
  };

  return (
    <Card 
      size="small" 
      style={{ 
        margin: 16, 
        background: '#f0f5ff', 
        borderColor: '#1890ff',
        ...style 
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <GlobalOutlined /> 当前查看租户:
        </Text>
        <Select
          value={currentTenant || 'ALL_TENANTS'}
          onChange={(value) => handleSwitch(value === 'ALL_TENANTS' ? null : value)}
          style={{ width: '100%' }}
          placeholder="切换租户视角"
          loading={loading}
        >
          <Option key="ALL_TENANTS" value="ALL_TENANTS">
            <Space>
              <GlobalOutlined style={{ color: '#52c41a' }} />
              <span>全部租户</span>
            </Space>
          </Option>
          {companies.map(company => (
            <Option key={company.id} value={company.id}>
              <Space>
                <TeamOutlined style={{ color: '#1890ff' }} />
                <span>{company.companyName}</span>
              </Space>
            </Option>
          ))}
        </Select>
        {currentTenant && (
          <Text type="warning" style={{ fontSize: 12 }}>
            ⚠️ 当前正在查看特定租户数据
          </Text>
        )}
      </Space>
    </Card>
  );
};

export default TenantSwitcher;
