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
