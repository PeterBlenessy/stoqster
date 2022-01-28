<template>
  <div class="q-pa-sm">
    <q-table dense flat color="primary"
      :rows="rows"
      :columns="columns"
      :visible-columns="visibleColumns"
      row-key="label"
      :rows-per-page-options="[0]"
      :loading="loading"
      hide-bottom
    >

      <template v-slot:top>
        <div class="col-12 text-overline text-center text-uppercase">{{ title }}</div>
      </template>

    </q-table>
  </div>
</template>

<script>

import { ibindex, ibiAxiosOptions } from '../api/ibindexAPI.js';
import { ref, toRef, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useStore } from 'vuex';

export default { 
  name: 'CIbindexRebatePremium',

  props: {
    api: { type: String, required: true },
    company: { type: String, required: true }
  },

  setup (props) {
    const $q = useQuasar();
    const store = useStore();

    const loading = ref(false);

    const api = toRef(props, 'api');
    const companyCode = toRef(props, 'company');
    const title = ibindex[api.value].title;
    const visibleColumns = ibindex[api.value].visibleColumns;
    const columns = ibindex[api.value].columns;
    const rows = ref([]);

    // Fetch data from ibindex using the provided api reference
    async function refreshData() {
      loading.value = true;

      window.ipc.axiosRequest( ibiAxiosOptions(api.value, companyCode.value) )
        .then( response => {
          rows.value = response.data;
          let debugLog = 'refresh';

          debugLog += ('\t' + companyCode.value);
          debugLog += ('\t hasAlert: ' + hasAlert(companyCode.value));
          debugLog += (hasAlert(companyCode.value) ? ('\t ' + checkAlertTriggers(rows.value)) : '');
          
          console.log(debugLog);

          // Store new rebate/premium values
          $q.localStorage.set(companyCode.value, rows.value);
          $q.notify({type: 'positive', message:'Successful refresh of watchlist details'});
        }).catch( error => {
          console.log(error);
          rows.value = $q.localStorage.getItem(companyCode.value);
          $q.notify({
            type: 'negative',
            message:'Something went wrong during refresh',
            caption: 'Showing data from last successful refresh of ' + title
          });
        }).finally(() => { 
          loading.value = false;
      });
    }

    // Checks if an alert has been registered for a company
    function hasAlert(companyCode) {
      let alerts = store.state.alerts;
      return JSON.stringify(alerts).includes(companyCode);
    }

    function checkAlertTriggers(current) {

      let previous = $q.localStorage.getItem(companyCode.value);

      let prev = previous[0].calculatedRebatePremium;
      let curr = current[0].calculatedRebatePremium;
      let avg = current[1].calculatedRebatePremiumAverage;

      // cross-down
      if ( prev > avg && avg > curr ) {
        $q.notify({
          type: 'warning',
          group: false,
          message: 'Alert triggered for ' + companyCode.value + '!',
          caption:'Calculated rebate/premium crosses down 30 days average',
          timeout: 0,
          actions: [
            {label: 'Dismiss', color: 'white', handler: () => { /* ... */ }}
          ]
        });
        return '----- cross down -----';
      }

      // cross-up
      if ( prev < avg && avg < curr ) {
        $q.notify({
          type: 'warning',
          group: false,
          message: 'Alert triggered!',
          caption:'Calculated rebate/premium crosses up 30 days average',
          timeout: 0,
          actions: [
            {label: 'Dismiss', color: 'white', handler: () => { /* ... */ }}
          ]
        });
        return '----- cross up -----';
      }

      // no-cross
      if ( (prev < avg && curr < avg) || (prev > avg && curr > avg ) ) {
        return '----- no-cross -----';
      }
    }

    onMounted( function () {
      refreshData();
      
      setInterval(function () { 
        refreshData();
      }, store.state.refreshInterval);
    });

    return {
      title,

      refreshData,
      columns,
      visibleColumns,
      rows,
      
      loading
    }
  }
}

</script>

<style >
.table__top { 
  justify-content: center
}
</style>