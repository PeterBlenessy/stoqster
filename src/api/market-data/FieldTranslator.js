/**
 * Field translation system for market data
 * Maps English field names to Swedish UI labels and vice versa
 */

/**
 * Standard field definitions with English keys and Swedish labels
 */
export const stockFields = {
    symbol: {
        en: 'symbol',
        sv: 'Symbol',
        description: 'Stock ticker symbol'
    },
    name: {
        en: 'name',
        sv: 'Namn',
        description: 'Company name'
    },
    price: {
        en: 'price',
        sv: 'Pris',
        description: 'Current stock price'
    },
    change: {
        en: 'change',
        sv: 'Förändring',
        description: 'Price change in currency units'
    },
    changePercent: {
        en: 'changePercent',
        sv: 'Förändring_procent',
        description: 'Price change as percentage'
    },
    volume: {
        en: 'volume',
        sv: 'Volym',
        description: 'Trading volume'
    },
    marketCap: {
        en: 'marketCap',
        sv: 'Marknadsvärde',
        description: 'Market capitalization'
    },
    sector: {
        en: 'sector',
        sv: 'Bransch',
        description: 'Industry sector'
    },
    country: {
        en: 'country',
        sv: 'Land',
        description: 'Country of incorporation'
    },
    currency: {
        en: 'currency',
        sv: 'Valuta',
        description: 'Trading currency'
    },
    lastUpdated: {
        en: 'lastUpdated',
        sv: 'Senast_uppdaterad',
        description: 'Last update timestamp'
    },
    provider: {
        en: 'provider',
        sv: 'Datakälla',
        description: 'Data provider name'
    },
    isin: {
        en: 'isin',
        sv: 'ISIN',
        description: 'International Securities Identification Number'
    },
    exchange: {
        en: 'exchange',
        sv: 'Börs',
        description: 'Stock exchange'
    },
    peRatio: {
        en: 'peRatio',
        sv: 'P_E_tal',
        description: 'Price to earnings ratio'
    },
    dividendYield: {
        en: 'dividendYield',
        sv: 'Direktavkastning',
        description: 'Dividend yield percentage'
    },
    week52High: {
        en: 'week52High',
        sv: '52v_högsta',
        description: '52-week high price'
    },
    week52Low: {
        en: 'week52Low',
        sv: '52v_lägsta',
        description: '52-week low price'
    },
    beta: {
        en: 'beta',
        sv: 'Beta',
        description: 'Stock volatility relative to market'
    },
    eps: {
        en: 'eps',
        sv: 'Vinst_per_aktie',
        description: 'Earnings per share'
    }
}

/**
 * Fund ownership field definitions
 */
export const fundOwnershipFields = {
    fundName: {
        en: 'fundName',
        sv: 'Fond_namn',
        description: 'Name of the fund'
    },
    ownershipPercent: {
        en: 'ownershipPercent',
        sv: 'Ägarandel_procent',
        description: 'Percentage of company owned by fund'
    },
    fundAllocationPercent: {
        en: 'fundAllocationPercent',
        sv: 'Andel_av_fondförmögenhet',
        description: 'Percentage of fund assets allocated to this stock'
    },
    marketValue: {
        en: 'marketValue',
        sv: 'Marknadsvärde_innehav',
        description: 'Market value of holdings'
    },
    shareCount: {
        en: 'shareCount',
        sv: 'Antal_aktier',
        description: 'Number of shares held'
    }
}

/**
 * Translation utilities
 */
export class FieldTranslator {
    
    /**
     * Translate English field names to Swedish
     * @param {Object} data - Data object with English field names
     * @param {Object} fieldDefinitions - Field definitions to use
     * @returns {Object} Data object with Swedish field names
     */
    static translateToSwedish(data, fieldDefinitions = stockFields) {
        if (!data || typeof data !== 'object') {
            return data
        }

        if (Array.isArray(data)) {
            return data.map(item => this.translateToSwedish(item, fieldDefinitions))
        }

        const translated = {}
        
        for (const [key, value] of Object.entries(data)) {
            const fieldDef = fieldDefinitions[key]
            const translatedKey = fieldDef ? fieldDef.sv : key
            translated[translatedKey] = value
        }

        return translated
    }

    /**
     * Translate Swedish field names to English
     * @param {Object} data - Data object with Swedish field names
     * @param {Object} fieldDefinitions - Field definitions to use
     * @returns {Object} Data object with English field names
     */
    static translateToEnglish(data, fieldDefinitions = stockFields) {
        if (!data || typeof data !== 'object') {
            return data
        }

        if (Array.isArray(data)) {
            return data.map(item => this.translateToEnglish(item, fieldDefinitions))
        }

        const translated = {}
        
        // Create reverse mapping
        const reverseMapping = {}
        for (const [englishKey, fieldDef] of Object.entries(fieldDefinitions)) {
            reverseMapping[fieldDef.sv] = englishKey
        }

        for (const [key, value] of Object.entries(data)) {
            const englishKey = reverseMapping[key] || key
            translated[englishKey] = value
        }

        return translated
    }

    /**
     * Get Swedish label for English field name
     * @param {string} englishField - English field name
     * @param {Object} fieldDefinitions - Field definitions to use
     * @returns {string} Swedish label
     */
    static getSwedishLabel(englishField, fieldDefinitions = stockFields) {
        const fieldDef = fieldDefinitions[englishField]
        return fieldDef ? fieldDef.sv : englishField
    }

    /**
     * Get English field name for Swedish label
     * @param {string} swedishLabel - Swedish label
     * @param {Object} fieldDefinitions - Field definitions to use
     * @returns {string} English field name
     */
    static getEnglishField(swedishLabel, fieldDefinitions = stockFields) {
        for (const [englishKey, fieldDef] of Object.entries(fieldDefinitions)) {
            if (fieldDef.sv === swedishLabel) {
                return englishKey
            }
        }
        return swedishLabel
    }

    /**
     * Get all Swedish labels
     * @param {Object} fieldDefinitions - Field definitions to use
     * @returns {Array<string>} Array of Swedish labels
     */
    static getAllSwedishLabels(fieldDefinitions = stockFields) {
        return Object.values(fieldDefinitions).map(def => def.sv)
    }

    /**
     * Get all English field names
     * @param {Object} fieldDefinitions - Field definitions to use
     * @returns {Array<string>} Array of English field names
     */
    static getAllEnglishFields(fieldDefinitions = stockFields) {
        return Object.keys(fieldDefinitions)
    }

    /**
     * Create a mapping object for quick lookup
     * @param {Object} fieldDefinitions - Field definitions to use
     * @returns {Object} Mapping object with en->sv and sv->en mappings
     */
    static createMappings(fieldDefinitions = stockFields) {
        const enToSv = {}
        const svToEn = {}

        for (const [englishKey, fieldDef] of Object.entries(fieldDefinitions)) {
            enToSv[englishKey] = fieldDef.sv
            svToEn[fieldDef.sv] = englishKey
        }

        return { enToSv, svToEn }
    }

    /**
     * Validate that all required fields are present
     * @param {Object} data - Data object to validate
     * @param {Array<string>} requiredFields - Array of required field names (English)
     * @param {Object} fieldDefinitions - Field definitions to use
     * @returns {Object} Validation result with missing fields
     */
    static validateFields(data, requiredFields = [], fieldDefinitions = stockFields) {
        const missing = []
        const present = []

        for (const field of requiredFields) {
            if (field in data) {
                present.push(field)
            } else {
                missing.push(field)
            }
        }

        return {
            valid: missing.length === 0,
            missing,
            present,
            missingSwedish: missing.map(field => this.getSwedishLabel(field, fieldDefinitions))
        }
    }

    /**
     * Get field description
     * @param {string} field - Field name (English or Swedish)
     * @param {Object} fieldDefinitions - Field definitions to use
     * @returns {string} Field description
     */
    static getFieldDescription(field, fieldDefinitions = stockFields) {
        // Try direct lookup
        let fieldDef = fieldDefinitions[field]
        
        // If not found, try reverse lookup
        if (!fieldDef) {
            for (const [englishKey, def] of Object.entries(fieldDefinitions)) {
                if (def.sv === field) {
                    fieldDef = def
                    break
                }
            }
        }

        return fieldDef ? fieldDef.description : 'No description available'
    }
}

/**
 * Column configuration helpers for Quasar tables
 */
export class ColumnConfigHelper {
    
    /**
     * Create Quasar table column configuration with translated labels
     * @param {Array<string>} fields - Array of English field names
     * @param {Object} options - Column options
     * @returns {Array<Object>} Quasar column configuration
     */
    static createColumns(fields, options = {}) {
        const { fieldDefinitions = stockFields, formatters = {} } = options

        return fields.map(field => {
            const fieldDef = fieldDefinitions[field]
            if (!fieldDef) {
                console.warn(`⚠️ No field definition found for: ${field}`)
                return {
                    name: field,
                    label: field,
                    field: field,
                    align: 'left',
                    sortable: true
                }
            }

            const column = {
                name: field,
                label: fieldDef.sv,
                field: fieldDef.sv, // Use Swedish field name for data access
                align: this.getDefaultAlignment(field),
                sortable: true,
                required: this.isRequiredField(field)
            }

            // Add formatter if available
            const formatter = formatters[field]
            if (formatter) {
                column.format = formatter
            } else {
                column.format = this.getDefaultFormatter(field)
            }

            // Add sorting function for numeric fields
            if (this.isNumericField(field)) {
                column.sort = (a, b) => parseFloat(a) - parseFloat(b)
            }

            return column
        })
    }

    /**
     * Get default alignment for field
     * @param {string} field - English field name
     * @returns {string} Alignment ('left', 'center', 'right')
     */
    static getDefaultAlignment(field) {
        const numericFields = ['price', 'change', 'changePercent', 'volume', 'marketCap', 'peRatio', 'dividendYield', 'beta', 'eps']
        const centerFields = ['symbol']
        
        if (numericFields.includes(field)) return 'right'
        if (centerFields.includes(field)) return 'center'
        return 'left'
    }

    /**
     * Check if field is required
     * @param {string} field - English field name
     * @returns {boolean} True if field is required
     */
    static isRequiredField(field) {
        const requiredFields = ['symbol', 'name', 'price']
        return requiredFields.includes(field)
    }

    /**
     * Check if field is numeric
     * @param {string} field - English field name
     * @returns {boolean} True if field is numeric
     */
    static isNumericField(field) {
        const numericFields = ['price', 'change', 'changePercent', 'volume', 'marketCap', 'peRatio', 'dividendYield', 'beta', 'eps', 'week52High', 'week52Low']
        return numericFields.includes(field)
    }

    /**
     * Get default formatter for field
     * @param {string} field - English field name
     * @returns {Function} Formatter function
     */
    static getDefaultFormatter(field) {
        switch (field) {
            case 'price':
            case 'change':
                return (val) => {
                    if (val === null || val === undefined || val === '') return ''
                    const num = parseFloat(val)
                    if (isNaN(num)) return ''
                    return `${num.toFixed(2)} $`
                }
            
            case 'changePercent':
                return (val) => {
                    if (val === null || val === undefined || val === '') return ''
                    const num = parseFloat(val)
                    if (isNaN(num)) return ''
                    return `${(num >= 0 ? '+' : '')}${num.toFixed(2)}%`
                }
            
            case 'volume':
                return (val) => {
                    if (val === null || val === undefined || val === '') return ''
                    const num = parseInt(val)
                    if (isNaN(num)) return ''
                    return new Intl.NumberFormat('sv-SE').format(num)
                }
            
            case 'marketCap':
                return (val) => {
                    if (val === null || val === undefined || val === '') return ''
                    const num = parseFloat(val)
                    if (isNaN(num)) return ''
                    
                    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T $`
                    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B $`
                    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M $`
                    return new Intl.NumberFormat('sv-SE').format(num) + ' $'
                }
            
            default:
                return (val) => val || ''
        }
    }
}