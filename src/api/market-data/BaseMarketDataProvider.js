import { fetch } from "@tauri-apps/plugin-http";

/**
 * Base class for market data providers
 * Defines the standard interface that all market data providers must implement
 */
export class BaseMarketDataProvider {
    constructor(config = {}) {
        this.name = config.name || 'Unknown Provider'
        this.apiKey = config.apiKey || null
        this.baseUrl = config.baseUrl || ''
        this.rateLimit = config.rateLimit || { requestsPerMinute: 60, requestsPerDay: 1000 }
        this.usage = { requests: 0, lastReset: Date.now() }
        this.enabled = config.enabled !== false
    }

    /**
     * Get stock quote data for a single symbol
     * @param {string} symbol - Stock symbol (e.g., 'AAPL')
     * @returns {Promise<Object>} Standardized stock data
     */
    async getQuote(symbol) {
        throw new Error(`getQuote method must be implemented by ${this.name}`)
    }

    /**
     * Get stock quote data for multiple symbols
     * @param {Array<string>} symbols - Array of stock symbols
     * @returns {Promise<Array<Object>>} Array of standardized stock data
     */
    async getBatchQuotes(symbols) {
        throw new Error(`getBatchQuotes method must be implemented by ${this.name}`)
    }

    /**
     * Search for stocks by query
     * @param {string} query - Search query
     * @returns {Promise<Array<Object>>} Array of search results
     */
    async searchStocks(query) {
        throw new Error(`searchStocks method must be implemented by ${this.name}`)
    }

    /**
     * Get historical price data
     * @param {string} symbol - Stock symbol
     * @param {string} period - Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
     * @returns {Promise<Array<Object>>} Historical price data
     */
    async getHistoricalData(symbol, period = '1y') {
        throw new Error(`getHistoricalData method must be implemented by ${this.name}`)
    }

    /**
     * Check if the provider is properly configured
     * @returns {boolean} True if configured and ready to use
     */
    isConfigured() {
        return this.enabled && (!this.requiresApiKey() || this.apiKey)
    }

    /**
     * Check if this provider requires an API key
     * @returns {boolean} True if API key is required
     */
    requiresApiKey() {
        return false // Override in subclasses
    }

    /**
     * Get provider-specific rate limit information
     * @returns {Object} Rate limit details
     */
    getRateLimitInfo() {
        return {
            requestsPerMinute: this.rateLimit.requestsPerMinute,
            requestsPerDay: this.rateLimit.requestsPerDay,
            currentUsage: this.usage.requests,
            resetTime: this.usage.lastReset
        }
    }

    /**
     * Check if rate limit allows another request
     * @returns {boolean} True if request can be made
     */
    canMakeRequest() {
        const now = Date.now()
        const timeDiff = now - this.usage.lastReset
        
        // Reset usage if more than a day has passed
        if (timeDiff > 24 * 60 * 60 * 1000) {
            this.usage.requests = 0
            this.usage.lastReset = now
        }
        
        return this.usage.requests < this.rateLimit.requestsPerDay
    }

    /**
     * Track API usage
     */
    trackUsage() {
        this.usage.requests++
    }

    /**
     * Transform provider-specific data to standardized format
     * @param {Object} rawData - Raw data from provider API
     * @returns {Object} Standardized stock data
     */
    transformToStandardFormat(rawData) {
        return {
            symbol: rawData.symbol || '',
            name: rawData.name || '',
            price: parseFloat(rawData.price) || 0,
            change: parseFloat(rawData.change) || 0,
            changePercent: parseFloat(rawData.changePercent) || 0,
            volume: parseInt(rawData.volume) || 0,
            marketCap: parseFloat(rawData.marketCap) || 0,
            sector: rawData.sector || '',
            country: rawData.country || 'US',
            currency: rawData.currency || 'USD',
            lastUpdated: rawData.lastUpdated || new Date().toISOString(),
            provider: this.name
        }
    }

    /**
     * Get provider information
     * @returns {Object} Provider details
     */
    getProviderInfo() {
        return {
            name: this.name,
            requiresApiKey: this.requiresApiKey(),
            rateLimit: this.rateLimit,
            isConfigured: this.isConfigured(),
            enabled: this.enabled,
            freeTierAvailable: true // Override in subclasses
        }
    }

    /**
     * Test API connectivity
     * @returns {Promise<boolean>} True if API is accessible
     */
    async testConnection() {
        try {
            // Try to get a quote for a well-known stock
            await this.getQuote('AAPL')
            return true
        } catch (error) {
            console.error(`❌ ${this.name} connection test failed:`, error.message)
            return false
        }
    }

    /**
     * Make HTTP request with error handling and rate limiting
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async makeRequest(url, options = {}) {
        if (!this.canMakeRequest()) {
            throw new Error(`Rate limit exceeded for ${this.name}`)
        }

        try {
            console.log(`🌐 Making request to ${this.name}: ${url}`)
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    ...options.headers
                },
                ...options
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            this.trackUsage()
            const data = await response.json()
            console.log(`✅ ${this.name} request successful`)
            
            return data
        } catch (error) {
            console.error(`❌ ${this.name} request failed:`, error.message)
            throw error
        }
    }
}