import React, { useState } from 'react';
import { Drawer, Descriptions, Tabs, Button, Space, Tag } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import EquipmentHistory from './EquipmentHistory';
import PartReplacementManager from './PartReplacementManager';
import { renderRentalStatus, mapInsuranceStatus } from '../utils';
// 假设这里我们也可以复用设备维修记录组件，或者简单起见先只放配件更换
// 如果需要通用的维修记录，可以后续集成

interface EquipmentDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  equipment: any; // 使用具体的 Equipment 类型会更好，但为了解耦先用 any
}

const EquipmentDetailDrawer: React.FC<EquipmentDetailDrawerProps> = ({ open, onClose, equipment }) => {
  const [activeTab, setActiveTab] = useState('history');

  if (!equipment) return null;

  // 解析附件
  const renderAttachments = () => {
    let files = [];
    try {
      if (typeof equipment.attachments === 'string') {
        files = JSON.parse(equipment.attachments);
      } else if (Array.isArray(equipment.attachments)) {
        files = equipment.attachments;
      }
    } catch (e) {
      console.warn('Parse attachments failed', e);
    }

    if (files.length === 0) return '无附件';

    return (
      <Space direction="vertical">
        {files.map((file: any, index: number) => (
          <Button 
            key={index} 
            type="link" 
            icon={<DownloadOutlined />} 
            onClick={() => window.open(file.url, '_blank')}
            style={{ padding: 0, height: 'auto' }}
          >
            {file.name || `附件${index + 1}`}
          </Button>
        ))}
      </Space>
    );
  };

  const items = [
    {
      key: 'history',
      label: '设备履历',
      children: <EquipmentHistory equipmentId={equipment.id} />,
    },
    {
      key: 'maintenance',
      label: '维修与配件',
      children: (
        <div>
          {/* 这里主要展示高价值配件更换记录，如需普通维修记录可在此扩展 */}
          <PartReplacementManager equipmentId={equipment.id} equipmentCode={equipment.code} />
        </div>
      ),
    },
  ];

  return (
    <Drawer
      title={`设备详情 - ${equipment.code || equipment.custom_code || '未命名'}`}
      placement="right"
      width={1000}
      onClose={onClose}
      open={open}
    >
      <Descriptions title="基本信息" bordered column={2} size="small">
        <Descriptions.Item label="设备类型">{equipment.type}</Descriptions.Item>
        <Descriptions.Item label="品牌/型号">{equipment.brand || '-'} / {equipment.model || '-'}</Descriptions.Item>
        <Descriptions.Item label="高度">{equipment.height}米</Descriptions.Item>
        <Descriptions.Item label="所在门店">
          {equipment.storeName || equipment.store_name || equipment.warehouse || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="出厂日期">
          {equipment.factoryDate 
            ? dayjs(equipment.factoryDate).format('YYYY-MM-DD') 
            : equipment.production_date 
              ? dayjs(equipment.production_date).format('YYYY-MM-DD')
              : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="采购日期">
          {equipment.purchaseDate 
            ? dayjs(equipment.purchaseDate).format('YYYY-MM-DD')
            : equipment.purchase_date
              ? dayjs(equipment.purchase_date).format('YYYY-MM-DD') 
              : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="保险到期">
          {equipment.policyEndDate ? (
            <Tag color={dayjs(equipment.policyEndDate).isBefore(dayjs()) ? 'red' : 'green'}>
              {dayjs(equipment.policyEndDate).format('YYYY-MM-DD')}
            </Tag>
          ) : equipment.insurance_end_date ? (
            <Tag color={dayjs(equipment.insurance_end_date).isBefore(dayjs()) ? 'red' : 'green'}>
              {dayjs(equipment.insurance_end_date).format('YYYY-MM-DD')}
            </Tag>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="当前状态">
          {renderRentalStatus(equipment.rentalStatus || equipment.rental_status || 'available')}
        </Descriptions.Item>
        <Descriptions.Item label="附件" span={2}>
          {renderAttachments()}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 24 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
      </div>
    </Drawer>
  );
};

export default EquipmentDetailDrawer;


