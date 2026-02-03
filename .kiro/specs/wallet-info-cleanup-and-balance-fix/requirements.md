# Requirements Document

## Introduction

This specification addresses cleanup and optimization of the Wallet Info feature in the UMKM Terminal CLI. The feature currently displays wallet balance information correctly but includes an unnecessary "Wallet Management" menu option that should be removed. Additionally, the .env configuration file contains redundant and unnecessary parameters that should be cleaned up to improve maintainability and reduce confusion.

## Glossary

- **Wallet_Info**: The CLI screen that displays wallet address, chain information, balance, and deployment capacity estimates
- **CLI**: Command Line Interface - the interactive terminal application for token deployment
- **Balance_Checker**: The system component responsible for fetching and displaying wallet balance information
- **Deployment_Estimator**: The component that calculates how many token deployments are possible based on current balance
- **Environment_Configuration**: The .env file containing all configuration parameters for the application
- **Configuration_Parameter**: A key-value pair in the .env file that controls application behavior

## Requirements

### Requirement 1: Remove Wallet Management Option

**User Story:** As a user viewing wallet information, I want to see only balance details and a back option, so that the interface is clean and focused on its primary purpose.

#### Acceptance Criteria

1. WHEN a user selects "Wallet Info" from the main menu, THE Wallet_Info SHALL display address, chain, balance, deployment estimates, and explorer link
2. WHEN the Wallet_Info screen is displayed, THE CLI SHALL NOT present a "Wallet Management" menu option
3. WHEN the Wallet_Info screen is displayed, THE CLI SHALL present only a "Back to Main Menu" option
4. WHEN a user presses Enter on the Wallet_Info screen, THE CLI SHALL return to the main menu

### Requirement 2: Ensure Balance Checking Accuracy

**User Story:** As a user preparing to deploy tokens, I want accurate balance information and deployment estimates, so that I can make informed decisions about my deployments.

#### Acceptance Criteria

1. WHEN the Balance_Checker fetches wallet balance, THE system SHALL query the correct chain RPC endpoint
2. WHEN calculating deployment estimates, THE Deployment_Estimator SHALL use accurate gas cost estimates for the selected chain
3. WHEN displaying balance information, THE system SHALL show both native token amount and USD equivalent
4. WHEN the balance is insufficient for deployment, THE system SHALL display the estimate in red color
5. WHEN the balance allows fewer than 5 deployments, THE system SHALL display the estimate in yellow color
6. WHEN the balance allows 5 or more deployments, THE system SHALL display the estimate in green color

### Requirement 3: Clean Up Environment Configuration

**User Story:** As a developer configuring the application, I want a clean .env file with only necessary parameters, so that I can easily understand and maintain the configuration.

#### Acceptance Criteria

1. WHEN reviewing the .env file, THE Environment_Configuration SHALL contain only parameters that are actively used by the application
2. WHEN a Configuration_Parameter is deprecated or unused, THE system SHALL NOT include it in .env.example
3. WHEN a Configuration_Parameter serves the same purpose as another parameter, THE system SHALL consolidate them into a single parameter
4. WHEN the .env file is updated, THE system SHALL preserve all required configuration values
5. WHEN documentation is provided for parameters, THE system SHALL include clear descriptions of purpose and valid values

### Requirement 4: Update Environment Example Template

**User Story:** As a new user setting up the application, I want a clear .env.example file with smart defaults, so that I can quickly start deploying without manual configuration.

#### Acceptance Criteria

1. WHEN .env.example is provided, THE template SHALL include all required Configuration_Parameters
2. WHEN .env.example is provided, THE template SHALL include clear comments explaining each parameter's purpose
3. WHEN .env.example is provided, THE template SHALL group related parameters together logically
4. WHEN .env.example is provided, THE template SHALL include example values that demonstrate correct format
5. WHEN .env.example is provided, THE template SHALL NOT include deprecated or unused parameters
6. WHEN deployment parameters are not filled in .env, THE system SHALL use smart defaults from the template

### Requirement 5: Validate Configuration Parameters

**User Story:** As a user running the application, I want the system to validate my configuration, so that I receive clear error messages for invalid settings.

#### Acceptance Criteria

1. WHEN the application starts, THE system SHALL validate all required Configuration_Parameters are present
2. WHEN a required Configuration_Parameter is missing, THE system SHALL display a clear error message indicating which parameter is needed
3. WHEN a Configuration_Parameter has an invalid value, THE system SHALL display an error message with the valid range or options
4. WHEN validation fails, THE system SHALL prevent the application from proceeding to avoid runtime errors
5. WHEN all Configuration_Parameters are valid, THE system SHALL proceed with normal operation

### Requirement 6: Maintain Backward Compatibility

**User Story:** As an existing user with a configured .env file, I want my configuration to continue working after the cleanup, so that I don't need to reconfigure everything.

#### Acceptance Criteria

1. WHEN the application encounters a deprecated Configuration_Parameter, THE system SHALL map it to the new equivalent parameter
2. WHEN both old and new Configuration_Parameters are present, THE system SHALL prefer the new parameter
3. WHEN a Configuration_Parameter is removed, THE system SHALL log a warning if it's still present in .env
4. WHEN the application starts with an old configuration, THE system SHALL continue to function correctly
5. WHEN migration is needed, THE system SHALL provide clear guidance on updating the configuration

### Requirement 7: Optimize Address Configuration

**User Story:** As a user deploying tokens, I want the system to automatically use my deployer address for admin and reward recipient, so that I don't need to manually input addresses repeatedly.

#### Acceptance Criteria

1. WHEN TOKEN_ADMIN is not set in .env, THE system SHALL default to the deployer wallet address
2. WHEN REWARD_RECIPIENT is not set in .env, THE system SHALL default to the deployer wallet address
3. WHEN the deployer address is derived from PRIVATE_KEY, THE system SHALL use it for all address fields that are empty
4. WHEN displaying configuration, THE system SHALL show which addresses are using defaults
5. WHEN a user wants to override defaults, THE system SHALL allow explicit configuration in .env
