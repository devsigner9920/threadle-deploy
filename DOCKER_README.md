# Threadle Docker Deployment Guide

This guide explains how to deploy Threadle using Docker and Docker Compose as an alternative to npm installation.

## Quick Start

### Using Docker Run

The simplest way to run Threadle with Docker:

```bash
docker run -d \
  --name threadle \
  -p 3000:3000 \
  -v threadle-data:/app/data \
  --restart unless-stopped \
  threadle/threadle:latest
```

Access Threadle at http://localhost:3000

### Using Docker Compose (Recommended)

1. **Download docker-compose.yml**

```bash
curl -O https://raw.githubusercontent.com/threadle/threadle/main/docker-compose.yml
```

2. **Start Threadle**

```bash
docker-compose up -d
```

3. **Access the setup wizard**

Open http://localhost:3000 in your browser and follow the setup wizard.

## Environment Variables

Configure Threadle using environment variables:

### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | SQLite database path | `file:/app/data/threadle.db` |

### Slack Configuration (Optional)

These can be configured via the web UI setup wizard instead:

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Slack bot token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Slack app signing secret |
| `SLACK_APP_TOKEN` | Slack app-level token (xapp-...) |

### LLM Provider API Keys (Optional)

These can be configured via the web UI setup wizard instead:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_AI_API_KEY` | Google AI API key |

### Authentication (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | Auto-generated |

## Volume Management

Threadle uses a Docker volume to persist data across container restarts.

### Using Named Volume (Recommended)

```bash
docker run -d \
  -p 3000:3000 \
  -v threadle-data:/app/data \
  threadle/threadle:latest
```

**Benefits:**
- Docker manages the volume location
- Easy to backup with `docker cp`
- Portable across systems

### Using Bind Mount

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/threadle-data:/app/data \
  threadle/threadle:latest
```

**Benefits:**
- Direct access to data directory
- Easy to inspect database file
- Simple manual backups

### Data Backup

**Backup SQLite database:**

```bash
# For named volume
docker run --rm \
  -v threadle-data:/app/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/threadle-backup.tar.gz -C /app/data .

# For bind mount
tar czf threadle-backup.tar.gz -C ./threadle-data .
```

**Restore from backup:**

```bash
# For named volume
docker run --rm \
  -v threadle-data:/app/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/threadle-backup.tar.gz -C /app/data

# For bind mount
tar xzf threadle-backup.tar.gz -C ./threadle-data
```

## Docker Compose Configuration

### Basic docker-compose.yml

```yaml
version: '3.8'

services:
  threadle:
    image: threadle/threadle:latest
    container_name: threadle
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./threadle-data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
```

### With Environment Variables

Create a `.env` file:

```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-secret
SLACK_APP_TOKEN=xapp-your-token

# LLM Provider
OPENAI_API_KEY=sk-your-key
```

Then reference in docker-compose.yml:

```yaml
services:
  threadle:
    image: threadle/threadle:latest
    env_file:
      - .env
    # ... rest of configuration
```

## Common Operations

### View Logs

```bash
# Docker run
docker logs threadle

# Docker Compose
docker-compose logs -f threadle
```

### Restart Container

```bash
# Docker run
docker restart threadle

# Docker Compose
docker-compose restart
```

### Stop Container

```bash
# Docker run
docker stop threadle

# Docker Compose
docker-compose down
```

### Update to Latest Version

```bash
# Pull latest image
docker pull threadle/threadle:latest

# Restart with new image
docker-compose down
docker-compose up -d
```

### Access Container Shell

```bash
# Docker run
docker exec -it threadle sh

# Docker Compose
docker-compose exec threadle sh
```

### Check Container Health

```bash
# Docker run
docker inspect --format='{{.State.Health.Status}}' threadle

# Docker Compose
docker-compose ps
```

## Database Migrations

Database migrations run automatically when the container starts. The entrypoint script executes:

```bash
npx prisma migrate deploy
```

This ensures your database schema is always up-to-date with the application version.

### Manual Migration

If you need to run migrations manually:

```bash
docker exec threadle npx prisma migrate deploy
```

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker logs threadle
```

**Common issues:**
- Port 3000 already in use: Change port mapping `-p 3001:3000`
- Permission issues: Ensure volume directory is writable
- Database corruption: Remove volume and restart

### Database Issues

**Reset database:**
```bash
# Stop container
docker-compose down

# Remove data volume
docker volume rm threadle_threadle-data
# OR delete bind mount directory
rm -rf ./threadle-data

# Restart
docker-compose up -d
```

### Performance Issues

**Check resource usage:**
```bash
docker stats threadle
```

**Increase resource limits in docker-compose.yml:**
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 1G
```

### Network Issues

**Check if container is running:**
```bash
docker ps | grep threadle
```

**Test health endpoint:**
```bash
curl http://localhost:3000/health
```

**Verify port mapping:**
```bash
docker port threadle
```

## Building the Image Locally

If you want to build the Docker image yourself:

```bash
# Clone repository
git clone https://github.com/threadle/threadle.git
cd threadle

# Build image
docker build -t threadle/threadle:latest .

# Run your custom build
docker run -d -p 3000:3000 -v threadle-data:/app/data threadle/threadle:latest
```

## Production Deployment

### Security Recommendations

1. **Use HTTPS**: Put Threadle behind a reverse proxy (nginx, Caddy) with SSL
2. **Set JWT Secret**: Use a strong random secret for JWT signing
3. **Restrict Ports**: Only expose port 3000 to reverse proxy, not publicly
4. **Regular Backups**: Automate daily backups of the data volume
5. **Update Regularly**: Keep the image updated with security patches

### Example nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name threadle.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Resource Requirements

**Minimum:**
- CPU: 0.25 cores
- RAM: 256 MB
- Disk: 1 GB

**Recommended:**
- CPU: 1 core
- RAM: 512 MB
- Disk: 5 GB

## Support

For issues and questions:
- GitHub Issues: https://github.com/threadle/threadle/issues
- Documentation: https://github.com/threadle/threadle#readme
