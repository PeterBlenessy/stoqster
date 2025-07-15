# FI Fund Data Format Mapping

## Overview

This document describes the transformation from raw FI (Finansinspektionen) data format to our optimized IndexedDB storage format for efficient querying and analysis. The new format uses English field names and is optimized for performance with proper indexing for time-series analysis and cross-fund comparisons.

## Raw Data Format (Source)

The raw data from FI comes in this structure after XML-to-JSON conversion:

```javascript
// Raw FI Fund Object (from API) as extracted from the zip file and converted from XML
{
    "Aktiv_risk": "13.53",                      // Risk level percentage as string
    "FinansiellaInstrument": undefined,         // Holdings array (stored separately)
    "Fond_ISIN-kod": "SE0013222882",            // Fund's ISIN code, unique identifier
    "Fond_institutnummer": "51066",             // Fund institution number
    "Fond_namn": "Aktiehuset Fond",             // Fund's name
    "Fondförmögenhet": "64060321",              // Total assets under management (SEK)
    "Förvaltningsavgift": {
        "UtanAndelsklasser": {
            "Förvaltningsavgift_fast": "0.9",   // Management fee percentage
            "Prestationsbaserad": {
                "Avkastningströskel": "OMX Nordic40",   // Performance benchmark
                "ProcentuelltUttag": "20"       // Performance fee percentage
            }
        }
    },
    "Jämförelseindex": {
        "Jämförelseindex": "OMXNORDIC 40"       // Benchmark index
    },
    "Likvida_medel": "1929653",                 // Cash/liquid assets (SEK)
    "Standardavvikelse_24_månader": "18.35",    // 24-month standard deviation
    "_displayQuarter": "2022 Q4",               // Display format for quarter
    "_importedAt": "2025-07-13T17:43:26.637Z",  // Import timestamp
    "_quarter": "2022Q4",                       // Quarter identifier
    "_sourceDate": "2023-02-28",                // Data source date
    "Övriga_tillgångar_och_skulder": "-51882"   // Other assets and liabilities
}
```

```javascript
// Raw Holdings Object (stored separately by fund name)
{
    "fundName": "Aktiehuset Fond",              // Fund name (our addition)
    "Andel_av_fondförmögenhet_instrument": "1.39", // Percentage of fund assets
    "Antal": "10000",                           // Number of shares/units
    "Bransch": {
        "Branschkod_instrument": "25",          // Sector code
        "Bransch_namn_instrument": "Sällanköpvaror och tjänster" // Sector name
    },
    "ISIN-kod_instrument": "SE0018012494",      // Holding's ISIN code
    "Instrumentnamn": "MTG B",                  // Holding name
    "Kurs_som_använts_vid_värdering_av_instrumentet": "89.1", // Price used for valuation
    "Landkod_Emittent": "SE",                   // Country code of issuer
    "Marknadsvärde_instrument": "891000",       // Market value (SEK)
    "Nominellt_belopp": "",                     // Nominal amount
    "Tillgångsslag_enligt_LVF_5_kap": "ÖverlåtbartVärdepapper", // Asset class
    "Valuta": "SEK",                            // Currency
    "Valutakurs_instrument": "1",               // Exchange rate
    "_displayQuarter": "2022 Q4",               // Display quarter
    "_importedAt": "2025-07-13T17:43:26.637Z",  // Import timestamp
    "_quarter": "2022Q4",                       // Quarter identifier
    "_sourceDate": "2023-02-28"                 // Source date
}
```

## Field Mapping Tables

### Fund Data Mapping

| Original Swedish Field | Standardized English Field | Data Type | Notes |
|------------------------|---------------------------|-----------|-------|
| `"Fond_ISIN-kod"` | `"fundISIN"` | string | Primary identifier |
| `"Fond_namn"` | `"fundName"` | string | Fund display name |
| `"Fond_institutnummer"` | `"institutionNumber"` | string | FI institution ID |
| `"Fondförmögenhet"` | `"assetsUnderManagement"` | number | Total AUM in SEK (converted from string) |
| `"Aktiv_risk"` | `"activeRisk"` | number | Active risk percentage (converted from string) |
| `"Standardavvikelse_24_månader"` | `"volatility24Months"` | number | 24-month standard deviation (converted from string) |
| `"Likvida_medel"` | `"cashHoldings"` | number | Cash and liquid assets in SEK (converted from string) |
| `"Övriga_tillgångar_och_skulder"` | `"otherAssetsLiabilities"` | number | Other assets/liabilities in SEK (converted from string) |
| `"Förvaltningsavgift.UtanAndelsklasser.Förvaltningsavgift_fast"` | `"managementFee"` | number | Fixed management fee percentage (converted from string) |
| `"Förvaltningsavgift.UtanAndelsklasser.Prestationsbaserad.ProcentuelltUttag"` | `"performanceFee"` | number | Performance fee percentage (converted from string) |
| `"Förvaltningsavgift.UtanAndelsklasser.Prestationsbaserad.Avkastningströskel"` | `"performanceBenchmark"` | string | Performance fee benchmark |
| `"Jämförelseindex.Jämförelseindex"` | `"benchmarkIndex"` | string | Fund benchmark index |
| `"_quarter"` | `"quarter"` | string | Quarter identifier (e.g., "2024Q4") |
| `"_displayQuarter"` | `"quarterDisplay"` | string | Human-readable quarter (e.g., "2024 Q4") |
| `"_sourceDate"` | `"sourceDate"` | string | ISO date string from data source |
| `"_importedAt"` | `"importedAt"` | string | ISO timestamp of import |

### Holdings Data Mapping

| Original Swedish Field | Standardized English Field | Data Type | Notes |
|------------------------|---------------------------|-----------|-------|
| `"fundName"` | `"fundName"` | string | Fund name (our addition, unchanged) |
| `"ISIN-kod_instrument"` | `"instrumentISIN"` | string | Holding's ISIN code |
| `"Instrumentnamn"` | `"instrumentName"` | string | Name of the holding |
| `"Andel_av_fondförmögenhet_instrument"` | `"percentageOfFund"` | number | Percentage of fund (converted from string) |
| `"Antal"` | `"quantity"` | number | Number of shares/units (converted from string) |
| `"Marknadsvärde_instrument"` | `"marketValue"` | number | Market value in original currency (converted from string) |
| `"Kurs_som_använts_vid_värdering_av_instrumentet"` | `"valuationPrice"` | number | Price used for valuation (converted from string) |
| `"Valuta"` | `"currency"` | string | Currency code |
| `"Valutakurs_instrument"` | `"exchangeRate"` | number | Exchange rate to SEK (converted from string) |
| `"Landkod_Emittent"` | `"countryCode"` | string | Issuer's country code |
| `"Nominellt_belopp"` | `"nominalAmount"` | string | Nominal amount (often empty) |
| `"Tillgångsslag_enligt_LVF_5_kap"` | `"assetClass"` | string | Asset class according to Swedish regulation |
| `"Bransch.Branschkod_instrument"` | `"sectorCode"` | string | Sector classification code |
| `"Bransch.Bransch_namn_instrument"` | `"sectorName"` | string | Sector name in Swedish |
| `"_quarter"` | `"quarter"` | string | Quarter identifier |
| `"_displayQuarter"` | `"quarterDisplay"` | string | Human-readable quarter |
| `"_sourceDate"` | `"sourceDate"` | string | ISO date string |
| `"_importedAt"` | `"importedAt"` | string | ISO timestamp |

### Calculated/Enhanced Fields

These fields will be added during transformation for better querying and analysis:

#### Fund Records
| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `"primaryKey"` | string | Composite key: `${isin}_${quarter}` |
| `"numberOfHoldings"` | number | Count of holdings for this fund |
| `"topHoldingPercentage"` | number | Largest holding percentage |
| `"cashPercentage"` | number | Cash holdings as percentage of total AUM |
| `"dataSource"` | string | Always "FI" |
| `"lastUpdated"` | string | ISO timestamp of last update |

#### Holdings Records
| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `"primaryKey"` | string | Composite key: `${fundISIN}_${quarter}_${holdingName}` |
| `"fundISIN"` | string | ISIN of the parent fund |
| `"marketValueSEK"` | number | Market value converted to SEK |
| `"rank"` | number | Ranking within fund (1 = largest) |
| `"sectorNameEnglish"` | string | English translation of sector name |
| `"dataSource"` | string | Always "FI" |
| `"lastUpdated"` | string | ISO timestamp of last update |

## Database Architecture

### Two-Database System

The application uses a dual-database approach for optimal performance and separation of concerns:

#### 1. `stoqster` Database (LocalForage)
- **Purpose**: Raw imported FI data and temporary storage during transformation
- **Technology**: LocalForage (abstraction over IndexedDB/WebSQL/localStorage)
- **Use Cases**: 
  - Raw quarterly FI data storage (before transformation)
  - Temporary cache during data processing
  - Legacy data format support during migration

#### 2. `fi-funds` Database (Direct IndexedDB)
- **Purpose**: Optimized FI fund and holdings data for analytics and charting
- **Technology**: Direct IndexedDB operations for maximum performance
- **Use Cases**:
  - Time-series fund performance analysis
  - Cross-fund comparative analysis
  - Holdings tracking and sector analysis
  - Historical data charting
  - Complex multi-dimensional queries

### Data Flow Architecture
```
Raw FI Data Import
       ↓
stoqster Database (LocalForage) ← [Raw quarterly data storage]
       ↓ 
Data Transformation Pipeline
       ↓
fi-funds Database (IndexedDB) ← [Optimized analytical storage]
       ↓
UI Components & Analytics
```

## Optimized Storage Format

### Database Schema Design

The new format uses a dedicated IndexedDB database for FI fund data with direct IndexedDB operations for maximum performance and proper compound indexes for efficient querying across multiple dimensions.

#### Database: `fi-funds` (separate IndexedDB database)

This database is separate from the main `stoqster` LocalForage database and is managed with direct IndexedDB operations for optimal performance.

##### Table: `funds`
```javascript
// Fund Record - One record per fund per quarter
{
  // Primary key (compound)
  primaryKey: "SE0013222882_2024Q4",         // Format: ${fundISIN}_${quarter}
  
  // Identifiers
  fundISIN: "SE0013222882",                  // Fund ISIN (indexed)
  quarter: "2024Q4",                         // Quarter identifier (indexed)
  fundName: "Aktiehuset Fond",               // Fund display name
  institutionNumber: "51066",                // FI institution number
  
  // Financial metrics (all as numbers for calculations)
  assetsUnderManagement: 64060321,           // AUM in SEK
  activeRisk: 13.53,                         // Active risk percentage
  volatility24Months: 18.35,                 // 24-month volatility
  cashHoldings: 1929653,                     // Cash/liquid assets in SEK
  otherAssetsLiabilities: -51882,            // Other assets/liabilities
  managementFee: 0.9,                        // Fixed management fee %
  performanceFee: 20,                        // Performance fee %
  
  // Benchmark and classification
  performanceBenchmark: "OMX Nordic40",      // Performance fee benchmark
  benchmarkIndex: "OMXNORDIC 40",           // Fund benchmark
  
  // Calculated metrics
  numberOfHoldings: 45,                      // Count of holdings
  topHoldingPercentage: 4.2,                // Largest holding %
  cashPercentage: 3.01,                     // Cash as % of AUM
  
  // Metadata
  quarterDisplay: "2024 Q4",                // Human-readable quarter
  sourceDate: "2025-02-28",                 // ISO date from source
  importedAt: "2025-07-15T10:30:00.000Z",  // Import timestamp
  lastUpdated: "2025-07-15T10:30:00.000Z", // Last update timestamp
  dataSource: "FI"                          // Always "FI"
}
```

**Indexes for funds table:**
- Primary: `primaryKey` (unique)
- Secondary: `fundISIN` (for fund timeline queries)
- Secondary: `quarter` (for cross-fund quarterly analysis) 
- Secondary: `[fundISIN, quarter]` (compound for efficient lookups)
- Secondary: `assetsUnderManagement` (for size-based filtering)
- Secondary: `lastUpdated` (for incremental updates)

##### Table: `holdings`
```javascript
// Holdings Record - One record per instrument per fund per quarter
{
  // Primary key (compound)
  primaryKey: "SE0013222882_2024Q4_MTG B",   // Format: ${fundISIN}_${quarter}_${instrumentName}
  
  // Identifiers
  fundISIN: "SE0013222882",                  // Parent fund ISIN (indexed)
  quarter: "2024Q4",                         // Quarter identifier (indexed)
  instrumentISIN: "SE0018012494",            // Instrument ISIN (may be null)
  instrumentName: "MTG B",                   // Instrument name (indexed)
  fundName: "Aktiehuset Fond",              // Denormalized fund name
  
  // Financial data (all as numbers)
  percentageOfFund: 1.39,                    // % of fund (indexed for large holdings)
  quantity: 10000,                           // Number of shares/units
  marketValue: 891000,                       // Market value in original currency
  marketValueSEK: 891000,                   // Market value converted to SEK
  valuationPrice: 89.1,                     // Price used for valuation
  exchangeRate: 1.0,                        // Exchange rate to SEK
  
  // Classification
  currency: "SEK",                          // Currency code
  countryCode: "SE",                        // Issuer country
  assetClass: "ÖverlåtbartVärdepapper",     // Asset class (Swedish regulation)
  sectorCode: "25",                         // Sector code
  sectorName: "Sällanköpvaror och tjänster", // Sector name (Swedish)
  sectorNameEnglish: "Consumer Discretionary", // English sector name
  nominalAmount: "",                        // Nominal amount (often empty)
  
  // Calculated fields
  rank: 5,                                  // Ranking within fund (1 = largest)
  
  // Metadata
  quarterDisplay: "2024 Q4",               // Human-readable quarter
  sourceDate: "2025-02-28",               // ISO date from source
  importedAt: "2025-07-15T10:30:00.000Z", // Import timestamp
  lastUpdated: "2025-07-15T10:30:00.000Z", // Last update timestamp
  dataSource: "FI"                        // Always "FI"
}
```

**Indexes for holdings table:**
- Primary: `primaryKey` (unique)
- Secondary: `fundISIN` (for fund holdings queries)
- Secondary: `quarter` (for cross-fund quarterly analysis)
- Secondary: `instrumentName` (for cross-fund instrument analysis)
- Secondary: `instrumentISIN` (for ISIN-based queries)
- Secondary: `[fundISIN, quarter]` (compound for efficient fund holdings)
- Secondary: `[quarter, sectorCode]` (for sector analysis)
- Secondary: `percentageOfFund` (for large holdings queries)
- Secondary: `lastUpdated` (for incremental updates)

## Data Transformation Rules

### 1. String to Number Conversion
```javascript
// Safe numeric conversion with fallback
function parseSwedishNumber(value) {
  if (!value || value === "") return 0;
  
  // Handle Swedish decimal format (comma to dot)
  const normalized = String(value).replace(',', '.');
  const parsed = parseFloat(normalized);
  
  return isNaN(parsed) ? 0 : parsed;
}
```

### 2. Primary Key Generation
```javascript
// Fund primary key
const fundPrimaryKey = `${fundISIN}_${quarter}`;

// Holdings primary key  
const holdingPrimaryKey = `${fundISIN}_${quarter}_${instrumentName}`;
```

### 3. Sector Name Translation
```javascript
const sectorTranslations = {
  "Sällanköpvaror och tjänster": "Consumer Discretionary",
  "Dagligvaror": "Consumer Staples", 
  "Energi": "Energy",
  "Finansiella tjänster": "Financials",
  "Hälsovård": "Health Care",
  "Industri": "Industrials",
  "Informationsteknik": "Information Technology",
  "Kommunikationstjänster": "Communication Services",
  "Material": "Materials",
  "Fastigheter": "Real Estate",
  "Samhällstjänster": "Utilities"
};
```

### 4. Data Validation
```javascript
function validateFundRecord(record) {
  const required = ['fundISIN', 'quarter', 'fundName'];
  const missing = required.filter(field => !record[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  // Validate ISIN format
  if (!/^SE\d{10}$/.test(record.fundISIN)) {
    throw new Error(`Invalid ISIN format: ${record.fundISIN}`);
  }
  
  // Validate quarter format
  if (!/^\d{4}Q[1-4]$/.test(record.quarter)) {
    throw new Error(`Invalid quarter format: ${record.quarter}`);
  }
  
  return true;
}
```

## Query Patterns & Performance

### Database Connection
```javascript
// Open the dedicated fi-funds database
const dbRequest = indexedDB.open('fi-funds', 1);
const db = await new Promise((resolve, reject) => {
  dbRequest.onsuccess = () => resolve(dbRequest.result);
  dbRequest.onerror = () => reject(dbRequest.error);
});
```

### Time Series Analysis (Fund Performance Over Time)
```javascript
// Get all quarters for a specific fund
const fundTimeline = await db.transaction('funds', 'readonly')
  .objectStore('funds')
  .index('fundISIN')
  .getAll('SE0013222882');

// Sort by quarter for chronological analysis
fundTimeline.sort((a, b) => a.quarter.localeCompare(b.quarter));
```

### Cross-Fund Quarterly Analysis
```javascript
// Get all funds for a specific quarter
const quarterSnapshot = await db.transaction('funds', 'readonly')
  .objectStore('funds')
  .index('quarter')
  .getAll('2024Q4');

// Filter by AUM size
const largeFunds = quarterSnapshot.filter(fund => fund.assetsUnderManagement > 1000000000);
```

### Holdings Analysis
```javascript
// Get all holdings for a fund in a quarter
const fundHoldings = await db.transaction('holdings', 'readonly')
  .objectStore('holdings')
  .index('fundISIN')
  .getAll('SE0013222882');

const quarterHoldings = fundHoldings.filter(h => h.quarter === '2024Q4');

// Cross-fund instrument analysis
const evolutionHoldings = await db.transaction('holdings', 'readonly')
  .objectStore('holdings')
  .index('instrumentName')
  .getAll('Evolution AB');
```

### Sector Exposure Analysis
```javascript
// Get sector exposure for a quarter
const sectorHoldings = await db.transaction('holdings', 'readonly')
  .objectStore('holdings')
  .index('quarter')
  .getAll('2024Q4');

// Group by sector
const sectorExposure = sectorHoldings.reduce((acc, holding) => {
  const sector = holding.sectorNameEnglish || 'Unknown';
  acc[sector] = (acc[sector] || 0) + holding.marketValueSEK;
  return acc;
}, {});
```

## Summary

This mapping document serves as the definitive reference for transforming FI (Finansinspektionen) fund data from the raw Swedish XML format to our optimized English-language IndexedDB format. The transformation includes:

- **Field Name Translation**: Swedish → English with clear mappings
- **Data Type Conversion**: Strings → Numbers for calculations and analysis
- **Schema Optimization**: Compound indexes for efficient multi-dimensional queries
- **Data Enhancement**: Calculated fields for improved analytics

The resulting format enables efficient time-series analysis, cross-fund comparisons, and complex analytical queries while maintaining data integrity and improving query performance.
