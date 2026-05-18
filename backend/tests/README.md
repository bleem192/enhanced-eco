# 电商系统单元测试

本目录包含电商系统的单元测试，覆盖核心业务模块。

## 测试覆盖范围

### 1. 认证系统测试 (`auth.test.js`)
- ✅ 用户登录（管理员、销售、客户）
- ✅ 用户注册（包含验证规则）
- ✅ JWT Token 生成和验证
- ✅ 错误处理（空字段、错误密码）

### 2. 商品管理系统测试 (`products.test.js`)
- ✅ 商品列表查询（支持筛选、分页、搜索）
- ✅ 商品详情查询
- ✅ 商品创建（包含验证）
- ✅ 商品更新（部分更新）
- ✅ 商品下架（软删除）
- ✅ 商品分类查询

### 3. 订单处理系统测试 (`orders.test.js`)
- ✅ 订单列表查询（权限过滤）
- ✅ 订单详情查询（权限验证）
- ✅ 订单创建（客户角色验证）
- ✅ 订单状态更新（销售/管理员权限）
- ✅ 权限控制（客户、销售、管理员）

### 4. 权限系统测试 (`permissions.test.js`)
- ✅ 角色权限验证（Admin、Sales、Customer）
- ✅ 用户管理权限
- ✅ 商品管理权限
- ✅ 数据统计权限
- ✅ JWT Token 验证和过期处理

## 运行测试

### 安装依赖

```bash
cd backend
npm install
```

### 运行所有测试

```bash
npm test
```

### 运行特定测试文件

```bash
npm test -- tests/auth.test.js
npm test -- tests/products.test.js
npm test -- tests/orders.test.js
npm test -- tests/permissions.test.js
```

### 运行测试并显示覆盖

```bash
npm run test:coverage
```

### 监听模式（文件变化时自动运行）

```bash
npm run test:watch
```

## 测试输出示例

```
PASS  tests/auth.test.js
  认证系统测试
    POST /api/auth/login
      ✓ 管理员登录成功
      ✓ 销售用户登录成功
      ✓ 普通用户登录成功
      ✓ 用户名错误返回401
      ✓ 密码错误返回401
      ✓ 空用户名返回400
      ✓ JWT Token格式正确

PASS  tests/products.test.js
  商品管理系统测试
    GET /api/products
      ✓ 获取商品列表成功
      ✓ 按分类筛选商品
      ✓ 按状态筛选商品

Test Suites: 4 passed, 4 total
Tests:       45 passed, 45 total
```

## 测试结构

```
tests/
├── setup.js           # 测试环境配置
├── auth.test.js       # 认证系统测试
├── products.test.js   # 商品管理测试
├── orders.test.js     # 订单处理测试
└── permissions.test.js # 权限系统测试
```

## 测试原则

1. **独立性**：每个测试用例独立运行，不依赖其他测试
2. **可重复性**：测试结果稳定，可重复运行
3. **清晰性**：测试名称描述清晰，易于理解
4. **完整性**：覆盖正常流程和异常流程
5. **快速性**：单元测试应快速执行

## 添加新测试

在对应的测试文件中添加新的测试用例：

```javascript
describe('功能描述', () => {
  test('具体的测试场景', async () => {
    // 测试代码
    expect(result).toBe(expectedValue);
  });
});
```

## 持续集成

这些测试可以集成到 CI/CD 流程中：

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm test
```

## 覆盖率目标

- 认证系统: > 90%
- 商品管理: > 85%
- 订单处理: > 85%
- 权限系统: > 90%

## 故障排除

### 测试失败

1. 检查测试环境是否正确配置
2. 查看测试输出中的错误信息
3. 使用 `--verbose` 选项查看详细信息
4. 检查数据库连接是否正常

### 依赖问题

```bash
rm -rf node_modules
npm install
```

## 联系方式

如有问题，请提交 Issue。
