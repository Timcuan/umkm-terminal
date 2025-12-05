/**
 * Multi-Chain Deploy Example
 * Deploy same token on multiple chains
 * 
 * Supported Chains:
 * - Base (8453)
 * - Ethereum (1)
 * - Arbitrum (42161)
 * - Unichain (130)
 * - Monad (10143)
 */

import 'dotenv/config';
import { 
  createBaseDeployer, 
  createEthDeployer,
  createArbDeployer, 
  createUnichainDeployer,
  createMonadDeployer,
  type SimpleDeployConfig,
} from '../src/index.js';

async function main() {
  console.log('🌐 Multi-Chain Deploy Example\n');

  // Token config (same for all chains)
  const tokenConfig: SimpleDeployConfig = {
    name: 'Multi Chain Token',
    symbol: 'MCT',
    image: 'ipfs://...',
    description: 'A token deployed across multiple chains',
    mev: 8, // MEV protection enabled
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on Base (Primary Chain)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📦 Deploying on Base...');
  const baseDeployer = createBaseDeployer();
  const baseResult = await baseDeployer.deploy(tokenConfig);
  console.log(`   ${baseResult.success ? `✅ ${baseResult.tokenAddress}` : `❌ ${baseResult.error}`}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on Ethereum
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📦 Deploying on Ethereum...');
  const ethDeployer = createEthDeployer();
  const ethResult = await ethDeployer.deploy(tokenConfig);
  console.log(`   ${ethResult.success ? `✅ ${ethResult.tokenAddress}` : `❌ ${ethResult.error}`}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on Arbitrum
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📦 Deploying on Arbitrum...');
  const arbDeployer = createArbDeployer();
  const arbResult = await arbDeployer.deploy(tokenConfig);
  console.log(`   ${arbResult.success ? `✅ ${arbResult.tokenAddress}` : `❌ ${arbResult.error}`}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on Unichain
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📦 Deploying on Unichain...');
  const unichainDeployer = createUnichainDeployer();
  const unichainResult = await unichainDeployer.deploy(tokenConfig);
  console.log(`   ${unichainResult.success ? `✅ ${unichainResult.tokenAddress}` : `❌ ${unichainResult.error}`}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Deploy on Monad
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📦 Deploying on Monad...');
  const monadDeployer = createMonadDeployer();
  const monadResult = await monadDeployer.deploy(tokenConfig);
  console.log(`   ${monadResult.success ? `✅ ${monadResult.tokenAddress}` : `❌ ${monadResult.error}`}\n`);

  console.log('✅ Multi-chain deployment complete!');
}

main().catch(console.error);
