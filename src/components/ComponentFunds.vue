<template>
    <div class="q-pa-sm">
        <q-table dense color="primary" class="my-sticky-header-table" row-key="Fond_namn"
            :title="title" :rows="rows" :columns="columns" :visible-columns="visibleColumns" 
            :filter="filter" :rows-per-page-options="[0]" :binary-state-sort="true"
            :loading="loading"
        >
            <!-- Configure top-right part of the data table component -->
            <template v-slot:top-right>
                <!-- Search input -->
                <q-input dense debounce="300" v-model="filter" placeholder="Sök i listan" style="width: 500px" >
                    <template v-slot:append>
                        <q-icon name="mdi-filter-variant" />
                    </template>
                </q-input>

                <!-- Refresh data -->
                <q-btn dense flat round icon="mdi-refresh" :color="refreshColor" @click="loadDataFromWeb()">
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
                        <q-select multiple dense options-dense borderless dropdown-icon="mdi-dots-vertical"
                            style="size: 300px" v-model="visibleColumns" display-value emit-value
                            map-options :options="columns" option-value="name">
                            <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                                <q-item v-bind="itemProps" dense>
                                    <q-item-section>
                                        <q-item-label v-html="opt.label" />
                                    </q-item-section>

                                    <q-item-section side>
                                        <q-toggle size="xs" :model-value="selected" @update:model-value="toggleOption(opt)"/>
                                    </q-item-section>
                                </q-item>
                            </template>
                            <q-tooltip transition-show="scale" transition-hide="scale">
                                {{ "Show/hide columns" }}
                            </q-tooltip>
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
                        <q-btn size="sm" color="primary" flat round dense :icon="props.expand ? 'mdi-chevron-up' : 'mdi-chevron-down'">
                            <q-tooltip transition-show="scale" transition-hide="scale">
                                {{ "Show holdings " }}
                            </q-tooltip>
                        </q-btn>
                    </q-td>
                </q-tr>

                <!--  Expanded row. Displays information about the fund's holdings.  -->
                <q-tr v-if="props.expand" :props="props" no-hover>
                    <q-td :colspan="props.cols.length + 1">
                        <ComponentFundHoldings :fund-name="props.row['Fond_namn']" :key="props.row['Fond_namn']" />
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
import JSZip from 'jszip';
import X2JS from 'x2js'//'../libs/xml2json.js'
import localforage from 'localforage'
import ComponentFundHoldings from './ComponentFundHoldings.vue';
import { ResponseType, fetch } from "@tauri-apps/api/http";

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

        async function unzipAndImportToDB(zipFile) {
            console.time("unzipAndImportToDB()");

            let data = [];

            JSZip.loadAsync(zipFile).then(function (zip) {
                zip.forEach(function (relativePath, zipEntry) {
                    if (zipEntry.dir === false) {
                        zipEntry.async("string").then(function (xml) {
                            let x2js = new X2JS();
                            let json = x2js.xml2js(xml);

                            // let fundManagerInformation = json['VärdepappersfondInnehav'].Bolagsinformation;
                            // {Fondbolag_namn: "FCG Fonder AB", Fondbolag_institutnummer: "59005", Fondbolag_LEI-kod: "254900CCW358UPZNRP67"}
                            // let fundManagerName = fundManagerInformation.Fondbolag_namn;

                            // Handle to the fund's top level information
                            let fundInformation = json['VärdepappersfondInnehav'].Fondinformation[0];
                            let fundName = fundInformation.Fond_namn;

                            if (fundInformation.Fond_status != "Ej aktiv fond") {

                                // Handle to the fund's holdings information
                                let fundHoldings = fundInformation.FinansiellaInstrument.FinansielltInstrument;

                                if (fundHoldings == undefined || fundHoldings == null || fundHoldings == "") {
                                    console.warn(`No holdings for: ${fundName}. Skipping import.`);
                                } else  {
                                    data.push(fundInformation);

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
                        });
                    }
                });
            });

            console.timeEnd("unzipAndImportToDB()");
            return data;
        }

        async function fiScrapeZipUrl() {
            console.time("fiScrapeZipUrl()");
            let response = await fetch(fiFunds.url, fiFunds.options);
            if (!response.ok) {
                return Promise.reject(`Error - fetch() status code: ${response.status}`);
            }

            let text = response.data;
            let parser = new DOMParser();
            let doc = parser.parseFromString(text, "text/html");
            let table = doc.getElementsByTagName('table')[0];
            let aList = table.querySelectorAll(('tr td:first-child a'));

            // The first item in the list of links is the latest.
            // This could be easily confirmed by checking the 2nd and 3rd columns, year and quarter respectively, 
            //      or by spliting the filename with ' ' and comparing the dates in the 3rd position in the arrays, [2].
            let a = aList[0];
            let url = fiDownload.url + a.pathname + a.search;
            console.timeEnd("fiScrapeZipUrl()");
            return url;
        }
    
        async function fiFetchZipFile(url) {
            console.time("fiFetchZipFile()");
            let response = await fetch(url, {responseType: ResponseType.Binary});
            if (!response.ok) {
                return Promise.reject(`Error - fetch() status code: ${response.status}`);
            }
            console.timeEnd("fiFetchZipFile()");
            return response.data;
        }

        async function loadDataFromWeb() {
            console.time("loadDataFromWeb()");
            let url = await fundsStore.getItem(fiQuarterlyHoldingsUrl);
            if (url === null) {

                fiScrapeZipUrl()
                .then(zipUrl => fiFetchZipFile(zipUrl))
                .then(zipFile => unzipAndImportToDB(zipFile))
                .then(() => { fiCommonStore.setItem(fiQuarterlyHoldingsUrl, url); })
                .catch(error => { throw new Error(error); })
                .finally(() => console.timeEnd("loadDataFromWeb()"));
            }
        }

        async function loadDataFromDB() {
            console.time("loadDataFromDB()");
            let data = [];
            fundsStore.iterate((value, key, iterationNumber) => { data.push(value); })
            .then(() => { rows.value = data; })
            .catch(error => { throw new Error(error); })
            .finally(() => console.timeEnd("loadDataFromDB()"));
        }

        // Load funds holdings
        async function loadData() {
            loading.value = true;
            let numberOfFunds = await fundsStore.length();
            if (numberOfFunds === 0) {
                loadDataFromWeb()
                .then(() => {
                    console.log('Data loaded from web');
                    $q.notify({ type: 'positive', message: 'Uppdateringen gick bra' });
                })
                .catch(error => {
                    console.log(error);
                    $q.notify({ type: 'error', message: 'Något gick fel under uppdateringen' });
                })
                .finally(() => loading.value = false);
            } else {
                loadDataFromDB()
                .then(() => console.log('Data loaded from DB'))
                .catch(error => console.log(error))
                .finally(() => loading.value = false);
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

<style lang="sass" scoped>

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
        z-index: 2
        text-transform: uppercase
    thead tr:first-child th
        top: 0

    /* this is when the loading indicator appears */
    &.q-table--loading thead tr:last-child th
        /* height of all previous header rows */
        top: 48px


.q-table--dark 
    .q-table__top,
    .q-table__bottom,
    thead tr:first-child th
        /* bg color is important for th; just specify one */
        background-color: #1d1d1d

</style>