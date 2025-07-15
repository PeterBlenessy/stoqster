<template>
    <div class="q-pa-sm">
        <q-table
            dense
            wrap-cells
            color="primary"
            class="my-sticky-header-table"
            row-key="Fond_namn"
            :title="title"
            :rows="rows"
            :columns="columns"
            :visible-columns="visibleColumns"
            :filter="filter"
            binary-state-sort
            virtual-scroll
            virtual-scroll-slice-size="100"
            virtual-scroll-slice-ratio-before="2"
            virtual-scroll-slice-ratio-after="2"
            virtual-scroll-sticky-size-start="28"
            virtual-scroll-item-size="28"
            virtual-scroll-sticky-size-end="33"
            v-model:pagination="pagination"
            :rows-per-page-options="[0]"
        >
            <!-- Configure top-right part of the data table component -->
            <template v-slot:top-right>
                <TableToolbar
                    v-model:filter="filter"
                    :loading="loading"
                    :refresh-color="refreshColor"
                    @refresh="loadDataFromWeb"
                    refresh-tooltip="Uppdatera kvartalsmetadata från Finansinspektionen"
                >
                    <template v-slot:actions>
                        <!-- Debug button (temporary) -->
                        <q-btn
                            dense
                            flat
                            icon="mdi-bug"
                            color="orange"
                            @click="debugData"
                            v-if="$q.dev"
                        >
                            <q-tooltip>Debug Data</q-tooltip>
                        </q-btn>
                        
                        <!-- Quarter selector -->
                        <q-select
                            v-model="selectedQuarterObjects"
                            :options="quarterOptions"
                            option-value="quarter"
                            option-label="label"
                            multiple
                            dense
                            outlined
                            label="Välj kvartal" 
                            style="min-width: 350px;"
                            popup-content-class="fixed-width-dropdown"
                            @update:model-value="onQuarterSelectionChange"
                        >
                            <template v-slot:prepend>
                                <q-icon name="mdi-calendar-range" />
                            </template>
                            <template v-slot:option="{ itemProps, opt }">
                                <q-item v-bind="itemProps" dense >
                                    <q-item-section>
                                        <div class="row justify-between items-center" style="width: 100%; max-width: 100%;">
                                            <div class="text-weight-medium" style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ opt.label }}</div>
                                            <div class="row items-center q-gutter-xs" style="flex-shrink: 0; width: auto;">
                                                <!-- Show status based on import operation state -->
                                                <div v-if="opt.importState === 'imported' || opt.hasData" class="text-caption text-grey-6">
                                                    {{ opt.recordCount }} fonder
                                                </div>
                                                <div v-else-if="opt.importState === 'downloading'" class="text-caption text-grey-6">
                                                    Laddar ner...
                                                </div>
                                                <div v-else-if="opt.importState === 'extracting'" class="text-caption text-grey-6">
                                                    Extraherar...
                                                </div>
                                                <div v-else-if="opt.importState === 'importing'" class="text-caption text-grey-6">
                                                    Importerar...
                                                </div>
                                                <div v-else-if="opt.importState === 'error'" class="text-caption text-red-6">
                                                    Fel uppstod
                                                </div>
                                                
                                                <!-- Action icons based on import operation state (not selection state) -->
                                                <q-btn
                                                    v-if="opt.importState === 'available' || opt.importState === 'error'"
                                                    size="sm"
                                                    flat
                                                    dense
                                                    round
                                                    icon="mdi-database-import"
                                                    color="primary"
                                                    @click.stop="importQuarter(opt.quarter)"
                                                >
                                                    <q-tooltip>Importera {{ opt.label }}</q-tooltip>
                                                </q-btn>
                                                
                                                <q-btn
                                                    v-else-if="opt.isImporting"
                                                    size="sm"
                                                    flat
                                                    dense
                                                    round
                                                    icon="mdi-database-sync"
                                                    color="orange"
                                                    :loading="true"
                                                >
                                                    <q-tooltip>Importerar {{ opt.label }}...</q-tooltip>
                                                </q-btn>
                                                
                                                <q-btn
                                                    v-else-if="opt.hasData"
                                                    size="sm"
                                                    flat
                                                    dense
                                                    round
                                                    icon="mdi-database-remove"
                                                    color="negative"
                                                    @click.stop="deleteQuarter(opt.quarter)"
                                                >
                                                    <q-tooltip>Ta bort {{ opt.label }}</q-tooltip>
                                                </q-btn>
                                            </div>
                                        </div>
                                    </q-item-section>
                                </q-item>
                            </template>
                            <template v-slot:selected-item="scope">
                                <q-chip
                                    removable
                                    dense
                                    @remove="scope.removeAtIndex(scope.index)"
                                    :tabindex="scope.tabindex"
                                    color="primary"
                                    text-color="white"
                                    size="sm"
                                >
                                    {{ scope.opt.label }}
                                </q-chip>
                            </template>
                        </q-select>
                    </template>
                </TableToolbar>
            </template>

            <!-- Table header row -->
            <template v-slot:header="props">
                <q-tr :props="props">
                    <q-th
                        v-for="col in props.cols"
                        :key="col.name"
                        :props="props"
                        style="vertical-align: bottom"
                    >
                        {{ col.label }}
                        <q-tooltip
                            transition-show="scale"
                            transition-hide="scale"
                        >
                            {{ col.label }}
                        </q-tooltip>
                    </q-th>

                    <!-- Column selection  -->
                    <q-th auto-width>
                        <q-select
                            multiple
                            dense
                            options-dense
                            borderless
                            dropdown-icon="mdi-dots-vertical"
                            style="size: 300px"
                            v-model="visibleColumns"
                            display-value
                            emit-value
                            map-options
                            :options="columns"
                            option-value="name"
                        >
                            <template
                                v-slot:option="{
                                    itemProps,
                                    opt,
                                    selected,
                                    toggleOption,
                                }"
                            >
                                <q-item v-bind="itemProps" dense>
                                    <q-item-section>
                                        <q-item-label v-html="opt.label" />
                                    </q-item-section>

                                    <q-item-section side>
                                        <q-toggle
                                            size="xs"
                                            :model-value="selected"
                                            @update:model-value="
                                                toggleOption(opt)
                                            "
                                        />
                                    </q-item-section>
                                </q-item>
                            </template>
                            <q-tooltip
                                transition-show="scale"
                                transition-hide="scale"
                            >
                                {{ "Välj kolumner" }}
                            </q-tooltip>
                        </q-select>
                    </q-th>
                </q-tr>
            </template>

            <template v-slot:body="props">
                <q-tr :props="props" @click="props.expand = !props.expand">
                    <!-- Column values -->
                    <q-td
                        v-for="col in props.cols"
                        :key="col.name"
                        :props="props"
                    >
                        {{ col.value }}
                        <q-tooltip
                            transition-show="scale"
                            transition-hide="scale"
                        >
                            {{ col.label + ": " + col.value }}
                        </q-tooltip>
                    </q-td>

                    <!-- Action buttons -->
                    <q-td auto-width>
                        <!-- Expand more details -->
                        <q-btn
                            size="sm"
                            color="primary"
                            flat
                            round
                            dense
                            :icon="
                                props.expand
                                    ? 'mdi-chevron-up'
                                    : 'mdi-chevron-down'
                            "
                        >
                            <q-tooltip
                                transition-show="scale"
                                transition-hide="scale"
                            >
                                {{ "Visa innehav" }}
                            </q-tooltip>
                        </q-btn>
                    </q-td>
                </q-tr>

                <!--  Expanded row. Displays information about the fund's holdings.  -->
                <q-tr v-if="props.expand" :props="props" no-hover>
                    <q-td :colspan="props.cols.length + 1">
                        <ComponentFundHoldings
                            :fund-name="props.row['Fond_namn']"
                            :key="props.row['Fond_namn']"
                        />
                    </q-td>
                </q-tr>
            </template>
        </q-table>
    </div>
</template>

<script>
import { fiFunds, fiDownload, funds, fundHoldings } from "../api/fiAPI.js";
import { ref, onMounted, watch, computed, nextTick } from "vue";
import { useQuasar } from "quasar";
import JSZip from "jszip";
import X2JS from "x2js"; //'../libs/xml2json.js'
import localforage from "localforage";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settings-store.js";
import { useFIStore } from "../stores/fi-store.js";
import ComponentFundHoldings from "./ComponentFundHoldings.vue";
import TableToolbar from "./TableToolbar.vue";
import { fetch } from "@tauri-apps/plugin-http";
import { extractFileNameFromUrl, parseZipFileName } from "../api/fiHistoricalUtils.js";

export default {
    name: "ComponentFunds",
    components: {
        ComponentFundHoldings,
        TableToolbar,
    },
    setup() {
        // FI Store for historical tracking
        const fiStore = useFIStore()
        const { funds: storeFunds, holdings: storeHoldings, selectedQuarters, availableQuarters, isMultiQuarterView, currentViewLabel } = storeToRefs(fiStore)
        
        // Settings store for UI preferences
        const settingsStore = useSettingsStore();
        const { fiVisibleColumns } = storeToRefs(settingsStore);

        // Legacy stores for backwards compatibility during transition
        const fundsStore = localforage.createInstance({
            name: "stoqster",
            storeName: funds.localForageConfig.storeName,
        });

        const $q = useQuasar();

        // Computed title that reflects current view
        const title = computed(() => {
            const baseTitle = funds.title;
            if (isMultiQuarterView.value) {
                return `${baseTitle} - ${currentViewLabel.value}`;
            } else if (selectedQuarters.value.length === 1) {
                return `${baseTitle} - ${currentViewLabel.value}`;
            }
            return baseTitle;
        });
        
        // Quarter selection logic
        const quarterOptions = computed(() => {
            console.log('🔍 [Component] Computing quarterOptions, availableQuarters.value.length:', availableQuarters.value.length)
            
            const options = availableQuarters.value.map(item => {
                console.log(`🔍 [Component] Mapping quarter ${item.quarter}: importState=${item.importState}, isImporting=${item.isImporting}, state=${item.state}`)
                
                return {
                    quarter: item.quarter,
                    label: item.label,
                    recordCount: item.recordCount,
                    sourceDate: item.sourceDate,
                    // VIEWING state - for quarter selection dropdown
                    isSelected: item.isSelected,
                    // DATA state - whether quarter has imported data
                    hasData: item.hasData,
                    // IMPORT OPERATION state - completely independent tracking
                    importState: item.importState, // 'available', 'downloading', 'extracting', 'importing', 'imported', 'error'
                    isImporting: item.isImporting, // convenience flag for active import operations
                    // UI display state (combines data + import for display purposes only)
                    state: item.state, // This is for display - doesn't affect selection or import logic
                    progress: item.progress,
                    error: item.error,
                    sourceUrl: item.url, // Map from store's url (which comes from sourceUrl)
                    url: item.url, // Keep for backward compatibility
                    fileName: item.fileName
                }
            })
            
            console.log('🔍 [Component] quarterOptions computed result:', options.map(o => `${o.quarter}: importState=${o.importState}, isImporting=${o.isImporting}`))
            return options
        })

        // Convert store's selectedQuarters (strings) to objects for the select component
        const selectedQuarterObjects = computed({
            get() {
                try {
                    // Convert quarter strings to objects for display
                    const result = selectedQuarters.value
                        .map(quarterString => {
                            const quarterOption = quarterOptions.value.find(opt => opt.quarter === quarterString)
                            if (!quarterOption) {
                                console.warn(`⚠️ Selected quarter ${quarterString} not found in quarterOptions`)
                                console.log('Available quarters:', quarterOptions.value.map(q => q.quarter))
                            }
                            return quarterOption
                        })
                        .filter(Boolean) // Remove any undefined values
                    
                    console.log('🔍 selectedQuarterObjects computed:', {
                        selectedQuarters: selectedQuarters.value,
                        resultCount: result.length,
                        resultQuarters: result.map(r => r.quarter)
                    })
                    
                    return result
                } catch (error) {
                    console.error('❌ Error in selectedQuarterObjects getter:', error)
                    return []
                }
            },
            set(newSelection) {
                // Convert objects to quarter strings and update
                if (!isUpdatingQuarters.value) {                    
                    // Use nextTick to avoid recursive updates
                    nextTick(() => {
                        onQuarterSelectionChange(newSelection)
                    })
                }
            }
        })

        // Guard to prevent recursive quarter selection updates
        const isUpdatingQuarters = ref(false)
        
        const onQuarterSelectionChange = async (newSelection) => {
            // Prevent recursive calls
            if (isUpdatingQuarters.value) {
                console.log('⚠️ Already updating quarters, skipping to prevent recursion')
                return
            }
            
            // IMPORTANT: Selection changes are COMPLETELY independent of import operations
            // A quarter can be selected for viewing regardless of its import state
            // A quarter can be importing while selected or not selected
            console.log('🔄 Quarter SELECTION changed (completely independent of import operations):', newSelection)
            
            try {
                isUpdatingQuarters.value = true
                
                // Extract quarter strings from the selection objects
                let quarterStrings = []
                if (newSelection && newSelection.length > 0) {
                    quarterStrings = newSelection.map(item => 
                        typeof item === 'object' ? item.quarter : item
                    ).filter(Boolean)
                }
                
                // Only auto-select if we have no selection AND no current store selection
                if (quarterStrings.length === 0 && selectedQuarters.value.length === 0) {
                    const availableQuarters = quarterOptions.value
                    if (availableQuarters.length > 0) {
                        // Auto-select the latest quarter if user clears selection
                        quarterStrings = [availableQuarters[0].quarter]
                        console.log('🎯 Auto-selecting latest quarter for VIEWING:', quarterStrings[0])
                    }
                }
                
                // Only update if there's actually a change in SELECTION
                const currentSelection = selectedQuarters.value.sort().join(',')
                const newSelectionString = quarterStrings.sort().join(',')
                
                if (currentSelection !== newSelectionString) {
                    console.log('🔄 Setting quarter strings for VIEWING (no effect on import states):', quarterStrings)
                    await fiStore.setSelectedQuarters(quarterStrings)
                    console.log('✅ Quarter SELECTION completed - import operations continue independently')
                } else {
                    console.log('⚠️ No change in quarter selection for viewing, skipping update')
                }
            } catch (error) {
                console.error('❌ Failed to change quarter selection for viewing:', error)
                $q.notify({
                    type: "negative",
                    message: "Kunde inte växla kvartal för visning",
                });
            } finally {
                // Use nextTick to ensure reactive updates complete before resetting flag
                await nextTick()
                isUpdatingQuarters.value = false
            }
        }

        const baseColumns = funds.qTableConfig.columns
        const baseVisibleColumns = funds.qTableConfig.visibleColumns
        
        // Enhanced columns that include quarter info for multi-quarter view
        const columns = computed(() => {
            const cols = [...baseColumns]
            
            // Add quarter column when viewing multiple quarters
            if (isMultiQuarterView.value) {
                cols.unshift({
                    name: 'quarter',
                    label: 'Kvartal',
                    field: '_displayQuarter',
                    sortable: true,
                    align: 'left'
                })
            }
            
            return cols
        })
        
        const visibleColumns = computed(() => {
            const visCols = [...(fiVisibleColumns.value.length > 0 ? fiVisibleColumns.value : baseVisibleColumns)]
            
            // Add quarter column to visible columns when in multi-quarter view
            if (isMultiQuarterView.value && !visCols.includes('quarter')) {
                visCols.unshift('quarter')
            }
            
            return visCols
        })
        
        // Make rows reactive to store changes
        const rows = computed(() => {
            return storeFunds.value
        })

        const loading = ref(false);
        const refreshColor = ref("primary");

        const loadedFromWeb = ref(false);

        async function unzipAndImportToDB(zipFile, zipUrl, zipFileName) {
            console.time("fiUnzipAndImportToDB()");
            console.log('🔄 Processing ZIP file for historical import:', zipFileName)

            let fundsData = [];
            let holdingsData = [];

            return new Promise((resolve, reject) => {
                JSZip.loadAsync(zipFile).then(function (zip) {
                    const promises = [];
                    
                    zip.forEach(function (relativePath, zipEntry) {
                        if (zipEntry.dir === false) {
                            const promise = zipEntry.async("string").then(function (xml) {
                                let x2js = new X2JS();
                                let json = x2js.xml2js(xml);

                                // Handle to the fund's top level information
                                let fundInformation = json["VärdepappersfondInnehav"].Fondinformation[0];
                                let fundName = fundInformation.Fond_namn;

                                if (fundInformation.Fond_status != "Ej aktiv fond") {
                                    // Handle to the fund's holdings information
                                    let fundHoldings = fundInformation.FinansiellaInstrument?.FinansielltInstrument;

                                    if (fundHoldings == undefined || fundHoldings == null || fundHoldings == "") {
                                        console.warn(`⚠️ No holdings for: ${fundName}. Skipping import.`);
                                    } else {
                                        // Add fund to data array
                                        fundsData.push({
                                            ...fundInformation,
                                            // Remove holdings to avoid duplication
                                            FinansiellaInstrument: undefined
                                        });

                                        // Process holdings data
                                        const holdingsArray = Array.isArray(fundHoldings) ? fundHoldings : [fundHoldings];
                                        const enrichedHoldings = holdingsArray.map(holding => ({
                                            ...holding,
                                            fundName: fundName
                                        }));
                                        
                                        holdingsData.push(...enrichedHoldings);
                                    }
                                }
                            });
                            promises.push(promise);
                        }
                    });

                    Promise.all(promises).then(() => {
                        console.log('✅ ZIP processing completed:', {
                            funds: fundsData.length,
                            holdings: holdingsData.length
                        });
                        
                        // Save historical import using new store
                        fiStore.saveHistoricalImport(zipUrl, zipFileName, fundsData, holdingsData)
                            .then((importRecord) => {
                                console.timeEnd("fiUnzipAndImportToDB()");
                                resolve({
                                    fundsData,
                                    holdingsData,
                                    importRecord
                                });
                            })
                            .catch(reject);
                    }).catch(reject);
                }).catch(reject);
            });
        }

        // Scrape fund web page at FinansInspektionen and get latest zip file url
        async function fiScrapeZipUrl() {
            console.time("fiScrapeZipUrl()");
            let response = await fetch(fiFunds.url, fiFunds.options);
            if (!response.ok) {
                return Promise.reject(
                    `Error - fetch() status code: ${response.status}`,
                );
            }

            let text = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(text, "text/html");
            let table = doc.getElementsByTagName("tbody")[0];
            let aList = table.querySelectorAll("tr td:first-child a");

            // The first item in the list of links is the latest.
            // This could be easily confirmed by checking the 2nd and 3rd columns, year and quarter respectively,
            //      or by spliting the filename with ' ' and comparing the dates in the 3rd position in the arrays, [2].
            let a = aList[0];
            let url = fiDownload.url + a.pathname + a.search;
            console.timeEnd("fiScrapeZipUrl()");
            console.log("fiScrapeZipUrl() - url: ", url);
            return url;
        }

        // Scrape fund web page at FinansInspektionen and get ALL available zip file URLs
        async function fiScrapeAllZipUrls() {
            console.time("fiScrapeAllZipUrls()");
            let response = await fetch(fiFunds.url, fiFunds.options);
            if (!response.ok) {
                return Promise.reject(
                    `Error - fetch() status code: ${response.status}`,
                );
            }

            let text = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(text, "text/html");
            let table = doc.getElementsByTagName("tbody")[0];
            let aList = table.querySelectorAll("tr td:first-child a");

            // Convert all links to full URLs
            const urls = Array.from(aList).map(a => ({
                url: fiDownload.url + a.pathname + a.search,
                fileName: extractFileNameFromUrl(fiDownload.url + a.pathname + a.search)
            }));

            console.timeEnd("fiScrapeAllZipUrls()");
            console.log("fiScrapeAllZipUrls() - found URLs:", urls.length);
            return urls;
        }

        // Download zipped fund reports from FinansInspektionen
        async function fiFetchZipFile(url) {
            console.time("fiFetchZipFile()");
            let response = await fetch(url, { responseType: "arrayBuffer" });
            if (!response.ok) {
                return Promise.reject(
                    `Error - fetch() status code: ${response.status}`,
                );
            }
            console.timeEnd("fiFetchZipFile()");
            return Promise.resolve(response.blob());
        }

        // Lightweight refresh - only scrape metadata, no downloads (Phase 1)
        async function loadDataFromWeb() {
            console.time("fiRefreshMetadata()");
            loading.value = true;
            
            try {
                console.log('🔄 Refreshing quarter metadata from FI website')
                
                // Only scrape and update quarter metadata
                const result = await fiStore.refreshQuarterMetadata()
                
                console.log('✅ Metadata refresh completed:', result)
                
                // Show user-friendly notification about new quarters
                if (result.newQuarters > 0 || result.updatedQuarters > 0) {
                    $q.notify({
                        type: "positive",
                        message: `Metadata uppdaterad: ${result.newQuarters} nya kvartal, ${result.updatedQuarters} uppdaterade`,
                        caption: "Klicka på importknappen i kvartalsväljaren för att ladda ner data",
                        timeout: 5000
                    });
                } else {
                    $q.notify({
                        type: "info", 
                        message: "Ingen ny metadata hittades",
                        timeout: 3000
                    });
                }
                
            } catch (error) {
                console.error('❌ Failed to refresh metadata:', error)
                $q.notify({
                    type: "negative",
                    message: "Kunde inte uppdatera metadata från Finansinspektionen",
                });
                throw error
            } finally {
                loading.value = false;
                console.timeEnd("fiRefreshMetadata()");
            }
        }

        // Import ALL available ZIP files that we don't already have
        async function loadAllHistoricalDataFromWeb() {
            console.time("fiLoadAllHistoricalDataFromWeb()");
            loading.value = true;
            
            // Track notification outside of try block so we can clean it up in catch
            let currentNotification = null
            
            try {
                console.log('🔄 Starting bulk FI historical data import')
                
                // Clear any existing import notifications first
                $q.notify({
                    group: 'fi-import',
                    timeout: 1
                });
                
                // Get all available ZIP URLs
                const allZipFiles = await fiScrapeAllZipUrls()
                console.log('🌐 Found ZIP files:', allZipFiles.length)
                
                // Filter out files we already have
                const newZipFiles = []
                for (const zipFile of allZipFiles) {
                    try {
                        const zipMetadata = parseZipFileName(zipFile.fileName)
                        const hasData = await fiStore.hasQuarter(zipMetadata.quarter)
                        if (!hasData) {
                            newZipFiles.push(zipFile)
                        } else {
                            console.log('⚠️ Already have data for source date:', zipMetadata.sourceDate)
                        }
                    } catch (error) {
                        console.warn('⚠️ Could not parse ZIP filename, including in import:', zipFile.fileName)
                        newZipFiles.push(zipFile)
                    }
                }
                
                if (newZipFiles.length === 0) {
                    console.log('✅ All available historical data already imported')
                    $q.notify({
                        type: "info",
                        message: "All tillgänglig historisk data finns redan",
                    });
                    await loadDataFromStore()
                    return
                }
                
                console.log(`📦 Will import ${newZipFiles.length} new files`)
                
                let importedCount = 0
                let failedCount = 0
                let firstImportComplete = false
                
                // Sort files to import latest first for better UX
                const sortedFiles = [...newZipFiles].sort((a, b) => {
                    try {
                        const aDate = parseZipFileName(a.fileName).sourceDate
                        const bDate = parseZipFileName(b.fileName).sourceDate
                        return bDate.localeCompare(aDate) // Descending (newest first)
                    } catch {
                        return 0
                    }
                })
                
                // Create the initial sticky notification with a unique ID to track it
                const updateNotification = (message, isDone = false) => {
                    // Dismiss previous notification if it exists
                    if (currentNotification) {
                        currentNotification()
                    }
                    
                    if (!isDone) {
                        // Create new notification and store its dismiss function
                        currentNotification = $q.notify({
                            group: 'fi-import',
                            type: "ongoing",
                            message: message,
                            timeout: 0, // Persistent
                            spinner: !isDone,
                            position: 'top',
                            actions: [
                                {
                                    icon: 'mdi-close',
                                    color: 'white',
                                    handler: () => {
                                        if (currentNotification) {
                                            currentNotification()
                                            currentNotification = null
                                        }
                                    }
                                }
                            ]
                        });
                    }
                }
                
                // Show initial notification
                updateNotification(`Startar import av ${sortedFiles.length} filer...`)
                
                // Import each new file
                for (const [index, zipFile] of sortedFiles.entries()) {
                    try {
                        // Parse filename for quarter info
                        const zipMetadata = parseZipFileName(zipFile.fileName)
                        const quarterLabel = zipMetadata.quarter || 'Okänt kvartal'
                        
                        console.log(`🔄 Importing ${index + 1}/${sortedFiles.length}: ${zipFile.fileName}`)
                        
                        // Update the notification with progress
                        updateNotification(
                            `Importerar ${index + 1}/${sortedFiles.length}: ${quarterLabel} (${zipMetadata.sourceDate})`
                        );
                        
                        // Download ZIP file
                        const zipBlob = await fiFetchZipFile(zipFile.url)
                        console.log('📦 ZIP file downloaded')
                        
                        // Process and import
                        const result = await unzipAndImportToDB(zipBlob, zipFile.url, zipFile.fileName)
                        console.log('✅ Historical import completed:', result.importRecord.quarter)
                        
                        importedCount++
                        
                        // Update table with data as soon as first (latest) file is imported
                        if (!firstImportComplete) {
                            // No need to reinitialize - reactive store will update UI automatically
                            firstImportComplete = true
                            console.log('🎯 First import complete, table will update automatically')
                        }
                        
                    } catch (error) {
                        console.error('❌ Failed to import file:', zipFile.fileName, error)
                        failedCount++
                    }
                }
                
                // Clear the progress notification completely
                if (currentNotification) {
                    currentNotification()
                    currentNotification = null
                }
                
                // Final reload to ensure all data is current (after a delay to avoid loops)
                // No need to reinitialize - reactive store updates everything automatically
                
                // Show success notification
                $q.notify({
                    type: "positive",
                    message: `Historisk import slutförd: ${importedCount} filer importerade${failedCount > 0 ? `, ${failedCount} misslyckades` : ''}`,
                    timeout: 5000
                });
                
                console.log('✅ Bulk historical import completed:', {
                    imported: importedCount,
                    failed: failedCount,
                    total: sortedFiles.length
                })
                
            } catch (error) {
                console.error('❌ Failed to load historical data from web:', error)
                
                // Clear any progress notification on error
                if (currentNotification) {
                    currentNotification()
                    currentNotification = null
                }
                
                $q.notify({
                    type: "negative",
                    message: "Något gick fel under historisk import",
                });
                throw error
            } finally {
                loading.value = false;
                console.timeEnd("fiLoadAllHistoricalDataFromWeb()");
            }
        }

        // Load funds from FI Store
        async function loadDataFromStore() {
            console.time("fiLoadDataFromStore()");
            loading.value = true;
            
            try {
                console.log('🔄 Loading data from FI store')
                
                // Initialize store if not already done
                if (fiStore.funds.length === 0) {
                    await fiStore.initialize()
                }
                
                // Data is now automatically reactive through computed rows
                console.log('✅ Data loaded from store:', {
                    funds: fiStore.funds.length,
                    isMultiQuarter: fiStore.isMultiQuarterView,
                    currentView: fiStore.currentViewLabel
                })
                
            } catch (error) {
                console.error('❌ Failed to load data from store:', error)
                throw error
            } finally {
                loading.value = false;
                console.timeEnd("fiLoadDataFromStore()");
            }
        }

        // Load funds from legacy IndexedDB (backwards compatibility)
        async function loadDataFromDB() {
            console.time("fiLoadDataFromDB()");
            loading.value = true;
            let data = [];
            try {
                await fundsStore.iterate((value, key, iterationNumber) => {
                    data.push(value);
                });
                // Note: This legacy data needs to be moved to the store for proper reactivity
                console.log('⚠️ Legacy data loaded from IndexedDB (should migrate to store):', data.length)
            } catch (error) {
                console.error('❌ Failed to load legacy data:', error)
                throw error;
            } finally {
                loading.value = false;
                console.timeEnd("fiLoadDataFromDB()");
            }
        }

        // Load funds from existing store only (no automatic web loading)
        async function loadData() {
            loading.value = true;
            
            try {                
                // Always try to load from store first
                // This also initializes the FI store
                console.log('💾 Loading data from store')
                await loadDataFromStore()
                
                // Check if we have any data after loading from store
                if (fiStore.funds.length === 0) {
                    // No data available, show helpful notification with refresh option
                    console.log('� No fund data available in store')
                    showNoDataNotification()
                } else {
                    console.log('✅ Fund data loaded successfully from store')
                }
            } catch (error) {
                console.error('❌ Failed to load data:', error)
                $q.notify({
                    type: "negative",
                    message: "Kunde inte ladda fonddata",
                });
            } finally {
                loading.value = false;
            }
        }

        // Show notification when no data is available
        const showNoDataNotification = () => {
            $q.notify({
                type: "info",
                message: "Ingen fonddata lokalt.",
                caption: "Klicka på uppdatera för att hämta data från Finansinspektionen.",
                timeout: 0, // Persistent until dismissed
                actions: [
                    {
                        label: 'Uppdatera',
                        color: 'white',
                        handler: () => {
                            // Trigger refresh when user clicks the button
                            loadDataFromWeb()
                        }
                    },
                    {
                        icon: 'mdi-close',
                        color: 'white',
                        round: true,
                        handler: () => {
                            // Just dismiss the notification
                        }
                    }
                ]
            });
        }

        // Restore visible columns from Pinia store (simplified since we use computed)
        const restoreVisibleColumns = () => {
            console.log('✅ Visible columns restored via computed properties')
        }

        onMounted(() => {
            loadData();
            restoreVisibleColumns();
        });

        // Watch for changes in computed visible columns to save preferences
        watch(
            () => visibleColumns.value,
            (newVal) => {
                // Only save base columns (without quarter column)
                const baseColumns = newVal.filter(col => col !== 'quarter')
                fiVisibleColumns.value = [...baseColumns]
            },
        );

        watch(loadedFromWeb, (newVal) => {
            if (newVal && !isUpdatingQuarters.value) {
                loadDataFromStore().then(() => console.log("✅ Data refreshed from store"));
            }
        });

        // Watch for changes in selected quarters to ensure table updates
        watch(selectedQuarters, (newVal, oldVal) => {
            // Only log if there's an actual change to avoid spam
            if (JSON.stringify(newVal) !== JSON.stringify(oldVal) && !isUpdatingQuarters.value) {
                console.log('🔄 Watched quarter selection change:', {
                    from: oldVal,
                    to: newVal,
                    fundsCount: storeFunds.value.length
                })
            }
        }, { deep: true })

        // Watch for changes in store funds data (throttled to prevent spam)
        let lastFundsCount = 0
        let lastWatchTime = 0
        watch(storeFunds, (newVal) => {
            const now = Date.now()
            // Throttle to prevent excessive logging during bulk imports
            if (newVal.length !== lastFundsCount && (now - lastWatchTime) > 1000) {
                console.log('🔄 Store funds data changed:', {
                    count: newVal.length,
                    isMultiQuarter: isMultiQuarterView.value
                })
                lastFundsCount = newVal.length
                lastWatchTime = now
            }
        })

        // Debug function to inspect data state
        const debugData = async () => {
            console.log('🐛 DEBUG: Current data state')
            console.log('Selected quarters:', selectedQuarters.value)
            console.log('Quarter options:', quarterOptions.value)
            console.log('Store funds count:', storeFunds.value.length)
            console.log('Computed rows count:', rows.value.length)
            console.log('Available quarters:', availableQuarters.value)
            console.log('Current view label:', currentViewLabel.value)
            console.log('Is multi quarter view:', isMultiQuarterView.value)
            
            // Check IndexedDB stores using the existing store instances
            try {
                const allImports = []
                await fiStore.importsStore.iterate((value, key) => {
                    allImports.push({ key, value })
                })
                console.log('All imports in IndexedDB:', allImports)
                
                // Check the legacy fund stores 
                let foundFundData = false
                await fiStore.fundsStore.iterate((value, key) => {
                    console.log(`Found legacy fund data for key ${key}:`, Array.isArray(value) ? value.length : 'not array')
                    foundFundData = true
                })
                
                // Check historical data count
                let foundHistoricalData = false
                await fiStore.fundsStore.iterate((value, key) => {
                    if (key.includes('Q')) { // Quarter-based keys
                        console.log(`Found historical fund data for key ${key}:`, Array.isArray(value) ? value.length : 'not array')
                        foundHistoricalData = true
                    }
                })
                
                if (!foundFundData && !foundHistoricalData) {
                    console.log('❌ No fund data found in any IndexedDB stores')
                }
                
            } catch (error) {
                console.error('❌ Error inspecting IndexedDB:', error)
            }
            
            $q.notify({
                type: 'info',
                message: 'Debug info logged to console',
                timeout: 2000
            })
        }

        // Individual quarter import function (completely independent of selection state)
        const importQuarter = async (quarter) => {
            try {
                console.log(`🔄 Starting individual IMPORT operation for quarter: ${quarter} (completely independent of selection state)`)
                
                // Set import operation state (has NO effect on selection state)
                fiStore.setQuarterState(quarter, 'downloading')
                console.log(`🔄 Quarter ${quarter} import operation state: downloading (selection state unchanged)`)
                
                // Get quarter information
                const quarterInfo = quarterOptions.value.find(q => q.quarter === quarter)
                if (!quarterInfo) {
                    throw new Error(`Quarter ${quarter} not found`)
                }
                
                // Debug: Log quarter info to verify URL
                console.log(`📦 Quarter info for ${quarter}:`, {
                    sourceUrl: quarterInfo.sourceUrl,
                    urlType: typeof quarterInfo.sourceUrl,
                    urlStringified: JSON.stringify(quarterInfo.sourceUrl),
                    fileName: quarterInfo.fileName,
                    label: quarterInfo.label
                })
                
                if (!quarterInfo.sourceUrl || quarterInfo.sourceUrl === 'undefined') {
                    console.error(`❌ Invalid URL for quarter ${quarter}:`, {
                        sourceUrl: quarterInfo.sourceUrl,
                        urlType: typeof quarterInfo.sourceUrl,
                        quarterInfo: quarterInfo
                    })
                    throw new Error(`No valid URL found for quarter ${quarter} (got: ${quarterInfo.sourceUrl})`)
                }
                
                console.log(`📦 Downloading ZIP file: ${quarterInfo.fileName}`)
                
                // Download ZIP file
                const zipBlob = await fiFetchZipFile(quarterInfo.sourceUrl)
                console.log('📦 ZIP file downloaded')
                
                // Update import operation state to extracting (still no effect on selection)
                fiStore.setQuarterState(quarter, 'extracting')
                console.log(`🔄 Quarter ${quarter} import operation state: extracting (selection state unchanged)`)
                
                // Process and import
                const result = await unzipAndImportToDB(zipBlob, quarterInfo.sourceUrl, quarterInfo.fileName)
                console.log('✅ Quarter import completed:', result.importRecord.quarter)
                
                // Explicitly set import operation state to imported (still no effect on selection)
                fiStore.setQuarterState(quarter, 'imported')
                console.log(`🎯 Quarter ${quarter} import operation state: imported (selection state unchanged)`)
                
                // DON'T call initialize() - it's destructive and overrides reactive state!
                // The store is already updated reactively by saveHistoricalImport()
                console.log('🎯 Import operation completed, reactive state should be updated automatically')
                
                $q.notify({
                    type: "positive",
                    message: `${quarterInfo.label} importerat framgångsrikt`,
                    caption: `${result.fundsData.length} fonder importerade`,
                    timeout: 3000
                });
                
            } catch (error) {
                console.error(`❌ Failed to import quarter ${quarter}:`, error)
                fiStore.setQuarterState(quarter, 'error', null, error.message)
                
                $q.notify({
                    type: "negative",
                    message: `Kunde inte importera ${quarter}`,
                    caption: error.message,
                    timeout: 5000
                });
            }
        }

        // Delete quarter data function (completely independent of selection state)
        const deleteQuarter = async (quarter) => {
            try {
                // Show confirmation dialog
                const confirmed = await new Promise((resolve) => {
                    $q.dialog({
                        title: 'Bekräfta borttagning',
                        message: `Är du säker på att du vill ta bort all data för ${quarter}? Kvartalet kommer fortfarande att vara tillgängligt för omimport.`,
                        cancel: true,
                        persistent: true
                    }).onOk(() => resolve(true))
                      .onCancel(() => resolve(false))
                })
                
                if (!confirmed) return
                
                console.log(`🗑️ Deleting quarter data: ${quarter} (selection state independent)`)
                
                // Delete data operation - this affects import state but not selection state
                await fiStore.deleteQuarterData(quarter)
                console.log(`✅ Quarter ${quarter} data deleted (selection state unchanged)`)
                
                $q.notify({
                    type: "positive",
                    message: `Data för ${quarter} borttagen`,
                    timeout: 3000
                });
                
            } catch (error) {
                console.error(`❌ Failed to delete quarter ${quarter}:`, error)
                $q.notify({
                    type: "negative",
                    message: `Kunde inte ta bort ${quarter}`,
                    caption: error.message,
                    timeout: 5000
                });
            }
        }

        return {
            loadData,
            loadDataFromWeb,
            loadAllHistoricalDataFromWeb,
            loadDataFromStore,
            showNoDataNotification,
            loading,
            refreshColor,
            filter: ref(""),
            title,
            columns,
            visibleColumns,
            rows,
            pagination: ref({
                rowsPerPage: 0,
            }),
            // Quarter selection
            selectedQuarters,
            selectedQuarterObjects,
            quarterOptions,
            onQuarterSelectionChange,
            // Historical tracking state
            isMultiQuarterView,
            currentViewLabel,
            // Individual quarter management (Phase 1)
            importQuarter,
            deleteQuarter,
            // Debug (only in dev)
            debugData
        };
    },
};
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

/* Force fixed width for dropdown to prevent jumping */
.fixed-width-dropdown {
    width: 400px !important;
    max-width: 400px !important;
    min-width: 400px !important;
}

.fixed-width-dropdown .q-item {
    width: 400px !important;
    max-width: 400px !important;
    min-width: 400px !important;
}
</style>

<style lang="sass" scoped>

.my-sticky-header-table
    /* height or max-height is important */
    height: calc(100vh - 100px)

    .q-table__top,
    .q-table__middle,
    .q-table__bottom,
    thead tr:first-child th
        /* bg color is important for th; just specify one */
        background-color: #ffffff

    thead tr
        top: 0
        position: sticky
        z-index: 2
        text-transform: uppercase

    &.q-table--dark
        .q-table__top,
        .q-table__middle,
        .q-table__bottom,
        thead tr:first-child th
            /* bg color is important for th; just specify one */
            background-color: #1d1d1d
</style>
