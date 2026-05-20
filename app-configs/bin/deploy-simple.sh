#!/bin/bash
set -e

APP_DIR="/var/www/ecommerce"
BACKUP_DIR="$APP_DIR/backups/backup_$(date +%Y%m%d_%H%M%S)"

echo "=== 开始部署电商平台 ==="

# 备份
[ -d "$APP_DIR/backend" ] && mkdir -p $BACKUP_DIR && cp -r $APP_DIR/backend $BACKUP_DIR/ 2>/dev/null

# 停止旧服务
cd $APP_DIR/backend && pm2 stop ecommerce-backend 2>/dev/null || true && pm2 delete ecommerce-backend 2>/dev/null || true

# 解压
tar -zxvf /home/admin/app/package.tgz -C $APP_DIR/ > /dev/null

# 安装依赖
cd $APP_DIR/backend && npm install --production --legacy-peer-deps
cd $APP_DIR/frontend && npm install && npm run build

# 配置环境
cd $APP_DIR/backend && [ ! -f ".env" ] && cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
JWT_SECRET=${JWT_SECRET}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
EOF
chmod 600 .env

# 初始化数据库
[ -f "scripts/initialize-database.js" ] && node scripts/initialize-database.js

# 启动服务
mkdir -p logs
pm2 start server.js --name ecommerce-backend || pm2 restart ecommerce-backend
pm2 save && pm2 startup

# 健康检查
sleep 10
for i in {1..5}; do
    curl -f -s http://localhost:3001/api/health > /dev/null && echo "=== 部署成功 ===" && pm2 status && exit 0
    sleep 5
done

echo "=== 部署失败 ==="
pm2 logs ecommerce-backend --lines 20
exit 1
