# ClipsCommerce Docker Setup

This document provides comprehensive instructions for running ClipsCommerce using Docker in both development and production environments.

## 📋 Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- At least 4GB of available RAM
- At least 10GB of available disk space

## 🏗️ Architecture

The Docker setup includes:

- **Next.js Application**: Multi-stage optimized container
- **PostgreSQL**: Primary database with automatic migrations
- **Redis**: Caching and session storage
- **Nginx**: Reverse proxy and load balancer (production)
- **Health Checks**: Comprehensive monitoring endpoints

## 🚀 Quick Start

### Development Environment

1. **Copy environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your development values
   ```

2. **Start development environment:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f app-dev
   ```

4. **Access the application:**
   - Application: http://localhost:3000
   - Redis Commander: http://localhost:8081 (admin/admin)
   - pgAdmin: http://localhost:8080 (admin@clipscommerce.com/admin)

### Production Environment

1. **Copy and configure production environment:**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your production values
   ```

2. **Build and start production environment:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Monitor deployment:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

## 🔧 Configuration

### Environment Variables

Key environment variables that must be configured:

#### Required
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `NEXTAUTH_SECRET`: Authentication secret
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

#### API Keys
- `OPENAI_API_KEY`: OpenAI API access
- `STRIPE_SECRET_KEY`: Stripe payment processing
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: OAuth authentication

#### Optional
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `RATE_LIMIT_MAX_REQUESTS`: API rate limiting

### Docker Compose Profiles

Use profiles to run specific services:

```bash
# Run with development tools
docker-compose --profile tools up -d

# Run with monitoring
docker-compose --profile monitoring up -d

# Run testing environment
docker-compose --profile testing up -d

# Run backup services
docker-compose --profile backup up -d
```

## 🏗️ Build Process

### Multi-Stage Dockerfile

The production Dockerfile uses a multi-stage build:

1. **Builder Stage**: Installs dependencies and builds the application
2. **Runner Stage**: Creates optimized production image

### Build Arguments

```bash
# Build with specific Node.js version
docker build --build-arg NODE_VERSION=18-alpine .

# Build with custom npm registry
docker build --build-arg NPM_REGISTRY=https://registry.npmjs.org .
```

## 🔍 Health Checks

### Application Health

The application includes a comprehensive health check endpoint at `/api/health`:

```bash
# Check application health
curl http://localhost:3000/api/health

# Response format:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": { "status": "healthy", "response_time": 45 },
    "redis": { "status": "healthy", "response_time": 12 },
    "api": { "status": "healthy", "response_time": 8, "uptime": 3600 }
  }
}
```

### Docker Health Checks

All services include Docker health checks:

```bash
# View health status
docker-compose ps

# Check specific service health
docker inspect --format='{{.State.Health.Status}}' clipscommerce-app
```

## 📊 Monitoring

### Container Logs

```bash
# Follow application logs
docker-compose logs -f app

# View specific service logs
docker-compose logs postgres
docker-compose logs redis

# View logs from last hour
docker-compose logs --since 1h app
```

### Resource Monitoring

```bash
# View resource usage
docker stats

# View specific container stats
docker stats clipscommerce-app
```

### Performance Monitoring

With monitoring profile enabled:

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

## 🛠️ Development Workflow

### Hot Reload Development

```bash
# Start development with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# The source code is mounted as a volume for instant changes
```

### Running Tests

```bash
# Run unit tests
docker-compose exec app-dev npm test

# Run E2E tests
docker-compose exec app-dev npm run test:e2e

# Run tests with coverage
docker-compose exec app-dev npm run test:coverage
```

### Database Operations

```bash
# Run database migrations
docker-compose exec postgres psql -U postgres -d clipscommerce -f /migrations/migration.sql

# Create database backup
docker-compose exec postgres pg_dump -U postgres clipscommerce > backup.sql

# Access database shell
docker-compose exec postgres psql -U postgres -d clipscommerce
```

### Redis Operations

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# View Redis info
docker-compose exec redis redis-cli info

# Monitor Redis commands
docker-compose exec redis redis-cli monitor
```

## 🔒 Security

### Security Features

- **Non-root user**: Application runs as unprivileged user
- **Read-only filesystem**: Container filesystem is read-only where possible
- **Security headers**: Comprehensive HTTP security headers
- **Rate limiting**: API and authentication rate limiting
- **Input validation**: Environment variable validation

### Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **Image Scanning**: Regularly scan images for vulnerabilities
3. **Updates**: Keep base images and dependencies updated
4. **Network Security**: Use Docker networks for service isolation

## 📦 Production Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations applied
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Log aggregation configured

### Scaling

```bash
# Scale application containers
docker-compose up -d --scale app=3

# Update resource limits
# Edit docker-compose.prod.yml deploy.resources section
```

### Zero-Downtime Deployment

```bash
# Rolling update
docker-compose pull
docker-compose up -d --no-deps app
```

## 🔧 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs app

# Check environment variables
docker-compose exec app env | grep -E "(DATABASE|REDIS|NEXT)"
```

**Database connection issues:**
```bash
# Test database connectivity
docker-compose exec app nc -z postgres 5432

# Check database logs
docker-compose logs postgres
```

**Redis connection issues:**
```bash
# Test Redis connectivity
docker-compose exec app nc -z redis 6379

# Check Redis logs
docker-compose logs redis
```

**Health check failures:**
```bash
# Manual health check
docker-compose exec app curl -f http://localhost:3000/api/health

# Check specific service health
docker-compose exec app curl -f http://localhost:3000/api/health | jq '.services'
```

### Performance Issues

**Slow startup:**
- Check resource limits in docker-compose.yml
- Review application logs for bottlenecks
- Ensure adequate system resources

**High memory usage:**
- Monitor with `docker stats`
- Adjust Node.js memory limits
- Review memory leaks in application

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/best-practices/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [PostgreSQL Docker Guide](https://hub.docker.com/_/postgres)
- [Redis Docker Guide](https://hub.docker.com/_/redis)

## 🤝 Contributing

When contributing to the Docker setup:

1. Test changes in development environment
2. Update documentation
3. Ensure health checks pass
4. Test production build
5. Update version tags appropriately