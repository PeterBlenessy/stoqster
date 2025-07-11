# Market Data API Architecture

This document describes the comprehensive market data API architecture implemented in Stoqster, designed to support multiple financial data providers with fallback capabilities and standardized data formats.

## Overview

The market data system uses a modular architecture with the following key components:

- **Base Provider Class**: Abstract base class defining the standard interface
- **Provider Implementations**: Specialized classes for each API provider
- **Manager Class**: Orchestrates multiple providers with fallback support
- **Field Translation System**: Maps English data fields to Swedish UI labels
- **Configuration Management**: Persistent settings for API keys and preferences

## Architecture Components

### 1. Base Provider Class (`BaseMarketDataProvider`)

The foundation class that all market data providers extend:

```javascript
import { BaseMarketDataProvider } from './market-data/BaseMarketDataProvider.js'

class MyProvider extends BaseMarketDataProvider {
    constructor(config) {
        super({
            name: 'My Provider',
            baseUrl: 'https://api.example.com',
            rateLimit: { requestsPerMinute: 60, requestsPerDay: 1000 },
            ...config
        })
    }
    
    async getQuote(symbol) {
        // Implementation specific to provider
    }
}
```

**Key Features:**
- Rate limiting and usage tracking
- Standardized error handling
- Configuration validation
- HTTP request management
- Data transformation to standard format

### 2. Supported Providers

#### Yahoo Finance (`YahooFinanceProvider`)
- **API Key Required**: No
- **Free Tier**: Yes (2000 requests/day, 100/minute)
- **Features**: Real-time quotes, historical data, search
- **Rate Limits**: Conservative limits, no guaranteed uptime

#### Alpha Vantage (`AlphaVantageProvider`)
- **API Key Required**: Yes
- **Free Tier**: Yes (500 requests/day, 5/minute)
- **Features**: Professional market data, company fundamentals
- **Rate Limits**: Strictly enforced, requires careful usage

#### Finnhub (`FinnhubProvider`)
- **API Key Required**: Yes
- **Free Tier**: Yes (60 requests/minute)
- **Features**: Real-time data, company profiles, news
- **Rate Limits**: Per-minute limits, good for frequent updates

#### Financial Modeling Prep (`FinancialModelingPrepProvider`)
- **API Key Required**: Yes
- **Free Tier**: Yes (250 requests/day)
- **Features**: Comprehensive financial data, batch requests
- **Rate Limits**: Daily limits, professional features

### 3. Market Data Manager (`MarketDataManager`)

Central orchestrator that manages multiple providers:

```javascript
import { MarketDataManager } from './market-data/MarketDataManager.js'

const manager = new MarketDataManager({
    activeProvider: 'yahoo',
    fallbackEnabled: true,
    yahoo: { enabled: true },
    alphaVantage: { enabled: true, apiKey: 'your-key' }
})

// Automatically tries providers in order with fallback
const stockData = await manager.getBatchQuotes(['AAPL', 'MSFT'])
```

**Key Features:**
- Automatic failover between providers
- Rate limit management across providers
- Provider health monitoring
- Configuration persistence
- Usage statistics tracking

### 4. Field Translation System (`FieldTranslator`)

Maps English data fields to Swedish UI labels:

```javascript
import { FieldTranslator, stockFields } from './market-data/FieldTranslator.js'

// English data structure from APIs
const englishData = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 175.43,
    change: 2.34,
    changePercent: 1.35
}

// Convert to Swedish field names for UI
const swedishData = FieldTranslator.translateToSwedish(englishData, stockFields)
// Result: { Symbol: 'AAPL', Namn: 'Apple Inc.', Pris: 175.43, ... }
```

**Benefits:**
- Clean separation of data structure and UI labels
- Consistent field naming across providers
- Easy localization support
- Backward compatibility with existing components

## Standard Data Format

All providers return data in a standardized English format:

```javascript
{
    symbol: 'AAPL',           // Stock ticker symbol
    name: 'Apple Inc.',       // Company name
    price: 175.43,           // Current price
    change: 2.34,            // Price change
    changePercent: 1.35,     // Change percentage
    volume: 52840000,        // Trading volume
    marketCap: 2750000000000, // Market capitalization
    sector: 'Technology',     // Industry sector
    country: 'US',           // Country
    currency: 'USD',         // Currency
    lastUpdated: '2024-01-15T10:30:00Z', // ISO timestamp
    provider: 'Yahoo Finance' // Data source
}
```

## Configuration Management

### Provider Configuration

Each provider can be individually configured:

```javascript
{
    activeProvider: 'yahoo',
    fallbackEnabled: true,
    yahoo: {
        enabled: true,
        apiKey: null // No API key required
    },
    alphaVantage: {
        enabled: true,
        apiKey: 'your-alpha-vantage-key'
    },
    finnhub: {
        enabled: false,
        apiKey: 'your-finnhub-key'
    },
    financialModelingPrep: {
        enabled: false,
        apiKey: 'your-fmp-key'
    }
}
```

### Settings UI Integration

The settings dialog includes a dedicated "Market Data APIs" tab with:

- **Provider Selection**: Choose active provider
- **API Key Management**: Secure input with visibility toggle
- **Connection Testing**: Verify API connectivity
- **Usage Monitoring**: Track rate limit usage
- **Provider Information**: Features, limits, documentation links

### Persistent Storage

Configuration is automatically saved to localStorage:

```javascript
// Configuration is saved as 'marketDataConfig' in localStorage
const config = JSON.parse(localStorage.getItem('marketDataConfig'))
```

## Rate Limiting and Usage Tracking

### Per-Provider Limits

Each provider tracks its own usage:

```javascript
provider.getRateLimitInfo()
// Returns: {
//     requestsPerMinute: 60,
//     requestsPerDay: 1000,
//     currentUsage: 45,
//     resetTime: 1642176000000
// }
```

### Automatic Rate Management

The system automatically:
- Prevents requests when limits are exceeded
- Switches to alternative providers when needed
- Resets counters after time periods
- Warns users when approaching limits

### Usage Statistics

Monitor usage across all providers:

```javascript
const stats = manager.getUsageStatistics()
// Returns usage, limits, and configuration for each provider
```

## Error Handling and Fallbacks

### Automatic Failover

When a provider fails, the system automatically tries alternatives:

1. Check if active provider can handle request
2. If rate limited or failed, try next configured provider
3. Continue until success or all providers exhausted
4. Return empty data gracefully if all fail

### Retry Logic

Implements exponential backoff for temporary failures:

```javascript
// Retry with increasing delays: 1s, 2s, 4s
async retryWithBackoff(fn, maxRetries = 3)
```

### Error Categories

- **Rate Limiting**: Switch to alternative provider
- **Authentication**: Clear API key, require reconfiguration
- **Network Issues**: Retry with backoff
- **Data Format**: Log error, return empty result

## Testing and Validation

### Connection Testing

Test all configured providers:

```javascript
const results = await manager.testAllProviders()
// Returns success/failure status for each provider
```

### Data Validation

Validate API responses against expected format:

```javascript
const validation = FieldTranslator.validateFields(data, ['symbol', 'name', 'price'])
// Returns: { valid: true, missing: [], present: [...] }
```

### Health Monitoring

Monitor provider health over time:
- Success/failure rates
- Response times
- Rate limit usage
- Error patterns

## Usage Examples

### Basic Stock Data Fetching

```javascript
import { fetchStockData } from '../api/stocksAPI.js'

// Fetch data for default symbols
const stocks = await fetchStockData()

// Fetch specific symbols
const specificStocks = await fetchStockData(['AAPL', 'MSFT', 'GOOGL'])
```

### Search Functionality

```javascript
import { searchStocks } from '../api/stocksAPI.js'

const results = await searchStocks('Apple')
// Returns array of matching stocks with symbol, name, exchange
```

### Historical Data

```javascript
import { getHistoricalData } from '../api/stocksAPI.js'

const history = await getHistoricalData('AAPL', '1y')
// Returns array of daily price data for past year
```

### Provider Management

```javascript
import { 
    initializeMarketData, 
    updateMarketDataConfig,
    testProviderConnectivity 
} from '../api/stocksAPI.js'

// Initialize with custom configuration
const manager = initializeMarketData({
    activeProvider: 'alphavantage',
    alphaVantage: { enabled: true, apiKey: 'your-key' }
})

// Update configuration
updateMarketDataConfig(newConfig)

// Test connectivity
const testResults = await testProviderConnectivity()
```

## Best Practices

### API Key Security

1. **Never hardcode API keys** in source code
2. **Store keys encrypted** in localStorage
3. **Use environment variables** for development
4. **Implement key rotation** for production
5. **Monitor for key exposure** in logs

### Rate Limit Management

1. **Monitor usage proactively** to avoid limits
2. **Implement request queuing** for high-volume scenarios
3. **Use provider priorities** based on current usage
4. **Cache responses** to reduce API calls
5. **Respect provider terms** of service

### Error Handling

1. **Always handle API failures** gracefully
2. **Provide user feedback** for configuration issues
3. **Log errors** for debugging without exposing keys
4. **Implement circuit breakers** for failing providers
5. **Test error scenarios** regularly

### Performance Optimization

1. **Batch requests** when possible
2. **Cache frequently requested data**
3. **Use efficient data structures**
4. **Minimize API calls** through smart caching
5. **Monitor response times** and optimize

## Troubleshooting

### Common Issues

#### Provider Not Working
1. Check API key configuration
2. Verify rate limits not exceeded
3. Test network connectivity
4. Check provider service status

#### Slow Performance
1. Monitor rate limits and usage
2. Check network connection
3. Verify efficient request patterns
4. Consider caching strategies

#### Data Inconsistencies
1. Verify field translation mappings
2. Check provider data format changes
3. Validate API response structure
4. Monitor error logs

### Debugging Tools

```javascript
// Enable debug logging
console.log('🌐 API Request:', { provider, symbol, timestamp })
console.log('✅ Success:', result)
console.log('❌ Error:', error.message)

// Check provider status
const stats = manager.getUsageStatistics()
console.table(stats)

// Test individual providers
const testResults = await manager.testAllProviders()
console.log('Provider Test Results:', testResults)
```

## Future Enhancements

### Planned Features

1. **Additional Providers**: IEX Cloud, Polygon, Quandl
2. **Advanced Caching**: Redis integration, TTL strategies
3. **Real-time Updates**: WebSocket connections
4. **Analytics Dashboard**: Usage patterns, cost optimization
5. **API Cost Tracking**: Monitor spending across providers

### Performance Improvements

1. **Request Deduplication**: Avoid duplicate API calls
2. **Smart Batching**: Optimize batch request sizes
3. **Predictive Caching**: Pre-fetch likely requests
4. **Load Balancing**: Distribute load across providers
5. **Circuit Breakers**: Advanced failure detection

### Security Enhancements

1. **API Key Encryption**: Stronger encryption at rest
2. **Audit Logging**: Track all API usage
3. **Access Controls**: User-based API limitations
4. **Key Rotation**: Automatic key renewal
5. **Compliance Tools**: GDPR, SOX compliance helpers

This architecture provides a robust, scalable foundation for market data integration while maintaining flexibility for future enhancements and provider additions.