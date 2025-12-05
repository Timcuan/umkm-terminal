#!/usr/bin/env node
/**
 * Clean script - Cross-platform compatible
 * Removes the dist directory
 */

const fs = require('node:fs');
const path = require('node:path');

const distPath = path.join(__dirname, '..', 'dist');

try {
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
    console.log('✓ Cleaned dist directory');
  } else {
    console.log('✓ dist directory already clean');
  }
} catch (err) {
  console.error('Error cleaning dist:', err.message);
  process.exit(1);
}
