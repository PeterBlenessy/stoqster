/**
 * FI Funds Database Implementation
 * 
 * Provides specialized database operations for FI fund data using the generic
 * IndexedDB wrapper. This class handles fund and holdings data with optimized
 * queries for time-series analysis and fund analytics.
 */

import { IndexedDBManager } from '../core/IndexedDBManager.js'
import { createQuery } from '../core/QueryBuilder.js'
import { compareQuarters } from '../../api/fiHistoricalUtils.js'
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

            // Use auto-increment keys - no composite key generation needed

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
     * @returns {Promise<Object|null>}
     */
    async getFund(fundISIN, quarter) {
        try {
            // Use compound index to find fund by ISIN and quarter
            const query = createQuery(this, 'funds')
                .equals('fundISIN', fundISIN)
                .equals('quarter', quarter)

            const results = await query.execute()
            return results.length > 0 ? results[0] : null
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

            // Sort by quarter using proper quarter comparison
            timeline.sort((a, b) => compareQuarters(a.quarter, b.quarter))

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
     * @returns {Promise<Array>}
     */
    async getQuarterSnapshot(quarter) {
        try {
            console.log('🔍 Getting quarter snapshot for:', quarter)

            const query = createQuery(this, 'funds')
                .equals('quarter', quarter)
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
     * @returns {Promise<Array>}
     */
    async getFundsByCompany(managementCompany, quarter = null) {
        try {
            let query = createQuery(this, 'funds')
                .equals('managementCompany', managementCompany)
                .orderBy('fundName')

            if (quarter) query = query.equals('quarter', quarter)

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
     * @returns {Promise<Array>}
     */
    async searchFunds(namePattern, quarter = null) {
        try {
            let query = createQuery(this, 'funds')

            if (quarter) query = query.equals('quarter', quarter)

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
     * Add holding data
     * @param {Object} holdingData - Raw holding data from FI
     * @param {string} fundISIN - Fund ISIN
     * @param {string} quarter - Quarter for the holding
     * @returns {Promise<string>} The holding key
     */
    async addHolding(holdingData, fundISIN, quarter) {
        try {
            console.log('📦 Adding holding data for fund:', fundISIN)

            // Transform Swedish data to English format
            const transformedData = transformHoldingData(holdingData, fundISIN, quarter)

            // Use auto-increment keys - no composite key generation needed

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
     * @returns {Promise<Array>}
     */
    async getFundHoldings(fundISIN, quarter) {
        try {
            console.log('🔍 Getting holdings for fund:', fundISIN, quarter)

            const query = createQuery(this, 'holdings')
                .equals('fundISIN', fundISIN)
                .equals('quarter', quarter)
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
     * @returns {Promise<Object>} Sector allocation summary
     */
    async getSectorAllocation(quarter) {
        try {
            console.log('🔍 Getting sector allocation for:', quarter)

            const query = createQuery(this, 'holdings')
                .equals('quarter', quarter)

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
     * @param {Array} holdingsDataArray - Array of raw holdings data with fundISIN already included
     * @param {Function} progressCallback - Progress update callback
     * @returns {Promise<number>} Number of holdings imported
     */
    async bulkImportHoldings(holdingsDataArray, progressCallback = null) {
        try {
            console.log('📦 Starting bulk holdings import:', holdingsDataArray.length, 'holdings')

            const transformedHoldings = holdingsDataArray.map((holdingData, index) => {
                // Holdings data should already have fundISIN from migration pipeline
                const rawHolding = holdingData
                const quarter = holdingData._quarter || holdingData.quarter
                const fundISIN = holdingData.fundISIN

                if (!fundISIN || fundISIN === 'NOT_FOUND') {
                    console.warn(`⚠️ Missing or invalid fundISIN in holding ${index + 1}:`, fundISIN)
                }

                const transformed = transformHoldingData(rawHolding, fundISIN, quarter)

                const now = new Date().toISOString()
                transformed.importedAt = transformed.importedAt || now

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

    /**
     * Add multiple funds in a single transaction (already transformed data)
     * @param {Array} fundsArray - Array of already transformed fund data
     * @returns {Promise<number>} Number of funds added
     */
    async addFunds(fundsArray) {
        try {
            console.log('📦 Adding funds in bulk:', fundsArray.length, 'funds')

            // Add timestamps to all funds
            const now = new Date().toISOString()
            const enrichedFunds = fundsArray.map(fund => ({
                ...fund,
                createdAt: fund.createdAt || now,
                updatedAt: now
            }))

            // Validate all funds before insertion
            enrichedFunds.forEach((fund, index) => {
                try {
                    FI_FUNDS_SCHEMA.validate('funds', fund)
                } catch (error) {
                    console.error(`❌ Validation failed for fund ${index + 1}:`, error)
                    throw new Error(`Fund validation failed at index ${index + 1}: ${error.message}`)
                }
            })

            // Use bulk insert from base class
            const addedCount = await this.bulkInsert('funds', enrichedFunds)

            console.log('✅ Bulk funds added successfully:', addedCount)
            return addedCount
        } catch (error) {
            console.error('❌ Error adding funds in bulk:', error)
            throw error
        }
    }

    /**
     * Add multiple holdings in a single transaction (already transformed data)
     * @param {Array} holdingsArray - Array of already transformed holdings data
     * @returns {Promise<number>} Number of holdings added
     */
    async addHoldings(holdingsArray) {
        try {
            console.log('📦 Adding holdings in bulk:', holdingsArray.length, 'holdings')

            // Add timestamps to all holdings
            const now = new Date().toISOString()
            const enrichedHoldings = holdingsArray.map(holding => ({
                ...holding,
                createdAt: holding.createdAt || now,
                updatedAt: now
            }))

            // Validate all holdings before insertion
            enrichedHoldings.forEach((holding, index) => {
                try {
                    FI_FUNDS_SCHEMA.validate('holdings', holding)
                } catch (error) {
                    console.error(`❌ Validation failed for holding ${index + 1}:`, error)
                    throw new Error(`Holding validation failed at index ${index + 1}: ${error.message}`)
                }
            })

            // Use bulk insert from base class
            const addedCount = await this.bulkInsert('holdings', enrichedHoldings)

            console.log('✅ Bulk holdings added successfully:', addedCount)
            return addedCount
        } catch (error) {
            console.error('❌ Error adding holdings in bulk:', error)
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
