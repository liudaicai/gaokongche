import React from 'react';
import { Card, Empty, Typography } from 'antd';

const { Title } = Typography;

const ReminderCenterTab: React.FC = () => {
  return (
    <div style={{ padding: 16 }}>
      <Title level={4} style={{ marginBottom: 16 }}>提醒中心</Title>
      <Card>
        <Empty description="暂无提醒" />
      </Card>
    </div>
  );
};

export default ReminderCenterTab;