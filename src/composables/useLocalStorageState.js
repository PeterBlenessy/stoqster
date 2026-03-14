/**
 * LocalStorage utilities for immediate, race-condition-free UI state persistence
 * Use localStorage for small state data that needs immediate persistence
 * Reserve IndexedDB for large datasets only
 */

/**
 * Get data from localStorage with JSON parsing
 * @param {string} key - The localStorage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} Parsed value or default
 */
export function getLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return defaultValue
  }
}

/**
 * Set data to localStorage with JSON stringification
 * @param {string} key - The localStorage key
 * @param {*} value - Value to store
 */
export function setLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error saving to localStorage key "${key}":`, error)
  }
}

/**
 * Remove data from localStorage
 * @param {string} key - The localStorage key
 */
export function removeLocalStorage(key) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error)
  }
}

/**
 * Check if key exists in localStorage
 * @param {string} key - The localStorage key
 * @returns {boolean} True if key exists
 */
export function hasLocalStorage(key) {
  return localStorage.getItem(key) !== null
}

/**
 * Clear all localStorage keys with a specific prefix
 * @param {string} prefix - The prefix to match
 */
export function clearLocalStorageByPrefix(prefix) {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.error(`Error clearing localStorage with prefix "${prefix}":`, error)
  }
}

// FI-specific localStorage key constants
export const FI_STORAGE_KEYS = {
  SELECTED_QUARTERS: 'fi-selectedQuarters',
  QUARTER_STATES: 'fi-quarterStates',
  IMPORT_PROGRESS: 'fi-importProgress',
  IMPORT_METADATA: 'fi-importMetadata',
  UI_PREFERENCES: 'fi-uiPreferences'
}
