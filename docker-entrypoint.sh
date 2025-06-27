#!/bin/bash
set -e

# ClipsCommerce Docker Entrypoint Script
# This script handles initialization and startup of the Next.js application

echo "🚀 Starting ClipsCommerce application..."

# Function to check if a service is ready
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service_name to be ready..."
    
    while ! nc -z "$host" "$port" 2>/dev/null; do
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ $service_name is not ready after $max_attempts attempts"
            exit 1
        fi
        
        echo "⏳ Attempt $attempt/$max_attempts: $service_name not ready, waiting 2 seconds..."
        sleep 2
        ((attempt++))
    done
    
    echo "✅ $service_name is ready!"
}

# Function to check environment variables
check_env_vars() {
    local required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "NEXTAUTH_SECRET"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
    
    echo "🔍 Checking required environment variables..."
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ Required environment variable $var is not set"
            exit 1
        fi
        echo "✅ $var is set"
    done
}

# Function to run database migrations (if needed)
run_migrations() {
    echo "🗄️ Checking for database migrations..."
    
    # Only run if we have migration scripts
    if [ -d "/app/supabase/migrations" ] && [ "$(ls -A /app/supabase/migrations)" ]; then
        echo "📦 Running database migrations..."
        # Add your migration command here
        # Example: npm run migrate
        echo "ℹ️ No migration script configured"
    else
        echo "ℹ️ No migrations found"
    fi
}

# Function to verify application health
verify_health() {
    echo "🏥 Waiting for application to be healthy..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            echo "✅ Application is healthy!"
            return 0
        fi
        
        echo "⏳ Attempt $attempt/$max_attempts: Application not ready, waiting 3 seconds..."
        sleep 3
        ((attempt++))
    done
    
    echo "❌ Application failed to become healthy"
    exit 1
}

# Main execution flow
main() {
    echo "🔧 ClipsCommerce Docker Entrypoint"
    echo "===================================="
    
    # Check environment variables
    check_env_vars
    
    # Wait for external services if in production
    if [ "$NODE_ENV" = "production" ]; then
        # Extract database host and port from DATABASE_URL
        if [[ "$DATABASE_URL" =~ postgresql://[^@]+@([^:]+):([0-9]+)/ ]]; then
            DB_HOST="${BASH_REMATCH[1]}"
            DB_PORT="${BASH_REMATCH[2]}"
            wait_for_service "$DB_HOST" "$DB_PORT" "PostgreSQL"
        fi
        
        # Extract Redis host and port from REDIS_URL
        if [[ "$REDIS_URL" =~ redis://([^:]+):([0-9]+) ]]; then
            REDIS_HOST="${BASH_REMATCH[1]}"
            REDIS_PORT="${BASH_REMATCH[2]}"
            wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis"
        elif [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
            wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis"
        fi
    fi
    
    # Run database migrations
    run_migrations
    
    # Create log directory if it doesn't exist
    mkdir -p /app/logs
    chown -R nextjs:nodejs /app/logs 2>/dev/null || true
    
    echo "🚀 Starting Next.js application..."
    
    # Start the application in the background if we need to verify health
    if [ "$VERIFY_HEALTH" = "true" ]; then
        # Start application in background
        exec "$@" &
        APP_PID=$!
        
        # Wait for health check
        sleep 10
        verify_health
        
        # If we get here, the app is healthy, so wait for it
        wait $APP_PID
    else
        # Start application directly
        exec "$@"
    fi
}

# Run main function
main "$@"