/**
 * FI Transformations Unit Tests
 */

import { describe, it, expect } from 'vitest'
import {
    transformFundData,
    transformHoldingData,
    validateTransformedFundData,
    validateTransformedHoldingData,
    batchTransformFunds,
    batchTransformHoldings
} from '../fi-funds/FITransformations.js'

describe('FI Data Transformations', () => {
    describe('transformFundData', () => {
        it('should transform Swedish fund data to English format', () => {
            const swedishData = createMockFundData()

            const result = transformFundData(swedishData)

            expect(result.fundISIN).toBe('SE0001234567')
            expect(result.fundName).toBe('Test Fond')
            expect(result.quarter).toBe('Q1')
            expect(result.year).toBe(2024)
            expect(result.assetsUnderManagement).toBe(1000000)
            expect(result.numberOfUnitHolders).toBe(500)
            expect(result.fundType).toBe('Aktiefond')
            expect(result.managementCompany).toBe('Test Förvaltare AB')
        })

        it('should handle missing optional fields gracefully', () => {
            const minimalData = {
                isin: 'SE0001234567',
                fondnamn: 'Test Fond',
                kvartal: 'Q1',
                'rapportår': 2024
            }

            const result = transformFundData(minimalData)

            expect(result.fundISIN).toBe('SE0001234567')
            expect(result.fundName).toBe('Test Fond')
            expect(result.quarter).toBe('Q1')
            expect(result.year).toBe(2024)
            expect(result.assetsUnderManagement).toBeUndefined()
            expect(result.numberOfUnitHolders).toBeUndefined()
        })

        it('should handle special characters in property names', () => {
            const dataWithSpecialChars = createMockFundData({
                'riskNivå': 'Hög',
                'förvaltningsavgift': 1.5,
                'jämförelseindex': 'OMXS30'
            })

            const result = transformFundData(dataWithSpecialChars)

            expect(result.riskLevel).toBe('Hög')
            expect(result.managementFee).toBe(1.5)
            expect(result.benchmark).toBe('OMXS30')
        })

        it('should parse numeric strings correctly', () => {
            const dataWithStrings = createMockFundData({
                'fondförmögenhet': '1 000 000,50',
                'antalAndelsägare': '500',
                'rapportår': '2024'
            })

            const result = transformFundData(dataWithStrings)

            expect(result.assetsUnderManagement).toBe(1000000.50)
            expect(result.numberOfUnitHolders).toBe(500)
            expect(result.year).toBe(2024)
        })
    })

    describe('transformHoldingData', () => {
        it('should transform Swedish holding data to English format', () => {
            const swedishData = createMockHoldingData()

            const result = transformHoldingData(swedishData, 'SE0001234567', 'Q1', 2024)

            expect(result.fundISIN).toBe('SE0001234567')
            expect(result.instrumentISIN).toBe('SE0009876543')
            expect(result.instrumentName).toBe('Test Aktie AB')
            expect(result.quarter).toBe('Q1')
            expect(result.year).toBe(2024)
            expect(result.marketValue).toBe(50000)
            expect(result.percentageOfFund).toBe(5.0)
            expect(result.sector).toBe('Teknologi')
            expect(result.country).toBe('Sverige')
            expect(result.currency).toBe('SEK')
        })

        it('should handle missing optional fields in holdings', () => {
            const minimalData = {
                isin: 'SE0009876543',
                instrumentnamn: 'Test Aktie AB'
            }

            const result = transformHoldingData(minimalData, 'SE0001234567', 'Q1', 2024)

            expect(result.fundISIN).toBe('SE0001234567')
            expect(result.instrumentISIN).toBe('SE0009876543')
            expect(result.instrumentName).toBe('Test Aktie AB')
            expect(result.marketValue).toBeUndefined()
            expect(result.sector).toBeUndefined()
        })
    })

    describe('data validation', () => {
        it('should validate correct fund data', () => {
            const validData = {
                fundISIN: 'SE0001234567',
                fundName: 'Test Fond',
                quarter: 'Q1',
                year: 2024
            }

            expect(() => validateTransformedFundData(validData)).not.toThrow()
        })

        it('should reject invalid ISIN format', () => {
            const invalidData = {
                fundISIN: 'INVALID',
                fundName: 'Test Fond',
                quarter: 'Q1',
                year: 2024
            }

            expect(() => validateTransformedFundData(invalidData)).toThrow('Invalid ISIN format')
        })

        it('should reject invalid quarter format', () => {
            const invalidData = {
                fundISIN: 'SE0001234567',
                fundName: 'Test Fond',
                quarter: 'Q5',
                year: 2024
            }

            expect(() => validateTransformedFundData(invalidData)).toThrow('Invalid quarter format')
        })

        it('should validate correct holding data', () => {
            const validData = {
                fundISIN: 'SE0001234567',
                instrumentISIN: 'SE0009876543',
                quarter: 'Q1',
                year: 2024
            }

            expect(() => validateTransformedHoldingData(validData)).not.toThrow()
        })
    })

    describe('batch transformations', () => {
        it('should transform multiple funds successfully', () => {
            const funds = [
                createMockFundData({ isin: 'SE0001234567', fondnamn: 'Fond 1' }),
                createMockFundData({ isin: 'SE0001234568', fondnamn: 'Fond 2' }),
                createMockFundData({ isin: 'SE0001234569', fondnamn: 'Fond 3' })
            ]

            const result = batchTransformFunds(funds)

            expect(result.transformed).toHaveLength(3)
            expect(result.errors).toHaveLength(0)
            expect(result.transformed[0].fundName).toBe('Fond 1')
            expect(result.transformed[1].fundName).toBe('Fond 2')
            expect(result.transformed[2].fundName).toBe('Fond 3')
        })

        it('should handle transformation errors gracefully', () => {
            const funds = [
                createMockFundData({ isin: 'SE0001234567', fondnamn: 'Valid Fond' }),
                { invalid: 'data' }, // This should fail
                createMockFundData({ isin: 'SE0001234569', fondnamn: 'Another Valid Fond' })
            ]

            const result = batchTransformFunds(funds)

            expect(result.transformed).toHaveLength(2)
            expect(result.errors).toHaveLength(1)
            expect(result.errors[0].index).toBe(1)
        })

        it('should transform multiple holdings successfully', () => {
            const holdings = [
                {
                    holding: createMockHoldingData({ isin: 'SE0009876543', instrumentnamn: 'Aktie 1' }),
                    fundISIN: 'SE0001234567',
                    quarter: 'Q1',
                    year: 2024
                },
                {
                    holding: createMockHoldingData({ isin: 'SE0009876544', instrumentnamn: 'Aktie 2' }),
                    fundISIN: 'SE0001234567',
                    quarter: 'Q1',
                    year: 2024
                }
            ]

            const result = batchTransformHoldings(holdings)

            expect(result.transformed).toHaveLength(2)
            expect(result.errors).toHaveLength(0)
            expect(result.transformed[0].instrumentName).toBe('Aktie 1')
            expect(result.transformed[1].instrumentName).toBe('Aktie 2')
        })
    })
})
