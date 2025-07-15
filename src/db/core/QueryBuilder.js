/**
 * Generic Query Builder Utilities
 * 
 * Provides utilities for building complex IndexedDB queries with filtering,
 * sorting, and aggregation capabilities.
 */

/**
 * Query builder for IndexedDB operations
 */
export class QueryBuilder {
  constructor(indexedDBManager, storeName) {
    this.db = indexedDBManager
    this.storeName = storeName
    this.filters = []
    this.sortBy = null
    this.sortOrder = 'asc'
    this.limitCount = null
    this.offsetCount = 0
  }

  /**
   * Add a filter condition
   * @param {string} field - Field name or index name
   * @param {string} operator - Comparison operator ('=', '>', '<', '>=', '<=', 'between', 'in')
   * @param {*} value - Value to compare against
   * @returns {QueryBuilder} this for chaining
   */
  where(field, operator, value) {
    this.filters.push({ field, operator, value })
    return this
  }

  /**
   * Add equality filter (shorthand for where)
   * @param {string} field
   * @param {*} value
   * @returns {QueryBuilder}
   */
  equals(field, value) {
    return this.where(field, '=', value)
  }

  /**
   * Add range filter
   * @param {string} field
   * @param {*} min
   * @param {*} max
   * @returns {QueryBuilder}
   */
  between(field, min, max) {
    return this.where(field, 'between', [min, max])
  }

  /**
   * Add greater than filter
   * @param {string} field
   * @param {*} value
   * @returns {QueryBuilder}
   */
  greaterThan(field, value) {
    return this.where(field, '>', value)
  }

  /**
   * Add less than filter
   * @param {string} field
   * @param {*} value
   * @returns {QueryBuilder}
   */
  lessThan(field, value) {
    return this.where(field, '<', value)
  }

  /**
   * Set sort order
   * @param {string} field - Field to sort by
   * @param {string} order - 'asc' or 'desc'
   * @returns {QueryBuilder}
   */
  orderBy(field, order = 'asc') {
    this.sortBy = field
    this.sortOrder = order
    return this
  }

  /**
   * Set result limit
   * @param {number} count
   * @returns {QueryBuilder}
   */
  limit(count) {
    this.limitCount = count
    return this
  }

  /**
   * Set result offset
   * @param {number} count
   * @returns {QueryBuilder}
   */
  offset(count) {
    this.offsetCount = count
    return this
  }

  /**
   * Execute the query and return results
   * @returns {Promise<Array>}
   */
  async execute() {
    try {
      console.log('🔍 Executing query on store:', this.storeName, 'with filters:', this.filters)
      
      if (this.filters.length === 0) {
        // No filters, get all records
        const allRecords = await this.db.getAll(this.storeName)
        return this.postProcessResults(allRecords)
      }

      // For now, handle single filter queries with indexes
      // More complex queries would require cursor-based filtering
      if (this.filters.length === 1) {
        const filter = this.filters[0]
        const results = await this.executeSingleFilter(filter)
        return this.postProcessResults(results)
      }

      // Multiple filters require cursor-based approach
      return this.executeComplexQuery()
    } catch (error) {
      console.error('❌ Query execution failed:', error)
      throw error
    }
  }

  /**
   * Execute query with single filter using index
   * @param {Object} filter
   * @returns {Promise<Array>}
   */
  async executeSingleFilter(filter) {
    const { field, operator, value } = filter

    if (operator === '=') {
      return this.db.query(this.storeName, field, value)
    }

    // For other operators, use cursor-based approach
    return this.executeCursorQuery(field, operator, value)
  }

  /**
   * Execute cursor-based query for complex operators
   * @param {string} field
   * @param {string} operator
   * @param {*} value
   * @returns {Promise<Array>}
   */
  async executeCursorQuery(field, operator, value) {
    const transaction = await this.db.transaction(this.storeName, 'readonly')
    const store = transaction.objectStore(this.storeName)
    
    let cursor
    try {
      const index = store.index(field)
      cursor = index.openCursor()
    } catch (error) {
      // Field is not indexed, use object store cursor
      cursor = store.openCursor()
    }

    return new Promise((resolve, reject) => {
      const results = []
      
      cursor.onsuccess = (event) => {
        const cursorResult = event.target.result
        
        if (cursorResult) {
          const record = cursorResult.value
          const fieldValue = this.getFieldValue(record, field)
          
          if (this.matchesFilter(fieldValue, operator, value)) {
            results.push(record)
          }
          
          cursorResult.continue()
        } else {
          resolve(results)
        }
      }
      
      cursor.onerror = () => reject(new Error(`Cursor query failed: ${cursor.error}`))
    })
  }

  /**
   * Execute complex query with multiple filters
   * @returns {Promise<Array>}
   */
  async executeComplexQuery() {
    const allRecords = await this.db.getAll(this.storeName)
    
    return allRecords.filter(record => {
      return this.filters.every(filter => {
        const fieldValue = this.getFieldValue(record, filter.field)
        return this.matchesFilter(fieldValue, filter.operator, filter.value)
      })
    })
  }

  /**
   * Check if a field value matches filter criteria
   * @param {*} fieldValue
   * @param {string} operator
   * @param {*} filterValue
   * @returns {boolean}
   */
  matchesFilter(fieldValue, operator, filterValue) {
    switch (operator) {
      case '=':
        return fieldValue === filterValue
      case '>':
        return fieldValue > filterValue
      case '<':
        return fieldValue < filterValue
      case '>=':
        return fieldValue >= filterValue
      case '<=':
        return fieldValue <= filterValue
      case 'between':
        return fieldValue >= filterValue[0] && fieldValue <= filterValue[1]
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(fieldValue)
      default:
        throw new Error(`Unsupported operator: ${operator}`)
    }
  }

  /**
   * Get field value from record (supports nested properties)
   * @param {Object} record
   * @param {string} field
   * @returns {*}
   */
  getFieldValue(record, field) {
    if (field.includes('.')) {
      return field.split('.').reduce((obj, key) => obj?.[key], record)
    }
    return record[field]
  }

  /**
   * Post-process results (sorting, limiting, offset)
   * @param {Array} results
   * @returns {Array}
   */
  postProcessResults(results) {
    let processedResults = [...results]

    // Apply sorting
    if (this.sortBy) {
      processedResults.sort((a, b) => {
        const aValue = this.getFieldValue(a, this.sortBy)
        const bValue = this.getFieldValue(b, this.sortBy)
        
        let comparison = 0
        if (aValue > bValue) comparison = 1
        if (aValue < bValue) comparison = -1
        
        return this.sortOrder === 'desc' ? -comparison : comparison
      })
    }

    // Apply offset and limit
    if (this.offsetCount > 0) {
      processedResults = processedResults.slice(this.offsetCount)
    }
    
    if (this.limitCount !== null) {
      processedResults = processedResults.slice(0, this.limitCount)
    }

    return processedResults
  }

  /**
   * Get count of records matching the query
   * @returns {Promise<number>}
   */
  async count() {
    const results = await this.execute()
    return results.length
  }

  /**
   * Check if any records match the query
   * @returns {Promise<boolean>}
   */
  async exists() {
    const count = await this.limit(1).count()
    return count > 0
  }
}

/**
 * Aggregation utilities for query results
 */
export class QueryAggregator {
  constructor(results) {
    this.results = results
  }

  /**
   * Sum values of a specific field
   * @param {string} field
   * @returns {number}
   */
  sum(field) {
    return this.results.reduce((sum, record) => {
      const value = this.getFieldValue(record, field)
      return sum + (typeof value === 'number' ? value : 0)
    }, 0)
  }

  /**
   * Calculate average of a field
   * @param {string} field
   * @returns {number}
   */
  average(field) {
    if (this.results.length === 0) return 0
    return this.sum(field) / this.results.length
  }

  /**
   * Find minimum value of a field
   * @param {string} field
   * @returns {*}
   */
  min(field) {
    if (this.results.length === 0) return null
    return Math.min(...this.results.map(record => this.getFieldValue(record, field)))
  }

  /**
   * Find maximum value of a field
   * @param {string} field
   * @returns {*}
   */
  max(field) {
    if (this.results.length === 0) return null
    return Math.max(...this.results.map(record => this.getFieldValue(record, field)))
  }

  /**
   * Group results by field value
   * @param {string} field
   * @returns {Object}
   */
  groupBy(field) {
    return this.results.reduce((groups, record) => {
      const value = this.getFieldValue(record, field)
      const key = value?.toString() || 'null'
      
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(record)
      
      return groups
    }, {})
  }

  /**
   * Get field value from record (supports nested properties)
   * @param {Object} record
   * @param {string} field
   * @returns {*}
   */
  getFieldValue(record, field) {
    if (field.includes('.')) {
      return field.split('.').reduce((obj, key) => obj?.[key], record)
    }
    return record[field]
  }
}

/**
 * Create a new query builder for a store
 * @param {IndexedDBManager} db
 * @param {string} storeName
 * @returns {QueryBuilder}
 */
export function createQuery(db, storeName) {
  return new QueryBuilder(db, storeName)
}

/**
 * Create aggregator for query results
 * @param {Array} results
 * @returns {QueryAggregator}
 */
export function aggregate(results) {
  return new QueryAggregator(results)
}
