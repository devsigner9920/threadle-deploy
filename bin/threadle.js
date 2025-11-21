#!/usr/bin/env node

/**
 * Threadle CLI Main Entry Point
 * Provides unified CLI interface for all commands
 */

const { spawn } = require('child_process');
const path = require('path');

const commands = {
  init: './threadle-init.js',
  start: './threadle-start.js',
  stop: './threadle-stop.js',
};

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
Threadle - Cross-Discipline Slack Translator Bot

Usage:
  threadle <command> [options]

Commands:
  init      Initialize Threadle configuration directory
  start     Start the Threadle server
  stop      Stop the running Threadle server
  help      Show this help message

Examples:
  threadle init
  threadle start
  threadle stop

For more information, visit: https://github.com/threadle/threadle
`);
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (!commands[command]) {
  console.error(`Error: Unknown command "${command}"`);
  console.error('Run "threadle help" for usage information.');
  process.exit(1);
}

// Execute the appropriate command script
const scriptPath = path.join(__dirname, commands[command]);
const child = spawn('node', [scriptPath, ...args.slice(1)], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (error) => {
  console.error('Error executing command:', error.message);
  process.exit(1);
});
