import { YahooFinanceProvider } from './YahooFinanceProvider.js'
import { AlphaVantageProvider } from './AlphaVantageProvider.js'
import { FinnhubProvider } from './FinnhubProvider.js'
import { FinancialModelingPrepProvider } from './FinancialModelingPrepProvider.js'

/**
 * Market Data Manager
 * Manages multiple market data providers with fallback support
 */
export class MarketDataManager {
    constructor(config = {}) {
        this.providers = new Map()
        this.activeProvider = null
        this.fallbackEnabled = config.fallbackEnabled !== false
        this.retryAttempts = config.retryAttempts || 3
        this.retryDelay = config.retryDelay || 1000
        
        this.initializeProviders(config)
    }

    /**
     * Initialize all available providers
     * @param {Object} config - Configuration object
     */
    initializeProviders(config) {
        // Initialize Yahoo Finance (no API key required)
        const yahooConfig = config.yahoo || { enabled: true }
        this.providers.set('yahoo', new YahooFinanceProvider(yahooConfig))

        // Initialize Alpha Vantage
        const alphaVantageConfig = config.alphaVantage || { enabled: false }
        this.providers.set('alphavantage', new AlphaVantageProvider(alphaVantageConfig))

        // Initialize Finnhub
        const finnhubConfig = config.finnhub || { enabled: false }
        this.providers.set('finnhub', new FinnhubProvider(finnhubConfig))

        // Initialize Financial Modeling Prep
        const fmpConfig = config.financialModelingPrep || { enabled: false }
        this.providers.set('fmp', new FinancialModelingPrepProvider(fmpConfig))

        // Set the first configured provider as active
        this.setActiveProvider(config.activeProvider || this.getFirstConfiguredProvider())
    }

    /**
     * Get the first configured provider
     * @returns {string} Provider key
     */
    getFirstConfiguredProvider() {
        for (const [key, provider] of this.providers) {
            if (provider.isConfigured()) {
                return key
            }
        }
        return 'yahoo' // Default fallback
    }

    /**
     * Set the active provider
     * @param {string} providerKey - Provider key
     */
    setActiveProvider(providerKey) {
        if (!this.providers.has(providerKey)) {
            throw new Error(`Provider ${providerKey} not found`)
        }

        const provider = this.providers.get(providerKey)
        if (!provider.isConfigured()) {
            console.warn(`⚠️ Provider ${providerKey} is not properly configured`)
        }

        this.activeProvider = providerKey
        console.log(`🔄 Active market data provider set to: ${provider.name}`)
    }

    /**
     * Get the active provider instance
     * @returns {BaseMarketDataProvider} Active provider
     */
    getActiveProvider() {
        if (!this.activeProvider) {
            throw new Error('No active provider set')
        }
        return this.providers.get(this.activeProvider)
    }

    /**
     * Get all available providers
     * @returns {Map} Map of all providers
     */
    getAllProviders() {
        return this.providers
    }

    /**
     * Get provider information for all providers
     * @returns {Object} Provider information
     */
    getProviderInfo() {
        const info = {}
        for (const [key, provider] of this.providers) {
            info[key] = provider.getProviderInfo()
        }
        return info
    }

    /**
     * Update provider configuration
     * @param {string} providerKey - Provider key
     * @param {Object} config - Configuration object
     */
    updateProviderConfig(providerKey, config) {
        if (!this.providers.has(providerKey)) {
            throw new Error(`Provider ${providerKey} not found`)
        }

        const provider = this.providers.get(providerKey)
        
        // Update configuration
        if (config.apiKey !== undefined) {
            provider.apiKey = config.apiKey
        }
        if (config.enabled !== undefined) {
            provider.enabled = config.enabled
        }
        if (config.rateLimit !== undefined) {
            provider.rateLimit = { ...provider.rateLimit, ...config.rateLimit }
        }

        console.log(`🔧 Updated configuration for ${provider.name}`)
    }

    /**
     * Execute a provider method with fallback support
     * @param {string} method - Method name
     * @param {Array} args - Method arguments
     * @returns {Promise<any>} Result from provider
     */
    async executeWithFallback(method, ...args) {
        const configuredProviders = Array.from(this.providers.entries())
            .filter(([key, provider]) => provider.isConfigured())
            .sort(([keyA], [keyB]) => {
                // Prioritize active provider
                if (keyA === this.activeProvider) return -1
                if (keyB === this.activeProvider) return 1
                return 0
            })

        if (configuredProviders.length === 0) {
            throw new Error('No configured providers available')
        }

        let lastError = null

        for (const [providerKey, provider] of configuredProviders) {
            try {
                console.log(`🌐 Attempting ${method} with ${provider.name}`)
                
                // Check rate limits
                if (!provider.canMakeRequest()) {
                    console.warn(`⚠️ Rate limit exceeded for ${provider.name}, trying next provider`)
                    continue
                }

                const result = await this.retryWithBackoff(() => provider[method](...args))
                console.log(`✅ Successfully executed ${method} with ${provider.name}`)
                
                // Update active provider if this one succeeded and it wasn't the active one
                if (providerKey !== this.activeProvider) {
                    console.log(`🔄 Switching active provider to ${provider.name}`)
                    this.activeProvider = providerKey
                }
                
                return result
            } catch (error) {
                console.error(`❌ ${provider.name} failed for ${method}:`, error.message)
                lastError = error
                
                if (!this.fallbackEnabled) {
                    throw error
                }
            }
        }

        throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown error'}`)
    }

    /**
     * Retry a function with exponential backoff
     * @param {Function} fn - Function to retry
     * @returns {Promise<any>} Result from function
     */
    async retryWithBackoff(fn) {
        let lastError = null
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await fn()
            } catch (error) {
                lastError = error
                
                if (attempt === this.retryAttempts) {
                    throw error
                }
                
                const delay = this.retryDelay * Math.pow(2, attempt - 1)
                console.warn(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
        
        throw lastError
    }

    /**
     * Get stock quote data for a single symbol
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Standardized stock data
     */
    async getQuote(symbol) {
        return this.executeWithFallback('getQuote', symbol)
    }

    /**
     * Get stock quote data for multiple symbols
     * @param {Array<string>} symbols - Array of stock symbols
     * @returns {Promise<Array<Object>>} Array of standardized stock data
     */
    async getBatchQuotes(symbols) {
        return this.executeWithFallback('getBatchQuotes', symbols)
    }

    /**
     * Search for stocks by query
     * @param {string} query - Search query
     * @returns {Promise<Array<Object>>} Array of search results
     */
    async searchStocks(query) {
        return this.executeWithFallback('searchStocks', query)
    }

    /**
     * Get historical price data
     * @param {string} symbol - Stock symbol
     * @param {string} period - Time period
     * @returns {Promise<Array<Object>>} Historical price data
     */
    async getHistoricalData(symbol, period = '1y') {
        return this.executeWithFallback('getHistoricalData', symbol, period)
    }

    /**
     * Test connectivity for all configured providers
     * @returns {Promise<Object>} Test results for each provider
     */
    async testAllProviders() {
        const results = {}
        
        for (const [key, provider] of this.providers) {
            if (!provider.isConfigured()) {
                results[key] = {
                    success: false,
                    error: 'Provider not configured',
                    provider: provider.name
                }
                continue
            }

            try {
                console.log(`🔍 Testing connectivity for ${provider.name}...`)
                const success = await provider.testConnection()
                results[key] = {
                    success,
                    provider: provider.name,
                    rateLimit: provider.getRateLimitInfo()
                }
            } catch (error) {
                results[key] = {
                    success: false,
                    error: error.message,
                    provider: provider.name
                }
            }
        }

        return results
    }

    /**
     * Get usage statistics for all providers
     * @returns {Object} Usage statistics
     */
    getUsageStatistics() {
        const stats = {}
        
        for (const [key, provider] of this.providers) {
            stats[key] = {
                provider: provider.name,
                configured: provider.isConfigured(),
                enabled: provider.enabled,
                rateLimit: provider.getRateLimitInfo()
            }
        }

        return stats
    }

    /**
     * Reset usage counters for all providers
     */
    resetUsageCounters() {
        for (const [key, provider] of this.providers) {
            provider.usage = { requests: 0, lastReset: Date.now() }
        }
        console.log('🧹 Reset usage counters for all providers')
    }

    /**
     * Get recommended provider based on current configuration and usage
     * @returns {string} Recommended provider key
     */
    getRecommendedProvider() {
        const configuredProviders = Array.from(this.providers.entries())
            .filter(([key, provider]) => provider.isConfigured())

        if (configuredProviders.length === 0) {
            return 'yahoo' // Default fallback
        }

        // Find provider with most remaining requests
        let bestProvider = null
        let bestScore = 0

        for (const [key, provider] of configuredProviders) {
            const rateLimitInfo = provider.getRateLimitInfo()
            const remainingRequests = rateLimitInfo.requestsPerDay - rateLimitInfo.currentUsage
            const score = remainingRequests / rateLimitInfo.requestsPerDay

            if (score > bestScore) {
                bestScore = score
                bestProvider = key
            }
        }

        return bestProvider || configuredProviders[0][0]
    }
}