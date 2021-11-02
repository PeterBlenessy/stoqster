<template>
  <div class="q-pa-md">
    <q-table
      title="Dashboard - bevakningar"
      dense
      :rows="rows"
      :columns="columns"
      row-key="product"
      :rows-per-page-options="[0]"
      :filter="filter"
      :loading="loading"
      :grid="gridMode"
      color="primary"
    >
      <template v-slot:top-right>

        <q-input dense debounce="300" v-model="filter" placeholder="Search">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>

        <q-btn flat round dense class="q-ml-md" icon="refresh" :color="refreshColor" @click="refreshData()" />
      </template>

    </q-table>

  </div>
</template>

<script>

import { ibindex, ibiAxiosOptions } from '../api/ibindex/ibindexAPI.js'
import { defineComponent, ref } from 'vue'
import { useQuasar } from 'quasar'

export default defineComponent({ 
  name: 'CDashboard',

  props: {
  },

  setup (props) {
    const $q = useQuasar()
    const ibiAPI = 'getCompanies'
    const gridMode = ref(true)
    const loading = ref(false)
    const refreshColor = ref('primary')

    const title = ibindex[ibiAPI].title
    const visibleColumns = ibindex[ibiAPI].visibleColumns
    const columns = ibindex[ibiAPI].columns

    const rows = ref([])
    const visibleRows = ref([])

    const refreshData = async () => {
      let watchlist = $q.localStorage.getAll()

      window.ipc.axiosRequest( ibiAxiosOptions(ibiAPI) )
        .then( response => { 
          rows.value = response.data
          Object.entries(watchlist).forEach(([key, value]) => {
            //console.log(key, JSON.parse(value))
            visibleRows.value.push(key)
          })
          rows.value = rows.value.filter( i => visibleRows.value.includes( i.product ) );

        }).catch( error => {
          console.log(error) 
        }).finally(() => { 
          loading.value = false;
          refreshColor.value = (rows.value.length === 0) ? 'red' : 'primary'
      })
    }

    return {
      columns,
      visibleColumns,
      rows,
      visibleRows,
      filter: ref(''),

      loading,
      refreshColor,
      gridMode,

      refreshData
    }

  },

  mounted () {
    this.refreshData();
  },
})
</script>
