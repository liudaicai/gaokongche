import { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb', // 更现代的蓝色 (Royal Blue)
    borderRadius: 8, // 更圆润的边角
    wireframe: false,
    colorBgLayout: '#f3f4f6', // 稍微冷一点的灰
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,
    colorTextHeading: '#1f2937',
    colorText: '#374151',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  components: {
    Layout: {
      bodyBg: '#f3f4f6',
      headerBg: 'rgba(255, 255, 255, 0.8)', // 半透明背景，配合 backdrop-filter 使用
      siderBg: '#0f172a', // Slate 900，深邃的蓝黑色
      triggerBg: '#1e293b',
    },
    Card: {
      boxShadowTertiary: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      headerFontSize: 16,
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      headerSplitColor: 'transparent',
      rowHoverBg: '#f1f5f9',
      borderRadiusLG: 8,
    },
    Menu: {
      darkItemBg: '#0f172a',
      darkItemColor: '#94a3b8',
      darkItemSelectedBg: '#2563eb', // 选中项高亮
      darkItemSelectedColor: '#ffffff',
      darkSubMenuItemBg: '#020617', // 更深的子菜单背景
      itemHeight: 40,
      itemMarginInline: 8,
      itemBorderRadius: 6,
    },
    Tabs: {
      cardBg: 'transparent',
      cardGutter: 6,
      itemSelectedColor: '#2563eb',
      titleFontSize: 14,
    },
    Button: {
      controlHeight: 36,
      borderRadius: 6,
      defaultShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      primaryShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)',
    },
    Input: {
      controlHeight: 36,
      borderRadius: 6,
    },
    Select: {
      controlHeight: 36,
      borderRadius: 6,
    }
  },
};

