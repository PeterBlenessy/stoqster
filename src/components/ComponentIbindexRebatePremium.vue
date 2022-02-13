<template>
    <div class="q-pa-sm">
        <q-table
            dense
            flat
            color="primary"
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

import { ibindex, ibiRequestOptions } from '../api/ibindexAPI.js';
import { ref, toRef, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useStore } from 'vuex';
import localforage from 'localforage';

export default {
    name: 'ComponentIbindexRebatePremium',

    props: {
        api: { type: String, required: true },
        company: { type: String, required: true }
    },

    setup(props) {
        const $q = useQuasar();
        const store = useStore();

        const api = toRef(props, 'api');
        const companyCode = toRef(props, 'company');
        const title = ibindex[api.value].title;
        const visibleColumns = ibindex[api.value].visibleColumns;
        const columns = ibindex[api.value].columns;
        const rows = ref([]);
        const loading = ref(false);

        const requestOptions = ibiRequestOptions(api.value, companyCode.value);
        const ibiRebatePremiumStore = localforage.createInstance({ name: 'stoqster', storeName: ibindex[api.value].localForageConfig.storeName });

        // Fetch data from ibindex using the provided api reference
        async function refreshData() {
            loading.value = true;

            fetch(requestOptions.url, requestOptions.options).then( response => {
                if (!response.ok) {
                    return Promise.reject( `Error - fetch() status code: ${response.status}` );
                }
                return response.arrayBuffer();
            })
            .then( buffer => {
                let data = JSON.parse(new TextDecoder('latin1').decode(buffer)) || [];
                rows.value = data;
                // Store new rebate/premium values
                ibiRebatePremiumStore.setItem( companyCode.value, data );
            })
            .catch( error => {
                rows.value = ibiRebatePremiumStore.getItem(companyCode.value);
                $q.notify({
                    type: 'negative',
                    message: 'Something went wrong during refresh',
                    caption: 'Showing data from last successful refresh of ' + title
                });
            })
            .finally( () => loading.value = false );
        }

        // Checks if an alert has been registered for a company
        function hasAlert(companyCode) {
            let alerts = store.state.alerts;
            return JSON.stringify(alerts).includes(companyCode);
        }

        function checkAlertTriggers(current) {

            // let previous = $q.localStorage.getItem(companyCode.value);
            let previous = ibiRebatePremiumStore.getItem(companyCode.value);

            let prev = previous[0].calculatedRebatePremium;
            let curr = current[0].calculatedRebatePremium;
            let avg = current[1].calculatedRebatePremiumAverage;

            // cross-down
            if (prev > avg && avg > curr) {
                $q.notify({
                    type: 'warning',
                    group: false,
                    message: 'Alert triggered for ' + companyCode.value + '!',
                    caption: 'Calculated rebate/premium crosses down 30 days average',
                    timeout: 0,
                    actions: [
                        { label: 'Dismiss', color: 'white', handler: () => { /* ... */ } }
                    ]
                });
                return '----- cross down -----';
            }

            // cross-up
            if (prev < avg && avg < curr) {
                $q.notify({
                    type: 'warning',
                    group: false,
                    message: 'Alert triggered!',
                    caption: 'Calculated rebate/premium crosses up 30 days average',
                    timeout: 0,
                    actions: [
                        { label: 'Dismiss', color: 'white', handler: () => { /* ... */ } }
                    ]
                });
                return '----- cross up -----';
            }

            // no-cross
            if ((prev < avg && curr < avg) || (prev > avg && curr > avg)) {
                return '----- no-cross -----';
            }
        }

        onMounted( () => {
            refreshData();

            setInterval( () => {
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
    justify-content: center;
}
</style>