/**
 * Multi-Chain Deploy Example
 * Deploy same token on multiple chains
 */

import 'dotenv/config';
import { createBaseDeployer, createArbDeployer, createEthDeployer } from '../src/index.js';

async function main() {
  console.log('🌐 Multi-Chain Deploy Example\n');

  const tokenConfig = {
    name: 'Multi Chain Token',
    symbol: 'MCT',
    image: 'ipfs://...',
    vault: {
      percentage: 20,
      lockupDays: 30,
    },
  };

  // Deploy on Base
  console.log('Deploying on Base...');
  const baseDeployer = createBaseDeployer();
  const baseResult = await baseDeployer.deploy(tokenConfig);
  console.log(`Base: ${baseResult.success ? baseResult.tokenAddress : baseResult.error}\n`);

  // Deploy on Arbitrum
  console.log('Deploying on Arbitrum...');
  const arbDeployer = createArbDeployer();
  const arbResult = await arbDeployer.deploy(tokenConfig);
  console.log(`Arbitrum: ${arbResult.success ? arbResult.tokenAddress : arbResult.error}\n`);

  // Deploy on Ethereum
  console.log('Deploying on Ethereum...');
  const ethDeployer = createEthDeployer();
  const ethResult = await ethDeployer.deploy(tokenConfig);
  console.log(`Ethereum: ${ethResult.success ? ethResult.tokenAddress : ethResult.error}\n`);

  console.log('✅ Multi-chain deployment complete!');
}

main().catch(console.error);
