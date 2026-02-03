# Requirements Document

## Introduction

The current batch deployment system in the UMKM Terminal codebase suffers from excessive complexity, leading to user confusion and frequent "insufficient funds" errors. This specification defines requirements for a simplified batch deployment system that maintains core functionality while dramatically reducing configuration steps, error scenarios, and user cognitive load.

## Glossary

- **Batch_Deployment_System**: The simplified system for deploying multiple tokens in a single operation
- **Simple_Deployer**: The primary deployment component that handles single-wallet batch operations
- **Balance_Checker**: Component responsible for pre-deployment balance validation
- **Token_Config**: Minimal configuration required per token (name, symbol, supply)
- **Deployment_Session**: A single batch deployment operation from start to completion
- **Error_Handler**: Component that provides clear, actionable error messages
- **Progress_Tracker**: Component that shows real-time deployment progress

## Requirements

### Requirement 1: Simplified Configuration Process

**User Story:** As a user, I want to configure batch deployments in 3-4 simple steps, so that I can quickly deploy multiple tokens without confusion.

#### Acceptance Criteria

1. WHEN a user starts a batch deployment, THE Batch_Deployment_System SHALL present a maximum of 4 configuration steps
2. WHEN configuring tokens, THE System SHALL require only essential fields: token name, symbol, and initial supply
3. WHEN advanced options are needed, THE System SHALL hide them behind an optional "Advanced Settings" section
4. THE System SHALL provide sensible defaults for all non-essential configuration options
5. WHEN a user completes basic configuration, THE System SHALL allow immediate deployment without template generation

### Requirement 2: Single Wallet Primary Mode

**User Story:** As a user, I want to deploy tokens using a single wallet by default, so that I can avoid complex multi-wallet management.

#### Acceptance Criteria

1. THE Batch_Deployment_System SHALL use single-wallet deployment as the default mode
2. WHEN deploying with a single wallet, THE System SHALL handle nonce management automatically
3. WHEN multi-wallet deployment is needed, THE System SHALL offer it as an advanced option only
4. THE Simple_Deployer SHALL manage sequential deployment from a single wallet address
5. WHEN switching between deployment modes, THE System SHALL preserve existing token configurations

### Requirement 3: Proactive Balance Validation

**User Story:** As a user, I want clear balance validation before deployment starts, so that I can avoid "insufficient funds" errors during the process.

#### Acceptance Criteria

1. WHEN a user initiates deployment, THE Balance_Checker SHALL validate wallet balance before starting
2. WHEN insufficient funds are detected, THE System SHALL display the exact amount needed and current balance
3. THE Balance_Checker SHALL account for gas fees, deployment costs, and a safety buffer
4. WHEN balance is sufficient, THE System SHALL show estimated total cost and remaining balance
5. THE System SHALL prevent deployment initiation when funds are insufficient

### Requirement 4: Streamlined Error Handling

**User Story:** As a user, I want clear, actionable error messages, so that I can quickly resolve issues and continue deployment.

#### Acceptance Criteria

1. WHEN deployment errors occur, THE Error_Handler SHALL provide specific, actionable error messages
2. WHEN network issues arise, THE System SHALL automatically retry with exponential backoff
3. WHEN a token deployment fails, THE System SHALL continue with remaining tokens and report partial success
4. THE Error_Handler SHALL categorize errors as: insufficient funds, network issues, configuration errors, or contract failures
5. WHEN errors are resolved, THE System SHALL allow resuming deployment from the last successful point

### Requirement 5: Real-time Progress Tracking

**User Story:** As a user, I want to see real-time progress during batch deployment, so that I understand what's happening and can estimate completion time.

#### Acceptance Criteria

1. WHEN deployment starts, THE Progress_Tracker SHALL display current token being deployed and overall progress
2. THE Progress_Tracker SHALL show estimated time remaining based on current deployment speed
3. WHEN each token deployment completes, THE System SHALL update progress and show transaction hash
4. THE Progress_Tracker SHALL display gas costs for each completed deployment
5. WHEN deployment completes, THE System SHALL show summary with total cost, successful deployments, and any failures

### Requirement 6: Template-Free Simple Deployments

**User Story:** As a user, I want to deploy tokens without creating template files, so that I can avoid file management complexity for simple batch operations.

#### Acceptance Criteria

1. THE Batch_Deployment_System SHALL support direct deployment without template file generation
2. WHEN users need to save configurations, THE System SHALL offer template export as an optional feature
3. WHEN importing existing configurations, THE System SHALL support CSV and JSON formats
4. THE System SHALL maintain deployment history without requiring template files
5. WHEN template functionality is used, THE System SHALL use a simplified template format with minimal required fields

### Requirement 7: Intelligent Gas Management

**User Story:** As a developer, I want automatic gas estimation and management, so that deployments succeed without manual gas configuration.

#### Acceptance Criteria

1. THE Simple_Deployer SHALL automatically estimate gas prices using current network conditions
2. WHEN gas prices fluctuate during deployment, THE System SHALL adjust estimates for remaining deployments
3. THE System SHALL use a conservative gas limit with 20% buffer for deployment transactions
4. WHEN gas estimation fails, THE System SHALL use fallback values based on historical deployment data
5. THE System SHALL display gas cost estimates before deployment and actual costs after completion

### Requirement 8: Deployment Session Management

**User Story:** As a user, I want to pause, resume, or cancel batch deployments, so that I can manage long-running deployment sessions effectively.

#### Acceptance Criteria

1. WHEN deployment is in progress, THE System SHALL provide pause, resume, and cancel controls
2. WHEN a deployment session is paused, THE System SHALL save current state and allow resumption
3. WHEN resuming a paused session, THE System SHALL validate wallet balance and continue from the last successful deployment
4. THE System SHALL persist deployment session state across application restarts
5. WHEN canceling a deployment, THE System SHALL complete the current token deployment before stopping

### Requirement 9: Configuration Validation

**User Story:** As a user, I want immediate validation of my token configurations, so that I can fix issues before starting deployment.

#### Acceptance Criteria

1. WHEN entering token configurations, THE System SHALL validate inputs in real-time
2. THE System SHALL check for duplicate token names and symbols within the batch
3. WHEN invalid characters are used in token names or symbols, THE System SHALL highlight errors immediately
4. THE System SHALL validate that initial supply values are within acceptable ranges
5. WHEN all configurations are valid, THE System SHALL enable the deployment button

### Requirement 10: Deployment History and Reporting

**User Story:** As a user, I want to view deployment history and generate reports, so that I can track my token deployments and costs over time.

#### Acceptance Criteria

1. THE System SHALL maintain a history of all deployment sessions with timestamps and outcomes
2. WHEN viewing deployment history, THE System SHALL show token details, transaction hashes, and gas costs
3. THE System SHALL provide export functionality for deployment reports in CSV format
4. WHEN deployments fail, THE System SHALL record failure reasons and attempted solutions
5. THE System SHALL calculate and display total deployment costs across all sessions