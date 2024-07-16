<template>
    <div class="q-pa-sm">
        <q-table dense color="primary" class="my-sticky-header-table" row-key="product" :loading="loading"
            :title="title" :rows="rows" :columns="columns" :visible-columns="visibleColumns"
            :filter="filter" :rows-per-page-options="[0]" :binary-state-sort="true" 
            selection="multiple" v-model:selected="selectedRows" @update:selected="onUpdateSelected"
        >
            <!-- Configure top-right part of the data table component -->
            <template v-slot:top-right>
                <!-- Filter input -->
                <q-input dense debounce="300" v-model="filter" placeholder="Filter list" style="width: 500px">
                    <template v-slot:append>
                        <q-icon name="mdi-filter-variant" />
                    </template>
                </q-input>

                <!-- Refresh data -->
                <q-btn dense flat round icon="mdi-refresh" :color="refreshColor" @click="refreshData()">
                    <q-tooltip transition-show="scale" transition-hide="scale">{{ "Refresh data" }}</q-tooltip>
                </q-btn>
            </template>

            <!-- Table header row -->
            <template v-slot:header="props">
                <q-tr :props="props">
                    <q-th v-for="col in props.cols" :key="col.name" :props="props">
                        {{ col.label }}
                    </q-th>

                    <!-- Column selection  -->
                    <q-th auto-width>
                        <q-select multiple dense options-dense borderless dropdown-icon="mdi-dots-vertical"
                            style="size: 300px" v-model="visibleColumns" display-value emit-value map-options
                            :options="columns" option-value="name">
                            <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                                <q-item v-bind="itemProps" dense>
                                    <q-item-section>
                                        <q-item-label v-html="opt.label" />
                                    </q-item-section>

                                    <q-item-section side>
                                        <q-toggle size="xs" :model-value="selected" @update:model-value="toggleOption(opt)" />
                                    </q-item-section>
                                </q-item>
                            </template>
                            <q-tooltip transition-show="scale" transition-hide="scale">
                                {{ "Show/hide columns"}}
                            </q-tooltip>
                        </q-select>
                    </q-th>
                </q-tr>
            </template>

            <template v-slot:body="props">
                <q-tr :props="props" @click="props.expand = !props.expand">
                    <!-- Column values -->
                    <q-td v-for="col in props.cols" :key="col.name" :props="props">{{ col.value }}</q-td>

                    <!-- Action buttons -->
                    <q-td auto-width>
                        <!-- Add to watchlist / dashboard -->
                        <q-toggle size="sm" dense v-model="props.selected" checked-icon="mdi-eye"
                            unchecked-icon="mdi-eye-off">
                            <q-tooltip transition-show="scale" transition-hide="scale">
                                {{ props.selected ? "Remove fromdashboard" : "Add to dashboard" }}
                            </q-tooltip>
                        </q-toggle>

                        <!-- Expand more details -->
                        <q-btn size="sm" color="primary" flat round dense
                            :icon="props.expand ? 'mdi-chevron-up' : 'mdi-chevron-down'">
                            <q-tooltip transition-show="scale" transition-hide="scale">
                                {{ "Show more info about " + props.row.productName }}
                            </q-tooltip>
                        </q-btn>
                    </q-td>
                </q-tr>

                <!--  Expanded row. Displays additional insights about the company.  -->
                <q-tr v-show="props.expand" :props="props" no-hover>
                    <q-td :colspan="props.cols.length + 1">
                        <div class="row items-start q-gutter-md">
                            <div class="col-6">
                                <q-card>
                                    <q-card-section>
                                        <ComponentIbindexCompanyHoldings :company="props.row.product"
                                            :key="props.row.product" />
                                    </q-card-section>
                                </q-card>
                            </div>
                            <div class="col-3">
                                <q-card>
                                    <q-card-section>
                                        <ComponentIbindexCompanyEvents :company="props.row.product"
                                            :key="props.row.product" />
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

import { ibindex, ibiRequestOptions } from '../api/ibindexAPI.mjs';
import ComponentIbindexCompanyHoldings from './ComponentIbindexCompanyHoldings.vue';
import ComponentIbindexCompanyEvents from './ComponentIbindexCompanyEvents.vue';
import { ref, toRef, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../stores/settings-store.js';
import localforage from 'localforage';
import { fetch } from "@tauri-apps/api/http";

export default {
    name: 'ComponentIbindex',
    components: {
        ComponentIbindexCompanyHoldings,
        ComponentIbindexCompanyEvents
    },
    props: {
        api: { type: String, required: true }
    },

    setup(props) {
        const $q = useQuasar();
        const settingsStore = useSettingsStore();
        const { watchlist } = storeToRefs(settingsStore);
        const api = toRef(props, 'api');
        const title = ref(ibindex[api.value].title);
        const visibleColumns = ref(ibindex[api.value].visibleColumns);
        const columns = ibindex[api.value].columns;
        const rows = ref([]);
        const selectedRows = ref([]);
        const loading = ref(false);
        const refreshColor = ref('primary');

        const requestOptions = ibiRequestOptions(api.value);
        const ibiStore = localforage.createInstance({ name: 'stoqster', storeName: ibindex[api.value].localForageConfig.storeName });

        // Fetch data from ibindex using the provided api reference
        async function refreshData() {
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
                    // Store new data
                    data.forEach(item => ibiStore.setItem(item.product, item));

                    refreshColor.value = 'primary';
                    $q.notify({ type: 'positive', message: 'Successful refresh' });
                }).catch(error => {
                    console.log(error);
                    refreshColor.value = 'negative';
                    $q.notify({
                        type: 'warning',
                        message: 'Something went wrong during refresh',
                        caption: 'Showing data from local storage'
                    });
                }).finally(() => loading.value = false);
        }

        // Save the selected rows to Vuex state store. These rows represent the watchlist and will also be saved to the localStorage.
        function onUpdateSelected(newSelection) {
            watchlist.value = newSelection;
        }

        // Restore selected rows from Vuex state store. These rows represent the watchlist.
        function restoreSelectedRows() {
            selectedRows.value = watchlist.value;
        }

        // Load data. Try local storage first and online download if that fails.
        async function loadData() {
            loading.value = true;

            let data = [];
            ibiStore.iterate((value, key, iterationNumber) => {
                data.push(value);
            }).then(() => {
                if (data.length === 0) {
                    return refreshData();
                }

                rows.value = [...data];
                // Make sure we have a unique index for each row
                rows.value.forEach((row, index) => {
                    rows.value.index = index;
                });
            }).catch(error => console.log(error))
            .finally(() => loading.value = false);
        }

        onMounted(() => {
            loadData();
            restoreSelectedRows();
        });

        return {
            title,
            columns,
            visibleColumns,
            rows,
            selectedRows,
            filter: ref(''),

            loading,
            refreshColor,
            refreshData,
            restoreSelectedRows,
            onUpdateSelected
        }
    }

}

</script>

<style>
.q-table tbody td:after {
    background: rgba(255, 255, 255, 0);
}

.q-table--dark tbody td:after {
    background: rgba(0, 0, 0, 0);
}

.q-table tbody td:before {
    background: rgba(0, 0, 0, 0.04);
}

.q-table--dark tbody td:before {
    background: rgba(255, 255, 255, 0.04);
}
</style>

<style lang="sass" scoped>

.my-sticky-header-table
    /* height or max-height is important */
    height: calc(100vh - 115px)

    .q-table__top,
    .q-table__bottom,
    thead tr:first-child th
        /* bg color is important for th; just specify one */
        background-color: #ffffff

    thead tr th
        position: sticky
        z-index: 2
        text-transform: uppercase
    thead tr:first-child th
        top: 0

    /* this is when the loading indicator appears */
    &.q-table--loading thead tr:last-child th
        /* height of all previous header rows */
        top: 48px

.q-table--dark 
    .q-table__top,
    .q-table__bottom,
    thead tr:first-child th
        /* bg color is important for th; just specify one */
        background-color: #1d1d1d

</style>

../api/ibindexAPI.jsm../api/ibindexAPI.mjs