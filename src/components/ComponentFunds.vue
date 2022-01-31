<template>
    <div class="q-pa-sm">
        <q-table dense color="primary"
            :title="title"
            :rows="rows"
            :columns="columns"
            :visible-columns="visibleColumns"
            :filter="filter"
            :pagination="initialPagination"
            :binary-state-sort="true"

            row-key="Fond_namn"
            :rows-per-page-options="[0]"
            :loading="loading"
        >

        <!-- Configure top-right part of the data table component -->
        <template v-slot:top-right>

            <!-- Search input -->
            <q-input dense debounce="300" v-model="filter" placeholder="Filter list" style="width: 250px">
                <template v-slot:append>
                    <q-icon name="filter_list" />
                </template>
            </q-input>
        
            <!-- Refresh data -->
            <q-btn dense flat round icon="refresh" :color="refreshColor" @click="refreshData()">
                <q-tooltip transition-show="scale" transition-hide="scale">
                    {{ "Refresh data" }}
                </q-tooltip>
            </q-btn>

        </template>

        <!-- Table header row -->
        <template v-slot:header="props">
            <q-tr :props="props">
                <q-th v-for="col in props.cols"  :key="col.name" :props="props">
                    {{ col.label }}
                </q-th>

                <!-- Column selection  -->
                <q-th auto-width>
                    <q-select multiple dense options-dense borderless dropdown-icon="more_vert" style="size: 300px"
                        v-model="visibleColumns"
                        display-value=""
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
                                    <q-toggle size="xs" :model-value="selected" @update:model-value="toggleOption(opt)" />
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
            <q-tr :props="props">
                <!-- Column values -->
                <q-td 
                    v-for="col in props.cols" 
                    :key="col.name" 
                    :props="props"
                >
                    {{ col.value }}
                </q-td>

                <!-- Action buttons -->
                <q-td auto-width>

                    <!-- Expand more details -->
                    <q-btn size="sm" color="primary" flat round dense @click="props.expand = !props.expand" icon="expand_more">
                        <q-tooltip transition-show="scale" transition-hide="scale">
                            {{ "Show holdings " }}
                        </q-tooltip>
                    </q-btn>

                </q-td>
            </q-tr>

            <!--  Expanded row. Displays additional insights about the company.  -->
            <q-tr v-show="props.expand" :props="props" no-hover>
                <q-td :colspan="props.cols.length+1">
                    <ComponentFundHoldings :fund-name="props.row['Fond_namn']" />

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
        const fundsStore = localforage.createInstance({ name: 'stoqster', storeName: funds.localForageConfig.storeName });
        const fundHoldingsStore = localforage.createInstance({ name: 'stoqster', storeName: fundHoldings.localForageConfig.storeName });

        const title = funds.title;
        const columns = funds.qTableConfig.columns;
        const visibleColumns = ref(funds.qTableConfig.visibleColumns);
        const rows = ref([]);

        const loading = ref(false);
        const refreshColor = ref('primary');

        async function fetchZipAndImportToDB(url) {

            const { entries } = await unzip(url);

            // Running syncronously, i.e. waiting for all promisses to resolve takes ~10s - await Promisses.all()
            // Running asyncronously takes ~2.5s
            Object.values(entries).forEach( async(entry) => {
                if ( entry != '' && !entry.isDirectory) {

                    let xml = await entry.text();
                    let x2js = new X2JS();
                    let json = x2js.xml2js( xml );

                    // let fundManagerInformation = json['VärdepappersfondInnehav'].Bolagsinformation;
                    // let fundManagerName = fundManagerInformation.Fondbolag_namn;

                    // Handle fund top information
                    let fundInformation = json['VärdepappersfondInnehav'].Fondinformation[0];
                    let fundName = fundInformation.Fond_namn;

                    if (fundInformation.Fond_status != "Ej aktiv fond") {
                        rows.value.push( fundInformation );
                        fundsStore.setItem( fundName, fundInformation );

                        let fundHoldings = fundInformation.FinansiellaInstrument.FinansielltInstrument;
                        
                        if (Array.isArray(fundHoldings)) {
                            fundHoldingsStore.setItem( fundName, fundHoldings);
                        } else {
                            fundHoldingsStore.setItem( fundName, [fundHoldings]);
                        }
                    }
                }
            });
            fundsStore.setItem('fi-quarterly-holdings-url', url);
        }

        const refreshData = async () => {
            loading.value = true;
            rows.value = [];

            let fiQuarterlyHoldingsUrl = await fundsStore.getItem('fi-quarterly-holdings-url');
            if (fiQuarterlyHoldingsUrl === null) {
                // FI quarterly holdings is not found in the dB.
                // We should download it and store values in dB

                // Fetch the list of zip files that are published each quarter and contain fund information
                fetch(fiFunds.url, fiFunds.options).then( (response) => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.headers}`);
                    }
                    return response.text();
                })
                .then( (text) => {
                    let parser = new DOMParser();
                    let doc = parser.parseFromString(text, "text/html");
                    let table = doc.getElementsByTagName('table')[0];
                    let aList = table.querySelectorAll(('tr td:first-child a'));

                    // The first item in the list of links is the latest.
                    // This could be easily confirmed by checking the 2nd and 3rd columns, year and quarter respectively, 
                    //      or by spliting the filename with ' ' and comparing the dates in the 3rd position in the arrays, [2].
                    let a = aList[0];
                    let url = fiDownload.url + a.pathname + a.search;

                    console.time("fetchZipAndImportToDB()");
                    fetchZipAndImportToDB(url).then( (url) => {
                        loading.value = false;
                        console.timeEnd("fetchZipAndImportToDB()");
                    });
                })
                .catch( (error) => {
                    console.log('Request failed', error)
                    refreshColor.value = 'negative';
                });

            } else {
                //if (fiQuarterlyHoldingsUrl === url) {
                // Key for FI quarterly holdings exists in dB -> already downloaded and stored.
                fundsStore.iterate( (value, key, interationNumber) => {
                    if ( key != 'fi-quarterly-holdings-url') {
                        rows.value.push(value);
                    }
                })
                .then( () => loading.value = false)
                .catch( (error) => console.log(error));
            }
            // else {
                // Key for FI quarterly holdings exists, but is different than the one we need.
                // Stored key is probably older and we should confirm that by comparing the dates in the strings.
                // ...
            //}
        }

        onMounted(refreshData);

        return {
            refreshData,
            loading,
            refreshColor,
            filter: ref(''),
            title,
            columns,
            visibleColumns,
            rows,
            initialPagination: {
                sortBy: 'desc',
                descending: false,
                page: 1,
                rowsPerPage: 49
            }
        }
    }
}
</script>

