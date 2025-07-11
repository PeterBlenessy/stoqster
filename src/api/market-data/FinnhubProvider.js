import { BaseMarketDataProvider } from './BaseMarketDataProvider.js'

/**
 * Finnhub Stock API provider
 * Requires API key, has free tier with 60 calls per minute
 */
export class FinnhubProvider extends BaseMarketDataProvider {
    constructor(config = {}) {
        super({
            name: 'Finnhub',
            baseUrl: 'https://finnhub.io/api/v1',
            rateLimit: {
                requestsPerMinute: 60,
                requestsPerDay: 1000 // Conservative estimate for free tier
            },
            freeTierAvailable: true,
            ...config
        })
    }

    requiresApiKey() {
        return true
    }

    /**
     * Get stock quote data for a single symbol
     * @param {string} symbol - Stock symbol (e.g., 'AAPL')
     * @returns {Promise<Object>} Standardized stock data
     */
    async getQuote(symbol) {
        if (!symbol) {
            throw new Error('Symbol is required')
        }

        if (!this.apiKey) {
            throw new Error('Finnhub API key is required')
        }

        const url = `${this.baseUrl}/quote?symbol=${symbol.toUpperCase()}&token=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (data.error) {
            throw new Error(`Finnhub API Error: ${data.error}`)
        }

        if (!data.c) {
            throw new Error(`No data found for symbol ${symbol}`)
        }

        const currentPrice = data.c || 0
        const change = data.d || 0
        const changePercent = data.dp || 0
        const previousClose = data.pc || 0

        // Get additional company info
        const companyProfile = await this.getCompanyProfile(symbol)
        
        return this.transformToStandardFormat({
            symbol: symbol.toUpperCase(),
            name: companyProfile?.name || symbol,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            volume: 0, // Quote endpoint doesn't provide volume
            marketCap: companyProfile?.marketCapitalization || 0,
            sector: companyProfile?.finnhubIndustry || '',
            country: companyProfile?.country || 'US',
            currency: companyProfile?.currency || 'USD',
            lastUpdated: new Date().toISOString()
        })
    }

    /**
     * Get company profile data
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Company profile data
     */
    async getCompanyProfile(symbol) {
        if (!this.apiKey) {
            throw new Error('Finnhub API key is required')
        }

        try {
            const url = `${this.baseUrl}/stock/profile2?symbol=${symbol.toUpperCase()}&token=${this.apiKey}`
            const data = await this.makeRequest(url)
            return data
        } catch (error) {
            console.warn(`⚠️ Could not get company profile for ${symbol}:`, error.message)
            return null
        }
    }

    /**
     * Get stock quote data for multiple symbols
     * @param {Array<string>} symbols - Array of stock symbols
     * @returns {Promise<Array<Object>>} Array of standardized stock data
     */
    async getBatchQuotes(symbols) {
        if (!symbols || symbols.length === 0) {
            return []
        }

        // Finnhub doesn't support batch requests, make individual requests
        const results = []
        
        for (const symbol of symbols) {
            try {
                const quote = await this.getQuote(symbol)
                results.push(quote)
                
                // Small delay between requests to respect rate limits
                if (symbols.indexOf(symbol) < symbols.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
                }
            } catch (error) {
                console.error(`❌ Error getting quote for ${symbol}:`, error.message)
            }
        }

        return results
    }

    /**
     * Search for stocks by query
     * @param {string} query - Search query
     * @returns {Promise<Array<Object>>} Array of search results
     */
    async searchStocks(query) {
        if (!query || query.trim().length === 0) {
            return []
        }

        if (!this.apiKey) {
            throw new Error('Finnhub API key is required')
        }

        const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&token=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (data.error) {
            throw new Error(`Finnhub API Error: ${data.error}`)
        }

        const results = data.result || []
        
        return results.map(result => ({
            symbol: result.symbol,
            description: result.description,
            displaySymbol: result.displaySymbol,
            type: result.type
        }))
    }

    /**
     * Get historical price data
     * @param {string} symbol - Stock symbol
     * @param {string} period - Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
     * @returns {Promise<Array<Object>>} Historical price data
     */
    async getHistoricalData(symbol, period = '1y') {
        if (!symbol) {
            throw new Error('Symbol is required')
        }

        if (!this.apiKey) {
            throw new Error('Finnhub API key is required')
        }

        // Calculate date range based on period
        const now = new Date()
        let fromDate = new Date()
        
        switch (period) {
            case '1d':
                fromDate.setDate(now.getDate() - 1)
                break
            case '5d':
                fromDate.setDate(now.getDate() - 5)
                break
            case '1mo':
                fromDate.setMonth(now.getMonth() - 1)
                break
            case '3mo':
                fromDate.setMonth(now.getMonth() - 3)
                break
            case '6mo':
                fromDate.setMonth(now.getMonth() - 6)
                break
            case '1y':
                fromDate.setFullYear(now.getFullYear() - 1)
                break
            case '2y':
                fromDate.setFullYear(now.getFullYear() - 2)
                break
            case '5y':
                fromDate.setFullYear(now.getFullYear() - 5)
                break
            case '10y':
                fromDate.setFullYear(now.getFullYear() - 10)
                break
            default:
                fromDate.setFullYear(now.getFullYear() - 1)
        }

        const fromTimestamp = Math.floor(fromDate.getTime() / 1000)
        const toTimestamp = Math.floor(now.getTime() / 1000)
        
        // Determine resolution based on period
        let resolution = 'D' // Daily
        if (['1d', '5d'].includes(period)) {
            resolution = '1' // 1 minute (for intraday data)
        }

        const url = `${this.baseUrl}/stock/candle?symbol=${symbol.toUpperCase()}&resolution=${resolution}&from=${fromTimestamp}&to=${toTimestamp}&token=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (data.error) {
            throw new Error(`Finnhub API Error: ${data.error}`)
        }

        if (data.s !== 'ok' || !data.t) {
            throw new Error(`No historical data found for symbol ${symbol}`)
        }

        const historicalData = []
        for (let i = 0; i < data.t.length; i++) {
            const date = new Date(data.t[i] * 1000)
            historicalData.push({
                date: date.toISOString().split('T')[0],
                open: data.o[i] || 0,
                high: data.h[i] || 0,
                low: data.l[i] || 0,
                close: data.c[i] || 0,
                volume: data.v[i] || 0
            })
        }

        return historicalData
    }

    /**
     * Get company news
     * @param {string} symbol - Stock symbol
     * @param {number} days - Number of days back to fetch news (default: 7)
     * @returns {Promise<Array<Object>>} Company news articles
     */
    async getCompanyNews(symbol, days = 7) {
        if (!symbol) {
            throw new Error('Symbol is required')
        }

        if (!this.apiKey) {
            throw new Error('Finnhub API key is required')
        }

        const toDate = new Date()
        const fromDate = new Date()
        fromDate.setDate(toDate.getDate() - days)

        const from = fromDate.toISOString().split('T')[0]
        const to = toDate.toISOString().split('T')[0]

        const url = `${this.baseUrl}/company-news?symbol=${symbol.toUpperCase()}&from=${from}&to=${to}&token=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (data.error) {
            throw new Error(`Finnhub API Error: ${data.error}`)
        }

        return data.map(article => ({
            category: article.category,
            datetime: new Date(article.datetime * 1000).toISOString(),
            headline: article.headline,
            id: article.id,
            image: article.image,
            related: article.related,
            source: article.source,
            summary: article.summary,
            url: article.url
        }))
    }

    /**
     * Get market status
     * @param {string} exchange - Exchange code (default: 'US')
     * @returns {Promise<Object>} Market status information
     */
    async getMarketStatus(exchange = 'US') {
        if (!this.apiKey) {
            throw new Error('Finnhub API key is required')
        }

        const url = `${this.baseUrl}/stock/market-status?exchange=${exchange}&token=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (data.error) {
            throw new Error(`Finnhub API Error: ${data.error}`)
        }

        return {
            exchange: data.exchange,
            isOpen: data.isOpen,
            session: data.session,
            timezone: data.timezone,
            t: data.t
        }
    }

    /**
     * Get provider information
     * @returns {Object} Provider details
     */
    getProviderInfo() {
        return {
            ...super.getProviderInfo(),
            description: 'Real-time stock market data API with comprehensive coverage',
            website: 'https://finnhub.io',
            documentation: 'https://finnhub.io/docs/api',
            signupUrl: 'https://finnhub.io/register',
            features: [
                'Real-time stock quotes',
                'Historical price data',
                'Company profiles and financials',
                'Stock news',
                'Market status',
                'Symbol search',
                'Technical indicators',
                'Alternative data'
            ],
            limitations: [
                '60 API requests per minute (free tier)',
                'API key required',
                'Rate limiting enforced',
                'Limited historical data on free tier'
            ],
            freeTierAvailable: true,
            apiKeyRequired: true,
            freeTierLimits: {
                requestsPerMinute: 60,
                requestsPerDay: 'Unlimited with rate limits',
                features: 'Basic market data, limited historical data'
            },
            paidTiers: [
                {
                    name: 'Starter',
                    price: '$59.99/month',
                    requestsPerMinute: 300,
                    features: 'Extended historical data, real-time data'
                },
                {
                    name: 'Professional',
                    price: '$299.99/month',
                    requestsPerMinute: 1800,
                    features: 'Full market data, advanced analytics'
                }
            ]
        }
    }
}