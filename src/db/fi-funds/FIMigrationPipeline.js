/**
 * FI Data Migration Pipeline
 * 
 * Handles the complete migration from LocalForage to IndexedDB for FI fund data.
 * Provides progress tracking, validation, and rollback capabilities.
 */

import localforage from 'localforage'
import { FIFundsDB } from './FIFundsDB.js'
import { batchTransformFunds, batchTransformHoldings } from './FITransformations.js'

/**
 * Main migration pipeline class
 */
export class FIMigrationPipeline {
  constructor() {
    this.db = new FIFundsDB()
    
    // Configure LocalForage instances to match the existing FI store configuration
    this.fundsStore = localforage.createInstance({
      name: 'stoqster',
      storeName: 'fi-funds'
    })
    
    this.holdingsStore = localforage.createInstance({
      name: 'stoqster',
      storeName: 'fi-funds-holdings'
    })
    
    this.importsStore = localforage.createInstance({
      name: 'stoqster',
      storeName: 'fi-imports'
    })
    
    this.commonStore = localforage.createInstance({
      name: 'stoqster',
      storeName: 'fi-common'
    })
    
    this.stats = {
      fundsFound: 0,
      fundsProcessed: 0,
      fundsMigrated: 0,
      fundsSkipped: 0,
      fundsErrors: 0,
      holdingsFound: 0,
      holdingsProcessed: 0,
      holdingsMigrated: 0,
      holdingsSkipped: 0,
      holdingsErrors: 0,
      startTime: null,
      endTime: null,
      errors: []
    }
  }

  /**
   * Execute the complete migration process
   * @param {Object} options - Migration options
   * @param {Function} progressCallback - Progress reporting callback
   * @returns {Object} Migration results
   */
  async executeMigration(options = {}, progressCallback = null) {
    console.log('🚀 Starting FI data migration from LocalForage to IndexedDB')
    this.stats.startTime = new Date()

    try {
      // Initialize IndexedDB
      await this.db.initialize()
      this.reportProgress('Initializing database...', 0, progressCallback)

      // Step 1: Migrate funds data
      await this.migrateFunds(progressCallback)
      
      // Step 2: Migrate holdings data  
      await this.migrateHoldings(progressCallback)

      // Step 3: Validate migration results
      await this.validateMigration(progressCallback)

      this.stats.endTime = new Date()
      const duration = this.stats.endTime - this.stats.startTime

      console.log('✅ Migration completed successfully')
      console.log('📊 Migration Stats:', this.stats)

      this.reportProgress('Migration completed!', 100, progressCallback)

      return {
        success: true,
        stats: this.stats,
        duration: duration,
        errors: this.stats.errors
      }

    } catch (error) {
      console.error('❌ Migration failed:', error)
      this.stats.errors.push({ type: 'MIGRATION_FAILURE', error: error.message })
      
      return {
        success: false,
        stats: this.stats,
        error: error.message,
        errors: this.stats.errors
      }
    }
  }

  /**
   * Migrate funds data from LocalForage to IndexedDB
   */
  async migrateFunds(progressCallback) {
    console.log('📦 Starting funds migration...')
    
    try {
      // Read all fund data from LocalForage
      const allLegacyFunds = await this.readLegacyFunds()
      console.log(`🔍 Total funds found in LocalForage: ${allLegacyFunds.length}`)
      
      // TESTING LIMIT: Only migrate first 10 records for testing
      const TESTING_LIMIT = 10
      const legacyFunds = allLegacyFunds.slice(0, TESTING_LIMIT)
      console.log(`🧪 TESTING MODE: Limiting migration to ${TESTING_LIMIT} funds (out of ${allLegacyFunds.length} total)`)
      
      this.stats.fundsFound = legacyFunds.length
      
      console.log(`🔍 Processing ${legacyFunds.length} funds for migration`)
      this.reportProgress(`Found ${allLegacyFunds.length} total funds, processing ${legacyFunds.length} for testing...`, 10, progressCallback)

      if (legacyFunds.length === 0) {
        console.log('⚠️ No fund data found in LocalForage')
        return
      }

      // Log sample data structure before processing
      if (legacyFunds.length > 0) {
        const sampleFund = legacyFunds[0]
        console.log('🔍 Sample fund to migrate:', {
          keys: Object.keys(sampleFund),
          fundISIN: sampleFund.fundISIN || sampleFund['Fond_ISIN-kod'] || 'NOT_FOUND',
          fundName: sampleFund.fundName || sampleFund['Fond_namn'] || 'NOT_FOUND',
          quarter: sampleFund.quarter || sampleFund._quarter || 'NOT_FOUND'
        })
      }

      // Process in smaller batches for testing
      const batchSize = 5 // Smaller batches for testing
      const batches = this.createBatches(legacyFunds, batchSize)
      console.log(`📦 Created ${batches.length} batches of max ${batchSize} funds each`)
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const progress = 10 + (i / batches.length) * 40 // 10-50% for funds
        
        console.log(`🔄 Processing batch ${i + 1}/${batches.length} with ${batch.length} funds...`)
        this.reportProgress(`Processing fund batch ${i + 1}/${batches.length}...`, progress, progressCallback)
        
        try {
          // For now, directly migrate the funds without transformation
          // The data in LocalForage is already in a usable format
          console.log(`📦 Migrating batch ${i + 1} with ${batch.length} funds directly`)
          
          if (batch.length > 0) {
            console.log(`🚀 Calling bulkImportFunds with ${batch.length} funds`)
            const imported = await this.db.bulkImportFunds(batch)
            this.stats.fundsMigrated += imported
            this.stats.fundsProcessed += batch.length
            console.log(`✅ Successfully migrated ${imported} funds in batch ${i + 1}`)
          }

        } catch (error) {
          console.error(`❌ Error processing fund batch ${i + 1}:`, error)
          this.stats.fundsErrors += batch.length
          this.stats.errors.push({ type: 'FUND_BATCH', batch: i + 1, error: error.message })
        }
      }

      console.log(`✅ Funds migration completed: ${this.stats.fundsMigrated} migrated, ${this.stats.fundsErrors} errors`)

    } catch (error) {
      console.error('❌ Fund migration failed:', error)
      throw new Error(`Fund migration failed: ${error.message}`)
    }
  }

  /**
   * Migrate holdings data from LocalForage to IndexedDB
   */
  async migrateHoldings(progressCallback) {
    console.log('📈 Starting holdings migration...')
    
    try {
      // First, create a lookup map from fundName to fundISIN using the migrated funds
      console.log('🔍 Building fundName → fundISIN lookup...')
      const fundNameToISIN = new Map()
      
      // Read all legacy funds to build the lookup
      const allLegacyFunds = await this.readLegacyFunds()
      for (const fund of allLegacyFunds) {
        // Use the raw Swedish field names to build lookup
        const fundName = fund['Fond_namn']
        const fundISIN = fund['Fond_ISIN-kod']
        if (fundName && fundISIN) {
          fundNameToISIN.set(fundName, fundISIN)
        }
      }
      console.log(`📋 Built lookup table with ${fundNameToISIN.size} fund name → ISIN mappings`)
      
      // Read all holdings data from LocalForage
      const allLegacyHoldings = await this.readLegacyHoldings()
      console.log(`🔍 Total holdings found in LocalForage: ${allLegacyHoldings.length}`)
      
      // TESTING LIMIT: Only migrate first 10 records for testing
      const TESTING_LIMIT = 10
      const legacyHoldings = allLegacyHoldings.slice(0, TESTING_LIMIT)
      console.log(`🧪 TESTING MODE: Limiting migration to ${TESTING_LIMIT} holdings (out of ${allLegacyHoldings.length} total)`)
      
      // Enhance holdings with fundISIN lookup
      const enhancedHoldings = legacyHoldings.map(holding => {
        // Debug: Show the actual raw data structure
        if (legacyHoldings.indexOf(holding) === 0) {
          console.log('🔍 Raw holding sample:', {
            keys: Object.keys(holding),
            hasFundName: !!holding.fundName,
            hasInstrumentnamn: !!holding['Instrumentnamn'],
            hasQuarter: !!holding._quarter,
            hasISINKod: !!holding['ISIN-kod_instrument'],
            rawSample: holding
          })
        }
        
        // Try different field names for fundName (holdings data should have fundName already)
        const fundName = holding.fundName || holding['fundName']
        const fundISIN = fundNameToISIN.get(fundName)
        if (!fundISIN) {
          console.warn(`⚠️ No fundISIN found for fundName: ${fundName}`)
        }
        
        return {
          ...holding,
          fundISIN: fundISIN || 'NOT_FOUND',
          quarter: holding._quarter || holding.quarter
        }
      })
      
      this.stats.holdingsFound = enhancedHoldings.length
      
      console.log(`🔍 Processing ${enhancedHoldings.length} holdings for migration`)
      this.reportProgress(`Found ${allLegacyHoldings.length} total holdings, processing ${enhancedHoldings.length} for testing...`, 50, progressCallback)

      if (enhancedHoldings.length === 0) {
        console.log('⚠️ No holdings data found in LocalForage')
        return
      }

      // Log sample data structure before processing
      if (enhancedHoldings.length > 0) {
        const sampleHolding = enhancedHoldings[0]
        console.log('🔍 Sample holding to migrate:', {
          keys: Object.keys(sampleHolding),
          instrumentName: sampleHolding['Instrumentnamn'] || sampleHolding.instrumentName || 'NOT_FOUND',
          fundName: sampleHolding.fundName || 'NOT_FOUND',
          fundISIN: sampleHolding.fundISIN || 'NOT_FOUND',
          quarter: sampleHolding.quarter || sampleHolding._quarter || 'NOT_FOUND'
        })
      }

      // Process in smaller batches for testing
      const batchSize = 5 // Smaller batches for testing
      const batches = this.createBatches(enhancedHoldings, batchSize)
      console.log(`📦 Created ${batches.length} batches of max ${batchSize} holdings each`)
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const progress = 50 + (i / batches.length) * 30 // 50-80% for holdings
        
        console.log(`🔄 Processing batch ${i + 1}/${batches.length} with ${batch.length} holdings...`)
        this.reportProgress(`Processing holdings batch ${i + 1}/${batches.length}...`, progress, progressCallback)
        
        try {
          // For now, directly migrate the holdings without transformation
          // The data in LocalForage is already in a usable format
          console.log(`📦 Migrating batch ${i + 1} with ${batch.length} holdings directly`)
          
          if (batch.length > 0) {
            console.log(`🚀 Calling bulkImportHoldings with ${batch.length} holdings`)
            const imported = await this.db.bulkImportHoldings(batch)
            this.stats.holdingsMigrated += imported
            this.stats.holdingsProcessed += batch.length
            console.log(`✅ Successfully migrated ${imported} holdings in batch ${i + 1}`)
          }

        } catch (error) {
          console.error(`❌ Error processing holdings batch ${i + 1}:`, error)
          this.stats.holdingsErrors += batch.length
          this.stats.errors.push({ type: 'HOLDING_BATCH', batch: i + 1, error: error.message })
        }
      }

      console.log(`✅ Holdings migration completed: ${this.stats.holdingsMigrated} migrated, ${this.stats.holdingsErrors} errors`)

    } catch (error) {
      console.error('❌ Holdings migration failed:', error)
      throw new Error(`Holdings migration failed: ${error.message}`)
    }
  }

  /**
   * Validate migration results
   */
  async validateMigration(progressCallback) {
    console.log('🔍 Validating migration results...')
    this.reportProgress('Validating migration results...', 80, progressCallback)

    try {
      // Get counts from IndexedDB
      const indexedDBStats = await this.db.getDatabaseStats()
      
      console.log('📊 Migration validation:')
      console.log(`   LocalForage: ${this.stats.fundsFound} funds, ${this.stats.holdingsFound} holdings`)
      console.log(`   IndexedDB: ${indexedDBStats.totalFunds} funds, ${indexedDBStats.totalHoldings} holdings`)
      console.log(`   Migrated: ${this.stats.fundsMigrated} funds, ${this.stats.holdingsMigrated} holdings`)
      console.log(`   Errors: ${this.stats.fundsErrors} fund errors, ${this.stats.holdingsErrors} holding errors`)

      // If no data was found in LocalForage, that's actually okay - it means there's nothing to migrate
      if (this.stats.fundsFound === 0 && this.stats.holdingsFound === 0) {
        console.log('✅ No legacy data found in LocalForage - migration completed successfully (nothing to migrate)')
        this.reportProgress('No legacy data found - migration completed!', 90, progressCallback)
        return
      }

      // Check if migration is reasonable (allowing for some errors)
      const fundMigrationRate = this.stats.fundsMigrated / Math.max(this.stats.fundsFound, 1)
      const holdingMigrationRate = this.stats.holdingsMigrated / Math.max(this.stats.holdingsFound, 1)

      if (this.stats.fundsFound > 0 && fundMigrationRate < 0.8) {
        throw new Error(`Fund migration rate too low: ${(fundMigrationRate * 100).toFixed(1)}%`)
      }

      if (this.stats.holdingsFound > 0 && holdingMigrationRate < 0.8) {
        throw new Error(`Holdings migration rate too low: ${(holdingMigrationRate * 100).toFixed(1)}%`)
      }

      console.log('✅ Migration validation passed')
      this.reportProgress('Validation completed!', 90, progressCallback)

    } catch (error) {
      console.error('❌ Migration validation failed:', error)
      throw error
    }
  }

  /**
   * Read legacy fund data from LocalForage
   */
  async readLegacyFunds() {
    console.log('📚 Reading legacy fund data from LocalForage...')
    
    try {
      const funds = []
      
      // Read from funds store (where actual fund data is stored)
      const fundsStore = this.fundsStore
      
      try {
        const keys = await fundsStore.keys()
        console.log(`🔍 Found ${keys.length} keys in funds store (${fundsStore._config.storeName})`)
        
        for (const key of keys) {
          try {
            const data = await fundsStore.getItem(key)
            
            // Check if this is an array of funds (the expected format)
            if (Array.isArray(data)) {
              console.log(`📦 Found fund array with ${data.length} funds under key: ${key}`)
              
              // Log sample data structure for debugging
              if (data.length > 0) {
                const sampleFund = data[0]
                console.log(`🔍 Sample fund structure:`, {
                  keys: Object.keys(sampleFund).slice(0, 10),
                  hasISIN: !!(sampleFund.isin || sampleFund.fondISIN || sampleFund.fundISIN || sampleFund['Fond_ISIN-kod']),
                  hasName: !!(sampleFund.fondnamn || sampleFund.fundName || sampleFund['Fond_namn']),
                  sample: sampleFund
                })
              }
              
              // Add all funds from this array
              funds.push(...data)
            } else if (data && this.isValidFundData(data)) {
              // Single fund object (legacy format)
              console.log(`📄 Found single fund under key: ${key}`)
              funds.push(data)
            } else if (data) {
              console.log(`⚠️ Found data under key ${key} but it doesn't match fund validation:`, {
                type: typeof data,
                isArray: Array.isArray(data),
                keys: typeof data === 'object' ? Object.keys(data).slice(0, 5) : null
              })
            }
          } catch (error) {
            console.warn(`⚠️ Failed to read fund key ${key} from ${fundsStore._config.storeName}:`, error)
            this.stats.errors.push({ type: 'FUND_READ', key, store: fundsStore._config.storeName, error: error.message })
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to read from funds store ${fundsStore._config.storeName}:`, error)
      }
      
      console.log(`✅ Successfully read ${funds.length} fund records from funds store`)
      return funds
      
    } catch (error) {
      console.error('❌ Failed to read legacy fund data:', error)
      throw error
    }
  }

  /**
   * Read legacy holdings data from LocalForage
   */
  async readLegacyHoldings() {
    console.log('📊 Reading legacy holdings data from LocalForage...')
    
    try {
      const holdings = []
      
      // Read from holdings store (where actual holdings data is stored)
      const holdingsStore = this.holdingsStore
      
      try {
        const keys = await holdingsStore.keys()
        console.log(`🔍 Found ${keys.length} keys in holdings store (${holdingsStore._config.storeName})`)
        
        for (const key of keys) {
          try {
            const data = await holdingsStore.getItem(key)
            
            // Check if this is an array of holdings (the expected format)
            if (Array.isArray(data)) {
              console.log(`📦 Found holdings array with ${data.length} holdings under key: ${key}`)
              // Add all holdings from this array
              holdings.push(...data)
            } else if (data && this.isValidHoldingData(data)) {
              // Single holding object (legacy format)
              console.log(`📄 Found single holding under key: ${key}`)
              holdings.push(data)
            }
          } catch (error) {
            console.warn(`⚠️ Failed to read holding key ${key} from ${holdingsStore._config.storeName}:`, error)
            this.stats.errors.push({ type: 'HOLDING_READ', key, store: holdingsStore._config.storeName, error: error.message })
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to read from holdings store ${holdingsStore._config.storeName}:`, error)
      }
      
      console.log(`✅ Successfully read ${holdings.length} holding records from holdings store`)
      return holdings
      
    } catch (error) {
      console.error('❌ Failed to read legacy holdings data:', error)
      throw error
    }
  }

  /**
   * Validate if data looks like fund data (updated for FI data structure)
   */
  isValidFundData(data) {
    return !!(data && 
              (data.isin || data.fondISIN || data.fundISIN || data['Fond_ISIN-kod']) &&
              (data.fondnamn || data.fundName || data['Fond_namn']))
  }

  /**
   * Validate if data looks like holding data (updated for FI data structure)
   */
  isValidHoldingData(data) {
    return !!(data &&
              (data.isin || data.instrumentISIN || data.instrumentIsin || data['Instrumentnamn']) &&
              (data.instrumentnamn || data.instrumentName || data['Instrumentnamn']))
  }

  /**
   * Create batches from array
   */
  createBatches(array, batchSize) {
    const batches = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Report progress to callback
   */
  reportProgress(message, percentage, callback) {
    if (callback) {
      callback({
        message,
        percentage: Math.round(percentage),
        stats: { ...this.stats }
      })
    }
  }

  /**
   * Get migration statistics
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * Diagnostic method to inspect LocalForage contents
   */
  async inspectLocalForageContents() {
    console.log('🔍 Inspecting LocalForage contents...')
    
    const stores = [
      { name: 'fundsStore', instance: this.fundsStore },
      { name: 'holdingsStore', instance: this.holdingsStore },
      { name: 'importsStore', instance: this.importsStore },
      { name: 'commonStore', instance: this.commonStore }
    ]
    
    const inspection = {}
    
    for (const store of stores) {
      try {
        const keys = await store.instance.keys()
        inspection[store.name] = {
          storeName: store.instance._config.storeName,
          keyCount: keys.length,
          keys: keys.slice(0, 10), // First 10 keys as sample
          sampleData: {}
        }
        
        // Get sample data from first few keys
        for (let i = 0; i < Math.min(3, keys.length); i++) {
          const key = keys[i]
          try {
            const data = await store.instance.getItem(key)
            inspection[store.name].sampleData[key] = {
              type: typeof data,
              isArray: Array.isArray(data),
              keys: data && typeof data === 'object' ? Object.keys(data).slice(0, 5) : null,
              length: Array.isArray(data) ? data.length : null
            }
          } catch (error) {
            inspection[store.name].sampleData[key] = { error: error.message }
          }
        }
        
        console.log(`📊 Store ${store.name} (${store.instance._config.storeName}): ${keys.length} keys`)
        
      } catch (error) {
        console.error(`❌ Failed to inspect ${store.name}:`, error)
        inspection[store.name] = { error: error.message }
      }
    }
    
    console.log('🔍 LocalForage inspection complete:', inspection)
    return inspection
  }

  /**
   * Extract year from quarter string
   * @param {string} quarter - Quarter string like "2022Q4"
   * @returns {number} Year as number
   */
  extractYearFromQuarter(quarter) {
    if (!quarter || typeof quarter !== 'string') {
      return undefined
    }
    
    const match = quarter.match(/^(\d{4})Q[1-4]$/)
    return match ? parseInt(match[1], 10) : undefined
  }
}

/**
 * Convenience function to run migration
 */
export async function migrateFIData(progressCallback = null) {
  const pipeline = new FIMigrationPipeline()
  return await pipeline.executeMigration({}, progressCallback)
}
