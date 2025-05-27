#!/bin/sh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

success() {
    echo "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

# Function to wait for database
wait_for_db() {
    log "Waiting for PostgreSQL database to be ready..."
    
    # Extract database connection details from DATABASE_URL
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL environment variable is not set"
        exit 1
    fi
    
    # Simple connection test using node
    until node -e "
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        pool.query('SELECT 1')
            .then(() => { console.log('Database is ready'); process.exit(0); })
            .catch((err) => { console.error('Database not ready:', err.message); process.exit(1); });
    " 2>/dev/null; do
        log "Database is not ready yet. Retrying in 2 seconds..."
        sleep 2
    done
    
    success "Database is ready!"
}

# Function to run database migrations
run_migrations() {
    log "Running database migrations..."
    
    if [ -f "drizzle.config.ts" ]; then
        # Check if we have drizzle-kit available
        if command -v npx >/dev/null 2>&1; then
            log "Running Drizzle migrations..."
            npx drizzle-kit push --config=drizzle.config.ts
            success "Database migrations completed successfully"
        else
            warn "drizzle-kit not available, skipping migrations"
        fi
    else
        warn "drizzle.config.ts not found, skipping migrations"
    fi
}

# Function to create admin user if needed
create_admin_user() {
    log "Checking if admin user creation is needed..."
    
    # Only create admin user if ADMIN_EMAIL and ADMIN_PASSWORD are provided
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
        log "Creating admin user with email: $ADMIN_EMAIL"
        
        # Create admin user using the script
        node -e "
            const { createAdminUser } = require('./scripts/create-admin-user.ts');
            createAdminUser({
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD,
                username: process.env.ADMIN_USERNAME || 'admin',
                fullName: process.env.ADMIN_FULL_NAME || 'Administrator'
            }).then(() => {
                console.log('Admin user created successfully');
            }).catch((err) => {
                console.error('Failed to create admin user:', err.message);
            });
        " 2>/dev/null || warn "Failed to create admin user automatically"
    else
        log "No admin user credentials provided (ADMIN_EMAIL, ADMIN_PASSWORD), skipping admin user creation"
    fi
}

# Function to validate required environment variables
validate_env() {
    log "Validating environment variables..."
    
    # Required variables
    required_vars="DATABASE_URL SESSION_SECRET"
    
    for var in $required_vars; do
        eval value=\$$var
        if [ -z "$value" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Warn about optional but recommended variables
    recommended_vars="VIRTFUSION_API_URL VIRTFUSION_API_KEY SMTP2GO_API_KEY"
    
    for var in $recommended_vars; do
        eval value=\$$var
        if [ -z "$value" ]; then
            warn "Recommended environment variable $var is not set"
        fi
    done
    
    success "Environment validation completed"
}

# Function to setup directories
setup_directories() {
    log "Setting up application directories..."
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Ensure proper permissions
    chmod 755 logs
    
    success "Directories setup completed"
}

# Main execution
main() {
    log "Starting SkyPANEL application initialization..."
    
    # Validate environment
    validate_env
    
    # Setup directories
    setup_directories
    
    # Wait for database
    wait_for_db
    
    # Run migrations
    run_migrations
    
    # Create admin user if needed
    create_admin_user
    
    success "Initialization completed successfully!"
    
    # Start the application
    log "Starting SkyPANEL application..."
    exec npm start
}

# Handle signals gracefully
trap 'log "Received SIGTERM, shutting down gracefully..."; exit 0' TERM
trap 'log "Received SIGINT, shutting down gracefully..."; exit 0' INT

# Run main function
main "$@"
