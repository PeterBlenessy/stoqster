/**
 * Database Schema Definition Utilities
 * 
 * Provides utilities for defining IndexedDB schemas in a declarative way.
 * Supports object stores, indexes, and validation rules.
 */

/**
 * Create a schema definition for an IndexedDB database
 * @param {Object} config - Schema configuration
 * @returns {Object} Schema definition
 */
export function createSchema(config) {
    return {
        version: config.version || 1,
        stores: config.stores || {},

        /**
         * Validate that a data object matches the schema requirements
         * @param {string} storeName
         * @param {Object} data
         * @returns {boolean}
         */
        validate(storeName, data) {
            const store = this.stores[storeName]
            if (!store) {
                throw new Error(`Store '${storeName}' not found in schema`)
            }

            if (store.required) {
                for (const field of store.required) {
                    if (!(field in data) || data[field] == null) {
                        throw new Error(`Required field '${field}' missing in data for store '${storeName}'`)
                    }
                }
            }

            return true
        }
    }
}

/**
 * Define an object store configuration
 * @param {Object} config - Store configuration
 * @returns {Object} Store definition
 */
export function defineStore(config) {
    return {
        keyPath: config.keyPath || null,
        autoIncrement: config.autoIncrement || false,
        indexes: config.indexes || {},
        required: config.required || [],

        // Add validation rules if needed
        validate: config.validate || (() => true)
    }
}

/**
 * Define an index configuration
 * @param {string|Array} keyPath - The key path for the index
 * @param {Object} options - Index options
 * @returns {Object} Index definition
 */
export function defineIndex(keyPath, options = {}) {
    return {
        keyPath: keyPath,
        unique: options.unique || false,
        multiEntry: options.multiEntry || false
    }
}

/**
 * Define a compound index for multiple fields
 * @param {Array} keyPaths - Array of key paths
 * @param {Object} options - Index options
 * @returns {Object} Compound index definition
 */
export function defineCompoundIndex(keyPaths, options = {}) {
    if (!Array.isArray(keyPaths) || keyPaths.length === 0) {
        throw new Error('Compound index requires an array of key paths')
    }

    return defineIndex(keyPaths, options)
}

/**
 * Schema validation utilities
 */
export const SchemaValidators = {
    /**
     * Validate that a value is a non-empty string
     */
    nonEmptyString(value, fieldName) {
        if (typeof value !== 'string' || value.trim() === '') {
            throw new Error(`Field '${fieldName}' must be a non-empty string`)
        }
        return true
    },

    /**
     * Validate that a value is a positive number
     */
    positiveNumber(value, fieldName) {
        if (typeof value !== 'number' || value <= 0 || isNaN(value)) {
            throw new Error(`Field '${fieldName}' must be a positive number`)
        }
        return true
    },

    /**
     * Validate that a value is a valid date string
     */
    dateString(value, fieldName) {
        if (typeof value !== 'string' || isNaN(Date.parse(value))) {
            throw new Error(`Field '${fieldName}' must be a valid date string`)
        }
        return true
    },

    /**
     * Validate that a value matches a specific pattern
     */
    pattern(regex, message) {
        return (value, fieldName) => {
            if (typeof value !== 'string' || !regex.test(value)) {
                throw new Error(message || `Field '${fieldName}' does not match required pattern`)
            }
            return true
        }
    }
}

/**
 * Common schema patterns for reuse
 */
export const SchemaPatterns = {
    /**
     * Standard timestamp fields
     */
    timestamps: {
        createdAt: defineIndex('createdAt'),
        updatedAt: defineIndex('updatedAt')
    },

    /**
     * Standard quarter-based time series pattern
     */
    quarterTimeSeries: {
        quarter: defineIndex('quarter'),
        year: defineIndex('year'),
        quarterYear: defineCompoundIndex(['quarter', 'year'])
    },

    /**
     * Standard identifier patterns
     */
    identifiers: {
        id: defineIndex('id', { unique: true }),
        uuid: defineIndex('uuid', { unique: true })
    }
}
