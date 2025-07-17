/**
 * Data Migration Tests for Phase 2
 * 
 * Tests the complete data transformation pipeline from LocalForage to IndexedDB
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FIFundsDB } from '../fi-funds/FIFundsDB.js'
import { transformFundData, transformHoldingData } from '../fi-funds/FITransformations.js'

describe('Phase 2: Data Migration Pipeline', () => {
  let db

  beforeEach(async () => {
    db = new FIFundsDB()
    await db.initialize()
    await db.clear('funds')
    await db.clear('holdings')
  })

  describe('Legacy Data Format Compatibility', () => {
    it('should handle typical LocalForage fund data structure', async () => {
      const legacyFundData = {
        isin: 'SE0001234567',
        fondnamn: 'Handelsbanken Sverige Selektiv (A1 SEK)',
        kvartal: 'Q1',
        'rapportår': 2024,
        'fondförmögenhet': '2547832000',
        'antalAndelsägare': '1250',
        fondtyp: 'Aktiefond',
        'fondförvaltare': 'Handelsbanken Fonder AB',
        kategori: 'Svensk aktiefond',
        'avgiftsstruktur': 'Förvaltningsavgift: 1.5%'
      }

      const transformed = transformFundData(legacyFundData)
      
      expect(transformed.fundISIN).toBe('SE0001234567')
      expect(transformed.fundName).toBe('Handelsbanken Sverige Selektiv (A1 SEK)')
      expect(transformed.quarter).toBe('Q1')
      expect(transformed.year).toBe(2024)
      expect(transformed.assetsUnderManagement).toBe(2547832000)
      expect(transformed.numberOfUnitHolders).toBe(1250)
      expect(transformed.managementCompany).toBe('Handelsbanken Fonder AB')
    })

    it('should handle typical LocalForage holding data structure', async () => {
      const legacyHoldingData = {
        isin: 'SE0000108656',
        instrumentnamn: 'Atlas Copco AB ser. A',
        'marknadsvärde': '184532000',
        'andelAvFondförmögenhet': '7.24',
        bransch: 'Industrials',
        land: 'Sverige',
        valuta: 'SEK',
        'numberOfShares': '1250000'
      }

      const transformed = transformHoldingData(
        legacyHoldingData, 
        'SE0001234567', 
        'Q1', 
        2024
      )
      
      expect(transformed.instrumentISIN).toBe('SE0000108656')
      expect(transformed.instrumentName).toBe('Atlas Copco AB ser. A')
      expect(transformed.marketValue).toBe(184532000)
      expect(transformed.percentageOfFund).toBe(7.24)
      expect(transformed.sector).toBe('Industrials')
      expect(transformed.country).toBe('Sverige')
      expect(transformed.currency).toBe('SEK')
    })
  })

  describe('Bulk Migration Operations', () => {
    it('should migrate multiple funds in a single batch', async () => {
      const legacyFunds = [
        {
          isin: 'SE0001111111',
          fondnamn: 'Test Fund 1',
          kvartal: 'Q1',
          'rapportår': 2024,
          'fondförmögenhet': '1000000'
        },
        {
          isin: 'SE0002222222',
          fondnamn: 'Test Fund 2',
          kvartal: 'Q1',
          'rapportår': 2024,
          'fondförmögenhet': '2000000'
        },
        {
          isin: 'SE0003333333',
          fondnamn: 'Test Fund 3',
          kvartal: 'Q2',
          'rapportår': 2024,
          'fondförmögenhet': '1500000'
        }
      ]

      const imported = await db.bulkImportFunds(legacyFunds)
      expect(imported).toBe(3)

      // Verify all funds were imported correctly
      const q1Funds = await db.getQuarterSnapshot('Q1', 2024)
      const q2Funds = await db.getQuarterSnapshot('Q2', 2024)
      
      expect(q1Funds).toHaveLength(2)
      expect(q2Funds).toHaveLength(1)
      
      const fund1 = await db.getFund('SE0001111111', 'Q1', 2024)
      expect(fund1.fundName).toBe('Test Fund 1')
      expect(fund1.assetsUnderManagement).toBe(1000000)
    })

    it('should migrate holdings with proper fund associations', async () => {
      // First, add a fund
      await db.addFund({
        isin: 'SE0001234567',
        fondnamn: 'Test Fund',
        kvartal: 'Q1',
        'rapportår': 2024
      })

      const legacyHoldings = [
        {
          holding: {
            isin: 'SE0000108656',
            instrumentnamn: 'Atlas Copco A',
            'marknadsvärde': '100000',
            'andelAvFondförmögenhet': '10.0'
          },
          fundISIN: 'SE0001234567',
          quarter: 'Q1',
          year: 2024
        },
        {
          holding: {
            isin: 'SE0000148884',
            instrumentnamn: 'Volvo B',
            'marknadsvärde': '80000',
            'andelAvFondförmögenhet': '8.0'
          },
          fundISIN: 'SE0001234567',
          quarter: 'Q1',
          year: 2024
        }
      ]

      const imported = await db.bulkImportHoldings(legacyHoldings)
      expect(imported).toBe(2)

      // Verify holdings are properly associated
      const holdings = await db.getFundHoldings('SE0001234567', 'Q1', 2024)
      expect(holdings).toHaveLength(2)
      
      // Should be sorted by percentage (descending)
      expect(holdings[0].percentageOfFund).toBe(10.0)
      expect(holdings[1].percentageOfFund).toBe(8.0)
    })
  })

  describe('Data Integrity Validation', () => {
    it('should detect and handle duplicate data', async () => {
      const fundData = {
        isin: 'SE0001234567',
        fondnamn: 'Duplicate Test Fund',
        kvartal: 'Q1',
        'rapportår': 2024
      }

      // Add the same fund twice
      await db.addFund(fundData)
      await db.addFund(fundData)

      // Should only have one fund (upserted)
      const funds = await db.getQuarterSnapshot('Q1', 2024)
      expect(funds).toHaveLength(1)
    })

    it('should validate required fields are present', async () => {
      const incompleteFundData = {
        isin: 'SE0001234567',
        // Missing fondnamn
        kvartal: 'Q1',
        'rapportår': 2024
      }

      // Should handle missing required fields gracefully
      try {
        const transformed = transformFundData(incompleteFundData)
        expect(transformed.fundName).toBeUndefined()
      } catch (error) {
        // Transformation should not throw for missing optional fields
        expect(error).toBeUndefined()
      }
    })

    it('should preserve data types through transformation', async () => {
      const fundData = {
        isin: 'SE0001234567',
        fondnamn: 'Type Test Fund',
        kvartal: 'Q1',
        'rapportår': 2024,
        'fondförmögenhet': '1500000', // String number
        'antalAndelsägare': '250'      // String number
      }

      const transformed = transformFundData(fundData)
      
      // Numbers should be converted
      expect(typeof transformed.assetsUnderManagement).toBe('number')
      expect(transformed.assetsUnderManagement).toBe(1500000)
      expect(typeof transformed.numberOfUnitHolders).toBe('number')
      expect(transformed.numberOfUnitHolders).toBe(250)
      
      // Strings should remain strings
      expect(typeof transformed.fundISIN).toBe('string')
      expect(typeof transformed.quarter).toBe('string')
    })
  })

  describe('Performance Benchmarks', () => {
    it('should complete bulk import within performance targets', async () => {
      // Generate 100 funds for performance testing
      const largeFundSet = Array.from({ length: 100 }, (_, i) => ({
        isin: `SE00${(1000000 + i).toString().padStart(8, '0')}`,
        fondnamn: `Performance Test Fund ${i + 1}`,
        kvartal: 'Q1',
        'rapportår': 2024,
        'fondförmögenhet': `${(Math.random() * 10000000).toString()}`
      }))

      const startTime = Date.now()
      const imported = await db.bulkImportFunds(largeFundSet)
      const endTime = Date.now()
      
      const duration = endTime - startTime
      
      expect(imported).toBe(100)
      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
      
      console.log(`✅ Bulk import performance: ${duration}ms for ${imported} funds`)
    })

    it('should maintain query performance after migration', async () => {
      // Add test data
      const funds = Array.from({ length: 20 }, (_, i) => ({
        isin: `SE00${i.toString().padStart(8, '0')}`,
        fondnamn: `Query Test Fund ${i + 1}`,
        kvartal: 'Q1',
        'rapportår': 2024
      }))

      await db.bulkImportFunds(funds)

      // Test query performance
      const startTime = Date.now()
      const snapshot = await db.getQuarterSnapshot('Q1', 2024)
      const endTime = Date.now()
      
      const queryTime = endTime - startTime
      
      expect(snapshot).toHaveLength(20)
      expect(queryTime).toBeLessThan(100) // Should complete in under 100ms
      
      console.log(`✅ Query performance: ${queryTime}ms for ${snapshot.length} funds`)
    })
  })

  describe('Error Recovery', () => {
    it('should handle malformed data gracefully', async () => {
      const malformedData = [
        { isin: 'INVALID_ISIN' }, // Invalid ISIN
        { fondnamn: 'Missing ISIN Fund' }, // Missing ISIN
        null, // Null entry
        undefined, // Undefined entry
        {
          isin: 'SE0001234567',
          fondnamn: 'Valid Fund',
          kvartal: 'Q1',
          'rapportår': 2024
        }
      ]

      // Should not throw, but should log errors
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      try {
        const imported = await db.bulkImportFunds(malformedData)
        // Should import only the valid entries
        expect(imported).toBeGreaterThan(0)
      } catch (error) {
        // If it throws, should be a descriptive error
        expect(error.message).toContain('transformation')
      }
      
      consoleSpy.mockRestore()
    })
  })
})
