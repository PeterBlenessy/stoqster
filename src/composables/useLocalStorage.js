import localforage from 'localforage'

/**
 * Composable for managing LocalForage store instances
 * Provides standardized access to local storage across components
 */
export function useLocalStorage() {

    /**
     * Create a LocalForage store instance
     * @param {Object} config - LocalForage configuration
     * @param {string} config.storeName - Store name
     * @param {string} config.name - Database name (optional, defaults to 'stoqster')
     * @returns {Object} - LocalForage store instance
     */
    function createStore({ storeName, name = 'stoqster' }) {
        if (!storeName) {
            throw new Error('Store name is required')
        }
        
        console.log(`💾 Creating LocalForage store: ${storeName}`)
        
        return localforage.createInstance({
            name,
            storeName
        })
    }

    /**
     * Get all items from a store as an array
     * @param {Object} store - LocalForage store instance
     * @returns {Promise<Array>} - Array of all stored items
     */
    async function getAllItems(store) {
        if (!store) {
            throw new Error('Store instance is required')
        }
        
        const items = []
        
        await store.iterate((value, key, iterationNumber) => {
            items.push(value)
        })
        
        return items
    }

    /**
     * Store multiple items in a store
     * @param {Object} store - LocalForage store instance
     * @param {Array} items - Array of items to store
     * @param {Function} keyExtractor - Function to extract key from item (optional)
     * @returns {Promise<void>}
     */
    async function storeItems(store, items, keyExtractor) {
        if (!store) {
            throw new Error('Store instance is required')
        }
        
        if (!Array.isArray(items)) {
            throw new Error('Items must be an array')
        }
        
        const storePromises = items.map((item, index) => {
            const key = keyExtractor 
                ? keyExtractor(item, index)
                : (item.product || item.Fond_namn || item.id || `item_${index}`)
            
            return store.setItem(key, item)
        })
        
        await Promise.all(storePromises)
        console.log(`💾 Stored ${items.length} items in LocalForage`)
    }

    /**
     * Clear all items from a store
     * @param {Object} store - LocalForage store instance
     * @returns {Promise<void>}
     */
    async function clearStore(store) {
        if (!store) {
            throw new Error('Store instance is required')
        }
        
        await store.clear()
        console.log(`🧹 Cleared LocalForage store`)
    }

    /**
     * Get the number of items in a store
     * @param {Object} store - LocalForage store instance
     * @returns {Promise<number>} - Number of items in store
     */
    async function getItemCount(store) {
        if (!store) {
            throw new Error('Store instance is required')
        }
        
        return await store.length()
    }

    /**
     * Check if a store has any items
     * @param {Object} store - LocalForage store instance
     * @returns {Promise<boolean>} - True if store has items
     */
    async function hasItems(store) {
        const count = await getItemCount(store)
        return count > 0
    }

    return {
        createStore,
        getAllItems,
        storeItems,
        clearStore,
        getItemCount,
        hasItems
    }
}