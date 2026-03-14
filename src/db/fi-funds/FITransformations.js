/**
 * FI Data Transformation Utilities
 *
 * Transforms Swedish FI fund data to English format suitable for IndexedDB storage.
 * Handles two input formats:
 *   1. XML-parsed format (from actual FI ZIP files): keys like 'Fond_ISIN-kod', 'Fond_namn'
 *   2. Simplified format (from tests/manual input): keys like 'isin', 'fondnamn'
 */

/**
 * Helper to get a value from raw data, trying XML-style key first, then simplified key.
 */
function field(rawData, xmlKey, simpleKey) {
    if (xmlKey && rawData[xmlKey] !== undefined) return rawData[xmlKey]
    if (simpleKey && rawData[simpleKey] !== undefined) return rawData[simpleKey]
    return undefined
}

/**
 * Parse number from string or return as-is if already a number.
 * Handles Swedish number formatting (spaces as thousands separator, comma as decimal).
 */
function parseNumber(value) {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value === 'number') return isNaN(value) ? undefined : value
    if (typeof value === 'string') {
        const cleaned = value.replace(/\s/g, '').replace(/,/g, '.')
        const parsed = parseFloat(cleaned)
        return isNaN(parsed) ? undefined : parsed
    }
    return undefined
}

/**
 * Transform fund data from Swedish format to English format.
 * Accepts both XML-parsed and simplified input formats.
 * @param {Object} rawData - Raw fund data
 * @returns {Object} Transformed fund data in English format
 */
export function transformFundData(rawData) {
    return {
        // Core identifiers
        fundISIN: field(rawData, 'Fond_ISIN-kod', 'isin'),
        fundName: field(rawData, 'Fond_namn', 'fondnamn'),
        institutionNumber: field(rawData, 'Fond_institutnummer', 'institutnummer'),

        // Financial metrics
        assetsUnderManagement: parseNumber(field(rawData, 'Fondförmögenhet', 'fondförmögenhet')),
        numberOfUnitHolders: parseNumber(field(rawData, 'Antal_andelsägare', 'antalAndelsägare')),
        activeRisk: parseNumber(field(rawData, 'Aktiv_risk', 'aktivRisk')),
        volatility24Months: parseNumber(field(rawData, 'Standardavvikelse_24_månader', 'standardavvikelse24Månader')),
        cashHoldings: parseNumber(field(rawData, 'Likvida_medel', 'likvidaMedel')),
        otherAssetsLiabilities: parseNumber(field(rawData, 'Övriga_tillgångar_och_skulder', 'övrigaTillgångarOchSkulder')),

        // Fund metadata
        fundType: field(rawData, 'Fond_typ', 'fondtyp'),
        managementCompany: field(rawData, 'Förvaltningsbolag', 'fondförvaltare'),
        riskLevel: field(rawData, 'Risknivå', 'riskNivå'),

        // Management fees
        managementFee: parseNumber(
            rawData['Förvaltningsavgift']?.['UtanAndelsklasser']?.['Förvaltningsavgift_fast']
            ?? rawData['förvaltningsavgift']
        ),
        performanceFee: parseNumber(
            rawData['Förvaltningsavgift']?.['UtanAndelsklasser']?.['Prestationsbaserad']?.['ProcentuelltUttag']
        ),
        performanceBenchmark:
            rawData['Förvaltningsavgift']?.['UtanAndelsklasser']?.['Prestationsbaserad']?.['Avkastningströskel'],

        // Benchmark index
        benchmark:
            rawData['Jämförelseindex']?.['Jämförelseindex']
            ?? rawData['jämförelseindex'],

        // Time period
        quarter: rawData._quarter ?? rawData['kvartal'],
        year: parseNumber(rawData._year ?? rawData['rapportår']),
        quarterDisplay: rawData._displayQuarter,
        sourceDate: rawData._sourceDate,
        importedAt: rawData._importedAt,

        dataSource: 'FI'
    }
}

/**
 * Transform holding data from Swedish format to English format.
 * Accepts both XML-parsed and simplified input formats.
 * @param {Object} rawData - Raw holding data
 * @param {string} fundISIN - ISIN code of the fund
 * @param {string} quarter - Quarter identifier
 * @param {number} [year] - Optional year (for test compatibility)
 * @returns {Object} Transformed holding data in English format
 */
export function transformHoldingData(rawData, fundISIN, quarter, year) {
    if (!rawData || typeof rawData !== 'object') {
        throw new Error('Invalid rawData provided to transformHoldingData')
    }

    return {
        // Core identifiers
        fundISIN,
        instrumentISIN: field(rawData, 'ISIN-kod_instrument', 'isin'),
        instrumentName: field(rawData, 'Instrumentnamn', 'instrumentnamn'),

        // Time period
        quarter,
        year: year ?? parseNumber(rawData['rapportår']),

        // Financial data
        percentageOfFund: parseNumber(field(rawData, 'Andel_av_fondförmögenhet_instrument', 'andelAvFondförmögenhet')),
        quantity: parseNumber(field(rawData, 'Antal', 'antal')),
        marketValue: parseNumber(field(rawData, 'Marknadsvärde_instrument', 'marknadsvärde')),
        valuationPrice: parseNumber(field(rawData, 'Kurs_som_använts_vid_värdering_av_instrumentet', 'värderingskurs')),
        exchangeRate: parseNumber(field(rawData, 'Valutakurs_instrument', 'valutakurs')),

        // Classification
        currency: field(rawData, 'Valuta', 'valuta'),
        countryCode: field(rawData, 'Landkod_Emittent', 'landkod'),
        country: rawData['land'],
        assetClass: field(rawData, 'Tillgångsslag_enligt_LVF_5_kap', 'tillgångsslag'),
        nominalAmount: rawData['Nominellt_belopp'],
        sector: field(rawData, null, 'bransch')
            ?? rawData['Bransch']?.['Bransch_namn_instrument'],
        sectorCode: rawData['Bransch']?.['Branschkod_instrument'],
        sectorName: rawData['Bransch']?.['Bransch_namn_instrument'],

        // Import metadata
        quarterDisplay: rawData._displayQuarter,
        sourceDate: rawData._sourceDate,
        importedAt: rawData._importedAt,

        dataSource: 'FI'
    }
}

/**
 * Validate transformed fund data.
 * Accepts both full quarter format (2024Q1) and short format (Q1).
 */
export function validateTransformedFundData(fundData) {
    const requiredFields = ['fundISIN', 'fundName', 'quarter']
    for (const f of requiredFields) {
        if (!fundData[f]) {
            throw new Error(`Required field '${f}' is missing in transformed fund data`)
        }
    }

    if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(fundData.fundISIN)) {
        throw new Error('Invalid ISIN format in transformed fund data')
    }

    if (!/^(\d{4})?Q[1-4]$/.test(fundData.quarter)) {
        throw new Error('Invalid quarter format in transformed fund data')
    }

    return true
}

/**
 * Validate transformed holding data
 */
export function validateTransformedHoldingData(holdingData) {
    const requiredFields = ['fundISIN', 'instrumentName', 'quarter']
    for (const f of requiredFields) {
        if (!holdingData[f]) {
            console.warn(`Missing required field '${f}' in transformed holding data`)
        }
    }

    if (holdingData.fundISIN && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(holdingData.fundISIN)) {
        console.warn('Invalid fund ISIN format:', holdingData.fundISIN)
    }

    if (holdingData.instrumentISIN && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(holdingData.instrumentISIN)) {
        console.warn('Invalid instrument ISIN format:', holdingData.instrumentISIN)
    }

    return true
}

/**
 * Transform multiple fund records in batch
 */
export function batchTransformFunds(swedishFunds) {
    const transformed = []
    const errors = []

    for (let i = 0; i < swedishFunds.length; i++) {
        try {
            const transformedFund = transformFundData(swedishFunds[i])
            validateTransformedFundData(transformedFund)
            transformed.push(transformedFund)
        } catch (error) {
            errors.push({ index: i, error: error.message, data: swedishFunds[i] })
        }
    }

    return { transformed, errors }
}

/**
 * Transform multiple holding records in batch
 */
export function batchTransformHoldings(swedishHoldings) {
    const transformed = []
    const errors = []

    for (let i = 0; i < swedishHoldings.length; i++) {
        try {
            const { holding, fundISIN, quarter, year } = swedishHoldings[i]
            const transformedHolding = transformHoldingData(holding, fundISIN, quarter, year)
            validateTransformedHoldingData(transformedHolding)
            transformed.push(transformedHolding)
        } catch (error) {
            errors.push({ index: i, error: error.message, data: swedishHoldings[i] })
        }
    }

    return { transformed, errors }
}
