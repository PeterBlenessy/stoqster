/**
 * FI Funds Database Schema
 * 
 * Defines the schema for the dedicated FI funds IndexedDB database.
 * This database stores fund data and holdings with optimized indexes for
 * time-series analysis and complex fund analytics.
 */

import { createSchema, defineStore, defineIndex, defineCompoundIndex } from '../core/DatabaseSchema.js'

/**
 * FI Funds Database Schema Definition
 */
export const FI_FUNDS_SCHEMA = createSchema({
  version: 1, // Simple version 1 since we always create fresh database
  stores: {
    /**
     * Funds table - stores fund metadata and performance data
     */
    funds: defineStore({
      autoIncrement: true, // Use auto-increment primary keys instead of composite keys
      indexes: {
        // Primary identifiers
        fundISIN: defineIndex('fundISIN'),
        fundName: defineIndex('fundName'),
        
        // Time-based indexes for time-series queries
        quarter: defineIndex('quarter'),
        
        // Fund metadata indexes
        institutionNumber: defineIndex('institutionNumber'),
        
        // Performance indexes
        assetsUnderManagement: defineIndex('assetsUnderManagement'),
        activeRisk: defineIndex('activeRisk'),
        volatility24Months: defineIndex('volatility24Months'),
        
        // Compound indexes for complex queries
        fundQuarter: defineCompoundIndex(['fundISIN', 'quarter']),
        
        // Date-based indexes
        sourceDate: defineIndex('sourceDate'),
        importedAt: defineIndex('importedAt')
      },
      required: ['fundISIN', 'quarter', 'fundName'],
      validate: validateFundData
    }),

    /**
     * Holdings table - stores fund holdings data
     */
    holdings: defineStore({
      autoIncrement: true, // Use auto-increment primary keys instead of composite keys
      indexes: {
        // Primary identifiers
        fundISIN: defineIndex('fundISIN'),
        instrumentISIN: defineIndex('instrumentISIN'),
        instrumentName: defineIndex('instrumentName'),
        
        // Time-based indexes
        quarter: defineIndex('quarter'),
        
        // Holding characteristics
        sectorCode: defineIndex('sectorCode'),
        sectorName: defineIndex('sectorName'),
        countryCode: defineIndex('countryCode'),
        currency: defineIndex('currency'),
        assetClass: defineIndex('assetClass'),
        
        // Value and percentage indexes
        marketValue: defineIndex('marketValue'),
        percentageOfFund: defineIndex('percentageOfFund'),
        quantity: defineIndex('quantity'),
        
        // Compound indexes for complex queries
        fundQuarter: defineCompoundIndex(['fundISIN', 'quarter']),
        instrumentQuarter: defineCompoundIndex(['instrumentISIN', 'quarter']),
        fundInstrument: defineCompoundIndex(['fundISIN', 'instrumentISIN']),
        sectorQuarter: defineCompoundIndex(['sectorCode', 'quarter']),
        countryQuarter: defineCompoundIndex(['countryCode', 'quarter']),
        
        // Date-based indexes
        sourceDate: defineIndex('sourceDate'),
        importedAt: defineIndex('importedAt')
      },
      required: ['fundISIN', 'quarter', 'instrumentName'],
      validate: validateHoldingData
    })
  }
})

/**
 * Validate fund data before insertion
 * @param {Object} fundData
 * @returns {boolean}
 */
function validateFundData(fundData) {
  // Required field validation
  if (!fundData.fundISIN || typeof fundData.fundISIN !== 'string') {
    throw new Error('Fund ISIN must be a non-empty string')
  }
  
  if (!fundData.fundName || typeof fundData.fundName !== 'string') {
    throw new Error('Fund name must be a non-empty string')
  }
  
  if (!fundData.quarter || typeof fundData.quarter !== 'string') {
    throw new Error('Quarter must be a non-empty string')
  }

  // Validate ISIN format (basic check)
  const isinPattern = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/
  if (!isinPattern.test(fundData.fundISIN)) {
    throw new Error('Fund ISIN must be in valid ISIN format')
  }

  // Validate quarter format (2024Q1, etc.)
  const quarterPattern = /^\d{4}Q[1-4]$/
  if (!quarterPattern.test(fundData.quarter)) {
    throw new Error('Quarter must be in format like 2024Q1, 2024Q2, etc.')
  }

  // Validate numeric fields if present
  if (fundData.assetsUnderManagement !== undefined && 
      (typeof fundData.assetsUnderManagement !== 'number' || fundData.assetsUnderManagement < 0)) {
    throw new Error('Assets under management must be a non-negative number')
  }

  return true
}

/**
 * Validate holding data before insertion
 * @param {Object} holdingData
 * @returns {boolean}
 */
function validateHoldingData(holdingData) {
  // Required field validation
  if (!holdingData.fundISIN || typeof holdingData.fundISIN !== 'string') {
    throw new Error('Fund ISIN must be a non-empty string')
  }
  
  if (!holdingData.instrumentName || typeof holdingData.instrumentName !== 'string') {
    throw new Error('Instrument name must be a non-empty string')
  }
  
  if (!holdingData.quarter || typeof holdingData.quarter !== 'string') {
    throw new Error('Quarter must be a non-empty string')
  }

  // Validate ISIN formats
  const isinPattern = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/
  if (!isinPattern.test(holdingData.fundISIN)) {
    throw new Error('Fund ISIN must be in valid ISIN format')
  }
  
  // Instrument ISIN is optional but if present must be valid
  if (holdingData.instrumentISIN && !isinPattern.test(holdingData.instrumentISIN)) {
    throw new Error('Instrument ISIN must be in valid ISIN format')
  }

  // Validate quarter format
  const quarterPattern = /^\d{4}Q[1-4]$/
  if (!quarterPattern.test(holdingData.quarter)) {
    throw new Error('Quarter must be in format like 2024Q1, 2024Q2, etc.')
  }

  // Validate numeric fields if present
  if (holdingData.marketValue !== undefined && 
      (typeof holdingData.marketValue !== 'number' || holdingData.marketValue < 0)) {
    throw new Error('Market value must be a non-negative number')
  }

  if (holdingData.percentageOfFund !== undefined && 
      (typeof holdingData.percentageOfFund !== 'number' || 
       holdingData.percentageOfFund < 0 || holdingData.percentageOfFund > 100)) {
    throw new Error('Percentage of fund must be between 0 and 100')
  }

  if (holdingData.quantity !== undefined && 
      (typeof holdingData.quantity !== 'number' || holdingData.quantity < 0)) {
    throw new Error('Quantity must be a non-negative number')
  }

  return true
}

/**
 * Common query patterns for FI funds database
 */
export const FI_QUERY_PATTERNS = {
  /**
   * Get all data for a specific fund across all quarters
   */
  FUND_TIMELINE: 'fundISIN',
  
  /**
   * Get all funds for a specific quarter
   */
  QUARTER_SNAPSHOT: 'quarter',
  
  /**
   * Get holdings by sector across quarters
   */
  SECTOR_ANALYSIS: 'sectorCode',
  
  /**
   * Get holdings by country allocation
   */
  COUNTRY_ALLOCATION: 'countryCode',
  
  /**
   * Get fund holdings timeline
   */
  FUND_HOLDINGS: 'fundISIN'
}
