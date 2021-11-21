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

import { ibindex, ibiAxiosOptions } from '../api/ibindex/ibindexAPI.js';
import { ref, toRef, onMounted } from 'vue';

export default { 
  name: 'CIbindexRebatePremium',

  props: {
    api: { type: String, required: true },
    company: { type: String, required: true }
  },

  setup (props) {
    const loading = ref(false);

    const api = toRef(props, 'api');
    const company = toRef(props, 'company');
    const title = ibindex[api.value].title;
    const visibleColumns = ibindex[api.value].visibleColumns;
    const columns = ibindex[api.value].columns;
    const rows = ref([]);

    // Fetch data from ibindex using the provided api reference
    const refreshData = async () => {
      loading.value = true;

      window.ipc.axiosRequest( ibiAxiosOptions(api.value, company.value) )
        .then( response => { 
          rows.value = response.data;
        }).catch( error => {
          console.log(error);
        }).finally(() => { 
          loading.value = false;
      });
    }

    onMounted(refreshData);

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