<template>
    <div class="q-pa-sm">
        <q-table
            :title="title"
            dense
            :rows="rows"
            :columns="columns"
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
                        <q-card-section class="text-center text-subtitle2">{{
                            props.row.productName
                        }}</q-card-section>
                        <q-separator inset />
                        <q-card-section>
                            <div class="text-center text-overline">
                                {{
                                    props.colsMap
                                        .netAssetValueCalculatedRebatePremium
                                        .label
                                }}
                            </div>
                            <div
                                class="flex flex-center text-h6"
                                :style="{
                                    color:
                                        props.row
                                            .netAssetValueCalculatedRebatePremium <
                                        0
                                            ? 'red'
                                            : 'green',
                                }"
                            >
                                {{
                                    props.row.netAssetValueCalculatedRebatePremium.toFixed(
                                        2,
                                    )
                                }}%
                                <q-icon
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
                                        props.colsMap
                                            .netAssetValueCalculatedRebatePremium
                                            .field,
                                        props.colsMap
                                            .netAssetValueCalculatedRebatePremium
                                            .label,
                                        props.row
                                            .netAssetValueCalculatedRebatePremium,
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
                                :api="ibindex.getRebatePremiums"
                                request="getRebatePremiums"
                                :company="props.row.product"
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
import { ibindex, ibiRequestOptions } from "../api/ibindexAPI.mjs";
import CompanyDetails from "./CompanyDetails.vue";
import AlertDialog from "./ComponentAlertDialog.vue";
import TableToolbar from "./TableToolbar.vue";
import { ref, onMounted } from "vue";
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
    watchlist,
    refreshInterval,
} = storeToRefs(settingsStore);

const { makeRequest } = useApiRequest();
const { createWatchlistFilter } = useTableState();

const api = ref("getCompanies");
const title = "Bevakningar: beräknad rabatt/premie"; //ibindex[ibiAPI].title;
const visibleColumns = ibindex[api.value].visibleColumns;
const columns = ibindex[api.value].columns;
const rows = ref([]);
const loading = ref(false);
const refreshColor = ref("primary");
const filter = ref("");
const expandedCards = ref([]);

const { filterWatchlistRows, updateWatchlistValues } = createWatchlistFilter({ 
    rows, 
    watchlistStore: watchlist 
});

// Refresh data
async function refreshData() {
    loading.value = true;
    refreshColor.value = "primary";

    try {
        const data = await makeRequest({
            requestOptionsGetter: ibindex[api.value].requestOptions,
            apiName: api.value
        });
        
        rows.value = [...data];
        
        // Filter out rows that are not in the watchlist
        if (watchlist.value !== null) {
            rows.value = filterWatchlistRows(rows.value);
            updateWatchlistValues(rows.value);
            
            $q.notify({
                type: "positive",
                message: "Uppdateringen gick bra",
            });
        }
    } catch (error) {
        console.error("Dashboard refresh error:", error);
        rows.value = watchlist.value || []; // Show the latest values in case we have a network error
        refreshColor.value = "negative";
        $q.notify({
            type: "negative",
            message: "Något gick fel under uppdatering",
        });
    } finally {
        loading.value = false;
    }
}

// Updates the watchlist in Pinia state store. The state is also stored in localStorage.
function removeWatchlistItem(removedItem) {
    rows.value = rows.value.filter(
        (item) => item.product !== removedItem,
    );
    watchlist.value = rows.value;
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
../api/ibindexAPI.jsm
