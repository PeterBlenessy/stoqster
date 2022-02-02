<template>
    <q-table
        dense
        flat
        color="primary"
        :title="title"
        :rows="rows"
        :columns="columns"
        :visible-columns="visibleColumns"
        row-key="product"
        :rows-per-page-options="[0]"
        :loading="loading"
        hide-bottom
    ></q-table>
</template>

<script>
import { ref, toRef, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { ibindex, ibiRequestOptions } from '../api/ibindexAPI.js';

export default {
    name: 'CIbindexCompanyEvents',

    props: {
        company: { type: String, required: true }
    },

    setup(props) {
        const $q = useQuasar();

        const companyCode = toRef(props, 'company');
        const api = ref('getEvents');
        const title = ibindex[api.value].title;
        const columns = ibindex[api.value].columns;
        const visibleColumns = ibindex[api.value].visibleColumns;
        const rows = ref([]);
        const loading = ref(false);

        const requestOptions = ibiRequestOptions(api.value, companyCode.value);

        // Fetch data from ibindex using the provided api reference
        async function refreshData() {
            loading.value = true;
            fetch(requestOptions.url, requestOptions.options).then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then((buffer) => {
                rows.value = JSON.parse(new TextDecoder('latin1').decode(buffer)) || [];
                // TODO: store in IndexDB
            })
            .catch((error) => {
                // TODO: rows.value = load data from dB
                $q.notify({
                    type: 'warning',
                    message: 'Something went wrong during refresh',
                    caption: title + " info not available for " + companyCode.value
                });

            })
            .finally(() => {
                loading.value = false;
            });
        }

        onMounted( () => {
            refreshData();
        });

        return {
            refreshData,
            title,
            columns,
            visibleColumns,
            rows,
            loading
        }
    }
}
</script>

<style >
.q-table tbody td:after {
    background: rgba(255, 255, 255, 0);
}
.q-table--dark tbody td:after {
    background: rgba(0, 0, 0, 0);
}

.q-table tbody td:before {
    background: rgba(0, 0, 0, 0.2);
}
.q-table--dark tbody td:before {
    background: rgba(255, 255, 255, 0.2);
}
</style>