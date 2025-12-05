/**
 * Contract ABIs
 *
 * Note: These are minimal ABIs containing only the functions we need.
 * Full ABIs can be added as needed.
 */

// ============================================================================
// Clanker Factory ABI (V4)
// ============================================================================

export const ClankerFactoryAbi = [
  {
    type: 'function',
    name: 'deployToken',
    inputs: [
      {
        name: 'deploymentConfig',
        type: 'tuple',
        internalType: 'struct IClanker.DeploymentConfig',
        components: [
          {
            name: 'tokenConfig',
            type: 'tuple',
            internalType: 'struct IClanker.TokenConfig',
            components: [
              { name: 'tokenAdmin', type: 'address', internalType: 'address' },
              { name: 'name', type: 'string', internalType: 'string' },
              { name: 'symbol', type: 'string', internalType: 'string' },
              { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
              { name: 'image', type: 'string', internalType: 'string' },
              { name: 'metadata', type: 'string', internalType: 'string' },
              { name: 'context', type: 'string', internalType: 'string' },
              { name: 'originatingChainId', type: 'uint256', internalType: 'uint256' },
            ],
          },
          {
            name: 'poolConfig',
            type: 'tuple',
            internalType: 'struct IClanker.PoolConfig',
            components: [
              { name: 'hook', type: 'address', internalType: 'address' },
              { name: 'pairedToken', type: 'address', internalType: 'address' },
              { name: 'tickIfToken0IsClanker', type: 'int24', internalType: 'int24' },
              { name: 'tickSpacing', type: 'int24', internalType: 'int24' },
              { name: 'poolData', type: 'bytes', internalType: 'bytes' },
            ],
          },
          {
            name: 'lockerConfig',
            type: 'tuple',
            internalType: 'struct IClanker.LockerConfig',
            components: [
              { name: 'locker', type: 'address', internalType: 'address' },
              { name: 'rewardAdmins', type: 'address[]', internalType: 'address[]' },
              { name: 'rewardRecipients', type: 'address[]', internalType: 'address[]' },
              { name: 'rewardBps', type: 'uint16[]', internalType: 'uint16[]' },
              { name: 'tickLower', type: 'int24[]', internalType: 'int24[]' },
              { name: 'tickUpper', type: 'int24[]', internalType: 'int24[]' },
              { name: 'positionBps', type: 'uint16[]', internalType: 'uint16[]' },
              { name: 'lockerData', type: 'bytes', internalType: 'bytes' },
            ],
          },
          {
            name: 'mevModuleConfig',
            type: 'tuple',
            internalType: 'struct IClanker.MevModuleConfig',
            components: [
              { name: 'mevModule', type: 'address', internalType: 'address' },
              { name: 'mevModuleData', type: 'bytes', internalType: 'bytes' },
            ],
          },
          {
            name: 'extensionConfigs',
            type: 'tuple[]',
            internalType: 'struct IClanker.ExtensionConfig[]',
            components: [
              { name: 'extension', type: 'address', internalType: 'address' },
              { name: 'msgValue', type: 'uint256', internalType: 'uint256' },
              { name: 'extensionBps', type: 'uint16', internalType: 'uint16' },
              { name: 'extensionData', type: 'bytes', internalType: 'bytes' },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: 'tokenAddress', type: 'address', internalType: 'address' }],
    stateMutability: 'payable',
  },
  {
    type: 'event',
    name: 'TokenCreated',
    anonymous: false,
    inputs: [
      { indexed: false, name: 'msgSender', type: 'address', internalType: 'address' },
      { indexed: true, name: 'tokenAddress', type: 'address', internalType: 'address' },
      { indexed: true, name: 'tokenAdmin', type: 'address', internalType: 'address' },
      { indexed: false, name: 'tokenImage', type: 'string', internalType: 'string' },
      { indexed: false, name: 'tokenName', type: 'string', internalType: 'string' },
      { indexed: false, name: 'tokenSymbol', type: 'string', internalType: 'string' },
      { indexed: false, name: 'tokenMetadata', type: 'string', internalType: 'string' },
      { indexed: false, name: 'tokenContext', type: 'string', internalType: 'string' },
      { indexed: false, name: 'startingTick', type: 'int24', internalType: 'int24' },
      { indexed: false, name: 'poolHook', type: 'address', internalType: 'address' },
      { indexed: false, name: 'poolId', type: 'bytes32', internalType: 'PoolId' },
      { indexed: false, name: 'pairedToken', type: 'address', internalType: 'address' },
      { indexed: false, name: 'locker', type: 'address', internalType: 'address' },
      { indexed: false, name: 'mevModule', type: 'address', internalType: 'address' },
      { indexed: false, name: 'extensionsSupply', type: 'uint256', internalType: 'uint256' },
      { indexed: false, name: 'extensions', type: 'address[]', internalType: 'address[]' },
    ],
  },
] as const;

// ============================================================================
// Fee Locker ABI
// ============================================================================

export const FeeLockerAbi = [
  {
    type: 'function',
    name: 'claim',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'token', type: 'address' },
    ],
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'availableFees',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'token', type: 'address' },
    ],
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// ============================================================================
// Locker ABI
// ============================================================================

export const LockerAbi = [
  {
    type: 'function',
    name: 'getRewards',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'recipient', type: 'address' },
          { name: 'admin', type: 'address' },
          { name: 'bps', type: 'uint16' },
          { name: 'token', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'updateRewardRecipient',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'rewardIndex', type: 'uint256' },
      { name: 'newRecipient', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateRewardAdmin',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'rewardIndex', type: 'uint256' },
      { name: 'newAdmin', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// ============================================================================
// Vault ABI
// ============================================================================

export const VaultAbi = [
  {
    type: 'function',
    name: 'claim',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'amountAvailableToClaim',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// ============================================================================
// Token ABI
// ============================================================================

export const TokenAbi = [
  {
    type: 'function',
    name: 'updateImage',
    inputs: [{ name: 'newImage', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateMetadata',
    inputs: [{ name: 'metadata', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
