<template>
  <div class="q-pa-sm col-4">
    <q-table
      title="Bevakningar: beräknad rabatt/premie"
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
        <!-- Search input -->
        <q-input dense debounce="300" v-model="filter" placeholder="Search">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>

        <!-- Refresh button -->
        <q-btn flat round dense class="q-ml-md" icon="refresh" :color="refreshColor" @click="refreshData()" />
      </template>

      <!-- Card items -->
      <template v-slot:item="props">
        <div class="q-pa-xs col-auto">
          <q-card>
            <q-card-section class="text-center text-subtitle2">{{ props.row.productName }} </q-card-section>
            <q-separator />
            <q-card-section class="flex flex-center text-subtitle2"
                :style="{
                  color: props.row.netAssetValueCalculatedRebatePremium < 0 ? 'red' : 'green'
                }"
            >
              {{ props.row.netAssetValueCalculatedRebatePremium.toFixed(2) }} %
            </q-card-section>
          </q-card>
        </div>

      </template>


    </q-table>

  </div>
</template>

<script>

import { ibindex, ibiAxiosOptions } from '../api/ibindex/ibindexAPI.js';
import { defineComponent, ref } from 'vue';
import { useQuasar } from 'quasar';

export default defineComponent({ 
  name: 'CDashboard',

  props: {},

  setup (props) {
    const $q = useQuasar();
    const ibiAPI = 'getCompanies';
    const gridMode = ref(true);
    const loading = ref(false);
    const refreshColor = ref('primary');

    const title = ibindex[ibiAPI].title;
    const visibleColumns = ibindex[ibiAPI].visibleColumns;
    const columns = ibindex[ibiAPI].columns;

    const rows = ref([]);
    const visibleRows = ref([]);

    const refreshData = async () => {
      let watchlist = $q.localStorage.getItem('watchlist');

      window.ipc.axiosRequest( ibiAxiosOptions(ibiAPI) )
        .then( response => {
          rows.value = response.data;
          Object.entries(watchlist).forEach(([key, value]) => {
            visibleRows.value.push(value.product);
          })
          rows.value = rows.value.filter( i => visibleRows.value.includes( i.product ));
        }).catch( error => {
          console.log(error);
        }).finally(() => { 
          loading.value = false;
          refreshColor.value = (rows.value.length === 0) ? 'red' : 'primary';
      });
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
