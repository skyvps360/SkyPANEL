#!/bin/bash

# SkyPANEL Docker Setup Script
# This script helps you set up SkyPANEL with Docker quickly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command_exists docker; then
        error "Docker is not installed. Please install Docker first."
        error "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        error "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check Docker version
    DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    REQUIRED_VERSION="20.10"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$DOCKER_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        warn "Docker version $DOCKER_VERSION detected. Recommended version is $REQUIRED_VERSION or higher."
    fi
    
    success "Prerequisites check passed"
}

# Setup environment file
setup_environment() {
    log "Setting up environment configuration..."
    
    if [ -f .env ]; then
        warn ".env file already exists. Creating backup..."
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Copy template
    cp .env.example .env
    
    # Generate secure passwords
    SESSION_SECRET=$(generate_password)
    POSTGRES_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    
    # Update .env file with generated values
    sed -i.bak "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
    sed -i.bak "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
    sed -i.bak "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
    
    # Update database URL with new password
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=postgresql://skypanel:$POSTGRES_PASSWORD@postgres:5432/skypanel|" .env
    sed -i.bak "s|REDIS_URL=.*|REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379|" .env
    
    # Remove backup file
    rm .env.bak
    
    success "Environment file created with secure passwords"
}

# Prompt for configuration
configure_services() {
    log "Configuring external services..."
    
    echo ""
    echo "Please provide the following information (press Enter to skip optional items):"
    echo ""
    
    # VirtFusion API
    read -p "VirtFusion API URL (required): " VIRTFUSION_API_URL
    read -p "VirtFusion API Key (required): " VIRTFUSION_API_KEY
    
    if [ -n "$VIRTFUSION_API_URL" ]; then
        sed -i.bak "s|VIRTFUSION_API_URL=.*|VIRTFUSION_API_URL=$VIRTFUSION_API_URL|" .env
    fi
    
    if [ -n "$VIRTFUSION_API_KEY" ]; then
        sed -i.bak "s|VIRTFUSION_API_KEY=.*|VIRTFUSION_API_KEY=$VIRTFUSION_API_KEY|" .env
    fi
    
    # Email configuration
    read -p "SMTP2GO API Key (optional): " SMTP2GO_API_KEY
    read -p "Email From Address (optional): " SMTP_FROM
    
    if [ -n "$SMTP2GO_API_KEY" ]; then
        sed -i.bak "s|SMTP2GO_API_KEY=.*|SMTP2GO_API_KEY=$SMTP2GO_API_KEY|" .env
    fi
    
    if [ -n "$SMTP_FROM" ]; then
        sed -i.bak "s|SMTP_FROM=.*|SMTP_FROM=$SMTP_FROM|" .env
    fi
    
    # Discord integration
    read -p "Discord Bot Token (optional): " DISCORD_BOT_TOKEN
    
    if [ -n "$DISCORD_BOT_TOKEN" ]; then
        sed -i.bak "s|DISCORD_BOT_TOKEN=.*|DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN|" .env
    fi
    
    # Clean up backup files
    rm -f .env.bak
    
    success "Service configuration completed"
}

# Choose deployment mode
choose_mode() {
    echo ""
    echo "Choose deployment mode:"
    echo "1) Development (with hot reload)"
    echo "2) Production"
    echo ""
    read -p "Enter your choice (1 or 2): " MODE_CHOICE
    
    case $MODE_CHOICE in
        1)
            DEPLOYMENT_MODE="development"
            COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
            ;;
        2)
            DEPLOYMENT_MODE="production"
            COMPOSE_FILES="-f docker-compose.yml"
            ;;
        *)
            warn "Invalid choice. Defaulting to development mode."
            DEPLOYMENT_MODE="development"
            COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
            ;;
    esac
    
    log "Selected deployment mode: $DEPLOYMENT_MODE"
}

# Start services
start_services() {
    log "Starting SkyPANEL services..."
    
    # Pull latest images
    log "Pulling Docker images..."
    docker-compose $COMPOSE_FILES pull
    
    # Build application
    log "Building application..."
    docker-compose $COMPOSE_FILES build
    
    # Start services
    log "Starting services..."
    docker-compose $COMPOSE_FILES up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    log "Checking service health..."
    docker-compose $COMPOSE_FILES ps
    
    success "SkyPANEL services started successfully!"
}

# Display final information
show_completion_info() {
    echo ""
    success "🎉 SkyPANEL Docker setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo ""
    echo "1. Access your application:"
    echo "   🌐 http://localhost:5000"
    echo ""
    echo "2. Create an admin user:"
    echo "   📝 docker-compose exec app npx tsx scripts/create-admin-user.ts"
    echo ""
    echo "3. View logs:"
    echo "   📊 docker-compose logs -f app"
    echo ""
    echo "4. Useful commands:"
    echo "   🔄 Restart: docker-compose restart"
    echo "   🛑 Stop: docker-compose down"
    echo "   🗑️  Clean: docker-compose down -v"
    echo ""
    echo "📖 For more information, see README-Docker.md"
    echo ""
    
    if [ "$DEPLOYMENT_MODE" = "development" ]; then
        echo "🔧 Development mode features:"
        echo "   • Hot reload enabled"
        echo "   • Database accessible on localhost:5432"
        echo "   • Redis accessible on localhost:6379"
        echo ""
    fi
    
    if [ -z "$VIRTFUSION_API_URL" ] || [ -z "$VIRTFUSION_API_KEY" ]; then
        warn "⚠️  VirtFusion API not configured. Some features may not work."
        echo "   Edit .env file to add your VirtFusion credentials."
        echo ""
    fi
}

# Main execution
main() {
    echo ""
    echo "🐳 SkyPANEL Docker Setup"
    echo "========================"
    echo ""
    
    check_prerequisites
    setup_environment
    configure_services
    choose_mode
    start_services
    show_completion_info
}

# Handle script interruption
trap 'echo ""; error "Setup interrupted by user"; exit 1' INT

# Run main function
main "$@"
