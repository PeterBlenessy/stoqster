import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import localforage from 'localforage'
import { 
  parseZipFileName, 
  formatQuarterForDisplay,
  compareQuarters 
} from '../api/fiHistoricalUtils.js'
import {
  getLocalStorage,
  setLocalStorage,
  removeLocalStorage,
  FI_STORAGE_KEYS
} from '../composables/useLocalStorageState.js'

export const useFIStore = defineStore('fi', () => {
  console.log('🔄 Initializing FI store')

  // Guards to prevent recursive operations
  const isInitializing = ref(false)
  const isLoadingData = ref(false)
  const isUpdatingState = ref(false) // New guard for state updates

  // Core data state
  const funds = ref([])
  const holdings = ref([])
  const lastUpdated = ref(null)
  
  // Sanitize import data to fix undefined strings from JSON serialization
  const sanitizeImportData = (imports) => {
    if (!Array.isArray(imports)) return []
    
    return imports.map(imp => ({
      ...imp,
      // Convert string "undefined" back to actual undefined/null
      sourceUrl: imp.sourceUrl === 'undefined' ? null : imp.sourceUrl,
      fileName: imp.fileName === 'undefined' ? null : imp.fileName,
      sourceDate: imp.sourceDate === 'undefined' ? null : imp.sourceDate,
      importedAt: imp.importedAt === 'undefined' ? null : imp.importedAt
    }))
  }

  // Historical tracking state - Initialize from localStorage with sanitization
  const imports = ref(sanitizeImportData(getLocalStorage(FI_STORAGE_KEYS.IMPORT_METADATA, [])))
  
  // SELECTION state - ONLY for controlling which quarters to display/view
  // This is COMPLETELY INDEPENDENT of import operation state
  // A quarter can be selected regardless of whether it's importing, imported, or available
  const selectedQuarters = ref(getLocalStorage(FI_STORAGE_KEYS.SELECTED_QUARTERS, []))
  
  const isLoadingHistorical = ref(false)
  const error = ref(null)
  
  // IMPORT OPERATION state - ONLY for tracking import progress and operations
  // This is COMPLETELY INDEPENDENT of which quarters are selected for viewing
  // A quarter can be importing whether it's selected for viewing or not
  // Using reactive object instead of Map for better Vue reactivity tracking
  const quarterStatesData = getLocalStorage(FI_STORAGE_KEYS.QUARTER_STATES, {})
  const quarterStates = ref(quarterStatesData) // Use object instead of Map for better reactivity

  // Persistence flag to prevent watcher from triggering during initial load
  const isLoadingFromStorage = ref(false)

  // LocalForage instances - organized by quarters
  const fundsStore = localforage.createInstance({
    name: 'stoqster',
    storeName: 'fi-funds'
  })
  
  const holdingsStore = localforage.createInstance({
    name: 'stoqster',
    storeName: 'fi-funds-holdings'
  })
  
  const importsStore = localforage.createInstance({
    name: 'stoqster',
    storeName: 'fi-imports'
  })
  
  const commonStore = localforage.createInstance({
    name: 'stoqster',
    storeName: 'fi-common'
  })

  // Helper function to persist import metadata to localStorage
  const persistImportMetadata = () => {
    if (isLoadingFromStorage.value) {
      console.log('⚠️ Skipping imports persistence during storage load')
      return
    }
    
    try {
      setLocalStorage(FI_STORAGE_KEYS.IMPORT_METADATA, imports.value)
      console.log(`✅ Import metadata persisted to localStorage (${imports.value.length} records)`)
    } catch (error) {
      console.error('❌ Failed to persist import metadata:', error)
    }
  }

  // Helper function to persist quarter states to localStorage
  const persistQuarterStates = () => {
    if (isLoadingFromStorage.value) {
      console.log('⚠️ Skipping quarter states persistence during storage load')
      return
    }
    
    try {
      // quarterStates is now an object, so we can persist it directly
      setLocalStorage(FI_STORAGE_KEYS.QUARTER_STATES, quarterStates.value)
      console.log(`✅ Quarter states persisted to localStorage (${Object.keys(quarterStates.value).length} states)`)
    } catch (error) {
      console.error('❌ Failed to persist quarter states:', error)
    }
  }

  // Helper function to persist selected quarters to localStorage
  const persistSelectedQuarters = () => {
    if (isLoadingFromStorage.value) {
      console.log('⚠️ Skipping selected quarters persistence during storage load')
      return
    }
    
    try {
      setLocalStorage(FI_STORAGE_KEYS.SELECTED_QUARTERS, selectedQuarters.value)
      console.log(`✅ Selected quarters persisted to localStorage (${selectedQuarters.value.length} quarters)`)
    } catch (error) {
      console.error('❌ Failed to persist selected quarters:', error)
    }
  }

  // Computed properties
  const availableQuarters = computed(() => {
    console.log('🔍 Computing availableQuarters, imports:', imports.value.length)
    
    // Force reactivity tracking of quarterStates object by accessing its keys
    // This ensures Vue knows to recompute when the object changes
    const quarterStatesKeys = Object.keys(quarterStates.value)
    console.log('🔍 QuarterStates keys for reactivity:', quarterStatesKeys.length)
    
    const result = imports.value
      .map(imp => {
        // Use the stored quarter directly - no calculation needed
        const quarter = imp.quarter
        
        // Get import operation state (independent of selection)
        // Force reactive access to the object property
        const importState = quarterStates.value[quarter] || {}
        
        // Determine data availability state (has data or not)
        const hasActualData = imp.recordCount > 0 && imp.importedAt !== null
        let dataState = hasActualData ? 'imported' : 'available'
        
        // Import operation state takes precedence for active operations
        // But doesn't override data state when operation is complete
        let finalState
        if (importState.state && ['downloading', 'extracting', 'importing', 'error'].includes(importState.state)) {
          // Active import operation or error state
          finalState = importState.state
        } else {
          // Use data state (imported/available)
          finalState = dataState
          
          // Safeguard: If data exists but state shows as non-imported, fix the state
          if (hasActualData && finalState !== 'imported') {
            console.log(`🔧 Correcting state for ${quarter}: data exists but state is ${finalState}, setting to imported`)
            finalState = 'imported'
            // Clear any stale import operation state - update object property
            quarterStates.value[quarter] = {
              state: 'imported',
              progress: null,
              error: null
            }
          }
        }
        
        console.log(`📊 Quarter ${quarter}: recordCount=${imp.recordCount}, importedAt=${imp.importedAt}, importState=${importState.state}, dataState=${dataState}, finalState=${finalState}`)
        
        return {
          quarter: quarter,
          label: formatQuarterForDisplay(quarter),
          recordCount: imp.recordCount || 0,
          holdingsCount: imp.holdingsCount || 0,
          importedAt: imp.importedAt,
          publishedDate: imp.sourceDate, // Keep the publication date for reference
          sourceDate: imp.sourceDate, // Also as sourceDate for consistency
          url: imp.sourceUrl, // ZIP file URL for downloading
          fileName: imp.fileName, // ZIP filename
          // Final state for UI display (combines data and import operation state)
          state: finalState,
          // Import operation details (for progress indicators)
          progress: importState.progress || null,
          error: importState.error || null,
          // Separate flags for complete clarity and independence
          isSelected: selectedQuarters.value.includes(quarter), // VIEWING state - independent of import
          hasData: hasActualData, // DATA availability state
          isImporting: ['downloading', 'extracting', 'importing'].includes(importState.state), // IMPORT operation state
          importState: importState.state || 'available' // Explicit import operation state
        }
      })
      .filter(item => item.quarter && item.quarter !== 'UNKNOWN' && item.quarter !== 'legacy') // Filter out items without valid quarters
      .sort((a, b) => compareQuarters(a.quarter, b.quarter)) // This already sorts newest first
    
    // Check for duplicates
    const quarterCounts = {}
    result.forEach(item => {
      quarterCounts[item.quarter] = (quarterCounts[item.quarter] || 0) + 1
    })
    
    const duplicates = Object.entries(quarterCounts).filter(([quarter, count]) => count > 1)
    if (duplicates.length > 0) {
      console.log('⚠️ Found duplicate quarters:', duplicates)
      duplicates.forEach(([quarter, count]) => {
        console.log(`  - ${quarter}: ${count} entries`)
        const duplicateItems = result.filter(item => item.quarter === quarter)
        duplicateItems.forEach((item, index) => {
          console.log(`    ${index + 1}. recordCount=${item.recordCount}, state=${item.state}, importedAt=${item.importedAt}`)
        })
      })
    }
    
    console.log('🔍 Available quarters computed:', result.map(r => `${r.quarter} (${r.label}) - ${r.recordCount} fonder [${r.state}]`))
    return result
  })

  const latestQuarter = computed(() => {
    const quarters = availableQuarters.value
    return quarters.length > 0 ? quarters[0].quarter : null
  })

  const currentSourceDates = computed(() => {
    if (selectedQuarters.value.length === 0) {
      // Default to latest if nothing selected and data is available
      const latestImport = availableQuarters.value[0]
      return latestImport ? [latestImport.publishedDate] : []
    }
    
    // Map selected quarters to source dates (for backwards compatibility)
    return selectedQuarters.value.map(quarter => {
      const importData = availableQuarters.value.find(imp => imp.quarter === quarter)
      return importData ? importData.publishedDate : null
    }).filter(Boolean)
  })

  const currentQuarters = computed(() => {
    if (selectedQuarters.value.length === 0) {
      // Default to latest quarter if available
      const quarters = availableQuarters.value
      return quarters.length > 0 ? [quarters[0].quarter] : []
    }
    return selectedQuarters.value
  })

  const isMultiQuarterView = computed(() => {
    return currentSourceDates.value.length > 1
  })

  const currentViewLabel = computed(() => {
    if (selectedQuarters.value.length === 0) {
      return 'Senaste data'
    } else if (selectedQuarters.value.length === 1) {
      const quarter = selectedQuarters.value[0]
      return formatQuarterForDisplay(quarter)
    } else {
      return `${selectedQuarters.value.length} kvartal valda`
    }
  })

  /**
   * Initialize store by loading imports list and latest data
   */
  const initialize = async () => {
    // Prevent recursive initialization
    if (isInitializing.value) {
      console.log('⚠️ Already initializing FI store, skipping')
      return
    }
    
    try {
      isInitializing.value = true
      console.log('🔄 Initializing FI store data')
      
      // Load imports list and selected quarters
      await loadImports()
      
      // Check if we have available quarters to work with
      if (availableQuarters.value.length === 0) {
        // Fallback to legacy data loading only if no historical data
        console.log('🔄 No historical data found, loading legacy data')
        await loadLegacyData()
        return
      }
      
      // Only auto-select if we have no persisted selection
      if (selectedQuarters.value.length === 0) {
        console.log('📋 No persisted quarters found, auto-selecting latest quarter')
        // Auto-select the latest quarter if nothing is persisted
        const latestImport = availableQuarters.value[0]
        selectedQuarters.value = [latestImport.quarter]
        persistSelectedQuarters() // Persist the auto-selection
        console.log('🎯 Auto-selected latest quarter:', latestImport.quarter)
      } else {
        console.log('✅ Using persisted quarters:', selectedQuarters.value)
      }
      
      // Load data for current selection
      await loadDataForQuarters()
      
      console.log('✅ FI store initialized')
    } catch (err) {
      console.error('❌ Failed to initialize FI store:', err)
      error.value = err.message
    } finally {
      isInitializing.value = false
    }
  }

  /**
   * Load available imports - now just validates localStorage state
   */
  const loadImports = async () => {
    try {
      console.log('🔄 Validating imports from localStorage')
      isLoadingFromStorage.value = true // Prevent persistence during initialization
      
      // Imports are already loaded from localStorage in state initialization
      console.log('📋 Imports loaded from localStorage:', imports.value.length)
      console.log('📋 Import quarters:', imports.value.map(imp => imp.quarter))
      
      // Selected quarters are already loaded from localStorage too
      console.log('📋 Selected quarters loaded from localStorage:', selectedQuarters.value)
      
      isLoadingFromStorage.value = false // Re-enable persistence
    } catch (err) {
      console.error('❌ Failed to validate imports:', err)
      isLoadingFromStorage.value = false // Re-enable persistence even on error
      throw err
    }
  }

  /**
   * Load legacy data (backwards compatibility)
   */
  const loadLegacyData = async () => {
    try {
      console.log('🔄 Loading legacy data for backwards compatibility')
      
      const legacyFunds = []
      const legacyHoldings = []
      
      // Load from existing stores
      await fundsStore.iterate((value, key) => {
        if (value && !value.sourceDate) {
          // Add default source date to legacy data
          legacyFunds.push({
            ...value,
            sourceDate: 'legacy',
            sourceQuarter: 'legacy',
            importedAt: new Date().toISOString()
          })
        }
      })
      
      await holdingsStore.iterate((value, key) => {
        if (Array.isArray(value)) {
          const enrichedHoldings = value.map(holding => ({
            ...holding,
            fundName: key,
            sourceDate: 'legacy',
            sourceQuarter: 'legacy',
            importedAt: new Date().toISOString()
          }))
          legacyHoldings.push(...enrichedHoldings)
        }
      })
      
      funds.value = legacyFunds
      holdings.value = legacyHoldings
      
      console.log('✅ Loaded legacy data:', {
        funds: legacyFunds.length,
        holdings: legacyHoldings.length
      })
    } catch (err) {
      console.error('❌ Failed to load legacy data:', err)
      throw err
    }
  }

  /**
   * Load data for selected quarters (supports multiple quarters)
   */
  const loadDataForQuarters = async (quarters = null) => {
    // Prevent recursive data loading
    if (isLoadingData.value) {
      console.log('⚠️ Already loading data, skipping to prevent recursion')
      return
    }
    
    try {
      isLoadingData.value = true
      isLoadingHistorical.value = true
      const quartersToLoad = quarters || currentQuarters.value
      
      console.log('🔄 Loading data for quarters:', quartersToLoad)
      
      if (quartersToLoad.length === 0) {
        // No quarters to load, clear data
        funds.value = []
        holdings.value = []
        return
      }
      
      // Load data for all selected quarters
      const allFunds = []
      const allHoldings = []
      
      for (const quarter of quartersToLoad) {
        const importData = availableQuarters.value.find(imp => imp.quarter === quarter)
        if (importData) {
          console.log(`📦 Loading data for quarter ${quarter}`)
          
          // Load funds for this quarter (using quarter-based key)
          const fundsKey = `funds-${quarter}`
          const sourceFunds = await fundsStore.getItem(fundsKey) || []
          
          // Load holdings for this quarter (using quarter-based key)
          const holdingsKey = `holdings-${quarter}`
          const sourceHoldings = await holdingsStore.getItem(holdingsKey) || []
          
          console.log(`📊 Raw data loaded for ${quarter}:`, {
            fundsKey,
            holdingsKey,
            rawFundsCount: sourceFunds.length,
            rawHoldingsCount: sourceHoldings.length
          })
          
          // Add quarter info to each record for multi-quarter display
          const enrichedFunds = sourceFunds.map(fund => ({
            ...fund,
            _displayQuarter: quarter, // For table display
            _quarter: quarter // For consistency
          }))
          
          const enrichedHoldings = sourceHoldings.map(holding => ({
            ...holding,
            _displayQuarter: quarter, // For table display
            _quarter: quarter // For consistency
          }))
          
          allFunds.push(...enrichedFunds)
          allHoldings.push(...enrichedHoldings)
          
          console.log(`✅ Loaded ${enrichedFunds.length} funds and ${enrichedHoldings.length} holdings for ${quarter}`)
        } else {
          console.warn(`⚠️ No import data found for quarter: ${quarter}`)
        }
      }
      
      funds.value = allFunds
      holdings.value = allHoldings
      
      console.log('✅ Total loaded data:', {
        quarters: quartersToLoad,
        totalFunds: allFunds.length,
        totalHoldings: allHoldings.length
      })
      
    } catch (err) {
      console.error('❌ Failed to load data for quarters:', err)
      throw err
    } finally {
      isLoadingHistorical.value = false
      isLoadingData.value = false
    }
  }

  /**
   * Save new historical import
   */
  const saveHistoricalImport = async (zipUrl, zipFileName, fundsData, holdingsData) => {
    try {
      console.log('💾 Saving historical import')
      
      // Parse ZIP filename for metadata
      const zipMetadata = parseZipFileName(zipFileName)
      const quarter = zipMetadata.quarter // Use quarter as primary key
      const sourceDate = zipMetadata.sourceDate // Keep as metadata only
      const importedAt = new Date().toISOString()
      
      // Check if we already have this quarter
      const existingImport = imports.value.find(
        imp => imp.quarter === quarter
      )
      
      if (existingImport) {
        console.log('⚠️ Quarter already exists, updating:', quarter)
      }
      
      // Enrich funds data with quarter metadata
      const enrichedFunds = fundsData.map(fund => ({
        ...fund,
        _quarter: quarter,
        _sourceDate: sourceDate, // Publication date as metadata
        _importedAt: importedAt,
        _displayQuarter: formatQuarterForDisplay(quarter)
      }))
      
      // Enrich holdings data with quarter metadata  
      const enrichedHoldings = holdingsData.map(holding => ({
        ...holding,
        _quarter: quarter,
        _sourceDate: sourceDate, // Publication date as metadata
        _importedAt: importedAt,
        _displayQuarter: formatQuarterForDisplay(quarter)
      }))
      
      // Use quarter-based keys instead of date-based keys
      const fundsKey = `funds-${quarter}` // e.g., "funds-2025Q1"
      const holdingsKey = `holdings-${quarter}` // e.g., "holdings-2025Q1"
      
      // Store all funds for this quarter as a single record
      await fundsStore.setItem(fundsKey, enrichedFunds)
      
      // Store all holdings for this quarter as a single record  
      await holdingsStore.setItem(holdingsKey, enrichedHoldings)
      
      // Create import record with quarter as primary identifier
      const importRecord = {
        quarter: quarter, // Primary identifier  
        sourceDate: sourceDate, // Publication date (metadata)
        sourceUrl: zipUrl,
        fileName: zipFileName,
        importedAt,
        recordCount: enrichedFunds.length,
        holdingsCount: enrichedHoldings.length
      }
      
      // Save import record using importId as key for consistency
      console.log('💾 Saving data to stores:', {
        fundsKey,
        holdingsKey,
        fundsCount: enrichedFunds.length,
        holdingsCount: enrichedHoldings.length,
        quarter: quarter
      })
      
      // Don't save to importsStore here - watcher will handle persistence
      
      // Verify data was saved
      const savedFunds = await fundsStore.getItem(fundsKey)
      const savedHoldings = await holdingsStore.getItem(holdingsKey)
      console.log('✅ Data saved verification:', {
        fundsKey,
        savedFundsCount: savedFunds?.length || 0,
        savedHoldingsCount: savedHoldings?.length || 0
      })
      
      // Update quarter state to imported BEFORE updating imports
      quarterStates.value[quarter] = {
        state: 'imported',
        progress: null,
        error: null
      }
      
      // Update imports list (watcher will persist to localStorage)
      const updatedImports = imports.value.filter(
        imp => imp.quarter !== quarter
      )
      updatedImports.push(importRecord)
      imports.value = updatedImports.sort((a, b) => 
        compareQuarters(a.quarter, b.quarter) // Sort by quarter, newest first (compareQuarters already does this)
      )
      
      // Update current data if no quarters are selected
      if (selectedQuarters.value.length === 0) {
        selectedQuarters.value = [quarter]
        funds.value = enrichedFunds
        holdings.value = enrichedHoldings
      }
      
      console.log('✅ Historical import saved successfully:', {
        quarter: quarter,
        sourceDate: sourceDate,
        funds: enrichedFunds.length,
        holdings: enrichedHoldings.length,
        stateUpdated: true
      })
      
      return importRecord
      
    } catch (err) {
      console.error('❌ Failed to save historical import:', err)
      throw err
    }
  }

  /**
   * Check if quarter already exists in imports AND has actual data
   */
  const hasQuarter = async (quarter) => {
    // First check if import record exists
    const importExists = imports.value.some(imp => imp.quarter === quarter)
    
    if (!importExists) {
      return false
    }
    
    // Check if actual data exists in storage
    try {
      const fundsKey = `funds-${quarter}`
      const holdingsKey = `holdings-${quarter}`
      
      const fundsData = await fundsStore.getItem(fundsKey)
      const holdingsData = await holdingsStore.getItem(holdingsKey)
      
      const hasData = fundsData && Array.isArray(fundsData) && fundsData.length > 0
      
      console.log(`🔍 Checking quarter ${quarter}:`, {
        importExists,
        fundsCount: fundsData?.length || 0,
        holdingsCount: holdingsData?.length || 0,
        hasData
      })
      
      return hasData
    } catch (error) {
      console.error('❌ Error checking quarter data:', quarter, error)
      return false
    }
  }

  /**
   * Check if source date already exists (backwards compatibility - delegates to quarter check)
   */
  const hasSourceDate = async (sourceDate) => {
    // Find the import with this source date and check its quarter
    const importRecord = imports.value.find(imp => imp.sourceDate === sourceDate)
    if (!importRecord || !importRecord.quarter) {
      return false
    }
    
    // Delegate to quarter check
    return await hasQuarter(importRecord.quarter)
  }

  /**
   * Get import record for quarter
   */
  const getImportByQuarter = (quarter) => {
    return imports.value.find(imp => imp.quarter === quarter) || null
  }

  /**
   * Get import record by source date (backwards compatibility)
   */
  const getImportBySourceDate = (sourceDate) => {
    return imports.value.find(imp => imp.sourceDate === sourceDate) || null
  }

  /**
   * Load data for specific source date (kept for backwards compatibility)
   */
  const loadDataForSourceDate = async (sourceDate) => {
    if (!sourceDate || sourceDate === 'legacy') {
      await loadLegacyData()
      return
    }

    try {
      isLoadingHistorical.value = true
      console.log('🔄 Loading data for source date:', sourceDate)
      
      // Load funds for this source date
      const fundsKey = `funds-${sourceDate}`
      const sourceFunds = await fundsStore.getItem(fundsKey) || []
      
      // Load holdings for this source date
      const holdingsKey = `holdings-${sourceDate}`
      const sourceHoldings = await holdingsStore.getItem(holdingsKey) || []
      
      funds.value = sourceFunds
      holdings.value = sourceHoldings
      
      console.log('✅ Loaded data for source date:', {
        sourceDate,
        funds: sourceFunds.length,
        holdings: sourceHoldings.length
      })
      
    } catch (err) {
      console.error('❌ Failed to load data for source date:', sourceDate, err)
      throw err
    } finally {
      isLoadingHistorical.value = false
    }
  }

  /**
   * Set selected quarters for data viewing (independent of import operations)
   * This only controls which quarters are displayed - has no effect on import operations
   */
  const setSelectedQuarters = async (quarters) => {
    // Prevent recursive quarter updates
    if (isLoadingData.value) {
      console.log('⚠️ Already loading data, skipping quarter update')
      return
    }
    
    console.log('🔄 Setting selected quarters for VIEWING:', quarters)
    const newQuarters = quarters || []
    
    // Only update if there's actually a change
    const currentQuartersString = selectedQuarters.value.sort().join(',')
    const newQuartersString = newQuarters.sort().join(',')
    
    if (currentQuartersString === newQuartersString) {
      console.log('⚠️ No change in selected quarters, skipping')
      return
    }
    
    selectedQuarters.value = newQuarters
    
    // Watcher will handle persistence automatically
    
    // Reload data for the new selection (only affects data display)
    await loadDataForQuarters(newQuarters)
    
    console.log('✅ Selected quarters updated and persisted (VIEWING only):', {
      quarters: selectedQuarters.value,
      fundsLoaded: funds.value.length,
      holdingsLoaded: holdings.value.length
    })
  }

  /**
   * Clear all historical data (for debugging)
   */
  const clearAllData = async () => {
    try {
      console.log('🧹 Clearing all FI historical data...')
      
      // Clear all stores
      await Promise.all([
        fundsStore.clear(),
        holdingsStore.clear(),
        importsStore.clear()
      ])
      
      // Clear in-memory state
      funds.value = []
      holdings.value = []
      imports.value = []
      selectedQuarters.value = []
      
      console.log('✅ All FI data cleared')
    } catch (err) {
      console.error('❌ Failed to clear data:', err)
      throw err
    }
  }

  /**
   * Set quarter import operation state (completely independent of selection state)
   * This ONLY tracks import progress - has NO effect on quarter selection
   * A quarter can be selected AND importing simultaneously
   */
  const setQuarterState = (quarter, state, progress = null, error = null) => {
    // Prevent recursive state updates
    if (isUpdatingState.value) {
      console.log(`⚠️ Preventing recursive state update for ${quarter}`)
      return
    }
    
    try {
      isUpdatingState.value = true
      
      console.log(`🔄 [Store] Setting quarter ${quarter} state to: ${state} (was: ${quarterStates.value[quarter]?.state || 'undefined'})`)
      
      quarterStates.value[quarter] = {
        state, // 'available', 'downloading', 'extracting', 'importing', 'imported', 'error'
        progress,
        error,
        updatedAt: new Date().toISOString()
      }
      
      console.log(`✅ [Store] Quarter ${quarter} IMPORT operation state updated: ${state}${progress ? ` (${progress.current}/${progress.total})` : ''} [Selection state unchanged]`)
      console.log(`🔍 [Store] Current quarterStates object keys:`, Object.keys(quarterStates.value))
      
      // The watcher will automatically persist to localStorage
    } finally {
      isUpdatingState.value = false
    }
  }

  /**
   * Get quarter import operation state (completely independent of selection state)
   * Returns the import/operation state only - not related to whether quarter is selected
   */
  const getQuarterState = (quarter) => {
    return quarterStates.value[quarter] || { state: 'available' }
  }

  /**
   * Scrape FI website for quarter metadata only (no downloads)
   */
  const refreshQuarterMetadata = async () => {
    console.time('fiRefreshQuarterMetadata')
    console.log('🔄 Refreshing quarter metadata from FI website')
    
    try {
      // Import fetch here to use in store context
      const { fetch } = await import('@tauri-apps/plugin-http')
      const { extractFileNameFromUrl, parseZipFileName } = await import('../api/fiHistoricalUtils.js')
      
      // Scrape FI webpage for ZIP files
      const response = await fetch('https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/')
      if (!response.ok) {
        throw new Error(`Failed to fetch FI page: ${response.status}`)
      }

      const text = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/html')
      const table = doc.getElementsByTagName('tbody')[0]
      const aList = table.querySelectorAll('tr td:first-child a')

      // Process all ZIP file links
      const foundQuarters = []
      for (const a of aList) {
        try {
          const url = 'https://www.fi.se' + a.pathname + a.search
          const fileName = extractFileNameFromUrl(url)
          const zipMetadata = parseZipFileName(fileName)
          
          foundQuarters.push({
            quarter: zipMetadata.quarter,
            sourceDate: zipMetadata.sourceDate,
            url: url,
            fileName: fileName,
            recordCount: 0, // Will be updated after import
            holdingsCount: 0,
            importedAt: null // Not imported yet
          })
        } catch (error) {
          console.warn('⚠️ Could not parse ZIP filename:', a.pathname, error)
        }
      }

      console.log(`🌐 Found ${foundQuarters.length} quarters on FI website`)

      // Update imports with new metadata (preserve existing import records)
      let updatedCount = 0
      let newCount = 0
      
      for (const quarterInfo of foundQuarters) {
        const existingImport = imports.value.find(imp => imp.quarter === quarterInfo.quarter)
        
        if (existingImport) {
          // Update existing import with latest URL/filename if needed
          if (existingImport.sourceUrl !== quarterInfo.url || existingImport.fileName !== quarterInfo.fileName) {
            // Ensure we have a valid importId (for legacy records that might not have one)
            const importId = existingImport.importId || `import-${quarterInfo.quarter}-${quarterInfo.sourceDate}`
            
            const updatedImport = {
              ...existingImport,
              importId: importId, // Ensure importId is set
              sourceUrl: quarterInfo.url,
              fileName: quarterInfo.fileName,
              updatedAt: new Date().toISOString()
            }
            
            // Update specific import record efficiently
            const importIndex = imports.value.findIndex(imp => imp.quarter === quarterInfo.quarter)
            if (importIndex !== -1) {
              imports.value[importIndex] = updatedImport
              // Watcher will persist this change
            }
            updatedCount++
            console.log(`🔄 Updated metadata for ${quarterInfo.quarter}`)
          }
        } else {
          // Add new quarter to imports
          const quarter = quarterInfo.quarter
          const newImport = {
            quarter: quarter,
            sourceDate: quarterInfo.sourceDate,
            sourceUrl: quarterInfo.url,
            fileName: quarterInfo.fileName,
            recordCount: 0, // Not imported yet
            holdingsCount: 0,
            importedAt: null, // Not imported yet
            createdAt: new Date().toISOString()
          }
          
          // Add to reactive store (watcher will persist)
          imports.value.push(newImport)
          imports.value.sort((a, b) => compareQuarters(a.quarter, b.quarter))
          newCount++
          console.log(`✅ Added new quarter metadata: ${quarterInfo.quarter}`)
        }
      }

      // No need to reload imports - watcher will persist changes to IndexedDB

      console.timeEnd('fiRefreshQuarterMetadata')
      console.log(`✅ Quarter metadata refresh completed: ${newCount} new, ${updatedCount} updated`)
      
      return {
        newQuarters: newCount,
        updatedQuarters: updatedCount,
        totalQuarters: foundQuarters.length
      }
      
    } catch (error) {
      console.error('❌ Failed to refresh quarter metadata:', error)
      throw error
    }
  }

  /**
   * Delete quarter data (preserve metadata and maintain complete independence from selection)
   * This only removes the actual data - has NO effect on selection or viewing state
   * A quarter can remain selected for viewing even after its data is deleted
   */
  const deleteQuarterData = async (quarter) => {
    try {
      console.log(`🗑️ Deleting data for quarter: ${quarter} (selection state completely independent)`)
      
      // Remove from IndexedDB
      await fundsStore.removeItem(`funds-${quarter}`)
      await holdingsStore.removeItem(`holdings-${quarter}`)
      
      // Update import operation state to available (data no longer exists)
      quarterStates.value[quarter] = {
        state: 'available',
        progress: null,
        error: null
      }
      console.log(`🔄 Quarter ${quarter} import state reset to 'available' (selection state unchanged)`)
      
      // Update import record in reactive store (don't reload from IndexedDB)
      const importIndex = imports.value.findIndex(imp => imp.quarter === quarter)
      if (importIndex !== -1) {
        const importRecord = imports.value[importIndex]
        const updatedRecord = {
          ...importRecord, // Preserve all existing metadata including sourceUrl and fileName
          recordCount: 0, // Reset to 0 to indicate no data
          holdingsCount: 0, // Reset to 0 to indicate no data
          importedAt: null, // Clear importedAt to indicate not imported
          deletedAt: new Date().toISOString()
        }
        
        // Update the reactive store immediately (watcher will persist)
        imports.value[importIndex] = updatedRecord
        
        console.log(`📝 Reset import record for ${quarter}:`, {
          recordCount: updatedRecord.recordCount,
          importedAt: updatedRecord.importedAt,
          sourceUrl: updatedRecord.sourceUrl, // Log sourceUrl to verify it's preserved
          fileName: updatedRecord.fileName
        })
      }
      
      // IMPORTANT: We DON'T automatically remove from selectedQuarters
      // The user can keep viewing the quarter (it will just show no data)
      // This maintains complete independence between viewing and data state
      console.log(`🎯 Quarter ${quarter} remains in selection if selected (showing empty data)`)
      
      // Reload data for current selection (will show empty data for deleted quarter if selected)
      if (selectedQuarters.value.length > 0) {
        await loadDataForQuarters()
        console.log(`📊 Reloaded data for selected quarters (${quarter} will show empty if selected)`)
      } else {
        // Clear funds and holdings if no quarters selected
        funds.value = []
        holdings.value = []
      }
      
      console.log(`✅ Quarter ${quarter} data deleted (selection state completely preserved and independent)`)
      
    } catch (error) {
      console.error(`❌ Failed to delete quarter ${quarter}:`, error)
      throw error
    }
  }

  /**
   * Helper function to check if a quarter is selected for viewing
   * This is completely independent of import state
   */
  const isQuarterSelected = (quarter) => {
    return selectedQuarters.value.includes(quarter)
  }

  /**
   * Helper function to check if a quarter is currently being imported
   * This is completely independent of selection state
   */
  const isQuarterImporting = (quarter) => {
    const state = quarterStates.value[quarter]
    return state && ['downloading', 'extracting', 'importing'].includes(state.state)
  }

  /**
   * Helper function to check if a quarter has imported data
   * This is based on actual data availability, not operation state
   */
  const hasQuarterData = (quarter) => {
    const importRecord = imports.value.find(imp => imp.quarter === quarter)
    return importRecord && importRecord.recordCount > 0 && importRecord.importedAt !== null
  }

  /**
   * Helper function to get complete quarter status for debugging
   * Shows all three independent states clearly
   */
  const getQuarterStatus = (quarter) => {
    return {
      quarter,
      // Viewing state (independent)
      isSelected: isQuarterSelected(quarter),
      // Data state (independent) 
      hasData: hasQuarterData(quarter),
      // Import operation state (independent)
      isImporting: isQuarterImporting(quarter),
      importState: getQuarterState(quarter),
      // Summary for debugging
      canImport: !hasQuarterData(quarter) && !isQuarterImporting(quarter),
      canDelete: hasQuarterData(quarter) && !isQuarterImporting(quarter),
      canSelect: true // Can always select for viewing regardless of other states
    }
  }

  /**
   * Debug function to inspect storage state
   */
  const debugStorageState = async () => {
    try {
      console.log('🔍 === STORAGE DEBUG STATE ===')
      
      // Check selected quarters in storage
      const storedQuarters = await commonStore.getItem('selectedQuarters')
      console.log('📋 Stored selected quarters:', storedQuarters)
      
      // Check current in-memory state
      console.log('💭 In-memory selected quarters:', selectedQuarters.value)
      
      // Check available imports
      console.log('📦 Available imports:', imports.value.map(imp => ({
        quarter: imp.quarter,
        recordCount: imp.recordCount,
        state: imp.state,
        importedAt: imp.importedAt
      })))
      
      // Check quarter states
      console.log('🎯 Quarter states:')
      Object.entries(quarterStates.value).forEach(([quarter, state]) => {
        console.log(`  ${quarter}:`, state)
      })
      
      console.log('🔍 === END STORAGE DEBUG ===')
      
      return {
        storedQuarters,
        inMemoryQuarters: selectedQuarters.value,
        imports: imports.value,
        quarterStatesEntries: Object.entries(quarterStates.value)
      }
    } catch (error) {
      console.error('❌ Debug storage state failed:', error)
      return { error: error.message }
    }
  }

  /**
   * Debug function to inspect localStorage state (call from browser console)
   */
  const debugLocalStorageState = () => {
    try {
      console.log('🔍 === LOCALSTORAGE DEBUG STATE ===')
      
      // Check all FI-related localStorage keys
      const keys = Object.values(FI_STORAGE_KEYS)
      for (const key of keys) {
        const value = getLocalStorage(key, null)
        console.log(`📋 ${key}:`, value)
      }
      
      // Check current in-memory state
      console.log('💭 In-memory state:')
      console.log('  - imports:', imports.value.length, 'records')
      console.log('  - selectedQuarters:', selectedQuarters.value)
      console.log('  - quarterStates:', Object.entries(quarterStates.value))
      
      console.log('🔍 === END LOCALSTORAGE DEBUG ===')
      
      return {
        localStorage: keys.reduce((acc, key) => {
          acc[key] = getLocalStorage(key, null)
          return acc
        }, {}),
        inMemory: {
          imports: imports.value,
          selectedQuarters: selectedQuarters.value,
          quarterStates: Object.entries(quarterStates.value)
        }
      }
    } catch (error) {
      console.error('❌ Debug localStorage state failed:', error)
      return { error: error.message }
    }
  }

  // Watchers for automatic localStorage persistence
  watch(imports, () => {
    if (!isLoadingFromStorage.value && !isUpdatingState.value) {
      persistImportMetadata()
    }
  }, { deep: true })

  watch(selectedQuarters, () => {
    if (!isLoadingFromStorage.value && !isUpdatingState.value) {
      persistSelectedQuarters()
    }
  }, { deep: true })

  watch(quarterStates, () => {
    if (!isLoadingFromStorage.value && !isUpdatingState.value) {
      persistQuarterStates()
    }
  }, { deep: true })

  return {
    // State
    funds,
    holdings,
    lastUpdated,
    imports,
    selectedQuarters,
    isLoadingHistorical,
    error,
    quarterStates,
    
    // Computed
    availableQuarters,
    latestQuarter,
    currentSourceDates,
    currentQuarters,
    isMultiQuarterView,
    currentViewLabel,
    
    // Actions
    initialize,
    loadImports,
    persistSelectedQuarters,
    loadDataForQuarters,
    loadDataForSourceDate,
    setSelectedQuarters,
    saveHistoricalImport,
    hasQuarter,
    hasSourceDate,
    getImportByQuarter,
    getImportBySourceDate,
    
    // Data management
    clearAllData,
    
    // UX improvements - Phase 1
    setQuarterState,
    getQuarterState,
    refreshQuarterMetadata,
    deleteQuarterData,
    
    // State independence helpers
    isQuarterSelected,
    isQuarterImporting,
    hasQuarterData,
    getQuarterStatus,
    
    // Debug functions
    debugStorageState,
    debugLocalStorageState,
    
    // Store instances (for debugging)
    fundsStore,
    holdingsStore,
    importsStore,
    commonStore
  }
})
