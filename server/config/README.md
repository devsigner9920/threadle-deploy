# Configuration & Secrets Management

This module provides secure configuration and secrets management for the Threadle application.

## Overview

The configuration system consists of two main services:

1. **ConfigService**: Manages application configuration in `~/.threadle/config.json`
2. **SecretsService**: Manages encrypted secrets in `~/.threadle/secrets.encrypted`

## Features

- Type-safe configuration access
- AES-256-GCM encryption for sensitive data
- Environment variable overrides
- Machine-specific key derivation
- Automatic first-time setup detection
- Configuration validation

## Configuration Structure

### config.json

Stores non-sensitive configuration:

```json
{
  "setupCompleted": false,
  "port": 3000,
  "llmProvider": "openai",
  "slackAppId": "A1234567890",
  "slackClientId": "123456789.123456789",
  "slackWorkspaceId": "T1234567890",
  "defaultLanguage": "English",
  "defaultStyle": "ELI5",
  "rateLimitPerMinute": 10,
  "cacheTTL": 3600
}
```

### secrets.encrypted

Stores encrypted sensitive data:

- `slackClientSecret`: Slack App Client Secret
- `slackSigningSecret`: Slack Request Signing Secret
- `slackBotToken`: Slack Bot OAuth Token
- `llmApiKey`: LLM Provider API Key (OpenAI, Anthropic, or Google)

## Usage

### ConfigService

```typescript
import { ConfigService } from './config/ConfigService';

const configService = new ConfigService();
configService.load();

// Get configuration values
const port = configService.get('port');
const llmProvider = configService.get('llmProvider');

// Set configuration values
configService.set('port', 4000);
configService.set('llmProvider', 'anthropic');
configService.save();

// Check first-time setup
if (configService.isFirstTimeSetup()) {
  // Show setup wizard
}

// Mark setup as complete
configService.completeSetup();
```

### SecretsService

```typescript
import { SecretsService } from './config/SecretsService';

const secretsService = new SecretsService();

// Load secrets (automatically decrypts)
const secrets = secretsService.loadSecrets();
console.log(secrets.llmApiKey);

// Save secrets (automatically encrypts)
secretsService.saveSecrets({
  slackClientSecret: 'your-secret',
  slackSigningSecret: 'your-signing-secret',
  slackBotToken: 'xoxb-your-token',
  llmApiKey: 'sk-your-key',
});

// Update single secret
secretsService.updateSecret('llmApiKey', 'sk-new-key');
```

## Environment Variables

All configuration can be overridden using environment variables. See [ENV_VARS.md](./ENV_VARS.md) for complete documentation.

Priority order: **Environment Variables > config.json > Defaults**

### Examples

```bash
# Override port
THREADLE_PORT=8080 npm start

# Override LLM provider
THREADLE_LLM_PROVIDER=anthropic npm start

# Override secrets
THREADLE_LLM_API_KEY=sk-xxx THREADLE_SLACK_BOT_TOKEN=xoxb-xxx npm start
```

## Security

### Encryption

- Algorithm: **AES-256-GCM** (Authenticated Encryption)
- Key Derivation: PBKDF2 with 100,000 iterations
- Key Source: Machine-specific entropy (hostname + OS platform + architecture)
- IV: Random 16 bytes per encryption
- Authentication Tag: Verified on decryption

### Machine-Specific Keys

Encryption keys are derived from machine-specific information, meaning:
- Encrypted secrets are tied to the machine they were encrypted on
- Moving `secrets.encrypted` to another machine requires re-encryption
- For multi-machine deployments, use environment variables instead

### Best Practices

1. **Never commit** `config.json` or `secrets.encrypted` to version control
2. **Use environment variables** for production deployments
3. **Rotate secrets regularly** especially API keys and tokens
4. **Limit file permissions** on `~/.threadle/` directory
5. **Use different secrets** for development, staging, and production

## File Locations

- Config: `~/.threadle/config.json`
- Secrets: `~/.threadle/secrets.encrypted`
- Custom location: Pass directory path to constructor

```typescript
// Custom directory
const config = new ConfigService('/custom/path');
const secrets = new SecretsService('/custom/path');
```

## Validation

All configuration values are validated on set:

- **port**: Must be 1-65535
- **llmProvider**: Must be `openai`, `anthropic`, or `google`
- **defaultStyle**: Must be valid translation style
- **defaultLanguage**: Must be valid language
- **rateLimitPerMinute**: Must be 1-1000
- **cacheTTL**: Must be >= 0

Invalid values throw descriptive errors:

```typescript
configService.set('port', 70000);
// Error: Invalid port: 70000. Must be a number between 1 and 65535.
```

## Testing

Tests are located in `/__tests__/configuration.test.ts`

Run tests:

```bash
npm test -- __tests__/configuration.test.ts
```

Test coverage includes:
- Configuration loading and saving
- Secrets encryption/decryption
- Environment variable overrides
- First-time setup detection
- Type-safe access and validation

## Integration

The configuration services are automatically initialized in `server/index.ts`:

```typescript
import { ConfigService, SecretsService } from './config/index.js';

const configService = new ConfigService();
const secretsService = new SecretsService();

configService.load();

// Use configuration throughout the application
const PORT = configService.get('port');
```

## API

See individual service files for complete API documentation:

- [ConfigService.ts](./ConfigService.ts)
- [SecretsService.ts](./SecretsService.ts)
- [types.ts](./types.ts)
