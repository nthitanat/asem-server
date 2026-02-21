#!/bin/bash

# ASEM Server Deployment Script
# Deploy Node.js application to remote server via SSH and VPN

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load configuration
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo "❌ Error: config.sh not found!"
    echo "   Create deploy/config.sh with server credentials"
    exit 1
fi

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ========================================
# Helper Functions
# ========================================

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Connect to VPN
connect_vpn() {
    print_info "Connecting to VPN..."
    if bash "$SCRIPT_DIR/vpn-connect.sh" connect; then
        print_success "VPN connected"
        return 0
    else
        print_error "VPN connection failed"
        return 1
    fi
}

# Execute command on remote server via SSH
remote_exec() {
    local cmd="$1"
    sshpass -p "$SERVER_PASSWORD" ssh \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -p "$SERVER_PORT" \
        "$SERVER_USER@$SERVER_HOST" \
        "$cmd"
}

# Upload file to remote server
upload_file() {
    local local_file="$1"
    local remote_file="$2"
    
    sshpass -p "$SERVER_PASSWORD" scp \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -P "$SERVER_PORT" \
        "$local_file" \
        "$SERVER_USER@$SERVER_HOST:$remote_file"
}

# Check if sshpass is installed
check_dependencies() {
    if ! command -v sshpass &> /dev/null; then
        print_error "sshpass is not installed"
        echo "   Install with: brew install sshpass"
        exit 1
    fi
}

# Upload .env.production file
upload_env_file() {
    print_info "Uploading .env.production..."
    
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        print_error ".env.production not found in project root"
        echo "   Create .env.production with production settings"
        exit 1
    fi
    
    # Upload to server
    upload_file "$PROJECT_ROOT/.env.production" "$SERVER_DEPLOY_PATH/.env.production"
    print_success ".env.production uploaded"
}

# ========================================
# Deployment Operations
# ========================================

# Initialize server (first-time setup)
init_deployment() {
    print_header "🚀 Initializing Deployment (First-time Setup)"
    
    # Check if Docker is installed on server
    print_info "Checking server prerequisites..."
    if ! remote_exec "command -v docker &> /dev/null"; then
        print_warning "Docker not found on server"
        print_info "Installing Docker..."
        remote_exec "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
        remote_exec "sudo usermod -aG docker $SERVER_USER"
        print_success "Docker installed"
    else
        print_success "Docker already installed"
    fi
    
    # Check if Docker Compose is installed
    if ! remote_exec "docker compose version &> /dev/null"; then
        print_warning "Docker Compose not found"
        print_info "Installing Docker Compose..."
        remote_exec "sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
        remote_exec "sudo chmod +x /usr/local/bin/docker-compose"
        print_success "Docker Compose installed"
    else
        print_success "Docker Compose already installed"
    fi
    
    # Check if repository exists
    print_info "Checking repository..."
    if remote_exec "[ -d $SERVER_DEPLOY_PATH ]"; then
        print_warning "Repository directory already exists"
        read -p "Do you want to remove and re-clone? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            remote_exec "sudo rm -rf $SERVER_DEPLOY_PATH"
            print_info "Removed existing directory"
        else
            print_info "Keeping existing directory"
            return 0
        fi
    fi
    
    # Create directory and clone repository
    print_info "Cloning repository..."
    remote_exec "sudo mkdir -p $SERVER_DEPLOY_PATH"
    remote_exec "sudo chown -R $SERVER_USER:$SERVER_USER $SERVER_DEPLOY_PATH"
    
    # Configure git credentials for private repo
    remote_exec "git config --global credential.helper store"
    remote_exec "echo 'https://$GITHUB_TOKEN@github.com' > ~/.git-credentials"
    
    # Clone repository
    remote_exec "git clone $GITHUB_REPO $SERVER_DEPLOY_PATH"
    print_success "Repository cloned"
    
    # Upload .env.production
    upload_env_file
    
    # Build and start containers
    print_info "Building Docker containers..."
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES build"
    print_success "Docker containers built"
    
    print_info "Starting containers..."
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES up -d"
    print_success "Containers started"
    
    # Show status
    sleep 3
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES ps"
    
    print_header "✅ Deployment Initialized Successfully!"
    print_info "Application URL: http://$SERVER_HOST:$APP_PORT"
}

# Update deployment (pull latest code and rebuild)
update_deployment() {
    print_header "🔄 Updating Deployment"
    
    # Pull latest code
    print_info "Pulling latest code from GitHub..."
    remote_exec "cd $SERVER_DEPLOY_PATH && git pull origin $GITHUB_BRANCH"
    print_success "Code updated"
    
    # Upload .env.production (in case env vars changed)
    upload_env_file
    
    # Rebuild containers
    print_info "Rebuilding Docker containers..."
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES build"
    print_success "Containers rebuilt"
    
    # Restart with zero-downtime
    print_info "Restarting containers..."
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES up -d --force-recreate"
    print_success "Containers restarted"
    
    # Show status
    sleep 3
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES ps"
    
    print_header "✅ Deployment Updated Successfully!"
}

# Restart containers
restart_deployment() {
    print_header "🔄 Restarting Containers"
    
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES restart"
    print_success "Containers restarted"
    
    # Show status
    sleep 2
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES ps"
}

# Start containers
start_deployment() {
    print_header "▶️  Starting Containers"
    
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES start"
    print_success "Containers started"
    
    # Show status
    sleep 2
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES ps"
}

# Stop containers
stop_deployment() {
    print_header "⏹️  Stopping Containers"
    
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES stop"
    print_success "Containers stopped"
}

# View logs
view_logs() {
    print_header "📋 Container Logs"
    
    print_info "Press Ctrl+C to exit logs"
    sleep 1
    
    # Follow logs (this will stream until Ctrl+C)
    sshpass -p "$SERVER_PASSWORD" ssh \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -p "$SERVER_PORT" \
        "$SERVER_USER@$SERVER_HOST" \
        "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES logs -f --tail=100"
}

# Check status
check_status() {
    print_header "📊 Deployment Status"
    
    print_info "Container Status:"
    remote_exec "cd $SERVER_DEPLOY_PATH && docker compose $DOCKER_COMPOSE_FILES ps"
    
    echo ""
    print_info "Container Health:"
    remote_exec "docker ps --filter name=$CONTAINER_NAME --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    
    echo ""
    print_info "Application URL: http://$SERVER_HOST:$APP_PORT"
}

# ========================================
# Main Script
# ========================================

# Check dependencies
check_dependencies

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 {init|update|restart|start|stop|logs|status}"
    echo ""
    echo "Commands:"
    echo "  init     - First-time setup (clone repo, build, start)"
    echo "  update   - Update deployment (pull code, rebuild, restart)"
    echo "  restart  - Restart containers"
    echo "  start    - Start stopped containers"
    echo "  stop     - Stop running containers"
    echo "  logs     - View container logs (real-time)"
    echo "  status   - Check deployment status"
    echo ""
    exit 1
fi

# Connect to VPN first
connect_vpn

# Execute command
case "$1" in
    init)
        init_deployment
        ;;
    update)
        update_deployment
        ;;
    restart)
        restart_deployment
        ;;
    start)
        start_deployment
        ;;
    stop)
        stop_deployment
        ;;
    logs)
        view_logs
        ;;
    status)
        check_status
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Usage: $0 {init|update|restart|start|stop|logs|status}"
        exit 1
        ;;
esac

print_success "Operation completed successfully!"
