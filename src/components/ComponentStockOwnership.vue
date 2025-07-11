<template>
    <div class="q-pa-sm">
        <q-table
            dense
            wrap-cells
            color="primary"
            class="my-sticky-header-table"
            row-key="Fond_namn"
            :title="title"
            :rows="rows"
            :columns="columns"
            :visible-columns="visibleColumns"
            :filter="filter"
            binary-state-sort
            :loading="loading"
            v-model:pagination="pagination"
            :rows-per-page-options="[0]"
        >
            <!-- Configure top-right part of the data table component -->
            <template v-slot:top-right>
                <q-input
                    v-model="filter"
                    filled
                    dense
                    debounce="300"
                    placeholder="Sök..."
                >
                    <template v-slot:append>
                        <q-icon name="mdi-magnify" />
                    </template>
                </q-input>
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
                <q-tr :props="props">
                    <!-- Column values -->
                    <q-td
                        v-for="col in props.cols"
                        :key="col.name"
                        :props="props"
                        :style="col.style ? col.style(props.row) : ''"
                    >
                        {{ col.value }}
                        <q-tooltip
                            transition-show="scale"
                            transition-hide="scale"
                        >
                            {{ col.label + ": " + col.value }}
                        </q-tooltip>
                    </q-td>

                    <!-- Empty cell for alignment -->
                    <q-td auto-width>
                    </q-td>
                </q-tr>
            </template>

            <!-- No data message -->
            <template v-slot:no-data>
                <div class="full-width row flex-center text-accent q-gutter-sm">
                    <q-icon size="2em" name="mdi-information" />
                    <span>
                        Ingen information om fondägande tillgänglig för denna aktie.
                    </span>
                </div>
            </template>
        </q-table>
    </div>
</template>

<script>
import { stockOwnership, generateMockOwnership } from "../api/stocksAPI.js";
import { ref, onMounted, watch } from "vue";

export default {
    name: "ComponentStockOwnership",
    props: {
        stockSymbol: {
            type: String,
            required: true,
        },
        stockISIN: {
            type: String,
            required: false,
        },
    },
    setup(props) {
        const title = ref(`${stockOwnership.title} - ${props.stockSymbol}`);
        const columns = ref(stockOwnership.qTableConfig.columns);
        const visibleColumns = ref(stockOwnership.qTableConfig.visibleColumns);
        const rows = ref([]);
        const loading = ref(false);
        const filter = ref("");

        // Load ownership data for the stock
        async function loadOwnershipData() {
            console.log(`🔍 Loading ownership data for ${props.stockSymbol}`);
            loading.value = true;
            
            try {
                // In a real implementation, this would:
                // 1. Look up the stock's ISIN in fund holdings
                // 2. Calculate ownership percentages
                // 3. Return actual fund ownership data
                
                // For now, generate mock data
                const ownershipData = generateMockOwnership(props.stockSymbol, props.stockISIN);
                rows.value = ownershipData;
                
                console.log(`✅ Loaded ${ownershipData.length} ownership records for ${props.stockSymbol}`);
            } catch (error) {
                console.error(`❌ Error loading ownership data for ${props.stockSymbol}:`, error);
                rows.value = [];
            } finally {
                loading.value = false;
            }
        }

        onMounted(() => {
            loadOwnershipData();
        });

        // Reload data when stock symbol changes
        watch(
            () => props.stockSymbol,
            () => {
                if (props.stockSymbol) {
                    title.value = `${stockOwnership.title} - ${props.stockSymbol}`;
                    loadOwnershipData();
                }
            }
        );

        return {
            title,
            columns,
            visibleColumns,
            rows,
            loading,
            filter,
            pagination: ref({
                rowsPerPage: 0,
            }),
        };
    },
};
</script>

<style lang="sass" scoped>
.my-sticky-header-table
    /* height or max-height is important */
    max-height: 400px

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