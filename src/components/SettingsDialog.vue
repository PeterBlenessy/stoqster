<template>
    <q-dialog v-model="showDialog">
        <q-card style="width: 700px; max-width: 75vw;">
            <q-card-section class="row items-center q-py-md">
                <div class="text-h6">Inställningar</div>
                <q-space />
                <q-btn icon="mdi-close" flat round dense @click="showDialog = false" />
            </q-card-section>

            <q-separator />

            <q-card-section class="q-pa-none">
                <q-splitter v-model="splitterModel" style="min-height: 300px" disable separator-style="width: 1px; background-color: rgba(0,0,0,0.12);">
                    <template v-slot:before>
                        <q-list dense class="full-height">
                            <q-item 
                                v-for="tab in tabs" 
                                :key="tab.name" 
                                clickable
                                @click="activeTab = tab.name" 
                                :active="tab.name === activeTab"
                                active-class="text-primary"
                            >
                                <q-item-section avatar>
                                    <q-icon :name="tab.icon" />
                                </q-item-section>
                                <q-item-section>
                                    {{ tab.label }}
                                </q-item-section>
                            </q-item>
                        </q-list>
                    </template>

                    <template v-slot:after>
                        <q-tab-panels v-model="activeTab" class="q-pa-none full-height">
                            <!-- General Settings Panel -->
                            <q-tab-panel name="general" class="q-pa-md">
                                <ComponentGeneralSettings />
                            </q-tab-panel>

                            <!-- Market Data API Settings Panel -->
                            <q-tab-panel name="market-data" class="q-pa-md">
                                <ComponentMarketDataSettings ref="marketDataSettingsRef" />
                            </q-tab-panel>
                        </q-tab-panels>
                    </template>
                </q-splitter>
            </q-card-section>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import ComponentGeneralSettings from './ComponentGeneralSettings.vue'
import ComponentMarketDataSettings from './ComponentMarketDataSettings.vue'

// Props
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
})

// Emits
const emit = defineEmits(['update:modelValue', 'checkForUpdates'])

// Reactive refs
const currentVersion = ref('')
const activeTab = ref('general')
const marketDataSettingsRef = ref(null)
const splitterModel = ref(30)

const showDialog = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

// Tab configuration
const tabs = [
    { name: 'general', label: 'Allmänt', icon: 'mdi-cog' },
    { name: 'market-data', label: 'Marknadsdata API', icon: 'mdi-chart-line' }
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

// Watch for dialog opening to initialize
watch(showDialog, (newValue) => {
    if (newValue) {
        getCurrentVersion()
        
        // Initialize market data settings if on that tab or switching to it
        if (activeTab.value === 'market-data' && marketDataSettingsRef.value) {
            marketDataSettingsRef.value.initialize()
        }
    }
})

// Watch for tab changes to initialize market data settings when needed
watch(activeTab, (newTab) => {
    if (newTab === 'market-data' && showDialog.value && marketDataSettingsRef.value) {
        marketDataSettingsRef.value.initialize()
    }
})
</script>


