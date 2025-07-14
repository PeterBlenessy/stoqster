# Storage Architecture Best Practices

## Overview

This document outlines the critical storage architecture decisions for Stoqster that prevent race conditions and ensure reliable state management.

## The Problem with Async Storage for UI State

Using IndexedDB for small UI state (like selected quarters, dropdown state, component preferences) creates several issues:

### Race Conditions
```javascript
// ❌ PROBLEMATIC: Async storage for UI state
const setSelectedQuarters = async (quarters) => {
  selectedQuarters.value = quarters  // UI updates immediately
  await storage.setItem('quarters', quarters)  // Persistence happens later
  // Problem: If component re-renders before persistence completes,
  // it might read old data from storage
}
```

### Timing Dependencies
- Component initialization might occur before data is persisted
- Watchers might trigger multiple times during async operations
- State consistency becomes dependent on async operation order

### Debugging Complexity
- State can appear correct in memory but wrong in storage
- Race conditions are intermittent and hard to reproduce
- Multiple async operations can overwrite each other

## The Solution: Storage Type by Data Characteristics

### **localStorage for UI State** ✅

Use localStorage for data that needs immediate, reliable persistence:

```javascript
// ✅ CORRECT: Synchronous storage for UI state
const setSelectedQuarters = (quarters) => {
  selectedQuarters.value = quarters
  setLocalStorage('fi-selectedQuarters', quarters) // Immediate persistence
  // UI and storage are always in sync
}
```

**Characteristics:**
- **Small data size** (< 10MB per domain)
- **Immediate persistence required** 
- **Simple data structures** (JSON-serializable)
- **High read frequency** (component initialization)
- **Critical for user experience** (selections, preferences)

**Examples:**
- Selected quarters/dates: `['2025Q1', '2024Q4']`
- Table state: `{ sortBy: 'name', filters: {...} }`
- User preferences: `{ darkMode: true, language: 'sv' }`
- Component state: `{ expanded: ['section1'], activeTab: 'details' }`

### **IndexedDB for Large Data** ✅

Use IndexedDB for data that benefits from async operations and querying:

```javascript
// ✅ CORRECT: Async storage for large datasets
const saveFundsData = async (quarter, fundsArray) => {
  // Large arrays are worth the async complexity
  await fundsStore.setItem(`funds-${quarter}`, fundsArray)
}
```

**Characteristics:**
- **Large data size** (> 1MB per record)
- **Complex data structures** (nested objects, arrays)
- **Bulk operations** (import/export)
- **Querying capabilities needed**
- **Not critical for immediate UI state**

**Examples:**
- Fund records: `Array<{ name, nav, holdings, ... }>`
- Holdings data: `Array<{ fundName, position, value, ... }>`
- API response caches: `{ timestamp, data: [...] }`
- Historical datasets: Time-series data

## Implementation Guidelines

### 1. State Initialization Pattern

```javascript
// ✅ Initialize from localStorage (synchronous)
export const useStore = defineStore('myStore', () => {
  // UI state from localStorage
  const selectedItems = ref(getLocalStorage('my-selectedItems', []))
  const preferences = ref(getLocalStorage('my-preferences', {}))
  
  // Large data loaded async when needed
  const largeDataset = ref([])
  
  const loadLargeData = async () => {
    const data = await indexedDBStore.getItem('large-dataset')
    largeDataset.value = data || []
  }
})
```

### 2. Persistence Watchers

```javascript
// ✅ Automatic localStorage persistence
watch(selectedItems, () => {
  setLocalStorage('my-selectedItems', selectedItems.value)
}, { deep: true })

// ✅ Manual IndexedDB persistence when needed
const saveLargeData = async () => {
  await indexedDBStore.setItem('large-dataset', largeDataset.value)
}
```

### 3. Storage Key Organization

```javascript
// localStorage keys - module prefixed, kebab-case
export const STORAGE_KEYS = {
  // UI state
  SELECTED_QUARTERS: 'fi-selectedQuarters',
  TABLE_PREFERENCES: 'fi-tablePreferences', 
  USER_SETTINGS: 'app-userSettings',
  
  // IndexedDB keys - descriptive with version/date
  FUNDS_DATA: (quarter) => `funds-${quarter}`,
  HOLDINGS_DATA: (quarter) => `holdings-${quarter}`,
  CACHE_DATA: (key) => `cache-${key}`
}
```

## Migration Strategy

When refactoring existing code:

### Step 1: Identify Data Type
```javascript
// Ask: Is this UI state or large data?
const data = ref([]) // What type of data?
const size = data.value.length // How large typically?
const usage = 'component initialization' // When is it accessed?
```

### Step 2: Choose Storage Type
```javascript
// Small, immediate UI state → localStorage
if (isUIState && sizeKB < 100 && needsImmediate) {
  useLocalStorage()
}

// Large datasets → IndexedDB  
if (isLargeData && sizeKB > 1000 && canBeAsync) {
  useIndexedDB()
}
```

### Step 3: Update Persistence
```javascript
// Before: Async for everything
await storage.setItem(key, value)

// After: Sync for UI state
setLocalStorage(key, value)

// After: Still async for large data
await indexedDBStore.setItem(key, largeArray)
```

## Benefits of This Architecture

### 1. **Eliminates Race Conditions**
- UI state persistence is immediate and synchronous
- No timing dependencies between components
- Predictable behavior across all scenarios

### 2. **Improves Performance**
- localStorage access is fast and synchronous
- IndexedDB only used where its benefits matter
- Reduced complexity in component lifecycle

### 3. **Simplifies Debugging**
- UI state easily inspected in DevTools Application tab
- Clear separation between immediate and async storage
- Consistent behavior across development and production

### 4. **Better User Experience**
- Selections and preferences persist immediately
- No flickering or temporary state loss
- Reliable state restoration on app restart

## Anti-Patterns to Avoid

### ❌ Using IndexedDB for Small UI State
```javascript
// WRONG: Creates race conditions
const selectedQuarters = ref([])
watch(selectedQuarters, async (newValue) => {
  await indexedDBStore.setItem('selected', newValue) // Async!
})
```

### ❌ Using localStorage for Large Data
```javascript
// WRONG: Poor performance and storage limits
const fundsData = ref([]) // Large array
localStorage.setItem('funds', JSON.stringify(fundsData.value)) // Too big!
```

### ❌ Mixed Storage for Related State
```javascript
// WRONG: Inconsistent persistence timing
setLocalStorage('ui-selection', selection) // Immediate
await indexedDB.setItem('ui-filters', filters) // Async - could fail!
```

## Code Review Action Items

### Storage Pattern Compliance Audit

The codebase should be reviewed to ensure all storage operations follow the localStorage vs IndexedDB pattern:

#### Areas to Review:
1. **Settings Store** (`settings-store.js`) - Verify user preferences use localStorage
2. **Update Store** (`update-store.js`) - Check update state persistence
3. **Component State** - Review table filters, sorting, column preferences in all components
4. **Watchlist Management** - Ensure watchlist data uses appropriate storage
5. **Market Data Settings** - Verify API keys and provider preferences storage
6. **IBIndex/FBIndex Components** - Check any persistent selections or state

#### Review Checklist:
- [ ] All UI state (selections, preferences, filters) uses localStorage
- [ ] Large datasets (funds, holdings, companies) use IndexedDB
- [ ] No mixed storage patterns for related state
- [ ] Consistent storage key naming conventions
- [ ] Proper error handling for storage operations
- [ ] Watchers use synchronous persistence for UI state

#### Migration Priority:
1. **High**: User preferences and settings (critical for UX)
2. **Medium**: Component state and selections (affects usability)
3. **Low**: Non-critical caches and temporary data

This review should be completed before any major new feature development to ensure architectural consistency.

---

## Conclusion

This dual storage architecture provides:
- **Immediate reliability** for UI state
- **Efficient handling** of large datasets  
- **Race-condition-free** state management
- **Predictable performance** characteristics

Follow these patterns to ensure robust, maintainable storage throughout Stoqster.
