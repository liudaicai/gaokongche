/**
 * 审批中心 - 汇总页面
 */

import React from 'react';
import { Tabs, Card } from 'antd';
import type { TabsProps } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import ApprovalTodoList from './ApprovalTodoList';
import ApprovalDoneList from './ApprovalDoneList';
import ApprovalInitiatedList from './ApprovalInitiatedList';
import ApprovalConfigPage from './ApprovalConfigPage';

export const ApprovalCenter: React.FC = () => {
  const items: TabsProps['items'] = [
    {
      key: 'todo',
      label: (
        <span>
          <ClockCircleOutlined />
          待办审批
        </span>
      ),
      children: <ApprovalTodoList />,
    },
    {
      key: 'done',
      label: (
        <span>
          <CheckCircleOutlined />
          已办审批
        </span>
      ),
      children: <ApprovalDoneList />,
    },
    {
      key: 'initiated',
      label: (
        <span>
          <FileTextOutlined />
          我发起的
        </span>
      ),
      children: <ApprovalInitiatedList />,
    },
    {
      key: 'config',
      label: (
        <span>
          <SettingOutlined />
          审批配置
        </span>
      ),
      children: <ApprovalConfigPage />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Tabs defaultActiveKey="todo" size="large" items={items} />
      </Card>
    </div>
  );
};

export default ApprovalCenter;
