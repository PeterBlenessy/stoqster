<template>
    <q-table dense flat color="primary"
        :title="title"
        :columns="columns"
        :rows="rows"
        :visible-columns="visibleColumns"
        row-key="Instrumentnamn"
        :rows-per-page-options="[0]"
        :binary-state-sort="true"
        :loading="loading"
    >
    </q-table>
</template>

<script>
import { ref, toRef, onMounted } from 'vue';
import { fundHoldings } from '../api/fiAPI.js';
import localforage from 'localforage'

export default {
    // name: 'ComponentName',
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

        const loadData = async () => {
            loading.value = true;
            fundHoldingsStore.getItem(fundName.value).then( (holdings) => {
                rows.value = holdings;
            })
            .catch( (error) => {
                console.log(error);
            })
            .finally( () => loading.value = false);

        }

        onMounted(loadData());

        return {
            title,
            rows,
            columns,
            visibleColumns,
            loading
        }
    }
}
</script>
