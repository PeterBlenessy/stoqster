/**
 * FI Funds Database Implementation
 * 
 * Provides specialized database operations for FI fund data using the generic
 * IndexedDB wrapper. This class handles fund and holdings data with optimized
 * queries for time-series analysis and fund analytics.
 */

import { IndexedDBManager } from '../core/IndexedDBManager.js'
import { createQuery } from '../core/QueryBuilder.js'
import { 
  FI_FUNDS_SCHEMA, 
  FI_QUERY_PATTERNS 
} from './FIFundsSchema.js'
import { transformFundData, transformHoldingData } from './FITransformations.js'

/**
 * FI Funds Database Manager
 * Extends IndexedDBManager with FI-specific operations
 */
export class FIFundsDB extends IndexedDBManager {
  constructor() {
    super('fi-funds', FI_FUNDS_SCHEMA.version, FI_FUNDS_SCHEMA)
    console.log('🔄 Initializing FI Funds database')
  }

  /**
   * Initialize the database and ensure it's ready for operations
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this.open()
      console.log('✅ FI Funds database initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize FI Funds database:', error)
      throw error
    }
  }

  // ==================== FUND OPERATIONS ====================

  /**
   * Add or update fund data
   * @param {Object} fundData - Raw fund data (Swedish format)
   * @returns {Promise<string>} The fund key
   */
  async addFund(fundData) {
    try {
      console.log('📦 Adding fund data for:', fundData.fondnamn || fundData.fundName)
      
      // Transform Swedish data to English format
      const transformedData = transformFundData(fundData)
      
      // Generate composite key
      transformedData.id = generateFundKey(
        transformedData.fundISIN, 
        transformedData.quarter, 
        transformedData.year
      )
      
      // Add timestamps
      const now = new Date().toISOString()
      transformedData.createdAt = transformedData.createdAt || now
      transformedData.updatedAt = now
      
      // Validate before insertion
      FI_FUNDS_SCHEMA.validate('funds', transformedData)
      
      const key = await this.put('funds', transformedData)
      console.log('✅ Fund data added with key:', key)
      return key
    } catch (error) {
      console.error('❌ Error adding fund data:', error)
      throw error
    }
  }

  /**
   * Get fund data by ISIN and quarter
   * @param {string} fundISIN
   * @param {string} quarter
   * @param {number} year
   * @returns {Promise<Object|null>}
   */
  async getFund(fundISIN, quarter, year) {
    try {
      const key = generateFundKey(fundISIN, quarter, year)
      const fund = await this.get('funds', key)
      return fund || null
    } catch (error) {
      console.error('❌ Error getting fund:', error)
      throw error
    }
  }

  /**
   * Get complete timeline for a fund across all quarters
   * @param {string} fundISIN
   * @returns {Promise<Array>} Array of fund data sorted by quarter
   */
  async getFundTimeline(fundISIN) {
    try {
      console.log('🔍 Getting timeline for fund:', fundISIN)
      
      const timeline = await this.query('funds', 'fundISIN', fundISIN)
      
      // Sort by year and quarter
      timeline.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.quarter.localeCompare(b.quarter)
      })
      
      console.log('✅ Retrieved timeline with', timeline.length, 'quarters')
      return timeline
    } catch (error) {
      console.error('❌ Error getting fund timeline:', error)
      throw error
    }
  }

  /**
   * Get all funds for a specific quarter
   * @param {string} quarter
   * @param {number} year
   * @returns {Promise<Array>}
   */
  async getQuarterSnapshot(quarter, year) {
    try {
      console.log('🔍 Getting quarter snapshot for:', quarter, year)
      
      const query = createQuery(this, 'funds')
        .equals('quarter', quarter)
        .equals('year', year)
        .orderBy('fundName')
      
      const funds = await query.execute()
      
      console.log('✅ Retrieved', funds.length, 'funds for quarter')
      return funds
    } catch (error) {
      console.error('❌ Error getting quarter snapshot:', error)
      throw error
    }
  }

  /**
   * Get funds by management company
   * @param {string} managementCompany
   * @param {string} quarter - Optional quarter filter
   * @param {number} year - Optional year filter
   * @returns {Promise<Array>}
   */
  async getFundsByCompany(managementCompany, quarter = null, year = null) {
    try {
      let query = createQuery(this, 'funds')
        .equals('managementCompany', managementCompany)
        .orderBy('fundName')
      
      if (quarter) query = query.equals('quarter', quarter)
      if (year) query = query.equals('year', year)
      
      return await query.execute()
    } catch (error) {
      console.error('❌ Error getting funds by company:', error)
      throw error
    }
  }

  /**
   * Search funds by name pattern
   * @param {string} namePattern
   * @param {string} quarter - Optional quarter filter
   * @param {number} year - Optional year filter
   * @returns {Promise<Array>}
   */
  async searchFunds(namePattern, quarter = null, year = null) {
    try {
      let query = createQuery(this, 'funds')
      
      if (quarter) query = query.equals('quarter', quarter)
      if (year) query = query.equals('year', year)
      
      const funds = await query.execute()
      
      // Filter by name pattern (case-insensitive)
      const pattern = namePattern.toLowerCase()
      return funds.filter(fund => 
        fund.fundName?.toLowerCase().includes(pattern)
      )
    } catch (error) {
      console.error('❌ Error searching funds:', error)
      throw error
    }
  }

  // ==================== HOLDINGS OPERATIONS ====================

  /**
   * Add or update holding data
   * @param {Object} holdingData - Raw holding data (Swedish format)
   * @param {string} fundISIN - Fund ISIN to associate with
   * @param {string} quarter - Quarter for the holding
   * @param {number} year - Year for the holding
   * @returns {Promise<string>} The holding key
   */
  async addHolding(holdingData, fundISIN, quarter, year) {
    try {
      console.log('📦 Adding holding data for fund:', fundISIN)
      
      // Transform Swedish data to English format
      const transformedData = transformHoldingData(holdingData, fundISIN, quarter, year)
      
      // Generate composite key
      transformedData.id = generateHoldingKey(
        transformedData.fundISIN,
        transformedData.quarter,
        transformedData.year,
        transformedData.instrumentISIN
      )
      
      // Add timestamps
      const now = new Date().toISOString()
      transformedData.createdAt = transformedData.createdAt || now
      transformedData.updatedAt = now
      
      // Validate before insertion
      FI_FUNDS_SCHEMA.validate('holdings', transformedData)
      
      const key = await this.put('holdings', transformedData)
      return key
    } catch (error) {
      console.error('❌ Error adding holding data:', error)
      throw error
    }
  }

  /**
   * Get all holdings for a fund in a specific quarter
   * @param {string} fundISIN
   * @param {string} quarter
   * @param {number} year
   * @returns {Promise<Array>}
   */
  async getFundHoldings(fundISIN, quarter, year) {
    try {
      console.log('🔍 Getting holdings for fund:', fundISIN, quarter, year)
      
      const query = createQuery(this, 'holdings')
        .equals('fundISIN', fundISIN)
        .equals('quarter', quarter)
        .equals('year', year)
        .orderBy('percentageOfFund', 'desc')
      
      let holdings = await query.execute()
      
      // Fallback: Manual sorting if database ordering doesn't work correctly
      if (holdings.length > 1) {
        holdings.sort((a, b) => (b.percentageOfFund || 0) - (a.percentageOfFund || 0))
      }
      
      console.log('✅ Retrieved', holdings.length, 'holdings')
      return holdings
    } catch (error) {
      console.error('❌ Error getting fund holdings:', error)
      throw error
    }
  }

  /**
   * Get holding timeline for a specific instrument across all funds
   * @param {string} instrumentISIN
   * @returns {Promise<Array>}
   */
  async getInstrumentTimeline(instrumentISIN) {
    try {
      console.log('🔍 Getting instrument timeline for:', instrumentISIN)
      
      const timeline = await this.query('holdings', 'instrumentISIN', instrumentISIN)
      
      // Sort by year, quarter, and fund
      timeline.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        if (a.quarter !== b.quarter) return a.quarter.localeCompare(b.quarter)
        return a.fundISIN.localeCompare(b.fundISIN)
      })
      
      return timeline
    } catch (error) {
      console.error('❌ Error getting instrument timeline:', error)
      throw error
    }
  }

  /**
   * Get sector allocation for a specific quarter
   * @param {string} quarter
   * @param {number} year
   * @returns {Promise<Object>} Sector allocation summary
   */
  async getSectorAllocation(quarter, year) {
    try {
      console.log('🔍 Getting sector allocation for:', quarter, year)
      
      const query = createQuery(this, 'holdings')
        .equals('quarter', quarter)
        .equals('year', year)
      
      const holdings = await query.execute()
      
      // Group by sector and calculate totals
      const sectorTotals = holdings.reduce((acc, holding) => {
        const sector = holding.sector || 'Unknown'
        if (!acc[sector]) {
          acc[sector] = {
            sector,
            totalMarketValue: 0,
            numberOfHoldings: 0,
            funds: new Set()
          }
        }
        
        acc[sector].totalMarketValue += holding.marketValue || 0
        acc[sector].numberOfHoldings += 1
        acc[sector].funds.add(holding.fundISIN)
        
        return acc
      }, {})
      
      // Convert sets to counts
      Object.values(sectorTotals).forEach(sector => {
        sector.numberOfFunds = sector.funds.size
        delete sector.funds
      })
      
      return sectorTotals
    } catch (error) {
      console.error('❌ Error getting sector allocation:', error)
      throw error
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk import fund data with progress tracking
   * @param {Array} fundDataArray - Array of raw fund data
   * @param {Function} progressCallback - Progress update callback
   * @returns {Promise<number>} Number of funds imported
   */
  async bulkImportFunds(fundDataArray, progressCallback = null) {
    try {
      console.log('📦 Starting bulk fund import:', fundDataArray.length, 'funds')
      
      const transformedFunds = fundDataArray.map((fundData, index) => {
        const transformed = transformFundData(fundData)
        
        const now = new Date().toISOString()
        transformed.importedAt = transformed.importedAt || now
        
        // Debug: Print the first transformed fund
        if (index === 0) {
          console.log('🔍 First transformed fund object:', JSON.stringify(transformed, null, 2))
        }
        
        return transformed
      })
      
      const imported = await this.bulkInsert('funds', transformedFunds, progressCallback)
      
      console.log('✅ Bulk fund import completed:', imported, 'funds imported')
      return imported
    } catch (error) {
      console.error('❌ Error in bulk fund import:', error)
      throw error
    }
  }

  /**
   * Bulk import holdings data with progress tracking
   * @param {Array} holdingsDataArray - Array of raw holdings data
   * @param {Function} progressCallback - Progress update callback
   * @returns {Promise<number>} Number of holdings imported
   */
  async bulkImportHoldings(holdingsDataArray, progressCallback = null) {
    try {
      console.log('📦 Starting bulk holdings import:', holdingsDataArray.length, 'holdings')
      
      const transformedHoldings = holdingsDataArray.map((holdingData, index) => {
        // Check if this is migration format (direct holding data) or API format (nested)
        let rawHolding, fundISIN, quarter
        
        if (holdingData.holding) {
          // API format: { holding, fundISIN, quarter }
          rawHolding = holdingData.holding
          fundISIN = holdingData.fundISIN
          quarter = holdingData.quarter
        } else {
          // Migration format: holding data with metadata fields directly included
          rawHolding = holdingData
          fundISIN = holdingData.fundISIN
          quarter = holdingData.quarter
          
          // Debug logging
          console.log('🔍 Migration data extraction:', {
            fundISIN: fundISIN,
            quarter: quarter, 
            hasRawFundISIN: !!holdingData.fundISIN,
            hasRawQuarter: !!holdingData.quarter,
            quarterValue: holdingData.quarter,
            holdingDataKeys: Object.keys(holdingData).slice(0, 10) // First 10 keys
          })
        }
        
        const transformed = transformHoldingData(rawHolding, fundISIN, quarter)
        
        const now = new Date().toISOString()
        transformed.importedAt = transformed.importedAt || now
        
        // Debug: Print the first transformed holding
        if (index === 0) {
          console.log('🔍 First transformed holding object:', JSON.stringify(transformed, null, 2))
        }
        
        return transformed
      })
      
      const imported = await this.bulkInsert('holdings', transformedHoldings, progressCallback)
      
      console.log('✅ Bulk holdings import completed:', imported, 'holdings imported')
      return imported
    } catch (error) {
      console.error('❌ Error in bulk holdings import:', error)
      throw error
    }
  }

  // ==================== ANALYTICS OPERATIONS ====================

  /**
   * Get performance statistics for a fund
   * @param {string} fundISIN
   * @returns {Promise<Object>}
   */
  async getFundStatistics(fundISIN) {
    try {
      const timeline = await this.getFundTimeline(fundISIN)
      
      if (timeline.length === 0) {
        return null
      }
      
      const stats = {
        fundISIN,
        fundName: timeline[0].fundName,
        quarters: timeline.length,
        firstQuarter: timeline[0],
        lastQuarter: timeline[timeline.length - 1],
        assetsGrowth: null,
        averageAssets: 0
      }
      
      // Calculate assets growth
      if (timeline.length > 1) {
        const first = timeline[0].assetsUnderManagement || 0
        const last = timeline[timeline.length - 1].assetsUnderManagement || 0
        stats.assetsGrowth = first > 0 ? ((last - first) / first) * 100 : null
      }
      
      // Calculate average assets
      const totalAssets = timeline.reduce((sum, fund) => sum + (fund.assetsUnderManagement || 0), 0)
      stats.averageAssets = totalAssets / timeline.length
      
      return stats
    } catch (error) {
      console.error('❌ Error getting fund statistics:', error)
      throw error
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>}
   */
  async getDatabaseStats() {
    try {
      const [fundsCount, holdingsCount] = await Promise.all([
        this.count('funds'),
        this.count('holdings')
      ])
      
      return {
        totalFunds: fundsCount,
        totalHoldings: holdingsCount,
        dbName: this.dbName,
        version: this.version
      }
    } catch (error) {
      console.error('❌ Error getting database statistics:', error)
      throw error
    }
  }
}

// Export singleton instance
export const fiFundsDB = new FIFundsDB()
