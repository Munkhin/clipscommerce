# ClipsCommerce Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Building the Production Image](#building-the-production-image)
4. [Production Deployment](#production-deployment)
5. [SSL Configuration](#ssl-configuration)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Backup and Recovery](#backup-and-recovery)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## Prerequisites

### System Requirements
- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Docker**: Version 24.0+ with Docker Compose V2
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: Minimum 100GB available disk space
- **Network**: Open ports 80, 443, 3000, 5432, 6379

### Required Services
- **Domain Name**: Properly configured DNS pointing to your server
- **SSL Certificate**: For HTTPS (Let's Encrypt or commercial)
- **External Services**:
  - Supabase project (or self-hosted)
  - Email service provider
  - Cloud storage (AWS S3 or compatible)

### Software Dependencies
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose V2
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

## Environment Setup

### 1. Create Production Environment File

Create `.env.production` in the project root:

```bash
# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_OAUTH_REDIRECT_BASE_URL=https://your-domain.com

# Database Configuration
DATABASE_URL=postgresql://postgres:YOUR_SECURE_PASSWORD@postgres:5432/clipscommerce
POSTGRES_DB=clipscommerce
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_SECURE_DB_PASSWORD

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

# Authentication
NEXTAUTH_SECRET=YOUR_VERY_SECURE_SECRET_KEY_MIN_32_CHARS
NEXTAUTH_URL=https://your-domain.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# External Services
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Monitoring (Optional)
GRAFANA_PASSWORD=your_grafana_password

# Security
RATE_LIMIT_REDIS_URL=redis://redis:6379
```

### 2. Secure Environment File
```bash
# Set proper permissions
chmod 600 .env.production

# Ensure the file is not tracked by git
echo ".env.production" >> .gitignore
```

### 3. Generate Secure Secrets
```bash
# Generate NEXTAUTH_SECRET (32+ characters)
openssl rand -base64 32

# Generate strong database password
openssl rand -base64 24
```

## Building the Production Image

### 1. Pre-build Checklist
```bash
# Ensure Next.js is configured for standalone output
grep -n "output: 'standalone'" next.config.js

# Verify Docker files exist
ls -la Dockerfile docker-compose.prod.yml nginx.prod.conf docker-entrypoint.sh

# Check build dependencies
npm audit --audit-level moderate
```

### 2. Build the Docker Image
```bash
# Build the production image
docker compose -f docker-compose.prod.yml build --no-cache

# Tag the image for easier management
docker tag clipscommerce-app-prod:latest clipscommerce:$(date +%Y%m%d-%H%M%S)

# Verify the build
docker images | grep clipscommerce
```

### 3. Test the Build Locally
```bash
# Run a quick test container
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://test:test@localhost:5432/test \
  -e REDIS_URL=redis://localhost:6379 \
  clipscommerce-app-prod:latest

# Test health endpoint
curl http://localhost:3000/api/health
```

## Production Deployment

### 1. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Create SSL directory and copy certificates
sudo mkdir -p /opt/clipscommerce/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/clipscommerce/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/clipscommerce/ssl/key.pem
sudo chown -R 1001:1001 /opt/clipscommerce/ssl
```

#### Option B: Commercial Certificate
```bash
# Place your certificate files
mkdir -p ./ssl
cp your-certificate.pem ./ssl/cert.pem
cp your-private-key.pem ./ssl/key.pem
chmod 600 ./ssl/*
```

### 2. Update Nginx Configuration for HTTPS

Edit `nginx.prod.conf` to enable HTTPS:

```bash
# Uncomment HTTPS server block in nginx.prod.conf
sed -i 's/^# server {/server {/' nginx.prod.conf
sed -i 's/^#     /    /' nginx.prod.conf

# Update server name
sed -i 's/clipscommerce.com/your-domain.com/g' nginx.prod.conf
```

### 3. Deploy the Application

```bash
# Create deployment directory
sudo mkdir -p /opt/clipscommerce
cd /opt/clipscommerce

# Copy project files
sudo cp -r /path/to/your/project/* .
sudo chown -R $USER:$USER .

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker compose -f docker-compose.prod.yml ps
```

### 4. Verify Deployment

```bash
# Check container health
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Test endpoints
curl -I https://your-domain.com/api/health
curl -I https://your-domain.com

# Check logs
docker compose -f docker-compose.prod.yml logs app
```

### 5. Configure Firewall

```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to application ports
sudo ufw deny 3000/tcp
sudo ufw deny 5432/tcp
sudo ufw deny 6379/tcp

# Enable firewall
sudo ufw enable
```

## SSL Configuration

### Auto-renewal Setup for Let's Encrypt

```bash
# Create scripts directory
mkdir -p /opt/clipscommerce/scripts

# Create renewal script
cat << 'EOF' > /opt/clipscommerce/scripts/renew-ssl.sh
#!/bin/bash
set -e

echo "Renewing SSL certificates..."

# Stop nginx to free up port 80
docker compose -f /opt/clipscommerce/docker-compose.prod.yml stop nginx

# Renew certificates
certbot renew --standalone

# Copy renewed certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/clipscommerce/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/clipscommerce/ssl/key.pem
chown 1001:1001 /opt/clipscommerce/ssl/*

# Restart nginx
docker compose -f /opt/clipscommerce/docker-compose.prod.yml start nginx

echo "SSL certificates renewed successfully"
EOF

chmod +x /opt/clipscommerce/scripts/renew-ssl.sh

# Add to crontab for automatic renewal
echo "0 3 1 * * /opt/clipscommerce/scripts/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1" | sudo crontab -
```

## Monitoring and Logging

### 1. Enable Optional Monitoring Services

```bash
# Start monitoring services
docker compose -f docker-compose.prod.yml --profile monitoring up -d

# Access Grafana dashboard
open https://your-domain.com:3001
# Login: admin / your_grafana_password
```

### 2. Log Management

```bash
# Configure log rotation
cat << 'EOF' > /etc/logrotate.d/clipscommerce
/opt/clipscommerce/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 1001 1001
    copytruncate
}
EOF

# Check application logs
docker compose -f docker-compose.prod.yml logs -f app

# Monitor real-time logs
tail -f /opt/clipscommerce/logs/application.log
```

### 3. Health Monitoring Script

```bash
cat << 'EOF' > /opt/clipscommerce/scripts/health-check.sh
#!/bin/bash

HEALTH_URL="https://your-domain.com/api/health"
LOG_FILE="/var/log/clipscommerce-health.log"

if ! curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "$(date): Health check failed for $HEALTH_URL" >> "$LOG_FILE"
    # Send alert (configure your notification method)
    # Example: send email, Slack notification, etc.
else
    echo "$(date): Health check passed" >> "$LOG_FILE"
fi
EOF

chmod +x /opt/clipscommerce/scripts/health-check.sh

# Run health check every 5 minutes
echo "*/5 * * * * /opt/clipscommerce/scripts/health-check.sh" | crontab -
```

## Backup and Recovery

### 1. Database Backup

```bash
# Manual backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres clipscommerce > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup (already configured in docker-compose.prod.yml)
docker compose -f docker-compose.prod.yml --profile backup up -d

# Restore from backup
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres clipscommerce < backup_file.sql
```

### 2. Application Data Backup

```bash
# Create backup script
cat << 'EOF' > /opt/clipscommerce/scripts/backup.sh
#!/bin/bash
set -e

BACKUP_DIR="/opt/backups/clipscommerce"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup database
echo "Backing up database..."
docker compose -f /opt/clipscommerce/docker-compose.prod.yml exec -T postgres pg_dump -U postgres clipscommerce > "$BACKUP_DIR/db_$DATE.sql"

# Backup Redis data
echo "Backing up Redis..."
docker compose -f /opt/clipscommerce/docker-compose.prod.yml exec redis redis-cli BGSAVE
docker cp $(docker compose -f /opt/clipscommerce/docker-compose.prod.yml ps -q redis):/data/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Backup application volumes
echo "Backing up application data..."
tar -czf "$BACKUP_DIR/volumes_$DATE.tar.gz" -C /opt/clipscommerce \
    --exclude='logs' \
    --exclude='node_modules' \
    --exclude='.git' \
    .

# Clean old backups (keep 7 days)
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x /opt/clipscommerce/scripts/backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/clipscommerce/scripts/backup.sh >> /var/log/backup.log 2>&1" | crontab -
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Won't Start

```bash
# Check container logs
docker compose -f docker-compose.prod.yml logs app

# Common fixes:
# - Verify environment variables
docker compose -f docker-compose.prod.yml exec app env | grep -E "(DATABASE_URL|REDIS_URL|NEXTAUTH_)"

# - Check service dependencies
docker compose -f docker-compose.prod.yml ps

# - Restart services
docker compose -f docker-compose.prod.yml restart
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
docker compose -f docker-compose.prod.yml exec app nc -z postgres 5432

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Reset database (CAUTION: This will delete all data)
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in ./ssl/cert.pem -text -noout | grep -E "(Not Before|Not After)"

# Test SSL configuration
curl -vI https://your-domain.com

# Regenerate certificates
/opt/clipscommerce/scripts/renew-ssl.sh
```

#### 4. Performance Issues

```bash
# Check resource usage
docker stats

# Monitor system resources
htop
df -h
free -h

# Check application metrics
curl https://your-domain.com/api/health
```

#### 5. Network Connectivity Issues

```bash
# Check port availability
netstat -tulpn | grep -E "(80|443|3000)"

# Test internal network
docker compose -f docker-compose.prod.yml exec app ping postgres
docker compose -f docker-compose.prod.yml exec app ping redis

# Check firewall rules
sudo ufw status verbose
```

### Log Analysis

```bash
# Check application errors
docker compose -f docker-compose.prod.yml logs app | grep -i error

# Monitor access patterns
docker compose -f docker-compose.prod.yml logs nginx | grep -E "(POST|GET|PUT|DELETE)"

# Database query performance
docker compose -f docker-compose.prod.yml logs postgres | grep -E "(slow|duration)"
```

### Emergency Recovery

```bash
# If application is completely down:

# 1. Stop all services
docker compose -f docker-compose.prod.yml down

# 2. Check available disk space
df -h

# 3. Remove old images if space is low
docker system prune -f

# 4. Restart services
docker compose -f docker-compose.prod.yml up -d

# 5. Monitor startup
watch "docker compose -f docker-compose.prod.yml ps"
```

## Maintenance

### Regular Maintenance Tasks

#### Weekly Tasks
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean up Docker resources
docker system prune -f

# Check log sizes
du -sh /opt/clipscommerce/logs/*
```

#### Monthly Tasks
```bash
# Update application (if new version available)
git pull origin main
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Analyze database performance
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres clipscommerce -c "
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;
"

# Review security logs
sudo journalctl -u docker --since "1 month ago" | grep -i security
```

### Scaling Considerations

#### Horizontal Scaling
```bash
# Scale application containers
docker compose -f docker-compose.prod.yml up -d --scale app=3

# Update nginx upstream configuration for load balancing
# Edit nginx.prod.conf to include multiple app servers
```

#### Database Optimization
```bash
# Monitor database performance
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres clipscommerce -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"
```

### Update Procedures

#### Application Updates
```bash
# 1. Create backup before update
/opt/clipscommerce/scripts/backup.sh

# 2. Pull latest code
git pull origin main

# 3. Rebuild and deploy
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 4. Verify deployment
curl -I https://your-domain.com/api/health
```

#### Security Updates
```bash
# Update base images
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Update system packages
sudo apt update && sudo apt upgrade -y
```

## Support Contacts

- **Application Issues**: Check GitHub repository issues
- **Infrastructure**: Contact your DevOps team
- **Emergency**: Use your organization's incident response procedures

## Checklist for Production Launch

- [ ] Domain name configured and pointing to server
- [ ] SSL certificates installed and tested
- [ ] All environment variables set and secured
- [ ] Database initialized and accessible
- [ ] Redis cache working
- [ ] Application health checks passing
- [ ] Firewall configured properly
- [ ] Monitoring services enabled
- [ ] Backup scripts configured and tested
- [ ] Log rotation configured
- [ ] Emergency procedures documented
- [ ] Team trained on deployment and troubleshooting procedures

---

**Note**: Replace `your-domain.com` and other placeholder values with your actual configuration throughout this document.
