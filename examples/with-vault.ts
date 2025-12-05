/**
 * Deploy with Vault Example
 * Lock tokens for team/treasury
 */

import 'dotenv/config';
import { Deployer } from '../src/index.js';

async function main() {
  console.log('🔒 Deploy with Vault Example\n');

  const deployer = new Deployer();

  const result = await deployer.deploy({
    name: 'Vaulted Token',
    symbol: 'VAULT',
    description: 'Token with 30% locked for 60 days',

    // Lock 30% of supply for 60 days
    vault: {
      percentage: 30,
      lockupDays: 60,
    },

    // Enable MEV protection
    mev: 8,
  });

  if (result.success) {
    console.log('✅ Token deployed with vault!');
    console.log(`   Address: ${result.tokenAddress}`);
    console.log(`   30% locked for 60 days`);
    console.log(`   MEV protection: 8 blocks`);
  } else {
    console.log('❌ Failed:', result.error);
  }
}

main().catch(console.error);
