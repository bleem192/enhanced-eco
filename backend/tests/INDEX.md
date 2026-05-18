# 单元测试文件索引

## 📁 目录结构

```
backend/tests/
├── 📄 README.md              # 测试说明文档
├── 📄 MANUAL-INSTALL.md      # 手动安装指南
├── 📄 TEST-GUIDE.md         # 完整测试指南
├── 📄 jest.config.js       # Jest 配置文件
├── 📄 setup.js             # 测试环境配置
├── 📄 run-tests.bat        # Windows 运行脚本
├── 📄 run-tests.sh         # Unix 运行脚本
├── 📄 auth.test.js         # 认证系统测试 (15 测试)
├── 📄 products.test.js     # 商品管理系统测试 (16 测试)
├── 📄 orders.test.js      # 订单处理系统测试 (14 测试)
└── 📄 permissions.test.js # 权限系统测试 (16 测试)
```

## 📊 测试统计

| 文件 | 测试数 | 行数 | 状态 |
|------|--------|------|------|
| auth.test.js | 15 | ~250 | ✅ 完成 |
| products.test.js | 16 | ~350 | ✅ 完成 |
| orders.test.js | 14 | ~300 | ✅ 完成 |
| permissions.test.js | 16 | ~320 | ✅ 完成 |
| **总计** | **61** | **~1220** | **✅ 完成** |

## 🎯 测试覆盖

### 核心功能

- ✅ 用户认证 (登录/注册/JWT)
- ✅ 商品管理 (CRUD/筛选/搜索)
- ✅ 订单处理 (创建/更新/查询)
- ✅ 权限控制 (角色验证/资源访问)

### API 端点覆盖

#### 认证 API
- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册

#### 商品 API
- `GET /api/products` - 获取商品列表
- `GET /api/products/:id` - 获取商品详情
- `POST /api/products` - 创建商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 下架商品
- `GET /api/products/categories` - 获取分类

#### 订单 API
- `GET /api/orders` - 获取订单列表
- `GET /api/orders/:id` - 获取订单详情
- `POST /api/orders` - 创建订单
- `PUT /api/orders/:id` - 更新订单状态

#### 管理 API
- `POST /api/admin/users` - 创建用户
- `PUT /api/admin/users/:id` - 更新用户
- `POST /api/admin/users/:id/reset-password` - 重置密码
- `DELETE /api/admin/users/:id` - 删除用户
- `GET /api/admin/sales-stats` - 销售统计

## 🚀 快速开始

### Windows
```cmd
cd backend\tests
run-tests.bat
```

### Unix/Linux/Mac
```bash
cd backend/tests
chmod +x run-tests.sh
./run-tests.sh
```

### NPM
```bash
cd backend
npm test
```

## 📖 文档链接

- [测试指南](TEST-GUIDE.md) - 完整的测试文档
- [README](README.md) - 快速开始指南
- [手动安装](MANUAL-INSTALL.md) - 安装说明

## 🔧 配置文件

### jest.config.js

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['routes/*.js'],
  coverageDirectory: 'coverage',
  testTimeout: 10000
};
```

## 🎓 学习资源

1. Jest 官方文档: https://jestjs.io/docs/getting-started
2. Supertest GitHub: https://github.com/visionmedia/supertest
3. REST API 测试最佳实践

## 📝 维护指南

### 添加新测试
1. 在对应的 `*.test.js` 文件中添加测试
2. 遵循命名规范
3. 添加适当的注释
4. 更新本文档的测试统计

### 更新测试
1. 确保测试仍然通过
2. 更新测试文档
3. 检查覆盖率

### 删除测试
1. 确保相关功能已移除或重构
2. 更新测试统计

## ⚙️ 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 内存 >= 512MB

## 📞 故障排除

| 问题 | 解决方案 |
|------|----------|
| npm install 失败 | 手动安装，见 MANUAL-INSTALL.md |
| 测试超时 | 增加 jest.config.js 中的 testTimeout |
| 覆盖率低 | 添加更多测试用例 |
| 依赖冲突 | 删除 node_modules 重新安装 |

---

**最后更新**: 2026-05-17  
**测试框架**: Jest 29.7.0  
**HTTP 测试库**: Supertest 6.3.3
