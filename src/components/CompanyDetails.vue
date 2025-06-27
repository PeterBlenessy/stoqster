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
import { ref, toRef, onMounted, watch } from "vue";
import { useQuasar } from "quasar";
import localforage from "localforage";
import { useApiRequest } from "../composables/useApiRequest.js";

export default {
    name: "CompanyDetails",

    props: {
        api: { type: Object, required: true },
        request: { type: String, required: true },
        company: { type: String, required: true },
        forceRefresh: { type: Number, default: 0 }, // Timestamp to trigger refresh
    },

    setup(props) {
        const $q = useQuasar();
        const { makeRequest } = useApiRequest();

        const api = toRef(props, "api");
        const request = toRef(props, "request");
        const companyCode = toRef(props, "company");
        const forceRefresh = toRef(props, "forceRefresh");
        const title = api.value.title;
        const columns = api.value.columns;
        const visibleColumns = api.value.visibleColumns;
        const rows = ref([]);
        const loading = ref(false);

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

            try {
                // Use the composable for standardized API requests with encoding handling
                const data = await makeRequest({
                    requestOptionsGetter: (company) => api.value.requestOptions(company),
                    apiName: request.value,
                    company: companyCode.value
                });
                
                rows.value = [...data];
                dataStore.setItem(companyCode.value, data);
                
                // Store refresh timestamp for this specific company detail in the nested object
                const detailsRefreshData = JSON.parse(localStorage.getItem('detailsRefreshTimes') || '{}');
                if (!detailsRefreshData[companyCode.value]) {
                    detailsRefreshData[companyCode.value] = {};
                }
                detailsRefreshData[companyCode.value][request.value] = Date.now();
                localStorage.setItem('detailsRefreshTimes', JSON.stringify(detailsRefreshData));
                console.log(`📅 Stored details refresh timestamp for ${companyCode.value}.${request.value}: ${new Date().toLocaleTimeString()}`);
                
            } catch (error) {
                console.error("CompanyDetails refresh error:", error);
                $q.notify({
                    type: "warning",
                    message: "Något gick fel under uppdateringen",
                    caption: title + " info saknas för " + companyCode.value,
                });
            } finally {
                loading.value = false;
                console.timeEnd(
                    `LoadDataFromWeb() \t ${request.value} \t\t ${companyCode.value}`,
                );
            }
        }

        async function loadData() {
            console.time(
                `LoadData() \t ${request.value} \t\t ${companyCode.value}`,
            );
            loading.value = true;
            
            try {
                const cachedData = await dataStore.getItem(companyCode.value);
                
                if (cachedData && cachedData.length > 0) {
                    console.log(`💾 Loaded ${cachedData.length} items from cache for ${request.value} - ${companyCode.value}`);
                    rows.value = [...cachedData];
                    // Make sure we have a unique index for each row
                    rows.value.forEach((row, index) => {
                        row.index = index;
                    });
                } else {
                    console.log(`📦 No cached data found for ${request.value} - ${companyCode.value}, fetching from web`);
                    await refreshData();
                }
            } catch (error) {
                console.error(`❌ Error loading data for ${request.value}:`, error);
                await refreshData(); // Fallback to web fetch
            } finally {
                loading.value = false;
                console.timeEnd(
                    `LoadData() \t ${request.value} \t\t ${companyCode.value}`,
                );
            }
        }

        // Watch for force refresh trigger
        watch(forceRefresh, (newValue, oldValue) => {
            if (newValue > oldValue && newValue > 0) {
                console.log(`🔄 Force refresh triggered for ${request.value} - ${companyCode.value}`);
                // Clear cache and refresh data
                dataStore.removeItem(companyCode.value).then(() => {
                    refreshData();
                });
            }
        });

        onMounted(() => {
            // Check if parent data was refreshed more recently than our cached data
            checkAndRefreshIfNeeded();
        });

        async function checkAndRefreshIfNeeded() {
            try {
                // Get the last refresh times from localStorage
                const parentRefreshTime = localStorage.getItem(`lastRefresh_${api.value.localForageConfig.storeName.split('-')[0]}`);
                // Get details refresh object from localStorage
                const detailsRefreshData = JSON.parse(localStorage.getItem('detailsRefreshTimes') || '{}');
                const companyRefreshData = detailsRefreshData[companyCode.value] || {};
                const detailsRefreshTime = companyRefreshData[request.value];
                
                const parentTime = parentRefreshTime ? parseInt(parentRefreshTime) : 0;
                const detailsTime = detailsRefreshTime || 0;
                
                console.log(`📅 Checking refresh times for ${request.value} - ${companyCode.value}:`);
                console.log(`📅 Parent refresh: ${parentTime ? new Date(parentTime).toLocaleTimeString() : 'never'}`);
                console.log(`� Details refresh: ${detailsTime ? new Date(detailsTime).toLocaleTimeString() : 'never'}`);
                
                // If parent data was refreshed more recently than our details, force refresh
                if (parentTime > detailsTime) {
                    console.log(`🔄 Parent data is newer, forcing refresh for ${request.value} - ${companyCode.value}`);
                    await dataStore.removeItem(companyCode.value);
                    await refreshData();
                    
                    // Update details refresh timestamp in the nested object
                    const updatedDetailsRefresh = { ...detailsRefreshData };
                    if (!updatedDetailsRefresh[companyCode.value]) {
                        updatedDetailsRefresh[companyCode.value] = {};
                    }
                    updatedDetailsRefresh[companyCode.value][request.value] = Date.now();
                    localStorage.setItem('detailsRefreshTimes', JSON.stringify(updatedDetailsRefresh));
                    console.log(`📅 Updated details refresh timestamp for ${companyCode.value}.${request.value}`);
                } else {
                    console.log(`💾 Details data is current, loading from cache for ${request.value} - ${companyCode.value}`);
                    await loadData();
                }
            } catch (error) {
                console.error(`❌ Error checking refresh times for ${request.value}:`, error);
                // Fallback to normal load
                await loadData();
            }
        }

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
