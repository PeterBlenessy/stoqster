import { ref, readonly } from 'vue'
import { useQuasar } from 'quasar'

/**
 * Composable for handling data loading patterns with cache fallback
 * Provides standardized loading logic for components that fetch data from APIs
 * and store it in LocalForage with fallback to web requests
 */
export function useDataLoader() {
    const $q = useQuasar()
    const loading = ref(false)
    const refreshColor = ref('primary')

    /**
     * Load data with fallback strategy: cache first, then web request
     * @param {Object} params - Configuration object
     * @param {Object} params.store - LocalForage store instance
     * @param {Function} params.webFetcher - Function to fetch data from web
     * @param {string} params.apiName - API name for logging
     * @param {Function} params.onSuccess - Optional success callback
     * @param {Function} params.onError - Optional error callback
     * @returns {Promise<Array>} - Loaded data array
     */
    async function loadData({ store, webFetcher, apiName, onSuccess, onError }) {
        console.time(`🔄 LoadData ${apiName}`)
        loading.value = true
        
        try {
            let data = []
            
            // Try to load from cache first
            await store.iterate((value, key, iterationNumber) => {
                data.push(value)
            })
            
            // If no cached data, fetch from web
            if (data.length === 0) {
                console.log(`📦 No cached data found for ${apiName}, fetching from web`)
                data = await webFetcher()
            } else {
                console.log(`💾 Loaded ${data.length} items from cache for ${apiName}`)
            }
            
            // Ensure unique index for each row (common pattern in existing components)
            data.forEach((row, index) => {
                row.index = index
            })
            
            onSuccess?.(data)
            return data
            
        } catch (error) {
            console.error(`❌ Error loading data for ${apiName}:`, error)
            onError?.(error)
            throw error
        } finally {
            loading.value = false
            console.timeEnd(`🔄 LoadData ${apiName}`)
        }
    }

    /**
     * Refresh data from web source
     * @param {Object} params - Configuration object  
     * @param {Function} params.webFetcher - Function to fetch data from web
     * @param {Object} params.store - LocalForage store instance
     * @param {string} params.apiName - API name for logging
     * @param {Function} params.onSuccess - Optional success callback
     * @param {Function} params.onError - Optional error callback
     * @returns {Promise<Array>} - Refreshed data array
     */
    async function refreshData({ webFetcher, store, apiName, onSuccess, onError }) {
        console.time(`🔄 RefreshData ${apiName}`)
        loading.value = true
        refreshColor.value = 'primary'
        
        try {
            const data = await webFetcher()
            
            // Store new data in cache
            if (store && Array.isArray(data)) {
                const storePromises = data.map(item => {
                    // Use appropriate key based on item structure
                    const key = item.product || item.Fond_namn || item.id || Date.now() + Math.random()
                    return store.setItem(key, item)
                })
                await Promise.all(storePromises)
                console.log(`💾 Stored ${data.length} items in cache for ${apiName}`)
            }
            
            refreshColor.value = 'primary'
            $q.notify({
                type: 'positive',
                message: 'Uppdateringen gick bra'
            })
            
            onSuccess?.(data)
            return data
            
        } catch (error) {
            console.error(`❌ Error refreshing data for ${apiName}:`, error)
            refreshColor.value = 'negative'
            $q.notify({
                type: 'negative',
                message: 'Något gick fel under uppdateringen'
            })
            
            onError?.(error)
            throw error
        } finally {
            loading.value = false
            console.timeEnd(`🔄 RefreshData ${apiName}`)
        }
    }

    return {
        loading: readonly(loading),
        refreshColor: readonly(refreshColor),
        loadData,
        refreshData
    }
}