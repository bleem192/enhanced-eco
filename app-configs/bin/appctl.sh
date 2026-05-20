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
BACKUP_DIR="$APP_DIR/backups"
PM2_NAME="ecommerce-backend"

# 健康检查配置（可通过环境变量覆盖）
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-5}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-5}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-10}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# ============================================================
# 依赖检查
# ============================================================
check_dependencies() {
    log_info "检查依赖命令..."
    
    local required_commands=("tar" "curl" "mkdir" "cp" "rm")
    local optional_commands=("pm2" "node" "npm" "fuser")
    local missing_required=()
    local missing_optional=()
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_required+=("$cmd")
        fi
    done
    
    for cmd in "${optional_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_optional+=("$cmd")
        fi
    done
    
    if [ ${#missing_required[@]} -gt 0 ]; then
        log_error "缺少必需的命令: ${missing_required[*]}"
        exit 1
    fi
    
    if [ ${#missing_optional[@]} -gt 0 ]; then
        log_warn "缺少可选的命令: ${missing_optional[*]}，部分功能可能受限"
    fi
    
    log_info "依赖检查通过"
}

# ============================================================
# 动态检测 Node.js 路径
# ============================================================
detect_node_path() {
    log_info "检测 Node.js 环境..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
        log_info "Node.js 版本: $NODE_VERSION"
        return 0
    fi
    
    local node_paths=(
        "/usr/local/bin"
        "/usr/bin"
        "$HOME/.nvm/versions/node/*/bin"
        "/usr/local/node/*/bin"
    )
    
    for path_pattern in "${node_paths[@]}"; do
        for path in $path_pattern; do
            if [ -x "$path/node" ] 2>/dev/null; then
                export PATH="$PATH:$path"
                log_info "找到 Node.js: $path"
                return 0
            fi
        done
    done
    
    log_error "未找到 Node.js 安装，请先安装 Node.js"
    exit 1
}

# ============================================================
# 验证必需的环境变量
# ============================================================
validate_environment() {
    log_info "验证环境变量..."
    
    local required_vars=("JWT_SECRET" "DB_PASSWORD")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_warn "缺少以下环境变量: ${missing_vars[*]}"
        log_warn "应用可能无法正常运行，请确保已正确配置"
    fi
}

# ============================================================
# 停止旧服务
# ============================================================
stop_old_service() {
    log_info "停止旧服务..."
    
    if command -v pm2 &> /dev/null; then
        pm2 stop "$PM2_NAME" 2>/dev/null || true
        pm2 delete "$PM2_NAME" 2>/dev/null || true
        log_info "PM2 服务已停止"
    fi
    
    if command -v fuser &> /dev/null; then
        fuser -k 3001/tcp 2>/dev/null || true
    fi
    
    sleep 2
}

# ============================================================
# 创建目录结构
# ============================================================
create_directories() {
    log_info "创建目录结构..."
    
    mkdir -p "$APP_DIR"
    mkdir -p "$BACKEND_DIR"
    mkdir -p "$FRONTEND_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"
    
    log_info "目录创建完成"
}

# ============================================================
# 备份旧版本
# ============================================================
backup_old_version() {
    log_info "备份旧版本..."
    
    if [ -d "$BACKEND_DIR" ] && [ "$(ls -A "$BACKEND_DIR" 2>/dev/null)" ]; then
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        CURRENT_BACKUP_DIR="$BACKUP_DIR/$BACKUP_NAME"
        mkdir -p "$CURRENT_BACKUP_DIR"
        
        cp -r "$BACKEND_DIR" "$CURRENT_BACKUP_DIR/backend" 2>/dev/null || true
        cp -r "$FRONTEND_DIR" "$CURRENT_BACKUP_DIR/frontend" 2>/dev/null || true
        
        cat > "$CURRENT_BACKUP_DIR/metadata.json" << EOF
{
    "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
    "app_name": "$APP_NAME"
}
EOF
        
        log_info "备份完成: $CURRENT_BACKUP_DIR"
        
        cd "$BACKUP_DIR" || return
        ls -t | tail -n +8 | while read -r dir; do
            if [ -n "$dir" ] && [ "$dir" != "." ] && [ "$dir" != ".." ]; then
                log_info "删除旧备份: $dir"
                rm -rf "$dir"
            fi
        done
    else
        log_warn "未找到旧版本，跳过备份"
    fi
}

# ============================================================
# 解压新版本
# ============================================================
extract_new_version() {
    log_info "解压新版本..."
    
    local PACKAGE_FILE=""
    local SAFE_DIRS=("/home/admin/app" "/tmp/deploy")
    
    for pkg_name in "package2.tgz" "package.tgz"; do
        for dir in "${SAFE_DIRS[@]}"; do
            if [ -f "$dir/$pkg_name" ]; then
                PACKAGE_FILE="$dir/$pkg_name"
                break 2
            fi
        done
    done
    
    if [ -z "$PACKAGE_FILE" ]; then
        for dir in "${SAFE_DIRS[@]}"; do
            if [ -d "$dir" ]; then
                for ext in "tgz" "tar.gz"; do
                    file=$(find "$dir" -maxdepth 1 -name "*.$ext" -type f 2>/dev/null | head -1)
                    if [ -n "$file" ]; then
                        PACKAGE_FILE="$file"
                        break 2
                    fi
                done
            fi
        done
    fi
    
    if [ -n "$PACKAGE_FILE" ] && [ -f "$PACKAGE_FILE" ]; then
        log_info "使用压缩包: $PACKAGE_FILE"
        tar -zxf "$PACKAGE_FILE" -C "$APP_DIR/"
        log_info "解压完成"
    else
        log_error "未找到压缩包！请检查文件是否存在。"
        log_error "已检查目录: ${SAFE_DIRS[*]}"
        exit 1
    fi
}

# ============================================================
# 安装依赖
# ============================================================
install_dependencies() {
    log_info "安装后端依赖..."
    
    detect_node_path
    
    cd "$BACKEND_DIR" || exit 1
    
    if [ -f "package.json" ]; then
        npm install --production --legacy-peer-deps
        log_info "后端依赖安装完成"
    else
        log_error "未找到 package.json"
        exit 1
    fi
    
    log_info "安装前端依赖..."
    
    cd "$FRONTEND_DIR" || exit 1
    
    if [ -f "package.json" ]; then
        npm install
        npm run build
        log_info "前端构建完成"
    else
        log_warn "前端 package.json 不存在，跳过前端构建"
    fi
}

# ============================================================
# 配置环境变量
# ============================================================
configure_environment() {
    log_info "配置环境变量..."
    
    cd "$BACKEND_DIR" || exit 1
    
    if [ ! -f ".env" ]; then
        cat > .env << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=${JWT_SECRET:-}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-ecommerce}
EOF
        log_info ".env 文件已创建"
    else
        log_info ".env 文件已存在，跳过创建"
    fi
    
    chmod 600 .env
    
    validate_environment
    
    log_info "环境变量配置完成"
}

# ============================================================
# 初始化数据库
# ============================================================
initialize_database() {
    log_info "初始化数据库..."
    
    cd "$BACKEND_DIR" || exit 1
    
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
    
    cd "$BACKEND_DIR" || exit 1
    
    mkdir -p logs
    
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        pm2 start server.js --name "$PM2_NAME"
    fi
    
    pm2 save
    pm2 startup
    
    sleep 5
    
    if pm2 list | grep -q "$PM2_NAME"; then
        log_info "PM2 服务启动成功"
    else
        log_error "PM2 服务启动失败"
        pm2 logs "$PM2_NAME" --lines 20
        exit 1
    fi
}

# ============================================================
# 健康检查
# ============================================================
health_check() {
    log_info "执行健康检查..."
    
    sleep 10
    
    local retry=0
    while [ $retry -lt "$HEALTH_CHECK_RETRIES" ]; do
        retry=$((retry + 1))
        
        if curl -f -s --max-time "$HEALTH_CHECK_TIMEOUT" http://localhost:3001/api/health > /dev/null 2>&1; then
            log_info "健康检查通过!"
            return 0
        fi
        
        if [ $retry -lt "$HEALTH_CHECK_RETRIES" ]; then
            log_warn "健康检查失败，${HEALTH_CHECK_INTERVAL}秒后重试 ($retry/$HEALTH_CHECK_RETRIES)..."
            sleep "$HEALTH_CHECK_INTERVAL"
        fi
    done
    
    log_error "健康检查失败"
    pm2 logs "$PM2_NAME" --lines 50
    return 1
}

# ============================================================
# 清理工作
# ============================================================
cleanup() {
    log_info "清理临时文件..."
    
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +7 | while read -r dir; do
            if [ -n "$dir" ] && [ "$dir" != "$BACKUP_DIR" ]; then
                log_info "删除旧备份: $dir"
                rm -rf "$dir"
            fi
        done
    fi
    
    if command -v pm2 &> /dev/null; then
        pm2 flush 2>/dev/null || true
    fi
    
    log_info "清理完成"
}

# ============================================================
# 回滚函数
# ============================================================
rollback() {
    log_error "部署失败，执行回滚..."
    
    if [ -d "$BACKUP_DIR" ]; then
        BACKUP_NAME=$(ls -t "$BACKUP_DIR" | head -1)
        
        if [ -n "$BACKUP_NAME" ]; then
            RESTORE_PATH="$BACKUP_DIR/$BACKUP_NAME"
            
            if [ ! -d "$RESTORE_PATH/backend" ]; then
                log_error "备份不完整: 缺少 backend 目录"
                log_error "无法执行回滚"
                exit 1
            fi
            
            log_info "从 $RESTORE_PATH 回滚..."
            
            if command -v pm2 &> /dev/null; then
                pm2 stop "$PM2_NAME" 2>/dev/null || true
                pm2 delete "$PM2_NAME" 2>/dev/null || true
            fi
            
            rm -rf "$BACKEND_DIR" "$FRONTEND_DIR"
            cp -r "$RESTORE_PATH/backend" "$APP_DIR/"
            
            if [ -d "$RESTORE_PATH/frontend" ]; then
                cp -r "$RESTORE_PATH/frontend" "$APP_DIR/"
            fi
            
            cd "$BACKEND_DIR" || exit 1
            npm install --production 2>/dev/null || true
            
            if [ -f "ecosystem.config.js" ]; then
                pm2 start ecosystem.config.js
            else
                pm2 start server.js --name "$PM2_NAME"
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
# 显示帮助信息
# ============================================================
show_help() {
    echo "用法: $0 {deploy|restart|stop|status|logs|rollback}"
    echo ""
    echo "命令说明:"
    echo "  deploy   - 完整部署流程（默认）"
    echo "  restart  - 仅重启服务"
    echo "  stop     - 停止服务"
    echo "  status   - 查看服务状态"
    echo "  logs     - 查看服务日志"
    echo "  rollback - 回滚到上一版本"
    echo ""
    echo "环境变量:"
    echo "  HEALTH_CHECK_RETRIES  - 健康检查重试次数 (默认: 5)"
    echo "  HEALTH_CHECK_INTERVAL - 健康检查间隔秒数 (默认: 5)"
    echo "  HEALTH_CHECK_TIMEOUT  - 健康检查超时秒数 (默认: 10)"
    echo "  JWT_SECRET            - JWT 密钥 (必需)"
    echo "  DB_PASSWORD           - 数据库密码 (必需)"
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
            check_dependencies
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
            check_dependencies
            create_directories
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
            if command -v pm2 &> /dev/null; then
                pm2 status
            else
                log_error "PM2 未安装"
                exit 1
            fi
            ;;
        logs)
            if command -v pm2 &> /dev/null; then
                pm2 logs "$PM2_NAME" --lines 100
            else
                log_error "PM2 未安装"
                exit 1
            fi
            ;;
        rollback)
            rollback
            ;;
        -h|--help|help)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
