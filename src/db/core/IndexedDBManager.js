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
            const request = indexedDB.open(this.dbName, this.version)

            request.onerror = () => {
                console.error('Failed to open database:', this.dbName, request.error)
                this.isOpening = false
                reject(new Error(`Failed to open database ${this.dbName}: ${request.error}`))
            }

            request.onsuccess = () => {
                this.db = request.result
                this.isOpening = false

                // Handle unexpected database closure
                this.db.onclose = () => {
                    console.warn('Database connection closed unexpectedly:', this.dbName)
                    this.db = null
                }

                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                const oldVersion = event.oldVersion
                const newVersion = event.newVersion

                if (oldVersion === 0) {
                    this.createSchema(db)
                } else {
                    this.applySchema(db, oldVersion, newVersion)
                }
            }
        })

        return this.openPromise
    }

    /**
     * Build store options from schema config
     * @param {Object} storeConfig - Store configuration from schema
     * @returns {Object} Options for createObjectStore
     */
    _buildStoreOptions(storeConfig) {
        const options = {}
        if (storeConfig.keyPath) {
            options.keyPath = storeConfig.keyPath
        }
        if (storeConfig.autoIncrement) {
            options.autoIncrement = true
        }
        // Default to autoIncrement if neither keyPath nor autoIncrement specified
        if (!storeConfig.keyPath && !storeConfig.autoIncrement) {
            options.autoIncrement = true
        }
        return options
    }

    /**
     * Create object stores and indexes from schema config
     * @param {IDBDatabase} db
     * @param {Object} stores - Store definitions from schema
     */
    _createStores(db, stores) {
        for (const [storeName, storeConfig] of Object.entries(stores)) {
            const options = this._buildStoreOptions(storeConfig)
            const store = db.createObjectStore(storeName, options)

            if (storeConfig.indexes) {
                for (const [indexName, indexConfig] of Object.entries(storeConfig.indexes)) {
                    store.createIndex(indexName, indexConfig.keyPath, {
                        unique: indexConfig.unique || false,
                        multiEntry: indexConfig.multiEntry || false
                    })
                }
            }
        }
    }

    /**
     * Create database schema for a new database
     * @param {IDBDatabase} db
     */
    createSchema(db) {
        try {
            this._createStores(db, this.schema.stores)
        } catch (error) {
            console.error('Error creating schema:', error)
            throw error
        }
    }

    /**
     * Apply schema upgrade by recreating stores
     * @param {IDBDatabase} db
     * @param {number} oldVersion
     * @param {number} newVersion
     */
    applySchema(db, oldVersion, newVersion) {
        try {
            for (const storeName of Object.keys(this.schema.stores)) {
                if (db.objectStoreNames.contains(storeName)) {
                    db.deleteObjectStore(storeName)
                }
            }
            this._createStores(db, this.schema.stores)
        } catch (error) {
            console.error('Error applying schema:', error)
            throw error
        }
    }

    /**
     * Create a transaction for the specified stores
     * @param {string|string[]} storeNames
     * @param {string} mode - 'readonly', 'readwrite', or 'versionchange'
     * @returns {IDBTransaction}
     */
    async transaction(storeNames, mode = 'readonly') {
        const db = await this.open()
        const stores = Array.isArray(storeNames) ? storeNames : [storeNames]

        try {
            return db.transaction(stores, mode)
        } catch (error) {
            console.error('Failed to create transaction:', error)
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
        const transaction = await this.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            const request = store.put(data)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(new Error(`Put failed on ${storeName}: ${request.error}`))
        })
    }

    /**
     * Get a record by key from the specified store
     * @param {string} storeName
     * @param {*} key
     * @returns {Promise<*>} The record or undefined if not found
     */
    async get(storeName, key) {
        const transaction = await this.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            const request = store.get(key)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(new Error(`Get failed on ${storeName}: ${request.error}`))
        })
    }

    /**
     * Query records by index value using optimized getAll
     * @param {string} storeName
     * @param {string} indexName
     * @param {*} value
     * @param {number} limit - Optional limit for results
     * @returns {Promise<Array>} Array of matching records
     */
    async query(storeName, indexName, value, limit = null) {
        const transaction = await this.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const index = store.index(indexName)

        return new Promise((resolve, reject) => {
            const request = index.getAll(IDBKeyRange.only(value), limit)
            request.onsuccess = () => resolve(request.result || [])
            request.onerror = () => reject(new Error(`Query failed on ${storeName}.${indexName}: ${request.error}`))
        })
    }

    /**
     * Get all records from a store
     * @param {string} storeName
     * @returns {Promise<Array>} All records in the store
     */
    async getAll(storeName) {
        const transaction = await this.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            const request = store.getAll()
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(new Error(`GetAll failed on ${storeName}: ${request.error}`))
        })
    }

    /**
     * Get all records from a store with their primary keys
     * @param {string} storeName
     * @returns {Promise<Array>} All records with id property set to the primary key
     */
    async getAllWithKeys(storeName) {
        const transaction = await this.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            const results = []
            const request = store.openCursor()

            request.onsuccess = (event) => {
                const cursor = event.target.result
                if (cursor) {
                    results.push({ ...cursor.value, id: cursor.key })
                    cursor.continue()
                } else {
                    resolve(results)
                }
            }

            request.onerror = () => reject(new Error(`GetAllWithKeys failed on ${storeName}: ${request.error}`))
        })
    }

    /**
     * Query records by index with their primary keys
     * @param {string} storeName
     * @param {string} indexName
     * @param {*} value
     * @param {number} limit - Optional limit
     * @returns {Promise<Array>} Records with id property set to the primary key
     */
    async queryWithKeys(storeName, indexName, value, limit = null) {
        const transaction = await this.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)
        const index = store.index(indexName)

        return new Promise((resolve, reject) => {
            const results = []
            let count = 0
            const request = index.openCursor(IDBKeyRange.only(value))

            request.onsuccess = (event) => {
                const cursor = event.target.result
                if (cursor && (limit === null || count < limit)) {
                    results.push({ ...cursor.value, id: cursor.primaryKey })
                    count++
                    cursor.continue()
                } else {
                    resolve(results)
                }
            }

            request.onerror = () => reject(new Error(`QueryWithKeys failed on ${storeName}.${indexName}: ${request.error}`))
        })
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

        const batchSize = 100
        let inserted = 0

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

        return inserted
    }

    /**
     * Ultra-fast bulk import - single transaction for entire dataset
     * @param {string} storeName
     * @param {Array} records - All records to insert
     * @param {Function} progressCallback - Optional progress updates
     * @returns {Promise<number>} Number of records inserted
     */
    async ultraBulkInsert(storeName, records, progressCallback = null) {
        if (!Array.isArray(records) || records.length === 0) {
            return 0
        }

        const transaction = await this.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            let completed = 0
            let hasError = false

            records.forEach((record, index) => {
                const request = store.put(record)

                request.onsuccess = () => {
                    completed++

                    if (progressCallback && completed % 1000 === 0) {
                        progressCallback(completed, records.length)
                    }

                    if (completed === records.length && !hasError) {
                        resolve(completed)
                    }
                }

                request.onerror = () => {
                    if (!hasError) {
                        hasError = true
                        reject(new Error(`Bulk insert failed at record ${index}: ${request.error}`))
                    }
                }
            })
        })
    }

    /**
     * Delete a record by key
     * @param {string} storeName
     * @param {*} key
     * @returns {Promise<void>}
     */
    async delete(storeName, key) {
        const transaction = await this.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            const request = store.delete(key)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(new Error(`Delete failed on ${storeName}: ${request.error}`))
        })
    }

    /**
     * Delete all records matching an index value using optimized bulk deletion
     * @param {string} storeName
     * @param {string} indexName
     * @param {*} value - Value to match for deletion
     * @returns {Promise<number>} Number of records deleted
     */
    async deleteByIndex(storeName, indexName, value) {
        const transaction = await this.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const index = store.index(indexName)

        return new Promise((resolve, reject) => {
            let deletedCount = 0
            const keyRange = IDBKeyRange.only(value)
            const cursorRequest = index.openCursor(keyRange)

            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result
                if (cursor) {
                    cursor.delete()
                    deletedCount++
                    cursor.continue()
                } else {
                    resolve(deletedCount)
                }
            }

            cursorRequest.onerror = () => {
                reject(new Error(`deleteByIndex failed on ${storeName}.${indexName}: ${cursorRequest.error}`))
            }
        })
    }

    /**
     * Clear all records from a store
     * @param {string} storeName
     * @returns {Promise<void>}
     */
    async clear(storeName) {
        const transaction = await this.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            const request = store.clear()
            request.onsuccess = () => resolve()
            request.onerror = () => reject(new Error(`Clear failed on ${storeName}: ${request.error}`))
        })
    }

    /**
     * Get the count of records in a store
     * @param {string} storeName
     * @returns {Promise<number>}
     */
    async count(storeName) {
        const transaction = await this.transaction(storeName, 'readonly')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            const request = store.count()
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(new Error(`Count failed on ${storeName}: ${request.error}`))
        })
    }

    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close()
            this.db = null
        }
    }

    /**
     * Completely drop the database
     */
    async drop() {
        this.close()

        await new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(this.dbName)

            deleteRequest.onsuccess = () => resolve()
            deleteRequest.onerror = () => {
                reject(new Error(`Failed to delete database ${this.dbName}: ${deleteRequest.error}`))
            }
            deleteRequest.onblocked = () => {
                console.warn('Database deletion blocked, waiting for connections to close:', this.dbName)
            }
        })

        this.db = null
        this.isOpening = false
        this.openPromise = null
    }
}
