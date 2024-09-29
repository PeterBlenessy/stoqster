import { setStyle } from "./helpers.js";

const baseUrl = "https://fbindex.se/fbi/";

const fbindex = {
    getCompanies: {
        title: "Fbindex: Company Information",
        url: baseUrl + "/index/getProducts.req",
        requestOptions: (company) => getRequestOptions(company, "getCompanies"),
        fields: [
            "productName",
            "product",
            "netAssetValue",
            "netAssetValueRebatePremium",
            "netAssetValueChangeDate",
            "price",
            "previousPrice",
            "priceChange",
        ],
        columns: [
            {
                name: "productName",
                label: "Investmentbolag",
                field: "productName",
                align: "left",
                required: true,
                sortable: true,
                style: "white-space: nowrap",
            },
            {
                name: "product",
                label: "Aktiekod",
                field: "product",
                sortable: true,
            },
            {
                name: "netAssetValue",
                label: "Substansvärde",
                field: "netAssetValue",
                sortable: true,
                format: (val) => `${val.toFixed(2)}`,
                style: (val) => setStyle(val.netAssetValue, "red", "primary"),
            },
            {
                name: "netAssetValueRebatePremium",
                label: "Rabatt/Premie",
                field: "netAssetValueRebatePremium",
                sortable: true,
                format: (val) => `${val.toFixed(2)}%`,
                style: (val) => setStyle(val.netAssetValueRebatePremium),
                required: true,
            },
            {
                name: "netAssetValueChangeDate",
                label: "Ändrat",
                field: "netAssetValueChangeDate",
                sortable: true,
                format: (val) => `${new Date(val).toISOString().slice(0, 10)}`,
                style: "word-break: keep-all;",
            },
            {
                name: "price",
                label: "Pris",
                field: "price",
                sortable: true,
                format: (val) => `${val.toFixed(2)}`,
            },
            {
                name: "previousPrice",
                label: "Tidigare pris",
                field: "previousPrice",
                sortable: true,
                format: (val) => `${val.toFixed(2)}`,
            },
            {
                name: "priceChange",
                label: "Prisändring",
                field: "priceChange",
                sortable: true,
                format: (val) => `${val.toFixed(2)}%`,
                style: (val) => setStyle(val.priceChange),
            },
        ],
        visibleColumns: [
            "productName",
            "netAssetValue",
            "netAssetValueRebatePremium",
            "netAssetValueChangeDate",
            "price",
            "priceChange",
        ],
        localForageConfig: {
            storeName: "fbi-companies",
        },
    },

    // Net asset value rebate / premium over time
    getRebatePremiums: {
        title: "Rabatt & Premium över tid",
        url: baseUrl + "/company/getRebatePremiums.req",
        requestOptions: (company) =>
            getRequestOptions(company, "getRebatePremiums"),
        fields: [
            "label",
            "rebatePremiumMax",
            "rebatePremiumAverage",
            "rebatePremiumMin",
        ],
        header: ["Tidsperiod", "Max", "Medel", "Min"],
        columns: [
            {
                name: "label",
                label: "Tidsperiod",
                field: "label",
                align: "left",
            },
            {
                name: "rebatePremiumMax",
                label: "Max",
                field: "rebatePremiumMax",
                format: (val) => `${val.toFixed(2)}%`,
                style: (val) => setStyle(val.rebatePremiumMax),
            },
            {
                name: "rebatePremiumAverage",
                label: "Medel",
                field: "rebatePremiumAverage",
                format: (val) => `${val.toFixed(2)}%`,
                style: (val) => setStyle(val.rebatePremiumAverage),
            },
            {
                name: "rebatePremiumMin",
                label: "Min",
                field: "rebatePremiumMin",
                format: (val) => `${val.toFixed(2)}%`,
                style: (val) => setStyle(val.rebatePremiumMin),
            },
        ],
        visibleColumns: [
            "label",
            "rebatePremiumMax",
            "rebatePremiumAverage",
            "rebatePremiumMin",
        ],
        payload: (company) => JSON.stringify(company),

        localForageConfig: {
            storeName: "fbi-companies-rebatepremium",
        },
    },

    // Company events
    getEvents: {
        title: "Kalender",
        url: baseUrl + "/company/getEvents.req",
        requestOptions: (company) => getRequestOptions(company, "getEvents"),
        fields: [
            "product",
            "productName",
            "eventDate",
            "eventType",
            "eventName",
            "eventDetails",
        ],
        header: ["Bolag", "Aktie", "Datum", "Händelse", "Beskrivning"],
        columns: [
            {
                name: "productName",
                label: "Investmentbolag",
                field: "productName",
                align: "left",
                width: "220px",
                type: "string",
            },
            {
                name: "product",
                label: "Aktiekod",
                field: "product",
                type: "string",
            },
            {
                name: "eventDate",
                label: "Datum",
                field: "eventDate",
                type: "datum",
                align: "left",
                format: (val) => `${new Date(val).toISOString().slice(0, 10)}`,
            },
            {
                name: "eventType",
                label: "Typ av händelse",
                field: "eventType",
                type: "string",
            },
            {
                name: "eventName",
                label: "Händelse",
                field: "eventName",
                type: "string",
                align: "left",
            },
            {
                name: "eventDetails",
                label: "Detaljer",
                field: "eventDetails",
                type: "string",
            },
        ],
        visibleColumns: ["eventName", "eventDate"],
        payload: (company) => JSON.stringify(company),

        localForageConfig: {
            storeName: "fbi-companies-events",
        },
    },
};

function fbindexRequestOptions(apiRequest) {
    return {
        url: fbindex[apiRequest].url,
        options: {
            method: "get",
            responseType: "json",
            headers: {
                "Content-Type": "application/json;charset=UTF-8",
            },
        },
    };
}
const getRequestOptions = (company, api) => {
    let options = {
        method: "post",
        responseType: "json",
        headers: {
            "Content-Type": "application/json;charset=utf-8",
        },
    };
    if (company !== "") options.body = JSON.stringify(company);

    return {
        url: fbindex[api].url,
        options: options,
    };
};

export { fbindex, fbindexRequestOptions };
