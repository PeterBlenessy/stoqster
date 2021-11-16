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
      :grid="gridMode"
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

        <!-- Toggle how the data is presented: grid / table mode -->
        <q-btn dense flat round class="q-ml-md" :icon="gridModeIcon" color="primary" @click="toggleGridMode()">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ gridModeTooltip }}
          </q-tooltip>
        </q-btn>
        
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

            <div class="q-pa-xs col-6">
              <q-card>
                <q-card-section> 
                  This is expand slot for row above:
                </q-card-section>
              </q-card>
            </div>

             <div class="q-pa-xs col-6">
              <q-card>
                <q-card-section> 
                  This is expand slot for row above:
                </q-card-section>
              </q-card>
             </div>

          </q-td>
        </q-tr>

      </template>

    </q-table>
  </div>
</template>

<script>

import { ibindex, ibiAxiosOptions } from '../api/ibindex/ibindexAPI.js';
import { defineComponent, ref, toRef, onMounted } from 'vue';
import { useQuasar } from 'quasar';

export default defineComponent({ 
  name: 'CIbindex',

  props: {
    api: { type: String, required: true }
  },

  setup (props) {
    const $q = useQuasar();
    const loading = ref(false);
    const refreshColor = ref('primary');
    const gridMode = ref(false);
    const gridModeIcon = ref('grid_view');
    const gridModeTooltip = ref('Grid view');

    const api = toRef(props, 'api');
    const title = ibindex[api.value].title;
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
        }).catch( error => {
          console.log(error);
        }).finally(() => { 
          loading.value = false;
          refreshColor.value = (rows.value.length === 0) ? 'red' : 'primary';
      });
    }

    // Toggle how the data is presented, table or grid mode
    const toggleGridMode = () => {
      gridMode.value = !gridMode.value;
      gridModeIcon.value = gridMode.value ? 'table_view' : 'grid_view';
      gridModeTooltip.value = gridMode.value ? 'Table view' : 'Grid view';
    }

    // Save the selected rows in localStorage
    function onUpdateSelected ( newSelection ) {   
      $q.localStorage.set('watchlist', newSelection);
    }

    // Restore selected rows saved in localStorage
    function restoreSelectedRows () {
      selectedRows.value = $q.localStorage.getItem('watchlist') || [];
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
      refreshColor,
      
      gridMode,
      gridModeIcon,
      gridModeTooltip,
      toggleGridMode
    }
  }

})

</script>

<style scoped>
.q-table tbody td:after{
  background: rgba(255,255,255,0.2);
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