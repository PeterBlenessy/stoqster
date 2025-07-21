import { setStyle, formatter, isValidNumber } from "./helpers.js";

const baseUrl = "https://www.fi.se";

// Return an object for fi scraping holding the url and fetch() request options
const fiFunds = {
    url: baseUrl + "/sv/vara-register/fondinnehav-per-kvartal/",
    options: {
        method: "get",
        responseType: "text",
    },
};

// Return an object for file download holding the url and fetch() request options
const fiDownload = {
    url: baseUrl,
    options: {
        method: "get",
        responseType: "blob",
        headers: {
            Accept: "application/zip",
            "Content-Type": "application/zip",
        },
    },
};

/**
 * Fields:
 *  - Förvaltningsavgift
 *      - Alt-1: 'UtanAndelsklasser': Object(Number)
 *                  - 'Förvaltningsavgift_fast': Number
 *      - Alt-2: 'MedAndelsklasser': Object( Array(Objects) )
 *                  - 'Förvaltningsavgift': [{'Andelsklass_namn': String, 'Förvaltningsavgift_typ':{'Förvaltningsavgift_fast': Number}}, ...]
 */
const funds = {
    title: "FI: Information om fonder och innehav",
    url: "",
    fields: [
        "activeRisk",
        "fundISIN",
        "institutionNumber",
        "fundName",
        "assetsUnderManagement",
        "managementFee",
        "benchmarkIndex",
        "cashHoldings",
        "volatility24Months",
        "otherAssetsLiabilities",
    ],
    qTableConfig: {
        columns: [
            {
                name: "fundName",
                label: "Fondnamn",
                field: "fundName",
                align: "left",
                required: true,
                sortable: true,
                style: "white-space: nowrap; max-width: 250px; overflow: hidden; text-overflow: ellipsis;",
            },
            {
                name: "fundISIN",
                label: "ISIN-kod",
                field: "fundISIN",
                align: "left",
                required: false,
            },
            {
                name: "assetsUnderManagement",
                label: "Fondförmögenhet",
                field: "assetsUnderManagement",
                align: "right",
                required: false,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    `${isValidNumber(val) ? formatter.format(val) : ""}`,
            },
            {
                name: "benchmarkIndex",
                label: "Jämförelseindex",
                field: "benchmarkIndex",
                align: "left",
                required: false,
                sortable: true,
                style: "white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis;",
            },
            {
                name: "cashHoldings",
                label: "Likvida medel",
                field: "cashHoldings",
                align: "right",
                required: false,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    isValidNumber(val) ? formatter.format(val) : "",
                style: (val) =>
                    setStyle(val, "red", "primary"),
            },
            {
                name: "volatility24Months",
                label: "Standardavvikelse 24 månader",
                field: "volatility24Months",
                align: "right",
                required: false,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    isValidNumber(val) ? Number.parseFloat(val) : "",
            },
            {
                name: "otherAssetsLiabilities",
                label: "Övriga tillgångar och skulder",
                field: "otherAssetsLiabilities",
                align: "right",
                required: false,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    isValidNumber(val) ? formatter.format(val) : "",
                style: (val) =>
                    setStyle(val, "red", "primary"),
            },
        ],
        visibleColumns: [
            "fundName",
            "benchmarkIndex",
            "assetsUnderManagement",
            "cashHoldings",
            "volatility24Months",
            "otherAssetsLiabilities",
        ],
    },
};

/**
 * Fields
 *  - Bransch
 *      - Alt-1: Present if 'Tillgångsslag_enligt_LVF_5_kap' = 'ÖverlåtbartVärdepapper' or 'Fondandel' or 'Penningmarknadsinstrument'
 *      - Alt-2: Missing if 'Tillgångsslag_enligt_LVF_5_kap' = 'DerivatinstrumentSamtTeknikerOchInstrument'
 */
const fundHoldings = {
    title: "Fondens innehav",
    url: "",
    fields: [
        "percentageOfFund",
        "quantity",
        "sectorName",
        "sectorCode",
        "instrumentISIN",
        "instrumentName",
        "valuationPrice",
        "countryCode",
        "marketValue",
        "nominalAmount",
        "assetClass",
        "currency",
        "exchangeRate",
    ],
    qTableConfig: {
        columns: [
            {
                name: "instrumentName",
                label: "Instrumentnamn",
                field: "instrumentName",
                align: "left",
                required: true,
                sortable: true,
                style: "white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis;",
            },
            {
                name: "instrumentISIN",
                label: "ISIN-kod",
                field: "instrumentISIN",
                align: "right",
                required: true,
                sortable: true,
            },
            {
                name: "marketValue",
                label: "Marknadsvärde",
                field: "marketValue",
                align: "right",
                required: false,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    isValidNumber(val) ? formatter.format(val) : "",
            },
            {
                name: "quantity",
                label: "Antal",
                field: "quantity",
                align: "right",
                required: false,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    isValidNumber(val) ? formatter.format(val) : "",
            },
            {
                name: "currency",
                label: "Valuta",
                field: "currency",
                align: "right",
                required: false,
                sortable: true,
            },
            {
                name: "percentageOfFund",
                label: "Andel",
                field: "percentageOfFund",
                align: "right",
                required: true,
                sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: (val) =>
                    isValidNumber(val) ? Number.parseFloat(val) : "",
            },
        ],
        visibleColumns: [
            "instrumentName",
            "sectorName",
            "instrumentISIN",
            "marketValue",
            "percentageOfFund",
            "quantity",
            "currency",
        ],
    },
};

export { fiFunds, fiDownload, funds, fundHoldings };
