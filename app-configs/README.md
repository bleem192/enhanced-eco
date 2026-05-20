# 部署配置说明

## 目录结构

```
app-configs/
├── bin/
│   └── appctl.sh          # 部署脚本（核心）
└── package.json           # 配置信息
```

## 部署脚本功能

`appctl.sh` 提供以下功能：

| 命令 | 说明 |
|------|------|
| `./appctl.sh deploy` | 完整部署流程（默认） |
| `./appctl.sh restart` | 仅重启服务 |
| `./appctl.sh stop` | 停止服务 |
| `./appctl.sh status` | 查看服务状态 |
| `./appctl.sh logs` | 查看服务日志 |
| `./appctl.sh rollback` | 回滚到上一版本 |

## 阿里云效流水线配置

### 1. Node.js 构建任务配置

在构建物上传步骤添加：

**打包路径**: `app-configs/bin/appctl.sh`

### 2. 主机部署任务配置

#### 基础配置

- **下载路径**: `/home/admin/app/package.tgz`
- **执行用户**: `root`

#### 部署脚本

```bash
#!/bin/bash
set -e

APP_DIR="/var/www/ecommerce"
BACKUP_DIR="$APP_DIR/backups/backup_$(date +%Y%m%d_%H%M%S)"
LOG_DIR="$APP_DIR/backend/logs"

echo "=========================================="
echo "  开始部署电商平台"
echo "=========================================="

# 创建目录
mkdir -p $APP_DIR
mkdir -p $APP_DIR/backups
mkdir -p $LOG_DIR

# 备份旧版本
if [ -d "$APP_DIR/backend" ] && [ "$(ls -A $APP_DIR/backend)" ]; then
    mkdir -p $BACKUP_DIR
    cp -r $APP_DIR/backend $BACKUP_DIR/ 2>/dev/null || true
    cp -r $APP_DIR/frontend $BACKUP_DIR/ 2>/dev/null || true
    echo "备份完成: $BACKUP_DIR"
fi

# 停止旧服务
echo "停止旧服务..."
cd $APP_DIR/backend
if command -v pm2 &> /dev/null; then
    pm2 stop ecommerce-backend 2>/dev/null || true
    pm2 delete ecommerce-backend 2>/dev/null || true
fi
fuser -k 3001/tcp 2>/dev/null || true
sleep 3

# 解压新版本
echo "解压新版本..."
tar -zxvf /home/admin/app/package.tgz -C $APP_DIR/

# 安装后端依赖
echo "安装后端依赖..."
cd $APP_DIR/backend
npm install --production --legacy-peer-deps

# 安装前端依赖
echo "安装前端依赖..."
cd $APP_DIR/frontend
npm install
npm run build

# 配置环境变量
echo "配置环境变量..."
cd $APP_DIR/backend
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
JWT_SECRET=${JWT_SECRET}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
EOF
fi
chmod 600 .env

# 初始化数据库
echo "初始化数据库..."
if [ -f "scripts/initialize-database.js" ]; then
    node scripts/initialize-database.js
fi

# 启动新服务
echo "启动新服务..."
mkdir -p logs
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    pm2 start server.js --name ecommerce-backend
fi
pm2 save
pm2 startup

# 健康检查
echo "执行健康检查..."
sleep 10
for i in {1..5}; do
    if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "健康检查通过!"
        echo "=========================================="
        echo "  部署成功!"
        echo "=========================================="
        pm2 status
        exit 0
    fi
    echo "重试 ($i/5)..."
    sleep 5
done

echo "健康检查失败，显示日志:"
pm2 logs ecommerce-backend --lines 50
echo "=========================================="
echo "  部署失败!"
echo "=========================================="
exit 1
```

## 环境变量

在阿里云效流水线中配置以下环境变量：

| 变量名 | 值 |
|--------|-----|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3306` |
| `DB_USER` | `ecommerce` |
| `DB_PASSWORD` | `your_password` |
| `DB_NAME` | `ecommerce` |
| `JWT_SECRET` | `your_jwt_secret` |

## 部署流程图

```
┌─────────────────────────────────────────────────┐
│              阿里云效流水线部署流程               │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. 代码检出  →  CloneCheckout                  │
│        ↓                                          │
│  2. 后端构建  →  npm install --production        │
│        ↓                                          │
│  3. 前端构建  →  npm install && npm run build   │
│        ↓                                          │
│  4. 打包上传  →  归档 appctl.sh                  │
│        ↓                                          │
│  5. 主机部署  →  下载制品 + 执行部署脚本          │
│        ↓                                          │
│  6. 健康检查  →  curl http://localhost:3001      │
│        ↓                                          │
│  7. 完成!     →  钉钉/邮件通知                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 故障排查

### 1. 部署失败

```bash
# 查看服务日志
pm2 logs ecommerce-backend --lines 100

# 查看系统日志
journalctl -u nginx -f

# 检查端口占用
netstat -tulpn | grep 3001
```

### 2. 数据库连接失败

```bash
# 检查 MySQL 状态
systemctl status mysql

# 测试连接
mysql -u ecommerce -p -h localhost ecommerce
```

### 3. 回滚操作

```bash
cd /var/www/ecommerce
ls -lt backups/  # 查看可用备份
cp -r backups/backup_20240101_120000/* ./
pm2 restart ecommerce-backend
```

## 维护命令

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs ecommerce-backend -f

# 重启服务
pm2 restart ecommerce-backend

# 重新加载配置
pm2 reload ecommerce-backend

# 清理日志
pm2 flush

# 保存当前进程列表
pm2 save

# 查看资源使用
pm2 monit
```

## 安全建议

1. **定期更新**: 定期运行 `npm update` 更新依赖
2. **日志审计**: 定期检查 `/var/www/ecommerce/backend/logs`
3. **备份策略**: 保留至少7天的备份
4. **监控告警**: 配置 PM2 监控和告警

## 联系支持

如有问题，请查看：
- 部署日志: `pm2 logs ecommerce-backend`
- Nginx 日志: `/var/log/nginx/error.log`
- MySQL 日志: `/var/log/mysql/error.log`
