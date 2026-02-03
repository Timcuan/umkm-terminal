/**
 * Build configuration for CLI User Experience Optimization
 * 
 * This configuration handles cross-platform builds, TypeScript compilation,
 * and development environment setup for the CLI UX optimization system.
 */

const path = require('path');
const fs = require('fs');

// ============================================================================
// Build Configuration
// ============================================================================

const buildConfig = {
  // Target environments
  targets: {
    node: '16.0.0',
    platforms: ['win32', 'darwin', 'linux']
  },
  
  // Source and output directories
  paths: {
    src: path.resolve(__dirname),
    dist: path.resolve(__dirname, 'dist'),
    tests: path.resolve(__dirname, '../../../tests/cli-ux'),
    coverage: path.resolve(__dirname, '../../../coverage/cli-ux')
  },
  
  // TypeScript configuration
  typescript: {
    configFile: path.resolve(__dirname, 'tsconfig.json'),
    incremental: true,
    tsBuildInfoFile: path.resolve(__dirname, 'dist/.tsbuildinfo')
  },
  
  // Development server configuration
  dev: {
    watch: true,
    watchOptions: {
      ignored: ['node_modules', 'dist', 'coverage'],
      aggregateTimeout: 300,
      poll: 1000
    }
  },
  
  // Production build configuration
  production: {
    minify: true,
    sourceMaps: true,
    treeshaking: true,
    bundleAnalyzer: false
  },
  
  // Testing configuration
  testing: {
    framework: 'jest',
    coverage: {
      threshold: 90,
      reporters: ['text', 'lcov', 'html']
    },
    propertyTesting: {
      framework: 'fast-check',
      iterations: 100
    }
  }
};

// ============================================================================
// Build Scripts
// ============================================================================

/**
 * Clean build artifacts
 */
function clean() {
  const { dist, coverage } = buildConfig.paths;
  
  if (fs.existsSync(dist)) {
    fs.rmSync(dist, { recursive: true, force: true });
  }
  
  if (fs.existsSync(coverage)) {
    fs.rmSync(coverage, { recursive: true, force: true });
  }
  
  console.log('✓ Cleaned build artifacts');
}

/**
 * Build TypeScript files
 */
function buildTypeScript() {
  const { spawn } = require('child_process');
  const { configFile } = buildConfig.typescript;
  
  return new Promise((resolve, reject) => {
    const tsc = spawn('npx', ['tsc', '--project', configFile], {
      stdio: 'inherit',
      shell: true
    });
    
    tsc.on('close', (code) => {
      if (code === 0) {
        console.log('✓ TypeScript compilation completed');
        resolve();
      } else {
        reject(new Error(`TypeScript compilation failed with code ${code}`));
      }
    });
  });
}

/**
 * Run tests
 */
function runTests() {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const jest = spawn('npx', ['jest', '--config', 'src/cli/ux/testing/jest.config.js'], {
      stdio: 'inherit',
      shell: true
    });
    
    jest.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Tests completed successfully');
        resolve();
      } else {
        reject(new Error(`Tests failed with code ${code}`));
      }
    });
  });
}

/**
 * Run property-based tests
 */
function runPropertyTests() {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const jest = spawn('npx', ['jest', '--config', 'src/cli/ux/testing/jest.config.js', '--testNamePattern=Property'], {
      stdio: 'inherit',
      shell: true
    });
    
    jest.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Property-based tests completed successfully');
        resolve();
      } else {
        reject(new Error(`Property-based tests failed with code ${code}`));
      }
    });
  });
}

/**
 * Watch for changes and rebuild
 */
function watch() {
  const chokidar = require('chokidar');
  const { src } = buildConfig.paths;
  
  console.log('👀 Watching for changes...');
  
  const watcher = chokidar.watch([
    path.join(src, '**/*.ts'),
    path.join(src, '**/*.tsx')
  ], {
    ignored: ['**/*.test.ts', '**/*.spec.ts', '**/dist/**', '**/node_modules/**'],
    persistent: true
  });
  
  watcher.on('change', async (filePath) => {
    console.log(`📝 File changed: ${path.relative(src, filePath)}`);
    try {
      await buildTypeScript();
      console.log('✓ Rebuild completed');
    } catch (error) {
      console.error('❌ Rebuild failed:', error.message);
    }
  });
  
  // Initial build
  buildTypeScript().catch(console.error);
}

/**
 * Lint code
 */
function lint() {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const eslint = spawn('npx', ['eslint', 'src/cli/ux/**/*.ts', '--fix'], {
      stdio: 'inherit',
      shell: true
    });
    
    eslint.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Linting completed');
        resolve();
      } else {
        reject(new Error(`Linting failed with code ${code}`));
      }
    });
  });
}

/**
 * Format code
 */
function format() {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const prettier = spawn('npx', ['prettier', '--write', 'src/cli/ux/**/*.ts'], {
      stdio: 'inherit',
      shell: true
    });
    
    prettier.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Code formatting completed');
        resolve();
      } else {
        reject(new Error(`Code formatting failed with code ${code}`));
      }
    });
  });
}

/**
 * Generate documentation
 */
function generateDocs() {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const typedoc = spawn('npx', ['typedoc', '--out', 'docs/cli-ux', 'src/cli/ux'], {
      stdio: 'inherit',
      shell: true
    });
    
    typedoc.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Documentation generated');
        resolve();
      } else {
        reject(new Error(`Documentation generation failed with code ${code}`));
      }
    });
  });
}

/**
 * Full build process
 */
async function build() {
  try {
    console.log('🚀 Starting build process...');
    
    // Clean previous build
    clean();
    
    // Lint and format code
    await lint();
    await format();
    
    // Build TypeScript
    await buildTypeScript();
    
    // Run tests
    await runTests();
    
    // Generate documentation
    await generateDocs();
    
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Development build with watching
 */
async function dev() {
  try {
    console.log('🔧 Starting development mode...');
    
    // Clean previous build
    clean();
    
    // Start watching
    watch();
    
  } catch (error) {
    console.error('❌ Development mode failed:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

const command = process.argv[2];

switch (command) {
  case 'clean':
    clean();
    break;
  case 'build':
    build();
    break;
  case 'dev':
    dev();
    break;
  case 'watch':
    watch();
    break;
  case 'test':
    runTests();
    break;
  case 'test:property':
    runPropertyTests();
    break;
  case 'lint':
    lint();
    break;
  case 'format':
    format();
    break;
  case 'docs':
    generateDocs();
    break;
  default:
    console.log(`
CLI User Experience Optimization - Build System

Usage: node build.config.js <command>

Commands:
  clean          Clean build artifacts
  build          Full production build
  dev            Development mode with watching
  watch          Watch for changes and rebuild
  test           Run all tests
  test:property  Run property-based tests only
  lint           Lint and fix code
  format         Format code with Prettier
  docs           Generate documentation

Examples:
  node build.config.js build
  node build.config.js dev
  node build.config.js test
`);
}

// ============================================================================
// Export Configuration
// ============================================================================

module.exports = buildConfig;