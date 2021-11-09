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
      v-model:expanded="expandedCards"
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
        <div class="q-pa-xs col-3">
          <q-card>
            <q-card-section class="text-center text-subtitle2">{{ props.row.productName }} </q-card-section>
            <q-separator inset />
            <q-card-section>
              <div class="text-center text-overline">{{ props.colsMap.netAssetValueCalculatedRebatePremium.label }} </div>
              <div class="flex flex-center text-h6"
                :style="{
                  color: props.row.netAssetValueCalculatedRebatePremium < 0 ? 'red' : 'green'
                }"
            >
              {{ props.row.netAssetValueCalculatedRebatePremium.toFixed(2) }}%
              </div>
            </q-card-section>
            <q-separator inset />
            <q-card-actions>
              <q-btn color="grey" round flat dense size="sm" icon="visibility_off" />
              <q-btn color="grey" round flat dense size="sm" icon="notification_add" /> <!-- icon="edit_notifications" -->
              <q-space />
              <q-btn color="grey" round flat dense size="sm" 
                :icon="props.expand ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                @click="props.expand = !props.expand"
              />
            </q-card-actions>

            <q-slide-transition>
              <div class="q-pa-md" v-show="props.expand">

                  <IbindexRP api="getRebatePremiums" :company="props.row.product" />

              </div>
            </q-slide-transition>
          </q-card>
        </div>

      </template>
    </q-table>

  </div>
</template>

<script>

import { ibindex, ibiAxiosOptions } from '../api/ibindex/ibindexAPI.js';
import IbindexRP from 'components/CIbindexRebatePremium.vue';
import { defineComponent, ref } from 'vue';
import { useQuasar } from 'quasar';

export default defineComponent({ 
  name: 'CDashboard',
  components: {
    IbindexRP,
  },
  props: {},

  setup (props) {
    const $q = useQuasar();
    const ibiAPI = 'getCompanies';
    const gridMode = ref(true);
    const loading = ref(false);
    const refreshColor = ref('primary');

//    const title = ibindex[ibiAPI].title;
    const visibleColumns = ibindex[ibiAPI].visibleColumns;
    const columns = ibindex[ibiAPI].columns;

    const rows = ref([]);
    const visibleRows = ref([]);
    const navTrends = ref([]);

    // Refresh data
    const refreshData = async () => {
      let watchlist = $q.localStorage.getItem('watchlist');

      window.ipc.axiosRequest( ibiAxiosOptions(ibiAPI) )
        .then( response => {
          rows.value = response.data;
          if (watchlist !== null) {
            Object.entries(watchlist).forEach(([key, value]) => {
              visibleRows.value.push(value.product);
            });
            rows.value = rows.value.filter( i => visibleRows.value.includes( i.product ));
          }
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
      expandedCards: ref([]),

      loading,
      refreshColor,
      gridMode,

      refreshData
    }
  },

  mounted () {
    this.refreshData();
  }
})
</script>
