/**
 * FI Funds Database Implementation
 *
 * Provides specialized database operations for FI fund data using the generic
 * IndexedDB wrapper. Handles fund and holdings data with optimized queries
 * for time-series analysis and fund analytics.
 */

import { IndexedDBManager } from '../core/IndexedDBManager.js'
import { createQuery } from '../core/QueryBuilder.js'
import { compareQuarters } from '../../api/fiHistoricalUtils.js'
import { FI_FUNDS_SCHEMA } from './FIFundsSchema.js'
import { transformFundData, transformHoldingData } from './FITransformations.js'

export class FIFundsDB extends IndexedDBManager {
    constructor() {
        super('fi-funds', FI_FUNDS_SCHEMA.version, FI_FUNDS_SCHEMA)
    }

    async initialize() {
        await this.open()
    }

    // ==================== FUND OPERATIONS ====================

    /**
     * Add or update fund data (transforms from Swedish if needed)
     * @param {Object} fundData - Raw fund data (Swedish format)
     * @returns {Promise<*>} The fund key
     */
    async addFund(fundData) {
        const transformedData = transformFundData(fundData)

        const now = new Date().toISOString()
        transformedData.createdAt = transformedData.createdAt || now
        transformedData.updatedAt = now

        FI_FUNDS_SCHEMA.validate('funds', transformedData)
        return this.put('funds', transformedData)
    }

    /**
     * Get fund data by ISIN and quarter
     */
    async getFund(fundISIN, quarter) {
        const query = createQuery(this, 'funds')
            .equals('fundISIN', fundISIN)
            .equals('quarter', quarter)

        const results = await query.execute()
        return results.length > 0 ? results[0] : null
    }

    /**
     * Get complete timeline for a fund across all quarters
     */
    async getFundTimeline(fundISIN) {
        const timeline = await this.query('funds', 'fundISIN', fundISIN)
        timeline.sort((a, b) => compareQuarters(a.quarter, b.quarter))
        return timeline
    }

    /**
     * Get all funds for a specific quarter
     */
    async getQuarterSnapshot(quarter) {
        const query = createQuery(this, 'funds')
            .equals('quarter', quarter)
            .orderBy('fundName')
        return query.execute()
    }

    /**
     * Get funds by management company
     */
    async getFundsByCompany(managementCompany, quarter = null) {
        let query = createQuery(this, 'funds')
            .equals('managementCompany', managementCompany)
            .orderBy('fundName')

        if (quarter) query = query.equals('quarter', quarter)
        return query.execute()
    }

    /**
     * Search funds by name pattern (case-insensitive)
     */
    async searchFunds(namePattern, quarter = null) {
        let query = createQuery(this, 'funds')
        if (quarter) query = query.equals('quarter', quarter)

        const funds = await query.execute()
        const pattern = namePattern.toLowerCase()
        return funds.filter(fund => fund.fundName?.toLowerCase().includes(pattern))
    }

    // ==================== HOLDINGS OPERATIONS ====================

    /**
     * Add holding data (transforms from Swedish if needed)
     */
    async addHolding(holdingData, fundISIN, quarter) {
        const transformedData = transformHoldingData(holdingData, fundISIN, quarter)

        const now = new Date().toISOString()
        transformedData.createdAt = transformedData.createdAt || now
        transformedData.updatedAt = now

        FI_FUNDS_SCHEMA.validate('holdings', transformedData)
        return this.put('holdings', transformedData)
    }

    /**
     * Get all holdings for a fund in a specific quarter, sorted by percentage desc
     */
    async getFundHoldings(fundISIN, quarter) {
        const query = createQuery(this, 'holdings')
            .equals('fundISIN', fundISIN)
            .equals('quarter', quarter)
            .orderBy('percentageOfFund', 'desc')

        const holdings = await query.execute()

        // Fallback: ensure descending sort even if DB ordering doesn't work
        if (holdings.length > 1) {
            holdings.sort((a, b) => (b.percentageOfFund || 0) - (a.percentageOfFund || 0))
        }

        return holdings
    }

    /**
     * Get holding timeline for a specific instrument across all funds
     */
    async getInstrumentTimeline(instrumentISIN) {
        const timeline = await this.query('holdings', 'instrumentISIN', instrumentISIN)
        timeline.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year
            if (a.quarter !== b.quarter) return a.quarter.localeCompare(b.quarter)
            return a.fundISIN.localeCompare(b.fundISIN)
        })
        return timeline
    }

    /**
     * Get sector allocation for a specific quarter
     */
    async getSectorAllocation(quarter) {
        const query = createQuery(this, 'holdings').equals('quarter', quarter)
        const holdings = await query.execute()

        const sectorTotals = holdings.reduce((acc, holding) => {
            const sector = holding.sector || holding.sectorName || 'Unknown'
            if (!acc[sector]) {
                acc[sector] = { sector, totalMarketValue: 0, numberOfHoldings: 0, funds: new Set() }
            }
            acc[sector].totalMarketValue += holding.marketValue || 0
            acc[sector].numberOfHoldings += 1
            acc[sector].funds.add(holding.fundISIN)
            return acc
        }, {})

        Object.values(sectorTotals).forEach(sector => {
            sector.numberOfFunds = sector.funds.size
            delete sector.funds
        })

        return sectorTotals
    }

    // ==================== BULK OPERATIONS ====================

    /**
     * Bulk import fund data — transforms from Swedish format
     * @param {Array} fundDataArray - Array of raw Swedish fund data
     * @param {Function} progressCallback
     * @returns {Promise<number>} Number of funds imported
     */
    async bulkImportFunds(fundDataArray, progressCallback = null) {
        const transformedFunds = fundDataArray.map(fundData => {
            const transformed = transformFundData(fundData)
            const now = new Date().toISOString()
            transformed.importedAt = transformed.importedAt || now
            return transformed
        })

        return this.bulkInsert('funds', transformedFunds, progressCallback)
    }

    /**
     * Bulk import holdings data — transforms from Swedish format.
     * Each item must have { holding, fundISIN, quarter } shape.
     * @param {Array} holdingsDataArray
     * @param {Function} progressCallback
     * @returns {Promise<number>} Number of holdings imported
     */
    async bulkImportHoldings(holdingsDataArray, progressCallback = null) {
        const transformedHoldings = holdingsDataArray.map(holdingData => {
            const rawHolding = holdingData.holding || holdingData
            const quarter = holdingData._quarter || holdingData.quarter
            const fundISIN = holdingData.fundISIN

            const transformed = transformHoldingData(rawHolding, fundISIN, quarter)
            const now = new Date().toISOString()
            transformed.importedAt = transformed.importedAt || now
            return transformed
        })

        return this.bulkInsert('holdings', transformedHoldings, progressCallback)
    }

    /**
     * Add multiple already-transformed funds in bulk
     * @param {Array} fundsArray - Array of already transformed fund data
     * @returns {Promise<number>}
     */
    async addFunds(fundsArray) {
        const now = new Date().toISOString()
        const enrichedFunds = fundsArray.map(fund => ({
            ...fund,
            createdAt: fund.createdAt || now,
            updatedAt: now
        }))

        enrichedFunds.forEach((fund, index) => {
            try {
                FI_FUNDS_SCHEMA.validate('funds', fund)
            } catch (error) {
                throw new Error(`Fund validation failed at index ${index + 1}: ${error.message}`)
            }
        })

        return this.bulkInsert('funds', enrichedFunds)
    }

    /**
     * Add multiple already-transformed holdings in bulk
     * @param {Array} holdingsArray - Array of already transformed holdings data
     * @returns {Promise<number>}
     */
    async addHoldings(holdingsArray) {
        const now = new Date().toISOString()
        const enrichedHoldings = holdingsArray.map(holding => ({
            ...holding,
            createdAt: holding.createdAt || now,
            updatedAt: now
        }))

        enrichedHoldings.forEach((holding, index) => {
            try {
                FI_FUNDS_SCHEMA.validate('holdings', holding)
            } catch (error) {
                throw new Error(`Holding validation failed at index ${index + 1}: ${error.message}`)
            }
        })

        return this.bulkInsert('holdings', enrichedHoldings)
    }

    // ==================== ULTRA-FAST IMPORT ====================

    /**
     * Ultra-fast bulk import — pre-validated data only, no transformation
     */
    async ultraBulkImportFunds(preValidatedFunds, progressCallback = null) {
        return this.ultraBulkInsert('funds', preValidatedFunds, progressCallback)
    }

    async ultraBulkImportHoldings(preValidatedHoldings, progressCallback = null) {
        return this.ultraBulkInsert('holdings', preValidatedHoldings, progressCallback)
    }

    // ==================== ANALYTICS ====================

    async getFundStatistics(fundISIN) {
        const timeline = await this.getFundTimeline(fundISIN)
        if (timeline.length === 0) return null

        const stats = {
            fundISIN,
            fundName: timeline[0].fundName,
            quarters: timeline.length,
            firstQuarter: timeline[0],
            lastQuarter: timeline[timeline.length - 1],
            assetsGrowth: null,
            averageAssets: 0
        }

        if (timeline.length > 1) {
            const first = timeline[0].assetsUnderManagement || 0
            const last = timeline[timeline.length - 1].assetsUnderManagement || 0
            stats.assetsGrowth = first > 0 ? ((last - first) / first) * 100 : null
        }

        const totalAssets = timeline.reduce((sum, fund) => sum + (fund.assetsUnderManagement || 0), 0)
        stats.averageAssets = totalAssets / timeline.length

        return stats
    }

    async getDatabaseStats() {
        const [fundsCount, holdingsCount] = await Promise.all([
            this.count('funds'),
            this.count('holdings')
        ])
        return { totalFunds: fundsCount, totalHoldings: holdingsCount, dbName: this.dbName, version: this.version }
    }
}
