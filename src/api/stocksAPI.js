import { setStyle, formatter, isValidNumber } from "./helpers.js";
import { 
    MarketDataManager, 
    FieldTranslator, 
    ColumnConfigHelper, 
    stockFields 
} from "./market-data/index.js";

// Initialize market data manager (configuration will come from settings)
let marketDataManager = null;

/**
 * Test connectivity for a single provider
 * @param {string} providerKey - The provider key to test
 * @returns {Promise<Object>} Test result for the specific provider
 */
async function testSingleProviderConnectivity(providerKey) {
    console.log(`🧪 Testing connectivity for single provider: ${providerKey}`);
    
    try {
        const manager = getMarketDataManager();
        const providers = manager.getProviderInfo();
        
        if (!providers[providerKey]) {
            throw new Error(`Provider '${providerKey}' not found`);
        }
        
        const provider = manager.providers.get(providerKey);
        if (!provider) {
            throw new Error(`Provider '${providerKey}' not available`);
        }

        console.log(`🔍 Testing connectivity for ${provider.name}...`);
        
        try {
            // Try to get a quote directly to capture the actual error
            await provider.getQuote('AAPL');
            const result = {
                success: true,
                provider: provider.name,
                rateLimit: provider.getRateLimitInfo()
            };
            console.log(`✅ Single provider connectivity test completed for ${provider.name}`);
            return result;
        } catch (testError) {
            // Return the actual API error message
            const result = {
                success: false,
                error: testError.message,
                provider: provider.name,
                rateLimit: provider.getRateLimitInfo()
            };
            console.log(`❌ Single provider connectivity test failed for ${provider.name}: ${testError.message}`);
            return result;
        }
        
    } catch (error) {
        console.error(`❌ Single provider connectivity test failed for ${providerKey}:`, error.message);
        return {
            success: false,
            error: error.message,
            provider: providerKey
        };
    }
}

/**
 * Initialize the market data manager with configuration
 * @param {Object} config - Configuration object
 */
function initializeMarketData(config = {}) {
    console.log('🔄 Initializing market data manager...');
    
    const defaultConfig = {
        activeProvider: 'yahoo',
        fallbackEnabled: true,
        yahoo: { enabled: true },
        alphaVantage: { enabled: false, apiKey: null },
        finnhub: { enabled: false, apiKey: null },
        financialModelingPrep: { enabled: false, apiKey: null }
    };

    const mergedConfig = { ...defaultConfig, ...config };
    marketDataManager = new MarketDataManager(mergedConfig);
    
    console.log('✅ Market data manager initialized');
    return marketDataManager;
}

/**
 * Get the market data manager instance
 * @returns {MarketDataManager} Market data manager
 */
function getMarketDataManager() {
    if (!marketDataManager) {
        console.log('⚠️ Market data manager not initialized, using default configuration');
        return initializeMarketData();
    }
    return marketDataManager;
}

/**
 * Default stock symbols to display when no user selection is available
 */
const defaultStockSymbols = [
    'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX', 'ORCL', 'CRM'
];

/**
 * Stock table configuration using the new field translation system
 */
const stocks = {
    title: "Aktier: Marknadsöversikt",
    url: "",
    localForageConfig: {
        storeName: "stocks",
    },
    // Use English field names internally
    fields: [
        "symbol",
        "name", 
        "price",
        "change",
        "changePercent",
        "volume",
        "marketCap",
        "sector",
        "country",
        "provider"
    ],
    qTableConfig: {
        // Generate columns using the translation system
        columns: ColumnConfigHelper.createColumns([
            "symbol",
            "name",
            "price", 
            "change",
            "changePercent",
            "volume",
            "marketCap",
            "sector"
        ], {
            fieldDefinitions: stockFields,
            formatters: {
                symbol: (val) => val || '',
                name: (val) => val || '',
                price: (val) => {
                    if (!isValidNumber(val)) return '';
                    return `${parseFloat(val).toFixed(2)} $`;
                },
                change: (val) => {
                    if (!isValidNumber(val)) return '';
                    const num = parseFloat(val);
                    return `${num >= 0 ? '+' : ''}${num.toFixed(2)} $`;
                },
                changePercent: (val) => {
                    if (!isValidNumber(val)) return '';
                    const num = parseFloat(val);
                    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
                },
                volume: (val) => {
                    if (!isValidNumber(val)) return '';
                    return formatter.format(parseInt(val));
                },
                marketCap: (val) => {
                    if (!isValidNumber(val)) return '';
                    const num = parseFloat(val);
                    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T $`;
                    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B $`;
                    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M $`;
                    return formatter.format(num) + ' $';
                },
                sector: (val) => val || ''
            }
        }),
        visibleColumns: [
            "symbol",
            "name",
            "price",
            "change", 
            "changePercent",
            "volume",
            "marketCap",
            "sector"
        ],
    },
};

/**
 * Fund ownership data structure using English field names
 */
const stockOwnership = {
    title: "Fondägande",
    url: "",
    localForageConfig: {
        storeName: "stock-ownership",
    },
    // Use English field names internally
    fields: [
        "fundName",
        "ownershipPercent", 
        "fundAllocationPercent",
        "marketValue",
        "shareCount"
    ],
    qTableConfig: {
        // Generate columns using the translation system
        columns: ColumnConfigHelper.createColumns([
            "fundName",
            "ownershipPercent",
            "fundAllocationPercent", 
            "marketValue"
        ], {
            fieldDefinitions: {
                fundName: {
                    en: 'fundName',
                    sv: 'Fond_namn',
                    description: 'Name of the fund'
                },
                ownershipPercent: {
                    en: 'ownershipPercent',
                    sv: 'Ägarandel_procent',
                    description: 'Percentage of company owned by fund'
                },
                fundAllocationPercent: {
                    en: 'fundAllocationPercent',
                    sv: 'Andel_av_fondförmögenhet',
                    description: 'Percentage of fund assets allocated to this stock'
                },
                marketValue: {
                    en: 'marketValue',
                    sv: 'Marknadsvärde_innehav',
                    description: 'Market value of holdings'
                },
                shareCount: {
                    en: 'shareCount',
                    sv: 'Antal_aktier',
                    description: 'Number of shares held'
                }
            },
            formatters: {
                fundName: (val) => val || '',
                ownershipPercent: (val) => {
                    if (!isValidNumber(val)) return '';
                    return parseFloat(val).toFixed(2) + '%';
                },
                fundAllocationPercent: (val) => {
                    if (!isValidNumber(val)) return '';
                    return parseFloat(val).toFixed(2) + '%';
                },
                marketValue: (val) => {
                    if (!isValidNumber(val)) return '';
                    return formatter.format(parseInt(val)) + ' SEK';
                },
                shareCount: (val) => {
                    if (!isValidNumber(val)) return '';
                    return formatter.format(parseInt(val));
                }
            }
        }),
        visibleColumns: [
            "fundName",
            "ownershipPercent",
            "fundAllocationPercent",
            "marketValue"
        ],
    },
};

/**
 * Fetch stock data using the market data providers
 * @param {Array<string>} symbols - Optional array of symbols to fetch
 * @returns {Promise<Array<Object>>} Array of stock data with Swedish field names for UI
 */
async function fetchStockData(symbols = null) {
    console.log('🌐 Fetching stock data from market data providers');
    
    try {
        const manager = getMarketDataManager();
        const symbolsToFetch = symbols || defaultStockSymbols;
        
        console.log('🔍 Fetching data for symbols:', symbolsToFetch);
        
        // Fetch data from providers (returns English field names)
        const stockData = await manager.getBatchQuotes(symbolsToFetch);
        
        console.log('✅ Received stock data:', stockData.length, 'stocks');
        
        // Transform to Swedish field names for UI compatibility
        const translatedData = FieldTranslator.translateToSwedish(stockData, stockFields);
        
        console.log('🔄 Translated stock data for UI display');
        
        return translatedData;
        
    } catch (error) {
        console.error('❌ Failed to fetch stock data:', error.message);
        
        // Return empty array on error rather than throwing
        // The UI should handle empty data gracefully
        return [];
    }
}

/**
 * Search for stocks using market data providers
 * @param {string} query - Search query
 * @returns {Promise<Array<Object>>} Array of search results
 */
async function searchStocks(query) {
    console.log('🔍 Searching for stocks:', query);
    
    try {
        const manager = getMarketDataManager();
        const results = await manager.searchStocks(query);
        
        console.log('✅ Found', results.length, 'search results');
        return results;
        
    } catch (error) {
        console.error('❌ Failed to search stocks:', error.message);
        return [];
    }
}

/**
 * Get historical data for a stock
 * @param {string} symbol - Stock symbol
 * @param {string} period - Time period
 * @returns {Promise<Array<Object>>} Historical price data
 */
async function getHistoricalData(symbol, period = '1y') {
    console.log('📈 Fetching historical data for:', symbol, period);
    
    try {
        const manager = getMarketDataManager();
        const data = await manager.getHistoricalData(symbol, period);
        
        console.log('✅ Received', data.length, 'historical data points');
        return data;
        
    } catch (error) {
        console.error('❌ Failed to fetch historical data:', error.message);
        return [];
    }
}

/**
 * Test connectivity to all configured providers
 * @returns {Promise<Object>} Test results
 */
async function testProviderConnectivity() {
    console.log('🧪 Testing provider connectivity...');
    
    try {
        const manager = getMarketDataManager();
        const results = await manager.testAllProviders();
        
        console.log('✅ Provider connectivity test completed');
        return results;
        
    } catch (error) {
        console.error('❌ Provider connectivity test failed:', error.message);
        return {};
    }
}

/**
 * Get provider usage statistics
 * @returns {Object} Usage statistics for all providers
 */
function getProviderUsageStats() {
    try {
        const manager = getMarketDataManager();
        return manager.getUsageStatistics();
    } catch (error) {
        console.error('❌ Failed to get provider usage stats:', error.message);
        return {};
    }
}

/**
 * Update market data provider configuration
 * @param {Object} config - New configuration
 */
function updateMarketDataConfig(config) {
    console.log('🔧 Updating market data configuration');
    
    try {
        // Reinitialize with new configuration
        initializeMarketData(config);
        console.log('✅ Market data configuration updated');
    } catch (error) {
        console.error('❌ Failed to update market data configuration:', error.message);
        throw error;
    }
}

/**
 * Generate mock fund ownership data for a given stock
 * This is still mock data - in production, this would cross-reference with actual fund holdings
 * @param {string} stockSymbol - Stock symbol
 * @param {string} stockISIN - Stock ISIN (optional)
 * @returns {Array<Object>} Array of fund ownership data with Swedish field names
 */
function generateMockOwnership(stockSymbol, stockISIN) {
    const mockFunds = [
        "Avanza Zero",
        "SPP Aktiefond USA",
        "Länsförsäkringar USA Indexnära",
        "Swedbank Robur Ny Teknik",
        "Handelsbanken Amerika Index",
        "SEB Global Indexfond",
    ];

    const ownership = [];
    const numOwners = Math.floor(Math.random() * 4) + 1; // 1-4 owners
    
    for (let i = 0; i < numOwners; i++) {
        const fundName = mockFunds[Math.floor(Math.random() * mockFunds.length)];
        if (ownership.find(o => o.fundName === fundName)) continue; // Avoid duplicates
        
        const ownershipPercent = Math.random() * 15; // 0-15% ownership
        const fundPercent = Math.random() * 8; // 0-8% of fund assets
        
        // Create data with English field names first
        const ownershipData = {
            fundName: fundName,
            ownershipPercent: ownershipPercent,
            fundAllocationPercent: fundPercent,
            marketValue: Math.floor(Math.random() * 500000000), // Random market value
            shareCount: Math.floor(Math.random() * 1000000), // Random number of shares
        };
        
        // Translate to Swedish field names for UI compatibility
        const translatedOwnership = FieldTranslator.translateToSwedish(ownershipData, {
            fundName: { en: 'fundName', sv: 'Fond_namn' },
            ownershipPercent: { en: 'ownershipPercent', sv: 'Ägarandel_procent' },
            fundAllocationPercent: { en: 'fundAllocationPercent', sv: 'Andel_av_fondförmögenhet' },
            marketValue: { en: 'marketValue', sv: 'Marknadsvärde_innehav' },
            shareCount: { en: 'shareCount', sv: 'Antal_aktier' }
        });
        
        ownership.push(translatedOwnership);
    }
    
    return ownership;
}

// Export the main functions and configuration objects
export { 
    initializeMarketData,
    getMarketDataManager,
    updateMarketDataConfig,
    stocks, 
    stockOwnership, 
    fetchStockData, 
    searchStocks,
    getHistoricalData,
    testProviderConnectivity,
    testSingleProviderConnectivity,
    getProviderUsageStats,
    generateMockOwnership 
};