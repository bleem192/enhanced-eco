# 手动安装指南

由于系统安全策略限制，请按照以下步骤手动安装测试依赖：

## 步骤 1：打开 PowerShell（管理员）

在开始菜单中搜索 "PowerShell"，右键选择 "以管理员身份运行"

## 步骤 2：修改执行策略

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

当提示确认时，输入 `Y` 并按回车

## 步骤 3：安装测试依赖

```powershell
cd c:\Users\13621\Desktop\网络应用开发\ecommerce\backend
npm install
```

这将安装 package.json 中定义的所有依赖（包括 jest 和 supertest）

## 步骤 4：运行测试

```powershell
npm test
```

## 或者使用脚本

双击运行 `run-tests.bat`

## 验证安装

检查 node_modules 目录是否包含 jest 和 supertest：

```powershell
dir node_modules | Select-String -Pattern "jest|supertest"
```

如果看到 jest 和 supertest 的目录，则安装成功。

## 常见问题

### Q: npm 命令无法执行
A: 请确保 Node.js 已正确安装，运行 `node --version` 确认

### Q: 执行策略错误
A: 需要管理员权限修改执行策略，见步骤 2

### Q: 安装速度慢
A: 可以使用淘宝镜像：
```powershell
npm config set registry https://registry.npmmirror.com
npm install
```

## 测试命令速查

```powershell
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- tests/auth.test.js

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式（文件变化自动运行）
npm run test:watch
```

## 手动创建测试数据库

如果测试需要真实数据库，创建测试数据库：

```sql
CREATE DATABASE ecommerce_test;
USE ecommerce_test;

-- 运行 backend/config/database.js 中的表创建语句
```
