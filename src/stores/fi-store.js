import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
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
import {
    loadPersistedState,
    setupPersistenceWatchers,
    clearAllFIStorage
} from './fi-persistence.js'

export const useFIStore = defineStore('fi', () => {
    // Guards to prevent recursive operations
    const isInitializing = ref(false)
    const isLoadingData = ref(false)
    const isUpdatingState = ref(false)
    const isLoadingFromStorage = ref(false)

    // Core data state
    const funds = ref([])
    const holdings = ref([])
    const lastUpdated = ref(null)

    // Load persisted state from localStorage
    const persisted = loadPersistedState()
    const imports = ref(persisted.imports)
    const selectedQuarters = ref(persisted.selectedQuarters)
    const quarterStates = ref(persisted.quarterStates)

    const isLoadingHistorical = ref(false)
    const error = ref(null)

    // IndexedDB instance
    const fiFundsDB = new FIFundsDB()
    fiFundsDB.initialize().catch(err => {
        console.error('Failed to initialize FI Funds database:', err)
    })

    // Set up auto-persistence watchers
    setupPersistenceWatchers(
        { imports, selectedQuarters, quarterStates },
        { isLoadingFromStorage, isUpdatingState }
    )

    // Watch selectedQuarters to load data when selection changes
    watch(selectedQuarters, async (newQuarters, oldQuarters) => {
        if (JSON.stringify(newQuarters) !== JSON.stringify(oldQuarters)) {
            await loadDataForQuarters(newQuarters)
        }
    }, { deep: true })

    // ==================== COMPUTED ====================

    const availableQuarters = computed(() => {
        // Access keys to ensure reactivity tracking
        Object.keys(quarterStates.value)

        return imports.value
            .map(imp => {
                const quarter = imp.quarter
                const importState = quarterStates.value[quarter] || {}
                const hasActualData = imp.recordCount > 0 && imp.importedAt !== null
                const dataState = hasActualData ? 'imported' : 'available'

                const activeStates = ['downloading', 'extracting', 'importing', 'deleting', 'error']
                const finalState = activeStates.includes(importState.state) ? importState.state : dataState

                return {
                    quarter,
                    label: formatQuarterForDisplay(quarter),
                    recordCount: imp.recordCount || 0,
                    holdingsCount: imp.holdingsCount || 0,
                    importedAt: imp.importedAt,
                    publishedDate: imp.sourceDate,
                    sourceDate: imp.sourceDate,
                    sourceUrl: imp.sourceUrl,
                    fileName: imp.fileName,
                    state: finalState,
                    progress: importState.progress || null,
                    error: importState.error || null,
                    isSelected: selectedQuarters.value.includes(quarter),
                    hasData: hasActualData,
                    isImporting: ['downloading', 'extracting', 'importing', 'deleting'].includes(importState.state),
                    importState: importState.state || 'available'
                }
            })
            .filter(item => item.quarter && item.quarter !== 'UNKNOWN' && item.quarter !== 'legacy')
            .sort((a, b) => compareQuarters(a.quarter, b.quarter))
    })

    const latestQuarter = computed(() => {
        const quarters = availableQuarters.value
        return quarters.length > 0 ? quarters[0].quarter : null
    })

    const currentSourceDates = computed(() => {
        if (selectedQuarters.value.length === 0) {
            const latestImport = availableQuarters.value[0]
            return latestImport ? [latestImport.publishedDate] : []
        }
        return selectedQuarters.value.map(quarter => {
            const importData = availableQuarters.value.find(imp => imp.quarter === quarter)
            return importData ? importData.publishedDate : null
        }).filter(Boolean)
    })

    const isMultiQuarterView = computed(() => currentSourceDates.value.length > 1)

    const currentViewLabel = computed(() => {
        if (selectedQuarters.value.length === 0) return 'Senaste data'
        if (selectedQuarters.value.length === 1) return formatQuarterForDisplay(selectedQuarters.value[0])
        return `${selectedQuarters.value.length} kvartal valda`
    })

    // ==================== ACTIONS ====================

    const initialize = async () => {
        if (isInitializing.value) return

        try {
            isInitializing.value = true

            if (availableQuarters.value.length === 0) return

            if (selectedQuarters.value.length === 0) {
                const latestImport = availableQuarters.value[0]
                selectedQuarters.value = [latestImport.quarter]
            }

            await loadDataForQuarters(selectedQuarters.value)
        } catch (err) {
            console.error('Failed to initialize FI store:', err)
            error.value = err.message
        } finally {
            isInitializing.value = false
        }
    }

    const loadDataForQuarters = async (quarters) => {
        if (isLoadingData.value) return

        try {
            isLoadingData.value = true
            isLoadingHistorical.value = true

            if (!quarters || quarters.length === 0) {
                funds.value = []
                holdings.value = []
                return
            }

            const allFunds = []
            for (const quarter of quarters) {
                const importData = availableQuarters.value.find(imp => imp.quarter === quarter)
                if (importData) {
                    const sourceFunds = await fiFundsDB.getQuarterSnapshot(quarter) || []
                    allFunds.push(...sourceFunds)
                }
            }

            funds.value = allFunds
            holdings.value = []
        } catch (err) {
            console.error('Failed to load data for quarters:', err)
            throw err
        } finally {
            isLoadingHistorical.value = false
            isLoadingData.value = false
        }
    }

    const saveHistoricalImport = async (zipUrl, zipFileName, fundsData, holdingsData) => {
        const zipMetadata = parseZipFileName(zipFileName)
        const quarter = zipMetadata.quarter
        const sourceDate = zipMetadata.sourceDate
        const importedAt = new Date().toISOString()

        const enrichedFunds = fundsData.map(fund => ({
            ...fund,
            _quarter: quarter,
            _sourceDate: sourceDate,
            _importedAt: importedAt,
            _displayQuarter: formatQuarterForDisplay(quarter)
        }))

        const enrichedHoldings = holdingsData.map(holding => ({
            ...holding,
            _quarter: quarter,
            _sourceDate: sourceDate,
            _importedAt: importedAt,
            _displayQuarter: formatQuarterForDisplay(quarter)
        }))

        const transformedFunds = enrichedFunds.map(fund => transformFundData(fund))
        const transformedHoldings = enrichedHoldings.map(holding =>
            transformHoldingData(holding, holding.fundISIN, quarter)
        )

        await fiFundsDB.addFunds(transformedFunds)
        await fiFundsDB.addHoldings(transformedHoldings)

        const importRecord = {
            quarter,
            sourceDate,
            sourceUrl: zipUrl,
            fileName: zipFileName,
            importedAt,
            recordCount: transformedFunds.length,
            holdingsCount: transformedHoldings.length
        }

        quarterStates.value[quarter] = { state: 'imported', progress: null, error: null }

        const updatedImports = imports.value.filter(imp => imp.quarter !== quarter)
        updatedImports.push(importRecord)
        imports.value = updatedImports.sort((a, b) => compareQuarters(a.quarter, b.quarter))

        if (selectedQuarters.value.length === 0) {
            selectedQuarters.value = [quarter]
            funds.value = transformedFunds
            holdings.value = transformedHoldings
        }

        return importRecord
    }

    const hasQuarter = async (quarter) => {
        const importExists = imports.value.some(imp => imp.quarter === quarter)
        if (!importExists) return false

        try {
            const fundsData = await fiFundsDB.getQuarterSnapshot(quarter)
            return fundsData && Array.isArray(fundsData) && fundsData.length > 0
        } catch {
            return false
        }
    }

    const hasSourceDate = async (sourceDate) => {
        const importRecord = imports.value.find(imp => imp.sourceDate === sourceDate)
        if (!importRecord?.quarter) return false
        return await hasQuarter(importRecord.quarter)
    }

    const getImportByQuarter = (quarter) => {
        return imports.value.find(imp => imp.quarter === quarter) || null
    }

    const getImportBySourceDate = (sourceDate) => {
        return imports.value.find(imp => imp.sourceDate === sourceDate) || null
    }

    // ==================== QUARTER STATE MANAGEMENT ====================

    const setQuarterState = (quarter, state, progress = null, errorMsg = null) => {
        if (isUpdatingState.value) return

        try {
            isUpdatingState.value = true
            quarterStates.value[quarter] = {
                state,
                progress,
                error: errorMsg,
                updatedAt: new Date().toISOString()
            }
        } finally {
            isUpdatingState.value = false
        }
    }

    const getQuarterState = (quarter) => {
        return quarterStates.value[quarter] || { state: 'available' }
    }

    const isQuarterSelected = (quarter) => selectedQuarters.value.includes(quarter)

    const isQuarterImporting = (quarter) => {
        const state = quarterStates.value[quarter]
        return state && ['downloading', 'extracting', 'importing', 'deleting'].includes(state.state)
    }

    const hasQuarterData = (quarter) => {
        const importRecord = imports.value.find(imp => imp.quarter === quarter)
        return importRecord && importRecord.recordCount > 0 && importRecord.importedAt !== null
    }

    const getQuarterStatus = (quarter) => ({
        quarter,
        isSelected: isQuarterSelected(quarter),
        hasData: hasQuarterData(quarter),
        isImporting: isQuarterImporting(quarter),
        importState: getQuarterState(quarter),
        canImport: !hasQuarterData(quarter) && !isQuarterImporting(quarter),
        canDelete: hasQuarterData(quarter) && !isQuarterImporting(quarter),
        canSelect: true
    })

    // ==================== METADATA REFRESH ====================

    const refreshQuarterMetadata = async () => {
        const { fetch } = await import('@tauri-apps/plugin-http')
        const { extractFileNameFromUrl, parseZipFileName } = await import('../api/fiHistoricalUtils.js')

        const response = await fetch('https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/')
        if (!response.ok) throw new Error(`Failed to fetch FI page: ${response.status}`)

        const text = await response.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(text, 'text/html')
        const table = doc.getElementsByTagName('tbody')[0]
        const aList = table.querySelectorAll('tr td:first-child a')

        const foundQuarters = []
        for (const a of aList) {
            try {
                const url = 'https://www.fi.se' + a.pathname + a.search
                const fileName = extractFileNameFromUrl(url)
                const zipMetadata = parseZipFileName(fileName)
                foundQuarters.push({
                    quarter: zipMetadata.quarter,
                    sourceDate: zipMetadata.sourceDate,
                    url, fileName,
                    recordCount: 0, holdingsCount: 0, importedAt: null
                })
            } catch (err) {
                console.warn('Could not parse ZIP filename:', a.pathname, err)
            }
        }

        let updatedCount = 0
        let newCount = 0

        for (const quarterInfo of foundQuarters) {
            const existingImport = imports.value.find(imp => imp.quarter === quarterInfo.quarter)

            if (existingImport) {
                if (existingImport.sourceUrl !== quarterInfo.url || existingImport.fileName !== quarterInfo.fileName) {
                    const importIndex = imports.value.findIndex(imp => imp.quarter === quarterInfo.quarter)
                    if (importIndex !== -1) {
                        imports.value[importIndex] = {
                            ...existingImport,
                            importId: existingImport.importId || `import-${quarterInfo.quarter}-${quarterInfo.sourceDate}`,
                            sourceUrl: quarterInfo.url,
                            fileName: quarterInfo.fileName,
                            updatedAt: new Date().toISOString()
                        }
                    }
                    updatedCount++
                }
            } else {
                imports.value.push({
                    quarter: quarterInfo.quarter,
                    sourceDate: quarterInfo.sourceDate,
                    sourceUrl: quarterInfo.url,
                    fileName: quarterInfo.fileName,
                    recordCount: 0,
                    holdingsCount: 0,
                    importedAt: null,
                    createdAt: new Date().toISOString()
                })
                imports.value.sort((a, b) => compareQuarters(a.quarter, b.quarter))
                newCount++
            }
        }

        return { newQuarters: newCount, updatedQuarters: updatedCount, totalQuarters: foundQuarters.length }
    }

    // ==================== DELETE ====================

    const deleteQuarterData = async (quarter) => {
        try {
            // Remove from selection first
            if (selectedQuarters.value.includes(quarter)) {
                selectedQuarters.value = selectedQuarters.value.filter(q => q !== quarter)
            }

            // Instant UI update
            quarterStates.value[quarter] = { state: 'available', progress: null, error: null }

            const importIndex = imports.value.findIndex(imp => imp.quarter === quarter)
            if (importIndex !== -1) {
                imports.value[importIndex] = {
                    ...imports.value[importIndex],
                    recordCount: 0,
                    holdingsCount: 0,
                    importedAt: null,
                    deletedAt: new Date().toISOString()
                }
            }

            // Reload remaining selection
            if (selectedQuarters.value.length > 0) {
                await loadDataForQuarters(selectedQuarters.value)
            } else {
                funds.value = []
                holdings.value = []
            }

            // Fire-and-forget background deletion
            Promise.all([
                fiFundsDB.deleteByIndex('funds', 'quarter', quarter),
                fiFundsDB.deleteByIndex('holdings', 'quarter', quarter)
            ]).catch(err => {
                console.error(`Background deletion failed for ${quarter}:`, err)
            })
        } catch (err) {
            console.error(`Failed to delete quarter ${quarter}:`, err)
            setQuarterState(quarter, 'error', null, err.message)
            throw err
        }
    }

    // ==================== LEGACY DATABASE UPGRADE ====================

    const performDatabaseUpgrade = async () => {
        if (imports.value.length > 0) return false

        const storesToDrop = [
            'fi-imports', 'fi-quarter-mapping', 'fi-funds-holdings',
            'fi-funds', 'fi-holdings', 'fi-common'
        ]

        const localforage = (await import('localforage')).default
        for (const storeName of storesToDrop) {
            try {
                const store = localforage.createInstance({ name: 'stoqster', storeName })
                await store.clear()
            } catch {
                // Continue even if store doesn't exist
            }
        }

        funds.value = []
        holdings.value = []
        imports.value = []
        selectedQuarters.value = []
        quarterStates.value = {}
        lastUpdated.value = null
        clearAllFIStorage()

        return true
    }

    // ==================== ON-DEMAND HOLDINGS ====================

    const loadHoldingsForFund = async (fundISIN, quarter) => {
        const holdingsQuery = createQuery(fiFundsDB, 'holdings')
            .equals('quarter', quarter)
            .equals('fundISIN', fundISIN)

        return await holdingsQuery.execute() || []
    }

    return {
        // State
        funds, holdings, lastUpdated, imports, selectedQuarters,
        isLoadingHistorical, error, quarterStates,

        // Computed
        availableQuarters, latestQuarter, currentSourceDates,
        isMultiQuarterView, currentViewLabel,

        // Actions
        initialize, loadDataForQuarters, saveHistoricalImport,
        hasQuarter, hasSourceDate, getImportByQuarter, getImportBySourceDate,

        // Data management
        performDatabaseUpgrade,

        // Quarter state
        setQuarterState, getQuarterState, refreshQuarterMetadata, deleteQuarterData,

        // State helpers
        isQuarterSelected, isQuarterImporting, hasQuarterData, getQuarterStatus,

        // On-demand
        loadHoldingsForFund
    }
})
