<template>
    <q-dialog v-model="showDialog">
        <q-card style="min-width: 600px">
            <q-card-section class="row items-center q-py-md">
                <div class="text-h6">Inställningar</div>
                <q-space />
                <q-btn icon="mdi-close" flat round dense @click="showDialog = false" />
            </q-card-section>
            
            <q-separator />

            <q-card-section>
                <q-list>
                    <!-- Appearance Section -->
                    <q-item-label header>Utseende</q-item-label>
                    
                    <q-item>
                        <q-item-section>
                            <q-item-label>Mörkt läge</q-item-label>
                            <q-item-label caption>
                                Växla mellan ljust och mörkt tema
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <q-toggle
                                v-model="darkMode"
                                color="primary"
                                :icon="darkMode ? 'mdi-weather-night' : 'mdi-weather-sunny'"
                            />
                        </q-item-section>
                    </q-item>
                    
                    <q-separator spaced />
                    
                    <!-- Updates Section -->
                    <q-item-label header>Uppdateringar</q-item-label>
                    
                    <q-item>
                        <q-item-section>
                            <q-item-label>Automatiska uppdateringar</q-item-label>
                            <q-item-label caption>
                                Sök automatiskt efter uppdateringar
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <q-toggle
                                v-model="autoCheckEnabled"
                                color="primary"
                                icon="mdi-update"
                            />
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
                            <q-select
                                v-model="autoCheckIntervalMinutes"
                                :options="intervalOptions"
                                option-value="value"
                                option-label="label"
                                emit-value
                                map-options
                                dense
                                outlined
                            />
                        </q-item-section>
                    </q-item>
                    
                    <q-separator spaced />
                    
                    <!-- Data Section -->
                    <q-item-label header>Data</q-item-label>
                    
                    <q-item>
                        <q-item-section>
                            <q-item-label>Uppdateringsintervall</q-item-label>
                            <q-item-label caption>
                                Hur ofta ska data uppdateras automatiskt
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side style="min-width: 120px">
                            <q-select
                                v-model="refreshInterval"
                                :options="refreshIntervalOptions"
                                option-value="value"
                                option-label="label"
                                emit-value
                                map-options
                                dense
                                outlined
                            />
                        </q-item-section>
                    </q-item>
                    
                    <q-separator spaced />
                    
                    <!-- Version Information -->
                    <q-item-label header>Om Stoqster</q-item-label>
                    
                    <q-item>
                        <q-item-section>
                            <q-item-label>Version</q-item-label>
                            <q-item-label caption>
                                {{ currentVersion || 'Okänd version' }}
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <q-btn
                                flat
                                round
                                icon="mdi-update"
                                @click="checkForUpdates"
                                :loading="isCheckingForUpdates"
                                :disable="isCheckingForUpdates"
                            >
                                <q-tooltip>Sök efter uppdateringar</q-tooltip>
                            </q-btn>
                        </q-item-section>
                    </q-item>
                    
                    <q-item v-if="lastCheckTime">
                        <q-item-section>
                            <q-item-label>Senaste uppdateringskontroll</q-item-label>
                            <q-item-label caption>
                                {{ formatLastCheck() }}
                            </q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card-section>

            <q-card-actions align="right">
                <q-btn flat label="Stäng" color="primary" @click="showDialog = false" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settings-store.js'
import { useUpdateStore } from '../stores/update-store.js'
import { useUpdater } from '../composables/useUpdater.js'
import { useQuasar } from 'quasar'
import { getVersion } from '@tauri-apps/api/app'

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
const updater = useUpdater()

// Reactive refs
const { darkMode, refreshInterval } = storeToRefs(settingsStore)
const { 
    autoCheckEnabled, 
    autoCheckIntervalMinutes, 
    lastCheckTime 
} = storeToRefs(updateStore)
const { isChecking: isCheckingForUpdates } = storeToRefs(updater)

const currentVersion = ref('')
const showDialog = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
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

// Format last check time for display
const formatLastCheck = () => {
    if (!lastCheckTime.value) return 'Aldrig kontrollerat'
    
    const now = new Date()
    const diff = now - lastCheckTime.value
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (diff < 30000) return 'Nyss' // Less than 30 seconds
    if (minutes < 1) return 'Mindre än 1 min sedan'
    if (minutes < 60) return `${minutes} min sedan`
    if (hours < 24) return `${hours} tim sedan`
    if (days === 1) return 'Igår'
    if (days < 7) return `${days} dagar sedan`
    
    return lastCheckTime.value.toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Check for updates
const checkForUpdates = () => {
    console.log('🔄 Update check requested from settings dialog')
    emit('checkForUpdates')
}

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

// Watch for dialog opening to get version
watch(showDialog, (newValue) => {
    if (newValue) {
        getCurrentVersion()
    }
})
</script>
