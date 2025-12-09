# 高空车租赁管理系统

这是一个基于React的高空车租赁管理系统，提供设备管理、客户管理、订单管理等功能，帮助企业高效管理高空车租赁业务。

## 技术栈

- **前端框架**：React 18+
- **构建工具**：Vite
- **状态管理**：Redux Toolkit
- **UI组件库**：Ant Design
- **编程语言**：TypeScript
- **样式**：CSS Modules

## 系统功能

### 核心功能
- 用户认证（登录/退出）
- 设备管理（设备档案、库存、调拨）
- 客户管理
- 订单管理
- 物流管理
- 配件管理
- 员工管理
- 门店管理
- 转租管理

### 用户界面
- 响应式布局，支持不同设备访问
- 侧边菜单导航
- 选项卡式内容展示
- 表单验证
- 加载状态提示

## 快速开始

### 前提条件
- Node.js 16+ 版本
- npm 8+ 版本

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

系统将在 http://localhost:5173 启动开发服务器

### 构建生产版本

```bash
npm run build
```

构建后的文件将输出到 `dist` 目录

### 预览生产版本

```bash
npx http-server dist -c-1
```

## 登录信息

系统默认提供超级管理员账号：
- 用户名：admin
- 密码：admin123

## 项目结构

```
src/
├── app/             # Redux store配置
├── features/        # 功能模块
│   ├── common/      # 公共组件和工具
│   ├── customers/   # 客户管理模块
│   ├── dashboard/   # 仪表盘模块
│   ├── equipment/   # 设备管理模块
│   └── user/        # 用户认证模块
├── App.tsx          # 应用主组件
├── index.css        # 全局样式
└── main.tsx         # 应用入口
```

## 注意事项

1. 开发环境下，使用 `npm run dev` 启动开发服务器
2. 生产环境需要先构建，然后部署 `dist` 目录下的文件
3. 系统使用localStorage存储用户信息，请确保浏览器支持并启用localStorage
4. 如需修改系统配置，可以编辑相关环境变量或配置文件

## 代码约定（AntD Modal v5）
- 使用 `destroyOnHidden`，不要使用 `destroyOnClose`。
- 使用 `styles.body` 和 `styles.footer`，不要使用 `bodyStyle` 和 `footerStyle`。
- 统一示例：

```tsx
<Modal
  open={open}
  destroyOnHidden
  styles={{
    body: { padding: 16, maxHeight: 560, overflowY: 'auto' },
    footer: { padding: 12, borderTop: '1px solid #f0f0f0' },
  }}
/>
```

- ESLint 已添加轻量规则进行提醒；运行 `npm run lint` 查看告警。
## 结算页设备信息显示规则（更新）

为提升对用户自定义设备自编号的可见性，结算页“设备信息”展示逻辑更新如下：

- 优先显示设备自编码 `customCode`。
- 当 `customCode` 不存在、为空字符串或仅包含空白字符时，回退显示设备编码 `code`（即订单中的 `equipment_code`）。
- 显示值统一进行去空白处理（`trim`），确保不会出现仅由空白组成的自编码被误认为有效。

后端数据保障：
- 设备接口 `/equipments` 已返回 `customCode` 字段（详见 `server/routes/equipments.mongo.js` 中 `toEquipmentDto`）。
- 数据库对 `code` 与 `customCode` 均设置唯一约束（`customCode` 仅对非空值唯一）。

兼容性与影响范围：
- 本次仅调整结算页设备信息的显示文本，不影响提交/计算逻辑及其他页面功能。
- 移动端与PC端的表格列宽与布局保持不变，仅替换了展示的编码字段。

如需在其他模块也采用相同的显示优先级，请复用相同的“自编码优先、编码回退”的策略。