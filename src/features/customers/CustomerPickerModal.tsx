import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal, Input, Table, Button, Space, Tag, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch, RootState } from '../../app/store';
import { Customer, EnterpriseCustomer, addCustomer } from './customerSlice';
import AddCustomerModal from './AddCustomerModal';
import { useTabs } from '../common/TabsContext';

interface CustomerPickerModalProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (customer: Customer) => void;
}

const CustomerPickerModal: React.FC<CustomerPickerModalProps> = ({ visible, onCancel, onSelect }) => {
  const dispatch = useDispatch<AppDispatch>();
  const customers = useSelector((state: RootState) => state.customers.customers);
  const { openTab, closeTab } = useTabs();

  const [nameKeyword, setNameKeyword] = useState<string>('');
  const [phoneKeyword, setPhoneKeyword] = useState<string>('');

  const normalize = (val?: string) => (val || '').toLowerCase().trim();

  const getDisplayName = (c: Customer) => c.type === 'enterprise' ? ((c as EnterpriseCustomer).companyName || (c as any).name) : (c as any).name;
  const getPhones = (c: Customer) => {
    if (c.type === 'enterprise') {
      const ec = c as EnterpriseCustomer;
      return (ec.contacts || []).map(ct => ct.phone).filter(Boolean);
    }
    return [(c as any).phone].filter(Boolean);
  };

  const filtered = useMemo(() => {
    const nk = normalize(nameKeyword);
    const pk = normalize(phoneKeyword);
    return customers.filter(c => {
      const nameMatch = nk ? normalize(getDisplayName(c)).includes(nk) : true;
      const phones = getPhones(c).map(p => normalize(p));
      const phoneMatch = pk ? phones.some(p => p.includes(pk)) : true;
      return nameMatch && phoneMatch;
    });
  }, [customers, nameKeyword, phoneKeyword]);

  const columns: ColumnsType<Customer> = [
    {
      title: '客户名称',
      dataIndex: 'name',
      render: (_, record) => getDisplayName(record),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (t) => <Tag color={t === 'enterprise' ? 'blue' : 'green'}>{t === 'enterprise' ? '企业' : '个人'}</Tag>,
    },
    {
      title: '电话',
      dataIndex: 'phone',
      width: 160,
      render: (_, record) => {
        const phones = getPhones(record);
        return phones.length ? phones[0] : '-';
      }
    },
    {
      title: '地区',
      dataIndex: 'region',
      width: 120,
    },
    {
      title: '业务负责人',
      dataIndex: 'businessManager',
      width: 120,
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 120,
      render: (_, record) => (
        <Button type="link" onClick={() => onSelect(record)}>选择</Button>
      )
    }
  ];

  const handleAddCustomer = () => {
    const tabKey = `customer-add-${Date.now()}`;
    openTab({
      key: tabKey,
      label: '新增客户',
      content: (
        <AddCustomerModal
          visible={true}
          customer={null}
          onCancel={() => closeTab(tabKey)}
          onSuccess={(customerData: Customer) => {
            // 将新增客户持久化到后端，并写入到 Redux
            (dispatch as any)(addCustomer(customerData)).then((created: Customer) => {
              // 如果 thunk 返回了创建对象，直接选择它；否则回退到基于内容匹配
              let chosen: Customer | undefined = created;
              if (!chosen) {
                const name = getDisplayName(customerData);
                const phoneSet = new Set(getPhones(customerData));
                const latest = (customers || []).slice(-20); // 简单缩小匹配范围
                chosen = latest.find(c => getDisplayName(c) === name || getPhones(c).some(p => phoneSet.has(p)));
              }
              if (chosen) {
                onSelect(chosen);
              }
              closeTab(tabKey);
            });
          }}
        />
      )
    });
  };

  return (
    <Modal
      title="选择客户"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      destroyOnHidden
    >
      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="按客户名称检索（模糊）"
          value={nameKeyword}
          onChange={(e) => setNameKeyword(e.target.value)}
          allowClear
          style={{ width: 260 }}
        />
        <Input
          placeholder="按电话号码检索（模糊）"
          value={phoneKeyword}
          onChange={(e) => setPhoneKeyword(e.target.value)}
          allowClear
          style={{ width: 260 }}
        />
        <Button type="primary" onClick={() => {/* 即时过滤，输入已触发 */}}>搜索</Button>
        <Button onClick={() => { setNameKeyword(''); setPhoneKeyword(''); }}>重置</Button>
        <Button type="dashed" onClick={handleAddCustomer}>新增客户</Button>
      </Space>

      {filtered.length === 0 ? (
        <div style={{ padding: '24px 0' }}>
          <Empty description="未找到匹配的客户">
            <Button type="primary" onClick={handleAddCustomer}>新增客户</Button>
          </Empty>
        </div>
      ) : (
        <Table
          rowKey={(r) => r.id}
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({ onDoubleClick: () => onSelect(record) })}
        />
      )}
    </Modal>
  );
};

export default CustomerPickerModal;