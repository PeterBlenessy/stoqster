/**
 * Migration Pipeline Integration Test
 * 
 * Tests the complete migration pipeline components
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FIMigrationPipeline } from '../fi-funds/FIMigrationPipeline.js'

describe('Migration Pipeline Integration', () => {
  let pipeline

  beforeEach(async () => {
    pipeline = new FIMigrationPipeline()
    await pipeline.db.initialize()
    await pipeline.db.clear('funds')
    await pipeline.db.clear('holdings')
  })

  it('should initialize migration pipeline correctly', async () => {
    expect(pipeline).toBeDefined()
    expect(pipeline.db).toBeDefined()
    expect(pipeline.stats).toBeDefined()
    expect(pipeline.stats.fundsFound).toBe(0)
    expect(pipeline.stats.holdingsFound).toBe(0)
  })

  it('should validate fund data correctly', () => {
    const validFund = {
      isin: 'SE0001234567',
      fondnamn: 'Test Fund'
    }
    
    const invalidFund = {
      someField: 'test'
    }
    
    expect(pipeline.isValidFundData(validFund)).toBe(true)
    expect(pipeline.isValidFundData(invalidFund)).toBe(false)
    expect(pipeline.isValidFundData(null)).toBe(false)
  })

  it('should validate holding data correctly', () => {
    const validHolding = {
      isin: 'SE0000108656',
      instrumentnamn: 'Atlas Copco A'
    }
    
    const invalidHolding = {
      someField: 'test'
    }
    
    expect(pipeline.isValidHoldingData(validHolding)).toBe(true)
    expect(pipeline.isValidHoldingData(invalidHolding)).toBe(false)
    expect(pipeline.isValidHoldingData(null)).toBe(false)
  })

  it('should create batches correctly', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const batches = pipeline.createBatches(data, 3)
    
    expect(batches).toHaveLength(4)
    expect(batches[0]).toEqual([1, 2, 3])
    expect(batches[1]).toEqual([4, 5, 6])
    expect(batches[2]).toEqual([7, 8, 9])
    expect(batches[3]).toEqual([10])
  })

  it('should handle progress reporting', () => {
    const progressUpdates = []
    
    pipeline.reportProgress('Test message', 50, (progress) => {
      progressUpdates.push(progress)
    })
    
    expect(progressUpdates).toHaveLength(1)
    expect(progressUpdates[0].message).toBe('Test message')
    expect(progressUpdates[0].percentage).toBe(50)
    expect(progressUpdates[0].stats).toBeDefined()
  })

  it('should get stats correctly', () => {
    const stats = pipeline.getStats()
    
    expect(stats).toHaveProperty('fundsFound')
    expect(stats).toHaveProperty('fundsProcessed')
    expect(stats).toHaveProperty('fundsMigrated')
    expect(stats).toHaveProperty('fundsErrors')
    expect(stats).toHaveProperty('holdingsFound')
    expect(stats).toHaveProperty('errors')
  })

  it('should handle migration without LocalForage data', async () => {
    // This tests the pipeline's ability to handle empty migration
    // In real usage, this would be when no FI data exists in LocalForage
    
    const legacyFunds = await pipeline.readLegacyFunds()
    const legacyHoldings = await pipeline.readLegacyHoldings()
    
    // Should return empty arrays when no data exists
    expect(Array.isArray(legacyFunds)).toBe(true)
    expect(Array.isArray(legacyHoldings)).toBe(true)
    
    // Verify no errors occurred during reading
    expect(pipeline.stats.errors.filter(e => e.type === 'FUND_READ')).toHaveLength(0)
    expect(pipeline.stats.errors.filter(e => e.type === 'HOLDING_READ')).toHaveLength(0)
  })
})
