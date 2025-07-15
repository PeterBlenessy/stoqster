# FI IndexedDB Migration Strategy

## Overview

This document outlines the migration strategy from the current LocalForage-based storage to a dedicated IndexedDB database for FI fund data. The new system will provide optimized performance for time-series analysis and complex fund analytics.

## Database Code Architecture

We will implement a **Generic IndexedDB Wrapper with Specialized Implementations** to provide a reusable foundation for current and future data sources.

### Architecture Structure

```
src/db/
├── core/
│   ├── IndexedDBManager.js      // Generic IndexedDB operations
│   ├── DatabaseSchema.js        // Schema definition utilities
│   └── QueryBuilder.js          // Generic query utilities
├── fi-funds/
│   ├── FIFundsDB.js             // FI-specific database implementation
│   ├── FundsTable.js            // Funds table operations
│   ├── HoldingsTable.js         // Holdings table operations
│   └── FITransformations.js    // Data transformation utilities
└── index.js                     // Main exports
```

### Benefits of This Approach

- **Reusable**: Generic wrapper can be used for other databases (e.g., future IBIndex, FBIndex storage)
- **Maintainable**: Clear separation between generic DB operations and FI-specific logic
- **Testable**: Each layer can be unit tested independently
- **Extensible**: Easy to add new databases or modify existing ones
- **Type Safety**: Can implement TypeScript interfaces for different data types
- **Error Handling**: Centralized error handling and retry logic
- **Future-Proof**: Supports the project's growth toward multiple data sources (IBIndex, FBIndex, FI)

### Trade-offs

- **Initial Complexity**: More files and abstraction layers to implement upfront
- **Development Time**: Longer initial development compared to a specialized solution
- **Learning Curve**: Team needs to understand the abstraction layers

**Rationale:** Given Stoqster's roadmap toward multiple data sources, this approach provides better long-term value and maintainability despite higher initial complexity.

### Implementation Details

#### Core IndexedDB Manager
```javascript
// src/db/core/IndexedDBManager.js
class IndexedDBManager {
  constructor(dbName, version, schema) {
    this.dbName = dbName
    this.version = version
    this.schema = schema
    this.db = null
  }

  async open() {
    // Generic database opening with schema application
  }

  async transaction(storeNames, mode = 'readonly') {
    // Generic transaction wrapper
  }

  async put(storeName, data) {
    // Generic put operation
  }

  async get(storeName, key) {
    // Generic get operation
  }

  async query(storeName, indexName, value) {
    // Generic indexed queries
  }

  async bulkInsert(storeName, records) {
    // Optimized bulk operations
  }
}
```

#### FI-Specific Implementation
```javascript
// src/db/fi-funds/FIFundsDB.js
class FIFundsDB extends IndexedDBManager {
  constructor() {
    super('fi-funds', 1, FI_FUNDS_SCHEMA)
  }

  async addFund(fundData) {
    const transformedData = transformFundData(fundData)
    return this.put('funds', transformedData)
  }

  async getFundTimeline(fundISIN) {
    return this.query('funds', 'fundISIN', fundISIN)
  }

  async getQuarterSnapshot(quarter) {
    return this.query('funds', 'quarter', quarter)
  }
}
```

## Migration Implementation Plan

### Phase 1: IndexedDB Infrastructure
1. **Create database folder structure** (`src/db/`)
2. **Implement generic IndexedDB wrapper**
   - Database connection management
   - Transaction handling
   - Generic CRUD operations
   - Error handling and retry logic
3. **Implement FI-specific database layer**
   - Schema definition for funds and holdings tables
   - FI-specific query methods
   - Data transformation utilities
4. **Add comprehensive testing**
   - Unit tests for generic wrapper
   - Integration tests for FI database
   - Performance benchmarks

### Phase 2: Data Transformation Pipeline
1. **Create transformation utilities**
   - Swedish to English field mapping
   - String to number conversions
   - Primary key generation
   - Data validation functions
2. **Implement batch processing**
   - Read existing LocalForage data in chunks
   - Transform and validate data
   - Bulk insert to IndexedDB with progress tracking
3. **Add data integrity checks**
   - Validate transformation results
   - Compare record counts between old and new systems
   - Verify query results consistency

### Phase 3: Parallel Operation
1. **Implement dual-write system**
   - Update import pipeline to write to both storage systems
   - Add configuration flag to enable/disable new system
   - Monitor performance and error rates
2. **Create read-path switching**
   - Add feature flag for reading from new database
   - Implement fallback to old system on errors
   - Add performance monitoring and comparison

### Phase 4: Component Migration
1. **Update data access layer**
   - Create new composables using FI IndexedDB
   - Maintain backward compatibility during transition
   - Add performance logging and comparison
2. **Migrate UI components incrementally**
   - Start with less critical components
   - Update fund timeline and performance charts
   - Migrate holdings analysis and sector views
3. **Comprehensive testing**
   - User acceptance testing with real data
   - Performance comparison with old system
   - Edge case and error condition testing

### Phase 5: Cleanup and Optimization
1. **Remove old system dependencies**
   - Remove LocalForage FI data operations
   - Clean up legacy code and imports
   - Update documentation and comments
2. **Performance optimization**
   - Monitor query performance with production data
   - Add additional indexes based on usage patterns
   - Implement data archival for old quarters
3. **Documentation and training**
   - Update developer documentation
   - Create troubleshooting guides
   - Document new query patterns and capabilities

## Technical Specifications

### Database Schema
- **Database Name**: `fi-funds`
- **Version**: 1 (with upgrade path for future versions)
- **Tables**: `funds`, `holdings`
- **Indexes**: Compound indexes for efficient multi-dimensional queries

### Performance Targets
- **Startup Time**: < 500ms for database initialization
- **Query Time**: < 100ms for single-fund timeline queries
- **Import Time**: < 30 seconds for quarterly data transformation
- **Memory Usage**: < 50MB for typical dataset operations

### Error Handling Strategy
- **Connection Failures**: Automatic retry with exponential backoff
- **Transaction Failures**: Rollback and retry with smaller batches
- **Data Corruption**: Validation and recovery procedures
- **Version Conflicts**: Graceful schema migration handling

### Monitoring and Metrics
- Query performance tracking
- Error rate monitoring
- Data consistency validation
- Storage usage tracking
- User experience metrics

## Risk Mitigation

### Data Loss Prevention
- Always maintain LocalForage data during migration
- Implement comprehensive backup before migration
- Add data validation and integrity checks
- Create rollback procedures for each phase

### Performance Regression
- Benchmark current system performance
- Set clear performance targets for new system
- Implement A/B testing capabilities
- Monitor user experience metrics during migration

### Development Risks
- Start with comprehensive unit tests
- Use feature flags for gradual rollout
- Implement detailed logging and monitoring
- Plan for rollback at each migration phase

This migration strategy provides a solid foundation for moving to IndexedDB while maintaining data integrity and system performance throughout the transition.
