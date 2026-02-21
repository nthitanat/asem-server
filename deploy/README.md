# Deployment Scripts

Automated deployment scripts for ASEM Server to remote production server.

## 📁 Files

- **`config.sh`** - Server credentials and configuration (⚠️ **NOT in Git**)
- **`vpn-connect.sh`** - VPN connection management
- **`deploy.sh`** - Main deployment script

## 🚀 Quick Start

### 1. Prerequisites

Install required tools:
```bash
# macOS
brew install sshpass openconnect

# Linux
sudo apt-get install sshpass openconnect
```

### 2. First-Time Setup

The `config.sh` file is already created with your server credentials. Verify the settings are correct.

### 3. Deploy

```bash
# First-time deployment (clone repo, build, start)
./deploy/deploy.sh init

# Update deployment (pull latest code, rebuild, restart)
./deploy/deploy.sh update

# Skip VPN connection (if already connected or not needed)
./deploy/deploy.sh --skip-vpn init
./deploy/deploy.sh --skip-vpn update

# Restart containers
./deploy/deploy.sh restart

# Start stopped containers
./deploy/deploy.sh start

# Stop containers
./deploy/deploy.sh stop

# View logs
./deploy/deploy.sh logs

# Check status
./deploy/deploy.sh status
```

## 📋 Deployment Operations

### `init` - First-Time Setup
- Connects to VPN
- SSHs to remote server
- Installs Docker & Docker Compose (if needed)
- Clones GitHub repository to `/www/asem-server`
- Uploads `.env.production` file
- Builds Docker containers
- Starts the application

**When to use**: First deployment to a new server

### `update` - Update Deployment
- Connects to VPN
- SSHs to remote server
- Pulls latest code from GitHub
- **Re-uploads `.env.production`** (syncs environment variables)
- Rebuilds Docker containers
- Restarts with zero-downtime

**When to use**: After pushing code changes or updating environment variables

### `restart` - Restart Containers
- Connects to VPN
- SSHs to remote server
- Restarts Docker containers
- No code update, no env upload

**When to use**: Quick restart without code/env changes

### `start` - Start Containers
- Starts stopped containers

**When to use**: After stopping containers

### `stop` - Stop Containers
- Stops running containers (keeps data)

**When to use**: Maintenance or temporary shutdown

### `logs` - View Logs
- Streams container logs in real-time
- Press Ctrl+C to exit

**When to use**: Debugging or monitoring

### `status` - Check Status
- Shows container status, health, and ports

**When to use**: Verify deployment is running

## 🔌 VPN Connection

### Skip VPN

You can skip VPN connection in two ways:

**1. Via command-line flag:**
```bash
./deploy/deploy.sh --skip-vpn init
./deploy/deploy.sh --skip-vpn update

# Or using npm scripts
npm run deploy:init:no-vpn
npm run deploy:update:no-vpn
```

**2. Via configuration file:**
Edit `deploy/config.sh` and set:
```bash
VPN_SKIP=true
```

Use this option when:
- Already connected to VPN manually
- Testing on the same network (no VPN needed)
- VPN is temporarily unavailable

### VPN Protocols

The VPN script supports two protocols:

### OpenConnect (Cisco AnyConnect)
```bash
# In config.sh
VPN_PROTOCOL="openconnect"
```

### OpenVPN
```bash
# In config.sh
VPN_PROTOCOL="openvpn"

# Also provide config file
# Place your .ovpn file at: deploy/vpn-config.ovpn
```

### Standalone VPN Commands
```bash
# Connect
./deploy/vpn-connect.sh connect

# Disconnect
./deploy/vpn-connect.sh disconnect

# Check status
./deploy/vpn-connect.sh status
```

## 🔐 Security

### Credentials Storage
- All credentials are in `deploy/config.sh`
- This file is **NOT committed** to Git (in `.gitignore`)
- Never share or commit this file

### SSH Authentication
Currently using password authentication. For better security, consider using SSH keys:

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy to server
ssh-copy-id -p 22 adminroot@161.200.199.67

# Then update deploy.sh to remove password auth
```

## 📊 Server Information

- **Host**: 161.200.199.67
- **Port**: 22
- **Deploy Path**: `/www/asem-server`
- **Application Port**: 5001
- **VPN**: vpn.chula.ac.th

## 🐳 Docker Setup

The deployment uses production Docker configuration:
- Base: `docker-compose.yml`
- Override: `docker-compose.prod.yml`
- Environment: `.env.production` (uploaded from local)

## 📝 Environment Variables

The `.env.production` file in your project root is uploaded to the server during:
- `init` - First deployment
- `update` - Every code update

**Important**: Always update `.env.production` locally before running `deploy.sh update`

## 🔍 Troubleshooting

### VPN Connection Fails
```bash
# Check VPN status
./deploy/vpn-connect.sh status

# Manually connect
./deploy/vpn-connect.sh connect

# Check logs
cat /tmp/vpn-connect.log
```

### SSH Connection Fails
```bash
# Test SSH connection
sshpass -p "tZ#A,2]@KdGJ" ssh -p 22 adminroot@161.200.199.67 "echo 'Connection OK'"
```

### Docker Build Fails
```bash
# View logs
./deploy/deploy.sh logs

# SSH to server manually
sshpass -p "tZ#A,2]@KdGJ" ssh -p 22 adminroot@161.200.199.67

# Check Docker on server
docker ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### Container Won't Start
```bash
# Check status
./deploy/deploy.sh status

# View logs
./deploy/deploy.sh logs

# SSH to server and check
docker logs asem-server
```

## 🛠️ Customization

### Change Deploy Path
Edit `deploy/config.sh`:
```bash
SERVER_DEPLOY_PATH="/your/custom/path"
```

### Change GitHub Branch
Edit `deploy/config.sh`:
```bash
GITHUB_BRANCH="develop"  # or "master"
```

### Add Pre/Post Deploy Hooks
Edit `deploy/deploy.sh` and add custom commands in the respective functions.

## 📚 Related Documentation

- [Docker Setup](../DOCKER.md)
- [API Documentation](../API_DOCUMENTATION.md)
- [Quick Start Guide](../QUICKSTART.md)
