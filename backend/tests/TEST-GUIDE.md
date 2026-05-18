# 电商系统单元测试套件

## 📋 概览

本测试套件为电商系统提供全面的单元测试覆盖，确保核心功能的稳定性和可靠性。

## 🎯 测试覆盖

### 总计：45+ 个测试用例

| 模块 | 测试用例数 | 覆盖率目标 |
|------|-----------|-----------|
| 认证系统 | 15 | > 90% |
| 商品管理 | 16 | > 85% |
| 订单处理 | 14 | > 85% |
| 权限系统 | 16 | > 90% |

## 🧪 测试模块

### 1. 认证系统 (`auth.test.js`)

#### 登录功能测试
```javascript
✓ 管理员登录成功
✓ 销售用户登录成功
✓ 普通用户登录成功
✓ 用户名错误返回401
✓ 密码错误返回401
✓ 空用户名返回400
✓ 空密码返回400
✓ JWT Token格式正确
```

#### 注册功能测试
```javascript
✓ 注册成功
✓ 用户名太短返回400
✓ 密码太短返回400
✓ 邮箱格式错误返回400
✓ 缺少字段返回400
```

### 2. 商品管理系统 (`products.test.js`)

#### 商品查询测试
```javascript
✓ 获取商品列表成功
✓ 按分类筛选商品
✓ 按状态筛选商品
✓ 按关键字搜索商品
✓ 限制返回数量
✓ 获取商品详情成功
✓ 商品不存在返回404
```

#### 商品CRUD测试
```javascript
✓ 创建商品成功
✓ 缺少必填字段返回400
✓ 价格为0返回400
✓ 价格为负数返回400
✓ 更新商品成功
✓ 更新不存在的商品返回404
✓ 只更新部分字段
```

#### 商品操作测试
```javascript
✓ 下架商品成功
✓ 下架不存在的商品返回404
✓ 下架后商品状态变为unavailable
✓ 获取分类列表成功
✓ 分类包含商品数量
```

### 3. 订单处理系统 (`orders.test.js`)

#### 订单查询测试
```javascript
✓ 管理员可以查看所有订单
✓ 销售只能查看分配给自己的订单
✓ 客户只能查看自己的订单
✓ 未授权访问返回401
✓ 分页功能正常
✓ 获取订单详情成功
✓ 订单不存在返回404
✓ 客户无权访问他人的订单
```

#### 订单创建测试
```javascript
✓ 创建订单成功
✓ 空商品列表返回400
✓ 缺少收货地址返回400
✓ 非客户角色不能创建订单
```

#### 订单更新测试
```javascript
✓ 更新订单状态成功
✓ 无效状态返回400
✓ 客户无权更新订单
✓ 销售只能更新分配给自己的订单
```

### 4. 权限系统 (`permissions.test.js`)

#### 角色权限测试
```javascript
✓ Admin可以创建用户
✓ Sales不能创建用户
✓ Customer不能创建用户
✓ 未授权用户不能访问管理接口
✓ 无效的Token被拒绝
```

#### 用户管理权限测试
```javascript
✓ Admin可以更新用户
✓ Admin可以重置用户密码
✓ Admin可以删除用户（软删除）
✓ 删除不存在的用户返回404
```

#### 商品管理权限测试
```javascript
✓ Admin可以创建商品
✓ Sales可以创建商品
✓ Customer不能创建商品
✓ Admin可以下架商品
✓ Sales可以下架商品
```

#### 数据统计权限测试
```javascript
✓ Admin可以查看销售统计
✓ Sales不能查看销售统计
✓ Customer不能查看销售统计
```

#### JWT Token测试
```javascript
✓ Token包含正确的用户信息
✓ 过期的Token被拒绝
✓ 使用错误密钥签名的Token被拒绝
```

## 🔧 技术栈

- **测试框架**: Jest 29+
- **HTTP 测试**: Supertest
- **Node.js 版本**: 16+
- **ESM 支持**: `--experimental-vm-modules`

## 📦 依赖

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 运行所有测试

```bash
npm test
```

### 3. 查看详细输出

```bash
npm test -- --verbose
```

### 4. 生成覆盖率报告

```bash
npm run test:coverage
```

## 📊 预期输出

```
PASS  tests/auth.test.js
  认证系统测试
    POST /api/auth/login
      ✓ 管理员登录成功 (5ms)
      ✓ 销售用户登录成功 (3ms)
      ...
    POST /api/auth/register
      ✓ 注册成功 (4ms)
      ...

PASS  tests/products.test.js
  商品管理系统测试
    GET /api/products
      ✓ 获取商品列表成功 (2ms)
      ...
    POST /api/products
      ✓ 创建商品成功 (3ms)
      ...

PASS  tests/orders.test.js
  订单处理系统测试
    GET /api/orders
      ✓ 管理员可以查看所有订单 (4ms)
      ...
    POST /api/orders
      ✓ 创建订单成功 (5ms)
      ...

PASS  tests/permissions.test.js
  权限系统测试
    角色权限验证
      ✓ Admin可以创建用户 (3ms)
      ...
    JWT Token验证
      ✓ Token包含正确的用户信息 (2ms)
      ...

Test Suites: 4 passed, 4 total
Tests:       45 passed, 45 total
Time:        5.234s
```

## 🎓 测试最佳实践

### 1. 测试命名规范

```javascript
// ✅ 清晰描述
test('管理员登录成功返回200和JWT Token')

// ❌ 模糊不清
test('login test')
```

### 2. Arrange-Act-Assert 模式

```javascript
test('创建订单成功', async () => {
  // Arrange
  const orderData = { items: [...], shipping_address: '北京' };
  
  // Act
  const response = await request(app)
    .post('/api/orders')
    .send(orderData);
  
  // Assert
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
});
```

### 3. 边界条件测试

```javascript
test('商品价格为0返回400', async () => {
  // 测试边界条件
  const response = await request(app)
    .post('/api/products')
    .send({ name: 'Test', category: 'Test', price: 0 });
  
  expect(response.status).toBe(400);
});
```

### 4. 错误消息验证

```javascript
test('缺少必填字段返回正确的错误信息', async () => {
  const response = await request(app)
    .post('/api/products')
    .send({ name: 'Test' });
  
  expect(response.body.message).toContain('不能为空');
});
```

## 🔍 调试技巧

### 查看详细错误信息

```bash
npm test -- --verbose --bail
```

### 运行单个测试文件

```bash
npm test -- tests/auth.test.js
```

### 运行特定测试

```bash
npm test -- --testNamePattern="登录成功"
```

### 查看测试覆盖

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 📈 持续集成

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 🛡️ 安全注意事项

1. **测试数据**：测试不应使用真实的生产数据
2. **Token 密钥**：测试使用固定的密钥，不要在生产环境使用
3. **数据库**：建议使用独立的测试数据库
4. **敏感信息**：不要在测试中硬编码敏感信息

## 📝 添加新测试

### 模板

```javascript
describe('功能模块', () => {
  describe('功能点', () => {
    test('测试场景描述', async () => {
      // Arrange
      const input = {};
      
      // Act
      const response = await request(app)
        .METHOD('/api/endpoint')
        .send(input);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('property');
    });
    
    test('边界条件测试', async () => {
      // 测试边界值
    });
    
    test('错误处理测试', async () => {
      // 测试错误情况
    });
  });
});
```

## 🎯 质量标准

- ✅ 所有测试必须通过
- ✅ 测试覆盖率 > 80%
- ✅ 每个 API 端点至少 3 个测试用例
- ✅ 包含正常流程和异常流程测试
- ✅ 测试执行时间 < 10秒

## 📞 支持

如有问题，请查看：
1. `MANUAL-INSTALL.md` - 手动安装指南
2. Jest 官方文档: https://jestjs.io/docs/getting-started
3. Supertest 文档: https://github.com/visionmedia/supertest

---

**创建时间**: 2026-05-17  
**版本**: 1.0.0  
**维护者**: Development Team
