#!/bin/bash

# ClipsCommerce Docker Management Script
# Provides easy commands for managing Docker environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="clipscommerce"
DOCKER_COMPOSE_DEV="docker-compose.yml -f docker-compose.dev.yml"
DOCKER_COMPOSE_PROD="docker-compose.prod.yml"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Function to show usage
show_usage() {
    cat << EOF
🚀 ClipsCommerce Docker Manager

Usage: $0 [COMMAND] [OPTIONS]

COMMANDS:
  dev:start         Start development environment
  dev:stop          Stop development environment
  dev:restart       Restart development environment
  dev:logs          Show development logs
  dev:shell         Access development container shell
  
  prod:start        Start production environment
  prod:stop         Stop production environment
  prod:restart      Restart production environment
  prod:logs         Show production logs
  prod:deploy       Deploy to production
  
  build             Build production image
  build:dev         Build development image
  
  db:migrate        Run database migrations
  db:seed           Seed database with sample data
  db:backup         Backup database
  db:restore        Restore database from backup
  
  cache:clear       Clear Redis cache
  cache:stats       Show Redis statistics
  
  health            Check application health
  status            Show all container status
  cleanup           Remove unused Docker resources
  
  test              Run tests in container
  test:e2e          Run E2E tests
  
  help              Show this help message

OPTIONS:
  --no-cache        Build without using cache
  --verbose         Verbose output
  --profile PROFILE Use specific Docker Compose profile

EXAMPLES:
  $0 dev:start              # Start development environment
  $0 prod:deploy            # Deploy to production
  $0 build --no-cache       # Build without cache
  $0 status                 # Show container status
  $0 health                 # Check application health

EOF
}

# Development environment functions
dev_start() {
    log_info "Starting development environment..."
    
    if [ ! -f .env.local ]; then
        log_warning ".env.local not found. Copying from .env.example..."
        cp .env.example .env.local
        log_warning "Please edit .env.local with your development configuration."
    fi
    
    docker-compose -f $DOCKER_COMPOSE_DEV up -d
    log_success "Development environment started!"
    log_info "Application: http://localhost:3000"
    log_info "pgAdmin: http://localhost:8080"
    log_info "Redis Commander: http://localhost:8081"
}

dev_stop() {
    log_info "Stopping development environment..."
    docker-compose -f $DOCKER_COMPOSE_DEV down
    log_success "Development environment stopped!"
}

dev_restart() {
    log_info "Restarting development environment..."
    docker-compose -f $DOCKER_COMPOSE_DEV restart
    log_success "Development environment restarted!"
}

dev_logs() {
    local service=${1:-"app-dev"}
    log_info "Showing logs for $service..."
    docker-compose -f $DOCKER_COMPOSE_DEV logs -f "$service"
}

dev_shell() {
    log_info "Accessing development container shell..."
    docker-compose -f $DOCKER_COMPOSE_DEV exec app-dev /bin/bash
}

# Production environment functions
prod_start() {
    log_info "Starting production environment..."
    
    if [ ! -f .env.production ]; then
        log_error ".env.production not found. Please create it from .env.example"
        exit 1
    fi
    
    docker-compose -f $DOCKER_COMPOSE_PROD up -d
    log_success "Production environment started!"
}

prod_stop() {
    log_info "Stopping production environment..."
    docker-compose -f $DOCKER_COMPOSE_PROD down
    log_success "Production environment stopped!"
}

prod_restart() {
    log_info "Restarting production environment..."
    docker-compose -f $DOCKER_COMPOSE_PROD restart
    log_success "Production environment restarted!"
}

prod_logs() {
    local service=${1:-"app"}
    log_info "Showing production logs for $service..."
    docker-compose -f $DOCKER_COMPOSE_PROD logs -f "$service"
}

prod_deploy() {
    log_info "Deploying to production..."
    
    # Pull latest images
    docker-compose -f $DOCKER_COMPOSE_PROD pull
    
    # Build new image
    build_prod
    
    # Rolling update
    docker-compose -f $DOCKER_COMPOSE_PROD up -d --no-deps app
    
    # Wait for health check
    sleep 10
    check_health
    
    log_success "Production deployment completed!"
}

# Build functions
build_dev() {
    log_info "Building development image..."
    local cache_option=""
    
    if [ "$NO_CACHE" == "true" ]; then
        cache_option="--no-cache"
    fi
    
    docker-compose -f $DOCKER_COMPOSE_DEV build $cache_option
    log_success "Development image built!"
}

build_prod() {
    log_info "Building production image..."
    local cache_option=""
    
    if [ "$NO_CACHE" == "true" ]; then
        cache_option="--no-cache"
    fi
    
    docker build $cache_option -t ${APP_NAME}:latest .
    log_success "Production image built!"
}

# Database functions
db_migrate() {
    log_info "Running database migrations..."
    docker-compose exec postgres psql -U postgres -d $APP_NAME -c "SELECT version();"
    log_success "Database migrations completed!"
}

db_backup() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    log_info "Creating database backup: $backup_file"
    
    docker-compose exec postgres pg_dump -U postgres $APP_NAME > "$backup_file"
    log_success "Database backup created: $backup_file"
}

db_restore() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        log_error "Please specify backup file: $0 db:restore backup.sql"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_warning "This will restore the database from $backup_file"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restoring database from $backup_file..."
        docker-compose exec -T postgres psql -U postgres $APP_NAME < "$backup_file"
        log_success "Database restored!"
    else
        log_info "Database restore cancelled."
    fi
}

# Cache functions
cache_clear() {
    log_info "Clearing Redis cache..."
    docker-compose exec redis redis-cli FLUSHALL
    log_success "Redis cache cleared!"
}

cache_stats() {
    log_info "Redis statistics:"
    docker-compose exec redis redis-cli INFO stats
}

# Health and status functions
check_health() {
    log_info "Checking application health..."
    
    local health_url="http://localhost:3000/api/health"
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "$health_url" >/dev/null 2>&1; then
            local health_response=$(curl -s "$health_url" | jq -r '.status' 2>/dev/null || echo "unknown")
            
            if [ "$health_response" == "healthy" ]; then
                log_success "Application is healthy!"
                return 0
            else
                log_warning "Application status: $health_response"
            fi
        fi
        
        log_info "Attempt $attempt/$max_attempts: Waiting for application to be healthy..."
        sleep 5
        ((attempt++))
    done
    
    log_error "Application health check failed!"
    return 1
}

show_status() {
    log_info "Container status:"
    docker-compose ps
    
    echo
    log_info "Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Utility functions
cleanup() {
    log_info "Cleaning up unused Docker resources..."
    
    docker system prune -f
    docker volume prune -f
    docker network prune -f
    
    log_success "Docker cleanup completed!"
}

run_tests() {
    log_info "Running tests..."
    docker-compose -f $DOCKER_COMPOSE_DEV exec app-dev npm test
}

run_e2e_tests() {
    log_info "Running E2E tests..."
    docker-compose -f $DOCKER_COMPOSE_DEV exec app-dev npm run test:e2e
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-cache)
                NO_CACHE="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                set -x
                shift
                ;;
            --profile)
                PROFILE="$2"
                shift 2
                ;;
            *)
                break
                ;;
        esac
    done
}

# Main function
main() {
    local command=$1
    shift || true
    
    case $command in
        dev:start)
            dev_start "$@"
            ;;
        dev:stop)
            dev_stop "$@"
            ;;
        dev:restart)
            dev_restart "$@"
            ;;
        dev:logs)
            dev_logs "$@"
            ;;
        dev:shell)
            dev_shell "$@"
            ;;
        prod:start)
            prod_start "$@"
            ;;
        prod:stop)
            prod_stop "$@"
            ;;
        prod:restart)
            prod_restart "$@"
            ;;
        prod:logs)
            prod_logs "$@"
            ;;
        prod:deploy)
            prod_deploy "$@"
            ;;
        build)
            build_prod "$@"
            ;;
        build:dev)
            build_dev "$@"
            ;;
        db:migrate)
            db_migrate "$@"
            ;;
        db:backup)
            db_backup "$@"
            ;;
        db:restore)
            db_restore "$@"
            ;;
        cache:clear)
            cache_clear "$@"
            ;;
        cache:stats)
            cache_stats "$@"
            ;;
        health)
            check_health "$@"
            ;;
        status)
            show_status "$@"
            ;;
        cleanup)
            cleanup "$@"
            ;;
        test)
            run_tests "$@"
            ;;
        test:e2e)
            run_e2e_tests "$@"
            ;;
        help|--help|-h)
            show_usage
            ;;
        "")
            log_error "No command specified."
            show_usage
            exit 1
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_dependencies
    parse_args "$@"
    main "$@"
fi