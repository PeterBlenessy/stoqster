# FI API Integration

## Purpose
Provides quarterly fund holdings data from Finansinspektionen (Swedish Financial Supervisory Authority).

## Base URL
```
https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/
```

## Data Format
- **Source**: ZIP archives containing XML files
- **Update Frequency**: Quarterly
- **File Structure**: One XML file per fund

## Data Processing Pipeline

### 1. Download ZIP Archive
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

### 2. Extract XML Files
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

### 3. Parse XML to JSON
```javascript
import X2JS from 'x2js'

const x2js = new X2JS()
for (const file of xmlFiles) {
  const xmlText = await file.async('text')
  const jsonData = x2js.xml2js(xmlText)
  // Process and store data
}
```

## Data Structure

### Fund Information
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

## Performance Metrics

### Processing Times
- **Download**: ~400ms (varies by file size)
- **Blob Processing**: ~3000ms
- **ZIP Extraction**: ~10ms
- **XML Parsing**: 0.2-2ms per file
- **JSON Conversion**: 0.2-8ms per file

## Storage Strategy
- **Cache Duration**: 24 hours
- **Storage Method**: LocalForage with timestamp-based invalidation
- **Key Structure**: `fi-funds-{quarter}-{year}`

## Implementation Details

### Download Manager
```javascript
class FIDataDownloader {
  constructor() {
    this.baseUrl = 'https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/'
    this.downloadProgress = 0
  }
  
  async downloadQuarterlyData(year, quarter) {
    console.log(`📦 Downloading FI data for Q${quarter} ${year}`)
    
    try {
      const downloadUrl = this.buildDownloadUrl(year, quarter)
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/zip',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }
      
      const total = parseInt(response.headers.get('content-length') || '0')
      const reader = response.body.getReader()
      const chunks = []
      let loaded = 0
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        chunks.push(value)
        loaded += value.length
        this.downloadProgress = total > 0 ? Math.round((loaded / total) * 100) : 0
        console.log(`📊 Download progress: ${this.downloadProgress}%`)
      }
      
      const blob = new Blob(chunks)
      console.log('✅ FI data download completed')
      return blob
      
    } catch (error) {
      console.error('❌ FI data download failed:', error)
      throw error
    }
  }
  
  buildDownloadUrl(year, quarter) {
    return `${this.baseUrl}fondinnehav-kv${quarter}-${year}.zip`
  }
}
```

### ZIP Processing
```javascript
import JSZip from 'jszip'

class FIZipProcessor {
  async extractXMLFiles(blob) {
    console.log('🔍 Extracting XML files from ZIP archive')
    
    try {
      const zip = await JSZip.loadAsync(blob)
      const xmlFiles = []
      
      zip.forEach((relativePath, file) => {
        if (relativePath.endsWith('.xml') && !file.dir) {
          xmlFiles.push({
            path: relativePath,
            file: file
          })
        }
      })
      
      console.log(`✅ Found ${xmlFiles.length} XML files`)
      return xmlFiles
      
    } catch (error) {
      console.error('❌ ZIP extraction failed:', error)
      throw error
    }
  }
  
  async processXMLFiles(xmlFiles) {
    console.log('🔄 Processing XML files...')
    const x2js = new X2JS()
    const funds = []
    
    for (const { path, file } of xmlFiles) {
      try {
        const xmlText = await file.async('text')
        const jsonData = x2js.xml2js(xmlText)
        const processedFund = this.processFundData(jsonData, path)
        funds.push(processedFund)
        
      } catch (error) {
        console.warn(`⚠️ Failed to process ${path}:`, error.message)
        continue
      }
    }
    
    console.log(`✅ Processed ${funds.length} funds`)
    return funds
  }
  
  processFundData(jsonData, fileName) {
    const fundRoot = jsonData.FondRapport || jsonData
    
    return {
      name: fundRoot.Fond_namn,
      isin: fundRoot['Fond_ISIN-kod'],
      instituteNumber: fundRoot.Fond_institutnummer,
      assets: parseFloat(fundRoot.Fondförmögenhet || 0),
      managementFee: this.extractManagementFee(fundRoot),
      holdings: this.extractHoldings(fundRoot),
      fileName: fileName,
      lastUpdate: new Date().toISOString()
    }
  }
  
  extractManagementFee(fundData) {
    try {
      const feeData = fundData.Förvaltningsavgift
      if (feeData?.UtanAndelsklasser?.Förvaltningsavgift_fast) {
        return parseFloat(feeData.UtanAndelsklasser.Förvaltningsavgift_fast)
      }
      return null
    } catch (error) {
      return null
    }
  }
  
  extractHoldings(fundData) {
    try {
      const instruments = fundData.FinansiellaInstrument?.FinansielltInstrument
      if (!instruments) return []
      
      // Handle both single instrument and array of instruments
      const instrumentArray = Array.isArray(instruments) ? instruments : [instruments]
      
      return instrumentArray.map(instrument => ({
        name: instrument.Instrument_namn,
        percentage: parseFloat(instrument.Andel_av_fondförmögenhet || 0),
        marketValue: parseFloat(instrument.Marknadsvärde || 0),
        isin: instrument['Instrument_ISIN-kod'],
        category: instrument.Instrumentkategori
      }))
      
    } catch (error) {
      console.warn('⚠️ Failed to extract holdings:', error)
      return []
    }
  }
}
```

### Caching System
```javascript
class FICacheManager {
  constructor() {
    this.cachePrefix = 'fi-funds'
    this.cacheValidityHours = 24
  }
  
  generateCacheKey(year, quarter) {
    return `${this.cachePrefix}-${quarter}-${year}`
  }
  
  async getCachedData(year, quarter) {
    const cacheKey = this.generateCacheKey(year, quarter)
    
    try {
      const cached = await localforage.getItem(cacheKey)
      
      if (!cached) {
        console.log('📦 No cached FI data found')
        return null
      }
      
      const age = Date.now() - cached.timestamp
      const maxAge = this.cacheValidityHours * 60 * 60 * 1000
      
      if (age > maxAge) {
        console.log('📦 Cached FI data expired, removing...')
        await localforage.removeItem(cacheKey)
        return null
      }
      
      console.log('📦 Using cached FI data')
      return cached.data
      
    } catch (error) {
      console.error('❌ Failed to retrieve cached FI data:', error)
      return null
    }
  }
  
  async setCachedData(year, quarter, data) {
    const cacheKey = this.generateCacheKey(year, quarter)
    
    try {
      await localforage.setItem(cacheKey, {
        data,
        timestamp: Date.now(),
        year,
        quarter
      })
      
      console.log(`📦 FI data cached for Q${quarter} ${year}`)
      
    } catch (error) {
      console.error('❌ Failed to cache FI data:', error)
    }
  }
  
  async clearExpiredCache() {
    try {
      const keys = await localforage.keys()
      const fiKeys = keys.filter(key => key.startsWith(this.cachePrefix))
      const maxAge = this.cacheValidityHours * 60 * 60 * 1000
      
      for (const key of fiKeys) {
        const cached = await localforage.getItem(key)
        if (cached && (Date.now() - cached.timestamp) > maxAge) {
          await localforage.removeItem(key)
          console.log(`🧹 Removed expired cache: ${key}`)
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to clear expired FI cache:', error)
    }
  }
}
```

## Common Use Cases

### Fetching Latest Fund Data
```javascript
async function getLatestFIData() {
  const downloader = new FIDataDownloader()
  const processor = new FIZipProcessor()
  const cache = new FICacheManager()
  
  // Get current quarter
  const now = new Date()
  const year = now.getFullYear()
  const quarter = Math.floor((now.getMonth() + 3) / 3)
  
  try {
    // Check cache first
    const cached = await cache.getCachedData(year, quarter)
    if (cached) {
      return cached
    }
    
    // Download and process
    const blob = await downloader.downloadQuarterlyData(year, quarter)
    const xmlFiles = await processor.extractXMLFiles(blob)
    const funds = await processor.processXMLFiles(xmlFiles)
    
    // Cache the results
    await cache.setCachedData(year, quarter, funds)
    
    return funds
    
  } catch (error) {
    console.error('❌ Failed to get FI data:', error)
    throw error
  }
}
```

### Searching Funds
```javascript
async function searchFunds(searchTerm) {
  const funds = await getLatestFIData()
  
  return funds.filter(fund => 
    fund.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fund.isin?.includes(searchTerm.toUpperCase())
  )
}
```

### Getting Fund Holdings
```javascript
async function getFundHoldings(isin) {
  const funds = await getLatestFIData()
  const fund = funds.find(f => f.isin === isin)
  
  if (!fund) {
    throw new Error(`Fund with ISIN ${isin} not found`)
  }
  
  return fund.holdings.sort((a, b) => b.percentage - a.percentage)
}
```

## Performance Optimization

### Parallel Processing
```javascript
async function processXMLFilesInBatches(xmlFiles, batchSize = 10) {
  const x2js = new X2JS()
  const funds = []
  
  for (let i = 0; i < xmlFiles.length; i += batchSize) {
    const batch = xmlFiles.slice(i, i + batchSize)
    
    const batchResults = await Promise.allSettled(
      batch.map(async ({ path, file }) => {
        const xmlText = await file.async('text')
        const jsonData = x2js.xml2js(xmlText)
        return this.processFundData(jsonData, path)
      })
    )
    
    funds.push(...batchResults.filter(r => r.status === 'fulfilled').map(r => r.value))
    
    // Progress update
    console.log(`📊 Processed ${Math.min(i + batchSize, xmlFiles.length)}/${xmlFiles.length} files`)
  }
  
  return funds
}
```

### Memory Management
```javascript
class FIMemoryManager {
  constructor() {
    this.processedCount = 0
    this.memoryThreshold = 100 * 1024 * 1024 // 100MB
  }
  
  async processWithMemoryCheck(xmlFiles) {
    const funds = []
    
    for (const xmlFile of xmlFiles) {
      // Process file
      const fund = await this.processSingleFile(xmlFile)
      funds.push(fund)
      
      this.processedCount++
      
      // Check memory usage periodically
      if (this.processedCount % 50 === 0) {
        if (performance.memory?.usedJSHeapSize > this.memoryThreshold) {
          console.log('⚠️ High memory usage detected, triggering GC')
          // Force garbage collection if available
          if (global.gc) {
            global.gc()
          }
        }
      }
    }
    
    return funds
  }
}
```

## Error Handling

### Robust Download with Retry
```javascript
async function downloadWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/zip',
          'User-Agent': 'Mozilla/5.0 (compatible; Stoqster/1.0)'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
      
    } catch (error) {
      console.log(`⚠️ Download attempt ${attempt} failed:`, error.message)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

### XML Validation
```javascript
function validateXMLStructure(jsonData) {
  const required = ['Fond_namn', 'Fond_ISIN-kod']
  
  for (const field of required) {
    if (!jsonData[field]) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
  
  return true
}
```

## Related Documentation

- **[Main API Integrations](api-integrations.md)** - Common patterns and best practices
- **[IBIndex API Integration](api-integrations-ibi.md)** - Investment company data
- **[FBIndex API Integration](api-integrations-fbi.md)** - Real estate company data