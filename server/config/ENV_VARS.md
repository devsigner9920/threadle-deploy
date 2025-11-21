# Threadle Environment Variables

This document lists all supported environment variables for configuring Threadle. Environment variables take precedence over `config.json` settings.

## Configuration Variables

### THREADLE_PORT
- **Type:** Number (1-65535)
- **Default:** 3000
- **Description:** Port on which the Threadle server will listen
- **Example:** `THREADLE_PORT=8080`

### THREADLE_LLM_PROVIDER
- **Type:** String
- **Valid Values:** `openai`, `anthropic`, `google`
- **Default:** `openai`
- **Description:** The LLM provider to use for translations
- **Example:** `THREADLE_LLM_PROVIDER=anthropic`

### THREADLE_SLACK_APP_ID
- **Type:** String
- **Default:** None
- **Description:** Slack App ID from your Slack App settings
- **Example:** `THREADLE_SLACK_APP_ID=A0123456789`

### THREADLE_SLACK_CLIENT_ID
- **Type:** String
- **Default:** None
- **Description:** Slack Client ID from your Slack App settings
- **Example:** `THREADLE_SLACK_CLIENT_ID=0123456789.0123456789`

### THREADLE_SLACK_WORKSPACE_ID
- **Type:** String
- **Default:** None
- **Description:** Slack Workspace/Team ID (populated after OAuth)
- **Example:** `THREADLE_SLACK_WORKSPACE_ID=T0123456789`

### THREADLE_DEFAULT_LANGUAGE
- **Type:** String
- **Valid Values:** `English`, `Spanish`, `French`, `German`, `Japanese`, `Korean`, `Chinese`
- **Default:** `English`
- **Description:** Default language for translations
- **Example:** `THREADLE_DEFAULT_LANGUAGE=Spanish`

### THREADLE_DEFAULT_STYLE
- **Type:** String
- **Valid Values:** `ELI5`, `Business Summary`, `Technical Lite`, `Analogies Only`
- **Default:** `ELI5`
- **Description:** Default translation style
- **Example:** `THREADLE_DEFAULT_STYLE="Technical Lite"`

### THREADLE_RATE_LIMIT_PER_MINUTE
- **Type:** Number (1-1000)
- **Default:** 10
- **Description:** Maximum number of translation requests per user per minute
- **Example:** `THREADLE_RATE_LIMIT_PER_MINUTE=20`

### THREADLE_CACHE_TTL
- **Type:** Number (seconds, >= 0)
- **Default:** 3600 (1 hour)
- **Description:** Time-to-live for cached translations in seconds
- **Example:** `THREADLE_CACHE_TTL=7200`

## Secret Variables

These environment variables override encrypted secrets from `secrets.encrypted`. Use these for containerized deployments or CI/CD pipelines.

### THREADLE_SLACK_CLIENT_SECRET
- **Type:** String (Sensitive)
- **Default:** None
- **Description:** Slack Client Secret from your Slack App settings
- **Example:** `THREADLE_SLACK_CLIENT_SECRET=your-client-secret-here`
- **Security:** Never commit this value to version control

### THREADLE_SLACK_SIGNING_SECRET
- **Type:** String (Sensitive)
- **Default:** None
- **Description:** Slack Signing Secret used to verify request authenticity
- **Example:** `THREADLE_SLACK_SIGNING_SECRET=your-signing-secret-here`
- **Security:** Never commit this value to version control

### THREADLE_SLACK_BOT_TOKEN
- **Type:** String (Sensitive)
- **Default:** None
- **Description:** Slack Bot Token (obtained after OAuth installation)
- **Example:** `THREADLE_SLACK_BOT_TOKEN=xoxb-your-bot-token-here`
- **Security:** Never commit this value to version control

### THREADLE_LLM_API_KEY
- **Type:** String (Sensitive)
- **Default:** None
- **Description:** API key for the selected LLM provider (OpenAI, Anthropic, or Google)
- **Example:** `THREADLE_LLM_API_KEY=sk-your-api-key-here`
- **Security:** Never commit this value to version control

## Usage Examples

### Development
```bash
# Start with custom port
THREADLE_PORT=4000 npm start

# Use Anthropic Claude instead of OpenAI
THREADLE_LLM_PROVIDER=anthropic THREADLE_LLM_API_KEY=sk-ant-xxx npm start
```

### Docker
```bash
# Using environment variables with Docker
docker run -p 3000:3000 \
  -e THREADLE_PORT=3000 \
  -e THREADLE_LLM_PROVIDER=openai \
  -e THREADLE_LLM_API_KEY=sk-xxx \
  -e THREADLE_SLACK_BOT_TOKEN=xoxb-xxx \
  -e THREADLE_SLACK_SIGNING_SECRET=xxx \
  threadle:latest
```

### Docker Compose
```yaml
version: '3.8'
services:
  threadle:
    image: threadle:latest
    ports:
      - "3000:3000"
    environment:
      THREADLE_PORT: 3000
      THREADLE_LLM_PROVIDER: anthropic
      THREADLE_LLM_API_KEY: ${LLM_API_KEY}
      THREADLE_SLACK_BOT_TOKEN: ${SLACK_BOT_TOKEN}
      THREADLE_SLACK_SIGNING_SECRET: ${SLACK_SIGNING_SECRET}
      THREADLE_SLACK_CLIENT_SECRET: ${SLACK_CLIENT_SECRET}
    volumes:
      - threadle-data:/root/.threadle
```

### .env File (Local Development)
```bash
# .env
THREADLE_PORT=3000
THREADLE_LLM_PROVIDER=openai
THREADLE_LLM_API_KEY=sk-xxx
THREADLE_SLACK_BOT_TOKEN=xoxb-xxx
THREADLE_SLACK_SIGNING_SECRET=xxx
THREADLE_SLACK_CLIENT_SECRET=xxx
```

## Priority Order

Configuration values are resolved in the following priority order (highest to lowest):

1. **Environment Variables** - Highest priority
2. **config.json** - User configuration file
3. **Default Values** - Built-in defaults

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use environment variables** for production deployments
3. **Rotate secrets regularly** especially API keys and tokens
4. **Limit access** to config files and environment variables
5. **Use secrets management** tools like AWS Secrets Manager or HashiCorp Vault for production

## Validation

All environment variables are validated on load:
- Numbers must be within specified ranges
- Enum values must match valid options
- Invalid values will cause startup errors with clear messages

## Troubleshooting

### Invalid Configuration Error
```
Error: Invalid port: 70000. Must be a number between 1 and 65535.
```
**Solution:** Check that your environment variables have valid values.

### Missing Secrets
If secrets are not found in either `secrets.encrypted` or environment variables, Threadle will use empty strings. You'll need to complete the setup wizard or provide secrets via environment variables.

### Environment Variables Not Applied
Make sure to:
1. Set environment variables before starting the application
2. Use the correct `THREADLE_` prefix
3. Check for typos in variable names
4. Restart the application after changing environment variables
