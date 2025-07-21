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
              color="green" 
              icon="mdi-database-plus"
              label="Generate Mock Data"
              class="full-width"
            />
          </div>
          <div class="col">
            <q-btn 
              @click="testDatabaseUpgrade" 
              :loading="running"
              :disable="running"
              color="deep-purple" 
              icon="mdi-database-refresh"
              label="🔄 Test Database Upgrade"
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
              @click="clearIndexedDB" 
              :loading="running"
              :disable="running"
              color="orange" 
              icon="mdi-database-remove"
              label="Clear IndexedDB"
              class="full-width"
            />
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <!-- Test Results -->
      <q-card-section class="q-pt-md">
        <div class="text-h6 q-mb-md">Test Results</div>
        
        <q-scroll-area 
          style="height: 400px; max-height: 60vh" 
          class="test-results-area"
        >
          <div v-if="testResults.length === 0" class="text-center text-grey-6 q-pa-lg">
            Click a test button to see results
          </div>
          
          <div v-for="(result, index) in testResults" :key="index" class="test-result-item">
            <q-badge 
              :color="getLogColor(result.type)" 
              :label="result.timestamp"
              class="q-mr-sm"
            />
            <span 
              :class="getLogTextClass(result.type)"
              v-html="result.message"
            />
          </div>
        </q-scroll-area>
        
        <div class="q-mt-md text-center">
          <q-btn 
            @click="clearResults" 
            size="sm" 
            color="grey" 
            icon="mdi-trash-can"
            label="Clear Results"
            flat
          />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'

// Import the database class directly to avoid potential initialization issues
import { FIFundsDB } from '../db/fi-funds/FIFundsDB.js'
import { useFIStore } from '../stores/fi-store.js'

export default {
  name: 'DatabaseTesting',
  setup() {
    const $q = useQuasar()
    const fiStore = useFIStore()
    
    // State
    const running = ref(false)
    const testResults = ref([])
    
    // Database instance
    let fiFundsDB = null
    
    // Initialize database
    onMounted(async () => {
      try {
        fiFundsDB = new FIFundsDB()
        await fiFundsDB.initialize()
        addLog('✅ Database initialized successfully', 'success')
      } catch (error) {
        addLog(`❌ Failed to initialize database: ${error.message}`, 'error')
      }
    })
    
    // Utility functions
    function addLog(message, type = 'info') {
      const timestamp = new Date().toLocaleTimeString()
      testResults.value.push({
        message,
        type,
        timestamp
      })
    }
    
    function clearResults() {
      testResults.value = []
    }
    
    function getLogColor(type) {
      switch (type) {
        case 'success': return 'positive'
        case 'error': return 'negative'
        case 'warning': return 'warning'
        default: return 'primary'
      }
    }
    
    function getLogTextClass(type) {
      switch (type) {
        case 'success': return 'text-positive'
        case 'error': return 'text-negative'
        case 'warning': return 'text-warning'
        default: return ''
      }
    }
    
    // Generate mock data
    async function generateMockData() {
      running.value = true
      addLog('🔄 Generating mock data...', 'info')
      
      try {
        // Generate mock funds
        const mockFunds = []
        for (let i = 1; i <= 10; i++) {
          mockFunds.push({
            'Fond_namn': `Test Fund ${i}`,
            'Fond_ISIN-kod': `SE000000000${i.toString().padStart(2, '0')}`,
            'Förvaltare': 'Test Manager',
            'Andelskapital': Math.floor(Math.random() * 1000000),
            sourceDate: '2024-03-31',
            quarter: '2024-Q1'
          })
        }
        
        // Generate mock holdings
        const mockHoldings = []
        mockFunds.forEach((fund, fundIndex) => {
          for (let j = 1; j <= 5; j++) {
            mockHoldings.push({
              'Instrumentnamn': `Holding ${j} for ${fund['Fond_namn']}`,
              'ISIN-kod': `US000000000${(fundIndex * 5 + j).toString().padStart(2, '0')}`,
              'Marknadsv__rde': Math.floor(Math.random() * 100000),
              fundName: fund['Fond_namn'],
              fundISIN: fund['Fond_ISIN-kod'],
              sourceDate: '2024-03-31',
              quarter: '2024-Q1'
            })
          }
        })
        
        addLog(`Generated ${mockFunds.length} mock funds and ${mockHoldings.length} mock holdings`, 'success')
        
        // Save to database
        const importedFunds = await fiFundsDB.bulkImportFunds(mockFunds)
        const importedHoldings = await fiFundsDB.bulkImportHoldings(mockHoldings)
        
        addLog(`✅ Imported ${importedFunds} funds and ${importedHoldings} holdings`, 'success')
        
      } catch (error) {
        addLog(`❌ Failed to generate mock data: ${error.message}`, 'error')
      } finally {
        running.value = false
      }
    }
    
    // Basic database tests
    async function runBasicTests() {
      running.value = true
      addLog('🧪 Running basic database tests...', 'info')
      
      try {
        // Test database stats
        const stats = await fiFundsDB.getDatabaseStats()
        addLog(`📊 Database stats: ${stats.totalFunds} funds, ${stats.totalHoldings} holdings`, 'info')
        
        // Test fund retrieval
        const funds = await fiFundsDB.getFundsBySourceDate('2024-03-31')
        addLog(`📈 Retrieved ${funds.length} funds for 2024-03-31`, 'info')
        
        // Test holding retrieval  
        const holdings = await fiFundsDB.getHoldingsBySourceDate('2024-03-31')
        addLog(`💼 Retrieved ${holdings.length} holdings for 2024-03-31`, 'info')
        
        addLog('✅ Basic tests completed successfully', 'success')
        
      } catch (error) {
        addLog(`❌ Basic tests failed: ${error.message}`, 'error')
      } finally {
        running.value = false
      }
    }
    
    // Performance tests
    async function runPerformanceTests() {
      running.value = true
      addLog('⚡ Running performance tests...', 'info')
      
      try {
        // Test bulk operations performance
        const startTime = performance.now()
        
        // Generate larger dataset for performance testing
        const largeFunds = []
        for (let i = 1; i <= 100; i++) {
          largeFunds.push({
            'Fond_namn': `Perf Test Fund ${i}`,
            'Fond_ISIN-kod': `PERF00000${i.toString().padStart(3, '0')}`,
            'Förvaltare': 'Performance Manager',
            'Andelskapital': Math.floor(Math.random() * 1000000),
            sourceDate: '2024-06-30',
            quarter: '2024-Q2'
          })
        }
        
        const bulkStartTime = performance.now()
        const imported = await fiFundsDB.bulkImportFunds(largeFunds)
        const bulkEndTime = performance.now()
        
        addLog(`✅ Bulk imported ${imported} funds in ${(bulkEndTime - bulkStartTime).toFixed(2)}ms`, 'success')
        
        // Test retrieval performance
        const retrievalStartTime = performance.now()
        const retrievedFunds = await fiFundsDB.getFundsBySourceDate('2024-06-30')
        const retrievalEndTime = performance.now()
        
        addLog(`📊 Retrieved ${retrievedFunds.length} funds in ${(retrievalEndTime - retrievalStartTime).toFixed(2)}ms`, 'info')
        
        const totalTime = performance.now() - startTime
        addLog(`✅ Performance tests completed in ${totalTime.toFixed(2)}ms`, 'success')
        
      } catch (error) {
        addLog(`❌ Performance tests failed: ${error.message}`, 'error')
      } finally {
        running.value = false
      }
    }
    
    // Database upgrade test
    async function testDatabaseUpgrade() {
      running.value = true
      addLog('🔄 Testing database upgrade functionality...', 'info')
      
      try {
        // Perform database upgrade operation
        addLog('🔄 Performing database upgrade operation...', 'info')
        
        const wasUpgradePerformed = await fiStore.performDatabaseUpgrade()
        
        if (wasUpgradePerformed) {
          addLog('✅ Database upgrade completed successfully - legacy data was cleared', 'success')
        } else {
          addLog('ℹ️ No database upgrade needed - no legacy data found or system already using new IndexedDB format', 'info')
        }
        
        // Check stores after upgrade
        addLog('� Checking stores after upgrade...', 'info')
        
        // Check LocalForage stores should be empty
        let legacyCount = 0
        await fiStore.fundsStore.iterate(() => {
          legacyCount++
        })
        
        if (legacyCount === 0) {
          addLog('✅ Legacy LocalForage stores are clear', 'success')
        } else {
          addLog(`⚠️ Legacy stores still contain ${legacyCount} items`, 'warning')
        }
        
        addLog('✅ Database upgrade test completed', 'success')
        
      } catch (error) {
        console.error('❌ Database upgrade test failed:', error)
        addLog(`❌ Database upgrade test failed: ${error.message}`, 'error')
      } finally {
        running.value = false
      }
    }
    
    // Inspect LocalForage data
    async function inspectLocalForage() {
      running.value = true
      addLog('🔍 Inspecting LocalForage data...', 'info')
      
      try {
        // Import LocalForage to test reading existing data
        const { default: localforage } = await import('localforage')
        
        // Check funds store
        const fundsStore = localforage.createInstance({
          name: 'stoqster',
          storeName: 'fi-funds'
        })
        
        let fundDataCount = 0
        let quarterKeys = []
        
        await fundsStore.iterate((value, key) => {
          if (Array.isArray(value)) {
            fundDataCount += value.length
            quarterKeys.push(key)
          }
        })
        
        addLog(`📊 Found ${fundDataCount} fund records across ${quarterKeys.length} quarters: ${quarterKeys.join(', ')}`, 'info')
        
        // Check holdings store
        const holdingsStore = localforage.createInstance({
          name: 'stoqster',
          storeName: 'fi-holdings'
        })
        
        let holdingDataCount = 0
        let holdingQuarters = []
        
        await holdingsStore.iterate((value, key) => {
          if (Array.isArray(value)) {
            holdingDataCount += value.length
            holdingQuarters.push(key)
          }
        })
        
        addLog(`💼 Found ${holdingDataCount} holding records across ${holdingQuarters.length} quarters: ${holdingQuarters.join(', ')}`, 'info')
        
        addLog('✅ LocalForage inspection completed', 'success')
        
      } catch (error) {
        addLog(`❌ LocalForage inspection failed: ${error.message}`, 'error')
      } finally {
        running.value = false
      }
    }
    
    // Clear IndexedDB
    async function clearIndexedDB() {
      running.value = true
      addLog('🗑️ Clearing IndexedDB...', 'warning')
      
      try {
        // Clear both funds and holdings stores
        await fiFundsDB.clear('funds')
        addLog('✅ Funds store cleared', 'success')
        
        await fiFundsDB.clear('holdings')
        addLog('✅ Holdings store cleared', 'success')
        
        // Clear FI store state (imports, selectedQuarters, etc.)
        fiStore.imports = []
        fiStore.selectedQuarters = []
        fiStore.funds = []
        fiStore.holdings = []
        fiStore.quarterStates = {}
        addLog('✅ FI Store state cleared successfully', 'success')
        
      } catch (error) {
        addLog(`❌ Failed to clear IndexedDB: ${error.message}`, 'error')
      } finally {
        running.value = false
      }
    }
    
    return {
      running,
      testResults,
      generateMockData,
      runBasicTests,
      runPerformanceTests,
      testDatabaseUpgrade,
      inspectLocalForage,
      clearIndexedDB,
      clearResults,
      getLogColor,
      getLogTextClass
    }
  }
}
</script>

<style scoped>
.testing-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.testing-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.test-results-area {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
}

.test-result-item {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.test-result-item:last-child {
  border-bottom: none;
}

.test-result-item:hover {
  background-color: #f5f5f5;
}
</style>