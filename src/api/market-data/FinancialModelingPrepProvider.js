import { BaseMarketDataProvider } from './BaseMarketDataProvider.js'

/**
 * Financial Modeling Prep API provider
 * Requires API key, has free tier with 250 calls per day
 */
export class FinancialModelingPrepProvider extends BaseMarketDataProvider {
    constructor(config = {}) {
        super({
            name: 'Financial Modeling Prep',
            baseUrl: 'https://financialmodelingprep.com/api/v3',
            rateLimit: {
                requestsPerMinute: 30, // Conservative estimate
                requestsPerDay: 250
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
            throw new Error('Financial Modeling Prep API key is required')
        }

        const url = `${this.baseUrl}/quote/${symbol.toUpperCase()}?apikey=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (!data || data.length === 0) {
            throw new Error(`No data found for symbol ${symbol}`)
        }

        if (data.error) {
            throw new Error(`Financial Modeling Prep API Error: ${data.error}`)
        }

        const quote = data[0]
        const currentPrice = quote.price || 0
        const change = quote.change || 0
        const changePercent = quote.changesPercentage || 0

        return this.transformToStandardFormat({
            symbol: quote.symbol,
            name: quote.name || quote.symbol,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            volume: quote.volume || 0,
            marketCap: quote.marketCap || 0,
            sector: quote.sector || '',
            country: 'US',
            currency: 'USD',
            lastUpdated: new Date().toISOString()
        })
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

        if (!this.apiKey) {
            throw new Error('Financial Modeling Prep API key is required')
        }

        // FMP supports batch requests with comma-separated symbols
        const symbolString = symbols.map(s => s.toUpperCase()).join(',')
        const url = `${this.baseUrl}/quote/${symbolString}?apikey=${this.apiKey}`
        
        const data = await this.makeRequest(url)

        if (!data || !Array.isArray(data)) {
            throw new Error('No data found for symbols')
        }

        if (data.error) {
            throw new Error(`Financial Modeling Prep API Error: ${data.error}`)
        }

        const results = []
        for (const quote of data) {
            try {
                const currentPrice = quote.price || 0
                const change = quote.change || 0
                const changePercent = quote.changesPercentage || 0

                results.push(this.transformToStandardFormat({
                    symbol: quote.symbol,
                    name: quote.name || quote.symbol,
                    price: currentPrice,
                    change: change,
                    changePercent: changePercent,
                    volume: quote.volume || 0,
                    marketCap: quote.marketCap || 0,
                    sector: quote.sector || '',
                    country: 'US',
                    currency: 'USD',
                    lastUpdated: new Date().toISOString()
                }))
            } catch (error) {
                console.error(`❌ Error processing quote for ${quote.symbol}:`, error.message)
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
            throw new Error('Financial Modeling Prep API key is required')
        }

        const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}&limit=10&apikey=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (!data || !Array.isArray(data)) {
            return []
        }

        if (data.error) {
            throw new Error(`Financial Modeling Prep API Error: ${data.error}`)
        }

        return data.map(result => ({
            symbol: result.symbol,
            name: result.name,
            currency: result.currency,
            stockExchange: result.stockExchange,
            exchangeShortName: result.exchangeShortName
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
            throw new Error('Financial Modeling Prep API key is required')
        }

        // Calculate date range and determine API endpoint
        const now = new Date()
        let fromDate = new Date()
        let endpoint = 'historical-price-full'
        
        switch (period) {
            case '1d':
            case '5d':
                // Use intraday data for short periods
                endpoint = 'historical-chart/1day'
                fromDate.setDate(now.getDate() - (period === '1d' ? 1 : 5))
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

        const from = fromDate.toISOString().split('T')[0]
        const to = now.toISOString().split('T')[0]

        let url
        if (endpoint === 'historical-chart/1day') {
            url = `${this.baseUrl}/${endpoint}/${symbol.toUpperCase()}?apikey=${this.apiKey}`
        } else {
            url = `${this.baseUrl}/${endpoint}/${symbol.toUpperCase()}?from=${from}&to=${to}&apikey=${this.apiKey}`
        }

        const data = await this.makeRequest(url)

        if (data.error) {
            throw new Error(`Financial Modeling Prep API Error: ${data.error}`)
        }

        let historicalData = []
        
        if (endpoint === 'historical-chart/1day') {
            // Intraday data
            if (Array.isArray(data)) {
                historicalData = data
                    .filter(item => new Date(item.date) >= fromDate)
                    .map(item => ({
                        date: item.date.split(' ')[0], // Extract date part
                        open: item.open || 0,
                        high: item.high || 0,
                        low: item.low || 0,
                        close: item.close || 0,
                        volume: item.volume || 0
                    }))
            }
        } else {
            // Daily historical data
            if (data.historical && Array.isArray(data.historical)) {
                historicalData = data.historical
                    .filter(item => new Date(item.date) >= fromDate)
                    .map(item => ({
                        date: item.date,
                        open: item.open || 0,
                        high: item.high || 0,
                        low: item.low || 0,
                        close: item.close || 0,
                        volume: item.volume || 0
                    }))
                    .reverse() // FMP returns data in descending order
            }
        }

        return historicalData
    }

    /**
     * Get company profile
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Company profile data
     */
    async getCompanyProfile(symbol) {
        if (!symbol) {
            throw new Error('Symbol is required')
        }

        if (!this.apiKey) {
            throw new Error('Financial Modeling Prep API key is required')
        }

        const url = `${this.baseUrl}/profile/${symbol.toUpperCase()}?apikey=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (!data || data.length === 0) {
            throw new Error(`No profile data found for symbol ${symbol}`)
        }

        if (data.error) {
            throw new Error(`Financial Modeling Prep API Error: ${data.error}`)
        }

        const profile = data[0]
        return {
            symbol: profile.symbol,
            price: profile.price,
            beta: profile.beta,
            volAvg: profile.volAvg,
            mktCap: profile.mktCap,
            lastDiv: profile.lastDiv,
            range: profile.range,
            changes: profile.changes,
            companyName: profile.companyName,
            currency: profile.currency,
            cik: profile.cik,
            isin: profile.isin,
            cusip: profile.cusip,
            exchange: profile.exchange,
            exchangeShortName: profile.exchangeShortName,
            industry: profile.industry,
            website: profile.website,
            description: profile.description,
            ceo: profile.ceo,
            sector: profile.sector,
            country: profile.country,
            fullTimeEmployees: profile.fullTimeEmployees,
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            zip: profile.zip,
            dcfDiff: profile.dcfDiff,
            dcf: profile.dcf,
            image: profile.image,
            ipoDate: profile.ipoDate,
            defaultImage: profile.defaultImage,
            isEtf: profile.isEtf,
            isActivelyTrading: profile.isActivelyTrading,
            isAdr: profile.isAdr,
            isFund: profile.isFund
        }
    }

    /**
     * Get key metrics
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Key financial metrics
     */
    async getKeyMetrics(symbol) {
        if (!symbol) {
            throw new Error('Symbol is required')
        }

        if (!this.apiKey) {
            throw new Error('Financial Modeling Prep API key is required')
        }

        const url = `${this.baseUrl}/key-metrics/${symbol.toUpperCase()}?limit=1&apikey=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (!data || data.length === 0) {
            throw new Error(`No key metrics found for symbol ${symbol}`)
        }

        if (data.error) {
            throw new Error(`Financial Modeling Prep API Error: ${data.error}`)
        }

        return data[0]
    }

    /**
     * Get financial ratios
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Financial ratios
     */
    async getFinancialRatios(symbol) {
        if (!symbol) {
            throw new Error('Symbol is required')
        }

        if (!this.apiKey) {
            throw new Error('Financial Modeling Prep API key is required')
        }

        const url = `${this.baseUrl}/ratios/${symbol.toUpperCase()}?limit=1&apikey=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (!data || data.length === 0) {
            throw new Error(`No financial ratios found for symbol ${symbol}`)
        }

        if (data.error) {
            throw new Error(`Financial Modeling Prep API Error: ${data.error}`)
        }

        return data[0]
    }

    /**
     * Get provider information
     * @returns {Object} Provider details
     */
    getProviderInfo() {
        return {
            ...super.getProviderInfo(),
            description: 'Professional financial data API with comprehensive fundamental data',
            website: 'https://financialmodelingprep.com',
            documentation: 'https://financialmodelingprep.com/developer/docs',
            signupUrl: 'https://financialmodelingprep.com/developer/docs#registration',
            features: [
                'Real-time stock quotes',
                'Historical price data',
                'Company profiles and financials',
                'Financial ratios and metrics',
                'Financial statements',
                'Market data',
                'Batch quote requests',
                'Symbol search'
            ],
            limitations: [
                '250 API requests per day (free tier)',
                'API key required',
                'Rate limiting enforced',
                'Limited to US stocks on free tier'
            ],
            freeTierAvailable: true,
            apiKeyRequired: true,
            freeTierLimits: {
                requestsPerDay: 250,
                features: 'Basic market data, limited historical data'
            },
            paidTiers: [
                {
                    name: 'Starter',
                    price: '$14/month',
                    requestsPerDay: 10000,
                    features: 'Extended historical data, real-time data'
                },
                {
                    name: 'Professional',
                    price: '$49/month',
                    requestsPerDay: 100000,
                    features: 'Full market data, advanced analytics'
                },
                {
                    name: 'Enterprise',
                    price: '$199/month',
                    requestsPerDay: 1000000,
                    features: 'Unlimited access, premium support'
                }
            ]
        }
    }
}