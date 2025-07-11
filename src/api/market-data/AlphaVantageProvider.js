import { BaseMarketDataProvider } from './BaseMarketDataProvider.js'

/**
 * Alpha Vantage API provider
 * Requires API key, has free tier with 5 calls per minute, 500 calls per day
 */
export class AlphaVantageProvider extends BaseMarketDataProvider {
    constructor(config = {}) {
        super({
            name: 'Alpha Vantage',
            baseUrl: 'https://www.alphavantage.co/query',
            rateLimit: {
                requestsPerMinute: 5,
                requestsPerDay: 500
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
            throw new Error('Alpha Vantage API key is required')
        }

        const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol.toUpperCase()}&apikey=${this.apiKey}`
        const data = await this.makeRequest(url)

        console.log('🔍 Alpha Vantage API response:', JSON.stringify(data, null, 2))
        console.log('🔍 Global Quote content:', JSON.stringify(data['Global Quote'], null, 2))
        console.log('🔍 API Key being used:', this.apiKey)

        // Check for various error conditions
        if (data['Error Message']) {
            throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`)
        }

        if (data['Note']) {
            throw new Error('Alpha Vantage API rate limit exceeded')
        }

        // Check for invalid API key response (premium endpoint message)
        if (data['Information']) {
            throw new Error(`Alpha Vantage API Error: ${data['Information']}`)
        }

        // For invalid API keys, Alpha Vantage still returns data but may have restrictions
        // Let's check if this looks like a demo/limited response by validating the API key format
        if (this.apiKey && this.apiKey.length < 16) {
            // Alpha Vantage API keys are typically 16+ characters
            throw new Error('Invalid Alpha Vantage API key format - API keys should be 16+ characters')
        }

        // Additional check: if API key contains only simple characters, it's likely invalid
        if (this.apiKey && !/^[A-Z0-9]{16,}$/i.test(this.apiKey)) {
            throw new Error('Invalid Alpha Vantage API key format - should contain only alphanumeric characters')
        }

        // Check if the response is completely empty or invalid
        if (!data || Object.keys(data).length === 0) {
            throw new Error('Empty response from Alpha Vantage API - possibly invalid API key')
        }

        const quote = data['Global Quote']
        if (!quote || Object.keys(quote).length === 0) {
            // If there's no Global Quote and no error message, it might be an invalid API key
            throw new Error('Invalid response from Alpha Vantage API - possibly invalid API key or unsupported symbol')
        }

        // Check if all the quote values are empty or "0.0000" (common for invalid API keys)
        const price = quote['05. price']
        const quoteSymbol = quote['01. symbol']
        
        console.log('🔍 Quote price:', price, 'Quote symbol:', quoteSymbol)
        
        if (!price || price === '0.0000' || !quoteSymbol) {
            throw new Error('Alpha Vantage API returned empty data - likely invalid API key')
        }

        const currentPrice = parseFloat(quote['05. price']) || 0
        const change = parseFloat(quote['09. change']) || 0
        const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0

        return this.transformToStandardFormat({
            symbol: quote['01. symbol'],
            name: quote['01. symbol'], // Alpha Vantage doesn't provide company name in quote
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            volume: parseInt(quote['06. volume']) || 0,
            marketCap: 0, // Not provided in basic quote
            sector: '',
            country: 'US',
            currency: 'USD',
            lastUpdated: quote['07. latest trading day']
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

        // Alpha Vantage doesn't support batch requests, so we need to make individual requests
        // With rate limiting, we need to be careful about the number of requests
        const results = []
        
        for (const symbol of symbols) {
            try {
                const quote = await this.getQuote(symbol)
                results.push(quote)
                
                // Add delay between requests to respect rate limits (5 per minute)
                if (symbols.indexOf(symbol) < symbols.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 12000)) // 12 seconds between requests
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
            throw new Error('Alpha Vantage API key is required')
        }

        const url = `${this.baseUrl}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (data['Error Message']) {
            throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`)
        }

        if (data['Note']) {
            throw new Error('Alpha Vantage API rate limit exceeded')
        }

        const matches = data['bestMatches'] || []
        
        return matches.map(match => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
            type: match['3. type'],
            region: match['4. region'],
            marketOpen: match['5. marketOpen'],
            marketClose: match['6. marketClose'],
            timezone: match['7. timezone'],
            currency: match['8. currency'],
            matchScore: parseFloat(match['9. matchScore']) || 0
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
            throw new Error('Alpha Vantage API key is required')
        }

        // Alpha Vantage has different functions for different time ranges
        let functionName = 'TIME_SERIES_DAILY'
        let outputSize = 'compact' // last 100 data points
        
        if (['5y', '10y', 'max'].includes(period)) {
            outputSize = 'full' // up to 20 years of data
        }

        const url = `${this.baseUrl}?function=${functionName}&symbol=${symbol.toUpperCase()}&outputsize=${outputSize}&apikey=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (data['Error Message']) {
            throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`)
        }

        if (data['Note']) {
            throw new Error('Alpha Vantage API rate limit exceeded')
        }

        const timeSeries = data['Time Series (Daily)']
        if (!timeSeries) {
            throw new Error(`No historical data found for symbol ${symbol}`)
        }

        const historicalData = []
        const dates = Object.keys(timeSeries).sort()

        // Filter based on period
        const now = new Date()
        let startDate = new Date()
        
        switch (period) {
            case '1d':
                startDate.setDate(now.getDate() - 1)
                break
            case '5d':
                startDate.setDate(now.getDate() - 5)
                break
            case '1mo':
                startDate.setMonth(now.getMonth() - 1)
                break
            case '3mo':
                startDate.setMonth(now.getMonth() - 3)
                break
            case '6mo':
                startDate.setMonth(now.getMonth() - 6)
                break
            case '1y':
                startDate.setFullYear(now.getFullYear() - 1)
                break
            case '2y':
                startDate.setFullYear(now.getFullYear() - 2)
                break
            case '5y':
                startDate.setFullYear(now.getFullYear() - 5)
                break
            case '10y':
                startDate.setFullYear(now.getFullYear() - 10)
                break
            default:
                startDate = new Date('1900-01-01') // Include all data
        }

        for (const date of dates) {
            if (new Date(date) >= startDate) {
                const dayData = timeSeries[date]
                historicalData.push({
                    date: date,
                    open: parseFloat(dayData['1. open']) || 0,
                    high: parseFloat(dayData['2. high']) || 0,
                    low: parseFloat(dayData['3. low']) || 0,
                    close: parseFloat(dayData['4. close']) || 0,
                    volume: parseInt(dayData['5. volume']) || 0
                })
            }
        }

        return historicalData
    }

    /**
     * Get company overview data
     * @param {string} symbol - Stock symbol
     * @returns {Promise<Object>} Company overview data
     */
    async getCompanyOverview(symbol) {
        if (!symbol) {
            throw new Error('Symbol is required')
        }

        if (!this.apiKey) {
            throw new Error('Alpha Vantage API key is required')
        }

        const url = `${this.baseUrl}?function=OVERVIEW&symbol=${symbol.toUpperCase()}&apikey=${this.apiKey}`
        const data = await this.makeRequest(url)

        if (data['Error Message']) {
            throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`)
        }

        if (data['Note']) {
            throw new Error('Alpha Vantage API rate limit exceeded')
        }

        return {
            symbol: data.Symbol,
            name: data.Name,
            description: data.Description,
            exchange: data.Exchange,
            currency: data.Currency,
            country: data.Country,
            sector: data.Sector,
            industry: data.Industry,
            marketCap: parseFloat(data.MarketCapitalization) || 0,
            peRatio: parseFloat(data.PERatio) || 0,
            pegRatio: parseFloat(data.PEGRatio) || 0,
            bookValue: parseFloat(data.BookValue) || 0,
            dividendPerShare: parseFloat(data.DividendPerShare) || 0,
            dividendYield: parseFloat(data.DividendYield) || 0,
            eps: parseFloat(data.EPS) || 0,
            revenuePerShareTTM: parseFloat(data.RevenuePerShareTTM) || 0,
            profitMargin: parseFloat(data.ProfitMargin) || 0,
            operatingMarginTTM: parseFloat(data.OperatingMarginTTM) || 0,
            returnOnAssetsTTM: parseFloat(data.ReturnOnAssetsTTM) || 0,
            returnOnEquityTTM: parseFloat(data.ReturnOnEquityTTM) || 0,
            revenueTTM: parseFloat(data.RevenueTTM) || 0,
            grossProfitTTM: parseFloat(data.GrossProfitTTM) || 0,
            dilutedEPSTTM: parseFloat(data.DilutedEPSTTM) || 0,
            quarterlyEarningsGrowthYOY: parseFloat(data.QuarterlyEarningsGrowthYOY) || 0,
            quarterlyRevenueGrowthYOY: parseFloat(data.QuarterlyRevenueGrowthYOY) || 0,
            analystTargetPrice: parseFloat(data.AnalystTargetPrice) || 0,
            trailingPE: parseFloat(data.TrailingPE) || 0,
            forwardPE: parseFloat(data.ForwardPE) || 0,
            priceToSalesRatioTTM: parseFloat(data.PriceToSalesRatioTTM) || 0,
            priceToBookRatio: parseFloat(data.PriceToBookRatio) || 0,
            evToRevenue: parseFloat(data.EVToRevenue) || 0,
            evToEBITDA: parseFloat(data.EVToEBITDA) || 0,
            beta: parseFloat(data.Beta) || 0,
            week52High: parseFloat(data['52WeekHigh']) || 0,
            week52Low: parseFloat(data['52WeekLow']) || 0,
            movingAverage50Day: parseFloat(data['50DayMovingAverage']) || 0,
            movingAverage200Day: parseFloat(data['200DayMovingAverage']) || 0,
            sharesOutstanding: parseInt(data.SharesOutstanding) || 0,
            sharesFloat: parseInt(data.SharesFloat) || 0,
            sharesShort: parseInt(data.SharesShort) || 0,
            sharesShortPriorMonth: parseInt(data.SharesShortPriorMonth) || 0,
            shortRatio: parseFloat(data.ShortRatio) || 0,
            shortPercentOutstanding: parseFloat(data.ShortPercentOutstanding) || 0,
            shortPercentFloat: parseFloat(data.ShortPercentFloat) || 0,
            percentInsiders: parseFloat(data.PercentInsiders) || 0,
            percentInstitutions: parseFloat(data.PercentInstitutions) || 0,
            forwardAnnualDividendRate: parseFloat(data.ForwardAnnualDividendRate) || 0,
            forwardAnnualDividendYield: parseFloat(data.ForwardAnnualDividendYield) || 0,
            payoutRatio: parseFloat(data.PayoutRatio) || 0,
            dividendDate: data.DividendDate,
            exDividendDate: data.ExDividendDate,
            lastSplitFactor: data.LastSplitFactor,
            lastSplitDate: data.LastSplitDate
        }
    }

    /**
     * Get provider information
     * @returns {Object} Provider details
     */
    getProviderInfo() {
        return {
            ...super.getProviderInfo(),
            description: 'Professional-grade financial market data API with free tier',
            website: 'https://www.alphavantage.co',
            documentation: 'https://www.alphavantage.co/documentation/',
            signupUrl: 'https://www.alphavantage.co/support/#api-key',
            features: [
                'Real-time and historical stock data',
                'Company fundamentals',
                'Technical indicators',
                'Forex and crypto data',
                'Economic indicators',
                'Symbol search'
            ],
            limitations: [
                '5 API requests per minute',
                '500 API requests per day (free tier)',
                'API key required',
                'Rate limiting strictly enforced'
            ],
            freeTierAvailable: true,
            apiKeyRequired: true,
            freeTierLimits: {
                requestsPerMinute: 5,
                requestsPerDay: 500,
                features: 'All features available with rate limits'
            },
            paidTiers: [
                {
                    name: 'Premium',
                    price: '$49.99/month',
                    requestsPerMinute: 75,
                    requestsPerDay: 15000,
                    features: 'Higher rate limits, priority support'
                }
            ]
        }
    }
}