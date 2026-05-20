# 电商平台 (E-Commerce Platform)

基于 Node.js + Vue.js 的电商平台解决方案，包含用户管理、商品管理、订单处理、数据分析和推荐系统。

## 特性

- 👥 三种用户角色：Customer（顾客）、Sales（销售）、Admin（管理员）
- 🛒 完整的购物车和订单系统
- 📊 数据统计和分析仪表板
- 🎯 协同过滤和内容推荐系统
- 🔐 完善的权限控制
- 📱 响应式用户界面
- 🔄 数据隔离和访问控制

## 快速开始

### 前置要求

- Node.js >= 16.0
- MySQL >= 5.7
- npm 或 yarn

### 一键部署

#### 方法 方式一：自动部署脚本 (推荐)

```bash
# 克隆仓库
git clone https://github.com/bleem192/enhanced-eco.git
cd enhanced-eco

# 运行部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### 方式 二：手动部署

1. 安装依赖
```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

2. 配置环境变量
```bash
# 在 backend 目录下创建 .env
cp .env.example .env
# 编辑 .env 文件配置数据库
```

3. 初始化数据库
```bash
cd backend
npm run init-db
```

4. 启动服务
```bash
# 后端
npm start

# 前端 (新终端)
cd ../frontend
npm run dev
```

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| Admin | admin | admin123 |
| Sales1 | sales1 | sales123 |
| Sales2 | sales2 | sales123 |
| Customer | customer1 | customer123 |

> ⚠️ 请在生产环境中立即修改默认密码！

## 项目结构

```
ecommerce/
├── backend/
│   ├── config/          # 配置文件
│   ├── middleware/    # 中间件
│   ├── routes/       # API 路由
│   ├── scripts/       # 脚本
│   └── tests/       # 测试
├── frontend/
│   ├── src/
│   │   ├── views/      # 页面组件
│   │   ├── stores/  # 状态管理
│   │   └── api/         # API 配置
├── docs/               # 文档
├── scripts/           # 部署脚本
└── README.md
```

## 文档

- [部署指南](docs/DEPLOYMENT.md) - 完整的部署和运维指南

## 开发

### 运行测试

```bash
cd backend
npm test
```

### 推荐系统

项目实现了三种推荐策略：

1. **协同过滤** - 基于用户行为相似度
2. **内容推荐** - 基于商品属性相似度
3. **热门推荐** - 基于销量排行

### 数据分析

- 用户画像分析
- 销售趋势预测
- 异常检测和预警
- 商品销售排行榜

## 技术栈

### 后端

- Node.js
- Express.js
- MySQL
- JWT 认证

### 前端

- Vue.js 3
- Element Plus
- Axios
- Vuex/Pinia

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
