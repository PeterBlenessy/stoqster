import { ref, watch } from 'vue'

/**
 * Composable for managing table state (selection, columns, filtering)
 * Provides standardized table state management across components
 */
export function useTableState() {

    /**
     * Initialize table state management
     * @param {Object} params - Configuration object
     * @param {Array} params.initialColumns - Initial visible columns
     * @param {Object} params.watchlistStore - Pinia store ref for watchlist
     * @param {Object} params.visibleColumnsStore - Pinia store ref for visible columns
     * @returns {Object} - Table state management object
     */
    function createTableState({ 
        initialColumns = [], 
        watchlistStore = null, 
        visibleColumnsStore = null 
    }) {
        const selectedRows = ref([])
        const visibleColumns = ref([...initialColumns])
        const filter = ref('')

        /**
         * Update selected rows and sync with store
         * @param {Array} newSelection - New selection array
         */
        function onUpdateSelected(newSelection) {
            selectedRows.value = newSelection
            if (watchlistStore) {
                watchlistStore.value = newSelection
            }
        }

        /**
         * Restore selected rows from store
         */
        function restoreSelectedRows() {
            if (watchlistStore && watchlistStore.value) {
                selectedRows.value = watchlistStore.value
            }
        }

        /**
         * Restore visible columns from store
         */
        function restoreVisibleColumns() {
            if (visibleColumnsStore && visibleColumnsStore.value.length > 0) {
                visibleColumns.value = visibleColumnsStore.value
            }
        }

        /**
         * Initialize table state from stores
         */
        function initializeFromStores() {
            restoreSelectedRows()
            restoreVisibleColumns()
        }

        // Watch for changes in visible columns and sync with store
        if (visibleColumnsStore) {
            watch(
                visibleColumns,
                (newVal) => {
                    visibleColumnsStore.value = [...newVal]
                },
                { deep: true }
            )
        }

        return {
            selectedRows,
            visibleColumns,
            filter,
            onUpdateSelected,
            restoreSelectedRows,
            restoreVisibleColumns,
            initializeFromStores
        }
    }

    /**
     * Create watchlist toggle functionality for dashboard components
     * @param {Object} params - Configuration object
     * @param {Object} params.rows - Reactive rows array
     * @param {Object} params.watchlistStore - Pinia store ref for watchlist
     * @returns {Object} - Watchlist functionality
     */
    function createWatchlistFilter({ rows, watchlistStore }) {
        
        /**
         * Filter rows to show only watchlist items
         * @param {Array} allRows - All available rows
         * @returns {Array} - Filtered rows
         */
        function filterWatchlistRows(allRows) {
            if (!watchlistStore?.value || !Array.isArray(allRows)) {
                return allRows
            }

            const watchlistProducts = Object.values(watchlistStore.value).map(item => item.product)
            return allRows.filter(item => watchlistProducts.includes(item.product))
        }

        /**
         * Update watchlist with current row values
         * @param {Array} currentRows - Current row data
         */
        function updateWatchlistValues(currentRows) {
            if (watchlistStore?.value && Array.isArray(currentRows)) {
                watchlistStore.value = currentRows
            }
        }

        return {
            filterWatchlistRows,
            updateWatchlistValues
        }
    }

    return {
        createTableState,
        createWatchlistFilter
    }
}