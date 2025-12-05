#!/usr/bin/env node
/**
 * Publish script - Validates and publishes to npm
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const pkg = require('../package.json');

console.log('');
console.log('+---------------------------------------+');
console.log('|     UMKM Terminal - Publish Check    |');
console.log('+---------------------------------------+');
console.log('');

// Check version
console.log(`Version: ${pkg.version}`);
console.log(`Name: ${pkg.name}`);
console.log('');

// Check dist exists
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.log('[!] dist/ not found. Run: npm run build');
  process.exit(1);
}
console.log('[✓] dist/ exists');

// Check CLI works
try {
  const version = execSync('node dist/cli/index.js --version', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  }).trim();
  console.log(`[✓] CLI works: ${version}`);
} catch {
  console.log('[!] CLI test failed');
  process.exit(1);
}

// Show what will be published
console.log('');
console.log('Files to publish:');
console.log('-----------------');
try {
  execSync('npm pack --dry-run 2>&1 | grep "npm notice" | head -20', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
} catch {
  // Ignore
}

console.log('');
console.log('+---------------------------------------+');
console.log('|           Ready to Publish!          |');
console.log('+---------------------------------------+');
console.log('');
console.log('To publish, run:');
console.log('  npm publish');
console.log('');
console.log('Or for first time:');
console.log('  npm publish --access public');
console.log('');
