/**
 * Utilities for parsing FI ZIP filenames and extracting source metadata
 */

/**
 * Parse FI ZIP filename to extract source date and quarter information
 * @param {string} fileName - ZIP filename (e.g., "Fondinnehav_2025Q1_2025-07-08 16.04.zip")
 * @returns {object} Parsed metadata with sourceDate, sourceQuarter, fileName
 */
export function parseZipFileName(fileName) {
  console.log('🔍 Parsing ZIP filename:', fileName)
  
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid ZIP filename: empty or not a string')
  }
  
  // Handle FI filename format: "Fondinnehav_2025Q1_2025-07-08 16.04.zip"
  const fiMatch = fileName.match(/Fondinnehav_(\d{4}Q\d)_(\d{4}-\d{2}-\d{2})/)
  
  if (fiMatch) {
    const result = {
      quarter: fiMatch[1],      // "2025Q1"
      sourceDate: fiMatch[2],   // "2025-07-08"
      fileName: fileName
    }
    console.log('✅ ZIP filename parsed (FI format):', result)
    return result
  }
  
  // Handle alternative format: "2025Q1_2025-04-16.zip"
  const primaryMatch = fileName.match(/(\d{4}Q\d)_(\d{4}-\d{2}-\d{2})\.zip/)
  
  if (primaryMatch) {
    const result = {
      quarter: primaryMatch[1],      // "2025Q1"
      sourceDate: primaryMatch[2],   // "2025-04-16"
      fileName: fileName
    }
    console.log('✅ ZIP filename parsed (standard format):', result)
    return result
  }
  
  // Fallback format: Try to extract date from filename in other ways
  const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/)
  if (dateMatch) {
    const date = dateMatch[1]
    // Try to infer quarter from date
    const month = parseInt(date.split('-')[1])
    const year = date.split('-')[0]
    const quarter = Math.ceil(month / 3)
    
    const result = {
      quarter: `${year}Q${quarter}`,
      sourceDate: date,
      fileName: fileName
    }
    console.log('✅ ZIP filename parsed (fallback):', result)
    return result
  }
  
  // Extract quarter if present
  const quarterMatch = fileName.match(/(\d{4}Q\d)/)
  if (quarterMatch) {
    // Use current date as fallback for source date
    const currentDate = new Date().toISOString().split('T')[0]
    
    const result = {
      quarter: quarterMatch[1],
      sourceDate: currentDate,
      fileName: fileName
    }
    console.log('✅ ZIP filename parsed (quarter only):', result)
    return result
  }
  
  console.error('❌ Could not parse ZIP filename:', fileName)
  throw new Error(`Invalid ZIP filename format: ${fileName}`)
}

/**
 * Extract ZIP filename from URL
 * @param {string} url - Full URL to ZIP file
 * @returns {string} Just the filename part
 */
export function extractFileNameFromUrl(url) {
  try {
    console.log('🔍 Extracting filename from URL:', url)
    
    // Handle URLs with query parameters (FI format)
    if (url.includes('filnamn=')) {
      const urlObj = new URL(url)
      const filename = urlObj.searchParams.get('filnamn')
      if (filename) {
        // URL decode the filename
        const decodedFilename = decodeURIComponent(filename)
        console.log('🔍 Extracted filename from query parameter:', decodedFilename)
        return decodedFilename
      }
    }
    
    // Fallback: extract from path
    const urlParts = url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    
    // Remove query parameters if present
    const cleanFileName = fileName.split('?')[0]
    
    // URL decode if needed
    const decodedFileName = decodeURIComponent(cleanFileName)
    
    console.log('🔍 Extracted filename from URL path:', decodedFileName)
    return decodedFileName
  } catch (error) {
    console.error('❌ Failed to extract filename from URL:', url, error)
    throw new Error(`Could not extract filename from URL: ${url}`)
  }
}

/**
 * Generate a unique import ID based on source date and timestamp
 * @param {string} sourceDate - Source date from ZIP filename
 * @returns {string} Unique import identifier
 */
export function generateImportId(sourceDate) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 5)
  const importId = `fi-import-${sourceDate}-${timestamp}-${random}`
  
  console.log('🔄 Generated import ID:', importId)
  return importId
}

/**
 * Validate source date format
 * @param {string} sourceDate - Date string to validate
 * @returns {boolean} True if valid date format
 */
export function isValidSourceDate(sourceDate) {
  if (!sourceDate || typeof sourceDate !== 'string') {
    return false
  }
  
  // Check YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(sourceDate)) {
    return false
  }
  
  // Check if it's a valid date
  const date = new Date(sourceDate)
  return date instanceof Date && !isNaN(date) && date.toISOString().substr(0, 10) === sourceDate
}

/**
 * Format source date for display
 * @param {string} sourceDate - Source date string
 * @returns {string} Formatted date for UI display
 */
export function formatSourceDateForDisplay(sourceDate) {
  if (!isValidSourceDate(sourceDate)) {
    return sourceDate
  }
  
  try {
    const date = new Date(sourceDate)
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    console.error('❌ Failed to format source date:', sourceDate, error)
    return sourceDate
  }
}

/**
 * Compare two source dates for sorting
 * @param {string} a - First source date
 * @param {string} b - Second source date
 * @returns {number} Sort comparison result
 */
export function compareSourceDates(a, b) {
  return new Date(b) - new Date(a) // Newest first
}

/**
 * Format quarter for display (e.g., "2025Q1" -> "2025 Q1")
 * @param {string} quarter - Quarter string (e.g., "2025Q1")
 * @returns {string} Formatted quarter for UI display
 */
export function formatQuarterForDisplay(quarter) {
  if (!quarter || typeof quarter !== 'string') {
    return quarter
  }
  
  // Extract year and quarter from format like "2025Q1"
  const match = quarter.match(/^(\d{4})Q(\d)$/)
  if (match) {
    const [, year, q] = match
    return `${year} Q${q}`
  }
  
  // Return as-is if format doesn't match
  return quarter
}

/**
 * Compare two quarters for sorting (newest quarter first)
 * @param {string} a - First quarter (e.g., "2025Q1")
 * @param {string} b - Second quarter (e.g., "2024Q4")
 * @returns {number} Sort comparison result
 */
export function compareQuarters(a, b) {
  if (!a || !b) return 0
  
  // Extract year and quarter from format like "2025Q1"
  const parseQuarter = (quarter) => {
    const match = quarter.match(/^(\d{4})Q(\d)$/)
    if (match) {
      const [, year, q] = match
      return { year: parseInt(year), quarter: parseInt(q) }
    }
    return { year: 0, quarter: 0 }
  }
  
  const quarterA = parseQuarter(a)
  const quarterB = parseQuarter(b)
  
  // Compare by year first, then by quarter
  if (quarterA.year !== quarterB.year) {
    return quarterB.year - quarterA.year // Newer year first
  }
  
  return quarterB.quarter - quarterA.quarter // Higher quarter first within same year
}
