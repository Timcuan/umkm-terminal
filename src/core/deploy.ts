/**
 * Token Deployment Logic
 * Converts user-friendly config to contract call format
 */

import {
  type Account,
  type Address,
  type Chain,
  encodeAbiParameters,
  type PublicClient,
  parseEventLogs,
  type Transport,
  type WalletClient,
  zeroAddress,
} from 'viem';
import { getWethAddress } from '../chains/index.js';
import { POOL_POSITIONS } from '../constants/index.js';
import { ClankerFactoryAbi } from '../contracts/abis/index.js';
import { type ChainDeployment, getDeployment } from '../contracts/addresses.js';
import type { ClankerTokenV4, DeployResult } from '../types/index.js';

// ============================================================================
// Types
// ============================================================================

interface DeploymentConfig {
  address: Address;
  args: DeploymentArgs;
  value: bigint;
}

interface DeploymentArgs {
  tokenConfig: {
    tokenAdmin: Address;
    name: string;
    symbol: string;
    salt: `0x${string}`;
    image: string;
    metadata: string;
    context: string;
    originatingChainId: bigint;
  };
  poolConfig: {
    hook: Address;
    pairedToken: Address;
    tickIfToken0IsClanker: number;
    tickSpacing: number;
    poolData: `0x${string}`;
  };
  lockerConfig: {
    locker: Address;
    rewardAdmins: Address[];
    rewardRecipients: Address[];
    rewardBps: number[];
    tickLower: number[];
    tickUpper: number[];
    positionBps: number[];
    lockerData: `0x${string}`; // Must be last per ABI order
  };
  mevModuleConfig: {
    mevModule: Address;
    mevModuleData: `0x${string}`;
  };
  extensionConfigs: Array<{
    extension: Address;
    msgValue: bigint;
    extensionBps: number;
    extensionData: `0x${string}`;
  }>;
}

// Fee preference mapping
const FEE_PREFERENCE = {
  Both: 0,
  Paired: 1,
  Clanker: 2,
} as const;

// ============================================================================
// ABI Encoders
// ============================================================================

const LockerInstantiationAbi = [
  {
    type: 'tuple',
    components: [{ name: 'feePreference', type: 'uint8[]' }],
  },
] as const;

const StaticFeeHookAbi = [
  { name: 'clankerFee', type: 'uint24' },
  { name: 'pairedFee', type: 'uint24' },
] as const;

const DynamicFeeHookAbi = [
  { name: 'baseFee', type: 'uint24' },
  { name: 'maxLpFee', type: 'uint24' },
  { name: 'referenceTickFilterPeriod', type: 'uint256' },
  { name: 'resetPeriod', type: 'uint256' },
  { name: 'resetTickFilter', type: 'uint24' },
  { name: 'feeControlNumerator', type: 'uint256' },
  { name: 'decayFilterBps', type: 'uint24' },
] as const;

const VaultInstantiationAbi = [
  { name: 'recipient', type: 'address' },
  { name: 'lockupDuration', type: 'uint256' },
  { name: 'vestingDuration', type: 'uint256' },
] as const;

const MevBlockDelayAbi = [{ name: 'blockDelay', type: 'uint256' }] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate random salt for CREATE2
 * For single deploy, ensures salt does NOT end with 'b07' (Clanker standard)
 * to avoid vanity address patterns and maintain standard Clanker behavior
 */
function generateSalt(): `0x${string}` {
  let salt: `0x${string}`;
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loop
  
  do {
    const bytes = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 32; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    
    salt = `0x${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}` as `0x${string}`;
    
    attempts++;
  } while (salt.toLowerCase().endsWith('b07') && attempts < maxAttempts);
  
  // If we couldn't avoid 'b07' after max attempts, modify the last byte
  if (salt.toLowerCase().endsWith('b07')) {
    const bytes = salt.slice(2);
    const modifiedBytes = bytes.slice(0, -2) + 'a06'; // Change 'b07' to 'a06'
    salt = `0x${modifiedBytes}` as `0x${string}`;
  }
  
  return salt;
}

/**
 * Encode fee configuration
 * Note: Some chains (e.g., Ethereum, Monad) don't have Dynamic Fee Hook
 */
function encodeFeeConfig(
  fees: ClankerTokenV4['fees'],
  deployment: ChainDeployment
): { hook: Address; poolData: `0x${string}` } {
  // Check if dynamic fee hook is available
  const dynamicHookAvailable = deployment.contracts.feeDynamicHook !== zeroAddress;

  // Use static fees if: no fees config, static type, or dynamic requested but not available
  const useStatic =
    !fees || fees.type === 'static' || (fees.type === 'dynamic' && !dynamicHookAvailable);

  if (useStatic) {
    // Get fees from static config or use defaults
    // Fee values are in basis points (100 = 1%, 500 = 5%)
    // Contract expects uniBps (10000 = 1%), so multiply by 100
    let clankerFeeBps = 100; // 1% default
    let pairedFeeBps = 100;

    if (fees?.type === 'static') {
      clankerFeeBps = fees.clankerFee ?? 100;
      pairedFeeBps = fees.pairedFee ?? 100;
    }

    return {
      hook: deployment.contracts.feeStaticHook,
      poolData: encodeAbiParameters(StaticFeeHookAbi, [
        clankerFeeBps * 100, // bps to uniBps (100 bps = 10000 uniBps = 1%)
        pairedFeeBps * 100,
      ]),
    };
  }

  // Dynamic fees (fees.type === 'dynamic' is guaranteed here)
  // baseFee/maxFee are in bps, need to convert to uniBps
  const dynamicFees = fees as {
    type: 'dynamic';
    baseFee?: number;
    maxFee?: number;
    referenceTickFilterPeriod?: number;
    resetPeriod?: number;
    resetTickFilter?: number;
    feeControlNumerator?: number;
    decayFilterBps?: number;
  };

  return {
    hook: deployment.contracts.feeDynamicHook,
    poolData: encodeAbiParameters(DynamicFeeHookAbi, [
      (dynamicFees.baseFee ?? 100) * 100, // bps to uniBps
      (dynamicFees.maxFee ?? 500) * 100, // bps to uniBps
      BigInt(dynamicFees.referenceTickFilterPeriod ?? 30),
      BigInt(dynamicFees.resetPeriod ?? 120),
      dynamicFees.resetTickFilter ?? 200,
      BigInt(dynamicFees.feeControlNumerator ?? 500000000),
      dynamicFees.decayFilterBps ?? 7500,
    ]),
  };
}

/**
 * Encode MEV module configuration
 * Note: Some chains (e.g., Monad) don't have MEV module deployed
 */
function encodeMevConfig(
  mev: ClankerTokenV4['mev'],
  deployment: ChainDeployment
): { mevModule: Address; mevModuleData: `0x${string}` } {
  // Check if MEV module is available on this chain
  const mevModuleAvailable = deployment.contracts.mevModule !== zeroAddress;

  if (!mev || mev.type === 'none' || !mevModuleAvailable) {
    return {
      mevModule: zeroAddress,
      mevModuleData: '0x',
    };
  }

  // Block delay (default)
  const blockDelay = mev.blockDelay ?? 8;
  return {
    mevModule: deployment.contracts.mevModule,
    mevModuleData: encodeAbiParameters(MevBlockDelayAbi, [BigInt(blockDelay)]),
  };
}

// ============================================================================
// Main Deployment Function
// ============================================================================

/**
 * Build deployment configuration from token config
 */
export function buildDeploymentConfig(
  token: ClankerTokenV4,
  deployment: ChainDeployment
): DeploymentConfig {
  const chainId = token.chainId ?? 8453;
  const wethAddress = getWethAddress(chainId);

  if (!wethAddress) {
    throw new Error(`WETH address not found for chain ${chainId}`);
  }

  // Pool positions
  const positions = token.poolPositions ?? POOL_POSITIONS.Standard;

  // Rewards config - default to 100% to tokenAdmin
  const rewards = token.rewards ?? {
    recipients: [
      {
        admin: token.tokenAdmin,
        recipient: token.tokenAdmin,
        bps: 10000,
        feePreference: 'Both' as const,
      },
    ],
  };

  // Encode locker data
  const lockerData = encodeAbiParameters(LockerInstantiationAbi, [
    {
      feePreference: rewards.recipients.map((r) => FEE_PREFERENCE[r.feePreference ?? 'Both']),
    },
  ]);

  // Encode fee config
  const { hook, poolData } = encodeFeeConfig(token.fees, deployment);

  // Encode MEV config
  const { mevModule, mevModuleData } = encodeMevConfig(token.mev, deployment);

  // Build extension configs
  const extensionConfigs: DeploymentArgs['extensionConfigs'] = [];

  // Vault extension
  if (token.vault && token.vault.percentage > 0) {
    extensionConfigs.push({
      extension: deployment.contracts.vault,
      msgValue: 0n,
      extensionBps: token.vault.percentage * 100,
      extensionData: encodeAbiParameters(VaultInstantiationAbi, [
        token.vault.recipient ?? token.tokenAdmin,
        BigInt(token.vault.lockupDuration),
        BigInt(token.vault.vestingDuration ?? 0),
      ]),
    });
  }

  // Build final args
  const args: DeploymentArgs = {
    tokenConfig: {
      tokenAdmin: token.tokenAdmin,
      name: token.name,
      symbol: token.symbol,
      // For single deploy: use provided salt or generate non-vanity salt
      // Ensures compliance with Clanker standard (B07) by avoiding vanity patterns
      salt: token.salt ?? generateSalt(),
      image: token.image ?? '',
      metadata: token.metadata ? JSON.stringify(token.metadata) : '',
      context: JSON.stringify(token.context ?? { interface: 'SDK' }),
      originatingChainId: BigInt(chainId),
    },
    poolConfig: {
      hook,
      pairedToken: token.pairedToken ?? wethAddress,
      tickIfToken0IsClanker: -230400,
      tickSpacing: 200,
      poolData,
    },
    lockerConfig: {
      locker: deployment.contracts.locker,
      rewardAdmins: rewards.recipients.map((r) => r.admin),
      rewardRecipients: rewards.recipients.map((r) => r.recipient),
      rewardBps: rewards.recipients.map((r) => r.bps),
      tickLower: positions.map((p) => p.tickLower),
      tickUpper: positions.map((p) => p.tickUpper),
      positionBps: positions.map((p) => p.bps),
      lockerData, // Must be last per ABI order
    },
    mevModuleConfig: {
      mevModule,
      mevModuleData,
    },
    extensionConfigs,
  };

  return {
    address: deployment.contracts.factory,
    args,
    value: 0n,
  };
}

/**
 * Deploy token to blockchain
 */
export async function deployToken(
  token: ClankerTokenV4,
  wallet: WalletClient<Transport, Chain, Account>,
  publicClient: PublicClient
): Promise<DeployResult> {
  const chainId = token.chainId ?? 8453;

  // Validate chain match
  if (publicClient.chain?.id !== chainId) {
    throw new Error(
      `Chain mismatch: token chainId ${chainId} != publicClient chain ${publicClient.chain?.id}`
    );
  }

  if (wallet.chain?.id !== chainId) {
    throw new Error(`Chain mismatch: token chainId ${chainId} != wallet chain ${wallet.chain?.id}`);
  }

  // Get deployment config
  const deployment = getDeployment(chainId);
  if (!deployment) {
    throw new Error(`Clanker not deployed on chain ${chainId}`);
  }

  // Build deployment config
  const config = buildDeploymentConfig(token, deployment);

  // Simulate first - use proper typed args
  const { request } = await publicClient.simulateContract({
    address: config.address,
    abi: ClankerFactoryAbi,
    functionName: 'deployToken',
    args: [config.args],
    value: config.value,
    account: wallet.account,
  });

  // Send transaction
  const txHash = await wallet.writeContract(request);

  return {
    txHash,
    chainId,
    async waitForTransaction() {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Parse TokenCreated event
      const logs = parseEventLogs({
        abi: ClankerFactoryAbi,
        eventName: 'TokenCreated',
        logs: receipt.logs,
      });

      if (logs.length > 0 && logs[0].args) {
        const args = logs[0].args as { tokenAddress?: Address };
        if (args.tokenAddress) {
          return { address: args.tokenAddress };
        }
      }

      throw new Error('Could not parse TokenCreated event');
    },
  };
}
