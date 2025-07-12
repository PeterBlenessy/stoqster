<template>
  <div class="fi-history-controls q-mb-md">
    <div class="row q-gutter-md items-center">
      <!-- View mode toggle -->
      <q-btn-toggle
        v-model="viewMode"
        toggle-color="primary"
        :options="viewModeOptions"
        @update:model-value="handleViewModeChange"
        dense
      />
      
      <!-- Date selector for historical view -->
      <q-select
        v-if="viewMode === 'historical'"
        v-model="selectedSourceDate"
        :options="sourceDateOptions"
        option-label="label"
        option-value="sourceDate"
        label="Välj datum"
        outlined
        dense
        style="min-width: 280px; max-width: 350px"
        :loading="isLoadingHistorical"
        @update:model-value="handleSourceDateChange"
      >
        <template v-slot:option="{ itemProps, opt }">
          <q-item v-bind="itemProps">
            <q-item-section>
              <q-item-label>{{ opt.label }}</q-item-label>
              <q-item-label caption>
                {{ opt.recordCount }} fonder • Publicerad: {{ formatDate(opt.publishedDate) }}
                <br>
                Importerad: {{ formatDateTime(opt.importedAt) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-select>
      
      <!-- Current view indicator -->
      <div v-if="isHistoricalView" class="text-body2 text-orange-8">
        <q-icon name="history" class="q-mr-xs" />
        Historisk vy: {{ currentViewLabel }}
      </div>
      
      <!-- Storage info button -->
      <q-btn
        icon="mdi-information"
        label="Info"
        color="info"
        outline
        dense
        size="sm"
        @click="showInfo = true"
      />
    </div>
    
    <!-- Loading indicator -->
    <div v-if="isLoadingHistorical" class="q-mt-sm">
      <q-linear-progress 
        indeterminate 
        color="primary" 
        class="q-mt-sm" 
      />
      <div class="text-caption text-center q-mt-xs">
        Laddar historisk data...
      </div>
    </div>
    
    <!-- Info dialog -->
    <q-dialog v-model="showInfo">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">FI Historisk Data</div>
        </q-card-section>
        
        <q-card-section>
          <div class="q-mb-md">
            <strong>Tillgängliga dataset:</strong> {{ availableQuarters.length }}
          </div>
          
          <div class="q-mb-md">
            <strong>Aktuell vy:</strong> {{ currentViewLabel }}
          </div>
          
          <div v-if="selectedSourceDate" class="q-mb-md">
            <strong>Vald data:</strong>
            <ul class="q-ma-none q-pl-md">
              <li>Datum: {{ selectedSourceDate.sourceDate }}</li>
              <li>Kvartal: {{ selectedSourceDate.quarter }}</li>
              <li>Fonder: {{ selectedSourceDate.recordCount }}</li>
              <li>Innehav: {{ selectedSourceDate.holdingsCount }}</li>
            </ul>
          </div>
          
          <div class="text-caption text-grey-6">
            Historisk data lagras lokalt och kan användas för att jämföra förändringar över tid.
          </div>
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="Stäng" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useFIStore } from '../stores/fi-store.js'

const fiStore = useFIStore()
const { 
  availableQuarters, 
  isHistoricalView, 
  isLoadingHistorical,
  currentViewLabel 
} = storeToRefs(fiStore)

const viewMode = ref('current')
const selectedSourceDate = ref(null)
const showInfo = ref(false)

const viewModeOptions = [
  { label: 'Aktuell data', value: 'current' },
  { label: 'Historisk data', value: 'historical' }
]

const sourceDateOptions = computed(() => {
  return availableQuarters.value.map(item => ({
    sourceDate: item.sourceDate,
    label: item.label,
    quarter: item.quarter,
    recordCount: item.recordCount,
    holdingsCount: item.holdingsCount,
    importedAt: item.importedAt,
    publishedDate: item.publishedDate
  }))
})

const handleViewModeChange = async (mode) => {
  if (mode === 'current') {
    await fiStore.setCurrentView()
    selectedSourceDate.value = null
  } else if (sourceDateOptions.value.length > 0) {
    // Select the latest date by default
    selectedSourceDate.value = sourceDateOptions.value[0]
    await fiStore.setSourceDate(selectedSourceDate.value.sourceDate)
  }
}

const handleSourceDateChange = async (dateOption) => {
  if (dateOption && dateOption.sourceDate) {
    await fiStore.setSourceDate(dateOption.sourceDate)
  }
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleString('sv-SE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return dateString
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    return dateString
  }
}

// Watch for changes in available dates
watch(() => availableQuarters.value, (dates) => {
  if (dates.length > 0 && viewMode.value === 'historical' && !selectedSourceDate.value) {
    selectedSourceDate.value = dates[0]
  }
}, { immediate: true })
</script>

<style scoped>
.fi-history-controls {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.02);
}

.q-dark .fi-history-controls {
  border-color: rgba(255, 255, 255, 0.12);
  background-color: rgba(255, 255, 255, 0.02);
}
</style>
