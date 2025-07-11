<template>
    <q-dialog v-model="showDialog">
        <q-card style="min-width: 700px; max-width: 900px;">
            <q-card-section class="row items-center q-py-md">
                <div class="text-h6">Inställningar</div>
                <q-space />
                <q-btn icon="mdi-close" flat round dense @click="showDialog = false" />
            </q-card-section>

            <q-separator />

            <q-card-section class="q-pa-none">
                <q-tabs v-model="activeTab" dense class="text-grey" active-color="primary" indicator-color="primary">
                    <q-tab name="general" icon="mdi-cog" label="Allmänt" />
                    <q-tab name="market-data" icon="mdi-chart-line" label="Marknadsdata API" />
                </q-tabs>

                <q-separator />

                <q-tab-panels v-model="activeTab" animated>
                    <!-- General Settings Tab -->
                    <q-tab-panel name="general">
                        <q-list dense>
                            <!-- Appearance Section -->
                            <q-item>
                                <q-item-section>
                                    <q-item-label>Mörkt läge</q-item-label>
                                    <q-item-label caption>
                                        Växla mellan ljust och mörkt tema
                                    </q-item-label>
                                </q-item-section>
                                <q-item-section side>
                                    <q-toggle v-model="darkMode" color="primary"
                                        :icon="darkMode ? 'mdi-weather-night' : 'mdi-weather-sunny'" />
                                </q-item-section>
                            </q-item>

                            <q-separator spaced />

                            <!-- Application Updates -->
                            <q-item>
                                <q-item-section>
                                    <q-item-label>Automatiska uppdateringar</q-item-label>
                                    <q-item-label caption>
                                        Sök automatiskt efter uppdateringar
                                    </q-item-label>
                                </q-item-section>
                                <q-item-section side>
                                    <q-toggle v-model="autoCheckEnabled" color="primary" icon="mdi-update" />
                                </q-item-section>
                            </q-item>

                            <q-item v-if="autoCheckEnabled">
                                <q-item-section>
                                    <q-item-label>Kontrollintervall</q-item-label>
                                    <q-item-label caption>
                                        Hur ofta ska appen söka efter uppdateringar
                                    </q-item-label>
                                </q-item-section>
                                <q-item-section side style="min-width: 120px">
                                    <q-select v-model="autoCheckIntervalMinutes" :options="intervalOptions" option-value="value"
                                        option-label="label" emit-value map-options dense outlined options-dense/>
                                </q-item-section>
                            </q-item>

                            <q-separator spaced />

                            <!-- Data Section -->
                            <q-item>
                                <q-item-section>
                                    <q-item-label>Uppdateringsintervall av data</q-item-label>
                                    <q-item-label caption>
                                        Hur ofta ska data uppdateras automatiskt
                                    </q-item-label>
                                </q-item-section>
                                <q-item-section side style="min-width: 120px">
                                    <q-select v-model="refreshInterval" :options="refreshIntervalOptions" option-value="value"
                                        option-label="label" emit-value map-options dense outlined options-dense/>
                                </q-item-section>
                            </q-item>
                        </q-list>
                    </q-tab-panel>

                    <!-- Market Data API Settings Tab -->
                    <q-tab-panel name="market-data">
                        <div class="text-subtitle2 q-mb-md">API-leverantör för marknadsdata</div>
                        
                        <!-- Active Provider Selection -->
                        <q-item>
                            <q-item-section>
                                <q-item-label>Aktiv API-leverantör</q-item-label>
                                <q-item-label caption>
                                    Välj vilken API-leverantör som ska användas för marknadsdata
                                </q-item-label>
                            </q-item-section>
                            <q-item-section side style="min-width: 180px">
                                <q-select v-model="activeProvider" :options="providerOptions" option-value="value"
                                    option-label="label" emit-value map-options dense outlined options-dense
                                    @update:model-value="onProviderChange" />
                            </q-item-section>
                        </q-item>

                        <q-separator spaced />

                        <!-- Provider Configuration -->
                        <div v-for="(provider, key) in providers" :key="key" class="q-mb-md">
                            <q-expansion-item
                                :model-value="key === activeProvider"
                                :icon="getProviderIcon(key)"
                                :label="provider.name"
                                :caption="provider.description"
                                header-class="text-weight-medium"
                            >
                                <q-card class="q-ma-none" flat>
                                    <q-card-section>
                                        <!-- Provider Status -->
                                        <div class="row items-center q-mb-md">
                                            <q-icon 
                                                :name="provider.configured ? 'mdi-check-circle' : 'mdi-alert-circle'"
                                                :color="provider.configured ? 'positive' : 'warning'"
                                                size="sm"
                                                class="q-mr-sm"
                                            />
                                            <span :class="provider.configured ? 'text-positive' : 'text-warning'">
                                                {{ provider.configured ? 'Konfigurerad' : 'Kräver konfiguration' }}
                                            </span>
                                            <q-space />
                                            <q-toggle 
                                                v-model="provider.enabled" 
                                                color="primary" 
                                                @update:model-value="updateProviderConfig(key)"
                                                :disable="!provider.configured"
                                            />
                                        </div>

                                        <!-- API Key Input (if required) -->
                                        <div v-if="provider.requiresApiKey" class="q-mb-md">
                                            <q-input
                                                v-model="provider.apiKey"
                                                label="API-nyckel"
                                                :placeholder="`Ange din ${provider.name} API-nyckel`"
                                                outlined
                                                dense
                                                :type="showApiKeys[key] ? 'text' : 'password'"
                                                @update:model-value="updateProviderConfig(key)"
                                            >
                                                <template v-slot:append>
                                                    <q-btn
                                                        flat
                                                        round
                                                        dense
                                                        :icon="showApiKeys[key] ? 'mdi-eye-off' : 'mdi-eye'"
                                                        @click="toggleApiKeyVisibility(key)"
                                                    />
                                                </template>
                                            </q-input>
                                        </div>

                                        <!-- Provider Information -->
                                        <div class="text-body2 q-mb-sm">
                                            <div class="text-weight-medium q-mb-xs">Funktioner:</div>
                                            <ul class="q-pl-md q-mb-md">
                                                <li v-for="feature in provider.features" :key="feature">{{ feature }}</li>
                                            </ul>
                                        </div>

                                        <!-- Rate Limits -->
                                        <div class="text-body2 q-mb-sm">
                                            <div class="text-weight-medium q-mb-xs">Begränsningar:</div>
                                            <div class="q-pl-md">
                                                <div>Förfrågningar per minut: {{ provider.rateLimitInfo?.requestsPerMinute || 'Okänt' }}</div>
                                                <div>Förfrågningar per dag: {{ provider.rateLimitInfo?.requestsPerDay || 'Okänt' }}</div>
                                                <div v-if="provider.rateLimitInfo?.currentUsage !== undefined">
                                                    Använt idag: {{ provider.rateLimitInfo.currentUsage }}
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Documentation Link -->
                                        <div class="text-body2">
                                            <q-btn
                                                flat
                                                dense
                                                icon="mdi-book-open-variant"
                                                :label="`${provider.name} dokumentation`"
                                                color="primary"
                                                size="sm"
                                                @click="openExternalLink(provider.documentation)"
                                                v-if="provider.documentation"
                                            />
                                            <q-btn
                                                flat
                                                dense
                                                icon="mdi-account-plus"
                                                label="Skaffa API-nyckel"
                                                color="positive"
                                                size="sm"
                                                @click="openExternalLink(provider.signupUrl)"
                                                v-if="provider.signupUrl && provider.requiresApiKey"
                                                class="q-ml-sm"
                                            />
                                        </div>

                                        <!-- Test Connection Button -->
                                        <div class="q-mt-md">
                                            <q-btn
                                                flat
                                                dense
                                                icon="mdi-connection"
                                                label="Testa anslutning"
                                                color="primary"
                                                size="sm"
                                                @click="testProviderConnection(key)"
                                                :loading="testing[key]"
                                                :disable="!provider.configured || !provider.enabled"
                                            />
                                        </div>
                                    </q-card-section>
                                </q-card>
                            </q-expansion-item>
                        </div>

                        <q-separator spaced />

                        <!-- Provider Test Results -->
                        <div v-if="Object.keys(testResults).length > 0" class="q-mt-md">
                            <div class="text-subtitle2 q-mb-sm">Anslutningstester</div>
                            <div v-for="(result, key) in testResults" :key="key" class="q-mb-sm">
                                <div class="row items-center">
                                    <q-icon 
                                        :name="result.success ? 'mdi-check-circle' : 'mdi-alert-circle'"
                                        :color="result.success ? 'positive' : 'negative'"
                                        size="sm"
                                        class="q-mr-sm"
                                    />
                                    <span>{{ result.provider }}: {{ result.success ? 'Lyckades' : result.error }}</span>
                                </div>
                            </div>
                        </div>
                    </q-tab-panel>
                </q-tab-panels>
            </q-card-section>

            <q-card-actions align="right">
                <q-btn flat label="Stäng" color="primary" @click="showDialog = false" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settings-store.js'
import { useUpdateStore } from '../stores/update-store.js'
import { useQuasar } from 'quasar'
import { getVersion } from '@tauri-apps/api/app'
import { initializeMarketData, testProviderConnectivity, updateMarketDataConfig } from '../api/stocksAPI.js'

// Props
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
})

// Emits
const emit = defineEmits(['update:modelValue', 'checkForUpdates'])

// Composables
const $q = useQuasar()
const settingsStore = useSettingsStore()
const updateStore = useUpdateStore()

// Reactive refs
const { darkMode, refreshInterval } = storeToRefs(settingsStore)
const {
    autoCheckEnabled,
    autoCheckIntervalMinutes
} = storeToRefs(updateStore)

const currentVersion = ref('')
const activeTab = ref('general')
const showDialog = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

// Market Data API Configuration
const activeProvider = ref('yahoo')
const providers = ref({})
const testing = ref({})
const testResults = ref({})
const showApiKeys = ref({})

// Provider options for selection
const providerOptions = [
    { label: 'Yahoo Finance (Gratis)', value: 'yahoo' },
    { label: 'Alpha Vantage', value: 'alphavantage' },
    { label: 'Finnhub', value: 'finnhub' },
    { label: 'Financial Modeling Prep', value: 'fmp' }
]

// Options for intervals
const intervalOptions = [
    { label: '15 minuter', value: 15 },
    { label: '30 minuter', value: 30 },
    { label: '1 timme', value: 60 },
    { label: '2 timmar', value: 120 },
    { label: '4 timmar', value: 240 },
    { label: '8 timmar', value: 480 },
    { label: '24 timmar', value: 1440 }
]

const refreshIntervalOptions = [
    { label: '30 sekunder', value: 30 * 1000 },
    { label: '1 minut', value: 60 * 1000 },
    { label: '5 minuter', value: 5 * 60 * 1000 },
    { label: '15 minuter', value: 15 * 60 * 1000 },
    { label: '30 minuter', value: 30 * 60 * 1000 },
    { label: '1 timme', value: 60 * 60 * 1000 },
    { label: '2 timmar', value: 2 * 60 * 60 * 1000 },
    { label: '4 timmar', value: 4 * 60 * 60 * 1000 }
]

// Get current version on mount
const getCurrentVersion = async () => {
    try {
        currentVersion.value = await getVersion()
        console.log('📱 Current version from settings dialog:', currentVersion.value)
    } catch (error) {
        console.error('❌ Error getting version in settings dialog:', error)
        currentVersion.value = ''
    }
}

// Initialize market data providers
const initializeProviders = () => {
    console.log('🔄 Initializing provider configuration...')
    
    // Load saved configuration from localStorage
    const savedConfig = loadMarketDataConfig()
    
    // Initialize market data with saved configuration
    const manager = initializeMarketData(savedConfig)
    const providerInfo = manager.getProviderInfo()
    const usageStats = manager.getUsageStatistics()
    
    // Merge provider information with usage statistics
    const mergedProviders = {}
    for (const [key, info] of Object.entries(providerInfo)) {
        const stats = usageStats[key] || {}
        mergedProviders[key] = {
            ...info,
            enabled: stats.enabled || false,
            configured: stats.configured || false,
            apiKey: savedConfig[key]?.apiKey || '',
            rateLimitInfo: stats.rateLimit || {}
        }
        
        // Initialize visibility state for API keys
        showApiKeys.value[key] = false
    }
    
    providers.value = mergedProviders
    activeProvider.value = savedConfig.activeProvider || 'yahoo'
    
    console.log('✅ Provider configuration initialized')
}

// Load market data configuration from localStorage
const loadMarketDataConfig = () => {
    try {
        const saved = localStorage.getItem('marketDataConfig')
        return saved ? JSON.parse(saved) : getDefaultConfig()
    } catch (error) {
        console.error('❌ Error loading market data config:', error)
        return getDefaultConfig()
    }
}

// Save market data configuration to localStorage
const saveMarketDataConfig = (config) => {
    try {
        localStorage.setItem('marketDataConfig', JSON.stringify(config))
        console.log('💾 Market data configuration saved')
    } catch (error) {
        console.error('❌ Error saving market data config:', error)
    }
}

// Get default configuration
const getDefaultConfig = () => ({
    activeProvider: 'yahoo',
    fallbackEnabled: true,
    yahoo: { enabled: true, apiKey: null },
    alphavantage: { enabled: false, apiKey: null },
    finnhub: { enabled: false, apiKey: null },
    fmp: { enabled: false, apiKey: null }
})

// Get provider icon
const getProviderIcon = (key) => {
    const icons = {
        yahoo: 'mdi-yahoo',
        alphavantage: 'mdi-alpha-a-circle',
        finnhub: 'mdi-fish',
        fmp: 'mdi-chart-bell-curve'
    }
    return icons[key] || 'mdi-api'
}

// Handle provider change
const onProviderChange = (newProvider) => {
    console.log('🔄 Changing active provider to:', newProvider)
    activeProvider.value = newProvider
    updateMarketDataConfiguration()
}

// Update provider configuration
const updateProviderConfig = (providerKey) => {
    console.log('🔧 Updating configuration for provider:', providerKey)
    
    const provider = providers.value[providerKey]
    if (provider) {
        // Update configured status
        provider.configured = provider.requiresApiKey ? !!provider.apiKey : true
        
        // Update market data configuration
        updateMarketDataConfiguration()
    }
}

// Update market data configuration
const updateMarketDataConfiguration = () => {
    const config = {
        activeProvider: activeProvider.value,
        fallbackEnabled: true
    }
    
    // Add provider-specific configurations
    for (const [key, provider] of Object.entries(providers.value)) {
        const providerKey = key === 'alphavantage' ? 'alphaVantage' : 
                          key === 'fmp' ? 'financialModelingPrep' : key
        
        config[providerKey] = {
            enabled: provider.enabled,
            apiKey: provider.apiKey || null
        }
    }
    
    // Save configuration
    saveMarketDataConfig(config)
    
    // Update market data manager
    try {
        updateMarketDataConfig(config)
        
        $q.notify({
            type: 'positive',
            message: 'Marknadsdata-konfiguration uppdaterad',
            timeout: 2000
        })
    } catch (error) {
        console.error('❌ Error updating market data config:', error)
        $q.notify({
            type: 'negative',
            message: 'Fel vid uppdatering av konfiguration',
            timeout: 3000
        })
    }
}

// Toggle API key visibility
const toggleApiKeyVisibility = (providerKey) => {
    showApiKeys.value[providerKey] = !showApiKeys.value[providerKey]
}

// Test provider connection
const testProviderConnection = async (providerKey) => {
    testing.value[providerKey] = true
    
    try {
        console.log('🧪 Testing connection for provider:', providerKey)
        
        const results = await testProviderConnectivity()
        testResults.value = results
        
        const result = results[providerKey]
        if (result) {
            $q.notify({
                type: result.success ? 'positive' : 'negative',
                message: `${result.provider}: ${result.success ? 'Anslutning lyckades' : result.error}`,
                timeout: 3000
            })
        }
    } catch (error) {
        console.error('❌ Error testing provider connection:', error)
        $q.notify({
            type: 'negative',
            message: 'Fel vid test av anslutning',
            timeout: 3000
        })
    } finally {
        testing.value[providerKey] = false
    }
}

// Open external link
const openExternalLink = (url) => {
    if (url) {
        window.open(url, '_blank')
    }
}

// Watch for dialog opening to initialize
watch(showDialog, (newValue) => {
    if (newValue) {
        getCurrentVersion()
        initializeProviders()
    }
})

onMounted(() => {
    // Initialize providers on component mount
    if (showDialog.value) {
        initializeProviders()
    }
})
</script>
