/**
 * PromptBuilder - Builds role-specific prompts using Handlebars templates
 */

import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { ConversationMessage, UserProfile, ROLE_TEMPLATE_MAP } from './types.js';

/**
 * PromptBuilder class - generates role-specific prompts from templates
 */
export class PromptBuilder {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private promptsDir: string;

  /**
   * Create a new PromptBuilder instance
   * @param promptsDir - Directory containing Handlebars templates (optional)
   */
  constructor(promptsDir?: string) {
    // Default to project root prompts directory
    // Use __dirname equivalent for CommonJS compatibility
    this.promptsDir = promptsDir || path.join(process.cwd(), 'prompts');

    // Register Handlebars helpers
    this.registerHelpers();

    // Load templates
    this.loadTemplates();
  }

  /**
   * Register custom Handlebars helpers
   * @private
   */
  private registerHelpers(): void {
    // Helper for equality comparison
    Handlebars.registerHelper('eq', function (a: any, b: any) {
      return a === b;
    });
  }

  /**
   * Load all Handlebars templates from prompts directory
   * @private
   */
  private loadTemplates(): void {
    if (!fs.existsSync(this.promptsDir)) {
      console.warn(`Prompts directory not found: ${this.promptsDir}`);
      return;
    }

    const files = fs.readdirSync(this.promptsDir);

    files.forEach((file) => {
      if (file.endsWith('.hbs')) {
        const templateName = file.replace('.hbs', '');
        const templatePath = path.join(this.promptsDir, file);
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        const template = Handlebars.compile(templateContent);

        this.templates.set(templateName, template);
      }
    });
  }

  /**
   * Build a prompt for translation
   * @param user - User profile with role, language, and preferences
   * @param conversation - Array of conversation messages
   * @param style - Translation style preference
   * @returns Generated prompt string
   */
  buildPrompt(user: UserProfile, conversation: ConversationMessage[], style: string): string {
    // Determine which template to use based on role
    const templateName = this.getTemplateForRole(user.role);

    // Get the template
    const template = this.templates.get(templateName);

    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Prepare template data
    const data = {
      user: {
        role: user.role,
        language: user.language,
        customInstructions: user.customInstructions,
      },
      conversation,
      style,
    };

    // Render the template
    return template(data);
  }

  /**
   * Get the appropriate template name for a user role
   * @param role - User role
   * @returns Template name
   * @private
   */
  private getTemplateForRole(role: string): string {
    // Map role to template, default to 'default' if not found
    return ROLE_TEMPLATE_MAP[role] || 'default';
  }

  /**
   * Get list of available templates
   * @returns Array of template names
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}
