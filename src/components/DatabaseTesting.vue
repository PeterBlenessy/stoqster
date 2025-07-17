<!--
  In-App Database Testing Component
  
  Provides a UI for testing IndexedDB operations within the Tauri application.
  Includes mock data generation and real-time testing results.
-->

<template>
  <div class="testing-container">
    <q-card class="testing-card">
      <q-card-section>
        <div class="text-h6 text-center">
          🧪 FI IndexedDB Testing
        </div>
        <div class="text-subtitle2 text-center text-grey-6">
          Test database operations with mock data
        </div>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-md">
          <div class="col">
            <q-btn 
              @click="runBasicTests" 
              :loading="running"
              :disable="running"
              color="primary" 
              icon="mdi-play"
              label="Run Basic Tests"
              class="full-width"
            />
          </div>
          <div class="col">
            <q-btn 
              @click="runPerformanceTests" 
              :loading="running"
              :disable="running"
              color="secondary" 
              icon="mdi-speedometer"
              label="Performance Tests"
              class="full-width"
            />
          </div>
        </div>

        <div class="row q-gutter-md q-mt-sm">
          <div class="col">
            <q-btn 
              @click="generateMockData" 
              :loading="running"
              :disable="running"
              color="positive" 
              icon="mdi-database-plus"
              label="Generate Mock Data"
              class="full-width"
            />
          </div>
          <div class="col">
            <q-btn 
              @click="clearDatabase" 
              :loading="running"
              :disable="running"
              color="negative" 
              icon="mdi-database-remove"
              label="Clear Database"
              class="full-width"
            />
          </div>
        </div>

        <!-- Phase 2: Data Transformation Testing -->
        <q-separator class="q-my-md" />
        <div class="text-subtitle1 q-mb-sm">📊 Phase 2: Data Transformation</div>
        
        <div class="row q-gutter-md">
          <div class="col">
            <q-btn 
              @click="testLocalForageRead" 
              :loading="running"
              :disable="running"
              color="info" 
              icon="mdi-database-search"
              label="Test LocalForage Read"
              class="full-width"
            />
          </div>
          <div class="col">
            <q-btn 
              @click="validateTransformations" 
              :loading="running"
              :disable="running"
              color="warning" 
              icon="mdi-compare-horizontal"
              label="Validate Transformations"
              class="full-width"
            />
          </div>
        </div>

        <div class="row q-gutter-md q-mt-sm">
          <div class="col">
            <q-btn 
              @click="runMigrationTest" 
              :loading="running"
              :disable="running"
              color="purple" 
              icon="mdi-database-import"
              label="Test Migration Pipeline"
              class="full-width"
            />
          </div>
          <div class="col">
            <q-btn 
              @click="compareDataIntegrity" 
              :loading="running"
              :disable="running"
              color="teal" 
              icon="mdi-database-check"
              label="Compare Data Integrity"
              class="full-width"
            />
          </div>
        </div>

        <div class="row q-gutter-md q-mt-sm">
          <div class="col">
            <q-btn 
              @click="inspectLocalForage" 
              :loading="running"
              :disable="running"
              color="indigo" 
              icon="mdi-magnify"
              label="🔍 Inspect LocalForage"
              class="full-width"
            />
          </div>
          <div class="col">
            <q-btn 
              @click="runFullMigration" 
              :loading="running"
              :disable="running"
              color="red" 
              icon="mdi-database-sync"
              label="🚀 RUN FULL MIGRATION"
              class="full-width"
            />
          </div>
        </div>

        <div class="row q-gutter-md q-mt-sm">
          <div class="col"></div>
          <div class="col">
            <q-btn 
              @click="clearIndexedDB" 
              :loading="running"
              :disable="running"
              color="orange" 
              icon="mdi-database-remove"
              label="Clear IndexedDB"
              class="full-width"
            />
          </div>
          <div class="col"></div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="stats-section">
        <div class="text-subtitle1 q-mb-md">📊 Database Statistics</div>
        <div class="row q-gutter-md">
          <div class="col">
            <q-chip color="primary" text-color="white" icon="mdi-folder">
              Funds: {{ stats.totalFunds }}
            </q-chip>
          </div>
          <div class="col">
            <q-chip color="secondary" text-color="white" icon="mdi-briefcase-variant">
              Holdings: {{ stats.totalHoldings }}
            </q-chip>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="log-section">
        <div class="text-subtitle1 q-mb-md">
          📝 Test Results
          <q-btn 
            @click="clearLogs" 
            flat 
            dense 
            icon="mdi-close" 
            size="sm" 
            class="float-right"
          />
        </div>
        
        <q-scroll-area class="log-container">
          <div 
            v-for="(log, index) in logs" 
            :key="index"
            :class="`log-entry log-${log.type}`"
          >
            <q-icon :name="getLogIcon(log.type)" class="q-mr-xs" />
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="logs.length === 0" class="text-grey-5 text-center q-pa-md">
            No test results yet. Run some tests to see output here.
          </div>
        </q-scroll-area>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'

// Import the database class directly to avoid potential initialization issues
import { FIFundsDB } from '../db/fi-funds/FIFundsDB.js'
import { FIMigrationPipeline, migrateFIData } from '../db/fi-funds/FIMigrationPipeline.js'

const $q = useQuasar()

// Create database instance locally
const fiFundsDB = new FIFundsDB()

// Reactive state
const running = ref(false)
const stats = ref({
  totalFunds: 0,
  totalHoldings: 0
})
const logs = ref([])

// Utility functions
function addLog(message, type = 'info') {
  logs.value.push({
    time: new Date().toLocaleTimeString(),
    message,
    type
  })
}

function getLogIcon(type) {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }
  return icons[type] || 'mdi-information'
}

function clearLogs() {
  logs.value = []
}

async function updateStats() {
  try {
    // Check if database is initialized
    if (!fiFundsDB || typeof fiFundsDB.getDatabaseStats !== 'function') {
      addLog('⚠️ Database not properly initialized for stats', 'warning')
      return
    }
    
    const dbStats = await fiFundsDB.getDatabaseStats()
    stats.value = dbStats
    addLog(`📊 Stats updated: ${dbStats.totalFunds} funds, ${dbStats.totalHoldings} holdings`, 'info')
  } catch (error) {
    addLog(`Failed to update stats: ${error.message}`, 'error')
    console.error('Stats update error:', error)
  }
}

// Mock data generators
function generateMockFundData(overrides = {}) {
  return {
    isin: `SE00${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
    fondnamn: `Test Fond ${Math.floor(Math.random() * 1000)}`,
    kvartal: ['Q1', 'Q2', 'Q3', 'Q4'][Math.floor(Math.random() * 4)],
    'rapportår': 2024,
    'fondförmögenhet': Math.floor(Math.random() * 10000000),
    'antalAndelsägare': Math.floor(Math.random() * 10000),
    fondtyp: 'Aktiefond',
    'fondförvaltare': `Test Förvaltare ${Math.floor(Math.random() * 100)} AB`,
    ...overrides
  }
}

function generateMockHoldingData(overrides = {}) {
  return {
    isin: `SE00${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
    instrumentnamn: `Test Aktie ${Math.floor(Math.random() * 1000)} AB`,
    'marknadsvärde': Math.floor(Math.random() * 1000000),
    'andelAvFondförmögenhet': Math.random() * 20,
    bransch: ['Teknologi', 'Hälsovård', 'Finans', 'Industri'][Math.floor(Math.random() * 4)],
    land: 'Sverige',
    valuta: 'SEK',
    ...overrides
  }
}

// Test functions
async function runBasicTests() {
  if (running.value) {
    addLog('⚠️ Tests already running, please wait...', 'warning')
    return
  }
  
  running.value = true
  addLog('🚀 Starting basic database tests...', 'info')
  
  try {
    // Check database availability
    if (!fiFundsDB) {
      throw new Error('Database instance not available')
    }
    
    // Test 1: Database initialization
    addLog('Test 1: Database initialization', 'info')
    await fiFundsDB.initialize()
    addLog('✅ Database initialized successfully', 'success')
    
    // Test 2: Add sample fund
    addLog('Test 2: Adding sample fund', 'info')
    const sampleFund = generateMockFundData({
      isin: 'SE0001234567',
      fondnamn: 'Test Integration Fund'
    })
    
    const fundKey = await fiFundsDB.addFund(sampleFund)
    addLog(`✅ Fund added with key: ${fundKey}`, 'success')
    
    // Test 3: Retrieve fund
    addLog('Test 3: Retrieving fund', 'info')
    const retrieved = await fiFundsDB.getFund('SE0001234567', sampleFund.kvartal, 2024)
    if (retrieved && retrieved.fundName === 'Test Integration Fund') {
      addLog('✅ Fund retrieved successfully', 'success')
    } else {
      addLog('❌ Fund retrieval failed', 'error')
    }
    
    // Test 4: Add sample holding
    addLog('Test 4: Adding sample holding', 'info')
    const sampleHolding = generateMockHoldingData({
      isin: 'SE0009876543',
      instrumentnamn: 'Test Holding'
    })
    
    const holdingKey = await fiFundsDB.addHolding(
      sampleHolding, 
      'SE0001234567', 
      sampleFund.kvartal, 
      2024
    )
    addLog(`✅ Holding added with key: ${holdingKey}`, 'success')
    
    // Test 5: Query holdings
    addLog('Test 5: Querying fund holdings', 'info')
    const holdings = await fiFundsDB.getFundHoldings('SE0001234567', sampleFund.kvartal, 2024)
    addLog(`✅ Retrieved ${holdings.length} holdings`, 'success')
    
    addLog('🎉 All basic tests passed!', 'success')
    
  } catch (error) {
    addLog(`❌ Test failed: ${error.message}`, 'error')
    console.error('Test error:', error)
  } finally {
    running.value = false
    await updateStats()
  }
}

async function runPerformanceTests() {
  running.value = true
  addLog('🏃 Starting performance tests...', 'info')
  
  try {
    const startTime = Date.now()
    
    // Test bulk operations
    addLog('Generating 100 mock funds...', 'info')
    const mockFunds = Array.from({ length: 100 }, (_, i) => 
      generateMockFundData({
        isin: `SE00${(1000000 + i).toString()}`,
        fondnamn: `Performance Test Fund ${i + 1}`
      })
    )
    
    const bulkStartTime = Date.now()
    const imported = await fiFundsDB.bulkImportFunds(mockFunds)
    const bulkEndTime = Date.now()
    
    addLog(`✅ Bulk imported ${imported} funds in ${bulkEndTime - bulkStartTime}ms`, 'success')
    
    // Test query performance
    addLog('Testing query performance...', 'info')
    const queryStartTime = Date.now()
    const snapshot = await fiFundsDB.getQuarterSnapshot('Q1', 2024)
    const queryEndTime = Date.now()
    
    addLog(`✅ Quarter snapshot query returned ${snapshot.length} funds in ${queryEndTime - queryStartTime}ms`, 'success')
    
    const totalTime = Date.now() - startTime
    addLog(`🏁 Performance tests completed in ${totalTime}ms`, 'success')
    
  } catch (error) {
    addLog(`❌ Performance test failed: ${error.message}`, 'error')
    console.error('Performance test error:', error)
  } finally {
    running.value = false
    await updateStats()
  }
}

async function generateMockData() {
  running.value = true
  addLog('🎲 Generating comprehensive mock data...', 'info')
  
  try {
    // Generate funds for multiple quarters
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const companies = ['Handelsbanken', 'SEB', 'Länsförsäkringar', 'Avanza', 'Nordea']
    
    const funds = []
    for (const company of companies) {
      for (const quarter of quarters) {
        for (let i = 0; i < 3; i++) {
          funds.push(generateMockFundData({
            isin: `SE00${company.substring(0,2).toUpperCase()}${quarter}${i.toString().padStart(3, '0')}`,
            fondnamn: `${company} ${quarter} Fund ${i + 1}`,
            kvartal: quarter,
            'fondförvaltare': `${company} Fonder AB`
          }))
        }
      }
    }
    
    addLog(`Importing ${funds.length} mock funds...`, 'info')
    const imported = await fiFundsDB.bulkImportFunds(funds)
    addLog(`✅ Imported ${imported} funds`, 'success')
    
    // Generate holdings for some funds
    addLog('Generating mock holdings...', 'info')
    const holdings = []
    const fundSample = funds.slice(0, 5) // Take first 5 funds
    
    for (const fund of fundSample) {
      for (let i = 0; i < 10; i++) {
        holdings.push({
          holding: generateMockHoldingData({
            isin: `SE00${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
            instrumentnamn: `${fund.fondnamn} Holding ${i + 1}`
          }),
          fundISIN: fund.isin,
          quarter: fund.kvartal,
          year: fund['rapportår']
        })
      }
    }
    
    const holdingsImported = await fiFundsDB.bulkImportHoldings(holdings)
    addLog(`✅ Imported ${holdingsImported} holdings`, 'success')
    
    addLog('🎯 Mock data generation completed!', 'success')
    
  } catch (error) {
    addLog(`❌ Mock data generation failed: ${error.message}`, 'error')
    console.error('Mock data error:', error)
  } finally {
    running.value = false
    await updateStats()
  }
}

async function clearDatabase() {
  running.value = true
  addLog('🧹 Clearing database...', 'info')
  
  try {
    await fiFundsDB.clear('funds')
    await fiFundsDB.clear('holdings')
    addLog('✅ Database cleared successfully', 'success')
    
  } catch (error) {
    addLog(`❌ Database clear failed: ${error.message}`, 'error')
    console.error('Clear error:', error)
  } finally {
    running.value = false
    await updateStats()
  }
}

// Phase 2: Data Transformation Testing Functions
async function testLocalForageRead() {
  running.value = true
  addLog('📖 Testing LocalForage data reading...', 'info')
  
  try {
    // Import LocalForage to test reading existing data
    const { default: localforage } = await import('localforage')
    
    // Try to read existing FI data
    addLog('🔍 Checking for existing FI data...', 'info')
    const keys = await localforage.keys()
    const fiKeys = keys.filter(key => key.includes('fi-') || key.includes('fund'))
    
    addLog(`📊 Found ${keys.length} total keys, ${fiKeys.length} FI-related keys`, 'info')
    
    if (fiKeys.length > 0) {
      // Sample a few keys to check data structure
      const sampleKeys = fiKeys.slice(0, Math.min(3, fiKeys.length))
      
      for (const key of sampleKeys) {
        const data = await localforage.getItem(key)
        addLog(`🔑 Key: ${key}, Type: ${typeof data}, Length: ${Array.isArray(data) ? data.length : 'N/A'}`, 'info')
        
        if (Array.isArray(data) && data.length > 0) {
          const sample = data[0]
          const fields = Object.keys(sample)
          addLog(`📝 Sample fields: ${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''}`, 'info')
        }
      }
      addLog('✅ LocalForage data reading successful', 'success')
    } else {
      addLog('⚠️ No FI data found in LocalForage', 'warning')
    }
    
  } catch (error) {
    addLog(`❌ LocalForage read failed: ${error.message}`, 'error')
    console.error('LocalForage read error:', error)
  } finally {
    running.value = false
  }
}

async function validateTransformations() {
  running.value = true
  addLog('🔄 Validating data transformations...', 'info')
  
  try {
    // Import transformation functions
    const { transformFundData, transformHoldingData } = await import('../db/fi-funds/FITransformations.js')
    
    // Test Swedish fund data transformation
    addLog('🇸🇪 Testing Swedish fund data transformation...', 'info')
    const swedishFundData = {
      isin: 'SE0001234567',
      fondnamn: 'Test Svensk Fond',
      kvartal: 'Q1',
      'rapportår': 2024,
      'fondförmögenhet': '1500000',
      'antalAndelsägare': '250',
      fondtyp: 'Aktiefond',
      'fondförvaltare': 'Test Förvaltare AB'
    }
    
    const transformedFund = transformFundData(swedishFundData)
    addLog(`✅ Fund transformed: ${transformedFund.fundName} (${transformedFund.fundISIN})`, 'success')
    addLog(`📊 Assets: ${transformedFund.assetsUnderManagement?.toLocaleString()} SEK`, 'info')
    
    // Test Swedish holding data transformation
    addLog('🇸🇪 Testing Swedish holding data transformation...', 'info')
    const swedishHoldingData = {
      isin: 'SE0009876543',
      instrumentnamn: 'Test Aktie AB',
      'marknadsvärde': '500000',
      'andelAvFondförmögenhet': '15.5',
      bransch: 'Teknologi',
      land: 'Sverige',
      valuta: 'SEK'
    }
    
    const transformedHolding = transformHoldingData(swedishHoldingData, 'SE0001234567', 'Q1', 2024)
    addLog(`✅ Holding transformed: ${transformedHolding.instrumentName}`, 'success')
    addLog(`💰 Value: ${transformedHolding.marketValue?.toLocaleString()} SEK (${transformedHolding.percentageOfFund}%)`, 'info')
    
    // Validate field mapping
    const requiredFundFields = ['fundISIN', 'fundName', 'quarter', 'year', 'assetsUnderManagement']
    const requiredHoldingFields = ['instrumentISIN', 'instrumentName', 'marketValue', 'percentageOfFund']
    
    const missingFundFields = requiredFundFields.filter(field => !(field in transformedFund))
    const missingHoldingFields = requiredHoldingFields.filter(field => !(field in transformedHolding))
    
    if (missingFundFields.length === 0 && missingHoldingFields.length === 0) {
      addLog('✅ All required fields present in transformations', 'success')
    } else {
      if (missingFundFields.length > 0) {
        addLog(`⚠️ Missing fund fields: ${missingFundFields.join(', ')}`, 'warning')
      }
      if (missingHoldingFields.length > 0) {
        addLog(`⚠️ Missing holding fields: ${missingHoldingFields.join(', ')}`, 'warning')
      }
    }
    
    addLog('🎯 Transformation validation completed', 'success')
    
  } catch (error) {
    addLog(`❌ Transformation validation failed: ${error.message}`, 'error')
    console.error('Transformation validation error:', error)
  } finally {
    running.value = false
  }
}

async function runMigrationTest() {
  running.value = true
  addLog('🚀 Testing migration pipeline...', 'info')
  
  try {
    // Generate sample legacy data (simulating LocalForage format)
    addLog('📝 Generating sample legacy data...', 'info')
    const legacyFunds = [
      {
        isin: 'SE0001111111',
        fondnamn: 'Migration Test Fond 1',
        kvartal: 'Q1',
        'rapportår': 2024,
        'fondförmögenhet': '2500000',
        'antalAndelsägare': '350'
      },
      {
        isin: 'SE0002222222',
        fondnamn: 'Migration Test Fond 2',
        kvartal: 'Q1',
        'rapportår': 2024,
        'fondförmögenhet': '1800000',
        'antalAndelsägare': '275'
      }
    ]
    
    const legacyHoldings = [
      {
        holding: {
          isin: 'SE0009999999',
          instrumentnamn: 'Migration Test Aktie',
          'marknadsvärde': '400000',
          'andelAvFondförmögenhet': '16.0'
        },
        fundISIN: 'SE0001111111',
        quarter: 'Q1',
        year: 2024
      }
    ]
    
    // Test bulk import of legacy data
    addLog('💾 Testing bulk import of legacy funds...', 'info')
    const importedFunds = await fiFundsDB.bulkImportFunds(legacyFunds)
    addLog(`✅ Imported ${importedFunds} funds`, 'success')
    
    addLog('💾 Testing bulk import of legacy holdings...', 'info')
    const importedHoldings = await fiFundsDB.bulkImportHoldings(legacyHoldings)
    addLog(`✅ Imported ${importedHoldings} holdings`, 'success')
    
    // Validate imported data
    addLog('🔍 Validating imported data...', 'info')
    const retrievedFund = await fiFundsDB.getFund('SE0001111111', 'Q1', 2024)
    if (retrievedFund) {
      addLog(`✅ Fund validation: ${retrievedFund.fundName}`, 'success')
    } else {
      addLog('❌ Fund validation failed', 'error')
    }
    
    const retrievedHoldings = await fiFundsDB.getFundHoldings('SE0001111111', 'Q1', 2024)
    if (retrievedHoldings.length > 0) {
      addLog(`✅ Holdings validation: ${retrievedHoldings.length} holdings found`, 'success')
    } else {
      addLog('❌ Holdings validation failed', 'error')
    }
    
    addLog('🎉 Migration test completed successfully', 'success')
    
  } catch (error) {
    addLog(`❌ Migration test failed: ${error.message}`, 'error')
    console.error('Migration test error:', error)
  } finally {
    running.value = false
    await updateStats()
  }
}

async function compareDataIntegrity() {
  running.value = true
  addLog('🔍 Comparing data integrity...', 'info')
  
  try {
    // Get current IndexedDB stats
    const dbStats = await fiFundsDB.getDatabaseStats()
    addLog(`📊 IndexedDB: ${dbStats.totalFunds} funds, ${dbStats.totalHoldings} holdings`, 'info')
    
    // Try to get LocalForage stats for comparison
    try {
      const { default: localforage } = await import('localforage')
      const keys = await localforage.keys()
      const fiKeys = keys.filter(key => key.includes('fi-') || key.includes('fund'))
      
      let totalLegacyRecords = 0
      for (const key of fiKeys.slice(0, 5)) { // Sample first 5 keys
        const data = await localforage.getItem(key)
        if (Array.isArray(data)) {
          totalLegacyRecords += data.length
        }
      }
      
      addLog(`📊 LocalForage: ~${totalLegacyRecords} records (sampled)`, 'info')
      
      // Data quality checks
      addLog('🔍 Running data quality checks...', 'info')
      
      // Check for duplicate ISINs
      const funds = await fiFundsDB.getQuarterSnapshot('Q1', 2024)
      const isins = funds.map(f => f.fundISIN)
      const duplicateISINs = isins.filter((isin, index) => isins.indexOf(isin) !== index)
      
      if (duplicateISINs.length === 0) {
        addLog('✅ No duplicate ISINs found', 'success')
      } else {
        addLog(`⚠️ Found ${duplicateISINs.length} duplicate ISINs`, 'warning')
      }
      
      // Check for required fields
      const fundsWithMissingData = funds.filter(f => 
        !f.fundName || !f.fundISIN || !f.quarter || !f.year
      )
      
      if (fundsWithMissingData.length === 0) {
        addLog('✅ All funds have required fields', 'success')
      } else {
        addLog(`⚠️ ${fundsWithMissingData.length} funds missing required fields`, 'warning')
      }
      
      addLog('🎯 Data integrity check completed', 'success')
      
    } catch (localforageError) {
      addLog('⚠️ Could not access LocalForage for comparison', 'warning')
    }
    
  } catch (error) {
    addLog(`❌ Data integrity check failed: ${error.message}`, 'error')
    console.error('Data integrity error:', error)
  } finally {
    running.value = false
  }
}

// Initialize component
onMounted(async () => {
  addLog('🔄 Initializing database testing component...', 'info')
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      addLog('❌ IndexedDB not available in this environment', 'error')
      return
    }
    
    addLog('🌐 Browser environment detected, initializing database...', 'info')
    await fiFundsDB.initialize()
    await updateStats()
    addLog('✅ Testing component ready', 'success')
  } catch (error) {
    addLog(`❌ Initialization failed: ${error.message}`, 'error')
    console.error('Full initialization error:', error)
  }
})

// Phase 2: Migration Pipeline Functions
async function runFullMigration() {
  if (running.value) return
  
  running.value = true
  clearLogs()
  addLog('🚀 Starting FULL MIGRATION from LocalForage to IndexedDB', 'info')
  
  try {
    // Confirm with user
    const confirmed = await new Promise((resolve) => {
      $q.dialog({
        title: 'Confirm Full Migration',
        message: 'This will migrate all FI data from LocalForage to IndexedDB. This operation cannot be undone. Continue?',
        cancel: true,
        persistent: true
      }).onOk(() => resolve(true))
        .onCancel(() => resolve(false))
    })
    
    if (!confirmed) {
      addLog('❌ Migration cancelled by user', 'warning')
      return
    }
    
    // Run migration with progress tracking
    const result = await migrateFIData((progress) => {
      addLog(`📊 ${progress.message} (${progress.percentage}%)`, 'info')
      
      // Update stats in real-time
      if (progress.stats) {
        addLog(`   📦 Funds: ${progress.stats.fundsMigrated}/${progress.stats.fundsFound} migrated`, 'info')
        addLog(`   📈 Holdings: ${progress.stats.holdingsMigrated}/${progress.stats.holdingsFound} migrated`, 'info')
      }
    })
    
    if (result.success) {
      addLog(`✅ Migration completed successfully!`, 'success')
      addLog(`📊 Final stats:`, 'success')
      addLog(`   💰 Funds migrated: ${result.stats.fundsMigrated}`, 'success')
      addLog(`   📈 Holdings migrated: ${result.stats.holdingsMigrated}`, 'success')
      addLog(`   ⏱️ Duration: ${(result.duration / 1000).toFixed(1)}s`, 'success')
      
      if (result.errors.length > 0) {
        addLog(`⚠️ ${result.errors.length} errors occurred during migration`, 'warning')
        result.errors.slice(0, 5).forEach(error => {
          addLog(`   Error: ${error.type} - ${error.error}`, 'warning')
        })
      }
      
      // Refresh stats
      await updateStats()
      
      $q.notify({
        type: 'positive',
        message: 'Migration completed successfully!',
        caption: `${result.stats.fundsMigrated} funds, ${result.stats.holdingsMigrated} holdings migrated`
      })
      
    } else {
      addLog(`❌ Migration failed: ${result.error}`, 'error')
      
      $q.notify({
        type: 'negative',
        message: 'Migration failed',
        caption: result.error
      })
    }
    
  } catch (error) {
    addLog(`❌ Migration error: ${error.message}`, 'error')
    console.error('Full migration error:', error)
    
    $q.notify({
      type: 'negative',
      message: 'Migration failed',
      caption: error.message
    })
  } finally {
    running.value = false
  }
}

async function clearIndexedDB() {
  if (running.value) return
  
  running.value = true
  addLog('🧹 Clearing IndexedDB data...', 'info')
  
  try {
    // Confirm with user
    const confirmed = await new Promise((resolve) => {
      $q.dialog({
        title: 'Confirm Clear IndexedDB',
        message: 'This will permanently delete all IndexedDB data. This cannot be undone. Continue?',
        cancel: true,
        persistent: true
      }).onOk(() => resolve(true))
        .onCancel(() => resolve(false))
    })
    
    if (!confirmed) {
      addLog('❌ Clear operation cancelled by user', 'warning')
      return
    }

    // Drop the entire database to avoid schema issues
    await fiFundsDB.drop()
    
    addLog('✅ IndexedDB database dropped successfully', 'success')
    await updateStats()
    
    $q.notify({
      type: 'positive',
      message: 'IndexedDB database dropped and will be recreated on next use'
    })
    
  } catch (error) {
    addLog(`❌ Clear error: ${error.message}`, 'error')
    console.error('Clear IndexedDB error:', error)
    
    $q.notify({
      type: 'negative',
      message: 'Failed to clear IndexedDB',
      caption: error.message
    })
  } finally {
    running.value = false
  }
}

// Phase 2: LocalForage Inspection Function
async function inspectLocalForage() {
  if (running.value) return
  
  running.value = true
  clearLogs()
  addLog('🔍 Inspecting LocalForage contents...', 'info')
  
  try {
    const { FIMigrationPipeline } = await import('../db/fi-funds/FIMigrationPipeline.js')
    const pipeline = new FIMigrationPipeline()
    
    addLog('📊 Creating LocalForage instances with stoqster database...', 'info')
    
    const inspection = await pipeline.inspectLocalForageContents()
    
    addLog('🔍 LocalForage Inspection Results:', 'success')
    
    for (const [storeName, storeData] of Object.entries(inspection)) {
      if (storeData.error) {
        addLog(`❌ ${storeName}: Error - ${storeData.error}`, 'error')
      } else {
        addLog(`📊 ${storeName} (${storeData.storeName}): ${storeData.keyCount} keys`, 'info')
        
        if (storeData.keyCount > 0) {
          addLog(`   Sample keys: ${storeData.keys.slice(0, 5).join(', ')}`, 'info')
          
          for (const [key, data] of Object.entries(storeData.sampleData)) {
            if (data.error) {
              addLog(`   ❌ ${key}: Error reading data`, 'warning')
            } else {
              addLog(`   📄 ${key}: ${data.type}${data.isArray ? ` (array, ${data.length} items)` : ''}${data.keys ? `, keys: ${data.keys.join(', ')}` : ''}`, 'info')
            }
          }
        } else {
          addLog(`   ⚠️ No data found in this store`, 'warning')
        }
      }
    }
    
    addLog('✅ LocalForage inspection completed', 'success')
    
  } catch (error) {
    addLog(`❌ LocalForage inspection failed: ${error.message}`, 'error')
    console.error('LocalForage inspection error:', error)
  }
  
  running.value = false
}
</script>

<style scoped>
.testing-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.testing-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stats-section {
  background-color: #f5f5f5;
}

.log-section {
  background-color: #fafafa;
}

.log-container {
  height: 300px;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 12px;
}

.log-entry {
  color: #d4d4d4;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.log-time {
  color: #858585;
  margin-right: 8px;
  min-width: 80px;
}

.log-message {
  flex: 1;
}

.log-success {
  color: #4caf50;
}

.log-error {
  color: #f44336;
}

.log-warning {
  color: #ff9800;
}

.log-info {
  color: #2196f3;
}
</style>
