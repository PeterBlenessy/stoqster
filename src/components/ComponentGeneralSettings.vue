<template>
    <div>
        <div class="text-subtitle2 q-mb-md">Allmänna inställningar</div>

        <!-- Appearance Section -->
        <q-item dense class="q-pa-none q-pb-sm">
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

        <!-- Application Updates Section -->
        <q-item dense class="q-pa-none q-pb-sm">
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

        <q-item v-if="autoCheckEnabled" dense class="q-pa-none q-pb-sm">
            <q-item-section>
                <q-item-label>Kontrollintervall</q-item-label>
                <q-item-label caption>
                    Hur ofta ska appen söka efter uppdateringar
                </q-item-label>
            </q-item-section>
            <q-item-section side style="min-width: 120px">
                <q-select v-model="autoCheckIntervalMinutes" :options="intervalOptions" option-value="value"
                    option-label="label" emit-value map-options dense outlined options-dense />
            </q-item-section>
        </q-item>

        <!-- Data Section -->
        <q-item dense class="q-pa-none q-pb-sm">
            <q-item-section>
                <q-item-label>Uppdateringsintervall av data</q-item-label>
                <q-item-label caption>
                    Hur ofta ska data uppdateras automatiskt
                </q-item-label>
            </q-item-section>
            <q-item-section side style="min-width: 120px">
                <q-select v-model="refreshInterval" :options="refreshIntervalOptions" option-value="value"
                    option-label="label" emit-value map-options dense outlined options-dense />
            </q-item-section>
        </q-item>
    </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settings-store.js'
import { useUpdateStore } from '../stores/update-store.js'

// Stores
const settingsStore = useSettingsStore()
const updateStore = useUpdateStore()

// Reactive refs from stores
const { darkMode, refreshInterval } = storeToRefs(settingsStore)
const { autoCheckEnabled, autoCheckIntervalMinutes } = storeToRefs(updateStore)

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
</script>
