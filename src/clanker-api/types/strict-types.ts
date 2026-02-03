/**
 * Strict TypeScript Type Definitions
 * Comprehensive type exports for external consumption with strict mode compliance
 */

// Re-export all core types with proper constraints
export type {
  // API Types
  ClankerAPITokenRequest,
  ClankerAPIResponse,
  ClankerAPIErrorResponse,
  ClankerAPIConfig,
  ClankerAPIResult,
  RequestOptions,
} from './api-types.js';

export type {
  // Configuration Types
  ClankerSDKConfig,
  OperationMethod,
  MethodSelectionContext,
  BatchDeploymentResult,
  ChainSummary,
  BatchDeploymentResponse,
  ConfigValidationResult,
  ConfigValidationOptions,
} from './config-types.js';

export type {
  // Error Types
  ClankerErrorCode,
  ClankerErrorContext,
  ClankerErrorDetails,
  APIErrorDetails,
  ConfigErrorDetails,
  AuthErrorDetails,
  NetworkErrorDetails,
  ValidationErrorDetails,
} from './error-types.js';

export type {
  // Mapper Types
  FieldMappingRule,
  FieldMappingContext,
  MappingResult,
  ChainMappingConfig,
} from './mapper-types.js';

export type {
  // Validation Types
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SchemaValidationOptions,
} from '../validation/type-validator.js';

// Utility types for strict mode compliance
export type NonNullable<T> = T extends null | undefined ? never : T;

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type StrictPartial<T> = {
  [K in RequiredKeys<T>]: T[K];
} & {
  [K in OptionalKeys<T>]?: T[K];
};

// Type guards for runtime type checking
export interface TypeGuard<T> {
  (value: unknown): value is T;
}

export interface AsyncTypeGuard<T> {
  (value: unknown): Promise<boolean>;
}

// Branded types for better type safety
export type BrandedString<Brand extends string> = string & { __brand: Brand };
export type Address = BrandedString<'Address'>;
export type HexString = BrandedString<'HexString'>;
export type ChainId = BrandedString<'ChainId'>;

// Result types for error handling
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Configuration builder pattern types
export interface ConfigBuilder<T> {
  build(): T;
  validate(): ValidationResult;
  reset(): ConfigBuilder<T>;
}

// Method selection types with strict constraints
export type MethodSelectorFunction = (context: MethodSelectionContext) => OperationMethod;

export interface MethodSelectionStrategy {
  name: string;
  description: string;
  selector: MethodSelectorFunction;
  priority: number;
}

// Chain configuration types
export interface ChainConfiguration {
  readonly id: number;
  readonly name: string;
  readonly nativeCurrency: string;
  readonly blockExplorer: string;
  readonly rpcUrls: readonly string[];
  readonly apiSupported: boolean;
  readonly directSupported: boolean;
}

// Deployment types with strict validation
export interface StrictDeploymentConfig {
  readonly token: NonNullable<ClankerAPITokenRequest['token']>;
  readonly method: OperationMethod;
  readonly chainId: number;
  readonly validateBeforeDeploy: boolean;
}

// Batch operation types
export interface BatchOperationConfig<T> {
  readonly items: readonly T[];
  readonly concurrency: number;
  readonly failFast: boolean;
  readonly retryFailedItems: boolean;
}

// Type-safe event emitter types
export interface TypedEventEmitter<Events extends Record<string, any[]>> {
  on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): this;
  emit<K extends keyof Events>(event: K, ...args: Events[K]): boolean;
  off<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): this;
}

// API client events
export interface ClankerAPIEvents {
  'request:start': [url: string, method: string];
  'request:success': [url: string, method: string, duration: number];
  'request:error': [url: string, method: string, error: Error];
  'auth:success': [apiKey: string];
  'auth:failure': [error: Error];
  'deployment:start': [tokenName: string, chainId: number];
  'deployment:success': [tokenName: string, chainId: number, address: string];
  'deployment:failure': [tokenName: string, chainId: number, error: Error];
}

// Executor events
export interface ExecutorEvents {
  'method:selected': [method: OperationMethod, context: MethodSelectionContext];
  'batch:start': [tokenCount: number, method: OperationMethod];
  'batch:progress': [completed: number, total: number, method: OperationMethod];
  'batch:complete': [results: BatchDeploymentResponse];
}

// Type-safe API client interface
export interface TypedClankerAPIClient extends TypedEventEmitter<ClankerAPIEvents> {
  deploy(request: ClankerAPITokenRequest): AsyncResult<ClankerAPIResponse>;
  batchDeploy(requests: readonly ClankerAPITokenRequest[]): AsyncResult<ClankerAPIResponse[]>;
  testConnection(): AsyncResult<{ connected: boolean; authenticated: boolean; latency: number }>;
}

// Type-safe executor interface
export interface TypedUnifiedExecutor extends TypedEventEmitter<ExecutorEvents> {
  deploy(token: ClankerAPITokenRequest['token'], method?: OperationMethod): AsyncResult<any>;
  batchDeploy(tokens: readonly ClankerAPITokenRequest['token'][], method?: OperationMethod): AsyncResult<BatchDeploymentResponse>;
  validateTokenConfig(token: ClankerAPITokenRequest['token'], method?: OperationMethod): AsyncResult<ValidationResult>;
}