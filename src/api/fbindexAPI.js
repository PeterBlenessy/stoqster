import { setStyle } from "./helpers.js";
import { fetch } from "@tauri-apps/plugin-http";

const baseUrl = "https://fbindex.se/fbi/";

// Global variable to store the tracking cookie
let trackingCookie = null;

// Function to get the tracking cookie by visiting the main page
async function getTrackingCookie() {
    if (trackingCookie) return trackingCookie;
    
    try {
        const response = await fetch("https://fbindex.se/fbi/", {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            }
        });
        
        // Extract cookie from response headers
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            const match = setCookieHeader.match(/fbi-tracking=([^;]+)/);
            if (match) {
                trackingCookie = `fbi-tracking=${match[1]}`;
                console.log("Got tracking cookie:", trackingCookie);
                return trackingCookie;
            }
        }
    } catch (error) {
        console.error("Failed to get tracking cookie:", error);
    }
    
    return null;
}

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


const getRequestOptions = async (company, api) => {
    // Validate API parameter
    if (!api || !fbindex[api]) {
        console.error(`Invalid API parameter: ${api}`);
        throw new Error(`Invalid API parameter: ${api}`);
    }
    
    // Get the tracking cookie first
    const cookie = await getTrackingCookie();
    
    let options = {
        method: "POST",
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json;charset=UTF-8",
            "DNT": "1",
            "Origin": "https://fbindex.se",
            "Referer": "https://fbindex.se/fbi/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
            "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
        },
    };
    
    // Add cookie if we got one
    if (cookie) {
        options.headers["Cookie"] = cookie;
    }
    
    if (company !== "") options.body = JSON.stringify(company);

    return {
        url: fbindex[api].url,
        options: options,
    };
};

// Legacy function for backward compatibility
const fbindexRequestOptions = async (api) => {
    return await getRequestOptions("", api);
};

export { fbindex, fbindexRequestOptions };
