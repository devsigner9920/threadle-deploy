/**
 * SecretsService - Handles encryption and decryption of sensitive configuration
 * Uses AES-256-GCM encryption with machine-specific key derivation
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  SecretsConfig,
  DEFAULT_SECRETS,
  SECRETS_ENV_VAR_MAPPING,
} from './types.js';

/**
 * Encrypted secrets file format
 */
interface EncryptedSecretsFile {
  algorithm: string;
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * SecretsService class - manages encrypted secrets storage
 */
export class SecretsService {
  private readonly secretsPath: string;
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;

  /**
   * Create a new SecretsService instance
   * @param configDir - Directory where secrets.encrypted is stored (default: ~/.threadle or THREADLE_CONFIG_DIR env var)
   */
  constructor(configDir?: string) {
    const baseDir = configDir || process.env['THREADLE_CONFIG_DIR'] || path.join(os.homedir(), '.threadle');

    // Ensure directory exists
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    this.secretsPath = path.join(baseDir, 'secrets.encrypted');

    // Derive encryption key from machine-specific entropy
    this.encryptionKey = this.deriveEncryptionKey();
  }

  /**
   * Derive encryption key from machine-specific entropy
   * Uses hostname and network interfaces as entropy sources
   * @returns Derived encryption key
   * @private
   */
  private deriveEncryptionKey(): Buffer {
    // Use machine-specific data as seed
    const hostname = os.hostname();
    const networkInterfaces = JSON.stringify(os.networkInterfaces());

    // Create key material from machine-specific data
    const keyMaterial = `${hostname}:${networkInterfaces}`;

    // Derive key using PBKDF2
    return crypto.pbkdf2Sync(
      keyMaterial,
      'threadle-secrets-salt',
      100000,
      32,
      'sha256'
    );
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param plaintext - Data to encrypt
   * @returns Encrypted data with IV and auth tag
   * @private
   */
  private encrypt(plaintext: string): EncryptedSecretsFile {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      algorithm: this.algorithm,
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param encryptedData - Encrypted data with IV and auth tag
   * @returns Decrypted plaintext
   * @private
   */
  private decrypt(encryptedData: EncryptedSecretsFile): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Load secrets from encrypted file
   * @returns Decrypted secrets configuration
   */
  load(): SecretsConfig {
    // Check if secrets file exists
    if (!fs.existsSync(this.secretsPath)) {
      return { ...DEFAULT_SECRETS };
    }

    try {
      // Read encrypted file
      const fileContent = fs.readFileSync(this.secretsPath, 'utf-8');
      const encryptedData: EncryptedSecretsFile = JSON.parse(fileContent);

      // Decrypt secrets
      const decryptedJson = this.decrypt(encryptedData);
      const secrets: SecretsConfig = JSON.parse(decryptedJson);

      // Override with environment variables if present
      return this.applyEnvOverrides(secrets);
    } catch (error) {
      console.error('Error loading secrets:', error);
      // Return defaults if decryption fails
      return { ...DEFAULT_SECRETS };
    }
  }

  /**
   * Save secrets to encrypted file
   * @param secrets - Secrets configuration to save
   */
  save(secrets: SecretsConfig): void {
    try {
      // Serialize secrets to JSON
      const secretsJson = JSON.stringify(secrets, null, 2);

      // Encrypt secrets
      const encryptedData = this.encrypt(secretsJson);

      // Write to file
      fs.writeFileSync(
        this.secretsPath,
        JSON.stringify(encryptedData, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving secrets:', error);
      throw error;
    }
  }

  /**
   * Get a specific secret value
   * @param key - Secret key to retrieve
   * @returns Secret value or undefined if not set
   */
  getSecret(key: keyof SecretsConfig): string | undefined {
    const secrets = this.load();
    return secrets[key];
  }

  /**
   * Update a specific secret value
   * @param key - Secret key to update
   * @param value - New secret value
   */
  updateSecret(key: keyof SecretsConfig, value: string): void {
    const secrets = this.load();
    secrets[key] = value;
    this.save(secrets);
  }

  /**
   * Check if secrets file exists
   * @returns true if secrets file exists
   */
  exists(): boolean {
    return fs.existsSync(this.secretsPath);
  }

  /**
   * Apply environment variable overrides to secrets
   * @param secrets - Base secrets configuration
   * @returns Secrets with environment overrides applied
   * @private
   */
  private applyEnvOverrides(secrets: SecretsConfig): SecretsConfig {
    const overriddenSecrets = { ...secrets };

    // Apply environment variable overrides
    for (const [secretKey, envVar] of Object.entries(SECRETS_ENV_VAR_MAPPING)) {
      const envValue = process.env[envVar];
      if (envValue) {
        overriddenSecrets[secretKey as keyof SecretsConfig] = envValue;
      }
    }

    return overriddenSecrets;
  }
}
