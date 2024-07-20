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
            hide-bottom
        >
            <template v-slot:top>
                <div class="col-12 text-overline text-center text-uppercase">{{ title }}</div>
            </template>
        </q-table>
    </div>
</template>

<script>

import { ibindex, ibiRequestOptions } from '../api/ibindexAPI.mjs';
import { ref, toRef, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../stores/settings-store.js';
import localforage from 'localforage';
import { fetch } from "@tauri-apps/api/http";

export default {
    name: 'ComponentIbindexRebatePremium',

    props: {
        api: { type: String, required: true },
        company: { type: String, required: true }
    },

    setup(props) {
        const $q = useQuasar();
        const settingsStore = useSettingsStore();
        const { alerts, refreshInterval } = storeToRefs(settingsStore);

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
            console.time(`ibiLoadDataFromWeb() \t ${api.value} \t ${companyCode.value}`);
            loading.value = true;
            fetch(requestOptions.url, requestOptions.options)
                .then( response => {
                    if (!response.ok) {
                        return Promise.reject( `Error - fetch() status code: ${response.status}` );
                    }

                    return response.data;
                })
                .then( data => {
                    rows.value = [...data];
                    // Store new rebate/premium values
                    ibiRebatePremiumStore.setItem( companyCode.value, data );
                })
                .catch( error => {
                    console.log(error);
                    $q.notify({type: 'negative', message: 'Något gick fel under uppdateringen'});

                    // Load data from local storage
                    ibiRebatePremiumStore.getItem(companyCode.value)
                        .then( data => rows.value = [...data])
                        .catch( () => {
                            console.log('Error - could not load data from local storage');
                            $q.notify({
                                type: 'negative',
                                caption: 'Kunde inte läsa data från databasen:' + title
                            });
                        });
                })
                .finally(() => {
                    loading.value = false;
                    console.timeEnd(`ibiLoadDataFromWeb() \t ${api.value} \t ${companyCode.value}`);
                });
        }

        // Checks if an alert has been registered for a company
        const hasAlert = (companyCode) => alerts.value.includes(companyCode);

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
                    message: 'Alarm triggades för ' + companyCode.value + '!',
                    caption: 'Beräknad rabatt/premium korsar ner det löpande medelvärdet',
                    timeout: 0,
                    actions: [{ label: 'Avvisa', color: 'white', handler: () => { /* ... */ } }]
                });
                return '----- cross down -----';
            }

            // cross-up
            if (prev < avg && avg < curr) {
                $q.notify({
                    type: 'warning',
                    group: false,
                    message: 'Alert triggered!',
                    caption: 'Beräknad rabatt/premium korsar upp det löpande medelvärdet',
                    timeout: 0,
                    actions: [{ label: 'Avvisa', color: 'white', handler: () => { /* ... */ } }]
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
            }, refreshInterval.value);
        });

        return {
            title,
            columns,
            visibleColumns,
            rows
        }
    }
}

</script>

<style >
.table__top {
    justify-content: center;
}
</style>