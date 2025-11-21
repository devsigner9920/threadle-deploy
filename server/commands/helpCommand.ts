/**
 * /help Command Handler
 * Provides comprehensive help text with command examples and feature overview
 */

import { SlackCommandResponse } from './types.js';
import { ConfigService } from '../config/index.js';

/**
 * Handle /help slash command
 * @returns Command response with help text
 */
export async function handleHelpCommand(): Promise<SlackCommandResponse> {
  const configService = new ConfigService();
  configService.load();
  const port = configService.get('port');

  const helpText = `*Welcome to Threadle - Your Cross-Discipline Slack Translator!* :books:

Threadle helps translate technical jargon between different professional disciplines using AI-powered explanations.

*Available Commands:*

\`/explain\` - Translate technical discussion into plain language
  • Default: Shows translation only to you (ephemeral)
  • Usage: \`/explain\` - Get private explanation of current thread
  • Public: \`/explain public\` - Share explanation with everyone in channel
  • Context: Use within a thread for full conversation context
  • Outside threads: Analyzes last 10 messages in channel

\`/setprofile\` - Configure your personal profile and preferences
  • Opens a modal to set your role, language, and translation style
  • Customizes how explanations are tailored to you
  • Set custom instructions for personalized translations

\`/help\` - Show this help message
  • Displays command examples and feature overview

*Response Types:*
• *Ephemeral*: Only visible to you (default for privacy)
• *Public*: Visible to everyone in the channel (use \`/explain public\`)

*Profile Management:*
You can also manage your profile through the web interface:
:globe_with_meridians: http://localhost:${port}/profile

*Getting Started:*
1. Set up your profile with \`/setprofile\`
2. Join a technical discussion thread
3. Use \`/explain\` to get a personalized translation
4. Adjust your profile settings as needed

*Need more help?*
Visit our documentation or contact your workspace admin.

Happy translating! :rocket:`;

  return {
    response_type: 'ephemeral',
    text: helpText,
  };
}
