# 阿里云效流水线配置指南

## 📋 概述

本目录包含阿里云效（Aliyun DevOps）流水线的完整配置，可实现电商平台的自动化构建、测试和部署。

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `aliyun-pipeline.yml` | 完整的流水线 YAML 配置文件 |
| `README.md` | 本使用指南 |

## 🚀 快速开始

### 步骤1: 登录阿里云效

1. 访问 https://devops.aliyun.com
2. 使用阿里云账号登录
3. 创建或选择组织

### 步骤2: 创建流水线

1. 点击左侧菜单"流水线"
2. 点击"新建流水线"
3. 选择"完整流程"模板
4. 点击"编辑 YAML"
5. 粘贴 `aliyun-pipeline.yml` 文件内容
6. 点击"保存"

### 步骤3: 配置凭证

进入流水线设置 → 凭证管理，添加以下凭证：

#### 3.1 GitHub Token

```bash
# 在 GitHub 上生成 Personal Access Token
# Settings → Developer settings → Personal access tokens → Generate new token
# 需要的权限: repo, admin:repo_hook
```

凭证配置：
- 类型: 用户名密码
- 用户名: 你的 GitHub 用户名
- 密码: 生成的 Token

#### 3.2 ECS SSH 密钥

凭证配置：
- 类型: SSH 密钥
- 私钥: 你的服务器 SSH 私钥
- 密码: 私钥密码（如果没有则留空）

#### 3.3 钉钉机器人（可选）

```bash
# 在钉钉群中添加机器人
# 群设置 → 智能群助手 → 添加机器人 → 自定义
# 复制 Webhook URL
```

### 步骤4: 配置环境变量

进入流水线设置 → 变量配置，添加以下变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| ECS_HOST | 服务器 IP | 47.92.xxx.xxx |
| ECS_PORT | SSH 端口 | 22 |
| ECS_USER | 服务器用户名 | root |
| APP_PATH | 部署路径 | /var/www/ecommerce |
| DB_HOST | 数据库地址 | localhost |
| DB_PORT | 数据库端口 | 3306 |
| DB_USER | 数据库用户 | ecommerce |
| DB_PASSWORD | 数据库密码 | your_password |
| DB_NAME | 数据库名称 | ecommerce |
| JWT_SECRET | JWT 密钥 | (生成随机字符串) |
| DINGTALK_WEBHOOK | 钉钉 Webhook | https://oapi.dingtalk.com/... |
| ALERT_EMAIL | 告警邮箱 | admin@example.com |

### 步骤5: 配置机器组

1. 进入"资源管理" → "机器组"
2. 点击"添加机器组"
3. 选择"阿里云 ECS"
4. 选择你的 ECS 实例
5. 添加标签: `production`

### 步骤6: 修改流水线配置

在流水线编辑器中：

1. 修改"克隆代码仓库"步骤的凭证为你的 GitHub 凭证
2. 修改"SSH 连接"步骤的凭证为你的 SSH 密钥
3. 修改"部署到ECS"步骤的机器组为你的生产机器组

### 步骤7: 运行流水线

1. 点击"运行"按钮
2. 选择分支: `main`
3. 填写参数:
   - ECS_HOST: 你的服务器 IP
   - DB_PASSWORD: 你的数据库密码
4. 点击"确定"

## 📊 流水线流程

```
代码提交(GitHub)
    ↓
[阶段1] 检出代码
    ↓
[阶段2] 构建后端 ──┐
    ↓               │
[阶段3] 构建前端 ──┤
    ↓               │
[阶段4] 打包制品 ──┤
    ↓               │
[阶段5] 部署到服务器 ─→ SSH连接 → 备份 → 停止服务 → 上传代码 → 安装依赖 → 配置环境 → 启动服务
    ↓
[阶段6] 验证测试 ─→ 健康检查 → 登录测试 → API测试
    ↓
[阶段7] 清理工作
    ↓
发送通知(钉钉/邮件)
```

## 🔧 自定义配置

### 修改构建命令

如果需要修改构建命令，编辑流水线 YAML 中的对应步骤：

```yaml
- name: frontend-build-prod
  stepDisplayName: 前端生产构建
  type: Shell
  params:
    script: |
      # 修改为你的构建命令
      cd frontend
      npm run build:custom
```

### 修改部署路径

修改环境变量中的 `APP_PATH`，例如：

```bash
APP_PATH=/home/ubuntu/ecommerce
```

### 添加更多测试

在 `verify` 阶段添加更多测试步骤：

```yaml
- name: test-orders-api
  stepDisplayName: 测试订单API
  type: Shell
  params:
    script: |
      # 添加订单 API 测试
      curl -s http://localhost:3001/api/orders
```

## 🔐 安全建议

1. **使用 SSH 密钥认证**
   - 不要在流水线中明文存储密码
   - 使用 SSH 密钥对进行服务器认证

2. **敏感信息管理**
   - 数据库密码、JWT Secret 等敏感信息使用变量
   - 不要将敏感信息提交到代码仓库

3. **限制部署权限**
   - 仅在需要时开放部署权限
   - 定期轮换凭证

4. **网络安全**
   - 使用阿里云安全组限制访问
   - 仅为必要端口开放公网访问

## 🐛 故障排查

### 流水线执行失败

1. 查看流水线运行日志
2. 检查凭证配置是否正确
3. 检查环境变量是否完整
4. 检查服务器安全组是否正确配置

### 部署后服务无法访问

```bash
# SSH 连接到服务器
ssh root@your-ecs-ip

# 检查 PM2 状态
pm2 status
pm2 logs ecommerce-backend

# 检查端口监听
netstat -tulpn | grep 3001

# 检查 Nginx 配置
nginx -t
systemctl status nginx
```

### 数据库连接失败

```bash
# 检查数据库配置
mysql -h localhost -u ecommerce -p

# 测试连接
mysql -h ${DB_HOST} -u ${DB_USER} -p'${DB_PASSWORD}' ${DB_NAME}
```

## 📞 技术支持

- 阿里云效文档: https://help.aliyun.com/document_detail/153803.html
- 项目 Issues: https://github.com/bleem192/enhanced-eco/issues

## 📄 许可证

MIT License
