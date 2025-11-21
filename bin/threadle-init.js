#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const THREADLE_DIR = path.join(os.homedir(), '.threadle');
const DATA_DIR = path.join(THREADLE_DIR, 'data');
const LOGS_DIR = path.join(THREADLE_DIR, 'logs');
const CONFIG_FILE = path.join(THREADLE_DIR, 'config.json');
const SECRETS_FILE = path.join(THREADLE_DIR, 'secrets.encrypted');

function initializeThreadle() {
  console.log('Initializing Threadle...');

  try {
    // Create main directory
    if (!fs.existsSync(THREADLE_DIR)) {
      fs.mkdirSync(THREADLE_DIR, { recursive: true });
      console.log(`Created directory: ${THREADLE_DIR}`);
    } else {
      console.log(`Directory already exists: ${THREADLE_DIR}`);
    }

    // Create subdirectories
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`Created directory: ${DATA_DIR}`);
    }

    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
      console.log(`Created directory: ${LOGS_DIR}`);
    }

    // Create default config.json
    if (!fs.existsSync(CONFIG_FILE)) {
      const defaultConfig = {
        setupCompleted: false,
        port: 3000,
        llmProvider: 'openai',
        defaultLanguage: 'English',
        defaultStyle: 'ELI5',
        rateLimitPerMinute: 10,
        cacheTTL: 3600,
      };

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      console.log(`Created config file: ${CONFIG_FILE}`);
    } else {
      console.log(`Config file already exists: ${CONFIG_FILE}`);
    }

    // Create empty secrets.encrypted file
    if (!fs.existsSync(SECRETS_FILE)) {
      fs.writeFileSync(SECRETS_FILE, '{}');
      console.log(`Created secrets file: ${SECRETS_FILE}`);
    } else {
      console.log(`Secrets file already exists: ${SECRETS_FILE}`);
    }

    console.log('\n✓ Threadle initialized successfully!');
    console.log('\nNext steps:');
    console.log('  1. Run "threadle-start" to launch the application');
    console.log('  2. Open http://localhost:3000 in your browser');
    console.log('  3. Follow the setup wizard to configure Threadle\n');
  } catch (error) {
    console.error('Error initializing Threadle:', error.message);
    process.exit(1);
  }
}

// Run initialization
initializeThreadle();
