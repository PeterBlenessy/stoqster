<template>
    <q-dialog v-model="showDialog" persistent>
        <q-card style="min-width: 400px">
            <q-card-section class="row items-center q-pb-none">
                <div class="text-h6">Uppdatering tillgänglig</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>

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
                    label="Påminn mig senare" 
                    color="grey-7" 
                    @click="deferUpdate" 
                />
                <q-btn 
                    flat 
                    label="Uppdatera vid nästa start" 
                    color="primary" 
                    @click="scheduleUpdate"
                />
                <q-btn 
                    unelevated 
                    label="Uppdatera nu" 
                    color="positive" 
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
                caption: 'Applikationen startar om automatiskt',
                icon: 'mdi-check-circle',
                timeout: 3000
            })
            showDialog.value = false
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

const scheduleUpdate = () => {
    if (!updateInfo.value) return
    
    // Prepare schedule data using composable
    const result = updater.prepareScheduledUpdate(updateInfo.value)
    
    if (result.success) {
        // Save to store
        updateStore.setScheduledUpdate(result.scheduleData)
        
        $q.notify({
            type: 'positive',
            message: 'Uppdatering schemalagd',
            caption: 'Uppdateringen installeras när appen startas om',
            icon: 'mdi-calendar-clock',
            timeout: 3000
        })
        
        showDialog.value = false
    } else {
        $q.notify({
            type: 'negative',
            message: 'Kunde inte schemalägga uppdateringen',
            caption: result.error || 'Okänt fel',
            icon: 'mdi-alert-circle',
            timeout: 5000
        })
    }
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
