#!/usr/bin/env node
/**
 * Post-install script for macOS and Termux (Android)
 */

const fs = require('node:fs');
const path = require('node:path');

// Platform detection
const isTermux = !!process.env.TERMUX_VERSION;
const isMac = process.platform === 'darwin';
const isUnix = isMac || process.platform === 'linux';

// CLI path
const cliPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');

// Set executable permissions (macOS/Termux)
function setPermissions() {
  if (!isUnix) return;

  try {
    if (fs.existsSync(cliPath)) {
      fs.chmodSync(cliPath, 0o755);
    }
  } catch {
    // Silent fail - not critical
  }
}

// Show simple welcome (ASCII-safe for Termux)
function showWelcome() {
  const platform = isTermux ? 'Termux' : isMac ? 'macOS' : 'Linux';

  console.log('');
  console.log('  +---------------------------------------+');
  console.log('  |     UMKM Terminal - Installed!       |');
  console.log('  +---------------------------------------+');
  console.log('');
  console.log(`  Platform: ${platform}`);
  console.log('');
  console.log('  Quick Start:');
  console.log('  1. Create .env with PRIVATE_KEY');
  console.log('  2. Run: umkm');
  console.log('');
}

// Main
setPermissions();
showWelcome();
