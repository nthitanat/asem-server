# 🐳 Docker Setup Guide

This project includes Docker and Docker Compose configurations for both development and production environments.

**Note:** This setup uses your **existing local MySQL server** (not containerized). The Docker container connects to your host machine's MySQL.

## 📋 Prerequisites

- Docker Desktop (macOS/Windows) or Docker Engine (Linux)
- Docker Compose V2
- **MySQL server running on your host machine** (localhost)

## 🚀 Quick Start

### Development Mode (with hot-reload)

```bash
# Start development environment
npm run docker:dev

# Or with rebuild
npm run docker:dev:build

# Stop development environment
npm run docker:dev:down
```

**What you get:**
- Node.js app with nodemon (hot-reload)
- Connects to your local MySQL server
- MailDev (email testing at http://localhost:1080)
- Source code mounted for instant changes

### Production Mode

```bash
# First time: Copy and configure production environment
cp .env.production.example .env.production
# Edit .env.production with your production values

# Start production environment
npm run docker:prod

# Or with rebuild
npm run docker:prod:build

# Stop production environment
npm run docker:prod:down
```

## 📦 Available Commands

| Command | Description |
|---------|-------------|
| `npm run docker:dev` | Start development environment |
| `npm run docker:dev:build` | Rebuild and start development |
| `npm run docker:dev:down` | Stop development environment |
| `npm run docker:prod` | Start production environment (detached) |
| `npm run docker:prod:build` | Rebuild and start production |
| `npm run docker:prod:down` | Stop production environment |
| `npm run docker:logs` | View application logs |
| `npm run docker:clean` | Remove all containers, networks, and volumes |

## 🔧 Configuration

### Environment Files

Your existing environment files are used as the **single source of truth**:

- **`.env.development`** - Development configuration (existing)
- **`.env.production`** - Production configuration (create from template)

Docker Compose automatically loads these files and overrides:
- `DB_HOST=host.docker.internal` - To connect to your local MySQL
- `SMTP_HOST=maildev` (dev only) - To use MailDev container

### Database Connection

The Docker container connects to your **host machine's MySQL server** using `host.docker.internal`:
(on host machine, not containerized) 
- Your `.env.development` has: `DB_HOST=localhost` (for local dev)
- Docker overrides to: `DB_HOST=host.docker.internal` (to access host MySQL)
- Same database, same credentials - just different hostname for Docker networking

**Important:** Make sure your MySQL server is running on your host machine before starting Docker!

### Port Mappings

| Service | Port | Description |
|---------|------|-------------|
| ApExternal MySQL**: Uses your existing local MySQL server
| MySQL | 3306 | Database |
| MailDev Web | 1080 | Email testing UI (dev only) |
| MailDev SMTP | 1025 | SMTP server (dev only) |

## 🎯 How It Works

### Development Mode Features

✅ **Hot-reload**: Edit code → Save → Server restarts automatically  
✅ **Source mounted**: Changes reflect instantly without rebuild  
✅ **MailDev**: Test emails at http://localhost:1080  
✅ **MySQL**: Persistent data in named volume  
✅ **Uses**: `.env.development` file  

### Production Mode Features

✅ **Optimized build**: Multi-stage Dockerfile, minimal image size  
✅ **Security**: Runs as non-root user  
✅ **Health checks**: Automatic container health monitoring  
✅ **Resource limits**: CPU and memory constraints  
✅ **Log rotation**: Prevents disk space issues  
✅ **Uses**: `.env.production` file  

## 🗂️ Docker Architecture

```
Dockerfile (multi-stage)
├── base → Common setup
├── development → Includes nodemon, dev tools
└── production → Optimized, minimal, secure

docker-compose.yml → Base configuration (app service, networking)
docker-compose.dev.yml → Development overrides (volumes, maildev)
docker-compose.prod.yml → Production overrides (optimization, logging)

External Services:
└── MySQL → Running on host machine (not containerized)
```

## 💾 Data Persistence

MySQL data is managed by your **local MySQL server** on your host machine. Docker does not manage the database - it only connects to your existing MySQL installation.

## 🔍 Debugging

**View logs:**
```bash
# Application logs
npm run docker:logs

# All services
docker-compose logs -f

# Specific service
docker-compose logs -f mysql
```

**Access container shell:**
```bash
# App container
docker exec -it asem-server sh

# MySQL container
docker exec -it asem-mysql mysql -u root -p
```
(on host machine, not in Docker)
mysql -u thitanat.n -p asem_dev_db
```bash
docker-compose ps
```

## 🌐 Testing Emails (Development)

MailDev captures all emails sent by your application:

1. Start development environment: `npm run docker:dev`
2. Open browser: http://localhost:1080
3. Send emails from your app
4. View them in MailDev UI

Your app should use these SMTP settings in `.env.development`:
```env
SMTP_HOST=maildev
SMTP_PORT=1025
```

## 🔐 Security Best Practices (Production)

Before deploying to production:

1. **Generate secure secrets:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Update `.env.production`:**
   - Change all passwords
   - Use strong JWT secret (64+ characters)
   - Configure production SMTP
   - Set correct CORS origins
   - Use production database credentials

3. **Review security settings:**
   - Set `BCRYPT_ROUNDS=12` or higher
   - Use restrictive `RATE_LIMIT_MAX_REQUESTS`
   - Enable HTTPS in production

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Change ports in docker-compose.yml or stop conflicting service
lsof -ti:5001 | xargs kill -9  # macOS/Linux
```

**MySQL connection issues:**
```bash
# Wait for MySQL to be ready (health check takes ~30s)
docker-compose logs mysql

# 1. Make sure MySQL is running on your host machine
brew services list  # macOS with Homebrew
sudo systemctl status mysql  # Linux

# 2. Verify MySQL is accessible
mysql -u thitanat.n -p -h localhost

# 3. Check Docker container can reach host
docker exec -it asem-server ping host.docker.internal

# 4. Verify MySQL allows connections from Docker
# MySQL should bind to 0.0.0.0 or have proper user grants
```

**Connection refused errors:**
- Ensure your MySQL server is running on the host machine
- Check that MySQL is not only listening on 127.0.0.1
- Verify your user has proper permissions: `GRANT ALL ON *.* TO 'thitanat.n'@'%'`bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

**Clean slate:**
```bash
# Remove everything and start fresh
npm run docker:clean
docker system prune -a  # Remove all unused Docker resources
npm run docker:dev:build
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

## 🎓 Next Steps

1. Start development: `npm run docker:dev`
2. Access API: http://localhost:5001
3. View emails: http://localhost:1080
4. Make changes to your code
5. Watch nodemon restart automatically!

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md) (if available).
