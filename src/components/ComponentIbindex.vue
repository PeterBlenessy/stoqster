<template>
    <div class="q-pa-sm">
        <q-table
            dense
            color="primary"
            class="my-sticky-header-table"
            row-key="product"
            :title="title"
            :rows="rows"
            :columns="columns"
            :visible-columns="visibleColumns"
            :filter="filter"
            :rows-per-page-options="[0]"
            :binary-state-sort="true"
            wrap-cells
            selection="multiple"
            v-model:selected="selectedRows"
            @update:selected="onUpdateSelected"
        >
            <!-- Configure top-right part of the data table component -->
            <template v-slot:top-right>
                <TableToolbar
                    v-model:filter="filter"
                    :loading="loading"
                    :refresh-color="refreshColor"
                    @refresh="refreshTableData"
                />
            </template>

            <!-- Table header row -->
            <template v-slot:header="props">
                <q-tr :props="props">
                    <q-th
                        v-for="col in props.cols"
                        :key="col.name"
                        :props="props"
                        style="vertical-align: bottom"
                    >
                        {{ col.label }}
                    </q-th>

                    <!-- Column selection  -->
                    <q-th auto-width>
                        <q-select
                            multiple
                            dense
                            options-dense
                            borderless
                            dropdown-icon="mdi-dots-vertical"
                            style="size: 300px"
                            v-model="visibleColumns"
                            display-value
                            emit-value
                            map-options
                            :options="columns"
                            option-value="name"
                        >
                            <template
                                v-slot:option="{
                                    itemProps,
                                    opt,
                                    selected,
                                    toggleOption,
                                }"
                            >
                                <q-item v-bind="itemProps" dense>
                                    <q-item-section>
                                        <q-item-label v-html="opt.label" />
                                    </q-item-section>

                                    <q-item-section side>
                                        <q-toggle
                                            size="xs"
                                            :model-value="selected"
                                            @update:model-value="
                                                toggleOption(opt)
                                            "
                                        />
                                    </q-item-section>
                                </q-item>
                            </template>
                            <q-tooltip
                                transition-show="scale"
                                transition-hide="scale"
                            >
                                {{ "Välj kolumner" }}
                            </q-tooltip>
                        </q-select>
                    </q-th>
                </q-tr>
            </template>

            <template v-slot:body="props">
                <q-tr :props="props" @click="props.expand = !props.expand">
                    <!-- Column values -->
                    <q-td
                        v-for="col in props.cols"
                        :key="col.name"
                        :props="props"
                        >{{ col.value }}</q-td
                    >

                    <!-- Action buttons -->
                    <q-td auto-width style="white-space: nowrap">
                        <!-- Add to watchlist / dashboard -->
                        <q-toggle
                            size="sm"
                            dense
                            v-model="props.selected"
                            checked-icon="mdi-eye"
                            unchecked-icon="mdi-eye-off"
                        >
                            <q-tooltip
                                transition-show="scale"
                                transition-hide="scale"
                            >
                                {{
                                    props.selected
                                        ? "Remove fromdashboard"
                                        : "Add to dashboard"
                                }}
                            </q-tooltip>
                        </q-toggle>

                        <!-- Expand more details -->
                        <q-btn
                            size="sm"
                            color="primary"
                            flat
                            round
                            dense
                            :icon="
                                props.expand
                                    ? 'mdi-chevron-up'
                                    : 'mdi-chevron-down'
                            "
                        >
                            <q-tooltip
                                transition-show="scale"
                                transition-hide="scale"
                            >
                                {{
                                    "Show more info about " +
                                    props.row.productName
                                }}
                            </q-tooltip>
                        </q-btn>
                    </q-td>
                </q-tr>

                <!--  Expanded row. Displays additional insights about the company.  -->
                <q-tr v-if="props.expand" :props="props" no-hover>
                    <q-td :colspan="props.cols.length + 1">
                        <div class="row items-start q-gutter-md">
                            <div class="col-8">
                                <q-card>
                                    <q-card-section>
                                        <CompanyDetails
                                            :api="ibindex.getHoldings"
                                            request="getHoldings"
                                            :company="props.row.product"
                                            :force-refresh="detailsRefreshTrigger"
                                            :key="props.row.product"
                                        />
                                    </q-card-section>
                                </q-card>
                            </div>
                            <div class="col-3">
                                <q-card>
                                    <q-card-section>
                                        <CompanyDetails
                                            :api="ibindex.getEvents"
                                            request="getEvents"
                                            :company="props.row.product"
                                            :force-refresh="detailsRefreshTrigger"
                                            :key="props.row.product"
                                        />
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

<script setup>
import { ibindex } from "../api/ibindexAPI.mjs";
import CompanyDetails from "./CompanyDetails.vue";
import TableToolbar from "./TableToolbar.vue";
import { ref, toRef, onMounted } from "vue";
import { useQuasar } from "quasar";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settings-store.js";
import { useDataLoader } from "../composables/useDataLoader.js";
import { useApiRequest } from "../composables/useApiRequest.js";
import { useLocalStorage } from "../composables/useLocalStorage.js";
import { useTableState } from "../composables/useTableState.js";

const props = defineProps({
    api: { type: String, required: true },
})

const $q = useQuasar();
const settingsStore = useSettingsStore();
const { ibiWatchlist, ibiVisibleColumns } = storeToRefs(settingsStore);
const api = toRef(props, "api");

// Defensive check to ensure API is valid
if (!api.value || !ibindex[api.value]) {
    console.error("Invalid API value:", api.value);
    throw new Error(`Invalid API value: ${api.value}`);
}

const title = ref(ibindex[api.value].title);
const columns = ibindex[api.value].columns;
const rows = ref([]);

// Refresh trigger for child components
const detailsRefreshTrigger = ref(0);

// Use composables
const { loading, refreshColor, loadData, refreshData } = useDataLoader();
const { makeRequest } = useApiRequest();
const { createStore } = useLocalStorage();
const { createTableState } = useTableState();

// Create LocalForage store
const ibiStore = createStore({
    storeName: ibindex[api.value].localForageConfig.storeName
});

// Create table state management
const {
    selectedRows,
    visibleColumns,
    filter,
    onUpdateSelected,
    initializeFromStores
} = createTableState({
    initialColumns: ibindex[api.value].visibleColumns,
    watchlistStore: ibiWatchlist,
    visibleColumnsStore: ibiVisibleColumns
});

// Web fetcher function for the data loader
async function fetchFromWeb() {
    return await makeRequest({
        requestOptionsGetter: ibindex[api.value].requestOptions,
        apiName: api.value
    });
}

// Load data with cache fallback
async function loadTableData() {
    const data = await loadData({
        store: ibiStore,
        webFetcher: fetchFromWeb,
        apiName: api.value,
        onSuccess: (data) => {
            rows.value = [...data];
        }
    });
}

// Refresh data from web
async function refreshTableData() {
    const data = await refreshData({
        webFetcher: fetchFromWeb,
        store: ibiStore,
        apiName: api.value,
        onSuccess: (data) => {
            rows.value = [...data];
            // Store refresh timestamp in localStorage for child components to check
            localStorage.setItem('lastRefresh_ibi', Date.now().toString());
            console.log(`📅 Stored IBI refresh timestamp: ${new Date().toLocaleTimeString()}`);
            
            // Trigger refresh for child components (for already mounted ones)
            detailsRefreshTrigger.value = Date.now();
            console.log(`🔄 Triggered child component refresh: ${detailsRefreshTrigger.value}`);
        }
    });
}

onMounted(() => {
    loadTableData();
    initializeFromStores();
});
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
    height: calc(100vh - 100px)

    .q-table__top,
    .q-table__bottom,
    thead tr:first-child th
        /* bg color is important for th; just specify one */
        background-color: #ffffff

    thead tr th
        top: 0
        position: sticky
        z-index: 2
        text-transform: uppercase

    &.q-table--dark
        .q-table__top,
        .q-table__bottom,
        thead tr:first-child th
            /* bg color is important for th; just specify one */
            background-color: #1d1d1d
</style>
