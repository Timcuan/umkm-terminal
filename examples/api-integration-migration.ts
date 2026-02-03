/**
 * Migration Example: From Direct to API Integration
 * 
 * This example shows how to migrate existing code to use API integration
 * while maintaining backward compatibility.
 */

import { Clanker } from '../src/v4/index.js';
import { createEnhancedClanker } from '../src/clanker-api/index.js';
import type { ClankerTokenV4 } from '../src/types/index.js';

// Example token configuration (unchanged from existing code)
const existingTokenConfig: ClankerTokenV4 = {
  name: 'Migration Example Token',
  symbol: 'MIGRATE',
  image: 'https://example.com/migrate-token.png',
  tokenAdmin: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e',
  chainId: 8453,
};

async function migrationExample() {
  console.log('🔄 Migration Example: From Direct to API Integration\n');

  // ========================================================================
  // BEFORE: Original Code (v4.24 and earlier)
  // ========================================================================
  
  console.log('📜 BEFORE: Original implementation');
  console.log('```typescript');
  console.log('// Original code - still works exactly the same!');
  console.log('const clanker = new Clanker({');
  console.log('  wallet: walletClient,');
  console.log('  publicClient: publicClient,');
  console.log('});');
  console.log('');
  console.log('const result = await clanker.deploy(tokenConfig);');
  console.log('```');

  // This still works exactly as before
  const originalClanker = new Clanker({
    // wallet: walletClient,      // Would be provided in real usage
    // publicClient: publicClient, // Would be provided in real usage
  });

  console.log('\n✅ Original code still works - no changes required!');
  console.log('Available methods:', originalClanker.getAvailableMethods());

  // ========================================================================
  // AFTER: Enhanced with API Integration (v4.25+)
  // ========================================================================

  console.log('\n🚀 AFTER: Enhanced with API integration');
  console.log('```typescript');
  console.log('// Enhanced code - same interface, more capabilities!');
  console.log('const clanker = new Clanker({');
  console.log('  wallet: walletClient,');
  console.log('  publicClient: publicClient,');
  console.log('  // New: Add API integration');
  console.log('  api: { apiKey: process.env.CLANKER_API_KEY },');
  console.log('  operationMethod: "auto", // Smart method selection');
  console.log('});');
  console.log('');
  console.log('// Same method call, enhanced capabilities');
  console.log('const result = await clanker.deploy(tokenConfig);');
  console.log('```');

  const enhancedClanker = new Clanker({
    // wallet: walletClient,      // Same as before
    // publicClient: publicClient, // Same as before
    
    // New: API integration
    api: {
      apiKey: process.env.CLANKER_API_KEY || 'demo-key-for-testing',
    },
    operationMethod: 'auto', // Smart method selection
  });

  console.log('\n✅ Enhanced version with API integration!');
  console.log('Available methods:', enhancedClanker.getAvailableMethods());
  console.log('API integration enabled:', enhancedClanker.isAPIIntegrationEnabled());

  // ========================================================================
  // Migration Strategies
  // ========================================================================

  console.log('\n📋 Migration Strategies:');

  // Strategy 1: Gradual Migration (Recommended)
  console.log('\n1️⃣ Strategy 1: Gradual Migration (Recommended)');
  console.log('   • Keep existing code unchanged');
  console.log('   • Add API key to environment variables');
  console.log('   • Update configuration to include API support');
  console.log('   • Use "auto" method for intelligent selection');

  const gradualMigration = new Clanker({
    // Existing configuration (unchanged)
    // wallet: walletClient,
    // publicClient: publicClient,
    
    // Gradual additions
    api: { apiKey: process.env.CLANKER_API_KEY || 'demo-key' },
    operationMethod: 'auto', // Fallback to direct if API fails
  });

  console.log('   Result: Backward compatible with enhanced capabilities');

  // Strategy 2: Enhanced Features
  console.log('\n2️⃣ Strategy 2: Enhanced Features');
  console.log('   • Use EnhancedClanker for additional debugging features');
  console.log('   • Access to method selection context');
  console.log('   • Advanced configuration management');

  const enhancedFeatures = createEnhancedClanker({
    operationMethod: 'auto',
    api: { apiKey: process.env.CLANKER_API_KEY || 'demo-key' },
  });

  const config = enhancedFeatures.getConfig();
  console.log('   Enhanced config:', {
    hasApiKey: config.hasApiKey,
    availableMethods: config.availableMethods,
  });

  // Strategy 3: Environment-Based Configuration
  console.log('\n3️⃣ Strategy 3: Environment-Based Configuration');
  console.log('   • Use environment variables for all configuration');
  console.log('   • No code changes required for different environments');
  console.log('   • Easy deployment and testing');

  console.log('   Environment variables:');
  console.log('   ```bash');
  console.log('   CLANKER_API_KEY=your-api-key-here');
  console.log('   CLANKER_OPERATION_METHOD=auto');
  console.log('   CLANKER_API_TIMEOUT=30000');
  console.log('   ```');

  // ========================================================================
  // Feature Comparison
  // ========================================================================

  console.log('\n📊 Feature Comparison:');

  const features = [
    { feature: 'Token Deployment', before: '✅', after: '✅ Enhanced' },
    { feature: 'Backward Compatibility', before: '✅', after: '✅' },
    { feature: 'Method Selection', before: 'Direct only', after: 'Direct/API/Auto' },
    { feature: 'Batch Operations', before: 'Sequential', after: 'Optimized' },
    { feature: 'Error Handling', before: 'Basic', after: 'Comprehensive' },
    { feature: 'Multi-Chain Support', before: 'Manual', after: 'Intelligent' },
    { feature: 'Configuration Updates', before: 'Static', after: 'Runtime' },
    { feature: 'Connection Testing', before: 'None', after: '✅' },
    { feature: 'Token Validation', before: 'Basic', after: 'Enhanced' },
    { feature: 'AI-Powered Features', before: 'None', after: '✅' },
  ];

  console.log('\n   Feature                 | Before (v4.24) | After (v4.25)');
  console.log('   ----------------------- | -------------- | -------------');
  features.forEach(({ feature, before, after }) => {
    const paddedFeature = feature.padEnd(23);
    const paddedBefore = before.padEnd(14);
    console.log(`   ${paddedFeature} | ${paddedBefore} | ${after}`);
  });

  // ========================================================================
  // Testing Migration
  // ========================================================================

  console.log('\n🧪 Testing Migration:');

  // Test 1: Validate same behavior
  console.log('\n   Test 1: Validate same behavior');
  try {
    const originalValidation = await originalClanker.validateTokenConfig(existingTokenConfig);
    const enhancedValidation = await enhancedClanker.validateTokenConfig(existingTokenConfig);

    console.log('   ✅ Original validation:', originalValidation.valid);
    console.log('   ✅ Enhanced validation:', enhancedValidation.valid);
    console.log('   ✅ Behavior consistent:', originalValidation.valid === enhancedValidation.valid);
  } catch (error) {
    console.log('   ⚠️  Validation test skipped (expected in demo)');
  }

  // Test 2: New capabilities
  console.log('\n   Test 2: New capabilities available');
  const newCapabilities = [
    { name: 'Multiple methods', test: () => enhancedClanker.getAvailableMethods().length > 1 },
    { name: 'API integration', test: () => enhancedClanker.isAPIIntegrationEnabled() },
    { name: 'Connection testing', test: () => typeof enhancedClanker.testConnection === 'function' },
    { name: 'Configuration updates', test: () => typeof enhancedClanker.updateConfig === 'function' },
  ];

  newCapabilities.forEach(({ name, test }) => {
    const available = test();
    console.log(`   ${available ? '✅' : '❌'} ${name}: ${available ? 'Available' : 'Not available'}`);
  });

  // ========================================================================
  // Migration Checklist
  // ========================================================================

  console.log('\n📝 Migration Checklist:');
  
  const checklist = [
    '[ ] Existing code works without changes',
    '[ ] Add CLANKER_API_KEY to environment variables',
    '[ ] Update configuration to include API support',
    '[ ] Test with operationMethod: "auto"',
    '[ ] Verify enhanced error handling',
    '[ ] Test batch deployment improvements',
    '[ ] Update documentation and examples',
    '[ ] Train team on new features',
  ];

  checklist.forEach(item => console.log(`   ${item}`));

  // ========================================================================
  // Best Practices for Migration
  // ========================================================================

  console.log('\n💡 Best Practices for Migration:');
  
  const bestPractices = [
    'Start with "auto" method for seamless fallback',
    'Test in development environment first',
    'Monitor API usage and rate limits',
    'Keep direct method as backup',
    'Update error handling for new error types',
    'Use environment variables for configuration',
    'Implement gradual rollout strategy',
    'Document new capabilities for team',
  ];

  bestPractices.forEach((practice, index) => {
    console.log(`   ${index + 1}. ${practice}`);
  });

  console.log('\n✅ Migration example completed!');
  console.log('\nKey takeaways:');
  console.log('• Zero breaking changes - existing code works unchanged');
  console.log('• Enhanced capabilities available when configured');
  console.log('• Gradual migration path with intelligent fallbacks');
  console.log('• Comprehensive testing ensures compatibility');
}

// Export for use in other examples
export { migrationExample, existingTokenConfig };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrationExample();
}