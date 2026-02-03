# Implementation Plan: Wallet Info Cleanup and Balance Fix

## Overview

This implementation plan focuses on three main areas: simplifying the Wallet Info display, implementing smart address defaults, and cleaning up the .env configuration. The tasks are organized to deliver incremental value with early validation through focused testing.

## Tasks

- [x] 1. Verify Wallet Info Display (No Sub-Menu)
  - Review `src/cli/index.ts` `showWalletInfo()` function
  - Confirm no "Wallet Management" menu option exists
  - Verify clean return to main menu after Enter key
  - Test manually: Navigate to Wallet Info and verify behavior
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement Smart Address Defaults
  - [x] 2.1 Create address resolver utility function
    - Add `resolveAddressDefaults()` function in `src/cli/index.ts`
    - Derive deployer address from PRIVATE_KEY using `privateKeyToAccount()`
    - Default TOKEN_ADMIN to deployer address if not set
    - Default REWARD_RECIPIENT to deployer address if not set
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ]* 2.2 Write property test for address resolution
    - **Property 6: Smart Address Defaults**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Test with empty TOKEN_ADMIN and verify deployer address is used
    - Test with empty REWARD_RECIPIENT and verify deployer address is used
    - Test with explicit values and verify they are not overridden
  
  - [x] 2.3 Update getEnvConfig() to use address resolver
    - Call `resolveAddressDefaults()` after parsing environment variables
    - Return configuration with resolved addresses
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ]* 2.4 Write property test for explicit override
    - **Property 13: Explicit Configuration Override**
    - **Validates: Requirements 7.5**
    - Test that explicit TOKEN_ADMIN overrides default
    - Test that explicit REWARD_RECIPIENT overrides default

- [x] 3. Implement Configuration Validation
  - [x] 3.1 Create configuration validator function
    - Add `validateEnvConfig()` function in `src/cli/index.ts`
    - Validate PRIVATE_KEY is present and starts with 0x
    - Validate CHAIN_ID is one of: 1, 8453, 42161, 130, 10143
    - Validate fee ranges based on FEE_TYPE
    - Return validation result with error messages
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 3.2 Write property test for validation
    - **Property 8: Configuration Validation**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - Test with missing PRIVATE_KEY
    - Test with invalid CHAIN_ID
    - Test with invalid fee ranges
    - Verify appropriate error messages
  
  - [x] 3.3 Integrate validation into application startup
    - Call `validateEnvConfig()` at application start
    - Display error messages if validation fails
    - Exit application if validation fails
    - _Requirements: 5.4_
  
  - [ ]* 3.4 Write property test for valid configuration
    - **Property 9: Valid Configuration Execution**
    - **Validates: Requirements 5.5**
    - Test with all valid parameters
    - Verify application proceeds normally

- [x] 4. Clean Up .env Configuration File
  - [x] 4.1 Remove deprecated parameters from .env
    - Remove `OPENAI_API_KEY` (not used in core functionality)
    - Remove `CLANKER_FEE` (deprecated, use FEE_TYPE/FEE_PERCENTAGE)
    - Remove `PAIRED_FEE` (deprecated, use FEE_TYPE/FEE_PERCENTAGE)
    - Remove `APPLY_FEE_TO_TOKEN` (always apply fees)
    - Remove `APPLY_FEE_TO_PAIRED` (always apply fees)
    - Remove or consolidate `SPOOFING_*` parameters
    - _Requirements: 3.1, 3.2_
  
  - [x] 4.2 Consolidate duplicate parameters
    - Keep only `UX_MODE`, remove `FAST_MODE`, `AUTO_CONFIRM_TRANSACTIONS`, `EXPERT_MODE`
    - Simplify fee configuration to `FEE_TYPE` and `FEE_PERCENTAGE`
    - Remove `DYNAMIC_BASE_FEE`, `DYNAMIC_MAX_FEE`, `VOLATILITY_THRESHOLD`, `MINIMUM_FEE_AMOUNT`
    - _Requirements: 3.3_
  
  - [x] 4.3 Add comments for smart defaults
    - Document that TOKEN_ADMIN defaults to deployer address
    - Document that REWARD_RECIPIENT defaults to deployer address
    - Add examples showing optional vs required parameters
    - _Requirements: 7.4_

- [x] 5. Update .env.example Template
  - [x] 5.1 Remove deprecated parameters from template
    - Remove all parameters identified in task 4.1
    - Remove all parameters identified in task 4.2
    - _Requirements: 4.5_
  
  - [x] 5.2 Add smart default documentation
    - Add comments explaining TOKEN_ADMIN defaults
    - Add comments explaining REWARD_RECIPIENT defaults
    - Add comments explaining all default values
    - _Requirements: 4.1, 4.2, 4.6_
  
  - [x] 5.3 Organize parameters logically
    - Group wallet configuration together
    - Group token defaults together
    - Group fee configuration together
    - Group deployment settings together
    - _Requirements: 4.3_
  
  - [ ]* 5.4 Verify template completeness
    - Verify all required parameters are present
    - Verify no deprecated parameters remain
    - Manual review of template structure

- [x] 6. Implement Backward Compatibility
  - [x] 6.1 Create parameter migration mapping
    - Map `CLANKER_FEE` → `FEE_PERCENTAGE`
    - Map `PAIRED_FEE` → `FEE_PERCENTAGE`
    - Map `FAST_MODE` → `UX_MODE=fast`
    - Map `AUTO_CONFIRM_TRANSACTIONS` → `UX_MODE=ultra`
    - Map `EXPERT_MODE` → `UX_MODE=expert`
    - _Requirements: 6.1_
  
  - [ ]* 6.2 Write property test for parameter migration
    - **Property 10: Deprecated Parameter Migration**
    - **Validates: Requirements 6.1, 6.3**
    - Test with old parameter names
    - Verify mapping to new parameters
    - Verify warning messages are logged
  
  - [x] 6.3 Implement parameter precedence logic
    - When both old and new parameters exist, use new parameter
    - Log warning when old parameters are detected
    - _Requirements: 6.2, 6.3_
  
  - [ ]* 6.4 Write property test for parameter precedence
    - **Property 11: Parameter Precedence**
    - **Validates: Requirements 6.2**
    - Test with both old and new parameters
    - Verify new parameter is used
  
  - [ ]* 6.5 Write property test for backward compatibility
    - **Property 12: Backward Compatibility**
    - **Validates: Requirements 6.4**
    - Test with old configuration file
    - Verify application functions correctly

- [ ] 7. Checkpoint - Verify Core Functionality
  - Run all property tests
  - Test Wallet Info display manually
  - Test smart address defaults with empty .env values
  - Test configuration validation with invalid values
  - Ensure all tests pass, ask the user if questions arise

- [ ] 8. Implement Balance Display Properties
  - [ ]* 8.1 Write property test for color coding
    - **Property 1: Balance Display Color Coding**
    - **Validates: Requirements 2.4, 2.5, 2.6**
    - Test with balance = 0 (expect red)
    - Test with balance for 1-4 deployments (expect yellow)
    - Test with balance for 5+ deployments (expect green)
  
  - [ ]* 8.2 Write property test for RPC endpoint selection
    - **Property 2: RPC Endpoint Selection**
    - **Validates: Requirements 2.1**
    - Test with each supported chain ID
    - Verify correct RPC endpoint is used
  
  - [ ]* 8.3 Write property test for deployment estimate accuracy
    - **Property 3: Deployment Estimate Accuracy**
    - **Validates: Requirements 2.2**
    - Test with known gas costs for each chain
    - Verify deployment estimates are accurate
  
  - [ ]* 8.4 Write property test for balance display completeness
    - **Property 4: Balance Display Completeness**
    - **Validates: Requirements 2.3**
    - Test balance display output
    - Verify both native amount and USD equivalent are present

- [ ] 9. Implement Configuration Preservation
  - [ ]* 9.1 Write property test for configuration preservation
    - **Property 5: Configuration Preservation**
    - **Validates: Requirements 3.4**
    - Test .env file update operations
    - Verify all required parameters remain
    - Verify values are not corrupted
  
  - [ ]* 9.2 Write property test for default value application
    - **Property 7: Default Value Application**
    - **Validates: Requirements 4.6**
    - Test with missing optional parameters
    - Verify defaults are applied correctly

- [ ] 10. Final Checkpoint - Complete Testing
  - Run all property tests
  - Run all unit tests
  - Test complete deployment flow with cleaned configuration
  - Test backward compatibility with old .env files
  - Verify Wallet Info display is clean and functional
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Focus on essential functionality without unnecessary overhead
- Total implementation time: ~2-3 hours
- Total testing time: < 10 minutes (if optional tests are skipped)
