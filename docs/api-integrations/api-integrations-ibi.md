# IBIndex API Integration

## Purpose
Provides comprehensive data about Swedish investment companies including holdings, events, and performance metrics.

## Base URL
```
https://ibindex.se/ibi/
```

## Authentication
- **Method**: Cookie-based session tracking
- **Cookie Name**: `ibi-tracking`
- **Acquisition**: Automatic via initial page visit
- **Persistence**: Stored globally in API module

## Available Endpoints

### Company Listings
```javascript
// Get all investment companies
const companies = await ibiRequestOptions('getCompanies')
```

### Company Details
```javascript
// Get specific company information
const details = await ibiRequestOptions('getCompanyDetails', 'COMPANY_ID')
```

### Holdings Data
```javascript
// Get company holdings
const holdings = await ibiRequestOptions('getHoldings', 'COMPANY_ID')
```

### Events Calendar
```javascript
// Get company events
const events = await ibiRequestOptions('getEvents', 'COMPANY_ID')
```

### Market Weights
```javascript
// Get market weight data
const weights = await ibiRequestOptions('getMarketWeights')
```

## Data Structure

### Company Information
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

### Holdings Data
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

## Request Configuration
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

## Error Handling
- **Authentication Failures**: Automatic cookie refresh
- **Rate Limiting**: Implement request delays
- **Network Errors**: Retry with exponential backoff
- **Data Validation**: Verify response structure

## Implementation Details

### Cookie Management
```javascript
let ibiTrackingCookie = null

async function getIBITrackingCookie() {
  if (ibiTrackingCookie) {
    return ibiTrackingCookie
  }
  
  try {
    const response = await fetch('https://ibindex.se/ibi/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })
    
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      const match = setCookieHeader.match(/ibi-tracking=([^;]+)/)
      if (match) {
        ibiTrackingCookie = `ibi-tracking=${match[1]}`
        console.log('🔐 IBI tracking cookie acquired')
        return ibiTrackingCookie
      }
    }
    
    throw new Error('Failed to acquire IBI tracking cookie')
    
  } catch (error) {
    console.error('❌ Failed to get IBI tracking cookie:', error)
    throw error
  }
}
```

### Request Helper Functions
```javascript
async function ibiRequest(endpoint, params = {}) {
  const cookie = await getIBITrackingCookie()
  
  const formData = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    formData.append(key, value)
  })
  
  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'Origin': 'https://ibindex.se',
      'Referer': 'https://ibindex.se/ibi/'
    },
    body: formData
  }
  
  const response = await fetch(`https://ibindex.se/ibi/${endpoint}`, options)
  
  if (!response.ok) {
    throw new Error(`IBI API error: ${response.status} ${response.statusText}`)
  }
  
  return await response.json()
}
```

### Data Processing
```javascript
function processIBICompanyData(rawData) {
  return {
    id: rawData.product,
    name: rawData.productName,
    nav: parseFloat(rawData.netAssetValue),
    discount: parseFloat(rawData.netAssetValueRebatePremium),
    price: parseFloat(rawData.price),
    totalReturn: parseFloat(rawData.totalReturn),
    volatility: parseFloat(rawData.volatility),
    lastUpdate: rawData.priceChangeDate
  }
}

function processIBIHoldingsData(rawData) {
  return rawData.holdings.map(holding => ({
    name: holding.name,
    percentage: parseFloat(holding.percentage),
    value: parseFloat(holding.value),
    currency: holding.currency
  }))
}
```

## Common Use Cases

### Fetching Company List
```javascript
async function getIBICompanies() {
  try {
    const rawData = await ibiRequest('companies')
    return rawData.map(processIBICompanyData)
  } catch (error) {
    console.error('❌ Failed to fetch IBI companies:', error)
    throw error
  }
}
```

### Getting Company Details
```javascript
async function getIBICompanyDetails(companyId) {
  try {
    const rawData = await ibiRequest('company-details', { id: companyId })
    return processIBICompanyData(rawData)
  } catch (error) {
    console.error(`❌ Failed to fetch IBI company details for ${companyId}:`, error)
    throw error
  }
}
```

### Fetching Holdings
```javascript
async function getIBIHoldings(companyId) {
  try {
    const rawData = await ibiRequest('holdings', { id: companyId })
    return processIBIHoldingsData(rawData)
  } catch (error) {
    console.error(`❌ Failed to fetch IBI holdings for ${companyId}:`, error)
    throw error
  }
}
```

## Caching Strategy

### Cache Keys
- Companies: `ibi-companies`
- Company Details: `ibi-company-${companyId}`
- Holdings: `ibi-holdings-${companyId}`
- Events: `ibi-events-${companyId}`

### Cache Invalidation
- Companies list: 24 hours
- Company details: 1 hour
- Holdings: 6 hours
- Events: 12 hours

## Performance Considerations

### Request Optimization
- Batch multiple company requests when possible
- Use conditional requests with ETag headers
- Implement request queuing to avoid rate limits
- Cache responses locally to reduce API calls

### Error Recovery
- Retry failed requests with exponential backoff
- Fall back to cached data when API is unavailable
- Implement circuit breaker pattern for repeated failures

## Related Documentation

- **[Main API Integrations](api-integrations.md)** - Common patterns and best practices
- **[FBIndex API Integration](api-integrations-fbi.md)** - Real estate company data
- **[FI API Integration](api-integrations-fi.md)** - Fund data integration