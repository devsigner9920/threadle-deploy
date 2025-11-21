#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const THREADLE_DIR = path.join(os.homedir(), '.threadle');
const PID_FILE = path.join(THREADLE_DIR, 'threadle.pid');

function stopThreadle() {
  console.log('Stopping Threadle...');

  try {
    // Check if PID file exists
    if (!fs.existsSync(PID_FILE)) {
      console.error('Error: Threadle is not running (no PID file found).');
      process.exit(1);
    }

    // Read PID
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10);

    try {
      // Send SIGTERM for graceful shutdown
      process.kill(pid, 'SIGTERM');
      console.log(`Sent SIGTERM to process ${pid}`);

      // Wait for process to exit
      let attempts = 0;
      const maxAttempts = 10;

      const checkInterval = setInterval(() => {
        attempts++;

        try {
          // Check if process is still running
          process.kill(pid, 0);

          if (attempts >= maxAttempts) {
            // Force kill after timeout
            console.log('Process did not exit gracefully, forcing shutdown...');
            process.kill(pid, 'SIGKILL');
            clearInterval(checkInterval);
            cleanup();
          }
        } catch (e) {
          // Process has exited
          clearInterval(checkInterval);
          cleanup();
        }
      }, 1000);
    } catch (error) {
      if (error.code === 'ESRCH') {
        // Process not found, just clean up PID file
        console.log('Process already stopped.');
        cleanup();
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error stopping Threadle:', error.message);
    process.exit(1);
  }
}

function cleanup() {
  // Remove PID file
  if (fs.existsSync(PID_FILE)) {
    fs.unlinkSync(PID_FILE);
  }

  console.log('✓ Threadle stopped successfully.\n');
  process.exit(0);
}

// Run stop
stopThreadle();
