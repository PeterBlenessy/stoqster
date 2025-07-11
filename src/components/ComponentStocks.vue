<template>
    <div class="q-pa-sm">
        <q-table
            dense
            wrap-cells
            color="primary"
            class="my-sticky-header-table"
            row-key="Symbol"
            :title="title"
            :rows="rows"
            :columns="columns"
            :visible-columns="visibleColumns"
            :filter="filter"
            binary-state-sort
            v-model:pagination="pagination"
            :rows-per-page-options="[0]"
        >
            <!-- Configure top-right part of the data table component -->
            <template v-slot:top-right>
                <TableToolbar
                    v-model:filter="filter"
                    :loading="loading"
                    :refresh-color="refreshColor"
                    @refresh="loadDataFromWeb"
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
                        <q-tooltip
                            transition-show="scale"
                            transition-hide="scale"
                        >
                            {{ col.label }}
                        </q-tooltip>
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
                        :style="getColumnStyle(col, props.row)"
                    >
                        {{ col.value }}
                        <q-tooltip
                            transition-show="scale"
                            transition-hide="scale"
                        >
                            {{ col.label + ": " + col.value }}
                        </q-tooltip>
                    </q-td>

                    <!-- Action buttons -->
                    <q-td auto-width>
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
                                {{ "Visa fondägande" }}
                            </q-tooltip>
                        </q-btn>
                    </q-td>
                </q-tr>

                <!--  Expanded row. Displays information about fund ownership of the stock.  -->
                <q-tr v-if="props.expand" :props="props" no-hover>
                    <q-td :colspan="props.cols.length + 1">
                        <ComponentStockOwnership
                            :stock-symbol="props.row['Symbol']"
                            :stock-isin="props.row['ISIN']"
                            :key="props.row['Symbol']"
                        />
                    </q-td>
                </q-tr>
            </template>

            <!-- No data message -->
            <template v-slot:no-data>
                <div class="full-width row flex-center text-accent q-gutter-sm">
                    <q-icon size="2em" name="mdi-information" />
                    <span>
                        Inga aktier att visa. Klicka på uppdatera för att hämta data.
                    </span>
                </div>
            </template>
        </q-table>
    </div>
</template>

<script>
import { stocks, fetchStockData } from "../api/stocksAPI.js";
import { ref, onMounted, watch } from "vue";
import { useQuasar } from "quasar";
import localforage from "localforage";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settings-store.js";
import ComponentStockOwnership from "./ComponentStockOwnership.vue";
import TableToolbar from "./TableToolbar.vue";

export default {
    name: "ComponentStocks",
    components: {
        ComponentStockOwnership,
        TableToolbar,
    },
    setup() {
        // IndexedDB store used by this component
        const stocksStore = localforage.createInstance({
            name: "stoqster",
            storeName: stocks.localForageConfig.storeName,
        });
        
        const settingsStore = useSettingsStore();
        const { stocksVisibleColumns } = storeToRefs(settingsStore);

        const $q = useQuasar();

        const title = ref(stocks.title);
        const columns = ref(stocks.qTableConfig.columns);
        const visibleColumns = ref(stocks.qTableConfig.visibleColumns);
        const rows = ref([]);

        const loading = ref(false);
        const refreshColor = ref("primary");

        const loadedFromWeb = ref(false);

        // Load stocks data from web/API
        async function loadDataFromWeb() {
            console.log('🌐 Loading stocks data from API');
            loading.value = true;
            
            try {
                const stockData = await fetchStockData();
                
                // Store each stock in IndexedDB
                for (const stock of stockData) {
                    await stocksStore.setItem(stock.Symbol, stock);
                }
                
                rows.value = stockData;
                loadedFromWeb.value = true;
                console.log(`✅ Loaded ${stockData.length} stocks from API`);
                
                $q.notify({
                    type: "positive",
                    message: "Uppdateringen gick bra",
                    caption: `${stockData.length} aktier uppdaterade`,
                });
            } catch (error) {
                console.error('❌ Error loading stocks data:', error);
                $q.notify({
                    type: "negative",
                    message: "Något gick fel under uppdateringen",
                    caption: error.message || "Okänt fel",
                });
            } finally {
                loading.value = false;
            }
        }

        // Load stocks from IndexedDB
        async function loadDataFromDB() {
            console.log('💾 Loading stocks data from IndexedDB');
            loading.value = true;
            
            try {
                const data = [];
                await stocksStore.iterate((value, key) => {
                    data.push(value);
                });
                
                rows.value = data;
                console.log(`✅ Loaded ${data.length} stocks from IndexedDB`);
            } catch (error) {
                console.error('❌ Error loading stocks from IndexedDB:', error);
                throw error;
            } finally {
                loading.value = false;
            }
        }

        // Load stocks, either from web or from IndexedDB
        async function loadData() {
            loading.value = true;
            
            try {
                const numberOfStocks = await stocksStore.length();
                
                if (numberOfStocks === 0) {
                    console.log('📦 No stocks in storage, loading from web');
                    await loadDataFromWeb();
                } else {
                    console.log(`📦 ${numberOfStocks} stocks found in storage, loading from DB`);
                    await loadDataFromDB();
                }
            } catch (error) {
                console.error('❌ Error in loadData:', error);
                $q.notify({
                    type: "negative",
                    message: "Kunde inte ladda aktiedata",
                    caption: error.message || "Okänt fel",
                });
            } finally {
                loading.value = false;
            }
        }

        // Restore visible columns from Pinia store
        const restoreVisibleColumns = () => {
            if (stocksVisibleColumns.value && stocksVisibleColumns.value.length !== 0) {
                visibleColumns.value = stocksVisibleColumns.value;
            }
        };

        // Get column styling based on data
        const getColumnStyle = (col, row) => {
            if (col.name === "Förändring" && row.Förändring !== undefined) {
                return row.Förändring >= 0 ? "color: green;" : "color: red;";
            }
            if (col.name === "Förändring_procent" && row.Förändring_procent !== undefined) {
                return row.Förändring_procent >= 0 ? "color: green;" : "color: red;";
            }
            return "";
        };

        onMounted(() => {
            console.log('🔄 ComponentStocks mounted, loading data');
            loadData();
            restoreVisibleColumns();
        });

        // Watch for visible columns changes and persist to store
        watch(
            visibleColumns,
            (newVal) => {
                if (stocksVisibleColumns) {
                    stocksVisibleColumns.value = [...newVal];
                }
            }
        );

        // Watch for data loaded from web and refresh from DB
        watch(loadedFromWeb, (newVal) => {
            if (newVal) {
                loadDataFromDB().then(() => {
                    console.log('✅ Data refreshed from DB after web load');
                });
            }
        });

        return {
            loadData,
            loadDataFromWeb,
            loading,
            refreshColor,
            filter: ref(""),
            title,
            columns,
            visibleColumns,
            rows,
            getColumnStyle,
            pagination: ref({
                rowsPerPage: 0,
            }),
        };
    },
};
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
    .q-table__middle,
    .q-table__bottom,
    thead tr:first-child th
        /* bg color is important for th; just specify one */
        background-color: #ffffff

    thead tr
        top: 0
        position: sticky
        z-index: 2
        text-transform: uppercase

    &.q-table--dark
        .q-table__top,
        .q-table__middle,
        .q-table__bottom,
        thead tr:first-child th
            /* bg color is important for th; just specify one */
            background-color: #1d1d1d
</style>