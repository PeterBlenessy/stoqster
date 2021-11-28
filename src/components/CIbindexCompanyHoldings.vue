<template>
    <q-table dense flat color="primary"
      :title="title"
      :rows="rows"
      :columns="columns"
      :visible-columns="visibleColumns"
      row-key="product"
      :rows-per-page-options="[0]"
      :loading="loading"
      hide-bottom
    >

    </q-table>

</template>

<script>
import { ref, toRef, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { ibindex, ibiAxiosOptions } from '../api/ibindex/ibindexAPI.js';

export default {
  name: 'CIbindexCompanyHoldings',

  props: {
    company: { type: String, required: true }
  },
  
  setup(props) {
    const companyCode = toRef(props, 'company');

    const $q = useQuasar();

    const loading = ref(false);

    const api = ref('getHoldings');
    const title = ibindex[api.value].title;
    const columns = ibindex[api.value].columns;
    const visibleColumns = ibindex[api.value].visibleColumns;
    const rows = ref([]);


    // Fetch data from ibindex using the provided api reference
    async function refreshData() {
      loading.value = true;

      window.ipc.axiosRequest( ibiAxiosOptions(api.value, companyCode.value) )
        .then( response => {
          rows.value = response.data || [];

          $q.notify({type: 'positive', message:'Successful refresh of watchlist details'});
        }).catch( error => {
          console.log(error);
          $q.notify({
            type: 'warning',
            message:'Something went wrong during refresh of ' + title,
            caption: 'Showing data from last successful refresh of ' + companyCode.value
          });
        }).finally(() => { 
          loading.value = false;
      });
    }

    onMounted( function () {
      refreshData();
      
    });

    return {
      refreshData,
      title,
      columns,
      visibleColumns,
      rows,
      
      loading
    }
}
}
</script>

<style >
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