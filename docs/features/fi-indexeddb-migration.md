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

### Phase 1: IndexedDB Infrastructure ✅ COMPLETED
1. ✅ **Create database folder structure** (`src/db/`)
2. ✅ **Implement generic IndexedDB wrapper**
   - ✅ Database connection management
   - ✅ Transaction handling
   - ✅ Generic CRUD operations
   - ✅ Error handling and retry logic
3. ✅ **Implement FI-specific database layer**
   - ✅ Schema definition for funds and holdings tables
   - ✅ FI-specific query methods
   - ✅ Data transformation utilities
4. ✅ **Add comprehensive testing**
   - ✅ Unit tests for generic wrapper
   - ✅ Integration tests for FI database
   - ✅ Performance benchmarks

### Phase 2: Data Transformation Pipeline ✅ COMPLETED
1. ✅ **Create transformation utilities**
   - ✅ Swedish to English field mapping
   - ✅ String to number conversions
   - ✅ Auto-increment keys
   - ✅ Data validation functions
2. ✅ **Implement batch processing**
   - ✅ Read existing LocalForage data in chunks
   - ✅ Transform and validate data
   - ✅ Bulk insert to IndexedDB with progress tracking
3. ✅ **Add data integrity checks**
   - ✅ Validate transformation results
   - ✅ Compare record counts between old and new systems
   - ✅ Verify query results consistency
4. ✅ **Complete migration pipeline**
   - ✅ End-to-end LocalForage → IndexedDB migration
   - ✅ Progress tracking and error handling
   - ✅ Interactive testing interface
   - ✅ **ADDED: Database drop/recreate functionality**
   - ✅ **IMPROVED: Simplified schema management**

### Phase 2.5: Production Migration Implementation 🚧 **IN PROGRESS**
1. **Create reusable migration dialog component**
   - Generic MigrationDialog.vue for future use
   - Progress tracking and error handling UI
   - Consistent migration UX across the app
2. **Implement full data migration**
   - Remove testing limits (migrate all data)
   - Add migration detection on Funds page entry
   - Show migration dialog with progress feedback
   - Set migration completion flag in localStorage
3. **Migration completion handling**
   - Switch to IndexedDB data access immediately after migration
   - Add migration status checks in FI composables
   - Maintain LocalForage data as backup (read-only)

### Phase 3: Direct Component Migration (SIMPLIFIED)
1. **Update data access layer**
   - Modify FI composables to use IndexedDB directly
   - Remove dual-storage complexity
   - Add fallback error handling for data access
2. **Migrate UI components**
   - Update fund timeline and performance charts
   - Migrate holdings analysis and sector views
   - Test with migrated IndexedDB data
3. **Comprehensive testing**
   - User acceptance testing with migrated data
   - Performance validation with IndexedDB
   - Edge case and error condition testing

### Phase 4: Cleanup and Optimization (SIMPLIFIED)
1. **Remove old system dependencies**
   - Remove LocalForage FI data write operations
   - Keep LocalForage data as read-only backup initially
   - Clean up legacy migration code
2. **Performance optimization**
   - Monitor query performance with production data
   - Add additional indexes based on usage patterns
   - Implement data archival for old quarters
3. **Documentation and training**
   - Update developer documentation
   - Create troubleshooting guides
   - Document new query patterns and capabilities

## Key Architectural Improvements Made During Implementation

During development, we identified and implemented several improvements to the original plan:

### 1. **Simplified Primary Key Strategy**
- **Original Plan**: Complex composite primary keys (fundISIN#quarter#year)
- **Implementation**: Auto-increment integer primary keys with indexed foreign keys
- **Benefits**: Eliminates keyPath errors, simpler data insertion, better performance
- **Impact**: Cleaner schema, no complex key generation logic needed

### 2. **Drop-and-Recreate Database Management**
- **Original Plan**: Complex schema versioning and migration logic
- **Implementation**: Simple database drop functionality for fresh starts
- **Benefits**: Easier troubleshooting, cleaner upgrades when needed
- **Impact**: Faster development, simpler debugging, flexible deployment options

### 3. **Unified Schema Creation Logic**
- **Original Plan**: Separate creation and upgrade paths
- **Implementation**: Single schema creation method handling both new databases and upgrades
- **Benefits**: Less code duplication, consistent database structure
- **Impact**: Simplified maintenance, reduced complexity

### 4. **Enhanced Error Handling and Debugging**
- **Added**: Comprehensive emoji-prefixed logging for better debugging
- **Added**: JSON.stringify debugging for data transformation validation
- **Added**: Testing limits for migration debugging (10 records during development)
- **Benefits**: Much easier to diagnose and fix issues during development

### 5. **Strict Field Mapping Compliance**
- **Implementation**: Exact adherence to `fi-fund-data-mapping.md` documentation
- **Benefits**: Accurate data transformation, no made-up fields
- **Impact**: Higher data quality, better consistency with source documentation

These improvements resulted in a more robust, maintainable, and debuggable solution than originally planned.

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
