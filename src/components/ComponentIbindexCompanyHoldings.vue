<template>
    <q-table dense flat color="primary" :title="title" :rows="rows" :columns="columns" :visible-columns="visibleColumns"
        row-key="product" :rows-per-page-options="[0]" hide-bottom :binary-state-sort="true"></q-table>
</template>

<script>
import { ref, toRef, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { ibindex, ibiRequestOptions } from '../api/ibindexAPI.mjs';
import localforage from 'localforage';
import { fetch } from "@tauri-apps/api/http";

export default {
    name: 'ComponentIbindexCompanyHoldings',

    props: {
        company: { type: String, required: true }
    },

    setup(props) {
        const $q = useQuasar();

        const companyCode = toRef(props, 'company');
        const api = ref('getHoldings');
        const title = ibindex[api.value].title;
        const columns = ibindex[api.value].columns;
        const visibleColumns = ibindex[api.value].visibleColumns;
        const rows = ref([]);
        const loading = ref(false);

        const requestOptions = ibiRequestOptions(api.value, companyCode.value);

        const ibiHoldingsStore = localforage.createInstance({ name: 'stoqster', storeName: ibindex[api.value].localForageConfig.storeName });

        // Fetch data from ibindex using the provided api reference
        async function refreshData() {
            console.time(`ibiLoadDataFromWeb() \t ${api.value} \t ${companyCode.value}`);
            loading.value = true;
            fetch(requestOptions.url, requestOptions.options)
                .then(response => {
                    if (!response.ok) {
                        return Promise.reject(`Error - fetch() status code: ${response.status}`);
                    }

                    return response.data;
                })
                .then(data => {
                    rows.value = [...data];
                    ibiHoldingsStore.setItem(companyCode.value, data);
                    //$q.notify({ type: 'positive', message: 'Successful refresh' });
                })
                .catch(error => {
                    console.log(error);
                    $q.notify({
                        type: 'warning',
                        message: 'Något gick fel under uppdateringen',
                        caption: title + ' info saknas för ' + companyCode.value
                    });
                })
                .finally(() => {
                    loading.value = false;
                    console.timeEnd(`ibiLoadDataFromWeb() \t ${api.value} \t ${companyCode.value}`);
                });
        }

        async function loadData() {
            console.time(`ibiLoadData() \t ${api.value} \t ${companyCode.value}`);
            loading.value = true;
            ibiHoldingsStore.getItem(companyCode.value)
                .then(data => {
                    if (data === null) {
                        return refreshData();
                    }
                    rows.value = data;
                    // Make sure we have a unique index for each row
                    rows.value.forEach((row, index) => {
                        rows.value.index = index;
                    });
                })
                .catch(error => console.log(error))
                .finally(() => {
                    loading.value = false;
                    console.timeEnd(`ibiLoadData() \t ${api.value} \t ${companyCode.value}`);
                });
        }

        onMounted(() => loadData());

        return {
            title,
            columns,
            visibleColumns,
            rows
        }
    }
}
</script>
