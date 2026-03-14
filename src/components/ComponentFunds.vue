<template>
    <div class="q-pa-sm">
        <q-table
            dense
            wrap-cells
            color="primary"
            class="my-sticky-header-table"
            :row-key="(row) => `${row.fundISIN || row.fundName}_${row.quarter || 'unknown'}`"
            :title="title"
            :rows="rows"
            :columns="columns"
            :visible-columns="visibleColumns"
            :filter="filter"
            binary-state-sort
            virtual-scroll
            virtual-scroll-slice-size="100"
            virtual-scroll-slice-ratio-before="2"
            virtual-scroll-slice-ratio-after="2"
            virtual-scroll-sticky-size-start="28"
            virtual-scroll-item-size="28"
            virtual-scroll-sticky-size-end="33"
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
                    refresh-tooltip="Uppdatera kvartalsmetadata från Finansinspektionen"
                >
                    <template v-slot:actions>
                        <!-- Debug button (temporary) -->
                        <q-btn
                            dense
                            flat
                            icon="mdi-bug"
                            color="orange"
                            @click="debugData"
                            v-if="$q.dev"
                        >
                            <q-tooltip>Debug data state</q-tooltip>
                        </q-btn>
                        <q-btn
                            dense
                            flat
                            icon="mdi-download-multiple"
                            color="primary"
                            @click="loadAllHistoricalDataFromWeb"
                        >
                            <q-tooltip
                                transition-show="scale"
                                transition-hide="scale"
                            >
                                {{ "Ladda ner och importera all historisk data" }}
                            </q-tooltip>
                        </q-btn>
                    </template>
                </TableToolbar>
            </template>

            <!-- Configure table header -->
            <template v-slot:header="props">
                <q-tr :props="props">
                    <q-th
                        v-for="col in props.cols"
                        :key="col.name"
                        :props="props"
                    >
                        {{ col.label }}
                        <q-tooltip
                            transition-show="scale"
                            transition-hide="scale"
                        >
                            {{ col.label }}
                        </q-tooltip>
                    </q-th>
                    <!-- Dropdown select for displayed table columns -->
                    <q-th auto-width>
                        <q-select
                            v-model="visibleColumns"
                            multiple
                            borderless
                            dense
                            options-dense
                            :display-value="$q.lang.table.columns"
                            emit-value
                            map-options
                            :options="columns"
                            option-value="name"
                            style="min-width: 50px"
                            dropdown-icon="mdi-dots-vertical"
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
                <q-tr :props="props" @click="handleRowExpansion(props)" class="row-pointer">
                    <!-- Column values -->
                    <q-td
                        v-for="col in props.cols"
                        :key="col.name"
                        :props="props"
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
                            @click.stop="handleRowExpansion(props)"
                        >
                            <q-tooltip
                                transition-show="scale"
                                transition-hide="scale"
                            >
                                {{ "Visa innehav" }}
                            </q-tooltip>
                        </q-btn>
                    </q-td>
                </q-tr>

                <!--  Expanded row. Displays information about the fund's holdings and metrics.  -->
                <q-tr v-if="props.expand" :props="props" no-hover>
                    <q-td :colspan="props.cols.length + 1" class="q-pa-none">
                        {{ ensureTabState(props.row.fundISIN) }}
                        <q-card flat>
                            <!-- Tab headers -->
                            <q-tabs
                                v-model="expandedRowTabs[props.row.fundISIN]"
                                dense inline-label
                                class="text-grey"
                                active-color="primary"
                                indicator-color="primary"
                                align="justify"
                                narrow-indicator
                            >
                                <q-tab name="holdings" icon="mdi-briefcase-outline" label="Innehav" />
                                <q-tab name="metrics" icon="mdi-chart-line" label="Trend" />
                            </q-tabs>

                            <q-separator />

                            <!-- Tab panels -->
                            <q-tab-panels
                                v-model="expandedRowTabs[props.row.fundISIN]"
                                animated
                            >
                                <!-- Holdings tab -->
                                <q-tab-panel name="holdings" class="q-pa-none">
                                    <ComponentFundHoldings
                                        :fund-name="props.row.fundName"
                                        :fund-i-s-i-n="props.row.fundISIN"
                                        :holdings="getFundHoldings(props.row.fundISIN, selectedQuarters[0])"
                                        :key="props.row.fundISIN"
                                    />
                                </q-tab-panel>

                                <!-- Metrics tab -->
                                <q-tab-panel name="metrics" class="q-pa-md">
                                    <FundMetricsChart
                                        :fund-isin="props.row.fundISIN"
                                        :available-quarters="availableQuarters"
                                        :key="props.row.fundISIN"
                                    />
                                </q-tab-panel>
                            </q-tab-panels>
                        </q-card>
                    </q-td>
                </q-tr>
            </template>
        </q-table>
    </div>
</template>

<script>
import { funds } from "../api/fiAPI.js";
import { ref, onMounted, watch, computed } from "vue";
import { useQuasar } from "quasar";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settings-store.js";
import { useFIStore } from "../stores/fi-store.js";
import { useFundsImport } from "../composables/useFundsImport.js";
import ComponentFundHoldings from "./ComponentFundHoldings.vue";
import FundMetricsChart from "./FundMetricsChart.vue";
import TableToolbar from "./TableToolbar.vue";

export default {
    name: "ComponentFunds",
    components: {
        ComponentFundHoldings,
        FundMetricsChart,
        TableToolbar,
    },
    setup() {
        const fiStore = useFIStore()
        const { funds: storeFunds, selectedQuarters, availableQuarters, isMultiQuarterView, currentViewLabel } = storeToRefs(fiStore)

        const settingsStore = useSettingsStore();
        const { fiVisibleColumns } = storeToRefs(settingsStore);

        const $q = useQuasar();
        const fundsImport = useFundsImport()

        // ==================== TABLE CONFIG ====================

        const title = computed(() => {
            const baseTitle = "FI: Information om fonder och innehav";
            if (isMultiQuarterView.value || selectedQuarters.value.length === 1) {
                return `${baseTitle} - ${currentViewLabel.value}`;
            }
            return baseTitle;
        });

        const baseColumns = funds.qTableConfig.columns
        const baseVisibleColumns = funds.qTableConfig.visibleColumns

        const columns = computed(() => {
            const cols = [...baseColumns]
            if (isMultiQuarterView.value) {
                cols.unshift({
                    name: 'quarter',
                    label: 'Kvartal',
                    field: 'quarterDisplay',
                    sortable: true,
                    align: 'left'
                })
            }
            return cols
        })

        const visibleColumns = computed(() => {
            const visCols = [...(fiVisibleColumns.value.length > 0 ? fiVisibleColumns.value : baseVisibleColumns)]
            if (isMultiQuarterView.value && !visCols.includes('quarter')) {
                visCols.unshift('quarter')
            }
            return visCols
        })

        const rows = computed(() => storeFunds.value)
        const loading = ref(false);
        const refreshColor = ref("primary");

        // ==================== EXPANDED ROW STATE ====================

        const expandedRowTabs = ref({});
        const expandedFunds = ref(new Set());
        const fundHoldingsCache = ref(new Map());

        const handleRowExpansion = async (props) => {
            const wasExpanded = props.expand;
            props.expand = !props.expand;
            if (props.expand && !wasExpanded) {
                const fundISIN = props.row.fundISIN;
                const quarter = selectedQuarters.value[0];
                if (fundISIN && quarter && !fundHoldingsCache.value.has(`${fundISIN}-${quarter}`)) {
                    try {
                        const holdings = await fiStore.loadHoldingsForFund(fundISIN, quarter);
                        fundHoldingsCache.value.set(`${fundISIN}-${quarter}`, holdings);
                        expandedFunds.value.add(fundISIN);
                    } catch (error) {
                        console.error('Failed to load holdings for fund:', error);
                        $q.notify({ type: "negative", message: "Kunde inte ladda innehav för fonden", timeout: 3000 });
                    }
                }
            }
        };

        const getFundHoldings = (fundISIN, quarter) => {
            if (!fundISIN || !quarter) return [];
            return fundHoldingsCache.value.get(`${fundISIN}-${quarter}`) || [];
        }

        function ensureTabState(fundISIN) {
            if (!expandedRowTabs.value[fundISIN]) {
                expandedRowTabs.value[fundISIN] = 'holdings';
            }
        }

        // ==================== DATA LOADING ====================

        async function loadDataFromWeb() {
            loading.value = true;
            try {
                await fundsImport.refreshMetadata()
            } finally {
                loading.value = false;
            }
        }

        async function loadAllHistoricalDataFromWeb() {
            loading.value = true;
            try {
                await fundsImport.importAllHistorical()
            } finally {
                loading.value = false;
            }
        }

        async function loadDataFromStore() {
            loading.value = true;
            try {
                if (fiStore.funds.length === 0) {
                    await fiStore.initialize()
                }
            } finally {
                loading.value = false;
            }
        }

        async function loadData() {
            loading.value = true;
            try {
                const wasUpgradePerformed = await fiStore.performDatabaseUpgrade()
                if (wasUpgradePerformed) {
                    $q.notify({
                        type: "warning",
                        message: "Databas uppgraderad",
                        caption: "Gamla fonddata har rensats under uppgraderingen. Du behöver ladda ner data igen från Finansinspektionen.",
                        timeout: 0,
                        actions: [
                            { label: 'Ladda ner data', color: 'white', handler: () => loadDataFromWeb() },
                            { icon: 'mdi-close', color: 'white', round: true, handler: () => {} }
                        ]
                    });
                    return
                }

                await loadDataFromStore()

                if (fiStore.funds.length === 0) {
                    showNoDataNotification()
                }
            } catch (error) {
                console.error('Failed to load data:', error)
                $q.notify({ type: "negative", message: "Kunde inte ladda fonddata" });
            } finally {
                loading.value = false;
            }
        }

        const showNoDataNotification = () => {
            $q.notify({
                type: "info",
                message: "Ingen fonddata lokalt.",
                caption: "Klicka på uppdatera för att hämta data från Finansinspektionen.",
                timeout: 0,
                actions: [
                    { label: 'Uppdatera', color: 'white', handler: () => loadDataFromWeb() },
                    { icon: 'mdi-close', color: 'white', round: true, handler: () => {} }
                ]
            });
        }

        // ==================== INTERRUPTED OPERATIONS ====================

        const handleInterruptedOperations = async () => {
            try {
                const activeStates = ['downloading', 'extracting', 'importing', 'deleting']
                const interruptedQuarters = availableQuarters.value
                    .filter(q => activeStates.includes(q.importState))
                    .map(q => ({ quarter: q.quarter, state: q.importState, label: q.label }))

                if (interruptedQuarters.length === 0) return

                for (const interrupted of interruptedQuarters) {
                    if (interrupted.state === 'deleting') {
                        const hasData = await fiStore.hasQuarter(interrupted.quarter)
                        fiStore.setQuarterState(interrupted.quarter, hasData ? 'imported' : 'available')
                    } else {
                        fiStore.setQuarterState(interrupted.quarter, 'available')
                    }
                }

                $q.notify({
                    message: `Återställde ${interruptedQuarters.length} avbrutna operationer`,
                    caption: 'Operationerna kan nu startas om',
                    color: 'orange',
                    icon: 'mdi-restart',
                    timeout: 5000,
                    position: 'top'
                })
            } catch (error) {
                console.error('Failed to handle interrupted operations:', error)
            }
        }

        // ==================== LIFECYCLE ====================

        onMounted(async () => {
            loadData();
            await handleInterruptedOperations();
        });

        watch(
            () => visibleColumns.value,
            (newVal) => {
                try {
                    const baseColumns = newVal.filter(col => col !== 'quarter')
                    fiVisibleColumns.value = [...baseColumns]
                } catch (error) {
                    console.error('Error saving column preferences:', error)
                }
            },
        );

        // ==================== QUARTER ACTIONS ====================

        const importQuarter = async (quarter) => {
            await fundsImport.importQuarter(quarter, availableQuarters.value)
        }

        const deleteQuarter = async (quarter) => {
            await fundsImport.deleteQuarter(quarter)
        }

        // ==================== DEBUG ====================

        const debugData = async () => {
            console.log('DEBUG: Current data state', {
                selectedQuarters: selectedQuarters.value,
                availableQuarters: availableQuarters.value,
                storeFundsCount: storeFunds.value.length,
                rowsCount: rows.value.length,
                currentViewLabel: currentViewLabel.value,
                isMultiQuarterView: isMultiQuarterView.value,
            })
            $q.notify({ type: 'info', message: 'Debug info logged to console', timeout: 2000 })
        }

        return {
            loadData,
            loadDataFromWeb,
            loadAllHistoricalDataFromWeb,
            loadDataFromStore,
            showNoDataNotification,
            loading,
            refreshColor,
            filter: ref(""),
            title,
            columns,
            visibleColumns,
            rows,
            pagination: ref({ rowsPerPage: 0 }),
            selectedQuarters,
            availableQuarters,
            isMultiQuarterView,
            currentViewLabel,
            importQuarter,
            deleteQuarter,
            expandedRowTabs,
            expandedFunds,
            fundHoldingsCache,
            handleRowExpansion,
            getFundHoldings,
            ensureTabState,
            debugData
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

/* Force fixed width for dropdown to prevent jumping */
.fixed-width-dropdown {
    width: 400px !important;
    max-width: 400px !important;
    min-width: 400px !important;
}

/* Add pointer cursor for clickable rows */
.row-pointer {
    cursor: pointer;
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
