<template>
    <q-table
        dense
        flat
        color="primary"
        :title="title"
        :rows="rows"
        :columns="columns"
        :visible-columns="visibleColumns"
        :row-key="'product' in rows ? 'product' : 'label'"
        :rows-per-page-options="[0]"
        hide-bottom
        :loading="loading"
    >
        <template v-slot:top>
            <div class="col-12 text-overline text-center text-uppercase">
                {{ title }}
            </div>
        </template>
    </q-table>
</template>

<script>
import { ref, toRef, onMounted } from "vue";
import { useQuasar } from "quasar";
import localforage from "localforage";
import { fetch } from "@tauri-apps/plugin-http";

export default {
    name: "CompanyDetails",

    props: {
        api: { type: Object, required: true },
        request: { type: String, required: true },
        company: { type: String, required: true },
    },

    setup(props) {
        const $q = useQuasar();

        const api = toRef(props, "api");
        const request = toRef(props, "request");
        const companyCode = toRef(props, "company");
        const title = api.value.title;
        const columns = api.value.columns;
        const visibleColumns = api.value.visibleColumns;
        const rows = ref([]);
        const loading = ref(false);

        const requestOptions = api.value.requestOptions(companyCode.value);
        const dataStore = localforage.createInstance({
            name: "stoqster",
            storeName: api.value.localForageConfig.storeName,
        });

        // Fetch data using the provided api reference
        async function refreshData() {
            console.time(
                `LoadDataFromWeb() \t ${request.value} \t\t ${companyCode.value}`,
            );
            loading.value = true;

            fetch(requestOptions.url, requestOptions.options)
                .then((response) => {
                    if (!response.ok || response.status === 500) {
                        return Promise.reject(
                            `Error - fetch() status code: ${response.status}`,
                        );
                    }

                    return response.json();
                })
                .then((data) => {
                    rows.value = [...data];
                    dataStore.setItem(companyCode.value, data);
                })
                .catch((error) => {
                    $q.notify({
                        type: "warning",
                        message: "Något gick fel under uppdateringen",
                        caption:
                            title + " info saknas för " + companyCode.value,
                    });
                    console.log(error);
                })
                .finally(() => {
                    loading.value = false;
                    console.timeEnd(
                        `LoadDataFromWeb() \t ${request.value} \t\t ${companyCode.value}`,
                    );
                });
        }

        async function loadData() {
            console.time(
                `LoadData() \t ${request.value} \t\t ${companyCode.value}`,
            );
            loading.value = true;
            dataStore
                .getItem(companyCode.value)
                .then((data) => {
                    if (data === null) {
                        return refreshData();
                    }
                    rows.value = data;
                    // Make sure we have a unique index for each row
                    rows.value.forEach((row, index) => {
                        rows.value.index = index;
                    });
                })
                // .then(() => console.log(rows.value))
                .catch((error) => console.log(error))
                .finally(() => {
                    loading.value = false;
                    console.timeEnd(
                        `LoadData() \t ${request.value} \t\t ${companyCode.value}`,
                    );
                });
        }

        onMounted(() => loadData());

        return {
            title,
            columns,
            visibleColumns,
            rows,
            loading,
        };
    },
};
</script>
