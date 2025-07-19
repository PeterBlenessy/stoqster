<template>
  <div class="fund-metrics-chart">
    <div class="text-h6 q-mb-md">
      Fondmätningar för {{ fundIsin }}
    </div>
    
    <q-card flat class="q-pa-md bg-grey-1">
      <div class="text-center text-grey-6">
        <q-icon name="mdi-chart-line" size="3rem" class="q-mb-md" />
        <div class="text-body1">
          Fondmätningar kommer snart
        </div>
        <div class="text-caption q-mt-sm">
          Historisk prestanda och nyckeltal för fonden kommer att visas här
        </div>
        
        <!-- Debug info (only in development) -->
        <div v-if="$q.dev" class="q-mt-md q-pa-sm bg-blue-1 rounded-borders">
          <div class="text-caption text-blue-8">
            
            <strong>Debug info:</strong><br>
            Fund ISIN: {{ fundIsin }}<br>
            Available quarters: {{ availableQuarters?.length || 0 }}
          </div>
        </div>
      </div>
    </q-card>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

// Props for the component
const props = defineProps({
  fundIsin: {
    type: String,
    required: true,
    description: 'ISIN code of the fund to display metrics for'
  },
  availableQuarters: {
    type: Array,
    default: () => [],
    description: 'Array of available quarters for historical data'
  }
})

// Log props for debugging
console.log('🔄 FundMetricsChart component loaded for fund:', props.fundIsin)
</script>

<style scoped>
.fund-metrics-chart {
  min-height: 300px;
}
</style>
