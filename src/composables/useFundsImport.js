import { ref } from 'vue'
import { useQuasar } from 'quasar'
import JSZip from 'jszip'
import X2JS from 'x2js'
import { fetch } from '@tauri-apps/plugin-http'
import { useFIStore } from '../stores/fi-store.js'
import { fiFunds, fiDownload } from '../api/fiAPI.js'
import { extractFileNameFromUrl, parseZipFileName } from '../api/fiHistoricalUtils.js'

/**
 * Composable for FI fund import operations.
 * Handles ZIP downloading, extraction, parsing, and import to the store.
 */
export function useFundsImport() {
    const $q = useQuasar()
    const fiStore = useFIStore()
    const loading = ref(false)

    /**
     * Download a ZIP file from a URL
     */
    async function fetchZipFile(url) {
        const response = await fetch(url, { responseType: 'arrayBuffer' })
        if (!response.ok) {
            throw new Error(`Fetch failed with status: ${response.status}`)
        }
        return response.blob()
    }

    /**
     * Extract and import fund/holdings data from a ZIP blob
     */
    async function unzipAndImport(zipFile, zipUrl, zipFileName) {
        let fundsData = []
        let holdingsData = []

        const zip = await JSZip.loadAsync(zipFile)
        const promises = []

        zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return

            const promise = zipEntry.async('string').then((xml) => {
                const x2js = new X2JS()
                const json = x2js.xml2js(xml)

                const fundInformation = json['VärdepappersfondInnehav'].Fondinformation[0]
                const fundName = fundInformation['Fond_namn']
                const fundISIN = fundInformation['Fond_ISIN-kod']

                if (fundInformation.Fond_status === 'Ej aktiv fond') return

                const fundHoldings = fundInformation.FinansiellaInstrument?.FinansielltInstrument
                if (!fundHoldings) return

                fundsData.push({
                    ...fundInformation,
                    FinansiellaInstrument: undefined
                })

                const holdingsArray = Array.isArray(fundHoldings) ? fundHoldings : [fundHoldings]
                holdingsData.push(...holdingsArray.map(holding => ({
                    ...holding,
                    fundName,
                    fundISIN
                })))
            })
            promises.push(promise)
        })

        await Promise.all(promises)

        const importRecord = await fiStore.saveHistoricalImport(zipUrl, zipFileName, fundsData, holdingsData)
        return { fundsData, holdingsData, importRecord }
    }

    /**
     * Scrape FI website for all available ZIP file URLs
     */
    async function scrapeAllZipUrls() {
        const response = await fetch(fiFunds.url, fiFunds.options)
        if (!response.ok) {
            throw new Error(`Fetch failed with status: ${response.status}`)
        }

        const text = await response.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(text, 'text/html')
        const table = doc.getElementsByTagName('tbody')[0]
        const aList = table.querySelectorAll('tr td:first-child a')

        return Array.from(aList).map(a => ({
            url: fiDownload.url + a.pathname + a.search,
            fileName: extractFileNameFromUrl(fiDownload.url + a.pathname + a.search)
        }))
    }

    /**
     * Refresh quarter metadata from FI website (lightweight, no downloads)
     */
    async function refreshMetadata() {
        loading.value = true
        try {
            const result = await fiStore.refreshQuarterMetadata()

            if (result.newQuarters > 0 || result.updatedQuarters > 0) {
                $q.notify({
                    type: 'positive',
                    message: `Metadata uppdaterad: ${result.newQuarters} nya kvartal, ${result.updatedQuarters} uppdaterade`,
                    caption: 'Klicka på importknappen i kvartalsväljaren för att ladda ner data',
                    timeout: 5000
                })
            } else {
                $q.notify({
                    type: 'info',
                    message: 'Ingen ny metadata hittades',
                    timeout: 3000
                })
            }
        } catch (error) {
            console.error('Failed to refresh metadata:', error)
            $q.notify({
                type: 'negative',
                message: 'Kunde inte uppdatera metadata från Finansinspektionen',
            })
            throw error
        } finally {
            loading.value = false
        }
    }

    /**
     * Import ALL available ZIP files that aren't already imported
     */
    async function importAllHistorical() {
        loading.value = true
        let currentNotification = null

        try {
            const allZipFiles = await scrapeAllZipUrls()

            // Filter out already-imported quarters
            const newZipFiles = []
            for (const zipFile of allZipFiles) {
                try {
                    const zipMetadata = parseZipFileName(zipFile.fileName)
                    const hasData = await fiStore.hasQuarter(zipMetadata.quarter)
                    if (!hasData) {
                        newZipFiles.push(zipFile)
                    }
                } catch {
                    newZipFiles.push(zipFile)
                }
            }

            if (newZipFiles.length === 0) {
                $q.notify({ type: 'info', message: 'All tillgänglig historisk data finns redan' })
                return
            }

            // Sort newest first
            const sortedFiles = [...newZipFiles].sort((a, b) => {
                try {
                    const aDate = parseZipFileName(a.fileName).sourceDate
                    const bDate = parseZipFileName(b.fileName).sourceDate
                    return bDate.localeCompare(aDate)
                } catch {
                    return 0
                }
            })

            const updateNotification = (message) => {
                if (currentNotification) currentNotification()
                currentNotification = $q.notify({
                    group: 'fi-import',
                    type: 'ongoing',
                    message,
                    timeout: 0,
                    spinner: true,
                    position: 'top',
                    actions: [{
                        icon: 'mdi-close',
                        color: 'white',
                        handler: () => {
                            if (currentNotification) {
                                currentNotification()
                                currentNotification = null
                            }
                        }
                    }]
                })
            }

            updateNotification(`Startar import av ${sortedFiles.length} filer...`)

            let importedCount = 0
            let failedCount = 0

            for (const [index, zipFile] of sortedFiles.entries()) {
                try {
                    const zipMetadata = parseZipFileName(zipFile.fileName)
                    const quarterLabel = zipMetadata.quarter || 'Okänt kvartal'

                    updateNotification(
                        `Importerar ${index + 1}/${sortedFiles.length}: ${quarterLabel} (${zipMetadata.sourceDate})`
                    )

                    const zipBlob = await fetchZipFile(zipFile.url)
                    await unzipAndImport(zipBlob, zipFile.url, zipFile.fileName)
                    importedCount++
                } catch (error) {
                    console.error('Failed to import file:', zipFile.fileName, error)
                    failedCount++
                }
            }

            if (currentNotification) {
                currentNotification()
                currentNotification = null
            }

            $q.notify({
                type: 'positive',
                message: `Historisk import slutförd: ${importedCount} filer importerade${failedCount > 0 ? `, ${failedCount} misslyckades` : ''}`,
                timeout: 5000
            })
        } catch (error) {
            console.error('Failed to load historical data:', error)
            if (currentNotification) {
                currentNotification()
                currentNotification = null
            }
            $q.notify({ type: 'negative', message: 'Något gick fel under historisk import' })
            throw error
        } finally {
            loading.value = false
        }
    }

    /**
     * Import a single quarter by its quarter identifier
     */
    async function importQuarter(quarter, availableQuarters) {
        const quarterStatus = fiStore.getQuarterStatus(quarter)
        if (quarterStatus.isImporting) {
            $q.notify({ type: 'warning', message: `${quarter} bearbetas redan`, caption: 'Vänta tills operationen är klar', timeout: 3000 })
            return
        }

        try {
            fiStore.setQuarterState(quarter, 'downloading')

            const quarterInfo = availableQuarters.find(q => q.quarter === quarter)
            if (!quarterInfo) throw new Error(`Quarter ${quarter} not found`)
            if (!quarterInfo.sourceUrl || quarterInfo.sourceUrl === 'undefined') {
                throw new Error(`No valid URL found for quarter ${quarter}`)
            }

            const zipBlob = await fetchZipFile(quarterInfo.sourceUrl)
            fiStore.setQuarterState(quarter, 'extracting')

            const result = await unzipAndImport(zipBlob, quarterInfo.sourceUrl, quarterInfo.fileName)
            fiStore.setQuarterState(quarter, 'imported')

            $q.notify({
                type: 'positive',
                message: `${quarterInfo.label} importerat framgångsrikt`,
                caption: `${result.fundsData.length} fonder importerade`,
                timeout: 3000
            })
        } catch (error) {
            console.error(`Failed to import quarter ${quarter}:`, error)
            fiStore.setQuarterState(quarter, 'error', null, error.message)
            $q.notify({ type: 'negative', message: `Kunde inte importera ${quarter}`, caption: error.message, timeout: 5000 })
        }
    }

    /**
     * Delete quarter data with confirmation dialog
     */
    async function deleteQuarter(quarter) {
        const quarterStatus = fiStore.getQuarterStatus(quarter)
        if (quarterStatus.isImporting) {
            $q.notify({ type: 'warning', message: `${quarter} bearbetas redan`, caption: 'Vänta tills operationen är klar', timeout: 3000 })
            return
        }

        const confirmed = await new Promise((resolve) => {
            $q.dialog({
                title: 'Bekräfta borttagning',
                message: `Är du säker på att du vill ta bort all data för ${quarter}? Kvartalet kommer fortfarande att vara tillgängligt för omport.`,
                cancel: true,
                persistent: true
            }).onOk(() => resolve(true))
              .onCancel(() => resolve(false))
        })

        if (!confirmed) return

        try {
            await fiStore.deleteQuarterData(quarter)
            $q.notify({ type: 'positive', message: `Data för ${quarter} borttagen`, timeout: 3000 })
        } catch (error) {
            console.error(`Failed to delete quarter ${quarter}:`, error)
            $q.notify({ type: 'negative', message: `Kunde inte ta bort ${quarter}`, caption: error.message, timeout: 5000 })
        }
    }

    return {
        loading,
        refreshMetadata,
        importAllHistorical,
        importQuarter,
        deleteQuarter,
    }
}
