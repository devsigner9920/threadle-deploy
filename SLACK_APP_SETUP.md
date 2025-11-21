# Slack App Configuration Guide

This document provides step-by-step instructions for configuring your Slack App in the Slack Developer Portal for use with Threadle.

## Prerequisites

- A Slack workspace where you have admin permissions
- Access to create apps at https://api.slack.com/apps

## Step 1: Create a New Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Select "From scratch"
4. Enter App Name: **Threadle** (or your preferred name)
5. Select your development workspace
6. Click "Create App"

## Step 2: Configure OAuth & Permissions

### OAuth Redirect URLs

1. Navigate to **OAuth & Permissions** in the left sidebar
2. Scroll to **Redirect URLs**
3. Click "Add New Redirect URL"
4. Enter: `http://localhost:3000/api/v1/slack/oauth`
5. Click "Add"
6. Click "Save URLs"

### Bot Token Scopes

1. Scroll down to **Scopes** section
2. Under **Bot Token Scopes**, add the following scopes:
   - `chat:write` - Send messages as the bot
   - `commands` - Add slash commands
   - `users:read` - View users in the workspace
   - `channels:history` - View messages in public channels
   - `groups:history` - View messages in private channels

## Step 3: Enable Slash Commands

1. Navigate to **Slash Commands** in the left sidebar
2. Click "Create New Command"

### Command: /explain

- **Command**: `/explain`
- **Request URL**: `http://localhost:3000/api/v1/slack/commands`
- **Short Description**: `Translate technical jargon into simple language`
- **Usage Hint**: `[public] - Add 'public' to share the explanation with everyone`
- Click "Save"

### Command: /setprofile

- **Command**: `/setprofile`
- **Request URL**: `http://localhost:3000/api/v1/slack/commands`
- **Short Description**: `Configure your role and translation preferences`
- **Usage Hint**: `(opens a modal to set your profile)`
- Click "Save"

### Command: /help

- **Command**: `/help`
- **Request URL**: `http://localhost:3000/api/v1/slack/commands`
- **Short Description**: `Get help using Threadle`
- **Usage Hint**: `(shows comprehensive usage guide)`
- Click "Save"

## Step 4: Enable Event Subscriptions

1. Navigate to **Event Subscriptions** in the left sidebar
2. Toggle **Enable Events** to ON
3. Enter **Request URL**: `http://localhost:3000/api/v1/slack/events`
4. Wait for the URL to be verified (you must have your Threadle server running)

### Subscribe to Bot Events

Under **Subscribe to bot events**, add these events:
- `app_mention` - When the bot is mentioned in a channel
- `message.channels` - Listen to messages in public channels (optional)
- `message.groups` - Listen to messages in private channels (optional)

5. Click "Save Changes"

**Note:** For local development, you'll need to use a tunneling service like ngrok to expose your local server to the internet for URL verification:
```bash
ngrok http 3000
# Use the ngrok URL instead of localhost in all Request URLs above
```

## Step 5: Retrieve App Credentials

### Client Credentials

1. Navigate to **Basic Information** in the left sidebar
2. Scroll to **App Credentials**
3. Copy the following values:
   - **App ID**
   - **Client ID**
   - **Client Secret** (click "Show" to reveal)

### Signing Secret

1. In the same **App Credentials** section
2. Copy the **Signing Secret** (click "Show" to reveal)

## Step 6: Enter Credentials in Threadle Setup Wizard

When running the Threadle setup wizard (Step 3):

1. Enter the **App ID** in the App ID field
2. Enter the **Client ID** in the Client ID field
3. Enter the **Client Secret** in the Client Secret field
4. Enter the **Signing Secret** in the Signing Secret field

These values will be saved securely in your local Threadle configuration.

## Step 7: Install the App to Your Workspace

This is handled automatically through the Threadle setup wizard (Step 4):

1. The wizard will display an "Install to Workspace" button
2. Click the button to authorize the app
3. You'll be redirected to Slack to approve the permissions
4. After approval, you'll be redirected back to the Threadle setup wizard
5. The bot token will be saved automatically

## Verification

After completing the setup:

1. The bot should appear in your Slack workspace
2. You can invite it to channels with `/invite @Threadle`
3. Test the commands:
   - `/explain` in a thread to get a translation
   - `/setprofile` to configure your preferences
   - `/help` to see usage instructions

## Troubleshooting

### URL Verification Fails

- Ensure your Threadle server is running (`npm start` or `threadle start`)
- If using localhost, you need ngrok or similar tunneling service
- Check that the Request URLs use the correct port (default: 3000)

### Bot Token Not Saved

- Verify that all credentials (Client ID, Client Secret, Signing Secret) are correct
- Check the Threadle server logs for any OAuth errors
- Ensure the OAuth Redirect URL matches exactly: `http://localhost:3000/api/v1/slack/oauth`

### Commands Not Working

- Verify the slash commands are created with the correct Request URL
- Check that the signing secret is correctly configured
- Restart your Threadle server after making changes

## Production Deployment

For production deployment, replace `localhost:3000` with your production domain:

- OAuth Redirect URL: `https://yourdomain.com/api/v1/slack/oauth`
- Slash Command Request URLs: `https://yourdomain.com/api/v1/slack/commands`
- Event Subscriptions Request URL: `https://yourdomain.com/api/v1/slack/events`

## Security Best Practices

1. Never commit your Client Secret or Signing Secret to version control
2. Keep your secrets.encrypted file secure and backed up
3. Rotate your secrets periodically
4. Use HTTPS in production (required by Slack)
5. Implement rate limiting to prevent abuse

## Additional Resources

- [Slack API Documentation](https://api.slack.com/docs)
- [Bolt SDK for JavaScript](https://slack.dev/bolt-js/)
- [OAuth 2.0 Guide](https://api.slack.com/authentication/oauth-v2)
- [Signing Secrets](https://api.slack.com/authentication/verifying-requests-from-slack)
