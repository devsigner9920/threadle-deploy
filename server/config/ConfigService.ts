/**
 * ConfigService - Manages application configuration
 * Handles loading, saving, and accessing configuration with type safety
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  AppConfig,
  DEFAULT_CONFIG,
  ENV_VAR_MAPPING,
  VALID_LLM_PROVIDERS,
  VALID_TRANSLATION_STYLES,
  VALID_LANGUAGES,
  LLMProvider,
  TranslationStyle,
  Language,
} from './types.js';

/**
 * ConfigService class - manages application configuration
 */
export class ConfigService {
  private config: AppConfig;
  private readonly configPath: string;
  private loaded: boolean = false;

  /**
   * Create a new ConfigService instance
   * @param configDir - Directory where config.json is stored (default: ~/.threadle)
   */
  constructor(configDir?: string) {
    const baseDir = configDir || path.join(os.homedir(), '.threadle');

    // Ensure directory exists
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    this.configPath = path.join(baseDir, 'config.json');

    // Initialize with default config
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Load configuration from disk
   * Creates default config if file doesn't exist
   * Applies environment variable overrides
   */
  load(): void {
    if (fs.existsSync(this.configPath)) {
      try {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent) as Partial<AppConfig>;

        // Merge with defaults to ensure all fields exist
        this.config = { ...DEFAULT_CONFIG, ...fileConfig };
      } catch (error) {
        console.error('Error loading config, using defaults:', error);
        this.config = { ...DEFAULT_CONFIG };
      }
    } else {
      // Create default config file
      this.config = { ...DEFAULT_CONFIG };
      this.save();
    }

    // Apply environment variable overrides
    this.applyEnvironmentOverrides();

    this.loaded = true;
  }

  /**
   * Save configuration to disk
   * Does not include environment variable overrides in saved file
   */
  save(): void {
    // Create a copy without environment overrides for saving
    const configToSave = { ...this.config };

    // Write to file
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(configToSave, null, 2),
      'utf-8'
    );
  }

  /**
   * Get a configuration value by key
   * @param key - Configuration key
   * @returns Configuration value
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    if (!this.loaded) {
      this.load();
    }
    return this.config[key];
  }

  /**
   * Set a configuration value by key
   * Validates the value before setting
   * @param key - Configuration key
   * @param value - Value to set
   */
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    // Validate the value
    this.validate(key, value);

    this.config[key] = value;
  }

  /**
   * Get all configuration values
   * @returns Complete configuration object
   */
  getAll(): AppConfig {
    if (!this.loaded) {
      this.load();
    }
    return { ...this.config };
  }

  /**
   * Update multiple configuration values at once
   * @param updates - Partial configuration object with updates
   */
  update(updates: Partial<AppConfig>): void {
    // Validate all updates first
    for (const [key, value] of Object.entries(updates)) {
      this.validate(key as keyof AppConfig, value);
    }

    // Apply updates
    this.config = { ...this.config, ...updates };
  }

  /**
   * Check if this is a first-time setup
   * @returns true if setup has not been completed
   */
  isFirstTimeSetup(): boolean {
    if (!this.loaded) {
      this.load();
    }
    return !this.config.setupCompleted;
  }

  /**
   * Mark setup as completed
   */
  completeSetup(): void {
    this.set('setupCompleted', true);
    this.save();
  }

  /**
   * Validate a configuration value
   * @param key - Configuration key
   * @param value - Value to validate
   * @throws Error if validation fails
   * @private
   */
  private validate<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    switch (key) {
      case 'port':
        if (typeof value !== 'number' || value < 1 || value > 65535) {
          throw new Error(`Invalid port: ${value}. Must be a number between 1 and 65535.`);
        }
        break;

      case 'llmProvider':
        if (!VALID_LLM_PROVIDERS.includes(value as LLMProvider)) {
          throw new Error(
            `Invalid LLM provider: ${value}. Must be one of: ${VALID_LLM_PROVIDERS.join(', ')}`
          );
        }
        break;

      case 'defaultStyle':
        if (!VALID_TRANSLATION_STYLES.includes(value as TranslationStyle)) {
          throw new Error(
            `Invalid translation style: ${value}. Must be one of: ${VALID_TRANSLATION_STYLES.join(', ')}`
          );
        }
        break;

      case 'defaultLanguage':
        if (!VALID_LANGUAGES.includes(value as Language)) {
          throw new Error(
            `Invalid language: ${value}. Must be one of: ${VALID_LANGUAGES.join(', ')}`
          );
        }
        break;

      case 'rateLimitPerMinute':
        if (typeof value !== 'number' || value < 1 || value > 1000) {
          throw new Error(
            `Invalid rate limit: ${value}. Must be a number between 1 and 1000.`
          );
        }
        break;

      case 'cacheTTL':
        if (typeof value !== 'number' || value < 0) {
          throw new Error(`Invalid cache TTL: ${value}. Must be a non-negative number.`);
        }
        break;

      case 'setupCompleted':
        if (typeof value !== 'boolean') {
          throw new Error(`Invalid setupCompleted: ${value}. Must be a boolean.`);
        }
        break;

      // String fields - basic validation
      case 'slackAppId':
      case 'slackClientId':
      case 'slackWorkspaceId':
      case 'jwtSecret':
        if (value !== undefined && typeof value !== 'string') {
          throw new Error(`Invalid ${key}: ${value}. Must be a string.`);
        }
        break;
    }
  }

  /**
   * Apply environment variable overrides to configuration
   * Priority: env vars > config.json > defaults
   * @private
   */
  private applyEnvironmentOverrides(): void {
    for (const [envVar, configKey] of Object.entries(ENV_VAR_MAPPING)) {
      const value = process.env[envVar];
      if (value !== undefined && value !== '') {
        // Parse the value based on the config key type
        const parsedValue = this.parseEnvironmentValue(
          configKey as keyof AppConfig,
          value
        );
        if (parsedValue !== null) {
          (this.config as any)[configKey] = parsedValue;
        }
      }
    }
  }

  /**
   * Parse environment variable value to appropriate type
   * @param key - Configuration key
   * @param value - String value from environment
   * @returns Parsed value or null if parsing fails
   * @private
   */
  private parseEnvironmentValue<K extends keyof AppConfig>(
    key: K,
    value: string
  ): AppConfig[K] | null {
    try {
      switch (key) {
        case 'port':
        case 'rateLimitPerMinute':
        case 'cacheTTL':
          return parseInt(value, 10) as AppConfig[K];

        case 'setupCompleted':
          return (value.toLowerCase() === 'true') as AppConfig[K];

        default:
          // String values
          return value as AppConfig[K];
      }
    } catch (error) {
      console.error(`Error parsing environment variable ${key}:`, error);
      return null;
    }
  }

  /**
   * Check if configuration file exists
   * @returns true if config file exists
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Reset configuration to defaults (use with caution!)
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }

  /**
   * Delete configuration file (use with caution!)
   */
  deleteConfig(): void {
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
    this.config = { ...DEFAULT_CONFIG };
    this.loaded = false;
  }
}
