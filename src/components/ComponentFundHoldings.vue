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
import { ref, toRef, computed } from "vue";
import { fundHoldings } from "../api/fiAPI.js";

export default {
    name: "ComponentFundHoldings",
    props: {
        fundName: { type: String, required: true },
        fundISIN: { type: String, required: false }, // Preferred for exact matching
        holdings: { type: Array, default: () => [] }, // Holdings data passed from parent
    },
    setup(props) {
        const title = fundHoldings.title;
        const columns = fundHoldings.qTableConfig.columns;
        const visibleColumns = ref(fundHoldings.qTableConfig.visibleColumns);

        const fundName = toRef(props, "fundName");
        const fundISIN = toRef(props, "fundISIN");
        const holdingsData = toRef(props, "holdings");
        const loading = ref(false);

        // Filter holdings for this specific fund
        const rows = computed(() => {
            if (!holdingsData.value || holdingsData.value.length === 0) {
                return [];
            }

            // Add unique index for table row key
            return holdingsData.value.map((holding, index) => ({
                ...holding,
                index: index
            }));
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
