# Threadle

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520.0.0-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/devsigner9920/threadle/pulls)

> Cross-discipline Slack translator bot powered by LLM - Helping teams communicate across technical boundaries.

Threadle is an open-source Slack bot that translates technical jargon between professional disciplines (engineers, designers, marketers, PMs) using AI-powered explanations. Install it as a global npm package or run it via Docker in minutes.

## Features

- **Cross-Discipline Translation**: Engineers, designers, PMs, and marketers can understand each other's technical discussions
- **Private & Secure**: Runs locally on your machine with your own API keys
- **Multiple LLM Providers**: Support for OpenAI, Anthropic Claude, and Google Gemini
- **Slack Integration**: Native `/explain`, `/setprofile`, and `/help` slash commands
- **Role-Based Context**: Explanations tailored to your professional background
- **Web Dashboard**: User-friendly setup wizard and profile management
- **SQLite Database**: Single-tenant, no cloud dependencies
- **Docker Support**: Easy deployment with Docker or Docker Compose

## Quick Start

### Option 1: npm Installation (Recommended)

```bash
npm install -g threadle
```

Or use npx without installing:

```bash
npx threadle init
npx threadle start
```

**Initialize:**

```bash
threadle init
```

This creates `~/.threadle/` directory with:

- `config.json` - Application configuration
- `secrets.encrypted` - Encrypted API keys and tokens
- `data/` - SQLite database storage
- `logs/` - Application logs

**Start Server:**

```bash
threadle start
```

Opens http://localhost:3000 in your browser. On first run, you'll see the setup wizard.

**Stop Server:**

```bash
threadle stop
```

Gracefully shuts down the server.

### Option 2: Docker Deployment

**Quick start with Docker:**

```bash
docker run -d \
  --name threadle \
  -p 3000:3000 \
  -v threadle-data:/app/data \
  --restart unless-stopped \
  threadle/threadle:latest
```

**Or use Docker Compose (recommended):**

```bash
# Download docker-compose.yml
curl -O https://raw.githubusercontent.com/threadle/threadle/main/docker-compose.yml

# Start Threadle
docker-compose up -d

# Access at http://localhost:3000
```

**Docker commands:**

```bash
# View logs
docker-compose logs -f

# Stop
docker-compose down

# Update to latest version
docker-compose pull && docker-compose up -d
```

For detailed Docker instructions, see [DOCKER_README.md](DOCKER_README.md)

## Setup Wizard

The first time you run `threadle start`, you'll be guided through a 6-step setup wizard:

### Step 1: Welcome & Prerequisites

- Verifies Node.js version (20+)
- Checks network connectivity
- Links to Slack App creation guide

### Step 2: AI Provider Configuration

Select your preferred LLM provider:

- **OpenAI** (GPT-4, GPT-4 Turbo)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus)
- **Google** (Gemini Pro, Gemini Ultra)

Enter your API key (stored encrypted locally).

### Step 3: Slack App Setup

Follow the guided instructions to:

1. Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps)
2. Configure Bot Token Scopes:
   - `chat:write` - Send messages
   - `commands` - Handle slash commands
   - `users:read` - Read user profiles
   - `channels:history` - Read channel messages
3. Enter App ID, Client ID, Client Secret, and Signing Secret

### Step 4: Slack OAuth Installation

Click "Install to Workspace" to authorize Threadle in your Slack workspace.

### Step 5: Global Default Settings

Configure defaults:

- **Translation Style**: ELI5, Business Summary, Technical Lite, or Analogies Only
- **Language**: English, Spanish, French, German, etc.
- **Rate Limiting**: Requests per user per minute (default: 10)
- **Cache TTL**: How long to cache translations (default: 1 hour)

### Step 6: Admin Account Creation

Set yourself as the admin user using your Slack User ID.

## Creating a Slack App

Detailed guide: `/SLACK_APP_SETUP.md` in the package

### Quick Steps:

1. Go to https://api.slack.com/apps and click "Create New App"
2. Choose "From scratch"
3. Name it "Threadle" and select your workspace
4. Navigate to "OAuth & Permissions" and add these Bot Token Scopes:
   - `chat:write`
   - `commands`
   - `users:read`
   - `channels:history`
5. Navigate to "Slash Commands" and create:
   - `/explain` - Translate technical jargon
   - `/setprofile` - Update your user profile
   - `/help` - Show help information
6. Set Request URLs to your server (e.g., `https://your-domain.com/api/v1/slack/commands`)
7. Install the app to your workspace

## Usage

### In Slack

#### `/explain` Command

Get an AI-powered explanation of the current thread:

```
/explain
```

Request a public explanation (visible to all):

```
/explain public
```

#### `/setprofile` Command

Update your role and preferences:

```
/setprofile
```

Opens a modal where you can set:

- Professional role (Engineering, Design, Product, Marketing, etc.)
- Preferred language
- Translation style preference
- Custom instructions for personalized explanations

#### `/help` Command

Display comprehensive help:

```
/help
```

### Web Dashboard

Navigate to http://localhost:3000 after starting the server.

#### Dashboard (/)

- View workspace status
- See usage statistics
- Browse recent translations
- Quick links to profile and settings

#### Profile (/profile)

- Update your role
- Set language preference
- Choose translation style
- Add custom instructions

#### Translation History (/history)

- View all your past translations
- Filter by date range
- Paginated results

#### Admin Settings (/admin) - Admin Only

- Manage global settings
- View all users
- Update LLM provider configuration
- Clear translation cache
- View usage analytics

## Configuration

Configuration file: `~/.threadle/config.json`

```json
{
  "setupCompleted": false,
  "port": 3000,
  "llmProvider": "openai",
  "defaultLanguage": "English",
  "defaultStyle": "ELI5",
  "rateLimitPerMinute": 10,
  "cacheTTL": 3600
}
```

### Available Options

- `port` - Server port (default: 3000)
- `llmProvider` - AI provider: "openai", "anthropic", or "google"
- `defaultLanguage` - Default language for translations
- `defaultStyle` - Default explanation style:
  - `ELI5` - Explain Like I'm 5 (simplest)
  - `Business Summary` - Business-focused explanation
  - `Technical Lite` - Technical but accessible
  - `Analogies Only` - Use analogies and metaphors
- `rateLimitPerMinute` - Max requests per user per minute
- `cacheTTL` - Cache time-to-live in seconds

## Commands Reference

### CLI Commands

```bash
threadle init          # Initialize configuration
threadle start         # Start server
threadle stop          # Stop server
threadle help          # Show help
```

### Docker Commands

```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run

# Stop Docker container
npm run docker:stop

# Docker Compose
npm run docker:compose:up
npm run docker:compose:down
npm run docker:compose:logs
```

### Slash Commands (in Slack)

```bash
/explain              # Explain current thread (ephemeral)
/explain public       # Explain current thread (visible to all)
/setprofile           # Update your profile
/help                 # Show help information
```

## Deployment Options

### Local npm Installation

Perfect for personal use or small teams. Simple installation, runs on your local machine.

**Pros:**

- Easiest to set up
- Direct access to configuration files
- No Docker required

**Cons:**

- Requires Node.js installed
- Manual process management

### Docker Deployment

Ideal for production deployments, server installations, or when you prefer containerization.

**Pros:**

- Isolated environment
- Easy updates (`docker-compose pull`)
- Auto-restart on failure
- No Node.js installation required
- Simple backup/restore (volume snapshots)

**Cons:**

- Requires Docker installed
- Slightly larger disk footprint

See [DOCKER_README.md](DOCKER_README.md) for detailed Docker deployment instructions.

## Troubleshooting

### Server won't start

**Problem**: `Error: Threadle not initialized`

**Solution**: Run `threadle init` first

---

**Problem**: `Error: Server not built`

**Solution**: The package should be pre-built. If developing locally, run `npm run build`

---

**Problem**: `Error: Port 3000 already in use`

**Solution**: Change the port in `~/.threadle/config.json` or stop the process using port 3000

### Slack Integration Issues

**Problem**: Slash commands don't respond

**Solution**:

1. Check server is running: `curl http://localhost:3000/health`
2. Verify Slack App Request URL is correct
3. Check signing secret matches in setup wizard
4. Review logs in `~/.threadle/logs/`

---

**Problem**: "Invalid token" error

**Solution**:

1. Re-run setup wizard from web UI
2. Verify Slack bot token is correct
3. Reinstall Slack App to workspace

### LLM Provider Issues

**Problem**: "Invalid API key" error

**Solution**:

1. Verify API key in Admin Settings
2. Test connection from web UI
3. Check API key has required permissions
4. Verify API key is not expired

---

**Problem**: Slow response times

**Solution**:

1. Check network connectivity
2. Increase cache TTL in config
3. Consider switching to faster LLM provider
4. Review rate limits on your API key

### Database Issues

**Problem**: "Database locked" error

**Solution**:

1. Stop server: `threadle stop`
2. Wait 10 seconds
3. Restart: `threadle start`
4. SQLite WAL mode should prevent this

---

**Problem**: Lost data after update

**Solution**:

1. Database is stored in `~/.threadle/data/threadle.db`
2. Check if file exists and has content
3. Restore from backup if available

### Docker-Specific Issues

**Problem**: Container won't start

**Solution**:

1. Check Docker logs: `docker logs threadle`
2. Verify volume permissions
3. Ensure port 3000 is available

---

**Problem**: Data not persisting

**Solution**:

1. Verify volume is mounted correctly
2. Check docker-compose.yml volume configuration
3. Use named volumes or bind mounts consistently

See [DOCKER_README.md](DOCKER_README.md) for more Docker troubleshooting.

## Development

### Prerequisites

- Node.js 20+
- npm 9+

### Local Development

```bash
# Clone repository
git clone https://github.com/threadle/threadle.git
cd threadle

# Install dependencies
npm install
cd client && npm install && cd ..

# Build project
npm run build

# Run tests
npm test

# Start in dev mode
npm run dev
```

### Project Structure

```
threadle/
├── bin/                    # CLI entry points
│   ├── threadle.js        # Main CLI wrapper
│   ├── threadle-init.js   # Init command
│   ├── threadle-start.js  # Start command
│   └── threadle-stop.js   # Stop command
├── server/                 # Express backend (TypeScript)
│   ├── index.ts           # Main server file
│   ├── config/            # Configuration service
│   ├── database/          # Database & Prisma
│   ├── llm/               # LLM provider integrations
│   ├── slack/             # Slack integration
│   ├── translation/       # Translation engine
│   ├── user/              # User management
│   ├── routes/            # API routes
│   └── middleware/        # Express middleware
├── client/                 # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── api/           # API client
│   │   └── hooks/         # Custom hooks
│   └── dist/              # Built frontend (served by Express)
├── prisma/                 # Database schema
├── prompts/                # LLM prompt templates
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
├── docker-entrypoint.sh    # Container startup script
└── __tests__/              # Test files
```

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.x (strict mode)
- **Backend**: Express.js 4.x
- **Frontend**: React 19 + Vite
- **Database**: SQLite 3 with Prisma ORM
- **Slack**: @slack/bolt SDK
- **LLM**: OpenAI SDK, Anthropic SDK, Google Generative AI
- **State Management**: TanStack Query + Zustand
- **UI Components**: Radix UI + Tailwind CSS
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose

## Security & Privacy

- **Local First**: All data stored locally on your machine
- **Encrypted Secrets**: API keys and tokens encrypted at rest
- **No Cloud Dependencies**: No data sent to Threadle servers (we don't have any!)
- **PII Redaction**: Automatically redacts sensitive information before sending to LLM
- **Rate Limiting**: Configurable per-user rate limits
- **Audit Logging**: All actions logged for security review
- **HTTPS Only**: Enforced for production Slack webhooks
- **Non-Root Container**: Docker image runs as non-root user for security

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas to Contribute

- Additional LLM providers (Azure OpenAI, Cohere, etc.)
- Translation style presets
- UI/UX improvements
- Performance optimizations
- Documentation improvements
- Bug fixes

## Support

- **Issues**: https://github.com/threadle/threadle/issues
- **Discussions**: https://github.com/threadle/threadle/discussions
- **Documentation**: https://github.com/threadle/threadle/wiki

## Roadmap

- [x] Docker image distribution
- [ ] SaaS multi-tenant version
- [ ] Slack App Marketplace listing
- [ ] Microsoft Teams integration
- [ ] Custom fine-tuned models
- [ ] Company knowledge base integration

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

Built with:

- [Express.js](https://expressjs.com/)
- [React](https://react.dev/)
- [Prisma](https://www.prisma.io/)
- [Slack Bolt](https://slack.dev/bolt-js/)
- [OpenAI API](https://openai.com/api/)
- [Anthropic Claude](https://www.anthropic.com/)
- [Google Gemini](https://deepmind.google/technologies/gemini/)

## Star History

If you find Threadle useful, please consider starring the repository!

---

Made with care by the Threadle community
