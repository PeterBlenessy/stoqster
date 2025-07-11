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
                        
                        <!-- Provider Selection with Icons and Status -->
                        <div class="q-mb-md">
                            <q-select 
                                v-model="activeProvider" 
                                :options="enhancedProviderOptions" 
                                option-value="value"
                                option-label="label" 
                                emit-value 
                                map-options 
                                outlined 
                                label="Välj API-leverantör"
                                @update:model-value="onProviderChange"
                                class="full-width"
                            >
                                <template v-slot:option="scope">
                                    <q-item v-bind="scope.itemProps">
                                        <q-item-section avatar>
                                            <q-icon :name="scope.opt.icon" />
                                        </q-item-section>
                                        <q-item-section>
                                            <q-item-label>{{ scope.opt.label }}</q-item-label>
                                            <q-item-label caption class="text-grey-6">{{ scope.opt.description }}</q-item-label>
                                        </q-item-section>
                                        <q-item-section side>
                                            <q-icon 
                                                :name="getProviderStatusIcon(scope.opt.value)"
                                                :color="getProviderStatusColor(scope.opt.value)"
                                                size="sm"
                                            />
                                        </q-item-section>
                                    </q-item>
                                </template>
                                
                                <template v-slot:selected-item="scope">
                                    <div class="row items-center">
                                        <q-icon :name="scope.opt.icon" class="q-mr-sm" />
                                        <span>{{ scope.opt.label }}</span>
                                    </div>
                                </template>
                            </q-select>
                        </div>

                        <!-- Selected Provider Information Card -->
                        <q-card v-if="selectedProvider" flat bordered class="q-mb-md">
                            <q-card-section>
                                <div class="row items-center q-mb-md">
                                    <q-icon :name="getProviderIcon(activeProvider)" size="md" class="q-mr-md" />
                                    <div>
                                        <div class="text-h6">{{ selectedProvider.name }}</div>
                                        <div class="text-body2 text-grey-6">{{ selectedProvider.description }}</div>
                                    </div>
                                </div>

                                <!-- Rate Limit Information -->
                                <div class="text-body2 q-mb-md">
                                    <div class="text-weight-medium q-mb-xs">Begränsningar:</div>
                                    <div class="row q-gutter-md">
                                        <div v-if="selectedProvider.rateLimitInfo?.requestsPerMinute">
                                            <q-chip outline color="primary" size="sm">
                                                {{ selectedProvider.rateLimitInfo.requestsPerMinute }} förfrågningar/min
                                            </q-chip>
                                        </div>
                                        <div v-if="selectedProvider.rateLimitInfo?.requestsPerDay">
                                            <q-chip outline color="primary" size="sm">
                                                {{ selectedProvider.rateLimitInfo.requestsPerDay }} förfrågningar/dag
                                            </q-chip>
                                        </div>
                                    </div>
                                </div>

                                <!-- Configuration Section -->
                                <div class="q-mt-md">
                                    <!-- API Key Configuration -->
                                    <div v-if="selectedProvider.requiresApiKey">
                                        <!-- Not Configured State -->
                                        <div v-if="!selectedProvider.configured && !showConfigureForm">
                                            <q-btn 
                                                color="primary" 
                                                icon="mdi-cog" 
                                                label="Konfigurera" 
                                                @click="startConfiguration"
                                                unelevated
                                            />
                                        </div>

                                        <!-- Configured State -->
                                        <div v-else-if="selectedProvider.configured && !showConfigureForm">
                                            <div class="row q-gutter-sm">
                                                <q-btn 
                                                    color="primary" 
                                                    icon="mdi-pencil" 
                                                    label="Redigera" 
                                                    @click="startConfiguration"
                                                    outline
                                                />
                                                <q-btn 
                                                    color="positive" 
                                                    :icon="getConnectionTestIcon(activeProvider)"
                                                    label="Testa anslutning" 
                                                    @click="testProviderConnection(activeProvider)"
                                                    :loading="testing[activeProvider]"
                                                    unelevated
                                                />
                                            </div>
                                        </div>

                                        <!-- Configuration Form -->
                                        <div v-if="showConfigureForm">
                                            <q-input
                                                v-model="configFormApiKey"
                                                label="API-nyckel"
                                                :placeholder="`Ange din ${selectedProvider.name} API-nyckel`"
                                                outlined
                                                :type="showConfigFormApiKey ? 'text' : 'password'"
                                                class="q-mb-md"
                                            >
                                                <template v-slot:append>
                                                    <q-btn
                                                        flat
                                                        round
                                                        dense
                                                        :icon="showConfigFormApiKey ? 'mdi-eye-off' : 'mdi-eye'"
                                                        @click="toggleConfigFormApiKeyVisibility"
                                                    />
                                                </template>
                                            </q-input>
                                            
                                            <div class="row q-gutter-sm">
                                                <q-btn 
                                                    color="primary" 
                                                    icon="mdi-content-save" 
                                                    label="Spara" 
                                                    @click="saveConfiguration"
                                                    unelevated
                                                />
                                                <q-btn 
                                                    color="grey-7" 
                                                    icon="mdi-close" 
                                                    label="Avbryt" 
                                                    @click="cancelConfiguration"
                                                    flat
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- No API Key Required (e.g., Yahoo) -->
                                    <div v-else>
                                        <q-btn 
                                            color="positive" 
                                            :icon="getConnectionTestIcon(activeProvider)"
                                            label="Testa anslutning" 
                                            @click="testProviderConnection(activeProvider)"
                                            :loading="testing[activeProvider]"
                                            unelevated
                                        />
                                    </div>
                                </div>

                                <!-- Documentation and Signup Links -->
                                <div v-if="selectedProvider.documentation || selectedProvider.signupUrl" class="q-mt-md q-pt-md border-top">
                                    <div class="row q-gutter-sm">
                                        <q-btn
                                            flat
                                            dense
                                            icon="mdi-book-open-variant"
                                            :label="'Dokumentation'"
                                            color="primary"
                                            size="sm"
                                            @click="openExternalLink(selectedProvider.documentation)"
                                            v-if="selectedProvider.documentation"
                                        />
                                        <q-btn
                                            flat
                                            dense
                                            icon="mdi-account-plus"
                                            label="Skaffa API-nyckel"
                                            color="positive"
                                            size="sm"
                                            @click="openExternalLink(selectedProvider.signupUrl)"
                                            v-if="selectedProvider.signupUrl && selectedProvider.requiresApiKey"
                                        />
                                    </div>
                                </div>
                            </q-card-section>
                        </q-card>
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

// Configuration form state
const showConfigureForm = ref(false)
const configFormApiKey = ref('')
const showConfigFormApiKey = ref(false)

// Provider options for selection with enhanced structure
const enhancedProviderOptions = [
    { 
        label: 'Yahoo Finance', 
        value: 'yahoo',
        icon: 'mdi-yahoo',
        description: 'Gratis marknadsdata utan API-nyckel'
    },
    { 
        label: 'Alpha Vantage', 
        value: 'alphavantage',
        icon: 'mdi-alpha-a-circle',
        description: 'Premiumdata med API-nyckel'
    },
    { 
        label: 'Finnhub', 
        value: 'finnhub',
        icon: 'mdi-fish',
        description: 'Finansiell data med API-nyckel'
    },
    { 
        label: 'Financial Modeling Prep', 
        value: 'fmp',
        icon: 'mdi-chart-bell-curve',
        description: 'Omfattande finansdata med API-nyckel'
    }
]

// Simple provider options for backward compatibility
const providerOptions = enhancedProviderOptions.map(p => ({ label: p.label, value: p.value }))

// Computed property for selected provider
const selectedProvider = computed(() => {
    return providers.value[activeProvider.value] || null
})

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

// Get provider status icon
const getProviderStatusIcon = (providerKey) => {
    const provider = providers.value[providerKey]
    if (!provider) return 'mdi-circle-outline'
    
    if (!provider.configured) return 'mdi-alert-circle'
    
    // Check connection status from test results
    const testResult = testResults.value[providerKey]
    if (testResult) {
        return testResult.success ? 'mdi-check-circle' : 'mdi-close-circle'
    }
    
    return 'mdi-check-circle' // Default to configured if no test results
}

// Get provider status color
const getProviderStatusColor = (providerKey) => {
    const provider = providers.value[providerKey]
    if (!provider) return 'grey'
    
    if (!provider.configured) return 'warning'
    
    // Check connection status from test results
    const testResult = testResults.value[providerKey]
    if (testResult) {
        return testResult.success ? 'positive' : 'negative'
    }
    
    return 'positive' // Default to positive if no test results
}

// Get connection test icon
const getConnectionTestIcon = (providerKey) => {
    const testResult = testResults.value[providerKey]
    if (testResult) {
        return testResult.success ? 'mdi-check-circle' : 'mdi-alert-circle'
    }
    return 'mdi-connection'
}

// Configuration form methods
const startConfiguration = () => {
    showConfigureForm.value = true
    configFormApiKey.value = selectedProvider.value?.apiKey || ''
    showConfigFormApiKey.value = false
}

const cancelConfiguration = () => {
    showConfigureForm.value = false
    configFormApiKey.value = ''
    showConfigFormApiKey.value = false
}

const saveConfiguration = () => {
    if (selectedProvider.value) {
        // Update the provider's API key
        selectedProvider.value.apiKey = configFormApiKey.value
        selectedProvider.value.configured = selectedProvider.value.requiresApiKey ? !!configFormApiKey.value : true
        
        // Update configuration
        updateProviderConfig(activeProvider.value)
        
        // Close form
        showConfigureForm.value = false
        configFormApiKey.value = ''
        showConfigFormApiKey.value = false
        
        $q.notify({
            type: 'positive',
            message: 'Konfiguration sparad',
            timeout: 2000
        })
    }
}

const toggleConfigFormApiKeyVisibility = () => {
    showConfigFormApiKey.value = !showConfigFormApiKey.value
}

// Handle provider change
const onProviderChange = (newProvider) => {
    console.log('🔄 Changing active provider to:', newProvider)
    activeProvider.value = newProvider
    
    // Close configuration form if open
    showConfigureForm.value = false
    configFormApiKey.value = ''
    
    updateMarketDataConfiguration()
    
    // Test all providers in background to update status indicators
    performBackgroundTests()
}

// Perform background connectivity tests for all configured providers
const performBackgroundTests = async () => {
    console.log('🔍 Performing background connectivity tests...')
    
    try {
        for (const [key, provider] of Object.entries(providers.value)) {
            if (provider.configured) {
                // Don't show loading state for background tests
                setTimeout(() => testProviderConnection(key, true), 100 * Object.keys(providers.value).indexOf(key))
            }
        }
    } catch (error) {
        console.error('❌ Error performing background tests:', error)
    }
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
const testProviderConnection = async (providerKey, isBackground = false) => {
    if (!isBackground) {
        testing.value[providerKey] = true
    }
    
    try {
        console.log('🧪 Testing connection for provider:', providerKey)
        
        const results = await testProviderConnectivity()
        testResults.value = results
        
        const result = results[providerKey]
        if (result && !isBackground) {
            $q.notify({
                type: result.success ? 'positive' : 'negative',
                message: `${result.provider}: ${result.success ? 'Anslutning lyckades' : result.error}`,
                timeout: 3000
            })
        }
    } catch (error) {
        console.error('❌ Error testing provider connection:', error)
        if (!isBackground) {
            $q.notify({
                type: 'negative',
                message: 'Fel vid test av anslutning',
                timeout: 3000
            })
        }
    } finally {
        if (!isBackground) {
            testing.value[providerKey] = false
        }
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
        
        // Perform background tests after a short delay to allow UI to render
        setTimeout(() => {
            performBackgroundTests()
        }, 500)
    }
})

onMounted(() => {
    // Initialize providers on component mount
    if (showDialog.value) {
        initializeProviders()
    }
})
</script>

<style scoped>
.border-top {
    border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.full-width {
    width: 100%;
}
</style>
