import { setStyle, formatter, isValidNumber } from "./helpers.js";

// For now, we'll use mock data to establish the structure
// In a real implementation, this would connect to Yahoo Finance, Alpha Vantage, or similar
const baseUrl = "https://api.example.com"; // Placeholder

// Return an object for stocks API holding the url and fetch() request options
const stocksApi = {
    url: baseUrl + "/stocks",
    options: {
        method: "get",
        responseType: "json",
    },
};

/**
 * Mock stock data for development
 * In production, this would be fetched from a real financial API
 */
const mockStockData = [
    {
        "Symbol": "AAPL",
        "Namn": "Apple Inc.",
        "Pris": 175.43,
        "Förändring": 2.34,
        "Förändring_procent": 1.35,
        "Volym": 52840000,
        "Marknadsvärde": 2750000000000,
        "ISIN": "US0378331005",
        "Bransch": "Technology",
        "Land": "US"
    },
    {
        "Symbol": "MSFT",
        "Namn": "Microsoft Corporation",
        "Pris": 378.85,
        "Förändring": -1.23,
        "Förändring_procent": -0.32,
        "Volym": 28350000,
        "Marknadsvärde": 2820000000000,
        "ISIN": "US5949181045",
        "Bransch": "Technology",
        "Land": "US"
    },
    {
        "Symbol": "GOOGL",
        "Namn": "Alphabet Inc.",
        "Pris": 138.21,
        "Förändring": 0.87,
        "Förändring_procent": 0.63,
        "Volym": 31250000,
        "Marknadsvärde": 1740000000000,
        "ISIN": "US02079K3059",
        "Bransch": "Technology",
        "Land": "US"
    },
    {
        "Symbol": "TSLA",
        "Namn": "Tesla, Inc.",
        "Pris": 238.59,
        "Förändring": 12.45,
        "Förändring_procent": 5.51,
        "Volym": 84320000,
        "Marknadsvärde": 756000000000,
        "ISIN": "US88160R1014",
        "Bransch": "Consumer Cyclical",
        "Land": "US"
    },
    {
        "Symbol": "AMZN",
        "Namn": "Amazon.com, Inc.",
        "Pris": 145.86,
        "Förändring": -2.14,
        "Förändring_procent": -1.45,
        "Volym": 42180000,
        "Marknadsvärde": 1520000000000,
        "ISIN": "US0231351067",
        "Bransch": "Consumer Cyclical",
        "Land": "US"
    },
    {
        "Symbol": "NVDA",
        "Namn": "NVIDIA Corporation",
        "Pris": 875.28,
        "Förändring": 23.45,
        "Förändring_procent": 2.75,
        "Volym": 19580000,
        "Marknadsvärde": 2160000000000,
        "ISIN": "US67066G1040",
        "Bransch": "Technology",
        "Land": "US"
    }
];

const stocks = {
    title: "Aktier: Marknadsöversikt",
    url: "",
    localForageConfig: {
        storeName: "stocks",
    },
    fields: [
        "Symbol",
        "Namn",
        "Pris",
        "Förändring",
        "Förändring_procent",
        "Volym",
        "Marknadsvärde",
        "ISIN",
        "Bransch",
        "Land"
    ],
    qTableConfig: {
        columns: [
            {
                name: "Symbol",
                label: "Symbol",
                field: "Symbol",
                align: "left",
                required: true,
                sortable: true,
                style: "font-weight: bold; min-width: 80px;",
            },
            {
                name: "Namn",
                label: "Namn",
                field: "Namn",
                align: "left",
                required: true,
                sortable: true,
                style: "white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis;",
            },
            {
                name: "Pris",
                label: "Pris",
                field: "Pris",
                align: "right",
                required: true,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    `${isValidNumber(val) ? val.toFixed(2) : ""} $`,
            },
            {
                name: "Förändring",
                label: "Förändring",
                field: "Förändring",
                align: "right",
                required: true,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    `${isValidNumber(val) ? (val >= 0 ? '+' : '') + val.toFixed(2) : ""} $`,
                style: (row) => {
                    if (!isValidNumber(row.Förändring)) return "";
                    return row.Förändring >= 0 ? "color: green;" : "color: red;";
                },
            },
            {
                name: "Förändring_procent",
                label: "Förändring %",
                field: "Förändring_procent",
                align: "right",
                required: true,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    `${isValidNumber(val) ? (val >= 0 ? '+' : '') + val.toFixed(2) : ""}%`,
                style: (row) => {
                    if (!isValidNumber(row.Förändring_procent)) return "";
                    return row.Förändring_procent >= 0 ? "color: green;" : "color: red;";
                },
            },
            {
                name: "Volym",
                label: "Volym",
                field: "Volym",
                align: "right",
                required: false,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    `${isValidNumber(val) ? formatter.format(val) : ""}`,
            },
            {
                name: "Marknadsvärde",
                label: "Marknadsvärde",
                field: "Marknadsvärde",
                align: "right",
                required: false,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) => {
                    if (!isValidNumber(val)) return "";
                    if (val >= 1e12) return `${(val / 1e12).toFixed(2)}T $`;
                    if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B $`;
                    if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M $`;
                    return formatter.format(val) + " $";
                },
            },
            {
                name: "Bransch",
                label: "Bransch",
                field: "Bransch",
                align: "left",
                required: false,
                sortable: true,
                style: "white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis;",
            },
            {
                name: "ISIN",
                label: "ISIN",
                field: "ISIN",
                align: "left",
                required: false,
                sortable: true,
            },
        ],
        visibleColumns: [
            "Symbol",
            "Namn",
            "Pris",
            "Förändring",
            "Förändring_procent",
            "Volym",
            "Marknadsvärde",
            "Bransch",
        ],
    },
};

/**
 * Fund ownership data structure for stocks
 * This shows which funds own each stock and their ownership percentage
 */
const stockOwnership = {
    title: "Fondägande",
    url: "",
    localForageConfig: {
        storeName: "stock-ownership",
    },
    fields: [
        "Fond_namn",
        "Ägarandel_procent",
        "Marknadsvärde_innehav",
        "Antal_aktier",
        "Andel_av_fondförmögenhet",
    ],
    qTableConfig: {
        columns: [
            {
                name: "Fond_namn",
                label: "Fondnamn",
                field: "Fond_namn",
                align: "left",
                required: true,
                sortable: true,
                style: "white-space: nowrap; max-width: 250px; overflow: hidden; text-overflow: ellipsis;",
            },
            {
                name: "Ägarandel_procent",
                label: "Ägarandel %",
                field: "Ägarandel_procent",
                align: "right",
                required: true,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    isValidNumber(val) ? Number.parseFloat(val).toFixed(2) + "%" : "",
            },
            {
                name: "Andel_av_fondförmögenhet",
                label: "Andel av fond",
                field: "Andel_av_fondförmögenhet",
                align: "right",
                required: true,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    isValidNumber(val) ? Number.parseFloat(val).toFixed(2) + "%" : "",
            },
            {
                name: "Marknadsvärde_innehav",
                label: "Marknadsvärde",
                field: "Marknadsvärde_innehav",
                align: "right",
                required: false,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    isValidNumber(val) ? formatter.format(val) + " SEK" : "",
            },
            {
                name: "Antal_aktier",
                label: "Antal aktier",
                field: "Antal_aktier",
                align: "right",
                required: false,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    isValidNumber(val) ? formatter.format(val) : "",
            },
        ],
        visibleColumns: [
            "Fond_namn",
            "Ägarandel_procent",
            "Andel_av_fondförmögenhet",
            "Marknadsvärde_innehav",
        ],
    },
};

/**
 * Get mock stock data
 * In production, this would fetch from a real API
 */
async function fetchStockData() {
    console.log('🌐 Fetching stock data (mock)');
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockStockData;
}

/**
 * Generate mock fund ownership data for a given stock
 * In production, this would cross-reference with actual fund holdings
 */
function generateMockOwnership(stockSymbol, stockISIN) {
    const mockFunds = [
        "Avanza Zero",
        "SPP Aktiefond USA",
        "Länsförsäkringar USA Indexnära",
        "Swedbank Robur Ny Teknik",
        "Handelsbanken Amerika Index",
        "SEB Global Indexfond",
    ];

    const ownership = [];
    const numOwners = Math.floor(Math.random() * 4) + 1; // 1-4 owners
    
    for (let i = 0; i < numOwners; i++) {
        const fundName = mockFunds[Math.floor(Math.random() * mockFunds.length)];
        if (ownership.find(o => o.Fond_namn === fundName)) continue; // Avoid duplicates
        
        const ownershipPercent = Math.random() * 15; // 0-15% ownership
        const fondPercent = Math.random() * 8; // 0-8% of fund assets
        
        ownership.push({
            Fond_namn: fundName,
            Ägarandel_procent: ownershipPercent,
            Andel_av_fondförmögenhet: fondPercent,
            Marknadsvärde_innehav: Math.floor(Math.random() * 500000000), // Random market value
            Antal_aktier: Math.floor(Math.random() * 1000000), // Random number of shares
        });
    }
    
    return ownership;
}

export { stocksApi, stocks, stockOwnership, fetchStockData, generateMockOwnership };