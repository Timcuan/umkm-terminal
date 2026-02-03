# Architectural Decision Records - Codebase Refactoring

This document records the major architectural decisions made during the comprehensive refactoring of the UMKM Terminal codebase.

## ADR-001: Centralized Validation Service

**Status:** Accepted  
**Date:** 2024  
**Context:** Private key validation logic was duplicated across deployer, batch, and wallet modules, leading to inconsistencies and maintenance overhead.

**Decision:** Extract all validation logic into a centralized `IValidationService` interface with a default `ValidationService` implementation.

**Consequences:**
- ✅ Eliminates code duplication
- ✅ Ensures consistent validation across modules
- ✅ Enables dependency injection for testing
- ✅ Single source of truth for validation rules
- ⚠️ Requires updating all modules to use the service

**Implementation:**
- Created `src/services/validation-service.ts`
- Defined `IValidationService` interface
- Implemented `ValidationService` class
- Added helper functions `validatePrivateKeyOrThrow` and `validateAddressOrThrow`

## ADR-002: Reward Recipient Service

**Status:** Accepted  
**Date:** 2024  
**Context:** Reward recipient normalization logic was duplicated between deployer and batch modules with slight variations.

**Decision:** Create a dedicated `RewardRecipientService` to handle all reward recipient processing logic.

**Consequences:**
- ✅ Eliminates duplication between modules
- ✅ Provides consistent percentage distribution logic
- ✅ Handles edge cases uniformly (missing allocations, rounding)
- ✅ Enables format conversion between deployer and batch formats
- ⚠️ Requires coordination between teams using different formats

**Implementation:**
- Created `src/services/reward-recipient-service.ts`
- Implemented normalization, validation, and format conversion methods
- Added merge functionality for template defaults and overrides

## ADR-003: Dependency Injection Pattern

**Status:** Accepted  
**Date:** 2024  
**Context:** Tight coupling between modules made testing difficult and reduced flexibility for different deployment environments.

**Decision:** Introduce dependency injection using interface-based design for core services.

**Consequences:**
- ✅ Enables easy mocking for unit tests
- ✅ Reduces coupling between modules
- ✅ Allows swapping implementations (e.g., different encryption services)
- ✅ Improves testability and maintainability
- ⚠️ Increases initial complexity
- ⚠️ Requires careful interface design

**Implementation:**
- Created interfaces: `IValidationService`, `IEncryptionService`, `IDeploymentService`, `IDeployerFactory`
- Updated constructors to accept injected dependencies
- Maintained backward compatibility with factory functions

## ADR-004: Standardized Error Handling

**Status:** Accepted  
**Date:** 2024  
**Context:** Inconsistent error handling across modules made debugging difficult and provided poor user experience.

**Decision:** Implement standardized error types with context support and Result types for sync operations.

**Consequences:**
- ✅ Consistent error structure across all modules
- ✅ Rich context information for debugging
- ✅ Type-safe error handling with Result types
- ✅ Better user experience with meaningful error messages
- ⚠️ Requires updating all error handling code
- ⚠️ Learning curve for Result type pattern

**Implementation:**
- Created `ClankerError` base class with context support
- Implemented specific error types: `ValidationError`, `DeploymentError`, `WalletError`
- Added `Result<T, E>` type for sync operations
- Updated all modules to use typed errors

## ADR-005: Module Reorganization

**Status:** Accepted  
**Date:** 2024  
**Context:** Large monolithic files made navigation difficult and violated single responsibility principle.

**Decision:** Reorganize modules into focused, single-responsibility files with clear separation of concerns.

**Consequences:**
- ✅ Improved code organization and navigation
- ✅ Better separation of concerns
- ✅ Easier to locate and modify specific functionality
- ✅ Reduced file sizes and complexity
- ⚠️ More files to manage
- ⚠️ Potential import path changes

**Implementation:**
- Batch module: `template-service.ts`, `batch-deployer.ts`, `farcaster-integration.ts`
- Wallet module: `store.ts`, `encryption-service.ts`, `backup-service.ts`, `migration-service.ts`, `env-sync-service.ts`
- Deployer module: `deployer.ts`, `simple-deployer.ts`, `deployment-service.ts`, `factory.ts`

## ADR-006: Runtime Type Validation

**Status:** Accepted  
**Date:** 2024  
**Context:** TypeScript types provided compile-time safety but no runtime validation, leading to potential runtime errors.

**Decision:** Implement comprehensive runtime validation that matches TypeScript type definitions exactly.

**Consequences:**
- ✅ Runtime safety matches compile-time safety
- ✅ Better error messages for invalid data
- ✅ Consistent validation behavior
- ✅ Property-based testing validates type consistency
- ⚠️ Additional runtime overhead
- ⚠️ Maintenance burden to keep types and validation in sync

**Implementation:**
- Created `src/types/runtime-validation.ts`
- Implemented validators for all public API types
- Added property-based tests to ensure consistency
- Used generic `RuntimeValidationResult<T>` type

## ADR-007: Performance Optimizations

**Status:** Accepted  
**Date:** 2024  
**Context:** Batch operations were inefficient due to sequential nonce fetching and suboptimal rate limiting.

**Decision:** Implement batch nonce fetching, O(1) rate limiting, and streaming for large deployments.

**Consequences:**
- ✅ Significantly improved batch deployment performance
- ✅ Reduced network calls and latency
- ✅ Better memory efficiency for large batches
- ✅ Configurable concurrency limits
- ⚠️ Increased complexity in nonce management
- ⚠️ More sophisticated error handling required

**Implementation:**
- Added `syncNonces` method to `NonceManager`
- Replaced sliding window with token bucket rate limiting
- Implemented generator-based streaming deployment
- Added concurrency control and resource cleanup

## ADR-008: Property-Based Testing

**Status:** Accepted  
**Date:** 2024  
**Context:** Traditional unit tests couldn't cover all edge cases and input combinations effectively.

**Decision:** Implement property-based testing using fast-check to validate universal correctness properties.

**Consequences:**
- ✅ Better test coverage across input space
- ✅ Finds edge cases that unit tests miss
- ✅ Validates universal properties hold for all inputs
- ✅ Complements unit tests effectively
- ⚠️ Learning curve for property-based testing
- ⚠️ Longer test execution times

**Implementation:**
- Added fast-check as testing framework
- Created properties for validation consistency, error handling, and type safety
- Implemented 17 correctness properties across all modules
- Tagged tests with feature and property references

## ADR-009: Backward Compatibility

**Status:** Accepted  
**Date:** 2024  
**Context:** Existing users depend on current public APIs and breaking changes would cause disruption.

**Decision:** Maintain 100% backward compatibility with existing public APIs throughout the refactoring.

**Consequences:**
- ✅ No breaking changes for existing users
- ✅ Smooth migration path
- ✅ Reduced risk of introducing bugs
- ✅ Maintains user trust and adoption
- ⚠️ Constraints on internal refactoring
- ⚠️ May require maintaining legacy patterns temporarily

**Implementation:**
- Preserved all existing public method signatures
- Used factory functions to maintain existing instantiation patterns
- Added compatibility tests to validate API preservation
- Documented migration paths for internal usage

## Decision Matrix

| Decision | Complexity | Maintenance | Performance | Testability | User Impact |
|----------|------------|-------------|-------------|-------------|-------------|
| Centralized Validation | Medium | Low | Neutral | High | Positive |
| Reward Recipient Service | Low | Low | Neutral | High | Positive |
| Dependency Injection | High | Medium | Neutral | Very High | Neutral |
| Standardized Errors | Medium | Low | Neutral | High | Very Positive |
| Module Reorganization | Low | Low | Neutral | High | Neutral |
| Runtime Validation | Medium | Medium | Negative | High | Positive |
| Performance Optimizations | High | Medium | Very Positive | Medium | Very Positive |
| Property-Based Testing | Medium | Low | Negative | Very High | Positive |
| Backward Compatibility | Medium | High | Neutral | Medium | Very Positive |

## Future Considerations

1. **Gradual Migration**: Consider providing migration utilities for users who want to adopt new patterns
2. **Performance Monitoring**: Implement metrics to track the impact of runtime validation overhead
3. **Documentation**: Maintain comprehensive examples and migration guides
4. **Testing**: Continue expanding property-based test coverage
5. **Monitoring**: Add observability for error patterns and performance metrics