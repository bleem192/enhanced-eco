#!/bin/bash

# 电商平台快速部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 未安装，请先安装"
        exit 1
    fi
}

# 检查必要的命令
log_info "检查环境..."
check_command node
check_command npm
check_command mysql

echo
log_info "===================================="
log_info "电商平台部署向导"
log_info "===================================="
echo

# 配置数据库
read -p "请输入 MySQL root 密码: " DB_ROOT_PASSWORD
read -p "请输入要创建的数据库用户名 [ecommerce_user]: " DB_USER
DB_USER=${DB_USER:-ecommerce_user}
read -p "请输入数据库用户密码: " DB_PASSWORD
read -p "请输入数据库名称 [ecommerce]: " DB_NAME
DB_NAME=${DB_NAME:-ecommerce}

echo
log_info "创建数据库和用户..."
mysql -u root -p"$DB_ROOT_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

log_info "数据库创建成功"

# 创建 .env 文件
echo
log_info "创建 .env 配置文件..."
cat > backend/.env <<EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -hex 32)

DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
EOF

log_info ".env 文件创建成功"

# 安装依赖
echo
log_info "安装后端依赖..."
cd backend
npm install
cd ..

log_info "安装前端依赖..."
cd frontend
npm install
cd ..

# 初始化数据库
echo
log_info "初始化数据库..."
cd backend
npm run init-db
cd ..

# 检查是否安装 PM2
if ! command -v pm2 &> /dev/null; then
    echo
    read -p "是否安装 PM2 进行进程管理? (y/n): " INSTALL_PM2
    if [[ $INSTALL_PM2 == "y" ]]; then
        log_info "安装 PM2..."
        npm install -g pm2
    fi
fi

# 启动服务
echo
read -p "是否立即启动服务? (y/n): " START_SERVICE
if [[ $START_SERVICE == "y" ]]; then
    cd backend
    if command -v pm2 &> /dev/null; then
        log_info "使用 PM2 启动后端服务..."
        pm2 start ecosystem.config.js --env production
        log_info "服务已启动，使用 'pm2 logs' 查看日志"
        log_info "使用 'pm2 status' 查看状态"
    else
        log_info "使用 Node 直接启动后端服务..."
        npm start &
        log_info "服务已在后台启动"
    fi
    cd ..
fi

echo
log_info "===================================="
log_info "部署完成！"
log_info "===================================="
echo
log_info "默认登录凭据："
log_info "  Admin:    admin / admin123"
log_info "  Sales1:   sales1 / sales123"
log_info "  Sales2:   sales2 / sales123"
log_info "  Customer: customer1 / customer123"
echo
log_warn "警告: 请立即修改默认密码！"
echo
log_info "更多部署信息请查看 docs/DEPLOYMENT.md"
echo
