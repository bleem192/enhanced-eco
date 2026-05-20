# 电商平台部署指南

## 目录

- [环境准备](#环境准备)
- [数据库初始化](#数据库初始化)
- [后端部署](#后端部署)
- [前端部署](#前端部署)
- [云服务器部署示例](#云服务器部署示例)
- [维护和监控](#维护和监控)

## 环境准备

### 系统要求

- Node.js >= 16.0
- MySQL >= 5.7 或 MariaDB >= 10.2
- 至少 2GB RAM
- 至少 10GB 磁盘空间

### 安装依赖

```bash
# 安装 Node.js
# 下载: https://nodejs.org/

# 安装 MySQL
# Ubuntu/Debian: sudo apt install mysql-server
# CentOS/RHEL: sudo yum install mysql-server
# macOS: brew install mysql
# Windows: 下载 MySQL Installer
```

## 数据库初始化

### 1. 配置环境变量

在 `backend/` 目录下创建 `.env` 文件：

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your_jwt_secret_key_here_change_in_production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=ecommerce_user
DB_PASSWORD=your_secure_password
DB_NAME=ecommerce
```

### 2. 创建数据库用户

```sql
-- 登录 MySQL
mysql -u root -p

-- 创建数据库和用户
CREATE DATABASE IF NOT EXISTS ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ecommerce_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON ecommerce.* TO 'ecommerce_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 运行初始化脚本

```bash
cd backend

# 安装依赖
npm install

# 运行数据库初始化脚本
npm run init-db
```

初始化脚本会自动：
- 创建所有数据库表
- 插入初始用户（admin, sales1, sales2, customer1）
- 插入示例产品数据
- 插入系统配置
- 验证初始化结果

### 4. 默认登录凭据

| 用户类型 | 用户名 | 密码 |
|---------|--------|------|
| Admin | admin | admin123 |
| Sales1 | sales1 | sales123 |
| Sales2 | sales2 | sales123 |
| Customer | customer1 | customer123 |

> ⚠️ **重要**: 生产环境请务必修改默认密码！

## 后端部署

### 1. 安装 PM2 (推荐用于生产环境)

```bash
npm install -g pm2
```

### 2. 配置 PM2

在 `backend/` 目录下创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'ecommerce-backend',
    script: './server.js',
    cwd: '/path/to/ecommerce/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

### 3. 启动后端服务

```bash
cd backend

# 使用 PM2 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs ecommerce-backend
```

### 4. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 前端静态文件
    location / {
        root /path/to/ecommerce/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### 5. 配置 HTTPS (Let's Encrypt)

```bash
# 安装 Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 前端部署

### 1. 构建生产版本

```bash
cd frontend

# 安装依赖
npm install

# 修改 .env.production
VITE_API_BASE_URL=https://your-domain.com/api

# 构建
npm run build
```

### 2. 使用 Nginx 托管前端

参考上面的 Nginx 配置，将前端构建文件放到指定目录。

## 云服务器部署示例

### 阿里云 ECS / 腾讯云 CVM / AWS EC2

#### 1. 连接到服务器

```bash
ssh root@your-server-ip
```

#### 2. 更新系统

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### 3. 安装 Node.js

```bash
# 使用 NVM (推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

#### 4. 安装 MySQL

```bash
# Ubuntu/Debian
sudo apt install mysql-server -y

# CentOS/RHEL
sudo yum install mysql-server -y

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### 5. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 6. 上传代码

```bash
# 从 GitHub 克隆
git clone https://github.com/bleem192/enhanced-eco.git
cd enhanced-eco

# 或使用 SCP 上传
scp -r ./ecommerce root@your-server-ip:/var/www/
```

#### 7. 初始化数据库

```bash
cd /var/www/ecommerce/backend
npm install
npm run init-db
```

#### 8. 启动服务

```bash
# 后端
npm install -g pm2
pm2 start ecosystem.config.js

# 重启 Nginx
sudo systemctl reload nginx
```

## 维护和监控

### 日志文件

- **后端日志**: `backend/logs/`
- **PM2 日志**: 使用 `pm2 logs` 查看
- **Nginx 日志**: `/var/log/nginx/`

### 数据库备份

创建定时备份脚本 `/etc/cron.daily/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u ecommerce_user -p'your_password' ecommerce | gzip > $BACKUP_DIR/ecommerce_$DATE.sql.gz
find $BACKUP_DIR -name "ecommerce_*.sql.gz" -mtime +7 -delete
```

设置权限:
```bash
chmod +x /etc/cron.daily/backup-db.sh
```

### 性能监控

- 使用 `pm2 monit` 监控 Node.js 应用
- 使用 `htop` 监控系统资源
- 使用 `mysqladmin processlist` 监控 MySQL

### 安全建议

1. 修改所有默认密码
2. 启用防火墙（ufw/iptables）
3. 定期更新系统和依赖包
4. 使用 SSL/TLS 加密传输
5. 配置 fail2ban 防止暴力破解
6. 定期备份数据库

## 故障排查

### 后端无法启动

```bash
# 检查 PM2 日志
pm2 logs ecommerce-backend

# 检查端口占用
sudo netstat -tulpn | grep 3001

# 检查数据库连接
mysql -u ecommerce_user -p -h localhost
```

### 前端无法访问

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 检查 Nginx 配置
sudo nginx -t

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 数据库连接失败

```bash
# 检查 MySQL 状态
sudo systemctl status mysql

# 测试连接
mysql -u ecommerce_user -p -h localhost ecommerce

# 检查数据库用户权限
mysql -u root -p -e "SHOW GRANTS FOR 'ecommerce_user'@'localhost';"
```

## 技术支持

如遇到问题，请查看：
- 项目 GitHub Issues: https://github.com/bleem192/enhanced-eco/issues
- 项目文档: docs/ 目录
