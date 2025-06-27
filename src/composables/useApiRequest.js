import { fetch } from '@tauri-apps/plugin-http'

/**
 * Composable for standardized API requests with error handling
 * Provides consistent patterns for making HTTP requests across components
 */
export function useApiRequest() {

    /**
     * Make an API request with standardized error handling
     * @param {Object} params - Configuration object
     * @param {Function} params.requestOptionsGetter - Function that returns request options
     * @param {string} params.apiName - API name for logging
     * @param {string} params.company - Company code (optional parameter for request options)
     * @returns {Promise<any>} - Response data
     */
    async function makeRequest({ requestOptionsGetter, apiName, company = '' }) {
        try {
            // Validate inputs
            if (!requestOptionsGetter) {
                throw new Error(`Missing requestOptionsGetter for ${apiName}`)
            }

            // Get request options (may be async for cookie handling)
            const requestOptions = await requestOptionsGetter(company)
            
            if (!requestOptions || !requestOptions.url) {
                throw new Error(`Invalid request options or URL: ${requestOptions?.url}`)
            }

            console.log(`🌐 Making API request to ${apiName}:`, requestOptions.url)
            
            // Make the request
            const response = await fetch(requestOptions.url, requestOptions.options)
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const data = await response.json()
            
            if (data == null || data == undefined) {
                throw new Error('Response data is null or undefined')
            }
            
            console.log(`✅ API request successful for ${apiName}, received ${Array.isArray(data) ? data.length : 'non-array'} data`)
            return data
            
        } catch (error) {
            console.error(`❌ API request failed for ${apiName}:`, error)
            throw error
        }
    }

    /**
     * Download and process binary data (like ZIP files)
     * @param {string} url - URL to download from
     * @param {string} apiName - API name for logging
     * @returns {Promise<Blob>} - Response blob
     */
    async function downloadBinary(url, apiName) {
        try {
            console.log(`📦 Downloading binary data from ${apiName}:`, url)
            console.time(`📦 Download ${apiName}`)
            
            const response = await fetch(url, { responseType: 'arrayBuffer' })
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const blob = await response.blob()
            console.timeEnd(`📦 Download ${apiName}`)
            console.log(`✅ Binary download successful for ${apiName}`)
            
            return blob
            
        } catch (error) {
            console.error(`❌ Binary download failed for ${apiName}:`, error)
            throw error
        }
    }

    /**
     * Scrape HTML content and extract information
     * @param {string} url - URL to scrape
     * @param {Function} extractor - Function to extract data from parsed HTML
     * @param {string} apiName - API name for logging
     * @returns {Promise<any>} - Extracted data
     */
    async function scrapeHtml(url, extractor, apiName) {
        try {
            console.log(`🔍 Scraping HTML from ${apiName}:`, url)
            console.time(`🔍 Scrape ${apiName}`)
            
            const response = await fetch(url)
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const text = await response.text()
            const parser = new DOMParser()
            const doc = parser.parseFromString(text, 'text/html')
            
            const result = extractor(doc)
            
            console.timeEnd(`🔍 Scrape ${apiName}`)
            console.log(`✅ HTML scraping successful for ${apiName}`)
            
            return result
            
        } catch (error) {
            console.error(`❌ HTML scraping failed for ${apiName}:`, error)
            throw error
        }
    }

    return {
        makeRequest,
        downloadBinary,
        scrapeHtml
    }
}