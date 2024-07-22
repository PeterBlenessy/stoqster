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
        :rows-per-page-options="[0]"
        :binary-state-sort="true"
        class="my-sticky-header-table-expanded"
        wrap-cells
    >
    
        <!-- Configure top-right part of the data table component -->
        <template v-slot:top-right>
            <!-- Search input -->
            <q-input
                dense
                debounce="300"
                v-model="filter"
                placeholder="Filter list"
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
import { ref, toRef, onMounted } from 'vue';
import { fundHoldings } from '../api/fiAPI.js';
import localforage from 'localforage';

export default {
    name: 'ComponentFundHoldings',
    props: {
        fundName: { type: String, required: true }
    },
    setup(props) {
        const title = fundHoldings.title;
        const columns = fundHoldings.qTableConfig.columns;
        const visibleColumns = ref(fundHoldings.qTableConfig.visibleColumns);

        const fundName = toRef(props, 'fundName');
        const rows = toRef([]);
        const loading = ref(false);

        const fundHoldingsStore = localforage.createInstance({ name: 'stoqster', storeName: fundHoldings.localForageConfig.storeName });

        async function loadData() {
            console.time(`loadHoldingsFromDB(): ${fundName.value}`);
            loading.value = true;
            fundHoldingsStore.getItem(fundName.value).then(holdings => {
                if (holdings === undefined || holdings === null || holdings === '') {
                    console.error(`No holdings for: ${fundName.value}. Should have skipped import!`);
                } else {
                    rows.value = holdings;
                    // Make sure we have a unique index for each row in the table
                    rows.value.forEach((row, index) => {
                        rows.value.index = index;
                    });
                }
            })
            .catch(error => console.log(error))
            .finally(() => {
                loading.value = false;
                console.timeEnd(`loadHoldingsFromDB(): ${fundName.value}`);
            });
        }

        onMounted(() => {
            loadData();
        });

        return {
            title,
            rows,
            columns,
            visibleColumns,
            filter: ref(''),
            loading
        }
    }
}
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
