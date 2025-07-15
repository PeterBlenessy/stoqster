/**
 * Database Module Main Exports
 * 
 * Provides convenient access to all database functionality including
 * generic IndexedDB operations and FI-specific database operations.
 */

// Core IndexedDB utilities
export { IndexedDBManager } from './core/IndexedDBManager.js'
export { 
  createSchema, 
  defineStore, 
  defineIndex, 
  defineCompoundIndex,
  SchemaValidators,
  SchemaPatterns 
} from './core/DatabaseSchema.js'
export { 
  QueryBuilder, 
  QueryAggregator, 
  createQuery, 
  aggregate 
} from './core/QueryBuilder.js'

// FI Funds specific exports
export { 
  FIFundsDB, 
  fiFundsDB 
} from './fi-funds/FIFundsDB.js'
export { 
  FI_FUNDS_SCHEMA,
  generateFundKey,
  generateHoldingKey,
  parseCompositeKey,
  FI_QUERY_PATTERNS
} from './fi-funds/FIFundsSchema.js'
export {
  transformFundData,
  transformHoldingData,
  validateTransformedFundData,
  validateTransformedHoldingData,
  batchTransformFunds,
  batchTransformHoldings
} from './fi-funds/FITransformations.js'

// Convenience exports for common operations
export const db = {
  // Generic IndexedDB manager
  IndexedDBManager,
  
  // FI Funds database instance
  fiFunds: fiFundsDB,
  
  // Schema utilities
  schema: {
    createSchema,
    defineStore,
    defineIndex,
    defineCompoundIndex,
    validators: SchemaValidators,
    patterns: SchemaPatterns
  },
  
  // Query utilities
  query: {
    createQuery,
    aggregate,
    QueryBuilder,
    QueryAggregator
  },
  
  // FI transformation utilities
  transform: {
    fund: transformFundData,
    holding: transformHoldingData,
    batchFunds: batchTransformFunds,
    batchHoldings: batchTransformHoldings,
    validateFund: validateTransformedFundData,
    validateHolding: validateTransformedHoldingData
  }
}

// Default export for convenience
export default db
