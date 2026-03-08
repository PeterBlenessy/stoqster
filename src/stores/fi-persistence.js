import { watch } from 'vue'
import {
    getLocalStorage,
    setLocalStorage,
    removeLocalStorage,
    FI_STORAGE_KEYS
} from '../composables/useLocalStorageState.js'

/**
 * Sanitize import data to fix "undefined" strings from JSON serialization
 */
export function sanitizeImportData(imports) {
    if (!Array.isArray(imports)) return []

    return imports.map(imp => ({
        ...imp,
        sourceUrl: imp.sourceUrl === 'undefined' ? null : imp.sourceUrl,
        fileName: imp.fileName === 'undefined' ? null : imp.fileName,
        sourceDate: imp.sourceDate === 'undefined' ? null : imp.sourceDate,
        importedAt: imp.importedAt === 'undefined' ? null : imp.importedAt
    }))
}

/**
 * Load initial state from localStorage
 */
export function loadPersistedState() {
    return {
        imports: sanitizeImportData(getLocalStorage(FI_STORAGE_KEYS.IMPORT_METADATA, [])),
        selectedQuarters: getLocalStorage(FI_STORAGE_KEYS.SELECTED_QUARTERS, []),
        quarterStates: getLocalStorage(FI_STORAGE_KEYS.QUARTER_STATES, {}),
    }
}

/**
 * Set up watchers that auto-persist reactive state to localStorage.
 * Returns a cleanup function (though Vue watchers auto-cleanup on unmount).
 */
export function setupPersistenceWatchers(refs, guards) {
    const { imports, selectedQuarters, quarterStates } = refs
    const { isLoadingFromStorage, isUpdatingState } = guards

    const shouldPersist = () => !isLoadingFromStorage.value && !isUpdatingState.value

    watch(imports, () => {
        if (shouldPersist()) {
            setLocalStorage(FI_STORAGE_KEYS.IMPORT_METADATA, imports.value)
        }
    }, { deep: true })

    watch(selectedQuarters, () => {
        if (shouldPersist()) {
            setLocalStorage(FI_STORAGE_KEYS.SELECTED_QUARTERS, selectedQuarters.value)
        }
    }, { deep: true })

    watch(quarterStates, () => {
        if (shouldPersist()) {
            setLocalStorage(FI_STORAGE_KEYS.QUARTER_STATES, quarterStates.value)
        }
    }, { deep: true })
}

/**
 * Clear all FI-related localStorage keys
 */
export function clearAllFIStorage() {
    Object.values(FI_STORAGE_KEYS).forEach(key => {
        removeLocalStorage(key)
    })
    try {
        localStorage.removeItem('fi-migration-progress')
    } catch {
        // Ignore if key doesn't exist
    }
}
