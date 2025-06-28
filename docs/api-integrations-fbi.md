# FBIndex API Integration

## Purpose
Provides data about Swedish real estate investment companies and their holdings.

## Base URL
```
https://fbindex.se/fbi/
```

## Authentication
- **Method**: Cookie-based session tracking
- **Cookie Name**: `fbi-tracking`
- **Acquisition**: Automatic via initial page visit
- **Character Encoding**: ISO-8859-1 with automatic detection

## Available Endpoints

### Company Information
```javascript
// Get real estate companies
const companies = await fbiRequestOptions('getCompanies')
```

### Company Details
```javascript
// Get specific company details
const details = await fbiRequestOptions('getCompanyDetails', 'COMPANY_ID')
```

### Holdings Data
```javascript
// Get company holdings
const holdings = await fbiRequestOptions('getHoldings', 'COMPANY_ID')
```

## Encoding Handling

The FBIndex API returns data in ISO-8859-1 encoding, which requires special handling:

```javascript
// Automatic encoding detection and conversion
const response = await fetch(url, options)
const buffer = await response.arrayBuffer()
const decoder = new TextDecoder('iso-8859-1')
const text = decoder.decode(buffer)
const data = JSON.parse(text)
```

## Data Structure

### Company Information
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

## Request Configuration
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

## Implementation Details

### Cookie Management
```javascript
let fbiTrackingCookie = null

async function getFBITrackingCookie() {
  if (fbiTrackingCookie) {
    return fbiTrackingCookie
  }
  
  try {
    const response = await fetch('https://fbindex.se/fbi/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })
    
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      const match = setCookieHeader.match(/fbi-tracking=([^;]+)/)
      if (match) {
        fbiTrackingCookie = `fbi-tracking=${match[1]}`
        console.log('🔐 FBI tracking cookie acquired')
        return fbiTrackingCookie
      }
    }
    
    throw new Error('Failed to acquire FBI tracking cookie')
    
  } catch (error) {
    console.error('❌ Failed to get FBI tracking cookie:', error)
    throw error
  }
}
```

### Character Encoding Handling
```javascript
async function decodeFBIResponse(response) {
  const buffer = await response.arrayBuffer()
  
  // Try ISO-8859-1 first (most common for FBIndex)
  let decoder = new TextDecoder('iso-8859-1')
  let text = decoder.decode(buffer)
  
  // Fallback to UTF-8 if needed
  if (text.includes('�')) {
    decoder = new TextDecoder('utf-8')
    text = decoder.decode(buffer)
  }
  
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('❌ Failed to parse FBI response as JSON:', text)
    throw new Error('Invalid JSON response from FBI API')
  }
}
```

### Request Helper Functions
```javascript
async function fbiRequest(endpoint, params = {}) {
  const cookie = await getFBITrackingCookie()
  
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
      'Origin': 'https://fbindex.se',
      'Referer': 'https://fbindex.se/fbi/'
    },
    body: formData
  }
  
  const response = await fetch(`https://fbindex.se/fbi/${endpoint}`, options)
  
  if (!response.ok) {
    throw new Error(`FBI API error: ${response.status} ${response.statusText}`)
  }
  
  return await decodeFBIResponse(response)
}
```

### Data Processing
```javascript
function processFBICompanyData(rawData) {
  return {
    id: rawData.product,
    name: rawData.productName,
    nav: parseFloat(rawData.netAssetValue),
    discount: parseFloat(rawData.netAssetValueRebatePremium),
    price: parseFloat(rawData.price),
    totalReturn: parseFloat(rawData.totalReturn),
    dividend: parseFloat(rawData.dividend || 0),
    lastUpdate: rawData.priceChangeDate
  }
}

function processFBIHoldingsData(rawData) {
  return rawData.holdings.map(holding => ({
    name: holding.name,
    percentage: parseFloat(holding.percentage),
    value: parseFloat(holding.value),
    currency: holding.currency || 'SEK',
    type: holding.type || 'Real Estate'
  }))
}
```

## Common Use Cases

### Fetching Real Estate Companies
```javascript
async function getFBICompanies() {
  try {
    const rawData = await fbiRequest('companies')
    return rawData.map(processFBICompanyData)
  } catch (error) {
    console.error('❌ Failed to fetch FBI companies:', error)
    throw error
  }
}
```

### Getting Company Details
```javascript
async function getFBICompanyDetails(companyId) {
  try {
    const rawData = await fbiRequest('company-details', { id: companyId })
    return processFBICompanyData(rawData)
  } catch (error) {
    console.error(`❌ Failed to fetch FBI company details for ${companyId}:`, error)
    throw error
  }
}
```

### Fetching Holdings
```javascript
async function getFBIHoldings(companyId) {
  try {
    const rawData = await fbiRequest('holdings', { id: companyId })
    return processFBIHoldingsData(rawData)
  } catch (error) {
    console.error(`❌ Failed to fetch FBI holdings for ${companyId}:`, error)
    throw error
  }
}
```

## Special Considerations

### Character Encoding Issues
The FBIndex API has unique encoding challenges:

1. **Server Response**: Often returns ISO-8859-1 encoded data
2. **Swedish Characters**: ÅÄÖ characters require proper encoding handling
3. **Fallback Strategy**: Try multiple encodings if primary fails
4. **Content Validation**: Check for garbled characters and retry

### Error Handling
```javascript
async function fbiRequestWithEncoding(endpoint, params = {}) {
  const encodings = ['iso-8859-1', 'utf-8', 'windows-1252']
  
  for (const encoding of encodings) {
    try {
      const response = await fetch(url, options)
      const buffer = await response.arrayBuffer()
      const decoder = new TextDecoder(encoding)
      const text = decoder.decode(buffer)
      
      // Validate that Swedish characters are properly decoded
      if (!text.includes('�')) {
        return JSON.parse(text)
      }
    } catch (error) {
      console.log(`⚠️ Encoding ${encoding} failed, trying next...`)
      continue
    }
  }
  
  throw new Error('Failed to decode FBI API response with any supported encoding')
}
```

## Caching Strategy

### Cache Keys
- Companies: `fbi-companies`
- Company Details: `fbi-company-${companyId}`
- Holdings: `fbi-holdings-${companyId}`

### Cache Invalidation
- Companies list: 24 hours
- Company details: 1 hour
- Holdings: 6 hours

### Encoding-Aware Caching
```javascript
async function cacheFBIResponse(key, data) {
  // Store both the original encoding and parsed data
  await localforage.setItem(key, {
    data,
    encoding: 'iso-8859-1',
    timestamp: Date.now()
  })
}
```

## Performance Optimization

### Request Batching
```javascript
async function batchFBIRequests(requests) {
  // Process requests in small batches to avoid overwhelming the server
  const batchSize = 3
  const results = []
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(
      batch.map(req => fbiRequest(req.endpoint, req.params))
    )
    results.push(...batchResults)
    
    // Add delay between batches
    if (i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return results
}
```

### Monitoring and Debugging

### Encoding Validation
```javascript
function validateSwedishCharacters(text) {
  // Check for common Swedish characters
  const swedishChars = /[ÅÄÖåäö]/g
  const garbledChars = /[Ã¥Ã¤Ã¶]/g
  
  if (garbledChars.test(text)) {
    console.warn('⚠️ Detected garbled Swedish characters, encoding issue likely')
    return false
  }
  
  return true
}
```

### Response Monitoring
```javascript
function logFBIResponseMetrics(endpoint, response, processingTime) {
  console.log('📊 FBI API Response:', {
    endpoint,
    status: response.status,
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length'),
    processingTime,
    timestamp: new Date().toISOString()
  })
}
```

## Related Documentation

- **[Main API Integrations](api-integrations.md)** - Common patterns and best practices
- **[IBIndex API Integration](api-integrations-ibi.md)** - Investment company data
- **[FI API Integration](api-integrations-fi.md)** - Fund data integration