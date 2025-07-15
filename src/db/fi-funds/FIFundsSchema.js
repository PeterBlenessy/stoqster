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
  version: 1,
  stores: {
    /**
     * Funds table - stores fund metadata and performance data
     */
    funds: defineStore({
      keyPath: 'id', // Composite key: fundISIN + quarter
      indexes: {
        // Primary identifiers
        fundISIN: defineIndex('fundISIN'),
        fundName: defineIndex('fundName'),
        
        // Time-based indexes for time-series queries
        quarter: defineIndex('quarter'),
        year: defineIndex('year'),
        quarterYear: defineCompoundIndex(['quarter', 'year']),
        
        // Fund metadata indexes
        fundType: defineIndex('fundType'),
        managementCompany: defineIndex('managementCompany'),
        fundCategory: defineIndex('fundCategory'),
        
        // Performance indexes
        assetsUnderManagement: defineIndex('assetsUnderManagement'),
        totalReturn: defineIndex('totalReturn'),
        numberOfUnitHolders: defineIndex('numberOfUnitHolders'),
        
        // Compound indexes for complex queries
        fundQuarter: defineCompoundIndex(['fundISIN', 'quarter']),
        typeQuarter: defineCompoundIndex(['fundType', 'quarter']),
        companyQuarter: defineCompoundIndex(['managementCompany', 'quarter']),
        
        // Date-based indexes
        reportDate: defineIndex('reportDate'),
        createdAt: defineIndex('createdAt'),
        updatedAt: defineIndex('updatedAt')
      },
      required: ['id', 'fundISIN', 'quarter', 'year', 'fundName'],
      validate: validateFundData
    }),

    /**
     * Holdings table - stores fund holdings data
     */
    holdings: defineStore({
      keyPath: 'id', // Composite key: fundISIN + quarter + instrumentISIN
      indexes: {
        // Primary identifiers
        fundISIN: defineIndex('fundISIN'),
        instrumentISIN: defineIndex('instrumentISIN'),
        instrumentName: defineIndex('instrumentName'),
        
        // Time-based indexes
        quarter: defineIndex('quarter'),
        year: defineIndex('year'),
        quarterYear: defineCompoundIndex(['quarter', 'year']),
        
        // Holding characteristics
        instrumentType: defineIndex('instrumentType'),
        sector: defineIndex('sector'),
        country: defineIndex('country'),
        currency: defineIndex('currency'),
        
        // Value and percentage indexes
        marketValue: defineIndex('marketValue'),
        percentageOfFund: defineIndex('percentageOfFund'),
        numberOfShares: defineIndex('numberOfShares'),
        
        // Compound indexes for complex queries
        fundQuarter: defineCompoundIndex(['fundISIN', 'quarter']),
        instrumentQuarter: defineCompoundIndex(['instrumentISIN', 'quarter']),
        fundInstrument: defineCompoundIndex(['fundISIN', 'instrumentISIN']),
        sectorQuarter: defineCompoundIndex(['sector', 'quarter']),
        countryQuarter: defineCompoundIndex(['country', 'quarter']),
        
        // Date-based indexes
        reportDate: defineIndex('reportDate'),
        createdAt: defineIndex('createdAt'),
        updatedAt: defineIndex('updatedAt')
      },
      required: ['id', 'fundISIN', 'quarter', 'year', 'instrumentISIN'],
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
  
  if (!fundData.year || typeof fundData.year !== 'number') {
    throw new Error('Year must be a number')
  }

  // Validate ISIN format (basic check)
  const isinPattern = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/
  if (!isinPattern.test(fundData.fundISIN)) {
    throw new Error('Fund ISIN must be in valid ISIN format')
  }

  // Validate quarter format (Q1, Q2, Q3, Q4)
  const quarterPattern = /^Q[1-4]$/
  if (!quarterPattern.test(fundData.quarter)) {
    throw new Error('Quarter must be in format Q1, Q2, Q3, or Q4')
  }

  // Validate year range
  const currentYear = new Date().getFullYear()
  if (fundData.year < 2000 || fundData.year > currentYear + 1) {
    throw new Error('Year must be between 2000 and current year + 1')
  }

  // Validate numeric fields if present
  if (fundData.assetsUnderManagement !== undefined && 
      (typeof fundData.assetsUnderManagement !== 'number' || fundData.assetsUnderManagement < 0)) {
    throw new Error('Assets under management must be a non-negative number')
  }

  if (fundData.numberOfUnitHolders !== undefined && 
      (typeof fundData.numberOfUnitHolders !== 'number' || fundData.numberOfUnitHolders < 0)) {
    throw new Error('Number of unit holders must be a non-negative number')
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
  
  if (!holdingData.instrumentISIN || typeof holdingData.instrumentISIN !== 'string') {
    throw new Error('Instrument ISIN must be a non-empty string')
  }
  
  if (!holdingData.quarter || typeof holdingData.quarter !== 'string') {
    throw new Error('Quarter must be a non-empty string')
  }
  
  if (!holdingData.year || typeof holdingData.year !== 'number') {
    throw new Error('Year must be a number')
  }

  // Validate ISIN formats
  const isinPattern = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/
  if (!isinPattern.test(holdingData.fundISIN)) {
    throw new Error('Fund ISIN must be in valid ISIN format')
  }
  
  if (!isinPattern.test(holdingData.instrumentISIN)) {
    throw new Error('Instrument ISIN must be in valid ISIN format')
  }

  // Validate quarter format
  const quarterPattern = /^Q[1-4]$/
  if (!quarterPattern.test(holdingData.quarter)) {
    throw new Error('Quarter must be in format Q1, Q2, Q3, or Q4')
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

  if (holdingData.numberOfShares !== undefined && 
      (typeof holdingData.numberOfShares !== 'number' || holdingData.numberOfShares < 0)) {
    throw new Error('Number of shares must be a non-negative number')
  }

  return true
}

/**
 * Generate composite primary key for funds table
 * @param {string} fundISIN
 * @param {string} quarter
 * @param {number} year
 * @returns {string}
 */
export function generateFundKey(fundISIN, quarter, year) {
  return `${fundISIN}#${quarter}#${year}`
}

/**
 * Generate composite primary key for holdings table
 * @param {string} fundISIN
 * @param {string} quarter
 * @param {number} year
 * @param {string} instrumentISIN
 * @returns {string}
 */
export function generateHoldingKey(fundISIN, quarter, year, instrumentISIN) {
  return `${fundISIN}#${quarter}#${year}#${instrumentISIN}`
}

/**
 * Parse composite key back to components
 * @param {string} key
 * @returns {Object}
 */
export function parseCompositeKey(key) {
  const parts = key.split('#')
  
  if (parts.length === 3) {
    // Fund key
    return {
      fundISIN: parts[0],
      quarter: parts[1],
      year: parseInt(parts[2])
    }
  } else if (parts.length === 4) {
    // Holding key
    return {
      fundISIN: parts[0],
      quarter: parts[1],
      year: parseInt(parts[2]),
      instrumentISIN: parts[3]
    }
  }
  
  throw new Error('Invalid composite key format')
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
   * Get fund performance by management company
   */
  COMPANY_FUNDS: 'managementCompany',
  
  /**
   * Get holdings by sector across quarters
   */
  SECTOR_ANALYSIS: 'sector',
  
  /**
   * Get holdings by country allocation
   */
  COUNTRY_ALLOCATION: 'country',
  
  /**
   * Get fund holdings timeline
   */
  FUND_HOLDINGS: 'fundISIN'
}
