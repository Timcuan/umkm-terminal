#!/usr/bin/env node
/**
 * Post-build script - Cross-platform compatible
 * Sets executable permissions on CLI file (Unix only, no-op on Windows)
 */

const fs = require('fs');
const path = require('path');

const cliPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');

try {
  if (fs.existsSync(cliPath)) {
    // Only chmod on Unix-like systems (Linux, macOS, Termux)
    if (process.platform !== 'win32') {
      fs.chmodSync(cliPath, '755');
      console.log('✓ Set executable permissions on CLI');
    }
  }
} catch {
  // Ignore errors - not critical
  console.log('Note: Could not set executable permissions (not required on Windows)');
}
