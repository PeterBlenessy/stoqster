/**
 * Generic IndexedDB Manager
 * 
 * Provides a reusable foundation for IndexedDB operations across different databases.
 * This class handles connection management, transactions, and basic CRUD operations.
 * 
 * Usage:
 * ```javascript
 * const db = new IndexedDBManager('my-database', 1, schema)
 * await db.open()
 * await db.put('tableName', data)
 * ```
 */
export class IndexedDBManager {
  constructor(dbName, version, schema) {
    this.dbName = dbName
    this.version = version
    this.schema = schema
    this.db = null
    this.isOpening = false
    this.openPromise = null
  }

  /**
   * Open database connection with schema application
   * @returns {Promise<IDBDatabase>}
   */
  async open() {
    if (this.db) {
      return this.db
    }

    if (this.isOpening && this.openPromise) {
      return this.openPromise
    }

    this.isOpening = true
    this.openPromise = new Promise((resolve, reject) => {
      console.log('🔄 Opening IndexedDB database:', this.dbName, 'version:', this.version)
      
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('❌ Failed to open database:', request.error)
        this.isOpening = false
        reject(new Error(`Failed to open database ${this.dbName}: ${request.error}`))
      }

      request.onsuccess = () => {
        console.log('✅ Database opened successfully:', this.dbName)
        this.db = request.result
        this.isOpening = false
        
        // Handle unexpected database closure
        this.db.onclose = () => {
          console.log('⚠️ Database connection closed unexpectedly')
          this.db = null
        }

        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        console.log('🔄 Database upgrade needed, applying schema...')
        const db = event.target.result
        this.applySchema(db, event.oldVersion, event.newVersion)
      }
    })

    return this.openPromise
  }

  /**
   * Apply database schema during upgrade
   * @param {IDBDatabase} db
   * @param {number} oldVersion
   * @param {number} newVersion
   */
  applySchema(db, oldVersion, newVersion) {
    console.log(`🔄 Applying schema upgrade from version ${oldVersion} to ${newVersion}`)
    
    try {
      // Create object stores defined in schema
      for (const [storeName, storeConfig] of Object.entries(this.schema.stores)) {
        if (!db.objectStoreNames.contains(storeName)) {
          console.log('📦 Creating object store:', storeName)
          const store = db.createObjectStore(storeName, storeConfig.keyPath ? 
            { keyPath: storeConfig.keyPath } : 
            { autoIncrement: storeConfig.autoIncrement || false }
          )

          // Create indexes
          if (storeConfig.indexes) {
            for (const [indexName, indexConfig] of Object.entries(storeConfig.indexes)) {
              console.log('🔍 Creating index:', indexName, 'on store:', storeName)
              store.createIndex(indexName, indexConfig.keyPath, {
                unique: indexConfig.unique || false,
                multiEntry: indexConfig.multiEntry || false
              })
            }
          }
        }
      }
      console.log('✅ Schema applied successfully')
    } catch (error) {
      console.error('❌ Error applying schema:', error)
      throw error
    }
  }

  /**
   * Create a transaction for the specified stores
   * @param {string|string[]} storeNames
   * @param {string} mode - 'readonly', 'readwrite', or 'versionchange'
   * @returns {Promise<IDBTransaction>}
   */
  async transaction(storeNames, mode = 'readonly') {
    const db = await this.open()
    const stores = Array.isArray(storeNames) ? storeNames : [storeNames]
    
    try {
      const transaction = db.transaction(stores, mode)
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(transaction)
        transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`))
        transaction.onabort = () => reject(new Error('Transaction was aborted'))
        
        // Return transaction immediately for chaining operations
        resolve(transaction)
      })
    } catch (error) {
      console.error('❌ Error creating transaction:', error)
      throw new Error(`Failed to create transaction: ${error.message}`)
    }
  }

  /**
   * Add or update a record in the specified store
   * @param {string} storeName
   * @param {*} data
   * @returns {Promise<*>} The key of the stored record
   */
  async put(storeName, data) {
    try {
      const transaction = await this.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.put(data)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(new Error(`Put operation failed: ${request.error}`))
      })
    } catch (error) {
      console.error('❌ Error in put operation:', error)
      throw error
    }
  }

  /**
   * Get a record by key from the specified store
   * @param {string} storeName
   * @param {*} key
   * @returns {Promise<*>} The record or undefined if not found
   */
  async get(storeName, key) {
    try {
      const transaction = await this.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(new Error(`Get operation failed: ${request.error}`))
      })
    } catch (error) {
      console.error('❌ Error in get operation:', error)
      throw error
    }
  }

  /**
   * Query records using an index
   * @param {string} storeName
   * @param {string} indexName
   * @param {*} value
   * @param {number} limit - Optional limit for results
   * @returns {Promise<Array>} Array of matching records
   */
  async query(storeName, indexName, value, limit = null) {
    try {
      const transaction = await this.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      
      return new Promise((resolve, reject) => {
        const results = []
        const request = index.openCursor(IDBKeyRange.only(value))
        
        request.onsuccess = (event) => {
          const cursor = event.target.result
          if (cursor && (!limit || results.length < limit)) {
            results.push(cursor.value)
            cursor.continue()
          } else {
            resolve(results)
          }
        }
        
        request.onerror = () => reject(new Error(`Query operation failed: ${request.error}`))
      })
    } catch (error) {
      console.error('❌ Error in query operation:', error)
      throw error
    }
  }

  /**
   * Get all records from a store
   * @param {string} storeName
   * @returns {Promise<Array>} All records in the store
   */
  async getAll(storeName) {
    try {
      const transaction = await this.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(new Error(`GetAll operation failed: ${request.error}`))
      })
    } catch (error) {
      console.error('❌ Error in getAll operation:', error)
      throw error
    }
  }

  /**
   * Perform bulk insert operation with progress tracking
   * @param {string} storeName
   * @param {Array} records
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<number>} Number of records inserted
   */
  async bulkInsert(storeName, records, progressCallback = null) {
    if (!Array.isArray(records) || records.length === 0) {
      return 0
    }

    console.log('📦 Starting bulk insert:', records.length, 'records to', storeName)
    const batchSize = 100
    let inserted = 0

    try {
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        const transaction = await this.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)

        await new Promise((resolve, reject) => {
          let completed = 0
          let hasError = false

          for (const record of batch) {
            const request = store.put(record)
            
            request.onsuccess = () => {
              completed++
              inserted++
              if (completed === batch.length && !hasError) {
                resolve()
              }
            }
            
            request.onerror = () => {
              hasError = true
              reject(new Error(`Bulk insert failed: ${request.error}`))
            }
          }
        })

        if (progressCallback) {
          progressCallback(inserted, records.length)
        }
      }

      console.log('✅ Bulk insert completed:', inserted, 'records inserted')
      return inserted
    } catch (error) {
      console.error('❌ Error in bulk insert:', error)
      throw error
    }
  }

  /**
   * Delete a record by key
   * @param {string} storeName
   * @param {*} key
   * @returns {Promise<void>}
   */
  async delete(storeName, key) {
    try {
      const transaction = await this.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(new Error(`Delete operation failed: ${request.error}`))
      })
    } catch (error) {
      console.error('❌ Error in delete operation:', error)
      throw error
    }
  }

  /**
   * Clear all records from a store
   * @param {string} storeName
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    try {
      const transaction = await this.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => {
          console.log('🧹 Cleared all records from store:', storeName)
          resolve()
        }
        request.onerror = () => reject(new Error(`Clear operation failed: ${request.error}`))
      })
    } catch (error) {
      console.error('❌ Error in clear operation:', error)
      throw error
    }
  }

  /**
   * Get the count of records in a store
   * @param {string} storeName
   * @returns {Promise<number>}
   */
  async count(storeName) {
    try {
      const transaction = await this.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.count()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(new Error(`Count operation failed: ${request.error}`))
      })
    } catch (error) {
      console.error('❌ Error in count operation:', error)
      throw error
    }
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      console.log('🛑 Closing database connection:', this.dbName)
      this.db.close()
      this.db = null
    }
  }
}
