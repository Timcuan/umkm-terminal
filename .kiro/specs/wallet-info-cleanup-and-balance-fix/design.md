# Design Document

## Overview

This design addresses the cleanup and optimization of the Wallet Info feature and environment configuration in the UMKM Terminal CLI. The solution focuses on three main areas:

1. **Wallet Info Simplification**: Remove the unnecessary "Wallet Management" menu option from the Wallet Info screen, keeping only balance display and a back option
2. **Environment Configuration Cleanup**: Remove redundant, deprecated, and unused parameters from .env and .env.example files
3. **Smart Address Defaults**: Automatically derive TOKEN_ADMIN and REWARD_RECIPIENT from the deployer's PRIVATE_KEY when not explicitly set

The design prioritizes simplicity, maintainability, and user experience by reducing manual configuration and eliminating unnecessary UI elements.

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │  Main Menu     │────────▶│  Wallet Info     │           │
│  │  (index.ts)    │         │  (showWalletInfo)│           │
│  └────────────────┘         └──────────────────┘           │
│                                      │                       │
│                                      ▼                       │
│                             ┌──────────────────┐            │
│                             │  Balance Display │            │
│                             │  (no sub-menu)   │            │
│                             └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Configuration Layer                        │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │  .env Parser   │────────▶│  Config Defaults │           │
│  │  (getEnvConfig)│         │  (Smart Defaults)│           │
│  └────────────────┘         └──────────────────┘           │
│                                      │                       │
│                                      ▼                       │
│                             ┌──────────────────┐            │
│                             │ Address Resolver │            │
│                             │ (derive from PK) │            │
│                             └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Blockchain Layer                          │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │ Balance Checker│────────▶│  RPC Provider    │           │
│  │ (getNativeBalance)       │  (Chain Client)  │           │
│  └────────────────┘         └──────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **No Sub-Menu in Wallet Info**: The Wallet Info screen will be a simple display-only view with no interactive menu options except "Press Enter to continue"
2. **Smart Address Defaults**: Use the deployer's address (derived from PRIVATE_KEY) as the default for TOKEN_ADMIN and REWARD_RECIPIENT
3. **Configuration Consolidation**: Remove duplicate and deprecated parameters, keeping only actively used configuration
4. **Backward Compatibility**: Map old parameter names to new ones to avoid breaking existing configurations

## Components and Interfaces

### 1. Wallet Info Display Component

**Location**: `src/cli/index.ts` - `showWalletInfo()` function

**Current Behavior**:
- Displays wallet address, chain, balance, deployment estimates
- Shows explorer link
- Waits for user to press Enter
- Returns to main menu

**Required Changes**:
- Verify no sub-menu is present (already correct based on code review)
- Ensure clean return to main menu
- No additional menu options

**Interface**:
```typescript
async function showWalletInfo(): Promise<void> {
  // Display wallet information
  // Show balance and deployment estimates
  // Wait for Enter key
  // Return to main menu (no sub-menu)
}
```

### 2. Configuration Parser Component

**Location**: `src/cli/index.ts` - `getEnvConfig()` function

**Current Behavior**:
- Reads all environment variables
- Returns configuration object
- Uses hardcoded defaults for missing values

**Required Changes**:
- Add smart address resolution
- Remove references to deprecated parameters
- Consolidate duplicate parameters
- Add validation for required fields

**Interface**:
```typescript
interface EnvConfig {
  // Core wallet
  privateKey: string;
  chainId: number;
  
  // Token defaults
  tokenName: string;
  tokenSymbol: string;
  tokenImage: string;
  tokenDescription: string;
  
  // Smart address defaults (derived from privateKey if not set)
  tokenAdmin: string;        // Defaults to deployer address
  rewardRecipient: string;   // Defaults to deployer address
  rewardToken: 'Both' | 'Paired' | 'Clanker';
  
  // Fee configuration
  feeType: 'dynamic' | 'flat' | 'custom';
  feePercentage: number;
  
  // MEV protection
  mevBlockDelay: number;
  
  // Social links
  tokenWebsite: string;
  tokenTwitter: string;
  tokenFarcaster: string;
  
  // Vanity
  vanitySuffix: string;
  
  // Batch settings
  batchCount: number;
  batchDelay: number;
  batchRetries: number;
  
  // Vault settings
  vaultEnabled: boolean;
  vaultPercentage: number;
  vaultLockupDays: number;
  vaultVestingDays: number;
  
  // Verification
  interfaceName: string;
  platformName: string;
}

function getEnvConfig(): EnvConfig {
  // Parse environment variables
  // Apply smart defaults
  // Resolve addresses from private key
  // Return configuration
}
```

### 3. Address Resolver Component

**Location**: New utility function in `src/cli/index.ts`

**Purpose**: Derive deployer address from private key and use as default for admin/recipient addresses

**Interface**:
```typescript
function resolveAddressDefaults(config: Partial<EnvConfig>): EnvConfig {
  // Derive deployer address from PRIVATE_KEY
  const deployerAddress = privateKeyToAccount(config.privateKey).address;
  
  // Use deployer address as default for TOKEN_ADMIN
  const tokenAdmin = config.tokenAdmin || deployerAddress;
  
  // Use deployer address as default for REWARD_RECIPIENT
  const rewardRecipient = config.rewardRecipient || deployerAddress;
  
  return {
    ...config,
    tokenAdmin,
    rewardRecipient,
  };
}
```

### 4. Configuration Validator Component

**Location**: New utility function in `src/cli/index.ts`

**Purpose**: Validate required configuration parameters and provide clear error messages

**Interface**:
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateEnvConfig(config: EnvConfig): ValidationResult {
  const errors: string[] = [];
  
  // Validate PRIVATE_KEY
  if (!config.privateKey || !config.privateKey.startsWith('0x')) {
    errors.push('PRIVATE_KEY is required and must start with 0x');
  }
  
  // Validate CHAIN_ID
  const validChainIds = [1, 8453, 42161, 130, 10143];
  if (!validChainIds.includes(config.chainId)) {
    errors.push(`CHAIN_ID must be one of: ${validChainIds.join(', ')}`);
  }
  
  // Validate fee configuration
  if (config.feeType === 'dynamic' && (config.feePercentage < 1 || config.feePercentage > 5)) {
    errors.push('Dynamic fees must be between 1-5%');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## Data Models

### Environment Configuration Model

```typescript
// Core configuration structure
interface EnvConfig {
  // Wallet (required)
  privateKey: string;
  chainId: number;
  
  // Token defaults (optional, used as templates)
  tokenName: string;
  tokenSymbol: string;
  tokenImage: string;
  tokenDescription: string;
  
  // Addresses (optional, defaults to deployer)
  tokenAdmin: string;
  rewardRecipient: string;
  rewardToken: 'Both' | 'Paired' | 'Clanker';
  
  // Fees (optional, defaults to dynamic)
  feeType: 'dynamic' | 'flat' | 'custom';
  feePercentage: number;
  
  // MEV (optional, defaults to 8)
  mevBlockDelay: number;
  
  // Social (optional)
  tokenWebsite: string;
  tokenTwitter: string;
  tokenFarcaster: string;
  
  // Vanity (optional, defaults to off)
  vanitySuffix: string;
  
  // Batch (optional)
  batchCount: number;
  batchDelay: number;
  batchRetries: number;
  
  // Vault (optional)
  vaultEnabled: boolean;
  vaultPercentage: number;
  vaultLockupDays: number;
  vaultVestingDays: number;
  
  // Verification (optional)
  interfaceName: string;
  platformName: string;
}
```

### Configuration Cleanup Plan

**Parameters to Remove** (unused/deprecated):
1. `OPENAI_API_KEY` - Not used in core deployment functionality
2. `DEPLOYER_PRIVATE_KEYS` - Only for multi-wallet batch mode (keep but document clearly)
3. `WALLET_PASSWORD` - Only for encrypted wallet store (keep but document clearly)
4. `CLANKER_FEE` - Deprecated, replaced by FEE_TYPE/FEE_PERCENTAGE
5. `PAIRED_FEE` - Deprecated, replaced by FEE_TYPE/FEE_PERCENTAGE
6. All `SPOOFING_*` parameters - Move to separate advanced configuration section or remove if not actively used

**Parameters to Consolidate**:
1. `FAST_MODE` + `AUTO_CONFIRM_TRANSACTIONS` + `EXPERT_MODE` → Keep only `UX_MODE` (normal/fast/ultra/expert)
2. `DYNAMIC_BASE_FEE` + `DYNAMIC_MAX_FEE` + `VOLATILITY_THRESHOLD` + `MINIMUM_FEE_AMOUNT` → Simplify to just `FEE_TYPE` and `FEE_PERCENTAGE`
3. `APPLY_FEE_TO_TOKEN` + `APPLY_FEE_TO_PAIRED` → Remove (always apply fees)

**Parameters to Keep** (actively used):
1. `PRIVATE_KEY` - Required
2. `CHAIN_ID` - Required
3. `TOKEN_NAME`, `TOKEN_SYMBOL`, `TOKEN_IMAGE`, `TOKEN_DESCRIPTION` - Template defaults
4. `TOKEN_ADMIN`, `REWARD_RECIPIENT`, `REWARD_TOKEN` - With smart defaults
5. `FEE_TYPE`, `FEE_PERCENTAGE` - Simplified fee configuration
6. `MEV_BLOCK_DELAY` - MEV protection
7. `TOKEN_WEBSITE`, `TOKEN_TWITTER`, `TOKEN_FARCASTER` - Social links
8. `VANITY_SUFFIX`, `VANITY_MODE` - Vanity address
9. `BATCH_COUNT`, `BATCH_DELAY`, `BATCH_RETRIES` - Batch deployment
10. `VAULT_ENABLED`, `VAULT_PERCENTAGE`, `VAULT_LOCKUP_DAYS`, `VAULT_VESTING_DAYS` - Vault
11. `INTERFACE_NAME`, `PLATFORM_NAME` - Verification
12. `UX_MODE` - User experience mode

## Error Handling

### Configuration Errors

1. **Missing PRIVATE_KEY**:
   - Error: "PRIVATE_KEY is required. Add PRIVATE_KEY=0x... to your .env file"
   - Action: Display error and exit

2. **Invalid CHAIN_ID**:
   - Error: "CHAIN_ID must be one of: 1, 8453, 42161, 130, 10143"
   - Action: Display error and exit

3. **Invalid Fee Configuration**:
   - Error: "Dynamic fees must be between 1-5%"
   - Action: Display error and exit

4. **Deprecated Parameter Warning**:
   - Warning: "CLANKER_FEE is deprecated. Use FEE_TYPE and FEE_PERCENTAGE instead"
   - Action: Log warning and continue with migration

### Balance Checking Errors

1. **RPC Connection Failure**:
   - Error: "Could not fetch balance"
   - Action: Display warning, show 0 balance, allow user to continue

2. **Invalid Address**:
   - Error: "Invalid wallet address derived from PRIVATE_KEY"
   - Action: Display error and exit

## Testing Strategy

The testing strategy focuses on essential functionality without unnecessary overhead. We will use a combination of unit tests for critical logic and manual testing for UI flows.

### Unit Tests (Essential Only)

**Test File**: `tests/unit/wallet-info-config.test.ts`

1. **Address Resolution Tests**:
   - Test that deployer address is correctly derived from PRIVATE_KEY
   - Test that TOKEN_ADMIN defaults to deployer address when not set
   - Test that REWARD_RECIPIENT defaults to deployer address when not set
   - Test that explicit values override defaults

2. **Configuration Validation Tests**:
   - Test that missing PRIVATE_KEY is detected
   - Test that invalid CHAIN_ID is detected
   - Test that invalid fee ranges are detected

3. **Configuration Cleanup Tests**:
   - Test that deprecated parameters are mapped to new ones
   - Test that consolidated parameters work correctly

### Manual Testing (UI Flows)

1. **Wallet Info Display**:
   - Navigate to Wallet Info from main menu
   - Verify balance is displayed correctly
   - Verify no "Wallet Management" sub-menu appears
   - Verify pressing Enter returns to main menu

2. **Smart Address Defaults**:
   - Deploy with empty TOKEN_ADMIN and REWARD_RECIPIENT
   - Verify deployer address is used
   - Deploy with explicit TOKEN_ADMIN
   - Verify explicit value is used

3. **Configuration Migration**:
   - Test with old .env containing deprecated parameters
   - Verify warnings are displayed
   - Verify application continues to work

### Test Execution Time

- Unit tests: < 5 seconds total
- Manual testing: < 2 minutes per scenario
- Total testing time: < 10 minutes

This focused approach ensures quality without wasting time on unnecessary test coverage.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Balance Display Color Coding

*For any* wallet balance and chain configuration, the deployment estimate color SHALL be red when deployments = 0, yellow when deployments < 5, and green when deployments >= 5.

**Validates: Requirements 2.4, 2.5, 2.6**

### Property 2: RPC Endpoint Selection

*For any* supported chain ID, the balance checker SHALL query the RPC endpoint configured for that specific chain.

**Validates: Requirements 2.1**

### Property 3: Deployment Estimate Accuracy

*For any* wallet balance and chain configuration, the deployment estimate SHALL be calculated using the correct gas cost for that chain.

**Validates: Requirements 2.2**

### Property 4: Balance Display Completeness

*For any* wallet balance query, the display SHALL include both the native token amount and USD equivalent value.

**Validates: Requirements 2.3**

### Property 5: Configuration Preservation

*For any* .env file update operation, all required configuration parameters SHALL remain present with their original values.

**Validates: Requirements 3.4**

### Property 6: Smart Address Defaults

*For any* configuration where TOKEN_ADMIN, REWARD_RECIPIENT, or other address fields are empty, the system SHALL derive the deployer address from PRIVATE_KEY and use it as the default value.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 7: Default Value Application

*For any* configuration parameter with a defined default value, when that parameter is not set in .env, the system SHALL use the default value from the template.

**Validates: Requirements 4.6**

### Property 8: Configuration Validation

*For any* application startup, when required configuration parameters are missing or invalid, the system SHALL display appropriate error messages and prevent execution.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 9: Valid Configuration Execution

*For any* application startup with all valid configuration parameters, the system SHALL proceed with normal operation without errors.

**Validates: Requirements 5.5**

### Property 10: Deprecated Parameter Migration

*For any* deprecated configuration parameter present in .env, the system SHALL map it to the new equivalent parameter and log a warning.

**Validates: Requirements 6.1, 6.3**

### Property 11: Parameter Precedence

*For any* configuration where both old and new parameter names are present, the system SHALL use the value from the new parameter name.

**Validates: Requirements 6.2**

### Property 12: Backward Compatibility

*For any* configuration file using old parameter names, the system SHALL continue to function correctly by mapping old names to new names.

**Validates: Requirements 6.4**

### Property 13: Explicit Configuration Override

*For any* configuration parameter with a default value, when an explicit value is provided in .env, the system SHALL use the explicit value instead of the default.

**Validates: Requirements 7.5**

