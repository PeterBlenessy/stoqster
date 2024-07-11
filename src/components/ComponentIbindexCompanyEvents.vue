<template>
    <q-table
        dense
        flat
        color="primary"
        :title="title"
        :rows="rows"
        :columns="columns"
        :visible-columns="visibleColumns"
        row-key="product"
        :rows-per-page-options="[0]"
        :loading="loading"
        hide-bottom
    ></q-table>
</template>

<script>
import { ref, toRef, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { ibindex, ibiRequestOptions } from '../api/ibindexAPI.mjs';
import localforage from 'localforage';
import { fetch } from "@tauri-apps/api/http";

export default {
    name: 'ComponentIbindexCompanyEvents',

    props: {
        company: { type: String, required: true }
    },

    setup(props) {
        const $q = useQuasar();

        const companyCode = toRef(props, 'company');
        const api = ref('getEvents');
        const title = ibindex[api.value].title;
        const columns = ibindex[api.value].columns;
        const visibleColumns = ibindex[api.value].visibleColumns;
        const rows = ref([]);
        const loading = ref(false);

        const requestOptions = ibiRequestOptions(api.value, companyCode.value);
        const ibiEventsStore = localforage.createInstance({ name: 'stoqster', storeName: ibindex[api.value].localForageConfig.storeName });

        // Fetch data from ibindex using the provided api reference
        async function refreshData() {
            loading.value = true;

            // Dirty fix for companies with no events registered triggering status code 500 which for some reason cannot be cought and triggers warnings.
            // We do not want to make a fetch() for these companies so url is set to null in ibindexAPI.js.
            if (requestOptions.url === null) return;

            fetch(requestOptions.url, requestOptions.options)
            .then( response => {
                if (!response.ok || response.status === 500) {
                    return Promise.reject( `Error - fetch() status code: ${response.status}` );
                }

                return response.data;
            })
            .then( data => {
                console.log(data);
                rows.value = [...data];
                // Store data in localforage
                ibiEventsStore.setItem( companyCode.value, data );
                //$q.notify({ type: 'positive', message: 'Successful refresh' });
            })
            .catch( error  => {
                $q.notify({
                    type: 'warning',
                    message: 'Something went wrong during refresh',
                    caption: title + " info not available for " + companyCode.value
                });
                console.log(error);
            })
            .finally( () => loading.value = false );
        }

        async function loadData() {
            loading.value = true;
            ibiEventsStore.getItem(companyCode.value).then( data => {
                if (data === null) {
                    return refreshData();
                }
                rows.value = data;
                // Make sure we have a unique index for each row
                rows.value.forEach((row, index) => {
                    rows.value.index = index;
                });
            })
            .catch( error => console.log(error) )
            .finally( () => loading.value = false );
        }

        onMounted( () => loadData() );

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

../api/ibindexAPI.jsm../api/ibindexAPI.mjs