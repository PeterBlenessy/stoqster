<template>
    <div class="q-pa-sm">
        <q-table
            dense
            color="primary"
            :title="title"
            :rows="rows"
            :columns="columns"
            :visible-columns="visibleColumns"
            :filter="filter"
            :rows-per-page-options="[0]"
            :binary-state-sort="true"
            row-key="Fond_namn"
            virtual-scroll
            :loading="loading"
            class="my-sticky-header-table"
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
                        <q-icon name="filter_list" />
                    </template>
                </q-input>

                <!-- Refresh data -->
                <q-btn
                    dense
                    flat
                    round
                    icon="refresh"
                    :color="refreshColor"
                    @click="loadDataFromWeb()"
                >
                    <q-tooltip transition-show="scale" transition-hide="scale">{{ "Refresh data" }}</q-tooltip>
                </q-btn>
            </template>

            <!-- Table header row -->
            <template v-slot:header="props">
                <q-tr :props="props">
                    <q-th v-for="col in props.cols" :key="col.name" :props="props">
                        {{ col.label }}
                    </q-th>

                    <!-- Column selection  -->
                    <q-th auto-width>
                        <q-select
                            multiple
                            dense
                            options-dense
                            borderless
                            dropdown-icon="more_vert"
                            style="size: 300px"
                            v-model="visibleColumns"
                            display-value
                            emit-value
                            map-options
                            :options="columns"
                            option-value="name"
                        >
                            <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                                <q-item v-bind="itemProps" dense>
                                    <q-item-section>
                                        <q-item-label v-html="opt.label" />
                                    </q-item-section>

                                    <q-item-section side>
                                        <q-toggle
                                            size="xs"
                                            :model-value="selected"
                                            @update:model-value="toggleOption(opt)"
                                        />
                                    </q-item-section>
                                </q-item>
                            </template>
                            <q-tooltip
                                transition-show="scale"
                                transition-hide="scale"
                            >{{ "Show/hide columns" }}</q-tooltip>
                        </q-select>
                    </q-th>
                </q-tr>
            </template>

            <template v-slot:body="props">
                <q-tr :props="props" @click="props.expand = !props.expand">
                    <!-- Column values -->
                    <q-td v-for="col in props.cols" :key="col.name" :props="props">{{ col.value }}</q-td>

                    <!-- Action buttons -->
                    <q-td auto-width>
                        <!-- Expand more details -->
                        <q-btn
                            size="sm"
                            color="primary"
                            flat
                            round
                            dense
                            :icon="props.expand ? 'expand_less' : 'expand_more'"
                        >
                            <q-tooltip
                                transition-show="scale"
                                transition-hide="scale"
                            >{{ "Show holdings " }}</q-tooltip>
                        </q-btn>
                    </q-td>
                </q-tr>

                <!--  Expanded row. Displays additional insights about the company.  -->
                <q-tr v-show="props.expand" :props="props" no-hover>
                    <q-td :colspan="props.cols.length + 1">
                        <ComponentFundHoldings
                            :fund-name="props.row['Fond_namn']"
                            :key="props.row['Fond_namn']"
                        />

                        <!--                    <pre>{{ JSON.stringify(props.row.FinansiellaInstrument.FinansielltInstrument[0], null, 4) }}</pre> -->
                    </q-td>
                </q-tr>
            </template>
        </q-table>
    </div>
</template>

<script>
import { fiFunds, fiDownload, funds, fundHoldings } from '../api/fiAPI.js';
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { unzip } from 'unzipit'
import X2JS from 'x2js'//'../libs/xml2json.js'
import localforage from 'localforage'
import ComponentFundHoldings from 'components/ComponentFundHoldings.vue';

export default {
    name: 'ComponentFunds',
    components: {
        ComponentFundHoldings
    },
    setup() {
        // IndexedDB stores used by this component
        const fiCommonStore = localforage.createInstance({ name: 'stoqster', storeName: 'fi-common' });
        const fundsStore = localforage.createInstance({ name: 'stoqster', storeName: funds.localForageConfig.storeName });
        const fundHoldingsStore = localforage.createInstance({ name: 'stoqster', storeName: fundHoldings.localForageConfig.storeName });
        const fiQuarterlyHoldingsUrl = 'fi-quarterly-holdings-url';

        const $q = useQuasar();

        const title = ref(funds.title);
        const columns = ref(funds.qTableConfig.columns);
        const visibleColumns = ref(funds.qTableConfig.visibleColumns);
        const rows = ref([]);

        const loading = ref(false);
        const refreshColor = ref('primary');

        async function fetchZipAndImportToDB(url) {
            console.time("fetchZipAndImportToDB()");
            const { entries } = await unzip(url);
            let data = [];

            // Running asyncronously gives a better user experience. Loading a usable first page takes ~2.5s. Syncronously is > 10s.
            await Promise.all(Object.values(entries).map(async (entry) => {
                if (entry != '' && !entry.isDirectory) {

                    let xml = await entry.text();
                    let x2js = new X2JS();
                    let json = x2js.xml2js(xml);

                    // let fundManagerInformation = json['VärdepappersfondInnehav'].Bolagsinformation;
                    // let fundManagerName = fundManagerInformation.Fondbolag_namn;

                    // Handle to the fund's top level information
                    let fundInformation = json['VärdepappersfondInnehav'].Fondinformation[0];
                    let fundName = fundInformation.Fond_namn;

                    if (fundInformation.Fond_status != "Ej aktiv fond") {
                        data.push(fundInformation);

                        // Handle to the fund's holdings information
                        let fundHoldings = fundInformation.FinansiellaInstrument.FinansielltInstrument;

                        // Removing array/object of holdings from fund object avoids storing funds holdings twice.
                        // Reduces storage need in dB from ~70 -> 38 MB.
                        delete fundInformation.FinansiellaInstrument;

                        // Store top level fund information in dB
                        fundsStore.setItem(fundName, fundInformation);

                        // Store fund holdings details in dB
                        if (Array.isArray(fundHoldings)) {
                            fundHoldingsStore.setItem(fundName, fundHoldings);
                        } else {
                            fundHoldingsStore.setItem(fundName, [fundHoldings]);
                        }
                    }
                }
            }));
            fiCommonStore.setItem(fiQuarterlyHoldingsUrl, url);
            console.timeEnd("fetchZipAndImportToDB()");
            return data;
        }

        async function loadDataFromWeb() {
            console.time("loadDataFromWeb()");
            loading.value = true;
            let url = await fundsStore.getItem(fiQuarterlyHoldingsUrl);
            if (url === null) {
                // Scrape FI web page to get url to the zip file
                let response = await fetch(fiFunds.url, fiFunds.options);
                if (!response.ok) {
                    return Promise.reject(`Error - fetch() status code: ${response.status}`);
                }
                let text = await response.text();
                let parser = new DOMParser();
                let doc = parser.parseFromString(text, "text/html");
                let table = doc.getElementsByTagName('table')[0];
                let aList = table.querySelectorAll(('tr td:first-child a'));

                // The first item in the list of links is the latest.
                // This could be easily confirmed by checking the 2nd and 3rd columns, year and quarter respectively, 
                //      or by spliting the filename with ' ' and comparing the dates in the 3rd position in the arrays, [2].
                let a = aList[0];
                url = fiDownload.url + a.pathname + a.search;

                // Now fetch, unpack and import the zip file
                rows.value = await fetchZipAndImportToDB(url);
                loading.value = false
                $q.notify({ type: 'positive', message: 'Successful refresh' });
                console.timeEnd("loadDataFromWeb()");
            }
        }

        async function loadDataFromDB() {
            console.time("loadDataFromDB()");
            loading.value = true;
            let data = [];
            fundsStore.iterate((value, key, iterationNumber) => {
                data.push(value);
            })
                .then(() => rows.value = data)
                .catch(error => console.log(error))
                .finally(console.timeEnd("loadDataFromDB()"));
        }

        // Load funds holdings
        async function loadData() {
            loading.value = true;
            let numberOfFunds = await fundsStore.length();
            if (numberOfFunds === 0) {
                loadDataFromWeb()
                    .then(() => loading.value = false)
                    .catch(error => console.log(error))
            } else {
                loadDataFromDB().then(() => loading.value = false);
            }
        }

        onMounted(() => {
            loadData();
        });

        return {
            loadDataFromWeb,
            loading,
            refreshColor,
            filter: ref(''),
            title,
            columns,
            visibleColumns,
            rows
        }
    }
}
</script>

<style>
.q-table tbody td:after {
    background: rgba(255, 255, 255, 0);
}
.q-table--dark tbody td:after {
    background: rgba(0, 0, 0, 0);
}

.q-table tbody td:before {
    background: rgba(0, 0, 0, 0.04);
}
.q-table--dark tbody td:before {
    background: rgba(255, 255, 255, 0.04);
}
</style>

<style lang="sass">

.my-sticky-header-table
    /* height or max-height is important */
    height: calc(100vh - 115px)

    .q-table__top,
    .q-table__bottom,
    thead tr:first-child th
        /* bg color is important for th; just specify one */
        background-color: #ffffff

    thead tr th
        position: sticky
        z-index: 1
        text-transform: uppercase
    thead tr:first-child th
        top: 0

    /* this is when the loading indicator appears */
    &.q-table--loading thead tr:last-child th
        /* height of all previous header rows */
        top: 48px
</style>