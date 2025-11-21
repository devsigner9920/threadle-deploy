#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const THREADLE_DIR = path.join(os.homedir(), '.threadle');
const CONFIG_FILE = path.join(THREADLE_DIR, 'config.json');
const PID_FILE = path.join(THREADLE_DIR, 'threadle.pid');

function startThreadle() {
  console.log('Starting Threadle...');

  try {
    // Check if config exists
    if (!fs.existsSync(CONFIG_FILE)) {
      console.error('Error: Threadle not initialized. Run "threadle-init" first.');
      process.exit(1);
    }

    // Check if already running
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10);
      try {
        // Check if process is still running
        process.kill(pid, 0);
        console.error(`Error: Threadle is already running (PID: ${pid})`);
        console.error('Run "threadle-stop" first to stop the existing instance.');
        process.exit(1);
      } catch (e) {
        // Process not running, remove stale PID file
        fs.unlinkSync(PID_FILE);
      }
    }

    // Load config
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const port = config.port || 3000;

    // Get the path to the compiled server
    const serverPath = path.join(__dirname, '../dist/server/index.js');

    if (!fs.existsSync(serverPath)) {
      console.error('Error: Server not built. Run "npm run build" first.');
      process.exit(1);
    }

    // Start the server
    const server = spawn('node', [serverPath], {
      env: { ...process.env, PORT: port.toString() },
      detached: true,
      stdio: 'ignore',
    });

    // Save PID
    fs.writeFileSync(PID_FILE, server.pid.toString());

    // Unref so parent can exit
    server.unref();

    console.log(`✓ Threadle started successfully (PID: ${server.pid})`);
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);

    if (!config.setupCompleted) {
      console.log('\nFirst-time setup detected. Open the URL above to complete setup.');
    }

    console.log('\nTo stop the server, run: threadle-stop\n');
  } catch (error) {
    console.error('Error starting Threadle:', error.message);
    process.exit(1);
  }
}

// Run start
startThreadle();
