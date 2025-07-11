import { BaseMarketDataProvider } from './BaseMarketDataProvider.js'

/**
 * Yahoo Finance API provider
 * Uses public Yahoo Finance API endpoints
 * No API key required but has rate limits
 */
export class YahooFinanceProvider extends BaseMarketDataProvider {
    constructor(config = {}) {
        super({
            name: 'Yahoo Finance',
            baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
            rateLimit: {
                requestsPerMinute: 100,
                requestsPerDay: 2000
            },
            freeTierAvailable: true,
            ...config
        })
    }

    requiresApiKey() {
        return false
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

        const url = `${this.baseUrl}/${symbol.toUpperCase()}`
        const data = await this.makeRequest(url)

        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            throw new Error(`No data found for symbol ${symbol}`)
        }

        const result = data.chart.result[0]
        const meta = result.meta
        const quote = result.indicators?.quote?.[0]

        if (!meta || !quote) {
            throw new Error(`Invalid data structure for symbol ${symbol}`)
        }

        // Get the latest values from the arrays
        const latestIndex = quote.close.length - 1
        const currentPrice = quote.close[latestIndex]
        const previousClose = meta.previousClose || quote.close[latestIndex - 1] || currentPrice
        const change = currentPrice - previousClose
        const changePercent = previousClose ? (change / previousClose) * 100 : 0

        return this.transformToStandardFormat({
            symbol: meta.symbol,
            name: meta.longName || meta.shortName || meta.symbol,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            volume: quote.volume[latestIndex] || 0,
            marketCap: meta.marketCap || 0,
            sector: meta.sector || '',
            country: meta.exchangeTimezoneName?.includes('America') ? 'US' : 'Unknown',
            currency: meta.currency || 'USD',
            lastUpdated: new Date(meta.regularMarketTime * 1000).toISOString()
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

        // Yahoo Finance allows batch requests with comma-separated symbols
        const symbolString = symbols.map(s => s.toUpperCase()).join(',')
        const url = `${this.baseUrl}/${symbolString}`
        
        const data = await this.makeRequest(url)

        if (!data.chart || !data.chart.result) {
            throw new Error('No data found for symbols')
        }

        const results = []
        for (const result of data.chart.result) {
            try {
                const meta = result.meta
                const quote = result.indicators?.quote?.[0]

                if (!meta || !quote) {
                    console.warn(`⚠️ Invalid data structure for symbol ${result.meta?.symbol}`)
                    continue
                }

                const latestIndex = quote.close.length - 1
                const currentPrice = quote.close[latestIndex]
                const previousClose = meta.previousClose || quote.close[latestIndex - 1] || currentPrice
                const change = currentPrice - previousClose
                const changePercent = previousClose ? (change / previousClose) * 100 : 0

                results.push(this.transformToStandardFormat({
                    symbol: meta.symbol,
                    name: meta.longName || meta.shortName || meta.symbol,
                    price: currentPrice,
                    change: change,
                    changePercent: changePercent,
                    volume: quote.volume[latestIndex] || 0,
                    marketCap: meta.marketCap || 0,
                    sector: meta.sector || '',
                    country: meta.exchangeTimezoneName?.includes('America') ? 'US' : 'Unknown',
                    currency: meta.currency || 'USD',
                    lastUpdated: new Date(meta.regularMarketTime * 1000).toISOString()
                }))
            } catch (error) {
                console.error(`❌ Error processing symbol ${result.meta?.symbol}:`, error.message)
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

        // Yahoo Finance search endpoint
        const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&enableFuzzyQuery=false`
        
        const data = await this.makeRequest(searchUrl)

        if (!data.quotes) {
            return []
        }

        return data.quotes
            .filter(quote => quote.typeDisp === 'Equity') // Only stocks
            .map(quote => ({
                symbol: quote.symbol,
                name: quote.longname || quote.shortname,
                exchange: quote.exchange,
                sector: quote.sector || '',
                industry: quote.industry || '',
                country: quote.region || 'US'
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

        // Convert period to Yahoo Finance format
        const periodMapping = {
            '1d': '1d',
            '5d': '5d',
            '1mo': '1mo',
            '3mo': '3mo',
            '6mo': '6mo',
            '1y': '1y',
            '2y': '2y',
            '5y': '5y',
            '10y': '10y',
            'ytd': 'ytd',
            'max': 'max'
        }

        const yahooInterval = periodMapping[period] || '1y'
        const url = `${this.baseUrl}/${symbol.toUpperCase()}?range=${yahooInterval}&interval=1d`
        
        const data = await this.makeRequest(url)

        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            throw new Error(`No historical data found for symbol ${symbol}`)
        }

        const result = data.chart.result[0]
        const timestamps = result.timestamp
        const quotes = result.indicators?.quote?.[0]

        if (!timestamps || !quotes) {
            throw new Error(`Invalid historical data structure for symbol ${symbol}`)
        }

        const historicalData = []
        for (let i = 0; i < timestamps.length; i++) {
            if (quotes.close[i] !== null) {
                historicalData.push({
                    date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                    open: quotes.open[i] || 0,
                    high: quotes.high[i] || 0,
                    low: quotes.low[i] || 0,
                    close: quotes.close[i] || 0,
                    volume: quotes.volume[i] || 0
                })
            }
        }

        return historicalData
    }

    /**
     * Get provider information
     * @returns {Object} Provider details
     */
    getProviderInfo() {
        return {
            ...super.getProviderInfo(),
            description: 'Free stock data from Yahoo Finance with rate limits',
            website: 'https://finance.yahoo.com',
            documentation: 'https://rapidapi.com/apidojo/api/yahoo-finance1/',
            features: [
                'Real-time stock quotes',
                'Historical price data',
                'Stock search',
                'Market data for global exchanges',
                'No API key required'
            ],
            limitations: [
                '2000 requests per day',
                '100 requests per minute',
                'No guaranteed uptime',
                'Rate limiting enforced'
            ],
            freeTierAvailable: true,
            apiKeyRequired: false
        }
    }
}