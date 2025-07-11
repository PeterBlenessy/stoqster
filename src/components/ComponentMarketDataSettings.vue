<template>
    <div>
        <div class="text-subtitle2 q-mb-md">API-leverantör för marknadsdata</div>

        <!-- Provider Selection with Icons and Status -->
        <div class="q-mb-md">
            <q-select v-model="activeProvider" :options="enhancedProviderOptions" option-value="value"
                option-label="label" emit-value map-options outlined dense class="full-width"
                @update:model-value="onProviderChange">
                <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps" dense>
                        <q-item-section avatar>
                            <q-icon :name="scope.opt.icon" />
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>{{ scope.opt.label }}</q-item-label>
                            <q-item-label caption class="text-grey-6">{{ scope.opt.description }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <q-icon :name="getConnectionTestIcon(scope.opt.value)"
                                :color="getConnectionTestColor(scope.opt.value)" size="sm" />
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
        <q-card v-if="selectedProvider" flat class="q-mb-none">
            <q-card-section class="q-pa-none">
                <!-- Provider Description -->
                <div class="text-caption q-mb-md">{{ getSwedishDescription(activeProvider) }}</div>

                <!-- Rate Limit Information -->
                <div class="text-caption"
                    v-if="selectedProvider.rateLimitInfo?.requestsPerMinute || selectedProvider.rateLimitInfo?.requestsPerDay">
                    Begränsningar:
                    <q-chip v-if="selectedProvider.rateLimitInfo?.requestsPerMinute" outline square size="sm" dense>
                        {{ selectedProvider.rateLimitInfo.requestsPerMinute }} förfrågningar/min
                    </q-chip>
                    <q-chip v-if="selectedProvider.rateLimitInfo?.requestsPerDay" outline square size="sm" dense>
                        {{ selectedProvider.rateLimitInfo.requestsPerDay }} förfrågningar/dag
                    </q-chip>

                </div>

                <!-- Configuration Section -->
                <div class="q-mt-md">
                    <!-- Unified Action Row -->
                    <div class="row q-gutter-sm q-mb-md">
                        <!-- Configure/Edit Button (hidden when form is shown) -->
                        <div v-if="selectedProvider.requiresApiKey && !showConfigureForm">
                            <q-btn v-if="!selectedProvider.configured" 
                                color="primary" icon="mdi-cog" label="Konfigurera" 
                                @click="startConfiguration" unelevated dense size="sm" class="q-pa-sm" />
                            <q-btn v-else 
                                color="primary" icon="mdi-pencil" label="Redigera" 
                                @click="startConfiguration" dense size="sm" class="q-pa-sm" />
                        </div>

                        <!-- Save & Cancel Buttons (replace Configure/Edit when in form mode) -->
                        <div v-if="showConfigureForm" class="row q-gutter-sm">
                            <q-btn color="primary" icon="mdi-content-save" label="Spara" 
                                @click="saveConfiguration" unelevated dense size="sm" class="q-pa-sm" />
                            <q-btn color="grey-7" icon="mdi-close" label="Avbryt" 
                                @click="cancelConfiguration" flat dense size="sm" class="q-pa-sm" />
                        </div>

                        <!-- Unified Connection Test Button -->
                        <q-btn v-if="!showConfigureForm && (!selectedProvider.requiresApiKey || selectedProvider.configured)" 
                            flat dense size="sm" class="q-pa-sm" 
                            @click="testProviderConnection(activeProvider)" :loading="testing[activeProvider]">
                            <template v-slot:default>
                                <q-icon :name="connectionTestIcon" :color="connectionTestColor" class="q-mr-xs" />
                                Testa anslutningen
                            </template>
                        </q-btn>
                    </div>

                    <!-- API Key Input Field (shown below buttons when configuring) -->
                    <div v-if="showConfigureForm && selectedProvider.requiresApiKey">
                        <q-input v-model="configFormApiKey" label="API-nyckel"
                            :placeholder="`Ange din ${selectedProvider.name} API-nyckel`" outlined dense
                            :type="showConfigFormApiKey ? 'text' : 'password'" class="q-mb-md">
                            <template v-slot:append>
                                <q-btn flat round dense size="sm" class="q-pa-sm"
                                    :icon="showConfigFormApiKey ? 'mdi-eye-off' : 'mdi-eye'"
                                    @click="toggleConfigFormApiKeyVisibility" />
                            </template>
                        </q-input>
                    </div>
                </div>

                <!-- Documentation and Signup Links -->
                <div v-if="selectedProvider.documentation || selectedProvider.signupUrl"
                    class="q-mt-md q-pt-md border-top">
                    <div class="row q-gutter-sm">
                        <q-btn flat dense icon="mdi-book-open-variant" label="Dokumentation" size="sm"
                            @click="openExternalLink(selectedProvider.documentation)"
                            v-if="selectedProvider.documentation" />
                        <q-btn flat dense icon="mdi-account-plus" label="Skaffa API-nyckel" size="sm"
                            @click="openExternalLink(selectedProvider.signupUrl)"
                            v-if="selectedProvider.signupUrl && selectedProvider.requiresApiKey" />
                    </div>
                </div>
            </q-card-section>
        </q-card>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { initializeMarketData, testSingleProviderConnectivity, updateMarketDataConfig } from '../api/stocksAPI.js'
import { openUrl } from '@tauri-apps/plugin-opener'

// Composables
const $q = useQuasar()

// Reactive refs
const activeProvider = ref('yahoo')
const providers = ref({})
const testing = ref({})
const testResults = ref({})

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

// Swedish descriptions for providers
const swedishDescriptions = {
    yahoo: 'Gratis marknadsdata från Yahoo Finance utan behov av API-nyckel',
    alphavantage: 'Premiumdata från Alpha Vantage med omfattande finansiell information',
    finnhub: 'Professionell marknadsdata från Finnhub med realtidsuppdateringar',
    fmp: 'Omfattande finansdata från Financial Modeling Prep för djup analys'
}

// Computed property for selected provider
const selectedProvider = computed(() => {
    return providers.value[activeProvider.value] || null
})

// Computed property for connection test icon to ensure reactivity
const connectionTestIcon = computed(() => {
    return getConnectionTestIcon(activeProvider.value)
})

// Computed property for connection test color to ensure reactivity
const connectionTestColor = computed(() => {
    return getConnectionTestColor(activeProvider.value)
})

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
        const apiKey = savedConfig[key]?.apiKey || ''
        
        // Determine if provider is configured based on whether it requires an API key
        let isConfigured = false
        if (!info.requiresApiKey) {
            // Providers like Yahoo that don't require API key are always configured
            isConfigured = true
        } else {
            // Providers that require API key are configured if they have one
            isConfigured = apiKey.length > 0
        }
        
        console.log(`🔧 Provider ${key}: requiresApiKey=${info.requiresApiKey}, hasApiKey=${apiKey.length > 0}, configured=${isConfigured}`)
        
        mergedProviders[key] = {
            ...info,
            enabled: stats.enabled || false,
            configured: isConfigured,
            apiKey: apiKey,
            rateLimitInfo: stats.rateLimit || {}
        }
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

// Get Swedish description for provider
const getSwedishDescription = (providerKey) => {
    return swedishDescriptions[providerKey] || selectedProvider.value?.description || ''
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
    const provider = providers.value[providerKey]
    const testResult = testResults.value[providerKey]
    console.log(`🔍 Getting connection test icon for ${providerKey}:`, testResult)
    
    // Check if provider requires API key but is not configured
    if (provider && provider.requiresApiKey && !provider.configured) {
        console.log(`⚙️ Provider ${providerKey} not configured: mdi-cloud-cog`)
        return 'mdi-cloud-cog'
    }
    
    // Check test results
    if (testResult) {
        const icon = testResult.success ? 'mdi-cloud-key' : 'mdi-cloud-cancel'
        console.log(`🎯 Connection test icon for ${providerKey}: ${icon} (success: ${testResult.success})`)
        return icon
    }
    
    console.log(`🔗 Default connection icon for ${providerKey}: mdi-cloud-question`)
    return 'mdi-cloud-question'
}

// Get connection test color
const getConnectionTestColor = (providerKey) => {
    const provider = providers.value[providerKey]
    const testResult = testResults.value[providerKey]
    console.log(`🎨 Getting connection test color for ${providerKey}:`, testResult)
    
    // Check if provider requires API key but is not configured
    if (provider && provider.requiresApiKey && !provider.configured) {
        console.log(`⚙️ Provider ${providerKey} not configured: grey-6`)
        return 'grey-6'
    }
    
    // Check test results
    if (testResult) {
        const color = testResult.success ? 'positive' : 'warning'
        console.log(`🎯 Connection test color for ${providerKey}: ${color} (success: ${testResult.success})`)
        return color
    }
    
    console.log(`🔗 Default connection color for ${providerKey}: primary`)
    return 'primary'
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

    // Add provider-specific configurations with consistent keys
    for (const [key, provider] of Object.entries(providers.value)) {
        config[key] = {
            enabled: provider.enabled,
            apiKey: provider.apiKey || null
        }
    }

    // Save configuration
    saveMarketDataConfig(config)

    // Update market data manager - use the mapped keys for the actual API
    const mappedConfig = {
        activeProvider: activeProvider.value,
        fallbackEnabled: true
    }
    
    for (const [key, provider] of Object.entries(providers.value)) {
        const mappedKey = key === 'alphavantage' ? 'alphaVantage' :
            key === 'fmp' ? 'financialModelingPrep' : key

        mappedConfig[mappedKey] = {
            enabled: provider.enabled,
            apiKey: provider.apiKey || null
        }
    }

    try {
        updateMarketDataConfig(mappedConfig)

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

// Test provider connection
const testProviderConnection = async (providerKey, isBackground = false) => {
    if (!isBackground) {
        testing.value[providerKey] = true
    }

    try {
        console.log('🧪 Testing connection for provider:', providerKey)

        const result = await testSingleProviderConnectivity(providerKey)
        console.log('📊 Received test result:', result)
        
        // Update test results reactively - store by provider key
        testResults.value = { 
            ...testResults.value, 
            [providerKey]: result 
        }
        console.log('💾 Updated testResults.value:', testResults.value)

        if (result && !isBackground) {
            $q.notify({
                type: result.success ? 'positive' : 'negative',
                message: `${result.provider}: ${result.success ? 'Anslutning lyckades' : 'Anslutning misslyckades'}`,
                caption: result.success ? undefined : result.error,
                timeout: 3000
            })
        }
        
        // Force a reactive update by logging the icon that should be shown
        console.log('🎯 Icon after test:', getConnectionTestIcon(providerKey))
        
    } catch (error) {
        console.error('❌ Error testing provider connection:', error)
        
        // Store failed result in testResults
        testResults.value = {
            ...testResults.value,
            [providerKey]: {
                success: false,
                error: error.message,
                provider: providerKey
            }
        }
        
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
const openExternalLink = async (url) => {
    if (url) {
        try {
            console.log('🌐 Opening external URL:', url)
            await openUrl(url)
            console.log('✅ Successfully opened external URL')
        } catch (error) {
            console.error('❌ Failed to open external URL:', error)
            $q.notify({
                type: 'negative',
                message: 'Kunde inte öppna länken',
                caption: error.message,
                timeout: 3000
            })
        }
    }
}

// Initialize component
const initialize = () => {
    initializeProviders()

    // Perform background tests after a short delay to allow UI to render
    setTimeout(() => {
        performBackgroundTests()
    }, 500)
}

// Expose initialize method for parent component
defineExpose({
    initialize
})

onMounted(() => {
    initialize()
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
