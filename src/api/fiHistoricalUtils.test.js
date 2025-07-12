/**
 * Test file for FI Historical Utils functions
 * Run this in browser console to validate parsing logic
 * 
 * USAGE IN BROWSER CONSOLE:
 * 1. Open the FI funds page: https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/
 * 2. Open browser DevTools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire file
 * 5. Run: runTests() - for parsing tests
 * 6. Run: testListPublishedFiles() - to list all published files
 */

import { parseZipFileName, extractFileNameFromUrl } from './fiHistoricalUtils.js'

// Test cases based on actual FI data
const testCases = [
  {
    name: 'Actual FI URL format',
    url: 'https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/download/?filnamn=Fondinnehav_2025Q1_2025-07-08%2016.04.zip',
    expectedFilename: 'Fondinnehav_2025Q1_2025-07-08 16.04.zip',
    expectedSourceDate: '2025-07-08',
    expectedQuarter: '2025Q1'
  },
  {
    name: 'Standard format',
    url: 'https://example.com/2025Q1_2025-04-16.zip',
    expectedFilename: '2025Q1_2025-04-16.zip',
    expectedSourceDate: '2025-04-16',
    expectedQuarter: '2025Q1'
  },
  {
    name: 'Direct filename parsing',
    filename: 'Fondinnehav_2025Q2_2025-10-15 14.23.zip',
    expectedSourceDate: '2025-10-15',
    expectedQuarter: '2025Q2'
  }
]

function runTests() {
  console.log('🧪 Running FI Historical Utils Tests')
  
  let passed = 0
  let failed = 0
  
  testCases.forEach((testCase, index) => {
    try {
      console.log(`\n📋 Test ${index + 1}: ${testCase.name}`)
      
      let filename
      if (testCase.url) {
        filename = extractFileNameFromUrl(testCase.url)
        console.log(`   Extracted filename: "${filename}"`)
        
        if (testCase.expectedFilename && filename !== testCase.expectedFilename) {
          throw new Error(`Expected filename "${testCase.expectedFilename}", got "${filename}"`)
        }
      } else {
        filename = testCase.filename
      }
      
      const result = parseZipFileName(filename)
      console.log(`   Parsed result:`, result)
      
      if (result.sourceDate !== testCase.expectedSourceDate) {
        throw new Error(`Expected sourceDate "${testCase.expectedSourceDate}", got "${result.sourceDate}"`)
      }
      
      if (result.quarter !== testCase.expectedQuarter) {
        throw new Error(`Expected quarter "${testCase.expectedQuarter}", got "${result.quarter}"`)
      }
      
      console.log(`   ✅ PASSED`)
      passed++
      
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`)
      failed++
    }
  })
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

// Test function to fetch and list all published FI files
async function testListPublishedFiles() {
  console.log('\n🌐 Testing FI Published Files Listing')
  
  try {
    const fiBaseUrl = 'https://www.fi.se'
    const fiListUrl = 'https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/'
    
    console.log('🔄 Fetching FI funds page...')
    const response = await fetch(fiListUrl)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    // Find the table with download links
    const table = doc.getElementsByTagName('tbody')[0]
    if (!table) {
      throw new Error('Could not find table with download links')
    }
    
    const aList = table.querySelectorAll('tr td:first-child a')
    console.log(`✅ Found ${aList.length} download links`)
    
    const publishedFiles = []
    
    aList.forEach((link, index) => {
      try {
        const fullUrl = fiBaseUrl + link.pathname + link.search
        const filename = extractFileNameFromUrl(fullUrl)
        const parsed = parseZipFileName(filename)
        
        publishedFiles.push({
          index: index + 1,
          url: fullUrl,
          filename: filename,
          quarter: parsed.quarter,
          sourceDate: parsed.sourceDate,
          linkText: link.textContent.trim()
        })
        
      } catch (error) {
        console.warn(`⚠️ Could not parse file ${index + 1}: ${error.message}`)
        publishedFiles.push({
          index: index + 1,
          url: fiBaseUrl + link.pathname + link.search,
          filename: 'PARSE_ERROR',
          quarter: 'UNKNOWN',
          sourceDate: 'UNKNOWN',
          linkText: link.textContent.trim(),
          error: error.message
        })
      }
    })
    
    // Sort by source date (newest first)
    publishedFiles.sort((a, b) => {
      if (a.sourceDate === 'UNKNOWN') return 1
      if (b.sourceDate === 'UNKNOWN') return -1
      return b.sourceDate.localeCompare(a.sourceDate)
    })
    
    console.log(`\n📋 Published FI Files (${publishedFiles.length} total):`)
    console.log('═'.repeat(80))
    
    publishedFiles.forEach((file) => {
      if (file.error) {
        console.log(`❌ ${file.index}. ERROR: ${file.linkText}`)
        console.log(`   Error: ${file.error}`)
      } else {
        console.log(`📁 ${file.index}. ${file.quarter} (${file.sourceDate})`)
        console.log(`   File: ${file.filename}`)
        console.log(`   URL: ${file.url}`)
      }
      console.log('')
    })
    
    // Summary statistics
    const validFiles = publishedFiles.filter(f => !f.error)
    const quarters = [...new Set(validFiles.map(f => f.quarter))].sort()
    const dateRange = validFiles.length > 0 ? {
      oldest: validFiles[validFiles.length - 1].sourceDate,
      newest: validFiles[0].sourceDate
    } : null
    
    console.log('📊 Summary:')
    console.log(`   Total files: ${publishedFiles.length}`)
    console.log(`   Valid files: ${validFiles.length}`)
    console.log(`   Parse errors: ${publishedFiles.length - validFiles.length}`)
    console.log(`   Quarters available: ${quarters.join(', ')}`)
    if (dateRange) {
      console.log(`   Date range: ${dateRange.oldest} to ${dateRange.newest}`)
    }
    
    return {
      success: true,
      files: publishedFiles,
      validFiles: validFiles.length,
      totalFiles: publishedFiles.length,
      quarters: quarters,
      dateRange: dateRange
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch published files:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Export for use in browser console or test runner
export { runTests, testListPublishedFiles }

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('🔧 FI Historical Utils Test Suite loaded.')
  console.log('Available functions:')
  console.log('  - runTests() - Run filename parsing tests')
  console.log('  - testListPublishedFiles() - Fetch and list all published FI files')
}
