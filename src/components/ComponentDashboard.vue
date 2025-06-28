<template>
    <div class="q-pa-sm">
        <q-table
            :title="title"
            dense
            :rows="rows"
            :columns="unifiedColumns"
            row-key="product"
            :rows-per-page-options="[0]"
            :filter="filter"
            grid
            color="primary"
            v-model:expanded="expandedCards"
        >
            <template v-slot:top-right>
                <TableToolbar
                    v-model:filter="filter"
                    :loading="loading"
                    :refresh-color="refreshColor"
                    placeholder="Filter"
                    @refresh="refreshData"
                />
            </template>

            <!-- Card items -->
            <template v-slot:item="props">
                <div class="q-pa-xs col-4">
                    <q-card>
                        <q-card-section class="text-center text-subtitle2">
                            {{ props.row.productName }}
                            <q-badge 
                                :color="props.row._sourceType === 'fbi' ? 'orange' : 'blue'" 
                                class="q-ml-sm"
                            >
                                {{ props.row._sourceType?.toUpperCase() }}
                            </q-badge>
                        </q-card-section>
                        <q-separator inset />
                        <q-card-section>
                            <div class="text-center text-overline">
                                {{
                                    getFieldLabel(props.row._sourceType, 'netAssetValueRebatePremium')
                                }}
                            </div>
                            <div
                                class="flex flex-center text-h6"
                                :style="{
                                    color:
                                        (() => {
                                            const value = getFieldValue(props.row, 'netAssetValueRebatePremium');
                                            return value != null && value < 0 ? 'red' : 'green';
                                        })()
                                }"
                            >
                                {{
                                    (() => {
                                        const value = getFieldValue(props.row, 'netAssetValueRebatePremium');
                                        return value != null ? `${value.toFixed(2)}%` : 'N/A';
                                    })()
                                }}
                                <q-icon
                                    v-if="props.row.priceChange != null"
                                    :name="
                                        props.row.priceChange < 0
                                            ? 'mdi-trending-down'
                                            : 'mdi-trending-up'
                                    "
                                />
                            </div>
                        </q-card-section>
                        <q-separator inset />

                        <q-card-actions>
                            <!-- Delete item button -->
                            <q-btn
                                color="grey"
                                round
                                flat
                                dense
                                size="sm"
                                icon="mdi-delete-outline"
                                @click="removeWatchlistItem(props.row.product)"
                            >
                                <q-tooltip
                                    transition-show="scale"
                                    transition-hide="scale"
                                >
                                    {{ "Ta bort" }}
                                </q-tooltip>
                            </q-btn>

                            <!-- Add alarm to item button -->
                            <!-- icon="edit_notifications" -->
                            <q-btn
                                :color="
                                    hasAlert(props.row.product)
                                        ? 'primary'
                                        : 'grey'
                                "
                                round
                                flat
                                dense
                                size="sm"
                                :icon="
                                    hasAlert(props.row.product)
                                        ? 'mdi-bell-cog'
                                        : 'mdi-bell-plus'
                                "
                                @click="
                                    onAddAlert(
                                        props.row.product,
                                        props.row.productName,
                                        'netAssetValueRebatePremium',
                                        getFieldLabel(props.row._sourceType, 'netAssetValueRebatePremium'),
                                        getFieldValue(props.row, 'netAssetValueRebatePremium') || 0,
                                    )
                                "
                            >
                                <q-tooltip
                                    transition-show="scale"
                                    transition-hide="scale"
                                >
                                    {{
                                        hasAlert(props.row.product)
                                            ? "Editera larm"
                                            : "Lägg till larm"
                                    }}
                                </q-tooltip>
                            </q-btn>
                            <q-space />

                            <!-- Expand more info button -->
                            <q-btn
                                size="sm"
                                color="primary"
                                flat
                                round
                                dense
                                @click="props.expand = !props.expand"
                                :icon="
                                    props.expand
                                        ? 'mdi-chevron-up'
                                        : 'mdi-chevron-down'
                                "
                            >
                                <q-tooltip
                                    transition-show="scale"
                                    transition-hide="scale"
                                    >{{
                                        props.expand
                                            ? "Hide"
                                            : "Show more time periods"
                                    }}</q-tooltip
                                >
                            </q-btn>
                        </q-card-actions>

                        <!-- Expandable historical info about Rebate/Premiums -->
                        <div class="q-pa-md" v-show="props.expand">
                            <CompanyDetails
                                :api="getCompanyApi(props.row.product).api.getRebatePremiums"
                                request="getRebatePremiums"
                                :company="props.row.product"
                                :force-refresh="detailsRefreshTrigger"
                                :key="props.row.product"
                            />
                        </div>
                    </q-card>
                </div>
            </template>
        </q-table>
    </div>
</template>

<script setup>
import { ibindex } from "../api/ibindexAPI.mjs";
import { fbindex } from "../api/fbindexAPI.js";
import CompanyDetails from "./CompanyDetails.vue";
import AlertDialog from "./ComponentAlertDialog.vue";
import TableToolbar from "./TableToolbar.vue";
import { ref, onMounted, computed } from "vue";
import { useQuasar } from "quasar";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settings-store.js";
import { useApiRequest } from "../composables/useApiRequest.js";
import { useTableState } from "../composables/useTableState.js";

const $q = useQuasar();
const settingsStore = useSettingsStore();
const {
    alerts,
    fbiWatchlist,
    ibiWatchlist,
    refreshInterval,
} = storeToRefs(settingsStore);

const { makeRequest } = useApiRequest();
const { createWatchlistFilter } = useTableState();

const title = computed(() => {
    const ibiCount = ibiWatchlist.value?.length || 0;
    const fbiCount = fbiWatchlist.value?.length || 0;
    const totalCount = ibiCount + fbiCount;
    return `Bevakningar: beräknad rabatt/premie (${totalCount} företag)`;
});

// Separate APIs for IBI and FBI
const ibiApi = ref("getCompanies");
const fbiApi = ref("getCompanies");
const ibiColumns = ibindex[ibiApi.value].columns;
const fbiColumns = fbindex[fbiApi.value].columns;

// Create unified columns that work for both FBI and IBI data
const unifiedColumns = [
    {
        name: "productName",
        label: "Företag",
        field: "productName",
        sortable: true,
        align: "left",
    },
    {
        name: "rebatePremium",
        label: "Rabatt/Premie %",
        field: (row) => getFieldValue(row, 'netAssetValueRebatePremium'),
        sortable: true,
        format: (val) => val != null ? `${val.toFixed(2)}%` : 'N/A',
        style: (val) => ({
            color: val != null && val < 0 ? 'red' : 'green'
        }),
    },
    {
        name: "price",
        label: "Pris",
        field: "price",
        sortable: true,
        format: (val) => val != null ? `${val.toFixed(2)}` : 'N/A',
    },
    {
        name: "priceChange",
        label: "Prisändring %",
        field: "priceChange", 
        sortable: true,
        format: (val) => val != null ? `${val.toFixed(2)}%` : 'N/A',
        style: (val) => ({
            color: val != null && val < 0 ? 'red' : 'green'
        }),
    },
];

// Combined rows from both watchlists
const rows = ref([]);
const loading = ref(false);
const refreshColor = ref("primary");
const filter = ref("");
const expandedCards = ref([]);

// Refresh trigger for child components
const detailsRefreshTrigger = ref(0);

// Create separate watchlist filters for IBI and FBI
const { filterWatchlistRows: filterIbiRows, updateWatchlistValues: updateIbiValues } = createWatchlistFilter({ 
    rows: ref([]), 
    watchlistStore: ibiWatchlist 
});

const { filterWatchlistRows: filterFbiRows, updateWatchlistValues: updateFbiValues } = createWatchlistFilter({ 
    rows: ref([]), 
    watchlistStore: fbiWatchlist 
});

// Get the appropriate API and columns based on company type
function getCompanyApi(companyProduct) {
    // Check if it's an FBI company (exists in FBI watchlist)
    if (fbiWatchlist.value?.some(item => item.product === companyProduct)) {
        return { api: fbindex, apiKey: fbiApi.value, type: 'fbi' };
    }
    // Default to IBI
    return { api: ibindex, apiKey: ibiApi.value, type: 'ibi' };
}

// Get appropriate columns for a company
function getCompanyColumns(companyProduct) {
    const { type } = getCompanyApi(companyProduct);
    return type === 'fbi' ? fbiColumns : ibiColumns;
}

// Get field value with fallback handling for different APIs
function getFieldValue(row, fieldName) {
    if (!row) return null;
    
    // Handle the different field names between FBI and IBI APIs
    if (fieldName === 'netAssetValueRebatePremium') {
        // FBI uses 'netAssetValueRebatePremium', IBI uses 'netAssetValueCalculatedRebatePremium'
        const value = row._sourceType === 'fbi' 
            ? row.netAssetValueRebatePremium 
            : row.netAssetValueCalculatedRebatePremium;
        
        // Return null if value is undefined, null, or NaN
        return (value != null && !isNaN(value)) ? value : null;
    }
    
    const value = row[fieldName];
    return (value != null && !isNaN(value)) ? value : null;
}

// Get field label based on company type
function getFieldLabel(sourceType, fieldName) {
    if (fieldName === 'netAssetValueRebatePremium') {
        const columns = sourceType === 'fbi' ? fbiColumns : ibiColumns;
        const field = sourceType === 'fbi' ? 'netAssetValueRebatePremium' : 'netAssetValueCalculatedRebatePremium';
        const column = columns.find(col => col.field === field);
        return column?.label || 'Rabatt/Premium';
    }
    return fieldName;
}

// Refresh data
async function refreshData() {
    loading.value = true;
    refreshColor.value = "primary";
    
    try {
        const allRows = [];
        
        // Fetch IBI companies data if there are any in the watchlist
        if (ibiWatchlist.value && ibiWatchlist.value.length > 0) {
            console.log("🔄 Fetching IBI companies data for dashboard");
            const ibiData = await makeRequest({
                requestOptionsGetter: ibindex[ibiApi.value].requestOptions,
                apiName: ibiApi.value
            });
            
            // Filter IBI companies to only include those in the watchlist
            const filteredIbiRows = filterIbiRows(ibiData);
            updateIbiValues(filteredIbiRows);
            
            // Add source type to distinguish between FBI and IBI
            const ibiRowsWithSource = filteredIbiRows.map(row => ({
                ...row,
                _sourceType: 'ibi'
            }));
            
            allRows.push(...ibiRowsWithSource);
            console.log(`✅ Loaded ${filteredIbiRows.length} IBI companies for dashboard`);
        }
        
        // Fetch FBI companies data if there are any in the watchlist  
        if (fbiWatchlist.value && fbiWatchlist.value.length > 0) {
            console.log("🔄 Fetching FBI companies data for dashboard");
            const fbiData = await makeRequest({
                requestOptionsGetter: fbindex[fbiApi.value].requestOptions,
                apiName: fbiApi.value
            });
            
            // Filter FBI companies to only include those in the watchlist
            const filteredFbiRows = filterFbiRows(fbiData);
            updateFbiValues(filteredFbiRows);
            
            // Add source type to distinguish between FBI and IBI
            const fbiRowsWithSource = filteredFbiRows.map(row => ({
                ...row,
                _sourceType: 'fbi'
            }));
            
            allRows.push(...fbiRowsWithSource);
            console.log(`✅ Loaded ${filteredFbiRows.length} FBI companies for dashboard`);
        }
        
        rows.value = allRows;
        
        if (allRows.length > 0) {
            // Store refresh timestamps for both FBI and IBI data
            localStorage.setItem('lastRefresh_fbi', Date.now().toString());
            localStorage.setItem('lastRefresh_ibi', Date.now().toString());
            console.log(`📅 Stored dashboard refresh timestamps: ${new Date().toLocaleTimeString()}`);
            
            // Trigger refresh for child components (for already mounted ones)
            detailsRefreshTrigger.value = Date.now();
            console.log(`🔄 Triggered dashboard child component refresh: ${detailsRefreshTrigger.value}`);
            
            $q.notify({
                type: "positive",
                message: "Uppdateringen gick bra",
            });
        } else {
            $q.notify({
                type: "info",
                message: "Inga företag i bevakningslistan",
            });
        }
    } catch (error) {
        console.error("❌ Dashboard refresh error:", error);
        // Show the latest values from watchlists in case of network error
        const fallbackRows = [
            ...(ibiWatchlist.value || []).map(row => ({ ...row, _sourceType: 'ibi' })),
            ...(fbiWatchlist.value || []).map(row => ({ ...row, _sourceType: 'fbi' }))
        ];
        rows.value = fallbackRows;
        refreshColor.value = "negative";
        $q.notify({
            type: "negative",
            message: "Något gick fel under uppdatering",
        });
    } finally {
        loading.value = false;
    }
}

// Updates the appropriate watchlist in Pinia state store. The state is also stored in localStorage.
function removeWatchlistItem(removedItem) {
    // Find the item in the current rows to determine its source type
    const itemToRemove = rows.value.find(item => item.product === removedItem);
    
    if (itemToRemove) {
        const sourceType = itemToRemove._sourceType;
        
        // Remove from the appropriate watchlist
        if (sourceType === 'fbi') {
            fbiWatchlist.value = fbiWatchlist.value.filter(
                (item) => item.product !== removedItem,
            );
            console.log(`🧹 Removed ${removedItem} from FBI watchlist`);
        } else {
            ibiWatchlist.value = ibiWatchlist.value.filter(
                (item) => item.product !== removedItem,
            );
            console.log(`🧹 Removed ${removedItem} from IBI watchlist`);
        }
    }
    
    // Remove from displayed rows
    rows.value = rows.value.filter(
        (item) => item.product !== removedItem,
    );
}

// Checks if an alert has been registered for a company
function hasAlert(companyCode) {
    return alerts.value.some(
        (item) => item.companyCode === companyCode,
    );
}

function onAddAlert(
    product,
    productName,
    field,
    fieldLabel,
    fieldValue,
) {
    $q.dialog({
        component: AlertDialog,

        // props forwarded to your custom component
        componentProps: {
            companyCode: product,
            companyName: productName,
            field: field,
            fieldLabel: fieldLabel,
            fieldValue: fieldValue,

            title: "Alarm: " + productName,
            cancel: true,
            persistent: true,
        },
    })
        .onOk((data) => {
            // console.log('>>>> OK, received', data)
        })
        .onCancel(() => {
            // console.log('>>>> Cancel')
        })
        .onDismiss(() => {
            // console.log('I am triggered on both OK and Cancel')
            // todo: There has to be a better way to force refresh of add alert icon color
            refreshData();
        });
}

onMounted(() => {
    refreshData();

    setInterval(() => {
        refreshData();
    }, refreshInterval.value);
});
</script>
