import React from 'react';
import { Card, Typography, Row, Col } from 'antd';
import { UserAddOutlined, UserOutlined } from '@ant-design/icons';
import EmployeeList from './EmployeeList';

const { Title, Text } = Typography;

const EmployeesManagement: React.FC = () => {
  return (
    <div className="p-4">
      {/* 页面标题和描述 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col span={24}>
          <Card bordered={false} className="bg-blue-50">
            <Row align="middle">
              <Col span={12}>
                <Title level={4} className="mb-2 flex items-center">
                  <UserAddOutlined className="mr-2" />
                  员工管理
                </Title>
                <Text type="secondary">
                  管理公司员工信息，包括新增、编辑和删除员工，查看员工详细信息。
                </Text>
              </Col>
              <Col span={12} className="text-right">
                <Text type="success">
                  <UserOutlined className="mr-1" />
                  员工管理系统
                </Text>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      
      {/* 员工列表 */}
      <EmployeeList />
    </div>
  );
};

export default EmployeesManagement;