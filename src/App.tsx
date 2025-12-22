import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Layout, Menu, Tabs, message, Avatar, Dropdown, Typography, theme, Space, Badge, Button, Tooltip, Modal, Form, Input, App as AntApp } from 'antd';
import { logout } from './features/user/authSlice';
import type { RootState, AppDispatch } from './app/store';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './components/common/Logo';
import * as sessionManager from './utils/sessionManager';
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
  QuestionCircleOutlined,
  ShoppingCartOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  TeamOutlined
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
const StoreList = lazy(() => import('./features/stores/StoreList'));
const CompanyVerificationList = lazy(() => import('./features/stores/CompanyVerification'));
const OrderList = lazy(() => import('./features/orders/OrderList'));
const TemplateManagement = lazy(() => import('./features/templates/TemplateManagement'));
const TemplateMapping = lazy(() => import('./features/templates/TemplateMapping'));
const ModelManagement = lazy(() => import('./features/equipment/ModelManagement'));
const PartsManagement = lazy(() => import('./features/parts/PartsManagement'));
const EquipmentRepairsPage = lazy(() => import('./features/repairs/EquipmentRepairsPage'));
const FinanceManagement = lazy(() => import('./features/finance/components/FinanceManagement'));
const PolicyManagement = lazy(() => import('./features/policies/components/PolicyManagement'));
const SubleaseCompanyPage = lazy(() => import('./features/sublease/SubleaseCompanyPage'));
const SubleaseEquipmentPage = lazy(() => import('./features/sublease/SubleaseEquipmentPage'));
const SubleaseCreatePage = lazy(() => import('./features/sublease/SubleaseCreatePage'));
// const CompaniesManagement = lazy(() => import('./features/companies/CompaniesManagement')); // 已禁用公司管理
const ReminderCenter = lazy(() => import('./features/reminders/components/ReminderCenter'));
const UserSettingsPage = lazy(() => import('./features/reminders/components/UserSettingsPage'));
const PartReplacementManager = lazy(() => import('./features/equipment/components/PartReplacementManager'));
const EquipmentUsageAnalysis = lazy(() => import('./features/equipment/components/EquipmentUsageAnalysis'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const PurchasesPage = lazy(() => import('./features/purchases/PurchasesPage'));
const RolePermissionManager = lazy(() => import('./features/permissions/RolePermissionManager'));
const UserPermissionManager = lazy(() => import('./features/permissions/UserPermissionManager'));
const ApprovalCenter = lazy(() => import('./features/approvals/ApprovalCenter'));
const OrganizationManagement = lazy(() => import('./features/organization/OrganizationManagement'));
const EquipmentRentStatsPage = lazy(() => import('./features/equipment-stats/EquipmentRentStatsPage'));

const { Sider, Content, Header } = Layout;

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const unreadCount = useSelector((state: RootState) => state.reminders?.unreadCount || 0);
  const [collapsed, setCollapsed] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [changePasswordForm] = Form.useForm();

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
      'approvalCenter': '审批中心',
      'organizationManagement': '组织管理',
      'customerList': '客户管理',
      'equipmentProfile': '设备档案',
      'equipmentInventory': '设备库存',
      'equipmentTransfer': '设备调拨',
      'partsManagement': '配件管理',
      'modelManagement': '型号管理',
      'financeManagement': '财务管理',
      'policyManagement': '设备保单',
      'logisticsList': '物流管理',
      'logisticsLedger': '物流台账',
      'storeList': '门店管理',
      'companyVerificationList': '公司认证',
      // 'companiesManagement': '公司管理', // 已移除
      'subleaseCompanyList': '转租公司',
      'subleaseEquipmentList': '转租设备',
      'sublease-create': '新增转租',
      'toolList': '业务工具',
      'templateManagement': '模板管理',
      'templateMapping': '模板映射',
      'orderList': '订单管理',
      'reminderCenter': '提醒中心',
      'reminderSettings': '提醒设置',
      'equipmentRepairs': '设备维修',
      'partReplacements': '配件更换记录',
      'usageAnalysis': '使用率分析',
      'purchases': '采购记录',
      'rolePermissions': '角色权限',
      'userPermissions': '用户权限'
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

  // 处理密码修改
  const handleChangePassword = async () => {
    try {
      const values = await changePasswordForm.validateFields();
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      
      const response = await fetch('/api/users/me/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
      });

      const result = await response.json();
      
      if (result.ok) {
        message.success('密码修改成功，请重新登录');
        setChangePasswordVisible(false);
        changePasswordForm.resetFields();
        // 3秒后自动退出登录
        setTimeout(async () => {
          await dispatch(logout()).unwrap();
          navigate('/login', { replace: true });
        }, 3000);
      } else {
        message.error(result.error || '密码修改失败');
      }
    } catch (err: any) {
      if (err.errorFields) {
        // 表单验证错误，不显示消息
        return;
      }
      message.error(err.message || '操作失败');
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
    // 加载未读提醒数量
    import('./features/reminders/remindersSlice').then(module => {
      dispatch(module.fetchUnreadCount());
    });

    // 初始化会话管理器（15分钟无操作自动登出）
    const handleSessionTimeout = () => {
      message.warning('您已15分钟未操作，系统将自动退出登录', 3);
      setTimeout(() => {
        dispatch(logout());
        navigate('/login', { replace: true });
      }, 3000);
    };
    sessionManager.initSessionManager(handleSessionTimeout);
    console.log('[App] 会话管理器已启动：15分钟无操作自动登出，关闭页面需重新登录');

    return () => { 
      stop?.(); 
      message.destroy(); 
      sessionManager.destroySessionManager();
    };
  }, [dispatch, navigate]);

  const getTabComponent = (key: string) => {
    // 映射逻辑保持不变，直接复用原有的 switch-case
    // 为了代码简洁，这里直接调用原有的映射
    switch (key) {
      case 'home':
        return <Dashboard />;
      case 'approvalCenter': return <ApprovalCenter />;
      case 'organizationManagement': return <OrganizationManagement />;
      case 'customerList': return <CustomerList />;
      case 'equipmentProfile': return <EquipmentProfile />;
      case 'equipmentInventory': return <EquipmentInventory />;
      case 'equipmentTransfer': return <EquipmentTransfer />;
      case 'partsManagement': return <PartsManagement />;
      case 'modelManagement': return <ModelManagement />;
      case 'financeManagement': return <FinanceManagement />;
      case 'policyManagement': return <PolicyManagement />;
      case 'logisticsList': return <LogisticsManagement />;
      case 'logisticsLedger': return <LogisticsLedgerPage />;
      case 'storeList': return <StoreList />;
      case 'companyVerificationList': return <CompanyVerificationList />;
      // case 'companiesManagement': return <CompaniesManagement />; // 已移除
      case 'subleaseCompanyList': return <SubleaseCompanyPage />;
      case 'subleaseEquipmentList': return <SubleaseEquipmentPage />;
      case 'sublease-create': return <SubleaseCreatePage />;
      case 'orderList': return <OrderList />;
      case 'templateManagement': return <TemplateManagement />;
      case 'templateMapping': return <TemplateMapping />;
      case 'equipmentRepairs': return <EquipmentRepairsPage />;
      case 'reminderCenter': return <ReminderCenter />;
      case 'reminderSettings': return <UserSettingsPage />;
      case 'partReplacements': 
        // 从URL参数获取equipmentId，如果没有则显示提示
        const equipmentId = new URLSearchParams(location.search).get('equipmentId');
        return equipmentId ? <PartReplacementManager equipmentId={parseInt(equipmentId)} /> : 
          <div style={{ padding: 24 }}>请从设备档案中打开此页面</div>;
      case 'usageAnalysis':
        const usageEquipmentId = new URLSearchParams(location.search).get('equipmentId');
        return usageEquipmentId ? <EquipmentUsageAnalysis equipmentId={parseInt(usageEquipmentId)} /> :
          <div style={{ padding: 24 }}>请从设备档案中打开此页面</div>;
      case 'purchases': return <PurchasesPage />;
      case 'equipmentRentStats': return <EquipmentRentStatsPage />;
      case 'rolePermissions': return <RolePermissionManager />;
      case 'userPermissions': return <UserPermissionManager />;
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
        { key: 'partsManagement', label: '配件管理' },
        { key: 'modelManagement', label: '型号管理' },
        { key: 'equipmentRepairs', label: '设备维修' },
        { key: 'policyManagement', label: '设备保单' },
      ]
    },
    { key: 'purchases', icon: <ShoppingCartOutlined />, label: '采购记录' },
    { key: 'orders', icon: <FileDoneOutlined />, label: '订单管理', children: [{ key: 'orderList', label: '订单列表' }] },
    { key: 'approvals', icon: <CheckCircleOutlined />, label: '审批中心', children: [{ key: 'approvalCenter', label: '审批中心' }] },
    { key: 'logistics', icon: <TruckOutlined />, label: '物流管理', children: [{ key: 'logisticsList', label: '物流列表' }, { key: 'logisticsLedger', label: '物流台账' }] },
    { key: 'finance', icon: <DollarOutlined />, label: '财务管理', children: [{ key: 'financeManagement', label: '财务总览' }, { key: 'equipmentRentStats', label: '租金统计' }] },
    { key: 'stores', icon: <ShopOutlined />, label: '门店管理', children: [{ key: 'storeList', label: '门店列表' }, { key: 'companyVerificationList', label: '公司认证' }] },
    { key: 'sublease', icon: <SwapOutlined />, label: '转租管理', children: [{ key: 'subleaseCompanyList', label: '转租公司' }, { key: 'subleaseEquipmentList', label: '转租设备' }] },
    { key: 'templates', icon: <ProfileOutlined />, label: '模板管理', children: [{ key: 'templateManagement', label: '模板管理' }, { key: 'templateMapping', label: '模板映射' }] },
    { key: 'reminders', icon: <BellOutlined />, label: '提醒中心', children: [{ key: 'reminderCenter', label: '提醒中心' }] },
    { key: 'organization', icon: <TeamOutlined />, label: '组织管理', children: [{ key: 'organizationManagement', label: '部门职务' }] },
    { key: 'permissions', icon: <KeyOutlined />, label: '权限管理', children: [{ key: 'rolePermissions', label: '角色权限' }, { key: 'userPermissions', label: '用户权限' }] },
  ];

  // 超级管理员菜单（已移除公司管理）
  const superAdminMenuItems = isSuperAdmin ? [
    // { key: 'system', icon: <SettingOutlined />, label: '系统管理', children: [{ key: 'companiesManagement', label: '公司管理' }] },
  ] : [];

  const menuItems = [...baseMenuItems, ...superAdminMenuItems];

  return (
    <AntApp>
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
          <Logo 
            type={collapsed ? 'icon' : 'full'}
            theme="dark"
            height={collapsed ? 32 : 40}
            style={{ 
              transition: 'all 0.3s',
              transform: collapsed ? 'scale(1.1)' : 'scale(1)',
              width: collapsed ? 'auto' : '100%'
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
              <Badge count={unreadCount} size="small">
                <BellOutlined 
                  style={{ fontSize: 18, cursor: 'pointer', color: '#666' }} 
                  onClick={() => handleMenuClick({ key: 'reminderCenter' })}
                />
              </Badge>
            </Tooltip>
            <Dropdown
              menu={{
                items: [
                  { key: 'reminderSettings', label: '提醒设置', icon: <SettingOutlined />, onClick: () => handleMenuClick({ key: 'reminderSettings' }) },
                  { key: 'changePassword', label: '密码修改', icon: <KeyOutlined />, onClick: () => setChangePasswordVisible(true) },
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

      {/* 密码修改Modal */}
      <Modal
        title="修改密码"
        open={changePasswordVisible}
        onOk={handleChangePassword}
        onCancel={() => {
          setChangePasswordVisible(false);
          changePasswordForm.resetFields();
        }}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <Form
          form={changePasswordForm}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="旧密码"
            name="oldPassword"
            rules={[
              { required: true, message: '请输入旧密码' }
            ]}
          >
            <Input.Password placeholder="请输入当前密码" autoComplete="off" />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码长度不能少于8位' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('oldPassword') !== value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('新密码不能与旧密码相同'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少8位）" autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
    </AntApp>
  );
}