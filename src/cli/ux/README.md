# CLI User Experience Optimization

A comprehensive system for optimizing the UMKM Terminal CLI with enhanced user experience, performance improvements, and cross-platform compatibility.

## Features

### 🚀 UX Modes
- **Normal**: Standard prompts and confirmations
- **Fast**: Reduced confirmations, skip optional prompts
- **Ultra**: Minimal prompts, auto-confirm transactions
- **Expert**: Direct access with minimal interface overhead

### ⚡ Quick Deploy
- 30-second streamlined deployment
- Auto-generated token symbols
- Smart defaults for all configurations
- Optimized for Clanker World verification

### 🔧 Advanced Deploy
- 4-step streamlined process
- Full customization options
- Logical grouping of settings
- Comprehensive deployment summary

### 🧠 Smart Defaults
- Learn from user preferences
- Contextual suggestions
- Usage pattern analysis
- Persistent across sessions

### 🌐 Cross-Platform Support
- Windows, Mac, Linux, WSL, Termux
- Platform-specific optimizations
- Consistent command syntax
- Terminal capability detection

### 💰 Unified Fee Management
- Single percentage for Token and WETH
- Dynamic fees (1-5% based on volatility)
- Flat fees (3% fixed)
- Custom fees (1-99% manual)

### 🎯 Spoofing Configuration
- Reversed reward distribution (Admin: 0.1%, Recipients: 99.9%)
- 4 distinct distribution strategies
- Real-time configuration changes
- Interactive menu system

### 🔍 Enhanced Error Handling
- Contextual error messages
- Actionable suggestions
- Automatic retry mechanisms
- Progress preservation

## Installation

```bash
npm install @umkm-terminal/cli-ux-optimization
```

## Quick Start

```typescript
import { 
  UXModeManager, 
  DeployManager, 
  UXMode, 
  DeployMode 
} from '@umkm-terminal/cli-ux-optimization';

// Initialize UX mode manager
const uxManager = new UXModeManager();
await uxManager.setMode(UXMode.FAST);

// Quick deploy
const deployManager = new DeployManager();
const result = await deployManager.quickDeploy({
  tokenName: 'My Token',
  useSmartDefaults: true,
  maxDuration: 30000
});

console.log('Deployment result:', result);
```

## Architecture

The system follows a modular architecture with clear separation of concerns:

```
CLI Entry Point
├── UX Mode Manager
├── Deploy Manager
│   ├── Quick Deploy Mode
│   └── Advanced Deploy Mode
├── Configuration Manager
│   ├── Fee Manager
│   ├── Spoofing Engine
│   └── Persistence Layer
├── Smart Defaults Engine
├── Enhanced Error Handler
├── Cross-Platform Handler
└── Performance Optimizer
```

## Core Components

### UX Mode Manager

Manages different user experience modes and interaction patterns:

```typescript
interface UXModeManager {
  getCurrentMode(): UXMode;
  setMode(mode: UXMode): Promise<void>;
  getConfirmationLevel(): ConfirmationLevel;
  shouldShowPrompt(promptType: PromptType): boolean;
}
```

### Deploy Manager

Orchestrates deployment workflows:

```typescript
interface DeployManager {
  quickDeploy(options: QuickDeployOptions): Promise<DeployResult>;
  advancedDeploy(options: AdvancedDeployOptions): Promise<DeployResult>;
  validateDeployment(deployment: Deployment): Promise<ValidationResult>;
}
```

### Smart Defaults Engine

Learns from user behavior and provides intelligent defaults:

```typescript
interface SmartDefaultsEngine {
  recordUserChoice(context: string, choice: any): Promise<void>;
  getSuggestedDefault(context: string): Promise<any>;
  analyzeUsagePatterns(): Promise<UsagePattern[]>;
}
```

## Configuration

### UX Modes

```typescript
enum UXMode {
  NORMAL = 'normal',   // Standard prompts
  FAST = 'fast',       // Reduced confirmations
  ULTRA = 'ultra',     // Minimal prompts
  EXPERT = 'expert'    // Direct access
}
```

### Fee Strategies

```typescript
enum FeeStrategy {
  DYNAMIC = 'dynamic', // 1-5% based on volatility
  FLAT = 'flat',       // 3% fixed
  CUSTOM = 'custom'    // 1-99% manual
}
```

### Platform Support

```typescript
enum Platform {
  WINDOWS = 'windows',
  MAC = 'mac',
  LINUX = 'linux',
  WSL = 'wsl',
  TERMUX = 'termux'
}
```

## Testing

The system uses a dual testing approach:

### Unit Tests
```bash
npm test
```

### Property-Based Tests
```bash
npm run test:property
```

Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) with minimum 100 iterations per test:

```typescript
import fc from 'fast-check';

// Example property test
it('should maintain UX mode consistency', () => {
  fc.assert(fc.property(
    uxModeArb,
    cliCommandArb,
    (mode, command) => {
      const manager = new UXModeManager();
      manager.setMode(mode);
      
      const confirmationLevel = manager.getConfirmationLevel();
      
      // Property: confirmation level should match mode expectations
      if (mode === UXMode.NORMAL) {
        expect(confirmationLevel.requiresConfirmation).toBe(true);
      } else if (mode === UXMode.ULTRA) {
        expect(confirmationLevel.minimizeOutput).toBe(true);
      }
    }
  ), { numRuns: 100 });
});
```

## Development

### Build System

```bash
# Development mode with watching
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint and format
npm run lint
npm run format

# Generate documentation
npm run docs
```

### Project Structure

```
src/cli/ux/
├── types.ts              # Core types and enums
├── interfaces.ts         # Component interfaces
├── index.ts              # Main entry point
├── components/           # Implementation components
│   ├── ux-mode-manager/
│   ├── deploy-manager/
│   ├── smart-defaults/
│   ├── error-handler/
│   └── cross-platform/
├── testing/              # Test configuration
│   ├── jest.config.js
│   ├── setup.ts
│   └── generators.ts
└── utils/                # Utility functions
```

## Property-Based Testing

The system includes comprehensive property-based tests that validate universal properties:

### Example Properties

1. **UX Mode Behavior Consistency**: For any UX mode and CLI operation, the system applies appropriate interaction patterns consistently.

2. **Quick Deploy Time Constraint**: For any valid Quick Deploy operation, the system completes within 30 seconds.

3. **Fee Configuration Consistency**: For any fee configuration, the system applies the same percentage to both Token and WETH.

4. **Cross-Platform Compatibility**: For any platform, the system ensures full feature compatibility with platform-specific optimizations.

### Running Property Tests

```bash
# Run all property-based tests
npm run test:property

# Run specific property test
npx jest --testNamePattern="Property.*UX Mode"

# Run with custom iterations
FC_NUM_RUNS=1000 npm run test:property
```

## Error Handling

The system provides comprehensive error handling with contextual guidance:

```typescript
interface CLIError extends Error {
  category: ErrorCategory;
  context: ErrorContext;
  recoverable: boolean;
  suggestions: Suggestion[];
}

enum ErrorCategory {
  CONFIGURATION = 'configuration',
  NETWORK = 'network',
  VALIDATION = 'validation',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}
```

## Performance Optimization

### Conditional Imports
```typescript
// Lazy load heavy dependencies
const heavyModule = await import('./heavy-module.js');
```

### Caching
```typescript
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}
```

### Memory Management
- Efficient resource cleanup
- Stream processing for large operations
- Configurable concurrency limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests (including property-based tests)
4. Implement the feature
5. Run validation: `npm run validate`
6. Submit a pull request

### Property Test Guidelines

When adding new features, include property-based tests:

```typescript
// Feature: cli-user-experience-optimization, Property 1: UX Mode Behavior Consistency
it('Property 1: UX Mode Behavior Consistency', () => {
  fc.assert(fc.property(
    uxModeArb,
    cliOperationArb,
    (mode, operation) => {
      // Test universal property across all valid inputs
      const result = performOperation(mode, operation);
      expect(result).toMatchModeExpectations(mode);
    }
  ), { numRuns: 100 });
});
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://umkm-terminal.github.io/cli-ux-optimization)
- 🐛 [Issue Tracker](https://github.com/umkm-terminal/cli-ux-optimization/issues)
- 💬 [Discussions](https://github.com/umkm-terminal/cli-ux-optimization/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.