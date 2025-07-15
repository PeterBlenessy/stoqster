/**
 * FI Data Transformation Utilities
 * 
 * Transforms Swedish FI fund data to English format suitable for IndexedDB storage.
 * Handles field mapping, data type conversions, and validation.
 * 
 * References the comprehensive field mapping in docs/data-formats/fi-fund-data-mapping.md
 */

/**
 * Transform fund data from raw format to English format
 * @param {Object} rawData - Raw fund data (potentially in Swedish format)
 * @returns {Object} Transformed fund data in English format
 */
export function transformFundData(rawData) {
  try {
    console.log('🔄 Transforming fund data from raw to English format')
    
    const transformed = {
      // Core identifiers
      fundISIN: rawData.isin || rawData.fondISIN,
      fundName: rawData.fondnamn || rawData.fundName,
      
      // Time period
      quarter: rawData.kvartal || rawData.quarter,
      year: parseNumber(rawData["rapportår"] || rawData.year),
      reportDate: rawData.rapportdatum || rawData.reportDate,
      
      // Fund characteristics
      fundType: rawData.fondtyp || rawData.fundType,
      fundCategory: rawData.fondkategori || rawData.fundCategory,
      managementCompany: rawData["fondförvaltare"] || rawData.managementCompany,
      
      // Financial data
      assetsUnderManagement: parseNumber(rawData["fondförmögenhet"] || rawData.assetsUnderManagement),
      numberOfUnitHolders: parseNumber(rawData["antalAndelsägare"] || rawData.numberOfUnitHolders),
      
      // Performance metrics
      totalReturn: parseNumber(rawData.totalavkastning || rawData.totalReturn),
      managementFee: parseNumber(rawData["förvaltningsavgift"] || rawData.managementFee),
      
      // Unit data
      unitPrice: parseNumber(rawData.andelskurs || rawData.unitPrice),
      unitsOutstanding: parseNumber(rawData.antalAndelar || rawData.unitsOutstanding),
      
      // Fund structure
      distributionPolicy: rawData.utdelningspolicy || rawData.distributionPolicy,
      currencyHedged: parseBoolean(rawData["valutasäkring"] || rawData.currencyHedged),
      
      // Geographic and sector focus
      geographicFocus: rawData["geografiskInriktning"] || rawData.geographicFocus,
      sectorFocus: rawData["branschInriktning"] || rawData.sectorFocus,
      
      // Regulatory information
      regulatoryClassification: rawData["regulatoriskKlassificering"] || rawData.regulatoryClassification,
      investmentPolicy: rawData.placeringsinriktning || rawData.investmentPolicy,
      
      // Risk metrics (if available)
      riskLevel: rawData["riskNivå"] || rawData.riskLevel,
      volatility: parseNumber(rawData.volatilitet || rawData.volatility),
      
      // Additional metadata
      fundSize: parseFundSize(rawData.fondstorlek || rawData.fundSize),
      benchmark: rawData["jämförelseindex"] || rawData.benchmark,
      
      // Administrative data
      registrationNumber: rawData.registreringsnummer || rawData.registrationNumber,
      legalStructure: rawData["juridiskForm"] || rawData.legalStructure
    }
    
    // Remove undefined values to keep the object clean
    Object.keys(transformed).forEach(key => {
      if (transformed[key] === undefined || transformed[key] === null || transformed[key] === '') {
        delete transformed[key]
      }
    })
    
    console.log('✅ Fund data transformation completed')
    return transformed
  } catch (error) {
    console.error('❌ Error transforming fund data:', error)
    throw new Error(`Fund data transformation failed: ${error.message}`)
  }
}

/**
 * Transform holding data from raw format to English format
 * @param {Object} rawData - Raw holding data (potentially in Swedish format)
 * @param {string} fundISIN - Fund ISIN to associate with this holding
 * @param {string} quarter - Quarter for this holding
 * @param {number} year - Year for this holding
 * @returns {Object} Transformed holding data in English format
 */
export function transformHoldingData(rawData, fundISIN, quarter, year) {
  try {
    console.log('🔄 Transforming holding data from raw to English format')
    
    const transformed = {
      // Core identifiers
      fundISIN: fundISIN,
      instrumentISIN: rawData.isin || rawData.instrumentISIN,
      instrumentName: rawData.instrumentnamn || rawData.instrumentName,
      
      // Time period
      quarter: quarter,
      year: year,
      reportDate: rawData.rapportdatum || rawData.reportDate,
      
      // Instrument characteristics
      instrumentType: rawData.instrumenttyp || rawData.instrumentType,
      sector: rawData.bransch || rawData.sector,
      country: rawData.land || rawData.country,
      currency: rawData.valuta || rawData.currency,
      
      // Market data
      marketValue: parseNumber(rawData["marknadsvärde"] || rawData.marketValue),
      percentageOfFund: parseNumber(rawData["andelAvFondförmögenhet"] || rawData.percentageOfFund),
      numberOfShares: parseNumber(rawData.antalAktier || rawData.numberOfShares),
      
      // Pricing information
      unitPrice: parseNumber(rawData.kurs || rawData.unitPrice),
      priceDate: rawData.kursdatum || rawData.priceDate,
      exchangeRate: parseNumber(rawData["växelkurs"] || rawData.exchangeRate),
      
      // Classification
      assetClass: rawData["tillgångsklass"] || rawData.assetClass,
      subAssetClass: rawData["underTillgångsklass"] || rawData.subAssetClass,
      
      // Geographic information
      issuerCountry: rawData.emittentLand || rawData.issuerCountry,
      tradingMarket: rawData.handelsplats || rawData.tradingMarket,
      
      // Additional identifiers
      bloombergTicker: rawData.bloombergTicker || rawData.bloombergTicker,
      reutersRIC: rawData.reutersRIC || rawData.reutersRIC,
      sedol: rawData.sedol || rawData.sedol,
      
      // Issuer information
      issuerName: rawData.emittent || rawData.issuerName,
      issuerType: rawData.emittenttyp || rawData.issuerType,
      
      // Bond-specific fields (if applicable)
      maturityDate: rawData["förfallodag"] || rawData.maturityDate,
      couponRate: parseNumber(rawData["kupongränta"] || rawData.couponRate),
      creditRating: rawData.kreditbetyg || rawData.creditRating,
      
      // Derivative-specific fields (if applicable)
      underlyingAsset: rawData["underliggandetillgång"] || rawData.underlyingAsset,
      strikePrice: parseNumber(rawData["lösenpris"] || rawData.strikePrice),
      expirationDate: rawData["utgångsdatum"] || rawData.expirationDate
    }
    
    // Remove undefined values to keep the object clean
    Object.keys(transformed).forEach(key => {
      if (transformed[key] === undefined || transformed[key] === null || transformed[key] === '') {
        delete transformed[key]
      }
    })
    
    console.log('✅ Holding data transformation completed')
    return transformed
  } catch (error) {
    console.error('❌ Error transforming holding data:', error)
    throw new Error(`Holding data transformation failed: ${error.message}`)
  }
}

/**
 * Parse number from string or return as-is if already a number
 * @param {*} value - Value to parse
 * @returns {number|undefined}
 */
function parseNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value
  }
  
  if (typeof value === 'string') {
    // Remove common Swedish number formatting
    const cleaned = value
      .replace(/\s/g, '') // Remove spaces
      .replace(/,/g, '.') // Replace comma with dot for decimal
    
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }
  
  return undefined
}

/**
 * Parse boolean from various string representations
 * @param {*} value - Value to parse
 * @returns {boolean|undefined}
 */
function parseBoolean(value) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  
  if (typeof value === 'boolean') {
    return value
  }
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    if (lower === 'ja' || lower === 'yes' || lower === 'true' || lower === '1') {
      return true
    }
    if (lower === 'nej' || lower === 'no' || lower === 'false' || lower === '0') {
      return false
    }
  }
  
  return undefined
}

/**
 * Parse fund size classification
 * @param {*} value - Fund size value
 * @returns {string|undefined}
 */
function parseFundSize(value) {
  if (!value || typeof value !== 'string') {
    return undefined
  }
  
  const size = value.toLowerCase().trim()
  
  // Map Swedish size classifications to English
  const sizeMap = {
    'liten': 'small',
    'medelstor': 'medium', 
    'stor': 'large',
    'mycket stor': 'very large',
    'small': 'small',
    'medium': 'medium',
    'large': 'large',
    'very large': 'very large'
  }
  
  return sizeMap[size] || value
}

/**
 * Validate transformed fund data
 * @param {Object} fundData - Transformed fund data
 * @returns {boolean}
 */
export function validateTransformedFundData(fundData) {
  const requiredFields = ['fundISIN', 'fundName', 'quarter', 'year']
  
  for (const field of requiredFields) {
    if (!fundData[field]) {
      throw new Error(`Required field '${field}' is missing in transformed fund data`)
    }
  }
  
  // Validate ISIN format
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(fundData.fundISIN)) {
    throw new Error('Invalid ISIN format in transformed fund data')
  }
  
  // Validate quarter format
  if (!/^Q[1-4]$/.test(fundData.quarter)) {
    throw new Error('Invalid quarter format in transformed fund data')
  }
  
  // Validate year
  if (typeof fundData.year !== 'number' || fundData.year < 2000 || fundData.year > new Date().getFullYear() + 1) {
    throw new Error('Invalid year in transformed fund data')
  }
  
  return true
}

/**
 * Validate transformed holding data
 * @param {Object} holdingData - Transformed holding data
 * @returns {boolean}
 */
export function validateTransformedHoldingData(holdingData) {
  const requiredFields = ['fundISIN', 'instrumentISIN', 'quarter', 'year']
  
  for (const field of requiredFields) {
    if (!holdingData[field]) {
      throw new Error(`Required field '${field}' is missing in transformed holding data`)
    }
  }
  
  // Validate ISIN formats
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(holdingData.fundISIN)) {
    throw new Error('Invalid fund ISIN format in transformed holding data')
  }
  
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(holdingData.instrumentISIN)) {
    throw new Error('Invalid instrument ISIN format in transformed holding data')
  }
  
  return true
}

/**
 * Transform multiple fund records in batch
 * @param {Array} swedishFunds - Array of Swedish fund data
 * @returns {Array} Array of transformed fund data
 */
export function batchTransformFunds(swedishFunds) {
  console.log('📦 Starting batch transformation of', swedishFunds.length, 'funds')
  
  const transformed = []
  const errors = []
  
  for (let i = 0; i < swedishFunds.length; i++) {
    try {
      const transformedFund = transformFundData(swedishFunds[i])
      validateTransformedFundData(transformedFund)
      transformed.push(transformedFund)
    } catch (error) {
      console.error(`❌ Error transforming fund at index ${i}:`, error)
      errors.push({ index: i, error: error.message, data: swedishFunds[i] })
    }
  }
  
  console.log('✅ Batch fund transformation completed:', transformed.length, 'successful,', errors.length, 'errors')
  
  if (errors.length > 0) {
    console.warn('⚠️ Transformation errors:', errors)
  }
  
  return { transformed, errors }
}

/**
 * Transform multiple holding records in batch
 * @param {Array} swedishHoldings - Array of Swedish holding data with metadata
 * @returns {Array} Array of transformed holding data
 */
export function batchTransformHoldings(swedishHoldings) {
  console.log('📦 Starting batch transformation of', swedishHoldings.length, 'holdings')
  
  const transformed = []
  const errors = []
  
  for (let i = 0; i < swedishHoldings.length; i++) {
    try {
      const { holding, fundISIN, quarter, year } = swedishHoldings[i]
      const transformedHolding = transformHoldingData(holding, fundISIN, quarter, year)
      validateTransformedHoldingData(transformedHolding)
      transformed.push(transformedHolding)
    } catch (error) {
      console.error(`❌ Error transforming holding at index ${i}:`, error)
      errors.push({ index: i, error: error.message, data: swedishHoldings[i] })
    }
  }
  
  console.log('✅ Batch holding transformation completed:', transformed.length, 'successful,', errors.length, 'errors')
  
  if (errors.length > 0) {
    console.warn('⚠️ Transformation errors:', errors)
  }
  
  return { transformed, errors }
}
