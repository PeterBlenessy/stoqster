<template>
  <div class="q-pa-sm">
    <q-table dense color="primary"
      :title="title"
      :rows="rows"
      :columns="columns"
      :filter="filter"
      row-key="product"
      v-model:expanded="expandedRows"
      :visible-columns="visibleColumns"
      :rows-per-page-options="[0]"
      :loading="loading"
      selection="multiple"
      v-model:selected="selectedRows"
      @update:selected="onUpdateSelected"
    >

      <!-- Configure top-right part of the data table component -->
      <template v-slot:top-right>
        <!-- Search input -->
        <q-input dense debounce="300" v-model="filter" placeholder="Search">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
        
        <!-- Refresh data -->
        <q-btn dense flat round icon="refresh" :color="refreshColor" @click="refreshData()">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ "Refresh data" }}
          </q-tooltip>
        </q-btn>
      </template>

      <!-- Table header row -->
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
          >
            {{ col.label }}
          </q-th>

          <q-th auto-width />
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props">
          <!-- Column values -->
          <q-td
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
          >
            {{ col.value }}
          </q-td>

          <!-- Action buttons -->
          <q-td auto-width>
            <!-- Add to watchlist / dashboard -->
            <q-toggle size="sm" dense v-model="props.selected" checked-icon="visibility" unchecked-icon="visibility_off" > 
              <q-tooltip transition-show="scale" transition-hide="scale">
                {{ props.selected ? "Remove from dashboard" : "Add to dashboard" }}
              </q-tooltip>
            </q-toggle>

          <!-- Expand more details -->
            <q-btn size="sm" color="primary" flat round dense @click="props.expand = !props.expand" icon="insights">
              <q-tooltip transition-show="scale" transition-hide="scale">
                {{ "Show more info sbout " + props.row.productName }}
              </q-tooltip>
            </q-btn>
          </q-td>
        </q-tr>

        <!--  Expanded row. Displays additional insights about the company.  -->
        <q-tr v-show="props.expand" :props="props" no-hover>
          <q-td :colspan="props.cols.length+1">

            <div class="row items-start q-gutter-md">
              <div class="col-6">
              <q-card>
                <q-card-section> 
                  <IbindexCompanyHoldings :company="props.row.product" />
                </q-card-section>
              </q-card>
              </div>
              <div class="col-3">
              <q-card>
                <q-card-section> 
                  <IbindexCompanyEvents :company="props.row.product" />
                </q-card-section>
              </q-card>
             </div>
             </div>

          </q-td>
        </q-tr>

      </template>

    </q-table>
  </div>
</template>

<script>

import { ibindex, ibiAxiosOptions } from '../api/ibindexAPI.js';
import IbindexCompanyHoldings from 'components/CIbindexCompanyHoldings.vue';
import IbindexCompanyEvents from 'components/CIbindexCompanyEvents.vue';
import { ref, toRef, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useStore } from 'vuex';

export default { 
  name: 'CIbindex',
  components: {
    IbindexCompanyHoldings,
    IbindexCompanyEvents
  },
  props: {
    api: { type: String, required: true }
  },

  setup (props) {
    const $q = useQuasar();
    const store = useStore();
    const loading = ref(false);
    const refreshColor = ref('primary');

    const api = toRef(props, 'api');
    const title = ref(ibindex[api.value].title);
    const visibleColumns = ibindex[api.value].visibleColumns;
    const columns = ibindex[api.value].columns;
    const rows = ref([]);
    const selectedRows = ref([]);
    const expandedRows = ref([]);
    const expand = ref(false);

    // Fetch data from ibindex using the provided api reference
    const refreshData = async () => {
      loading.value = true;

      window.ipc.axiosRequest( ibiAxiosOptions(api.value) )
        .then( response => { 
          rows.value = response.data;
          refreshColor.value = 'primary';
          $q.localStorage.set(api.value, rows.value);
          $q.notify({type: 'positive', message:'Successful Ibindex refresh'});
        }).catch( error => {
          console.log(error);
          rows.value = $q.localStorage.getItem(api.value) || []; // Restore the latest values in case we have a network error 
          refreshColor.value = 'negative';
          $q.notify({
            type: 'warning',
            message:'Something went wrong during refresh of ' + title.value,
            caption: 'Showing data from last successful refresh of ' + companyCode.value
          });
        }).finally(() => { 
          loading.value = false;
      });
    }

    // Save the selected rows to Vuex state store. These rows represent the watchlist and will also be saved to the localStorage.
    function onUpdateSelected ( newSelection ) {
      store.commit('setWatchlist', newSelection);
    }

    // Restore selected rows from Vuex state store. These rows represent the watchlist.
    function restoreSelectedRows () {
      selectedRows.value = store.state.watchlist;
    }

    // Toggle expand / collaps of row with more company details.
    // More than one row can be expanded.
    function toggleExpandMoreDetails (rowKey) {
      expand.value = !expand.value;
    }

    onMounted(refreshData);
    onMounted(restoreSelectedRows);

    return {
      title,

      refreshData,
      columns,
      visibleColumns,
      rows,
      
      filter: ref(''),
      
      expand,
      expandedRows,
      toggleExpandMoreDetails,
      
      selectedRows,
      restoreSelectedRows,
      onUpdateSelected,

      loading,
      refreshColor

    }
  }

}

</script>

<style scoped>
.q-table tbody td:after{
  background: rgba(255,255,255,0.0);
}
.q-table--dark tbody td:after{
  background: rgba(0,0,0,0.0);
}

.q-table tbody td:before{
  background: rgba(0, 0, 0, 0.2);
}
.q-table--dark tbody td:before{
  background: rgba(255, 255, 255, 0.2);
}
</style>