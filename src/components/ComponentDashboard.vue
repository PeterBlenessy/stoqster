<template>
    <div class="q-pa-sm ">
        <q-table :title="title" dense :rows="rows" :columns="columns" row-key="product" :rows-per-page-options="[0]"
            :filter="filter" grid color="primary" v-model:expanded="expandedCards">
            <template v-slot:top-right>
                <!-- Filter input -->
                <q-input dense debounce="300" v-model="filter" placeholder="Filter" style="width: 500px">
                    <template v-slot:append>
                        <q-icon name="mdi-filter-variant" />
                    </template>
                </q-input>

                <!-- Refresh button -->
                <q-btn flat round dense icon="mdi-refresh" :color="refreshColor" :loading="loading" @click="refreshData()">
                    <q-tooltip transition-show="scale" transition-hide="scale">{{ "Uppdatera" }}</q-tooltip>
                </q-btn>
            </template>

            <!-- Card items -->
            <template v-slot:item="props">
                <div class="q-pa-xs col-4">
                    <q-card>
                        <q-card-section class="text-center text-subtitle2">{{ props.row.productName }}</q-card-section>
                        <q-separator inset />
                        <q-card-section>
                            <div class="text-center text-overline">{{props.colsMap.netAssetValueCalculatedRebatePremium.label }}</div>
                            <div class="flex flex-center text-h6" :style="{color: props.row.netAssetValueCalculatedRebatePremium < 0 ? 'red' : 'green'}">
                                {{ props.row.netAssetValueCalculatedRebatePremium.toFixed(2) }}%
                                <q-icon :name="props.row.priceChange < 0 ? 'mdi-trending-down' : 'mdi-trending-up'" />
                            </div>
                        </q-card-section>
                        <q-separator inset />

                        <q-card-actions>
                            <!-- Delete item button -->
                            <q-btn color="grey" round flat dense size="sm" icon="mdi-delete-outline"
                                @click="removeWatchlistItem(props.row.product)">
                                <q-tooltip transition-show="scale" transition-hide="scale">
                                    {{ "Ta bort"}}
                                </q-tooltip>
                            </q-btn>

                            <!-- Add alarm to item button -->
                            <!-- icon="edit_notifications" -->
                            <q-btn :color="hasAlert(props.row.product) ? 'primary' : 'grey'" round flat dense size="sm"
                                :icon="hasAlert(props.row.product) ? 'mdi-bell-cog' : 'mdi-bell-plus'" 
                                @click="onAddAlert(
                                    props.row.product,
                                    props.row.productName,
                                    props.colsMap.netAssetValueCalculatedRebatePremium.field,
                                    props.colsMap.netAssetValueCalculatedRebatePremium.label,
                                    props.row.netAssetValueCalculatedRebatePremium
                                )">
                                <q-tooltip transition-show="scale" transition-hide="scale">
                                    {{hasAlert(props.row.product) ? "Editera larm" : "Lägg till larm" }}
                                </q-tooltip>
                            </q-btn>
                            <q-space />

                            <!-- Expand more info button -->
                            <q-btn size="sm" color="primary" flat round dense @click="props.expand = !props.expand"
                                :icon="props.expand ? 'mdi-chevron-up' : 'mdi-chevron-down'">
                                <q-tooltip transition-show="scale" transition-hide="scale">{{ props.expand ? "Hide" :
                                    "Show more time periods" }}</q-tooltip>
                            </q-btn>
                        </q-card-actions>

                        <!-- Expandable historical info about Rebate/Premiums -->
                        <div class="q-pa-md" v-show="props.expand">
                            <ComponentIbindexRebatePremium api="getRebatePremiums" :company="props.row.product" />
                        </div>
                    </q-card>
                </div>
            </template>
        </q-table>
    </div>
</template>

<script>

import { ibindex, ibiRequestOptions } from '../api/ibindexAPI.mjs';
import ComponentIbindexRebatePremium from './ComponentIbindexRebatePremium.vue';
import AlertDialog from './ComponentAlertDialog.vue';
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../stores/settings-store.js';
import { fetch } from "@tauri-apps/api/http";

export default {
    name: 'ComponentDashboard',
    components: {
        ComponentIbindexRebatePremium
    },
    props: {},

    setup() {
        const $q = useQuasar();
        const settingsStore = useSettingsStore();
        const { alerts, watchlist, refreshInterval } = storeToRefs(settingsStore);

        const api = ref('getCompanies');
        const title = "Bevakningar: beräknad rabatt/premie"; //ibindex[ibiAPI].title;
        const visibleColumns = ibindex[api.value].visibleColumns;
        const columns = ibindex[api.value].columns;
        const rows = ref([]);
        const loading = ref(false);
        const refreshColor = ref('primary');

        const requestOptions = ibiRequestOptions(api.value);

        // Refresh data
        async function refreshData() {
            let visibleRows = [];

            fetch(requestOptions.url, requestOptions.options)
            .then(response => {
                if (!response.ok) {
                    return Promise.reject(`Error - fetch() status code: ${response.status}`);
                }

                return response.data;
            })
            .then(data => {
                rows.value = [...data];
                // Filter out rows that are not in the watchlist
                if (watchlist.value !== null) {
                    Object.entries(watchlist.value).forEach(([key, value]) => {
                        visibleRows.push(value.product);
                    });
                    rows.value = rows.value.filter(item => visibleRows.includes(item.product));

                    watchlist.value = rows.value; // Store current values in watchlist
                    refreshColor.value = 'primary';
                    $q.notify({ type: 'positive', message: 'Uppdateringen gick bra' });
                }
            }).catch(error => {
                console.log(error);
                rows.value = watchlist.value; // Show the latest values in case we have a network error 
                refreshColor.value = 'negative';
                $q.notify({type: 'negative', message: 'Något gick fel under uppdatering'});
            }).finally(() => loading.value = false);
        }

        // Updates the watchlist in Pinia state store. The state is also stored in localStorage.
        function removeWatchlistItem(removedItem) {
            rows.value = rows.value.filter(item => item.product !== removedItem);
            watchlist.value = rows.value;
        }

        // Checks if an alert has been registered for a company
        function hasAlert(companyCode) {
            return alerts.value.some(item => item.companyCode === companyCode);
        }

        function onAddAlert(product, productName, field, fieldLabel, fieldValue) {
            $q.dialog({
                component: AlertDialog,

                // props forwarded to your custom component
                componentProps: {
                    companyCode: product,
                    companyName: productName,
                    field: field,
                    fieldLabel: fieldLabel,
                    fieldValue: fieldValue,

                    title: 'Alarm: ' + productName,
                    cancel: true,
                    persistent: true
                }
            }).onOk(data => {
                // console.log('>>>> OK, received', data)

            }).onCancel(() => {
                // console.log('>>>> Cancel')
            }).onDismiss(() => {
                // console.log('I am triggered on both OK and Cancel')
                // todo: There has to be a better way to force refresh of add alert icon color
                this.refreshData();
            })
        }

        onMounted(() => {
            refreshData();

            setInterval(() => {
                refreshData();
            }, refreshInterval.value);
        });

        return {
            title,
            columns,
            visibleColumns,
            rows,
            filter: ref(''),
            expandedCards: ref([]),

            loading,
            refreshColor,

            refreshData,
            removeWatchlistItem,
            hasAlert,
            onAddAlert,
        }
    }

}
</script>
../api/ibindexAPI.jsm