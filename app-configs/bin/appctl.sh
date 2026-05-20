#!/bin/bash
# ============================================================
# 电商平台部署脚本
# 用于阿里云效流水线自动化部署
# ============================================================

set -e

# 配置变量
APP_NAME="ecommerce"
APP_DIR="/var/www/ecommerce"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
LOG_DIR="$BACKEND_DIR/logs"
BACKUP_DIR="$APP_DIR/backups"  # 新增：提前定义备份目录
PM2_NAME="ecommerce-backend"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================
# 停止旧服务
# ============================================================
stop_old_service() {
    log_info "停止旧服务..."
    
    if command -v pm2 &> /dev/null; then
        pm2 stop $PM2_NAME 2>/dev/null || true
        pm2 delete $PM2_NAME 2>/dev/null || true
        log_info "PM2 服务已停止"
    fi
    
    # 确保端口未被占用
    fuser -k 3001/tcp 2>/dev/null || true
    sleep 2
}

# ============================================================
# 创建目录结构
# ============================================================
create_directories() {
    log_info "创建目录结构..."
    
    mkdir -p $APP_DIR
    mkdir -p $BACKEND_DIR
    mkdir -p $FRONTEND_DIR
    mkdir -p $LOG_DIR
    mkdir -p $BACKUP_DIR
    
    log_info "目录创建完成"
}

# ============================================================
# 备份旧版本
# ============================================================
backup_old_version() {
    log_info "备份旧版本..."
    
    if [ -d "$BACKEND_DIR" ] && [ "$(ls -A $BACKEND_DIR)" ]; then
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        CURRENT_BACKUP_DIR="$BACKUP_DIR/$BACKUP_NAME"
        mkdir -p $CURRENT_BACKUP_DIR
        
        cp -r $BACKEND_DIR $CURRENT_BACKUP_DIR/ 2>/dev/null || true
        cp -r $FRONTEND_DIR $CURRENT_BACKUP_DIR/ 2>/dev/null || true
        
        log_info "备份完成: $CURRENT_BACKUP_DIR"
        
        # 保留最近7个备份
        cd $BACKUP_DIR
        ls -t | tail -n +8 | xargs -r rm -rf
    else
        log_warn "未找到旧版本，跳过备份"
    fi
}

# ============================================================
# 解压新版本
# ============================================================
extract_new_version() {
    log_info "解压新版本..."
    
    # 优先查找指定路径的压缩包
    PACKAGE_FILE=""
    if [ -f "/home/admin/app/package2.tgz" ]; then
        PACKAGE_FILE="/home/admin/app/package2.tgz"
    elif [ -f "/home/admin/app/package.tgz" ]; then
        PACKAGE_FILE="/home/admin/app/package.tgz"
    else
        # 查找其他可能的压缩包
        PACKAGE_FILE=$(find /tmp /home -name "*.tgz" -o -name "*.tar.gz" 2>/dev/null | head -1)
    fi
    
    if [ -f "$PACKAGE_FILE" ]; then
        tar -zxf $PACKAGE_FILE -C $APP_DIR/
        log_info "解压完成: $PACKAGE_FILE"
    else
        log_error "未找到压缩包！请检查文件是否存在。"
        exit 1
    fi
}

# ============================================================
# 安装依赖
# ============================================================
install_dependencies() {
    log_info "安装后端依赖..."
    
    cd $BACKEND_DIR
    
    if [ -f "package.json" ]; then
        npm install --production --legacy-peer-deps
        log_info "后端依赖安装完成"
    else
        log_error "未找到 package.json"
        exit 1
    fi
    
    log_info "安装前端依赖..."
    
    cd $FRONTEND_DIR
    
    if [ -f "package.json" ]; then
        npm install
        npm run build
        log_info "前端构建完成"
    fi
}

# ============================================================
# 配置环境变量
# ============================================================
configure_environment() {
    log_info "配置环境变量..."
    
    cd $BACKEND_DIR
    
    # 创建 .env 文件（如果不存在）
    if [ ! -f ".env" ]; then
        cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
EOF
        log_info ".env 文件已创建"
    fi
    
    chmod 600 .env
    log_info "环境变量配置完成"
}

# ============================================================
# 初始化数据库
# ============================================================
initialize_database() {
    log_info "初始化数据库..."
    
    cd $BACKEND_DIR
    
    if [ -f "scripts/initialize-database.js" ]; then
        node scripts/initialize-database.js
        log_info "数据库初始化完成"
    else
        log_warn "数据库初始化脚本不存在，跳过"
    fi
}

# ============================================================
# 启动新服务
# ============================================================
start_new_service() {
    log_info "启动新服务..."
    
    cd $BACKEND_DIR
    
    # 使用 PM2 启动
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        pm2 start server.js --name $PM2_NAME
    fi
    
    pm2 save
    pm2 startup
    
    sleep 5
    
    # 检查服务状态
    if pm2 list | grep -q $PM2_NAME; then
        log_info "PM2 服务启动成功"
    else
        log_error "PM2 服务启动失败"
        pm2 logs $PM2_NAME --lines 20
        exit 1
    fi
}

# ============================================================
# 健康检查
# ============================================================
health_check() {
    log_info "执行健康检查..."
    
    sleep 10
    
    for i in {1..5}; do
        if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
            log_info "健康检查通过!"
            return 0
        fi
        log_warn "健康检查失败，重试 ($i/5)..."
        sleep 5
    done
    
    log_error "健康检查失败"
    pm2 logs $PM2_NAME --lines 50
    return 1
}

# ============================================================
# 清理工作
# ============================================================
cleanup() {
    log_info "清理临时文件..."
    
    # 清理旧备份（保留7天）
    if [ -d "$BACKUP_DIR" ]; then
        find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    fi
    
    # 清理 PM2 日志
    pm2 flush 2>/dev/null || true
    
    log_info "清理完成"
}

# ============================================================
# 回滚函数
# ============================================================
rollback() {
    log_error "部署失败，执行回滚..."
    
    # 查找最近的备份
    if [ -d "$BACKUP_DIR" ]; then
        BACKUP_NAME=$(ls -t $BACKUP_DIR | head -1)
        if [ -n "$BACKUP_NAME" ]; then
            log_info "从 $BACKUP_DIR/$BACKUP_NAME 回滚..."
            
            # 停止当前服务
            pm2 stop $PM2_NAME 2>/dev/null || true
            pm2 delete $PM2_NAME 2>/dev/null || true
            
            # 恢复备份
            rm -rf $BACKEND_DIR $FRONTEND_DIR
            cp -r $BACKUP_DIR/$BACKUP_NAME/backend $APP_DIR/
            cp -r $BACKUP_DIR/$BACKUP_NAME/frontend $APP_DIR/
            
            # 重启服务
            cd $BACKEND_DIR
            npm install --production 2>/dev/null || true
            
            if [ -f "ecosystem.config.js" ]; then
                pm2 start ecosystem.config.js
            else
                pm2 start server.js --name $PM2_NAME
            fi
            
            pm2 save
            
            log_info "回滚完成"
            exit 0
        fi
    fi
    
    log_error "没有可用的备份，回滚失败"
    exit 1
}

# ============================================================
# 主函数
# ============================================================
main() {
    log_info "=========================================="
    log_info "  电商平台部署脚本开始执行"
    log_info "=========================================="
    
    case "${1:-deploy}" in
        deploy)
            stop_old_service
            create_directories
            backup_old_version
            extract_new_version
            install_dependencies
            configure_environment
            initialize_database
            start_new_service
            
            if health_check; then
                cleanup
                log_info "=========================================="
                log_info "  部署成功!"
                log_info "=========================================="
                pm2 status
            else
                rollback
                exit 1
            fi
            ;;
        restart)
            stop_old_service
            start_new_service
            
            if health_check; then
                log_info "服务重启成功"
            else
                log_error "服务重启失败"
                exit 1
            fi
            ;;
        stop)
            stop_old_service
            log_info "服务已停止"
            ;;
        status)
            pm2 status
            ;;
        logs)
            pm2 logs $PM2_NAME --lines 100
            ;;
        rollback)
            rollback
            ;;
        *)
            echo "用法: $0 {deploy|restart|stop|status|logs|rollback}"
            echo ""
            echo "命令说明:"
            echo "  deploy   - 完整部署流程（默认）"
            echo "  restart  - 仅重启服务"
            echo "  stop     - 停止服务"
            echo "  status   - 查看服务状态"
            echo "  logs     - 查看服务日志"
            echo "  rollback - 回滚到上一版本"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
