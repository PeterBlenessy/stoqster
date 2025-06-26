<template>
    <q-dialog v-model="showDialog" persistent>
        <q-card style="min-width: 400px">
            <q-card-section class="row items-center q-py-md">
                <div class="text-h6">Uppdatering tillgänglig</div>
                <q-space />
                <q-btn icon="mdi-close" flat round dense v-close-popup />
            </q-card-section>

            <q-separator />

            <q-card-section>
                <div class="text-subtitle2 q-mb-sm">
                    Version {{ updateInfo?.version }}
                </div>
                
                <div class="text-body2 q-mb-md" v-if="updateInfo?.date">
                    Datum: {{ formatDate(updateInfo.date) }}
                </div>

                <div class="text-body2" v-if="updateInfo?.body">
                    <div class="text-weight-medium q-mb-xs">Ändringar:</div>
                    <div class="release-notes">
                        {{ updateInfo.body }}
                    </div>
                </div>
            </q-card-section>

            <q-card-actions align="right">
                <q-btn 
                    flat 
                    label="Avfärda" 
                    color="grey-7" 
                    @click="deferUpdate" 
                />
                <q-btn 
                    unelevated 
                    label="Uppdatera nu" 
                    color="primary" 
                    :loading="isInstalling"
                    @click="handleInstallUpdate"
                />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useUpdater } from '../composables/useUpdater.js'
import { useUpdateStore } from '../stores/update-store.js'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import { relaunch } from '@tauri-apps/plugin-process'

// Props
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
})

// Emits
const emit = defineEmits(['update:modelValue'])

// Composables
const updater = useUpdater()
const updateStore = useUpdateStore()
const { updateInfo } = storeToRefs(updateStore)
const $q = useQuasar()

// Local state
const isInstalling = ref(false)

// Computed
const showDialog = ref(props.modelValue)

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
    showDialog.value = newValue
})

// Watch for dialog changes
watch(showDialog, (newValue) => {
    emit('update:modelValue', newValue)
})

// Methods
const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

const handleInstallUpdate = async () => {
    if (!updateInfo.value) return
    
    isInstalling.value = true
    
    try {
        // Show progress notification
        $q.notify({
            type: 'ongoing',
            message: 'Installerar uppdatering...',
            caption: 'Programmet kommer att startas om automatiskt',
            icon: 'mdi-download',
            timeout: 0,
            spinner: true
        })
        
        const result = await updater.installUpdate(updateInfo.value)
        
        if (result.success) {
            $q.notify({
                type: 'positive',
                message: 'Uppdatering installerad',
                caption: 'Applikationen startar om nu',
                icon: 'mdi-check-circle',
                timeout: 2000
            })
            
            // Close dialog
            showDialog.value = false
            
            // Restart the app
            setTimeout(async () => {
                try {
                    await relaunch()
                } catch (error) {
                    console.error('❌ Failed to restart app:', error)
                    $q.notify({
                        type: 'warning',
                        message: 'Uppdatering installerad',
                        caption: 'Starta om appen manuellt för att se ändringarna',
                        icon: 'mdi-restart',
                        timeout: 5000
                    })
                }
            }, 1000)
        } else {
            $q.notify({
                type: 'negative',
                message: 'Kunde inte installera uppdateringen',
                caption: result.error || 'Okänt fel',
                icon: 'mdi-alert-circle',
                timeout: 5000
            })
        }
    } catch (error) {
        console.error('Error installing update:', error)
        $q.notify({
            type: 'negative',
            message: 'Kunde inte installera uppdateringen',
            caption: 'Ett oväntat fel inträffade',
            icon: 'mdi-alert-circle',
            timeout: 5000
        })
    } finally {
        isInstalling.value = false
    }
}

const deferUpdate = () => {
    // Simply close the dialog without doing anything
    showDialog.value = false
}
</script>

<style scoped>
.release-notes {
    white-space: pre-wrap;
    max-height: 200px;
    overflow-y: auto;
    padding: 8px;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
}

.q-dark .release-notes {
    background-color: rgba(255, 255, 255, 0.05);
}
</style>
