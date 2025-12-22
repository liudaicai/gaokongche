# Word模板目录

此目录用于存放Word文档模板（.docx格式）

## 📁 目录结构

```
templates/
  ├── README.md                    - 本说明文件
  ├── 变量字段完整列表.md          - 所有可用变量详细说明（必读）⭐
  ├── 变量速查表.txt               - 快速复制粘贴用（推荐）⭐
  ├── 变量清单-Excel格式.csv       - Excel表格格式
  ├── 测试数据示例.json            - 测试数据
  ├── 租赁合同示例.txt             - 合同模板示例
  ├── 租赁合同.docx                - 租赁合同模板（自己创建）
  ├── 进场单.docx                  - 进场单模板（自己创建）
  ├── 退场单.docx                  - 退场单模板（自己创建）
  └── 结算单.docx                  - 结算单模板（自己创建）
```

## 📝 如何创建Word模板

### 1. 使用Microsoft Word或WPS创建文档

### 2. 在需要动态填充数据的地方使用占位符：

```
基本变量：{{变量名}}
示例：{{customerName}}，{{projectName}}

循环列表：
{{#each equipments}}
{{index}}. 设备编号：{{code}} 型号：{{model}}
{{/each}}

货币格式化：{{totalAmount}}
```

### 3. 保存为 .docx 格式

⚠️ **注意**：必须使用 .docx 格式（Word 2007及以上），不支持旧版 .doc 格式

## 🎯 可用的变量字段

### 订单信息
- `{{orderNumber}}` - 订单编号
- `{{projectName}}` - 项目名称
- `{{projectAddress}}` - 项目地址
- `{{startDate}}` - 开始日期
- `{{endDate}}` - 结束日期
- `{{totalAmount}}` - 总金额
- `{{deposit}}` - 押金
- `{{remarks}}` - 备注

### 客户信息
- `{{customerName}}` - 客户名称
- `{{customerContactPerson}}` - 联系人
- `{{customerPhone}}` - 电话
- `{{customerAddress}}` - 地址
- `{{customerIdCard}}` - 身份证号

### 设备列表（使用 #each）
```
{{#each equipments}}
{{index}}. {{code}} - {{model}} - {{brand}}
{{/each}}
```

可用字段：
- `{{index}}` - 序号
- `{{code}}` - 设备编号
- `{{customCode}}` - 自定义编号
- `{{model}}` - 型号
- `{{brand}}` - 品牌
- `{{category}}` - 类别
- `{{height}}` - 高度
- `{{dailyRate}}` - 日租金

### 系统信息
- `{{createdAt}}` - 创建日期
- `{{createdBy}}` - 创建人

## 📊 示例模板

### 租赁合同示例

```
                    设备租赁合同

合同编号：{{orderNumber}}

甲方（出租方）：XXX公司
乙方（承租方）：{{customerName}}
联系人：{{customerContactPerson}}
联系电话：{{customerPhone}}
身份证号：{{customerIdCard}}

项目名称：{{projectName}}
项目地址：{{projectAddress}}

一、租赁设备清单

{{#each equipments}}
{{index}}. 设备编号：{{code}}
   设备型号：{{model}}
   品牌：{{brand}}
   类别：{{category}}
   高度：{{height}}
   日租金：{{dailyRate}} 元/天
{{/each}}

二、租赁期限

租赁开始日期：{{startDate}}
租赁结束日期：{{endDate}}

三、费用

租金总额：{{totalAmount}} 元
押金：{{deposit}} 元

四、备注

{{remarks}}

甲方（盖章）：                乙方（签字）：

签订日期：{{createdAt}}
```

## 🔄 使用流程

1. **准备模板**：创建Word文档，使用占位符标记动态数据
2. **保存模板**：将 .docx 文件放到本目录，或通过Web界面上传
3. **生成文档**：
   - 方式1：在订单详情页点击"生成合同"
   - 方式2：在模板管理页面选择模板和订单
4. **自动填充**：系统自动将订单数据填充到模板
5. **下载文档**：生成的Word文档自动下载到本地

## ⚠️ 注意事项

1. **文件格式**：只支持 .docx（不支持 .doc）
2. **变量名**：严格区分大小写
3. **循环语法**：必须配对使用 `{{#each}}` 和 `{{/each}}`
4. **文件命名**：避免使用特殊字符
5. **文件大小**：建议不超过10MB

## 🚀 快速开始

### 方式1：直接放置文件（推荐）

1. 将准备好的 .docx 模板文件复制到本目录
2. 文件名即为模板名称（如：租赁合同.docx）
3. 重启服务器或刷新模板列表

### 方式2：通过Web界面上传

1. 访问：系统设置 → 模板管理 → Word模板
2. 点击"上传Word模板"
3. 选择 .docx 文件
4. 上传成功后即可使用

## 📚 参考文档

### 本目录文件
- **⭐ 变量字段完整列表.md** - 所有变量的详细说明，包含完整示例
- **⭐ 变量速查表.txt** - 快速查找和复制变量，制作模板时打开此文件
- **变量清单-Excel格式.csv** - 可用Excel打开，方便打印和查看
- **测试数据示例.json** - 完整的测试数据，用于API测试
- **租赁合同示例.txt** - 完整的合同模板示例

### 其他文档
- `d:\kaifa\4\Word模板功能-完整指南.md` - 完整技术文档
- `d:\kaifa\4\Word模板使用说明.md` - 使用指南
- `d:\kaifa\4\✅_Word模板功能已完成.md` - 功能完成报告

### 代码文件
- `d:\kaifa\4\server\services\wordTemplateService.js` - 服务实现
- `d:\kaifa\4\server\routes\word-templates.js` - API接口
- `d:\kaifa\4\src\features\templates\WordTemplateManagement.tsx` - 前端界面

## 🎯 快速开始步骤

### 1. 查看可用变量
打开 **变量速查表.txt**，了解所有可用的变量

### 2. 创建Word模板
- 打开Word
- 参考 **租赁合同示例.txt** 创建模板
- 使用 {{变量名}} 标记动态数据
- 保存为 .docx 格式到本目录

### 3. 测试模板
- 重启后端：`npm run api`
- 使用 **测试数据示例.json** 中的数据测试
- 生成并检查Word文档

## 📞 技术支持

如有问题，请查看：
1. **变量字段完整列表.md** - 查找具体变量用法
2. **Word模板功能-完整指南.md** - 完整技术文档
3. 示例文件 - 参考已有的示例

---

**最后更新**：2024-12-16
