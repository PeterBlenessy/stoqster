<template>
    <q-table
        dense
        flat
        color="primary"
        :title="title"
        :columns="columns"
        :rows="rows"
        :visible-columns="visibleColumns"
        :filter="filter"
        row-key="index"
        binary-state-sort
        class="my-sticky-header-table-expanded"
        wrap-cells
        virtual-scroll
        virtual-scroll-slice-size="100"
        virtual-scroll-slice-ratio-before="2"
        virtual-scroll-slice-ratio-after="2"
        virtual-scroll-sticky-size-start="49"
        virtual-scroll-item-size="33"
        virtual-scroll-sticky-size-end="33"
        :rows-per-page-options="[0]"
    >
        <!-- Configure top-right part of the data table component -->
        <template v-slot:top-right>
            <!-- Search input -->
            <q-input
                dense
                debounce="300"
                v-model="filter"
                label="Sök i listan"
                style="width: 500px"
            >
                <template v-slot:append>
                    <q-icon name="mdi-filter-variant" />
                </template>
            </q-input>
        </template>
    </q-table>
</template>

<script>
import { ref, toRef, onMounted, computed } from "vue";
import { fundHoldings } from "../api/fiAPI.js";
import { storeToRefs } from "pinia";
import { useFIStore } from "../stores/fi-store.js";

export default {
    name: "ComponentFundHoldings",
    props: {
        fundName: { type: String, required: true },
        fundISIN: { type: String, required: false }, // Preferred for exact matching
    },
    setup(props) {
        const title = fundHoldings.title;
        const columns = fundHoldings.qTableConfig.columns;
        const visibleColumns = ref(fundHoldings.qTableConfig.visibleColumns);

        const fundName = toRef(props, "fundName");
        const fundISIN = toRef(props, "fundISIN");
        const loading = ref(false);

        // Use FI store to get holdings data
        const fiStore = useFIStore();
        const { holdings, selectedQuarters } = storeToRefs(fiStore);

        // Filter holdings for this specific fund
        const rows = computed(() => {
            if (!holdings.value || holdings.value.length === 0) {
                return [];
            }

            // Filter holdings by fund name or ISIN (prefer ISIN for accuracy)
            const fundHoldings = holdings.value.filter(holding => {
                if (fundISIN.value && holding.fundISIN) {
                    return holding.fundISIN === fundISIN.value;
                }
                // Fallback to name matching if ISIN not available
                return holding.fundName === fundName.value || holding.Fond_namn === fundName.value;
            });

            // Add unique index for table row key
            return fundHoldings.map((holding, index) => ({
                ...holding,
                index: index
            }));
        });

        async function loadData() {
            console.time(`loadHoldingsFromStore(): ${fundName.value}`);
            loading.value = true;
            
            try {
                // Check if we have selected quarters with data
                if (selectedQuarters.value.length === 0) {
                    console.warn(`⚠️ No quarters selected for holdings display`);
                    return;
                }

                // Holdings are already loaded in the store for selected quarters
                // The computed property will automatically filter them
                console.log(`✅ Holdings available for ${fundName.value}: ${rows.value.length} items`);
                
            } catch (error) {
                console.error(`❌ Failed to load holdings for ${fundName.value}:`, error);
            } finally {
                loading.value = false;
                console.timeEnd(`loadHoldingsFromStore(): ${fundName.value}`);
            }
        }

        onMounted(() => {
            loadData();
        });

        return {
            title,
            rows,
            columns,
            visibleColumns,
            filter: ref(""),
            loading,
        };
    },
};
</script>

<style lang="sass">

.my-sticky-header-table-expanded
    /* height or max-height is important */
    height: calc(50vh)

    .q-table__top,
    .q-table__middle,
    .q-table__bottom,
    thead tr:first-child th
        /* bg color is important for th; just specify one */
        background-color: #f8f8f8

    thead tr th
        position: sticky
        top: 0
        z-index: 1
        text-transform: uppercase

    &.q-table--dark
        .q-table__top,
        .q-table__middle,
        .q-table__bottom,
        thead tr:first-child th
            /* bg color is important for th; just specify one */
            background-color: #2e2e2e
</style>
