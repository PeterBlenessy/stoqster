import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import localforage from 'localforage' // Only used for database upgrade cleanup
import { FIFundsDB } from '../db/fi-funds/FIFundsDB.js'
import { createQuery } from '../db/core/QueryBuilder.js'
import { transformFundData, transformHoldingData } from '../db/fi-funds/FITransformations.js'
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

    // NEW IndexedDB database instance for database upgrade architecture
    const fiFundsDB = new FIFundsDB()

    // Initialize the database
    fiFundsDB.initialize().catch(error => {
        console.error('❌ Failed to initialize FI Funds database:', error)
    })

    // Helper function to persist import metadata to localStorage
    const persistImportMetadata = () => {
        if (isLoadingFromStorage.value) {
            return
        }

        try {
            setLocalStorage(FI_STORAGE_KEYS.IMPORT_METADATA, imports.value)
        } catch (error) {
            console.error('❌ Failed to persist import metadata:', error)
        }
    }

    // Helper function to persist quarter states to localStorage
    const persistQuarterStates = () => {
        if (isLoadingFromStorage.value) {
            return
        }

        try {
            // quarterStates is now an object, so we can persist it directly
            setLocalStorage(FI_STORAGE_KEYS.QUARTER_STATES, quarterStates.value)
        } catch (error) {
            console.error('❌ Failed to persist quarter states:', error)
        }
    }

    // Helper function to persist selected quarters to localStorage
    const persistSelectedQuarters = () => {
        if (isLoadingFromStorage.value) {
            return
        }

        try {
            setLocalStorage(FI_STORAGE_KEYS.SELECTED_QUARTERS, selectedQuarters.value)
        } catch (error) {
            console.error('❌ Failed to persist selected quarters:', error)
        }
    }

    // Computed properties
    const availableQuarters = computed(() => {
        // Force reactivity tracking of quarterStates object by accessing its keys
        // This ensures Vue knows to recompute when the object changes
        const quarterStatesKeys = Object.keys(quarterStates.value)

        const result = imports.value
            .map(imp => {
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
                if (importState.state && ['downloading', 'extracting', 'importing', 'deleting', 'error'].includes(importState.state)) {
                    // Active import operation or error state
                    finalState = importState.state
                } else {
                    // Use data state (imported/available)
                    finalState = dataState
                }

                return {
                    quarter: quarter,
                    label: formatQuarterForDisplay(quarter),
                    recordCount: imp.recordCount || 0,
                    holdingsCount: imp.holdingsCount || 0,
                    importedAt: imp.importedAt,
                    publishedDate: imp.sourceDate, // Keep the publication date for reference
                    sourceDate: imp.sourceDate, // Also as sourceDate for consistency
                    sourceUrl: imp.sourceUrl, // ZIP file URL for downloading
                    fileName: imp.fileName, // ZIP filename
                    // Final state for UI display (combines data and import operation state)
                    state: finalState,
                    // Import operation details (for progress indicators)
                    progress: importState.progress || null,
                    error: importState.error || null,
                    // Separate flags for complete clarity and independence
                    isSelected: selectedQuarters.value.includes(quarter), // VIEWING state - independent of import
                    hasData: hasActualData, // DATA availability state
                    isImporting: ['downloading', 'extracting', 'importing', 'deleting'].includes(importState.state), // IMPORT operation state
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
            console.warn('⚠️ Found duplicate quarters:', duplicates.map(([q, c]) => `${q}:${c}`).join(', '))
        }

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
                console.log('ℹ️ No historical data found, starting with empty state')
                return
            }

            // Only auto-select if we have no persisted selection
            if (selectedQuarters.value.length === 0) {
                // No persisted quarters found, auto-selecting latest quarter
                // Auto-select the latest quarter if nothing is persisted
                const latestImport = availableQuarters.value[0]
                selectedQuarters.value = [latestImport.quarter]
                persistSelectedQuarters() // Persist the auto-selection
                // Auto-selected latest quarter: ${latestImport.quarter}
            } else {
                // Using persisted quarters from localStorage
            }

            // Load data for current selection
            await loadDataForQuarters(selectedQuarters.value)

            // Store initialized successfully
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
            isLoadingFromStorage.value = true // Prevent persistence during initialization

            // Imports are already loaded from localStorage in state initialization
            // Selected quarters are already loaded from localStorage too

            isLoadingFromStorage.value = false // Re-enable persistence
        } catch (err) {
            console.error('❌ Failed to validate imports:', err)
            isLoadingFromStorage.value = false // Re-enable persistence even on error
            throw err
        }
    }

    /**
     * Load data for selected quarters (supports multiple quarters)
     */
    const loadDataForQuarters = async (quarters) => {
        // Prevent recursive data loading
        if (isLoadingData.value) {
            console.log('⚠️ Already loading data, skipping to prevent recursion')
            return
        }

        try {
            isLoadingData.value = true
            isLoadingHistorical.value = true
            const quartersToLoad = quarters

            console.log('🔄 Loading data for quarters:', quartersToLoad)

            if (!quartersToLoad || quartersToLoad.length === 0) {
                // No quarters to load, clear data
                funds.value = []
                holdings.value = []
                return
            }

            // Load data for all selected quarters
            const allFunds = []

            for (const quarter of quartersToLoad) {
                const importData = availableQuarters.value.find(imp => imp.quarter === quarter)
                if (importData) {
                    // Load only fund data (no holdings) for efficient table display
                    const sourceFunds = await fiFundsDB.getQuarterSnapshot(quarter) || []

                    // Data already contains quarter and quarterDisplay fields from IndexedDB
                    // No need for object transformation - use data directly
                    allFunds.push(...sourceFunds)
                } else {
                    console.warn(`⚠️ No import data found for quarter: ${quarter}`)
                }
            }

            funds.value = allFunds
            holdings.value = [] // Clear holdings - they will be loaded on-demand when rows are expanded

            // Data loaded successfully for quarters: ${quartersToLoad.join(', ')}

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
            // Saving historical import data

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

            // Transform funds data before storing
            const transformedFunds = enrichedFunds.map(fund => {
                return transformFundData(fund)
            })

            // Transform holdings data before storing  
            const transformedHoldings = enrichedHoldings.map(holding => {
                // Use the fundISIN that was already added to the holding in ComponentFunds
                return transformHoldingData(holding, holding.fundISIN, quarter)
            })

            // Store data in the NEW IndexedDB database using bulk operations
            // Saving funds to IndexedDB
            await fiFundsDB.addFunds(transformedFunds)

            // Saving holdings to IndexedDB
            await fiFundsDB.addHoldings(transformedHoldings)

            // Create import record with quarter as primary identifier
            const importRecord = {
                quarter: quarter, // Primary identifier  
                sourceDate: sourceDate, // Publication date (metadata)
                sourceUrl: zipUrl,
                fileName: zipFileName,
                importedAt,
                recordCount: transformedFunds.length,
                holdingsCount: transformedHoldings.length
            }

            // Data saved to IndexedDB successfully

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
                funds.value = transformedFunds
                holdings.value = transformedHoldings
            }

            // Historical import saved successfully

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

        // Check if actual data exists in NEW IndexedDB storage
        try {
            // Check if funds exist for this quarter in the new IndexedDB
            const fundsData = await fiFundsDB.getQuarterSnapshot(quarter)

            const hasData = fundsData && Array.isArray(fundsData) && fundsData.length > 0

            // Checking quarter data in IndexedDB

            return hasData
        } catch (error) {
            console.error('❌ Error checking quarter data in IndexedDB:', quarter, error)
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

            quarterStates.value[quarter] = {
                state, // 'available', 'downloading', 'extracting', 'importing', 'deleting', 'imported', 'error'
                progress,
                error,
                updatedAt: new Date().toISOString()
            }

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

            // Refreshing quarter metadata from FI website

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
                    // Added new quarter metadata: ${quarterInfo.quarter}
                }
            }

            // No need to reload imports - watcher will persist changes to IndexedDB

            console.timeEnd('fiRefreshQuarterMetadata')
            // Quarter metadata refresh completed: ${newCount} new, ${updatedCount} updated

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
            // Deleting data for quarter: ${quarter}

            // FIRST: Remove quarter from selectedQuarters to prevent UI issues during deletion
            const wasSelected = selectedQuarters.value.includes(quarter)
            if (wasSelected) {
                // Removing ${quarter} from selected quarters before deletion
                selectedQuarters.value = selectedQuarters.value.filter(q => q !== quarter)
                persistSelectedQuarters()
            }

            // Set deleting state with initial progress
            setQuarterState(quarter, 'deleting', { current: 0, total: 0, phase: 'Förbereder borttagning...' })

            // Actually delete data from the NEW IndexedDB database
            // Deleting funds and holdings from IndexedDB for ${quarter}

            // Get counts for progress tracking
            const fundsQuery = createQuery(fiFundsDB, 'funds')
                .equals('quarter', quarter)
            const fundsToDelete = await fundsQuery.execute()

            const holdingsQuery = createQuery(fiFundsDB, 'holdings')
                .equals('quarter', quarter)
            const holdingsToDelete = await holdingsQuery.execute()

            const totalItems = fundsToDelete.length + holdingsToDelete.length
            let deletedItems = 0

            // Found items to delete: funds and holdings

            // Update progress with total count
            setQuarterState(quarter, 'deleting', { 
                current: 0, 
                total: totalItems, 
                phase: 'Tar bort fonder...' 
            })

            // Delete funds with progress updates
            for (const fund of fundsToDelete) {
                if (fund.id === undefined || fund.id === null) {
                    console.error(`❌ Fund missing id:`, fund)
                    continue
                }
                await fiFundsDB.delete('funds', fund.id)
                deletedItems++
                
                // Update progress every 10 items or on last item
                if (deletedItems % 10 === 0 || deletedItems === fundsToDelete.length) {
                    setQuarterState(quarter, 'deleting', { 
                        current: deletedItems, 
                        total: totalItems, 
                        phase: `Tar bort fonder... (${deletedItems}/${fundsToDelete.length})` 
                    })
                }
            }
            console.log(`�️ Deleted ${fundsToDelete.length} funds from IndexedDB`)

            // Update progress for holdings phase
            setQuarterState(quarter, 'deleting', { 
                current: deletedItems, 
                total: totalItems, 
                phase: 'Tar bort innehav...' 
            })

            // Delete holdings with progress updates
            for (const holding of holdingsToDelete) {
                if (holding.id === undefined || holding.id === null) {
                    console.error(`❌ Holding missing id:`, holding)
                    continue
                }
                await fiFundsDB.delete('holdings', holding.id)
                deletedItems++
                
                // Update progress every 50 items or on last item (holdings are more numerous)
                if (deletedItems % 50 === 0 || deletedItems === totalItems) {
                    const holdingsDeleted = deletedItems - fundsToDelete.length
                    setQuarterState(quarter, 'deleting', { 
                        current: deletedItems, 
                        total: totalItems, 
                        phase: `Tar bort innehav... (${holdingsDeleted}/${holdingsToDelete.length})` 
                    })
                }
            }
            // Deleted holdings from IndexedDB

            // Final progress update
            setQuarterState(quarter, 'deleting', { 
                current: totalItems, 
                total: totalItems, 
                phase: 'Slutför borttagning...' 
            })

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

            // Reload data for current selection (will show data for remaining selected quarters)
            if (selectedQuarters.value.length > 0) {
                await loadDataForQuarters(selectedQuarters.value)
                console.log(`📊 Reloaded data for remaining selected quarters: ${selectedQuarters.value.join(', ')}`)
            } else {
                // Clear funds and holdings if no quarters selected
                funds.value = []
                holdings.value = []
                console.log(`📊 Cleared data since no quarters remain selected`)
            }
            // Quarter data deleted from IndexedDB successfully

        } catch (error) {
            console.error(`❌ Failed to delete quarter ${quarter}:`, error)
            // Set error state
            setQuarterState(quarter, 'error', null, error.message)
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
        return state && ['downloading', 'extracting', 'importing', 'deleting'].includes(state.state)
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
            // === STORAGE DEBUG STATE ===

            // Check current in-memory state
            // In-memory selected quarters: ${selectedQuarters.value}

            // Check available imports
            // Available imports: ${imports.value.length} items

            // Check quarter states
            // Quarter states: ${Object.keys(quarterStates.value).length} items

            // === END STORAGE DEBUG ===

            return {
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
            // === LOCALSTORAGE DEBUG STATE ===

            // Check all FI-related localStorage keys
            const keys = Object.values(FI_STORAGE_KEYS)
            // Checking localStorage keys: ${keys.length} items

            // Check current in-memory state
            // In-memory state: imports=${imports.value.length}, quarters=${selectedQuarters.value.length}

            // === END LOCALSTORAGE DEBUG ===

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

    watch(selectedQuarters, async (newQuarters, oldQuarters) => {
        // Only persist and load if the selection actually changed
        persistSelectedQuarters()
        if (JSON.stringify(newQuarters) !== JSON.stringify(oldQuarters)) {
            await loadDataForQuarters(newQuarters)
        }
    }, { deep: true })

    watch(quarterStates, () => {
        if (!isLoadingFromStorage.value && !isUpdatingState.value) {
            persistQuarterStates()
        }
    }, { deep: true })

    // Clean slate migration - clear all legacy data and start fresh
    const performDatabaseUpgrade = async () => {
        console.log('🔄 Checking if database upgrade is needed...')

        try {
            // First check if we have any imports in the new system
            if (imports.value.length > 0) {
                console.log('ℹ️ New IndexedDB system already in use, no upgrade needed')
                return false // Already using new system
            }

            // Performing database upgrade...

            // Drop all existing LocalForage stores from the stoqster database
            // Dropping legacy LocalForage stores from stoqster database...

            // List of actual store names found in DevTools
            const storesToDrop = [
                'fi-imports',
                'fi-quarter-mapping',
                'fi-funds-holdings',
                'fi-funds',
                'fi-holdings',
                'fi-common'
            ]

            // Drop each store by clearing its data
            for (const storeName of storesToDrop) {
                try {
                    const store = localforage.createInstance({
                        name: 'stoqster',
                        storeName: storeName
                    })
                    await store.clear()
                    // Cleared LocalForage store: ${storeName}
                } catch (error) {
                    console.warn(`⚠️ Could not clear store ${storeName}:`, error)
                    // Continue with other stores even if one fails
                }
            }

            // Clear reactive state
            // Clearing reactive state...
            funds.value = []
            holdings.value = []
            imports.value = []
            selectedQuarters.value = []
            quarterStates.value = {}
            lastUpdated.value = null

            // Clear localStorage settings
            // Clearing localStorage settings...
            Object.values(FI_STORAGE_KEYS).forEach(key => {
                removeLocalStorage(key)
            })

            // Clear any migration progress state
            try {
                localStorage.removeItem('fi-migration-progress')
            } catch (error) {
                // Ignore errors if key doesn't exist
            }

            // Database upgrade completed - all legacy data cleared
            return true // Database upgrade was performed

        } catch (error) {
            console.error('❌ Clean slate failed:', error)
            throw error
        }
    }

    /**
     * Load holdings for a specific fund and quarter (on-demand when row is expanded)
     */
    const loadHoldingsForFund = async (fundISIN, quarter) => {
        try {
            // Query holdings for this specific fund and quarter
            const holdingsQuery = createQuery(fiFundsDB, 'holdings')
                .equals('quarter', quarter)
                .equals('fundISIN', fundISIN)

            const fundHoldings = await holdingsQuery.execute() || []

            return fundHoldings
        } catch (err) {
            console.error(`❌ Failed to load holdings for fund ${fundISIN}:`, err)
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
        quarterStates,

        // Computed
        availableQuarters,
        latestQuarter,
        currentSourceDates,
        isMultiQuarterView,
        currentViewLabel,

        // Actions
        initialize,
        loadImports,
        persistSelectedQuarters,
        loadDataForQuarters,
        saveHistoricalImport,
        hasQuarter,
        hasSourceDate,
        getImportByQuarter,
        getImportBySourceDate,

        // Data management
        performDatabaseUpgrade,

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
        loadHoldingsForFund
    }
})
