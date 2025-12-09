import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Layout, Menu, Tabs, message, Avatar, Dropdown, Typography, theme, Space, Badge, Button, Tooltip } from 'antd';
import { logout } from './features/user/authSlice';
import type { RootState, AppDispatch } from './app/store';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UserOutlined,
  DatabaseOutlined,
  TruckOutlined,
  UserAddOutlined,
  ShopOutlined,
  SwapOutlined,
  AppstoreOutlined,
  HomeOutlined,
  CustomerServiceOutlined,
  CloseOutlined,
  LogoutOutlined,
  FileDoneOutlined,
  BellOutlined,
  DollarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { ProfileOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
import './App.css'; // 保留原有CSS，但主要样式由 index.css 和 theme 覆盖
import { TabsContext } from './features/common/TabsContext';
import { initRealtime } from './realtime/realtime';

// Lazy Loads
const CustomerList = lazy(() => import('./features/customers/CustomerList'));
const EquipmentProfile = lazy(() => import('./features/equipment/EquipmentProfile'));
const EquipmentInventory = lazy(() => import('./features/equipment/EquipmentInventory'));
const EquipmentTransfer = lazy(() => import('./features/equipment/EquipmentTransfer'));
const LogisticsManagement = lazy(() => import('./features/logistics/LogisticsManagement'));
const LogisticsLedger = lazy(() => import('./features/logistics/LogisticsLedger'));
const LogisticsLedgerPage = lazy(() => import('./features/logistics/LogisticsLedgerPage'));
const EmployeeList = lazy(() => import('./features/employees/EmployeeList'));
const StoreList = lazy(() => import('./features/stores/StoreList'));
const CompanyVerificationList = lazy(() => import('./features/stores/CompanyVerification'));
const OrderList = lazy(() => import('./features/orders/OrderList'));
const TemplateManagement = lazy(() => import('./features/templates/TemplateManagement'));
const TemplateMapping = lazy(() => import('./features/templates/TemplateMapping'));
const ModelManagement = lazy(() => import('./features/equipment/ModelManagement'));
const EquipmentRepairsPage = lazy(() => import('./features/repairs/EquipmentRepairsPage'));
const AccessoriesManagement = lazy(() => import('./features/accessories/components/AccessoriesManagement'));
const SmartAccessoryFinder = lazy(() => import('./features/accessories/components/SmartAccessoryFinder'));
const FinanceManagement = lazy(() => import('./features/finance/components/FinanceManagement'));
const PolicyManagement = lazy(() => import('./features/policies/components/PolicyManagement'));
const SubleaseCompanyPage = lazy(() => import('./features/sublease/SubleaseCompanyPage'));
const SubleaseEquipmentPage = lazy(() => import('./features/sublease/SubleaseEquipmentPage'));
const SubleaseCreatePage = lazy(() => import('./features/sublease/SubleaseCreatePage'));
const CompaniesManagement = lazy(() => import('./features/companies/CompaniesManagement'));

const { Sider, Content, Header } = Layout;

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [collapsed, setCollapsed] = useState(false);

  // 使用 Token 获取主题变量
  const {
    token: { colorBgContainer, colorBgLayout },
  } = theme.useToken();

  // Tabs 状态管理
  const loadTabsFromStorage = () => {
    try {
      const savedTabs = localStorage.getItem('app_tabs');
      const savedActiveKey = localStorage.getItem('app_active_tab');
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs);
        return {
          tabs: Array.isArray(parsedTabs) && parsedTabs.length > 0
            ? parsedTabs
            : [{ key: 'home', label: '首页', closable: false }],
          activeKey: savedActiveKey || 'home'
        };
      }
    } catch (e) {
      console.error('[App] 恢复标签状态失败:', e);
    }
    return { tabs: [{ key: 'home', label: '首页', closable: false }], activeKey: 'home' };
  };

  const initialState = loadTabsFromStorage();
  const [current, setCurrent] = useState(initialState.activeKey);
  const [activeTabKey, setActiveTabKey] = useState(initialState.activeKey);
  const [tabs, setTabs] = useState(initialState.tabs);
  const [dynamicTabContents, setDynamicTabContents] = useState<Record<string, React.ReactNode>>({});
  const [historyStack, setHistoryStack] = useState<string[]>(['/?tab=' + initialState.activeKey]);

  const tabKeyToUrl = (key: string) => `/?tab=${encodeURIComponent(key)}`;

  const getTabLabelByKey = (key: string): string => {
    // ... (保持原有映射逻辑不变，为了简洁省略部分重复代码，实际运行时需要完整映射)
    const map: Record<string, string> = {
      'home': '首页',
      'customerList': '客户管理',
      'equipmentProfile': '设备档案',
      'equipmentInventory': '设备库存',
      'equipmentTransfer': '设备调拨',
      'accessoriesManagement': '配件档案',
      'accessoryFinder': '智能配件查找',
      'modelManagement': '型号管理',
      'financeManagement': '财务管理',
      'policyManagement': '设备保单',
      'logisticsList': '物流管理',
      'logisticsLedger': '物流台账',
      'employeeList': '员工管理',
      'storeList': '门店管理',
      'companyVerificationList': '公司认证',
      'companiesManagement': '公司管理',
      'subleaseCompanyList': '转租公司',
      'subleaseEquipmentList': '转租设备',
      'sublease-create': '新增转租',
      'toolList': '业务工具',
      'templateManagement': '模板管理',
      'templateMapping': '模板映射',
      'orderList': '订单管理',
      'reminderCenter': '提醒中心',
      'equipmentRepairs': '设备维修'
    };
    return map[key] || '未命名';
  };

  const pushCurrentToHistory = () => {
    const currentUrl = tabKeyToUrl(activeTabKey);
    setHistoryStack(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === currentUrl) return prev;
      return [...prev, currentUrl];
    });
  };

  const navigateToTabKey = (key: string, pushPrev: boolean) => {
    if (pushPrev) pushCurrentToHistory();
    const url = tabKeyToUrl(key);
    navigate(url);
    setActiveTabKey(key);
    setCurrent(key);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      navigate('/login', { replace: true });
    } catch (error) {
      message.error('退出登录失败');
    }
  };

  const handleMenuClick = (e: { key: string }) => {
    setCurrent(e.key);
    const tabExists = tabs.find(tab => tab.key === e.key);
    if (!tabExists) {
      const tabLabel = getTabLabelByKey(e.key);
      setTabs([...tabs, { key: e.key, label: tabLabel, closable: true }]);
    }
    navigateToTabKey(e.key, true);
  };

  const handleTabChange = (key: string) => {
    navigateToTabKey(key, true);
    localStorage.setItem('app_active_tab', key);
  };

  const openTab = ({ key, label, content }: { key: string; label: string; content: React.ReactNode }) => {
    const exists = tabs.find(tab => tab.key === key);
    const newTabs = exists ? tabs : [...tabs, { key, label, closable: true }];
    if (!exists) {
      setTabs(newTabs);
      localStorage.setItem('app_tabs', JSON.stringify(newTabs));
    }
    setDynamicTabContents(prev => ({ ...prev, [key]: content }));
    navigateToTabKey(key, true);
    localStorage.setItem('app_active_tab', key);
  };

  const closeTab = (key: string) => {
    if (key === 'home') return;
    const newTabs = tabs.filter(tab => tab.key !== key);
    setTabs(newTabs);
    localStorage.setItem('app_tabs', JSON.stringify(newTabs));
    setDynamicTabContents(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
    if (key === activeTabKey) {
      const nextStack = [...historyStack];
      const popped = nextStack.pop();
      const targetUrl = popped || '/?tab=home';
      setHistoryStack(nextStack);
      const search = targetUrl.split('?')[1] || '';
      const params = new URLSearchParams(search);
      const targetKey = params.get('tab') || 'home';
      // 简单处理：如果目标不存在则去首页
      const exists = newTabs.find(t => t.key === targetKey);
      const finalKey = exists ? targetKey : 'home';
      setActiveTabKey(finalKey);
      setCurrent(finalKey);
      navigate(exists ? targetUrl : '/?tab=home');
    }
  };

  useEffect(() => {
    // 简单清理逻辑，保持不变
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') || 'home';
    if (tab !== activeTabKey) {
      const exists = tabs.find(t => t.key === tab);
      if (exists) {
        setActiveTabKey(tab);
        setCurrent(tab);
      }
    }
  }, [location.search]);

  useEffect(() => {
    const stop = initRealtime();
    return () => { stop?.(); message.destroy(); };
  }, []);

  const getTabComponent = (key: string) => {
    // 映射逻辑保持不变，直接复用原有的 switch-case
    // 为了代码简洁，这里直接调用原有的映射
    switch (key) {
      case 'home':
        return (
          <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
              <Title level={2} style={{ margin: 0 }}>欢迎回来，{user?.username}</Title>
              <Text type="secondary">今天是 {new Date().toLocaleDateString()}</Text>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              {/* Dashboard Cards */}
              <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Text type="secondary">设备总数</Text>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1677ff', marginTop: 8 }}>100</div>
              </div>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Text type="secondary">客户总数</Text>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a', marginTop: 8 }}>50</div>
              </div>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Text type="secondary">待处理订单</Text>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#faad14', marginTop: 8 }}>12</div>
              </div>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Text type="secondary">今日租赁</Text>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#eb2f96', marginTop: 8 }}>5</div>
              </div>
            </div>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <Title level={4}>最近活动</Title>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
                {[
                  '用户 admin 登录系统',
                  '设备 ID-001 状态更新为可出租',
                  '客户 ABC公司 创建新订单',
                  '配件库存更新',
                  '系统维护任务完成'
                ].map((item, i) => (
                  <li key={i} style={{ padding: '12px 0', borderBottom: i < 4 ? '1px solid #f0f0f0' : 'none', color: '#666' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      case 'customerList': return <CustomerList />;
      case 'equipmentProfile': return <EquipmentProfile />;
      case 'equipmentInventory': return <EquipmentInventory />;
      case 'equipmentTransfer': return <EquipmentTransfer />;
      case 'accessoriesManagement': return <AccessoriesManagement />;
      case 'accessoryFinder': return <SmartAccessoryFinder />;
      case 'modelManagement': return <ModelManagement />;
      case 'financeManagement': return <FinanceManagement />;
      case 'policyManagement': return <PolicyManagement />;
      case 'logisticsList': return <LogisticsManagement />;
      case 'logisticsLedger': return <LogisticsLedgerPage />;
      case 'employeeList': return <EmployeeList />;
      case 'storeList': return <StoreList />;
      case 'companyVerificationList': return <CompanyVerificationList />;
      case 'companiesManagement': return <CompaniesManagement />;
      case 'subleaseCompanyList': return <SubleaseCompanyPage />;
      case 'subleaseEquipmentList': return <SubleaseEquipmentPage />;
      case 'sublease-create': return <SubleaseCreatePage />;
      case 'orderList': return <OrderList />;
      case 'templateManagement': return <TemplateManagement />;
      case 'templateMapping': return <TemplateMapping />;
      case 'equipmentRepairs': return <EquipmentRepairsPage />;
      case 'reminderCenter': return <div style={{ padding: 24 }}>提醒中心开发中...</div>;
      default: return <div>功能开发中</div>;
    }
  };

  const renderTabContent = (key: string) => (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="loading-spinner" style={{
          width: '30px', height: '30px', border: '2px solid #eee', borderTop: '2px solid #1677ff', borderRadius: '50%', animation: 'spin 1s linear infinite'
        }} />
      </div>
    }>
      {/* 移除 site-layout-background 包装，让每个页面自己控制卡片 */}
      <div style={{ minHeight: '100%', position: 'relative' }}>
        {dynamicTabContents[key] ?? getTabComponent(key)}
      </div>
    </Suspense>
  );

  // 检查是否是超级管理员
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'super_admin';

  // 菜单数据 (保持不变)
  const baseMenuItems = [
    { key: 'home', icon: <HomeOutlined />, label: '首页' },
    { key: 'customers', icon: <CustomerServiceOutlined />, label: '客户管理', children: [{ key: 'customerList', label: '客户列表' }] },
    {
      key: 'equipment', icon: <DatabaseOutlined />, label: '设备管理', children: [
        { key: 'equipmentProfile', label: '设备档案' },
        { key: 'equipmentInventory', label: '设备库存' },
        { key: 'equipmentTransfer', label: '设备调拨' },
        { key: 'accessoriesManagement', label: '配件档案' },
        { key: 'accessoryFinder', label: '智能配件查找' },
        { key: 'modelManagement', label: '型号管理' },
        { key: 'equipmentRepairs', label: '设备维修' },
        { key: 'policyManagement', label: '设备保单' },
      ]
    },
    { key: 'orders', icon: <FileDoneOutlined />, label: '订单管理', children: [{ key: 'orderList', label: '订单列表' }] },
    { key: 'logistics', icon: <TruckOutlined />, label: '物流管理', children: [{ key: 'logisticsList', label: '物流列表' }, { key: 'logisticsLedger', label: '物流台账' }] },
    { key: 'finance', icon: <DollarOutlined />, label: '财务管理', children: [{ key: 'financeManagement', label: '财务总览' }] },
    { key: 'employees', icon: <UserAddOutlined />, label: '员工管理', children: [{ key: 'employeeList', label: '员工列表' }] },
    { key: 'stores', icon: <ShopOutlined />, label: '门店管理', children: [{ key: 'storeList', label: '门店列表' }, { key: 'companyVerificationList', label: '公司认证' }] },
    { key: 'sublease', icon: <SwapOutlined />, label: '转租管理', children: [{ key: 'subleaseCompanyList', label: '转租公司' }, { key: 'subleaseEquipmentList', label: '转租设备' }] },
    { key: 'templates', icon: <ProfileOutlined />, label: '模板管理', children: [{ key: 'templateManagement', label: '模板管理' }, { key: 'templateMapping', label: '模板映射' }] },
    { key: 'reminders', icon: <BellOutlined />, label: '提醒中心', children: [{ key: 'reminderCenter', label: '提醒中心' }] },
  ];

  // 超级管理员菜单
  const superAdminMenuItems = isSuperAdmin ? [
    { key: 'system', icon: <SettingOutlined />, label: '系统管理', children: [{ key: 'companiesManagement', label: '公司管理' }] },
  ] : [];

  const menuItems = [...baseMenuItems, ...superAdminMenuItems];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)'
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: '#002140',
          transition: 'all 0.3s',
          padding: collapsed ? '8px' : '12px'
        }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transition: 'all 0.3s'
            }}
          />
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[current]}
          onClick={handleMenuClick}
          items={menuItems}
          style={{ height: 'calc(100vh - 64px)', overflowY: 'auto', borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s', background: colorBgLayout }}>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', cursor: 'pointer', transition: 'color 0.3s' }
            })}
            <Typography.Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1677ff' }}>
              {user?.companyName || '高空车租赁管理系统'}
            </Typography.Title>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Tooltip title="帮助文档">
              <QuestionCircleOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#666' }} />
            </Tooltip>
            <Tooltip title="消息通知">
              <Badge count={5} size="small">
                <BellOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#666' }} />
              </Badge>
            </Tooltip>
            <Dropdown
              menu={{
                items: [
                  { key: 'setting', label: '个人设置', icon: <SettingOutlined /> },
                  { type: 'divider' },
                  { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, onClick: handleLogout }
                ]
              }}
              placement="bottomRight"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, transition: 'background 0.3s' }} className="user-dropdown-trigger">
                <Avatar style={{ backgroundColor: '#1677ff', verticalAlign: 'middle' }} icon={<UserOutlined />} size="small" />
                <span style={{ color: '#333', fontWeight: 500 }}>{user?.name || user?.username || '管理员'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 0, overflow: 'hidden' }}>
          <TabsContext.Provider value={{ openTab, closeTab }}>
            <Tabs
              className="modern-tabs"
              activeKey={activeTabKey}
              onChange={handleTabChange}
              type="editable-card"
              hideAdd
              tabBarStyle={{ margin: 0, paddingLeft: 16, paddingTop: 8, background: '#fff' }}
              onEdit={(targetKey, action) => {
                if (action === 'remove') closeTab(targetKey as string);
              }}
              items={tabs.map(tab => ({
                key: tab.key,
                label: tab.label,
                closable: tab.closable,
                children: renderTabContent(tab.key)
              }))}
            />
          </TabsContext.Provider>
        </Content>
      </Layout>
    </Layout>
  );
}
