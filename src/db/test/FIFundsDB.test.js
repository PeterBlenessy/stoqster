/**
 * FI Funds Database Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FIFundsDB } from '../fi-funds/FIFundsDB.js'

describe('FIFundsDB', () => {
  let db

  beforeEach(async () => {
    db = new FIFundsDB()
    await db.initialize()
  })

  describe('database initialization', () => {
    it('should initialize database successfully', async () => {
      expect(db.dbName).toBe('fi-funds')
      expect(db.version).toBe(1)
      
      const stats = await db.getDatabaseStats()
      expect(stats.totalFunds).toBe(0)
      expect(stats.totalHoldings).toBe(0)
    })
  })

  describe('fund operations', () => {
    it('should add and retrieve fund data', async () => {
      const fundData = createMockFundData()
      
      const key = await db.addFund(fundData)
      expect(key).toBeDefined()
      
      const retrieved = await db.getFund('SE0001234567', 'Q1', 2024)
      expect(retrieved).toBeDefined()
      expect(retrieved.fundName).toBe('Test Fond')
      expect(retrieved.fundISIN).toBe('SE0001234567')
    })

    it('should get fund timeline', async () => {
      const fundISIN = 'SE0001234567'
      
      // Add multiple quarters for the same fund
      await db.addFund(createMockFundData({ 
        kvartal: 'Q1', 
        'rapportår': 2024,
        'fondförmögenhet': 1000000 
      }))
      await db.addFund(createMockFundData({ 
        kvartal: 'Q2', 
        'rapportår': 2024,
        'fondförmögenhet': 1100000 
      }))
      await db.addFund(createMockFundData({ 
        kvartal: 'Q3', 
        'rapportår': 2024,
        'fondförmögenhet': 1200000 
      }))
      
      const timeline = await db.getFundTimeline(fundISIN)
      
      expect(timeline).toHaveLength(3)
      expect(timeline[0].quarter).toBe('Q1')
      expect(timeline[1].quarter).toBe('Q2')
      expect(timeline[2].quarter).toBe('Q3')
      expect(timeline[0].assetsUnderManagement).toBe(1000000)
      expect(timeline[2].assetsUnderManagement).toBe(1200000)
    })

    it('should get quarter snapshot', async () => {
      // Add multiple funds for the same quarter
      await db.addFund(createMockFundData({ 
        isin: 'SE0001234567',
        fondnamn: 'Fond A' 
      }))
      await db.addFund(createMockFundData({ 
        isin: 'SE0001234568',
        fondnamn: 'Fond B' 
      }))
      await db.addFund(createMockFundData({ 
        isin: 'SE0001234569',
        fondnamn: 'Fond C',
        kvartal: 'Q2' // Different quarter
      }))
      
      const snapshot = await db.getQuarterSnapshot('Q1', 2024)
      
      expect(snapshot).toHaveLength(2)
      expect(snapshot.map(f => f.fundName).sort()).toEqual(['Fond A', 'Fond B'])
    })

    it('should search funds by name pattern', async () => {
      await db.addFund(createMockFundData({ 
        isin: 'SE0001234567',
        fondnamn: 'Länsförsäkringar Global Indexnära' 
      }))
      await db.addFund(createMockFundData({ 
        isin: 'SE0001234568',
        fondnamn: 'Handelsbanken Sverige Index' 
      }))
      await db.addFund(createMockFundData({ 
        isin: 'SE0001234569',
        fondnamn: 'Avanza Zero' 
      }))
      
      const indexFunds = await db.searchFunds('Index', 'Q1', 2024)
      
      expect(indexFunds).toHaveLength(2)
      expect(indexFunds.map(f => f.fundName)).toEqual(
        expect.arrayContaining([
          'Länsförsäkringar Global Indexnära',
          'Handelsbanken Sverige Index'
        ])
      )
    })

    it('should get funds by management company', async () => {
      await db.addFund(createMockFundData({ 
        isin: 'SE0001234567',
        'fondförvaltare': 'Handelsbanken Fonder AB',
        fondnamn: 'Handelsbanken Fund 1'
      }))
      await db.addFund(createMockFundData({ 
        isin: 'SE0001234568',
        'fondförvaltare': 'Handelsbanken Fonder AB',
        fondnamn: 'Handelsbanken Fund 2'
      }))
      await db.addFund(createMockFundData({ 
        isin: 'SE0001234569',
        'fondförvaltare': 'Länsförsäkringar Fondförvaltning AB',
        fondnamn: 'LF Fund'
      }))
      
      const hbFunds = await db.getFundsByCompany('Handelsbanken Fonder AB', 'Q1', 2024)
      
      expect(hbFunds).toHaveLength(2)
      expect(hbFunds.map(f => f.fundName).sort()).toEqual([
        'Handelsbanken Fund 1',
        'Handelsbanken Fund 2'
      ])
    })
  })

  describe('holdings operations', () => {
    beforeEach(async () => {
      // Add a fund first
      await db.addFund(createMockFundData())
    })

    it('should add and retrieve holding data', async () => {
      const holdingData = createMockHoldingData()
      
      const key = await db.addHolding(holdingData, 'SE0001234567', 'Q1', 2024)
      expect(key).toBeDefined()
      
      const holdings = await db.getFundHoldings('SE0001234567', 'Q1', 2024)
      
      expect(holdings).toHaveLength(1)
      expect(holdings[0].instrumentName).toBe('Test Aktie AB')
      expect(holdings[0].instrumentISIN).toBe('SE0009876543')
    })

    it('should get holdings sorted by percentage', async () => {
      // Add multiple holdings with different percentages
      await db.addHolding(createMockHoldingData({ 
        isin: 'SE0009876543',
        instrumentnamn: 'Holding A',
        'andelAvFondförmögenhet': 10.0
      }), 'SE0001234567', 'Q1', 2024)
      
      await db.addHolding(createMockHoldingData({ 
        isin: 'SE0009876544',
        instrumentnamn: 'Holding B',
        'andelAvFondförmögenhet': 15.0
      }), 'SE0001234567', 'Q1', 2024)
      
      await db.addHolding(createMockHoldingData({ 
        isin: 'SE0009876545',
        instrumentnamn: 'Holding C',
        'andelAvFondförmögenhet': 5.0
      }), 'SE0001234567', 'Q1', 2024)
      
      const holdings = await db.getFundHoldings('SE0001234567', 'Q1', 2024)
      
      expect(holdings).toHaveLength(3)
      
      // Debug: Log the actual percentages to see the sorting
      console.log('Holdings order:', holdings.map(h => ({ 
        name: h.instrumentName, 
        percentage: h.percentageOfFund 
      })))
      
      // Check that they are sorted in descending order by percentage
      expect(holdings[0].percentageOfFund).toBeGreaterThan(holdings[1].percentageOfFund)
      expect(holdings[1].percentageOfFund).toBeGreaterThan(holdings[2].percentageOfFund)
      
      // Check the specific order based on actual percentages
      expect(holdings[0].instrumentName).toBe('Holding B') // Highest % (15.0)
      expect(holdings[1].instrumentName).toBe('Holding A') // Middle % (10.0)
      expect(holdings[2].instrumentName).toBe('Holding C') // Lowest % (5.0)
    })

    it('should get instrument timeline across funds', async () => {
      // Add another fund
      await db.addFund(createMockFundData({ 
        isin: 'SE0001234568',
        fondnamn: 'Another Fund' 
      }))
      
      const instrumentISIN = 'SE0009876543'
      
      // Add the same instrument to both funds
      await db.addHolding(createMockHoldingData({ 
        isin: instrumentISIN,
        'andelAvFondförmögenhet': 5.0
      }), 'SE0001234567', 'Q1', 2024)
      
      await db.addHolding(createMockHoldingData({ 
        isin: instrumentISIN,
        'andelAvFondförmögenhet': 8.0
      }), 'SE0001234568', 'Q1', 2024)
      
      const timeline = await db.getInstrumentTimeline(instrumentISIN)
      
      expect(timeline).toHaveLength(2)
      expect(timeline.map(h => h.fundISIN).sort()).toEqual([
        'SE0001234567',
        'SE0001234568'
      ])
    })

    it('should get sector allocation', async () => {
      await db.addHolding(createMockHoldingData({ 
        isin: 'SE0009876543',
        bransch: 'Teknologi',
        'marknadsvärde': 100000
      }), 'SE0001234567', 'Q1', 2024)
      
      await db.addHolding(createMockHoldingData({ 
        isin: 'SE0009876544',
        bransch: 'Teknologi',
        'marknadsvärde': 150000
      }), 'SE0001234567', 'Q1', 2024)
      
      await db.addHolding(createMockHoldingData({ 
        isin: 'SE0009876545',
        bransch: 'Hälsovård',
        'marknadsvärde': 75000
      }), 'SE0001234567', 'Q1', 2024)
      
      const allocation = await db.getSectorAllocation('Q1', 2024)
      
      expect(allocation['Teknologi']).toBeDefined()
      expect(allocation['Teknologi'].totalMarketValue).toBe(250000)
      expect(allocation['Teknologi'].numberOfHoldings).toBe(2)
      
      expect(allocation['Hälsovård']).toBeDefined()
      expect(allocation['Hälsovård'].totalMarketValue).toBe(75000)
      expect(allocation['Hälsovård'].numberOfHoldings).toBe(1)
    })
  })

  describe('analytics operations', () => {
    it('should calculate fund statistics', async () => {
      const fundISIN = 'SE0001234567'
      
      // Add fund data for multiple quarters
      await db.addFund(createMockFundData({ 
        kvartal: 'Q1',
        'fondförmögenhet': 1000000
      }))
      await db.addFund(createMockFundData({ 
        kvartal: 'Q2',
        'fondförmögenhet': 1200000
      }))
      await db.addFund(createMockFundData({ 
        kvartal: 'Q3',
        'fondförmögenhet': 1100000
      }))
      
      const stats = await db.getFundStatistics(fundISIN)
      
      expect(stats).toBeDefined()
      expect(stats.fundISIN).toBe(fundISIN)
      expect(stats.quarters).toBe(3)
      expect(stats.assetsGrowth).toBe(10) // (1100000 - 1000000) / 1000000 * 100
      expect(stats.averageAssets).toBe(1100000) // (1000000 + 1200000 + 1100000) / 3
    })

    it('should return null for non-existent fund statistics', async () => {
      const stats = await db.getFundStatistics('SE0000000000')
      expect(stats).toBeNull()
    })
  })

  describe('bulk operations', () => {
    it('should bulk import funds', async () => {
      const funds = [
        createMockFundData({ isin: 'SE0001234567', fondnamn: 'Fund 1' }),
        createMockFundData({ isin: 'SE0001234568', fondnamn: 'Fund 2' }),
        createMockFundData({ isin: 'SE0001234569', fondnamn: 'Fund 3' })
      ]
      
      const imported = await db.bulkImportFunds(funds)
      
      expect(imported).toBe(3)
      
      const stats = await db.getDatabaseStats()
      expect(stats.totalFunds).toBe(3)
    })

    it('should bulk import holdings', async () => {
      // Add a fund first
      await db.addFund(createMockFundData())
      
      const holdings = [
        {
          holding: createMockHoldingData({ isin: 'SE0009876543', instrumentnamn: 'Holding 1' }),
          fundISIN: 'SE0001234567',
          quarter: 'Q1',
          year: 2024
        },
        {
          holding: createMockHoldingData({ isin: 'SE0009876544', instrumentnamn: 'Holding 2' }),
          fundISIN: 'SE0001234567',
          quarter: 'Q1',
          year: 2024
        }
      ]
      
      const imported = await db.bulkImportHoldings(holdings)
      
      expect(imported).toBe(2)
      
      const stats = await db.getDatabaseStats()
      expect(stats.totalHoldings).toBe(2)
    })
  })
})
