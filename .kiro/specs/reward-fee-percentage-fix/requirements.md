# Requirements Document

## Introduction

The spoofing configuration system currently has incorrect reward fee percentages that need to be fixed. The token admin should receive 0.01% and the token reward recipient should receive 99.99% of rewards, but the current configuration has these values reversed or incorrect. This fix must be applied consistently across all configuration files, CLI displays, and validation logic while maintaining backward compatibility.

## Glossary

- **Spoofing_System**: The configuration system that manages reward distribution for token operations
- **Token_Admin**: The administrative entity that receives a minimal percentage of token rewards
- **Token_Reward_Recipient**: The primary recipient entity that receives the majority of token rewards
- **Reward_Percentage**: The percentage allocation of rewards distributed to each recipient
- **Configuration_File**: Files containing spoofing configuration settings and default values
- **CLI_Display**: Command-line interface components that show reward percentage information to users
- **Validation_Logic**: Code that validates reward percentage values and allocation sums

## Requirements

### Requirement 1: Correct Admin Reward Percentage

**User Story:** As a system administrator, I want the token admin to receive exactly 0.01% of rewards, so that the reward distribution follows the intended minimal admin allocation.

#### Acceptance Criteria

1. THE Spoofing_System SHALL set adminRewardPercentage to 0.01 in all configuration files
2. THE Spoofing_System SHALL set adminAllocation to 0.01 in all CLI UX configuration files
3. WHEN displaying admin reward percentages, THE CLI_Display SHALL show 0.01%
4. WHEN validating admin reward percentages, THE Validation_Logic SHALL accept 0.01 as valid
5. THE Spoofing_System SHALL update environment variable defaults to use 0.01 for admin rewards

### Requirement 2: Correct Recipient Reward Percentage

**User Story:** As a system administrator, I want the token reward recipient to receive exactly 99.99% of rewards, so that the reward distribution allocates the majority to the intended recipient.

#### Acceptance Criteria

1. THE Spoofing_System SHALL set recipientRewardPercentage to 99.99 in all configuration files
2. THE Spoofing_System SHALL set recipientAllocation to 99.99 in all CLI UX configuration files
3. WHEN displaying recipient reward percentages, THE CLI_Display SHALL show 99.99%
4. WHEN validating recipient reward percentages, THE Validation_Logic SHALL accept 99.99 as valid
5. THE Spoofing_System SHALL update environment variable defaults to use 99.99 for recipient rewards

### Requirement 3: Maintain Allocation Sum Validation

**User Story:** As a system administrator, I want the reward percentages to sum to exactly 100%, so that the allocation validation continues to work correctly.

#### Acceptance Criteria

1. WHEN validating allocation sums, THE Validation_Logic SHALL verify that 0.01 + 99.99 equals 100%
2. THE Validation_Logic SHALL continue to use floating-point precision tolerance for sum validation
3. WHEN both percentages are applied, THE Spoofing_System SHALL distribute exactly 100% of rewards
4. THE Validation_Logic SHALL reject any allocation combinations that do not sum to 100%

### Requirement 4: Update Distribution Strategy Defaults

**User Story:** As a system administrator, I want the default distribution strategy to reflect the corrected percentages, so that new configurations use the proper values.

#### Acceptance Criteria

1. THE Spoofing_System SHALL update DEFAULT_SPOOFING_CONFIGURATION adminAllocation to 0.01
2. THE Spoofing_System SHALL update DEFAULT_SPOOFING_CONFIGURATION recipientAllocation to 99.99
3. THE Spoofing_System SHALL update the default strategy adminPercentage to 0.01
4. THE Spoofing_System SHALL update the default strategy recipientPercentage to 99.99
5. THE Spoofing_System SHALL update the strategy description to reflect minimal admin allocation

### Requirement 5: Preserve Backward Compatibility

**User Story:** As a developer, I want existing code that uses the spoofing configuration to continue working, so that the fix does not break existing functionality.

#### Acceptance Criteria

1. THE Spoofing_System SHALL maintain all existing method signatures and interfaces
2. THE Spoofing_System SHALL continue to support environment variable overrides
3. WHEN existing code calls getOptimizedRewardRecipients, THE Spoofing_System SHALL return the corrected percentages
4. THE Spoofing_System SHALL preserve all existing configuration loading mechanisms
5. THE Spoofing_System SHALL maintain compatibility with all existing validation functions

### Requirement 6: Update CLI Display Components

**User Story:** As a user, I want the CLI to display the correct reward percentages, so that I can see the accurate allocation information.

#### Acceptance Criteria

1. WHEN showing spoofing configuration, THE CLI_Display SHALL display admin allocation as 0.01%
2. WHEN showing spoofing configuration, THE CLI_Display SHALL display recipient allocation as 99.99%
3. THE CLI_Display SHALL update any hardcoded percentage displays to use the corrected values
4. WHEN formatting fee previews, THE CLI_Display SHALL show the corrected percentages
5. THE CLI_Display SHALL ensure all percentage formatting functions use the updated values

### Requirement 7: Validate Configuration Consistency

**User Story:** As a system administrator, I want all configuration files to have consistent reward percentages, so that there are no conflicting values across the system.

#### Acceptance Criteria

1. THE Spoofing_System SHALL ensure adminRewardPercentage matches adminAllocation across all files
2. THE Spoofing_System SHALL ensure recipientRewardPercentage matches recipientAllocation across all files
3. WHEN loading configuration from multiple sources, THE Spoofing_System SHALL use consistent percentage values
4. THE Validation_Logic SHALL detect and report any inconsistencies between configuration files
5. THE Spoofing_System SHALL prioritize the corrected values (0.01% and 99.99%) in case of conflicts