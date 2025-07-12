import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import localforage from 'localforage'
import { 
  parseZipFileName, 
  generateImportId, 
  isValidSourceDate,
  formatQuarterForDisplay,
  compareQuarters 
} from '../api/fiHistoricalUtils.js'

export const useFIStore = defineStore('fi', () => {
  console.log('🔄 Initializing FI store')

  // Guards to prevent recursive operations
  const isInitializing = ref(false)
  const isLoadingData = ref(false)

  // Core data state
  const funds = ref([])
  const holdings = ref([])
  const lastUpdated = ref(null)
  
  // Historical tracking state
  const imports = ref([])
  const selectedQuarters = ref([]) // Changed to support multiple quarters
  const isLoadingHistorical = ref(false)
  const error = ref(null)

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

  // Computed properties
  const availableQuarters = computed(() => {
    const result = imports.value
      .map(imp => {
        // Use the stored quarter directly - no calculation needed
        const quarter = imp.quarter
        
        return {
          quarter: quarter,
          label: formatQuarterForDisplay(quarter),
          recordCount: imp.recordCount || 0,
          holdingsCount: imp.holdingsCount || 0,
          importedAt: imp.importedAt,
          publishedDate: imp.sourceDate // Keep the publication date for reference
        }
      })
      .filter(item => item.quarter && item.quarter !== 'UNKNOWN' && item.quarter !== 'legacy') // Filter out items without valid quarters
      .sort((a, b) => compareQuarters(a.quarter, b.quarter)) // This already sorts newest first
    
    console.log('🔍 Available quarters computed:', result.map(r => `${r.quarter} (${r.label}) - ${r.recordCount} fonder`))
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
      
      // Load imports list
      await loadImports()
      
      // Only auto-select if we have no current selection
      if (availableQuarters.value.length > 0 && selectedQuarters.value.length === 0) {
        // Auto-select the latest quarter if nothing is selected
        const latestImport = availableQuarters.value[0]
        selectedQuarters.value = [latestImport.quarter]
        console.log('🎯 Auto-selected latest quarter:', latestImport.quarter)
      }
      
      // Load data for current selection if we have one
      if (selectedQuarters.value.length > 0) {
        await loadDataForQuarters()
      } else if (availableQuarters.value.length === 0) {
        // Fallback to legacy data loading only if no historical data
        console.log('🔄 No historical data found, loading legacy data')
        await loadLegacyData()
      }
      
      console.log('✅ FI store initialized')
    } catch (err) {
      console.error('❌ Failed to initialize FI store:', err)
      error.value = err.message
    } finally {
      isInitializing.value = false
    }
  }

  /**
   * Load available imports from storage
   */
  const loadImports = async () => {
    try {
      const importsList = []
      
      await importsStore.iterate((value) => {
        if (value && value.quarter) {
          console.log('🔍 Found import:', {
            quarter: value.quarter,
            sourceDate: value.sourceDate,
            recordCount: value.recordCount
          })
          importsList.push(value)
        }
      })
      
      imports.value = importsList.sort((a, b) => 
        compareQuarters(a.quarter, b.quarter)
      )
      
      console.log('✅ Loaded imports:', imports.value.length)
      console.log('📋 Import quarters:', imports.value.map(imp => imp.quarter))
      
      // Debug: Show imports without quarters
      const importsWithoutQuarters = imports.value.filter(imp => !imp.quarter)
      if (importsWithoutQuarters.length > 0) {
        console.log('⚠️ Imports missing quarter:', importsWithoutQuarters.length)
        importsWithoutQuarters.forEach(imp => {
          console.log(`  - ${imp.sourceDate} (${imp.fileName || 'no filename'})`)
        })
      }
    } catch (err) {
      console.error('❌ Failed to load imports:', err)
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
      
      // Save import record using quarter as key
      console.log('💾 Saving data to stores:', {
        fundsKey,
        holdingsKey,
        fundsCount: enrichedFunds.length,
        holdingsCount: enrichedHoldings.length
      })
      
      await importsStore.setItem(quarter, importRecord)
      
      // Verify data was saved
      const savedFunds = await fundsStore.getItem(fundsKey)
      const savedHoldings = await holdingsStore.getItem(holdingsKey)
      console.log('✅ Data saved verification:', {
        fundsKey,
        savedFundsCount: savedFunds?.length || 0,
        savedHoldingsCount: savedHoldings?.length || 0
      })
      
      // Update imports list
      const updatedImports = imports.value.filter(
        imp => imp.quarter !== quarter
      )
      updatedImports.push(importRecord)
      imports.value = updatedImports.sort((a, b) => 
        compareQuarters(b.quarter, a.quarter) // Sort by quarter, newest first
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
        holdings: enrichedHoldings.length
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
   * Clean up incorrectly stored data (with source dates in keys)
   */
  const cleanupIncorrectData = async () => {
    try {
      console.log('🧹 Cleaning up incorrectly stored data with source dates in keys')
      let cleanedCount = 0
      
      // Clean up funds with source dates in keys
      const fundsToDelete = []
      await fundsStore.iterate((value, key) => {
        // If key contains a date pattern (YYYY-MM-DD), it's incorrectly stored
        if (key.includes('-20')) {
          fundsToDelete.push(key)
        }
      })
      
      for (const key of fundsToDelete) {
        await fundsStore.removeItem(key)
        cleanedCount++
      }
      
      // Clean up holdings with source dates in keys
      const holdingsToDelete = []
      await holdingsStore.iterate((value, key) => {
        // If key contains a date pattern (YYYY-MM-DD), it's incorrectly stored
        if (key.includes('-20')) {
          holdingsToDelete.push(key)
        }
      })
      
      for (const key of holdingsToDelete) {
        await holdingsStore.removeItem(key)
        cleanedCount++
      }
      
      console.log('✅ Cleanup complete:', cleanedCount, 'incorrect records removed')
      
    } catch (err) {
      console.error('❌ Failed to cleanup incorrect data:', err)
    }
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
   * Set selected quarters and load their data
   */
  const setSelectedQuarters = async (quarters) => {
    // Prevent recursive quarter updates
    if (isLoadingData.value) {
      console.log('⚠️ Already loading data, skipping quarter update')
      return
    }
    
    console.log('🔄 Setting selected quarters:', quarters)
    const newQuarters = quarters || []
    
    // Only update if there's actually a change
    const currentQuartersString = selectedQuarters.value.sort().join(',')
    const newQuartersString = newQuarters.sort().join(',')
    
    if (currentQuartersString === newQuartersString) {
      console.log('⚠️ No change in selected quarters, skipping')
      return
    }
    
    selectedQuarters.value = newQuarters
    
    // Reload data for the new selection
    await loadDataForQuarters(newQuarters)
    
    console.log('✅ Selected quarters updated:', {
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

  return {
    // State
    funds,
    holdings,
    lastUpdated,
    imports,
    selectedQuarters,
    isLoadingHistorical,
    error,
    
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
    loadDataForQuarters,
    loadDataForSourceDate,
    setSelectedQuarters,
    saveHistoricalImport,
    hasQuarter,
    hasSourceDate,
    getImportByQuarter,
    getImportBySourceDate,
    
    // Data management
    cleanupIncorrectData,
    clearAllData,
    
    // Store instances (for debugging)
    fundsStore,
    holdingsStore,
    importsStore,
    commonStore
  }
})
