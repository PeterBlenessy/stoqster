# API Integrations

This document describes the external API integrations used by Stoqster to fetch data about Swedish investment companies, real estate companies, funds, and international stock market data.

## Overview

Stoqster integrates with multiple data sources:

### Swedish Market Data
1. **IBIndex API** (ibindex.se) - Swedish investment companies
2. **FBIndex API** (fbindex.se) - Swedish real estate investment companies  
3. **FI API** (fi.se) - Swedish fund data from Finansinspektionen

### International Stock Market Data
4. **Market Data Providers** - Multi-provider stock market data system
   - Yahoo Finance (free, no API key)
   - Alpha Vantage (API key required, free tier available)
   - Finnhub (API key required, free tier available)
   - Financial Modeling Prep (API key required, free tier available)

All Swedish APIs use cookie-based authentication and require careful handling of CORS and encoding issues. Market data providers use various authentication methods and have different rate limits and capabilities.

## Individual API Documentation

For detailed information about each API integration, see:

### Swedish Market APIs
- **[IBIndex API Integration](api-integrations-ibi.md)** - Swedish investment companies data
- **[FBIndex API Integration](api-integrations-fbi.md)** - Real estate investment companies data  
- **[FI API Integration](api-integrations-fi.md)** - Swedish fund data from Finansinspektionen

### International Market Data APIs
- **[Market Data API Architecture](market-data-api-architecture.md)** - Multi-provider stock market data system with detailed provider documentation

### Purpose
Provides comprehensive data about Swedish investment companies including holdings, events, and performance metrics.

### Base URL
```
https://ibindex.se/ibi/
```

### Authentication
- **Method**: Cookie-based session tracking
- **Cookie Name**: `ibi-tracking`
- **Acquisition**: Automatic via initial page visit
- **Persistence**: Stored globally in API module

### Available Endpoints

#### Company Listings
```javascript
// Get all investment companies
const companies = await ibiRequestOptions('getCompanies')
```

#### Company Details
```javascript
// Get specific company information
const details = await ibiRequestOptions('getCompanyDetails', 'COMPANY_ID')
```

#### Holdings Data
```javascript
// Get company holdings
const holdings = await ibiRequestOptions('getHoldings', 'COMPANY_ID')
```

#### Events Calendar
```javascript
// Get company events
const events = await ibiRequestOptions('getEvents', 'COMPANY_ID')
```

#### Market Weights
```javascript
// Get market weight data
const weights = await ibiRequestOptions('getMarketWeights')
```

### Data Structure

#### Company Information
```json
{
  "productName": "Company Name",
  "product": "COMPANY_ID",
  "netAssetValue": 123.45,
  "netAssetValueRebatePremium": -5.2,
  "price": 117.89,
  "priceChangeDate": "2024-01-15",
  "totalReturn": 15.6,
  "volatility": 18.3
}
```

#### Holdings Data
```json
{
  "holdings": [
    {
      "name": "Holding Name",
      "percentage": 5.2,
      "value": 1234567,
      "currency": "SEK"
    }
  ]
}
```

### Request Configuration
```javascript
const options = {
  method: "POST",
  headers: {
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Cookie": trackingCookie,
    "Origin": "https://ibindex.se",
    "Referer": "https://ibindex.se/ibi/",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  },
  body: formData
}
```

### Error Handling
- **Authentication Failures**: Automatic cookie refresh
- **Rate Limiting**: Implement request delays
- **Network Errors**: Retry with exponential backoff
- **Data Validation**: Verify response structure

## FBIndex API Integration

### Purpose
Provides data about Swedish real estate investment companies and their holdings.

### Base URL
```
https://fbindex.se/fbi/
```

### Authentication
- **Method**: Cookie-based session tracking
- **Cookie Name**: `fbi-tracking`
- **Acquisition**: Automatic via initial page visit
- **Character Encoding**: ISO-8859-1 with automatic detection

### Available Endpoints

#### Company Information
```javascript
// Get real estate companies
const companies = await fbiRequestOptions('getCompanies')
```

#### Company Details
```javascript
// Get specific company details
const details = await fbiRequestOptions('getCompanyDetails', 'COMPANY_ID')
```

#### Holdings Data
```javascript
// Get company holdings
const holdings = await fbiRequestOptions('getHoldings', 'COMPANY_ID')
```

### Encoding Handling

The FBIndex API returns data in ISO-8859-1 encoding, which requires special handling:

```javascript
// Automatic encoding detection and conversion
const response = await fetch(url, options)
const buffer = await response.arrayBuffer()
const decoder = new TextDecoder('iso-8859-1')
const text = decoder.decode(buffer)
const data = JSON.parse(text)
```

### Data Structure

#### Company Information
```json
{
  "productName": "Real Estate Company Name",
  "product": "COMPANY_ID", 
  "netAssetValue": 234.56,
  "netAssetValueRebatePremium": -3.1,
  "price": 227.89,
  "totalReturn": 12.4,
  "dividend": 8.50
}
```

### Request Configuration
```javascript
const options = {
  method: "POST",
  headers: {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Cookie": trackingCookie,
    "Origin": "https://fbindex.se",
    "Referer": "https://fbindex.se/fbi/",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  },
  body: formData
}
```

## FI API Integration

### Purpose
Provides quarterly fund holdings data from Finansinspektionen (Swedish Financial Supervisory Authority).

### Base URL
```
https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/
```

### Data Format
- **Source**: ZIP archives containing XML files
- **Update Frequency**: Quarterly
- **File Structure**: One XML file per fund

### Data Processing Pipeline

#### 1. Download ZIP Archive
```javascript
const response = await fetch(downloadUrl, {
  method: "GET",
  headers: {
    "Accept": "application/zip",
    "Content-Type": "application/zip"
  }
})
const blob = await response.blob()
```

#### 2. Extract XML Files
```javascript
import JSZip from 'jszip'

const zip = await JSZip.loadAsync(blob)
const xmlFiles = []

zip.forEach((relativePath, file) => {
  if (relativePath.endsWith('.xml')) {
    xmlFiles.push(file)
  }
})
```

#### 3. Parse XML to JSON
```javascript
import X2JS from 'x2js'

const x2js = new X2JS()
for (const file of xmlFiles) {
  const xmlText = await file.async('text')
  const jsonData = x2js.xml2js(xmlText)
  // Process and store data
}
```

### Data Structure

#### Fund Information
```json
{
  "Fond_namn": "Fund Name",
  "Fond_ISIN-kod": "SE0001234567",
  "Fond_institutnummer": "123456",
  "Fondförmögenhet": 1000000000,
  "Förvaltningsavgift": {
    "UtanAndelsklasser": {
      "Förvaltningsavgift_fast": 1.5
    }
  },
  "FinansiellaInstrument": {
    "FinansielltInstrument": [
      {
        "Instrument_namn": "Holding Name",
        "Andel_av_fondförmögenhet": 5.2,
        "Marknadsvärde": 52000000
      }
    ]
  }
}
```

### Performance Metrics

#### Processing Times
- **Download**: ~400ms (varies by file size)
- **Blob Processing**: ~3000ms
- **ZIP Extraction**: ~10ms
- **XML Parsing**: 0.2-2ms per file
- **JSON Conversion**: 0.2-8ms per file

### Storage Strategy
- **Cache Duration**: 24 hours
- **Storage Method**: LocalForage with timestamp-based invalidation
- **Key Structure**: `fi-funds-{quarter}-{year}`

## Common Patterns

### Authentication Flow
```javascript
// 1. Check for existing cookie
if (!trackingCookie) {
  // 2. Visit main page to get cookie
  const response = await fetch(baseUrl, { method: "GET" })
  const setCookieHeader = response.headers.get('set-cookie')
  
  // 3. Extract and store cookie
  if (setCookieHeader) {
    const match = setCookieHeader.match(/tracking-cookie=([^;]+)/)
    if (match) {
      trackingCookie = `tracking-cookie=${match[1]}`
    }
  }
}

// 4. Use cookie in subsequent requests
const options = {
  headers: {
    "Cookie": trackingCookie,
    // ... other headers
  }
}
```

### Error Handling Pattern
```javascript
async function apiRequest(url, options) {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('✅ API request successful')
    return data
    
  } catch (error) {
    console.error('❌ API request failed:', {
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    })
    
    // Retry logic for specific errors
    if (error.message.includes('401') || error.message.includes('403')) {
      // Clear cookie and retry
      trackingCookie = null
      return apiRequest(url, options)
    }
    
    throw error
  }
}
```

### Caching Strategy
```javascript
// Check cache first
const cacheKey = `api-${endpoint}-${JSON.stringify(params)}`
const cached = await localforage.getItem(cacheKey)

if (cached && !isCacheExpired(cached.timestamp)) {
  console.log('📦 Using cached data')
  return cached.data
}

// Fetch fresh data
const data = await apiRequest(url, options)

// Cache with timestamp
await localforage.setItem(cacheKey, {
  data,
  timestamp: Date.now()
})

return data
```

## Rate Limiting and Best Practices

### Request Throttling
```javascript
// Implement request delays to avoid overwhelming servers
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function throttledRequest(url, options) {
  await delay(500) // 500ms delay between requests
  return fetch(url, options)
}
```

### Concurrent Request Management
```javascript
// Limit concurrent requests
const CONCURRENT_LIMIT = 3
const requestQueue = []
let activeRequests = 0

async function queuedRequest(url, options) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ url, options, resolve, reject })
    processQueue()
  })
}

async function processQueue() {
  if (activeRequests >= CONCURRENT_LIMIT || requestQueue.length === 0) {
    return
  }
  
  const { url, options, resolve, reject } = requestQueue.shift()
  activeRequests++
  
  try {
    const result = await fetch(url, options)
    resolve(result)
  } catch (error) {
    reject(error)
  } finally {
    activeRequests--
    processQueue()
  }
}
```

### Error Recovery
```javascript
async function resilientRequest(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, options)
    } catch (error) {
      console.warn(`⚠️ Request attempt ${attempt} failed:`, error.message)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Exponential backoff
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
      await delay(delayMs)
    }
  }
}
```

## Security Considerations

### CORS Configuration
- Use Tauri HTTP plugin with `unsafe-headers` feature
- Proper origin and referer headers for API compliance
- User-Agent strings matching browser requests

### Data Validation
```javascript
function validateApiResponse(data, expectedFields) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format')
  }
  
  for (const field of expectedFields) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
  
  return true
}
```

### Cookie Management
- Secure storage of authentication cookies
- Automatic refresh on expiration
- Proper cleanup on application exit

## Monitoring and Debugging

### Request Logging
```javascript
function logRequest(url, options, response, duration) {
  console.log('🌐 API Request:', {
    url: url.replace(/\/[^\/]*$/, '/***'), // Hide sensitive parts
    method: options.method,
    status: response.status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  })
}
```

### Performance Monitoring
```javascript
async function monitoredRequest(url, options) {
  const startTime = performance.now()
  
  try {
    const response = await fetch(url, options)
    const duration = Math.round(performance.now() - startTime)
    
    logRequest(url, options, response, duration)
    
    // Alert on slow requests
    if (duration > 5000) {
      console.warn('⏰ Slow API request detected:', { url, duration })
    }
    
    return response
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    console.error('❌ API request failed:', { url, duration, error: error.message })
    throw error
  }
}
```

## Testing API Integrations

### Manual Testing
1. **Authentication**: Verify cookie acquisition works
2. **Data Fetching**: Test each endpoint individually
3. **Error Handling**: Test with invalid parameters
4. **Rate Limiting**: Test concurrent requests
5. **Caching**: Verify cache hit/miss behavior

### Integration Testing
```javascript
// Test API connectivity
async function testApiHealth() {
  const tests = [
    { name: 'IBIndex', test: () => ibiRequestOptions('getCompanies') },
    { name: 'FBIndex', test: () => fbiRequestOptions('getCompanies') },
    { name: 'FI', test: () => fiDownload() }
  ]
  
  for (const { name, test } of tests) {
    try {
      await test()
      console.log(`✅ ${name} API: OK`)
    } catch (error) {
      console.error(`❌ ${name} API: ${error.message}`)
    }
  }
}
```

## Future Improvements

### Performance Optimization
- Implement GraphQL-like field selection
- Add compression for large responses
- Use streaming for large file downloads
- Implement request deduplication

### Reliability Enhancements
- Circuit breaker pattern for failing APIs
- Health check endpoints
- Automatic failover mechanisms
- Request timeout configuration

### Developer Experience
- API response type definitions
- Mock API for development/testing
- API documentation generator
- Request/response interceptors for debugging## Common Patterns

### Authentication Flow
```javascript
// 1. Check for existing cookie
if (!trackingCookie) {
  // 2. Visit main page to get cookie
  const response = await fetch(baseUrl, { method: "GET" })
  const setCookieHeader = response.headers.get('set-cookie')
  
  // 3. Extract and store cookie
  if (setCookieHeader) {
    const match = setCookieHeader.match(/tracking-cookie=([^;]+)/)
    if (match) {
      trackingCookie = `tracking-cookie=${match[1]}`
    }
  }
}

// 4. Use cookie in subsequent requests
const options = {
  headers: {
    "Cookie": trackingCookie,
    // ... other headers
  }
}
```

### Error Handling Pattern
```javascript
async function apiRequest(url, options) {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('✅ API request successful')
    return data
    
  } catch (error) {
    console.error('❌ API request failed:', {
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    })
    
    // Retry logic for specific errors
    if (error.message.includes('401') || error.message.includes('403')) {
      // Clear cookie and retry
      trackingCookie = null
      return apiRequest(url, options)
    }
    
    throw error
  }
}
```

### Caching Strategy
```javascript
// Check cache first
const cacheKey = `api-${endpoint}-${JSON.stringify(params)}`
const cached = await localforage.getItem(cacheKey)

if (cached && !isCacheExpired(cached.timestamp)) {
  console.log('📦 Using cached data')
  return cached.data
}

// Fetch fresh data
const data = await apiRequest(url, options)

// Cache with timestamp
await localforage.setItem(cacheKey, {
  data,
  timestamp: Date.now()
})

return data
```

## Rate Limiting and Best Practices

### Request Throttling
```javascript
// Implement request delays to avoid overwhelming servers
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function throttledRequest(url, options) {
  await delay(500) // 500ms delay between requests
  return fetch(url, options)
}
```

### Concurrent Request Management
```javascript
// Limit concurrent requests
const CONCURRENT_LIMIT = 3
const requestQueue = []
let activeRequests = 0

async function queuedRequest(url, options) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ url, options, resolve, reject })
    processQueue()
  })
}

async function processQueue() {
  if (activeRequests >= CONCURRENT_LIMIT || requestQueue.length === 0) {
    return
  }
  
  const { url, options, resolve, reject } = requestQueue.shift()
  activeRequests++
  
  try {
    const result = await fetch(url, options)
    resolve(result)
  } catch (error) {
    reject(error)
  } finally {
    activeRequests--
    processQueue()
  }
}
```

### Error Recovery
```javascript
async function resilientRequest(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, options)
    } catch (error) {
      console.warn(`⚠️ Request attempt ${attempt} failed:`, error.message)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Exponential backoff
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
      await delay(delayMs)
    }
  }
}
```

## Security Considerations

### CORS Configuration
- Use Tauri HTTP plugin with `unsafe-headers` feature
- Proper origin and referer headers for API compliance
- User-Agent strings matching browser requests

### Data Validation
```javascript
function validateApiResponse(data, expectedFields) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format')
  }
  
  for (const field of expectedFields) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
  
  return true
}
```

### Cookie Management
- Secure storage of authentication cookies
- Automatic refresh on expiration
- Proper cleanup on application exit

## Monitoring and Debugging

### Request Logging
```javascript
function logRequest(url, options, response, duration) {
  console.log('🌐 API Request:', {
    url: url.replace(/\/[^\/]*$/, '/***'), // Hide sensitive parts
    method: options.method,
    status: response.status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  })
}
```

### Performance Monitoring
```javascript
async function monitoredRequest(url, options) {
  const startTime = performance.now()
  
  try {
    const response = await fetch(url, options)
    const duration = Math.round(performance.now() - startTime)
    
    logRequest(url, options, response, duration)
    
    // Alert on slow requests
    if (duration > 5000) {
      console.warn('⏰ Slow API request detected:', { url, duration })
    }
    
    return response
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    console.error('❌ API request failed:', { url, duration, error: error.message })
    throw error
  }
}
```

## Testing API Integrations

### Manual Testing
1. **Authentication**: Verify cookie acquisition works
2. **Data Fetching**: Test each endpoint individually
3. **Error Handling**: Test with invalid parameters
4. **Rate Limiting**: Test concurrent requests
5. **Caching**: Verify cache hit/miss behavior

### Integration Testing
```javascript
// Test API connectivity
async function testApiHealth() {
  const tests = [
    { name: 'IBIndex', test: () => ibiRequestOptions('getCompanies') },
    { name: 'FBIndex', test: () => fbiRequestOptions('getCompanies') },
    { name: 'FI', test: () => fiDownload() }
  ]
  
  for (const { name, test } of tests) {
    try {
      await test()
      console.log(`✅ ${name} API: OK`)
    } catch (error) {
      console.error(`❌ ${name} API: ${error.message}`)
    }
  }
}
```

## Future Improvements

### Performance Optimization
- Implement GraphQL-like field selection
- Add compression for large responses
- Use streaming for large file downloads
- Implement request deduplication

### Reliability Enhancements
- Circuit breaker pattern for failing APIs
- Health check endpoints
- Automatic failover mechanisms
- Request timeout configuration

### Developer Experience
- API response type definitions
- Mock API for development/testing
- API documentation generator
- Request/response interceptors for debugging