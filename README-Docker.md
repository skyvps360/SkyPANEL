# 🐳 SkyPANEL Docker Setup

This guide will help you run SkyPANEL using Docker and Docker Compose for both development and production environments.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available for containers
- At least 5GB disk space

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/skyvps360/SkyPANEL.git
cd SkyPANEL

# Copy environment template
cp .env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

### 2. Configure Environment

Edit the `.env` file and set at minimum:

```bash
# Database (can use defaults for development)
DATABASE_URL=postgresql://skypanel:skypanel123@postgres:5432/skypanel

# Session secret (generate a secure one!)
SESSION_SECRET=your_secure_random_string_here

# VirtFusion API (required for full functionality)
VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
VIRTFUSION_API_KEY=your_virtfusion_api_key

# Email service (optional but recommended)
SMTP2GO_API_KEY=your_smtp2go_api_key
SMTP_FROM=noreply@your-domain.com
```

### 3. Run the Application

#### For Development (with hot reload):
```bash
# Start all services in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f app
```

#### For Production:
```bash
# Start all services in production mode
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 4. Access the Application

- **Application**: http://localhost:5000
- **Database**: localhost:5432 (development only)
- **Redis**: localhost:6379 (development only)

## 🛠️ Development Workflow

### Starting Development Environment

```bash
# Start with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Follow logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f app
```

### Making Code Changes

In development mode, your local code is mounted into the container, so changes will be reflected immediately thanks to Vite's hot module replacement.

### Database Operations

```bash
# Run database migrations
docker-compose exec app npm run db:push

# Create admin user (interactive)
docker-compose exec app npx tsx scripts/create-admin-user.ts

# Access database directly
docker-compose exec postgres psql -U skypanel -d skypanel
```

### Stopping Development Environment

```bash
# Stop all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Stop and remove volumes (⚠️ this will delete your data!)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

## 🏭 Production Deployment

### Environment Setup

1. **Copy and configure environment**:
```bash
cp .env.example .env
```

2. **Set production values**:
```bash
# Generate a secure session secret
SESSION_SECRET=$(openssl rand -base64 32)

# Set strong database passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Configure your actual service credentials
VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
VIRTFUSION_API_KEY=your_actual_api_key
SMTP2GO_API_KEY=your_actual_smtp_key
```

### Deployment Commands

```bash
# Build and start production services
docker-compose up -d

# Check service health
docker-compose ps

# View application logs
docker-compose logs -f app

# Monitor all services
docker-compose logs -f
```

### Creating Admin User

You can create an admin user automatically by setting environment variables:

```bash
# Add to your .env file
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=secure_admin_password
ADMIN_USERNAME=admin
ADMIN_FULL_NAME=Administrator

# Restart the app container
docker-compose restart app
```

Or create manually:
```bash
docker-compose exec app npx tsx scripts/create-admin-user.ts
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options. Key categories:

- **Database**: PostgreSQL connection settings
- **Redis**: Session storage and caching
- **VirtFusion**: API integration for VPS management
- **Email**: SMTP configuration for notifications
- **Discord**: Bot and webhook integration
- **PayPal**: Payment processing
- **Security**: Session secrets and API keys

### Volume Mounts

The Docker setup uses named volumes for data persistence:

- `postgres_data`: Database files
- `redis_data`: Redis persistence
- `app_logs`: Application logs

### Port Configuration

Default ports (configurable via environment variables):

- **Application**: 5000
- **PostgreSQL**: 5432 (dev only)
- **Redis**: 6379 (dev only)

## 🔍 Monitoring and Logs

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 app
```

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Detailed health status
docker inspect skypanel-app --format='{{.State.Health.Status}}'
```

### Performance Monitoring

```bash
# Resource usage
docker stats

# Container details
docker-compose top
```

## 🛡️ Security Considerations

### Production Security

1. **Change default passwords**:
   - Generate strong `SESSION_SECRET`
   - Use secure database passwords
   - Set strong Redis password

2. **Network security**:
   - Don't expose database ports in production
   - Use reverse proxy (nginx/traefik) for SSL termination
   - Configure firewall rules

3. **Data protection**:
   - Regular database backups
   - Secure volume permissions
   - Monitor access logs

### SSL/TLS Setup

For production, use a reverse proxy:

```yaml
# Example nginx-proxy setup
version: '3.8'
services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - ./certs:/etc/nginx/certs

  app:
    # ... your app config
    environment:
      VIRTUAL_HOST: your-domain.com
      LETSENCRYPT_HOST: your-domain.com
```

## 🔄 Backup and Recovery

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U skypanel skypanel > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U skypanel skypanel < backup.sql
```

### Full System Backup

```bash
# Stop services
docker-compose down

# Backup volumes
docker run --rm -v skypanel_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
docker run --rm -v skypanel_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz -C /data .

# Restart services
docker-compose up -d
```

## 🐛 Troubleshooting

### Common Issues

1. **Database connection failed**:
   ```bash
   # Check database status
   docker-compose logs postgres

   # Verify connection string
   echo $DATABASE_URL
   ```

2. **Application won't start**:
   ```bash
   # Check application logs
   docker-compose logs app

   # Verify environment variables
   docker-compose exec app env | grep -E "(DATABASE_URL|SESSION_SECRET)"
   ```

3. **Permission issues**:
   ```bash
   # Fix log directory permissions
   sudo chown -R 1001:1001 logs/
   ```

4. **Port conflicts**:
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :5000

   # Change port in .env
   APP_PORT=5001
   ```

### Reset Everything

```bash
# Stop and remove everything (⚠️ destroys all data!)
docker-compose down -v --remove-orphans

# Remove images
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [SkyPANEL Main Documentation](./README.md)
- [VirtFusion API Documentation](https://virtfusion.com/docs)

## 🔧 Advanced Configuration

### Custom Network Configuration

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  app:
    networks:
      - custom-network
      - default

networks:
  custom-network:
    external: true
```

### Using External Database

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  app:
    environment:
      DATABASE_URL: postgresql://user:pass@external-db:5432/skypanel

  # Remove postgres service
  postgres:
    deploy:
      replicas: 0
```

### SSL/HTTPS with Traefik

```yaml
# docker-compose.traefik.yml
version: '3.8'
services:
  app:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.skypanel.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.skypanel.tls.certresolver=letsencrypt"
      - "traefik.http.services.skypanel.loadbalancer.server.port=5000"
```

## 📊 Monitoring and Observability

### Prometheus Metrics

Add to your `docker-compose.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Log Aggregation

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/docker.yml
name: Docker Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build Docker image
      run: docker build -t skypanel:${{ github.sha }} .

    - name: Run tests
      run: docker run --rm skypanel:${{ github.sha }} npm test
```

## 🆘 Support

If you encounter issues with the Docker setup:

1. **Check the logs**: `docker-compose logs -f`
2. **Verify your `.env` configuration**: Ensure all required variables are set
3. **Check service health**: `docker-compose ps`
4. **Test database connection**: `docker-compose exec postgres psql -U skypanel -d skypanel -c "SELECT 1;"`
5. **Verify network connectivity**: `docker-compose exec app ping postgres`
6. **Check disk space**: `docker system df`
7. **Review resource usage**: `docker stats`

### Common Error Solutions

**Port already in use**:

```bash
# Find what's using the port
sudo lsof -i :5000
# Change port in .env
echo "APP_PORT=5001" >> .env
```

**Database connection refused**:

```bash
# Check if postgres is running
docker-compose ps postgres
# Restart postgres
docker-compose restart postgres
```

**Out of disk space**:

```bash
# Clean up Docker
docker system prune -a
# Remove unused volumes
docker volume prune
```

For additional support, create an issue on GitHub with:

- Your `docker-compose.yml` configuration
- Relevant logs from `docker-compose logs`
- Your environment setup (OS, Docker version)
- Steps to reproduce the issue
