/**
 * Vitest Test Setup
 * 
 * Sets up the testing environment with IndexedDB mocking and global utilities.
 */

import 'fake-indexeddb/auto'
import { vi } from 'vitest'

// Mock console methods to avoid noise in tests unless needed
global.console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
}

// Global test utilities
global.createMockFundData = function (overrides = {}) {
    return {
        isin: 'SE0001234567',
        fondnamn: 'Test Fond',
        kvartal: 'Q1',
        'rapportår': 2024,
        'fondförmögenhet': 1000000,
        'antalAndelsägare': 500,
        fondtyp: 'Aktiefond',
        'fondförvaltare': 'Test Förvaltare AB',
        ...overrides
    }
}

global.createMockHoldingData = function (overrides = {}) {
    return {
        isin: 'SE0009876543',
        instrumentnamn: 'Test Aktie AB',
        'marknadsvärde': 50000,
        'andelAvFondförmögenhet': 5.0,
        bransch: 'Teknologi',
        land: 'Sverige',
        valuta: 'SEK',
        ...overrides
    }
}

// Reset IndexedDB between tests
beforeEach(() => {
    // Clear all databases
    indexedDB._databases?.clear?.()
})
