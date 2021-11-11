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
        <q-btn flat round dense class="q-ml-md" icon="refresh" :color="refreshColor" @click="refreshData()">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ "Refresh data" }}
          </q-tooltip>
        </q-btn>
      </template>

      <!-- Card items -->
      <template v-slot:item="props">
        <div class="q-pa-xs col-4">
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

              <!-- Delete item button -->
              <q-btn color="grey" round flat dense size="sm" icon="delete_outline" @click="updateWatchlist(props.row.product)">
                <q-tooltip transition-show="scale" transition-hide="scale">
                  {{ "Remove from dashboard" }}
                </q-tooltip>
              </q-btn>

              <!-- Add alarm to item button -->
              <q-btn color="grey" round flat dense size="sm" icon="notification_add"> <!-- icon="edit_notifications" -->
                <q-tooltip transition-show="scale" transition-hide="scale">
                  {{ "Add an alarm" }}
                </q-tooltip>
              </q-btn>
              <q-space />

              <!-- Expand more info button -->
              <q-btn color="grey" round flat dense size="sm" 
                :icon="props.expand ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                @click="props.expand = !props.expand"
              >
                <q-tooltip transition-show="scale" transition-hide="scale">
                  {{ props.expand ? "Hide" : "Show more time periods" }}
                </q-tooltip>
              </q-btn>

            </q-card-actions>

            <!-- Expandable historical info about Rebate/Premiums -->
            <div class="q-pa-md" v-show="props.expand">
              <IbindexRP api="getRebatePremiums" :company="props.row.product" />
            </div>

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
      let watchlist = getWatchlist();

      window.ipc.axiosRequest( ibiAxiosOptions(ibiAPI) )
        .then( response => {
          rows.value = response.data;
          if (watchlist !== null) {
            Object.entries(watchlist).forEach(([key, value]) => {
              visibleRows.value.push(value.product);
            });
            rows.value = rows.value.filter( item => visibleRows.value.includes( item.product ));
          }
        }).catch( error => {
          console.log(error);
        }).finally(() => { 
          loading.value = false;
          refreshColor.value = (rows.value.length === 0) ? 'red' : 'primary';
      });
    }

    // Reads the watchlist from localStorage
    function getWatchlist() {
      return $q.localStorage.getItem('watchlist');
    }

    // Updates the watchlist in localStorage
    function updateWatchlist (removedItem) {
      let watchlist = getWatchlist();
      let newWatchlist = watchlist.filter(item => item.product !== removedItem);
      $q.localStorage.set('watchlist', newWatchlist);
      rows.value = rows.value.filter(item => item.product !== removedItem);
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

      refreshData,
      updateWatchlist
    }
  },

  mounted () {
    this.refreshData();
  }
})
</script>
