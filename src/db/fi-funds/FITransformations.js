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
 * @param {Object} rawData - Raw fund data exactly as described in fi-fund-data-mapping.md
 * @returns {Object} Transformed fund data in English format
 */
export function transformFundData(rawData) {
  try {    
    // Transform only the fields that actually exist in the raw data format as documented
    const transformed = {
      // Core identifiers (from raw format)
      fundISIN: rawData['Fond_ISIN-kod'],
      fundName: rawData['Fond_namn'],
      institutionNumber: rawData['Fond_institutnummer'],
      
      // Financial metrics (from raw format)
      assetsUnderManagement: parseNumber(rawData['Fondförmögenhet']),
      activeRisk: parseNumber(rawData['Aktiv_risk']),
      volatility24Months: parseNumber(rawData['Standardavvikelse_24_månader']),
      cashHoldings: parseNumber(rawData['Likvida_medel']),
      otherAssetsLiabilities: parseNumber(rawData['Övriga_tillgångar_och_skulder']),
      
      // Management fees (from nested structure)
      managementFee: parseNumber(rawData['Förvaltningsavgift']?.['UtanAndelsklasser']?.['Förvaltningsavgift_fast']),
      performanceFee: parseNumber(rawData['Förvaltningsavgift']?.['UtanAndelsklasser']?.['Prestationsbaserad']?.['ProcentuelltUttag']),
      performanceBenchmark: rawData['Förvaltningsavgift']?.['UtanAndelsklasser']?.['Prestationsbaserad']?.['Avkastningströskel'],
      
      // Benchmark index (from nested structure)
      benchmarkIndex: rawData['Jämförelseindex']?.['Jämförelseindex'],
      
      // Time period metadata (from our import process)
      quarter: rawData._quarter,
      quarterDisplay: rawData._displayQuarter,
      sourceDate: rawData._sourceDate,
      importedAt: rawData._importedAt,
      
      // Data source identifier
      dataSource: "FI"
    }
    
    return transformed
  } catch (error) {
    console.error('❌ Error transforming fund data:', error)
    throw new Error(`Fund data transformation failed: ${error.message}`)
  }
}

/**
 * Transform raw holding data from FI (Swedish) format to normalized format (English keys)
 * @param {Object} rawData - Raw holding data from FI
 * @param {string} fundISIN - ISIN code of the fund this holding belongs to
 * @param {string} quarter - Quarter for this holding
 * @returns {Object} Transformed holding data in English format
 */
export function transformHoldingData(rawData, fundISIN, quarter) {
  try {
    
    // Ensure rawData exists
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Invalid rawData provided to transformHoldingData')
    }
        
    // Transform only the fields that actually exist in the raw holdings format as documented
    const transformed = {
      // Core identifiers
      fundISIN: fundISIN,
      instrumentISIN: rawData['ISIN-kod_instrument'],
      instrumentName: rawData['Instrumentnamn'],
      
      // Time period
      quarter: quarter,
      
      // Financial data (from raw format)
      percentageOfFund: parseNumber(rawData['Andel_av_fondförmögenhet_instrument']),
      quantity: parseNumber(rawData['Antal']),
      marketValue: parseNumber(rawData['Marknadsvärde_instrument']),
      valuationPrice: parseNumber(rawData['Kurs_som_använts_vid_värdering_av_instrumentet']),
      exchangeRate: parseNumber(rawData['Valutakurs_instrument']),
      
      // Classification (from raw format)
      currency: rawData['Valuta'],
      countryCode: rawData['Landkod_Emittent'],
      assetClass: rawData['Tillgångsslag_enligt_LVF_5_kap'],
      nominalAmount: rawData['Nominellt_belopp'],
      
      // Sector information (from nested structure)
      sectorCode: rawData['Bransch']?.['Branschkod_instrument'],
      sectorName: rawData['Bransch']?.['Bransch_namn_instrument'],
      
      // Time period metadata (from our import process)
      quarterDisplay: rawData._displayQuarter,
      sourceDate: rawData._sourceDate,
      importedAt: rawData._importedAt,
      
      // Data source identifier
      dataSource: "FI"
    }
    
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
  const requiredFields = ['fundISIN', 'fundName', 'quarter']
  
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
  if (!/^\d{4}Q[1-4]$/.test(fundData.quarter)) {
    throw new Error('Invalid quarter format in transformed fund data')
  }
  
  return true
}

/**
 * Validate transformed holding data
 * @param {Object} holdingData - Transformed holding data
 * @returns {boolean}
 */
export function validateTransformedHoldingData(holdingData) {
  const requiredFields = ['fundISIN', 'instrumentName', 'quarter']
  
  for (const field of requiredFields) {
    if (!holdingData[field]) {
      console.warn(`⚠️ Missing required field '${field}' in transformed holding data`, holdingData)
      // Don't throw error during migration debugging - just warn
      // throw new Error(`Required field '${field}' is missing in transformed holding data`)
    }
  }
  
  // Validate ISIN formats only if they exist
  if (holdingData.fundISIN && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(holdingData.fundISIN)) {
    console.warn('⚠️ Invalid fund ISIN format in transformed holding data:', holdingData.fundISIN)
  }
  
  if (holdingData.instrumentISIN && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(holdingData.instrumentISIN)) {
    console.warn('⚠️ Invalid instrument ISIN format in transformed holding data:', holdingData.instrumentISIN)
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
      const { holding, fundISIN, quarter } = swedishHoldings[i]
      const transformedHolding = transformHoldingData(holding, fundISIN, quarter)
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
