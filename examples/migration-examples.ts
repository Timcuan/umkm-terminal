/**
 * Migration Examples
 * Practical examples of migrating from original Clanker SDK to enhanced version
 */

import { 
  analyzeMigration,
  performMigration,
  generateMigrationReport,
  createMigratedClanker,
  type MigrationOptions 
} from '../src/clanker-api/migration/index.js';
import { createEnhancedClanker } from '../src/clanker-api/index.js';

// ============================================================================
// Example 1: Analyze Existing Configuration
// ============================================================================

export async function exampleAnalyzeMigration() {
  console.log('🔍 Analyzing existing configuration for migration...\n');

  // Existing configuration (original SDK)
  const existingConfig = {
    wallet: {} as any, // Your wallet client
    publicClient: {} as any, // Your public client
  };

  // Existing token configurations
  const existingTokens = [
    {
      name: 'Legacy Token',
      symbol: 'LEGACY',
      tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      // Missing chainId and image (V4 requirements)
    },
    {
      name: 'Old Token',
      symbol: 'OLD',
      tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      description: 'Old style description', // Deprecated format
      twitter: '@oldtoken', // Deprecated format
    },
  ];

  // Analyze migration requirements
  const analysis = analyzeMigration(existingConfig, existingTokens);

  console.log('📊 Migration Analysis Results:');
  console.log(`- Current Version: ${analysis.currentVersion}`);
  console.log(`- Fully Compatible: ${analysis.compatibility.fullyCompatible}`);
  console.log(`- Requires Updates: ${analysis.compatibility.requiresUpdates}`);
  console.log(`- Migration Path: ${analysis.migrationPath}`);
  console.log(`- Estimated Effort: ${analysis.estimatedEffort}`);
  console.log(`- Recommended Method: ${analysis.sdkConfig.recommendedMethod}\n`);

  if (analysis.compatibility.breakingChanges.length > 0) {
    console.log('❌ Breaking Changes:');
    analysis.compatibility.breakingChanges.forEach(change => {
      console.log(`  - ${change}`);
    });
    console.log();
  }

  if (analysis.compatibility.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    analysis.compatibility.recommendations.forEach(rec => {
      console.log(`  - ${rec}`);
    });
    console.log();
  }

  return analysis;
}

// ============================================================================
// Example 2: Perform Automatic Migration
// ============================================================================

export async function examplePerformMigration() {
  console.log('🚀 Performing automatic migration...\n');

  const existingConfig = {
    wallet: {} as any,
    publicClient: {} as any,
  };

  const existingTokens = [
    {
      name: 'My Token',
      symbol: 'MTK',
      tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
      description: 'My awesome token',
      twitter: '@mytoken',
    },
  ];

  const migrationOptions: MigrationOptions = {
    preferredMethod: 'auto',
    enableAPIFeatures: true,
    maintainBackwardCompatibility: true,
    optimizeForPerformance: true,
  };

  // Perform migration
  const migrationResult = performMigration(existingConfig, existingTokens, migrationOptions);

  if (migrationResult.success) {
    console.log('✅ Migration successful!\n');
    
    console.log('📝 Migrated Configuration:');
    console.log(JSON.stringify(migrationResult.migratedConfig, null, 2));
    console.log();

    console.log('🎯 Migrated Tokens:');
    migrationResult.migratedTokens.forEach((token, index) => {
      console.log(`Token ${index + 1}:`, JSON.stringify(token, null, 2));
    });
    console.log();

    console.log('📋 Next Steps:');
    migrationResult.nextSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });
    console.log();
  } else {
    console.log('❌ Migration failed!');
    console.log('Issues found:', migrationResult.nextSteps);
  }

  return migrationResult;
}

// ============================================================================
// Example 3: Generate Migration Report
// ============================================================================

export async function exampleGenerateMigrationReport() {
  console.log('📄 Generating migration report...\n');

  const existingConfig = {
    wallet: {} as any,
    publicClient: {} as any,
  };

  const existingTokens = [
    {
      name: 'Report Token',
      symbol: 'RPT',
      tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
    },
  ];

  const migrationResult = performMigration(existingConfig, existingTokens, {
    enableAPIFeatures: true,
  });

  const report = generateMigrationReport(migrationResult);
  
  console.log('📄 Migration Report Generated:');
  console.log('='.repeat(50));
  console.log(report);
  console.log('='.repeat(50));

  return report;
}

// ============================================================================
// Example 4: Create Migrated Clanker Instance
// ============================================================================

export async function exampleCreateMigratedClanker() {
  console.log('🏗️ Creating migrated Clanker instance...\n');

  const existingConfig = {
    wallet: {} as any,
    publicClient: {} as any,
  };

  try {
    // Create migrated instance
    const migratedClanker = createMigratedClanker(existingConfig, {
      preferredMethod: 'direct', // Use direct method for this example
      maintainBackwardCompatibility: true,
    });

    console.log('✅ Migrated Clanker instance created successfully!');
    console.log('Available methods:', migratedClanker.getAvailableMethods());
    console.log('Configuration:', migratedClanker.getConfig());

    return migratedClanker;
  } catch (error) {
    console.log('❌ Failed to create migrated instance:', error);
    throw error;
  }
}

// ============================================================================
// Example 5: Step-by-Step Migration Process
// ============================================================================

export async function exampleStepByStepMigration() {
  console.log('📚 Step-by-step migration process...\n');

  // Step 1: Original configuration
  console.log('Step 1: Original Configuration');
  const originalConfig = {
    wallet: {} as any,
    publicClient: {} as any,
  };
  console.log('Original:', JSON.stringify(originalConfig, null, 2));
  console.log();

  // Step 2: Analyze for migration
  console.log('Step 2: Analyze Migration Requirements');
  const analysis = analyzeMigration(originalConfig, []);
  console.log(`Migration path: ${analysis.migrationPath}`);
  console.log(`Estimated effort: ${analysis.estimatedEffort}`);
  console.log();

  // Step 3: Create enhanced configuration
  console.log('Step 3: Create Enhanced Configuration');
  const enhancedConfig = {
    ...originalConfig,
    operationMethod: 'direct' as const,
  };
  console.log('Enhanced:', JSON.stringify(enhancedConfig, null, 2));
  console.log();

  // Step 4: Create enhanced Clanker instance
  console.log('Step 4: Create Enhanced Clanker Instance');
  const enhancedClanker = createEnhancedClanker(enhancedConfig);
  console.log('✅ Enhanced Clanker created');
  console.log('Available methods:', enhancedClanker.getAvailableMethods());
  console.log();

  // Step 5: Test new features
  console.log('Step 5: Test New Features');
  
  // Test connection
  try {
    const connectionTest = await enhancedClanker.testConnection();
    console.log('Connection test:', connectionTest);
  } catch (error) {
    console.log('Connection test failed (expected in example):', error instanceof Error ? error.message : error);
  }

  // Test token validation
  const testToken = {
    name: 'Test Token',
    symbol: 'TEST',
    tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
    chainId: 8453,
    image: 'https://example.com/token.png',
  };

  try {
    const validation = await enhancedClanker.validateTokenConfig(testToken);
    console.log('Token validation:', validation);
  } catch (error) {
    console.log('Token validation failed (expected in example):', error instanceof Error ? error.message : error);
  }

  console.log('\n✅ Step-by-step migration completed!');
  return enhancedClanker;
}

// ============================================================================
// Example 6: Migration with API Integration
// ============================================================================

export async function exampleMigrationWithAPI() {
  console.log('🌐 Migration with API integration...\n');

  const existingConfig = {
    wallet: {} as any,
    publicClient: {} as any,
  };

  // Add API configuration
  const apiConfig = {
    ...existingConfig,
    api: {
      apiKey: 'your-api-key-here', // Replace with actual API key
      timeout: 30000,
      retries: 3,
    },
    operationMethod: 'auto' as const, // Use auto method selection
  };

  console.log('API Configuration:');
  console.log(JSON.stringify(apiConfig, null, 2));
  console.log();

  // Create enhanced Clanker with API support
  const apiClanker = createEnhancedClanker(apiConfig);
  
  console.log('✅ API-enabled Clanker created');
  console.log('Available methods:', apiClanker.getAvailableMethods());
  console.log('Has API key:', apiClanker.getConfig().hasApiKey);
  console.log();

  // Test API features
  console.log('🧪 Testing API features...');
  
  const supportedChains = apiClanker.getSupportedChains();
  console.log('Supported chains:');
  console.log('- API only:', supportedChains.api.map(c => c.name));
  console.log('- Direct only:', supportedChains.direct.map(c => c.name));
  console.log('- Both methods:', supportedChains.both.map(c => c.name));
  console.log();

  return apiClanker;
}

// ============================================================================
// Example 7: Batch Migration for Multiple Projects
// ============================================================================

export async function exampleBatchMigration() {
  console.log('📦 Batch migration for multiple projects...\n');

  const projects = [
    {
      name: 'Project A',
      config: { wallet: {} as any, publicClient: {} as any },
      tokens: [
        { name: 'Token A1', symbol: 'A1', tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e' },
        { name: 'Token A2', symbol: 'A2', tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e' },
      ],
    },
    {
      name: 'Project B',
      config: { wallet: {} as any, publicClient: {} as any },
      tokens: [
        { name: 'Token B1', symbol: 'B1', tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e' },
      ],
    },
  ];

  const migrationResults = [];

  for (const project of projects) {
    console.log(`🔄 Migrating ${project.name}...`);
    
    const result = performMigration(project.config, project.tokens, {
      maintainBackwardCompatibility: true,
    });

    migrationResults.push({
      project: project.name,
      success: result.success,
      effort: result.analysis.estimatedEffort,
      issues: result.analysis.compatibility.breakingChanges.length,
    });

    console.log(`  - Success: ${result.success}`);
    console.log(`  - Effort: ${result.analysis.estimatedEffort}`);
    console.log(`  - Issues: ${result.analysis.compatibility.breakingChanges.length}`);
    console.log();
  }

  console.log('📊 Batch Migration Summary:');
  console.table(migrationResults);

  return migrationResults;
}

// ============================================================================
// Run Examples
// ============================================================================

export async function runAllMigrationExamples() {
  console.log('🚀 Running all migration examples...\n');

  try {
    await exampleAnalyzeMigration();
    console.log('\n' + '='.repeat(60) + '\n');

    await examplePerformMigration();
    console.log('\n' + '='.repeat(60) + '\n');

    await exampleGenerateMigrationReport();
    console.log('\n' + '='.repeat(60) + '\n');

    await exampleCreateMigratedClanker();
    console.log('\n' + '='.repeat(60) + '\n');

    await exampleStepByStepMigration();
    console.log('\n' + '='.repeat(60) + '\n');

    await exampleMigrationWithAPI();
    console.log('\n' + '='.repeat(60) + '\n');

    await exampleBatchMigration();
    console.log('\n' + '='.repeat(60) + '\n');

    console.log('✅ All migration examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running migration examples:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllMigrationExamples();
}