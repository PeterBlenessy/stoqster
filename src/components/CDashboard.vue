<template>
  <div class="q-pa-md">
    <q-table
      title="Dashboard - bevakningar"
      dense
      :rows="rows"
      :columns="columns"
      row-key="product"
      :visible-columns="visibleColumns"
      :rows-per-page-options="[0]"
      :loading="loading"
      :grid="gridMode"
      grid-header
      color="primary"
    >
      <template v-slot:top-right>
        <q-btn flat round dense class="q-ml-md" icon="refresh" :color="refreshColor" @click="getWatchlist" />
      </template>

    </q-table>
  </div>
</template>

<script>

import { defineComponent, ref } from 'vue'
import { useQuasar } from 'quasar'

export default defineComponent({ 
  name: 'CDashboard',

  props: {
  },

  setup (props) {
    const $q = useQuasar()
    const gridMode = ref(true)
    const loading = ref(false)
    const refreshColor = ref('primary')

    const columns = ref([])
    const rows = ref([])
    const visibleColumns = ref([])

    const getWatchlist = async () => {
      let watchlist = $q.localStorage.getAll()

      Object.entries(watchlist).forEach(([key, value]) => console.log(key, JSON.parse(value)));
    }

    return {
      columns,
      visibleColumns,
      rows,

      loading,
      refreshColor,
      gridMode,

      getWatchlist
    }

  },

  mounted () {
    this.getWatchlist
  },
})
</script>
