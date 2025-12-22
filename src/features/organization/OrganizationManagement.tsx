/**
 * 组织管理主页面
 */

import React, { Suspense, lazy } from 'react';
import { Tabs, Card, Spin } from 'antd';
import type { TabsProps } from 'antd';
import { TeamOutlined, UserOutlined, UserAddOutlined } from '@ant-design/icons';
import DepartmentManagement from './DepartmentManagement';
import PositionManagement from './PositionManagement';

const EmployeeList = lazy(() => import('../employees/EmployeeList'));

export const OrganizationManagement: React.FC = () => {
  const items: TabsProps['items'] = [
    {
      key: 'departments',
      label: (
        <span>
          <TeamOutlined />
          部门管理
        </span>
      ),
      children: <DepartmentManagement />,
    },
    {
      key: 'positions',
      label: (
        <span>
          <UserOutlined />
          职务管理
        </span>
      ),
      children: <PositionManagement />,
    },
    {
      key: 'employees',
      label: (
        <span>
          <UserAddOutlined />
          员工管理
        </span>
      ),
      children: (
        <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', padding: '50px' }} />}>
          <EmployeeList />
        </Suspense>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Tabs defaultActiveKey="departments" size="large" items={items} />
      </Card>
    </div>
  );
};

export default OrganizationManagement;
