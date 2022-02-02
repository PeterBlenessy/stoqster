// Set color based on value being negative or positive
const setStyle = (number, ifNegative = 'red', ifPositive = 'green') => {
    if (number != 0) {
        return (number < 0 ? 'color:' + ifNegative : 'color:' + ifPositive)
    }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat
const formatter = new Intl.NumberFormat('sv-SE', {
    // style: 'currency',
    // currency: 'SEK',
    //notation: 'compact',
    //compactDisplay: 'short',
    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)

});


// Returns the url and request options object to be passed to fetch() for the specified ibi api and company, if available
function ibiRequestOptions(ibiRequest, company = '') {
    let url = company !== '' ? ibindex.getSpecialURL[ibiRequest][company] : undefined;
    return {
        url: url !== undefined ? url : ibindex[ibiRequest].url,
        options: {
            method: 'post',
            responseType: 'arraybuffer',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            body: company !== '' ? JSON.stringify(company) : ''
        }
    }
}

const ibindex = {

    // IB companies and their reported and calculated net asset values and price
    getCompanies: {
        title: 'Ibindex: reported and calculated net asset values, rebate / premium, and price',
        url: 'https://ibindex.se/ibi//index/getProducts.req',
        fields: ['productName', 'product', 'netAssetValue', 'netAssetValueCalculated', 'netAssetValueCalculatedRebatePremium', 'netAssetValueRebatePremium', 'netAssetValueChangeDate', 'price', 'previousPrice', 'priceChange'],
        columns: [
            { name: 'productName', label: 'Investmentbolag', field: 'productName', align: 'left', required: true, sortable: true },
            { name: 'product', label: 'Aktiekod', field: 'product', sortable: true },
            {
                name: 'netAssetValue', label: 'Substansvärde', field: 'netAssetValue', sortable: true,
                format: val => `${val.toFixed(2)}`,
                style: val => setStyle(val.netAssetValue, 'red', 'primary')
            },
            {
                name: 'netAssetValueCalculated', label: 'Beräknat substansvärde', field: 'netAssetValueCalculated', sortable: true,
                format: val => `${val.toFixed(2)}`
            },
            {
                name: 'netAssetValueCalculatedRebatePremium', label: 'Beräknad Rabatt/Premie', field: 'netAssetValueCalculatedRebatePremium', sortable: true,
                format: val => `${val.toFixed(2)}%`,
                style: val => setStyle(val.netAssetValueCalculatedRebatePremium),
                required: true
            },
            {
                name: 'netAssetValueRebatePremium', label: 'Rabatt/Premie', field: 'netAssetValueRebatePremium', sortable: true,
                format: val => `${val.toFixed(2)}%`,
                style: val => setStyle(val.netAssetValueRebatePremium),
                required: true
            },
            {
                name: 'netAssetValueChangeDate', label: 'Ändrat', field: 'netAssetValueChangeDate', sortable: true,
                format: val => `${new Date(val).toISOString().slice(0, 10)}`
            },
            {
                name: 'price', label: 'Pris', field: 'price', sortable: true,
                format: val => `${val.toFixed(2)}`
            },
            {
                name: 'previousPrice', label: 'Tidigare pris', field: 'previousPrice', sortable: true,
                format: val => `${val.toFixed(2)}`
            },
            {
                name: 'priceChange', label: 'Prisändring', field: 'priceChange', sortable: true,
                format: val => `${val.toFixed(2)}%`,
                style: val => setStyle(val.priceChange)
            },
        ],
        visibleColumns: [
            'productName',
            'netAssetValue', 'netAssetValueCalculated',
            'netAssetValueRebatePremium', 'netAssetValueCalculatedRebatePremium',
            'netAssetValueChangeDate',
            'price', 'priceChange'
        ],
        localForageConfig: {
            storeName: 'ibi-companies',
        },
    },

    // Index and market weights of IB companies
    getWeights: {
        title: 'Ibindex: Index and market weights of ibindex companies',
        url: 'https://ibindex.se/ibi//companies/getCompanies.req',
        fields: ['product', 'productName', 'indexWeight', 'marketWeight'],
        columns: [
            { name: 'product', label: 'Aktiekod', field: 'product', sortable: true },
            { name: 'productName', label: 'Investmentbolag', field: 'productName', align: 'left', required: true, sortable: true },
            {
                name: 'indexWeight', label: 'Indexvikt', field: 'indexWeight', required: true, sortable: true,
                format: val => `${val.toFixed(2)}%`
            },
            {
                name: 'marketWeight', label: 'Marknadsvikt', field: 'marketWeight', required: true, sortable: true,
                format: val => `${val.toFixed(2)}%`
            },
        ],
        visibleColumns: ['productName', 'indexWeight', 'marketWeight'],
        localForageConfig: {
            storeName: 'ibi-companies-weights',
        },

    },

    // Price and net asset value trends
    getTrends: {
        title: 'Ibindex: Price and net asset value trends',
        url: 'https://ibindex.se/ibi//index/getTrends.req',
        fields: ["product", "productName", "price", "navCalculatedPerShare", "thirtyDaysPriceChange", "sixMonthPriceChange", "oneYearPriceChange", "threeYearPriceChange", "fiveYearPriceChange", "thirtyDaysNavChange", "sixMonthNavChange", "oneYearNavChange", "threeYearNavChange", "fiveYearNavChange"],
        header: ["Aktiekod", "Investmentbolag", "Pris", "Beräknat substansvärde", "30 dagar", "6 månader", "1 år", "3 år", "5 år", "30 dagar", "6 månader", "1 år", "3 år", "5 år"],
        columns: [
            { name: 'product', label: 'Aktiekod', field: 'product', type: 'string' },
            { name: 'productName', label: 'Investmentbolag', field: 'productName', align: 'start', width: '220px', type: 'string' },
            { name: 'price', label: 'Pris', field: 'price', type: 'currency' },
            { name: 'navCalculatedPerShare', label: 'Beräknat substansvärde', field: 'navCalculatedPerShare', type: 'percentage' },
            { name: 'thirtyDaysPriceChange', label: '30 dagar', field: 'thirtyDaysPriceChange', type: 'percentage' },
            { name: 'sixMonthPriceChange', label: '6 månader', field: 'sixMonthPriceChange', type: 'percentage' },
            { name: 'oneYearPriceChange', label: '1 år', field: 'oneYearPriceChange', type: 'percentage' },
            { name: 'threeYearPriceChange', label: '3 år', field: 'threeYearPriceChange', type: 'percentage' },
            { name: 'fiveYearPriceChange', label: '5 år', field: 'fiveYearPriceChange', type: 'percentage' },
            { name: 'thirtyDaysNavChange', label: '30 dagar', field: 'thirtyDaysNavChange', type: 'percentage' },
            { name: 'sixMonthNavChange', label: '6 månader', field: 'sixMonthNavChange', type: 'percentage' },
            { name: 'oneYearNavChange', label: '1 år', field: 'oneYearNavChange', type: 'percentage' },
            { name: 'threeYearNavChange', label: '3 år', field: 'threeYearNavChange', type: 'percentage' },
            { name: 'fiveYearNavChange', label: '5 år', field: 'fiveYearNavChange', type: 'percentage' },
        ],
        localForageConfig: {
            storeName: 'ibi-companies-trends',
        },

    },

    // Net asset value rebate / premium over time
    getRebatePremiums: {
        title: 'Ibindex: Rebate / Premium over time',
        url: 'https://ibindex.se/ibi//company/getRebatePremiums.req',
        fields: ['rebatePremium', 'calculatedRebatePremium', 'rebatePremiumMax', 'rebatePremiumMin', 'rebatePremiumAverage', 'calculatedRebatePremiumMax', 'calculatedRebatePremiumMin', 'calculatedRebatePremiumAverage', 'label'],
        header: ['Rabatt/Premium', 'Beräknad Rabatt/Premium', 'Max', 'Min', 'Medel', 'Max', 'Min', 'Medel', 'Tidsperiod'],
        columns: [
            { name: 'label', label: 'Tidsperiod', field: 'label' },
            { name: 'rebatePremium', label: 'Rabatt/Premium', field: 'rebatePremium', format: val => `${val.toFixed(2)}%`, style: val => setStyle(val.rebatePremium) },
            { name: 'calculatedRebatePremium', label: 'Beräknad Rabatt/Premium', field: 'calculatedRebatePremium', format: val => `${val.toFixed(2)}%`, style: val => setStyle(val.calculatedRebatePremium) },
            { name: 'rebatePremiumMax', label: 'Max', field: 'rebatePremiumMax', format: val => `${val.toFixed(2)}%`, style: val => setStyle(val.rebatePremiumMax) },
            { name: 'rebatePremiumMin', label: 'Min', field: 'rebatePremiumMin', format: val => `${val.toFixed(2)}%`, style: val => setStyle(val.rebatePremiumMin) },
            { name: 'rebatePremiumAverage', label: 'Medel', field: 'rebatePremiumAverage', format: val => `${val.toFixed(2)}%`, style: val => setStyle(val.rebatePremiumAverage) },
            { name: 'calculatedRebatePremiumMax', label: 'Max', field: 'calculatedRebatePremiumMax', format: val => `${val.toFixed(2)}%`, style: val => setStyle(val.calculatedRebatePremiumMax) },
            { name: 'calculatedRebatePremiumMin', label: 'Min', field: 'calculatedRebatePremiumMin', format: val => `${val.toFixed(2)}%`, style: val => setStyle(val.calculatedRebatePremiumMin) },
            { name: 'calculatedRebatePremiumAverage', label: 'Medel', field: 'calculatedRebatePremiumAverage', format: val => `${val.toFixed(2)}%`, style: val => setStyle(val.calculatedRebatePremiumAverage) }
        ],
        visibleColumns: ['label', 'calculatedRebatePremiumMax', 'calculatedRebatePremiumMin', 'calculatedRebatePremiumAverage'],
        payload: (company) => JSON.stringify(company),
        localForageConfig: {
            storeName: 'ibi-companies-rebate',
        },

    },

    // Holdings of an IB company
    getHoldings: {
        title: 'Company holdings',
        url: 'https://ibindex.se/ibi//company/getHoldings.req',
        fields: ['holdingName', 'holdingProduct', 'holdingValue', 'holdingValuePrevious', 'listed'],
        header: ['Bolag', 'Aktie', 'Värde', 'Tidigare värde', 'Noterad'],
        columns: [
            { name: 'holdingName', label: 'Bolag', field: 'holdingName', align: 'left', required: true, width: '220px', type: 'string', sortable: true },
            { name: 'holdingProduct', label: 'Aktiekod', field: 'holdingProduct', type: 'string', sortable: true },
            {
                name: 'holdingValue', label: 'Värde', field: 'holdingValue', type: 'currency', sortable: true,
                format: val => `${formatter.format(val)}`
            },
            {
                name: 'holdingValuePrevious', label: 'Tidigare värde', field: 'holdingValuePrevious', type: 'currency', sortable: true,
                format: val => `${formatter.format(val)}`
            },
            { name: 'listed', label: 'Noterat', field: 'listed', type: 'boolean', sortable: true },
        ],
        visibleColumns: ['holdingName', 'holdingValue', 'listed'],
        payload: (company) => JSON.stringify(company),
        localForageConfig: {
            storeName: 'ibi-companies-holdings',
        },
    },

    // Company events
    getEvents: {
        title: 'Calendar  ',
        url: 'https://ibindex.se/ibi//company/getEvents.req',
        fields: ['product', 'productName', 'eventDate', 'eventType', 'eventName', 'eventDetails'],
        header: ['Bolag', 'Aktie', 'Datum', 'Händelse', 'Beskrivning'],
        columns: [
            { name: 'productName', label: 'Investmentbolag', field: 'productName', align: 'left', width: '220px', type: 'string' },
            { name: 'product', label: 'Aktiekod', field: 'product', type: 'string' },
            {
                name: 'eventDate', label: 'Datum', field: 'eventDate', type: 'datum', align: 'left',
                format: val => `${new Date(val).toISOString().slice(0, 10)}`
            },
            { name: 'eventType', label: 'Typ av händelse', field: 'eventType', type: 'string' },
            { name: 'eventName', label: 'Händelse', field: 'eventName', type: 'string', align: 'left' },
            { name: 'eventDetails', label: 'Detaljer', field: 'eventDetails', type: 'string' },
        ],
        visibleColumns: ['eventName', 'eventDate'],
        payload: (company) => JSON.stringify(company),
        localForageConfig: {
            storeName: 'ibi-companies-events',
        },
    },


    getNetAssetValue: {
        'url': 'https://ibindex.se/ibi//company/getNetAssetValue.req',
        'header': '[]',
        'fields': '[]',
        payload: (company) => JSON.stringify(company),
        localForageConfig: {
            storeName: 'ibi-companies-nav',
        },
    },



    // -----------------------------
    getSpecialURL: {
        getHoldings: {
            'AJA B': 'https://ibindex.se/ibi//aja/getHoldings.req',
            'FLAT B': 'https://ibindex.se/ibi//flatcapital/getHoldings.req',
            'SPILTAN': 'https://ibindex.se/ibi//spiltan/getHoldings.req',
            'VEFL SDB': 'https://ibindex.se/ibi//vef/getHoldings.req'
        },
        getRebatePremiums: {
            'AJA B': 'https://ibindex.se/ibi//aja/getRebatePremiums.req',
            'FLAT B': 'https://ibindex.se/ibi//flatcapital/getRebatePremiums.req',
            'SPILTAN': 'https://ibindex.se/ibi//spiltan/getRebatePremiums.req',
            'VEFL SDB': 'https://ibindex.se/ibi//vef/getRebatePremiums.req'
        },
        getEvents: {
            'AJA B': 'https://ibindex.se/ibi//aja/getEvents.req',
            'FLAT B': 'https://ibindex.se/ibi//flatcapital/getEvents.req',
            'SPILTAN': 'https://ibindex.se/ibi//spiltan/getEvents.req',
            'VEFL SDB': 'https://ibindex.se/ibi//vef/getEvents.req'
        },

    }
}

module.exports = {
    ibindex,
    ibiRequestOptions
}

/*

const watching = {
    product
    
    productName: getCompanyName

    netAssetValue: getNetAssetValue
    netAssetValueCalculated: getNetAssetValue
    netAssetValueChangeDate: getNetAssetValue

    netAssetValueCalculatedRebatePremium: getCurrentRebatePremium
    netAssetValueRebatePremium: getCurrentRebatePremium

    price: {
        baseUrl: ibindex.se/ibi//company/,
        request: getPrice.req,
        
        fields: [
            { name: 'product', label: 'Aktie', type: 'string' },
            { name: 'price', label: 'Pris', type: 'string' },
            { name: 'previousPrice', label: 'Föregående pris', type: 'string' },
            { name: 'priceChange', label: 'Ändring', type: 'string' },
            { name: 'timestamp', label: 'Datum', type: 'string' },
        ],
    },
    previousPrice: getPrice
    priceChange: getPrice

}


const fields = {

    getProducts: {
        product
        productName
        netAssetValue
        netAssetValueCalculated
        netAssetValueCalculatedRebatePremium
        netAssetValueRebatePremium
        netAssetValueChangeDate
        price
        previousPrice
        priceChange
    },

    getProductWeights: {
        product
        productName
        weight
    },

    getHistoryChartData: {
        date
        ibiIndexPrice
        omxIndexPrice
    },

    getTrends: {
        product
        productName
        navCalculatedPerShare
        price
        thirtyDaysNavChange
        sixMonthNavChange
        oneYearNavChange
        threeYearNavChange
        fiveYearNavChange
        thirtyDaysPriceChange
        sixMonthPriceChange
        oneYearPriceChange
        threeYearPriceChange
        fiveYearPriceChange
    },

    ---------------------

    getCompanies: {
        product
        productName
        indexWeight
        marketWeight
    },
    
    getHoldings: {
        holdingProduct: '',
        holdingName: '',
        holdingValue: '',
        holdingValuePrevious: '',
        listed: ''
    },
    
    
    getPrice: {
        "product":"BURE",
        "price":404.6,
        "previousPrice":398.2,
        "priceChange":1.6072325464590698,
        "timestamp":1635790490000
    },
    
    getAbout: {
        "product":"BURE",
        "productName":"Bure Equity",
        "about":""
    },

    getCompanyName: "Bure Equity",

    getChartDataPercent: {
        "date":1632182400000,
        "ibiIndexPrice":0.0,
        "omxIndexPrice":0.0,
        "productPrice":0.0,
        "product":"BURE"
    },
    
    getChartDataPrice: {
        "product":"BURE",
        "date":1632182400000,
        "productPrice":374.8,
        "netAssetValuePrice":323.8,
        "netAssetValueCalculatedPrice":329.4913893093416
    },
    
    getHoldingsDate:    1625011200000,
    
    getNetAssetValue: {
        "product":"BURE",
        "netAssetValue":323.8,
        "netAssetValueCalculated":320.20047852425324,
        "netAssetValueChangeDate":1629331200000
    },


    getHoldings: {
        "holdingProduct":"1",
        "holdingName":"Allgon",
        "holdingValue":7.35E8,
        "holdingValuePrevious":7.35E8,
        "listed":false
    },

    getCurrentRebatePremium: {
        "rebatePremium":-24.95367510809141,
        "calculatedRebatePremium":-26.35833708454438
    },

    getRebatePremiums: {
        "rebatePremium":-24.95367510809141,
        "calculatedRebatePremium":-26.35833708454438,
        "rebatePremiumMax":-24.95367510809141,
        "rebatePremiumMin":-24.95367510809141,
        "rebatePremiumAverage":-24.95367510809141,
        "calculatedRebatePremiumMax":-26.35833708454438,
        "calculatedRebatePremiumMin":-26.35833708454438,
        "calculatedRebatePremiumAverage":-26.35833708454438,
        "label":"Nuvarande"
    },

    getRelativePrice: {
        "relativePrice":386.7416973831735,
        "relativePriceDifference":-4.413816761449951,
        "label":"30 dagar"
    },

    getEvents : {
        product: '',
        productName: '',
        eventDate: '1604534400000',
        eventType: '',
        eventName: '',
        eventDetails: ''
    },
    
---------------------

}


URL                                                     |   PAYLOAD     |->      RESPONSE
---------------------------------------------------------------------------------------------------
\INDEX
BASEURL: 
ibindex.se/ibi//index/
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//index/getPreviousIndexPrice.req         |               |->     467.7220662537041
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//index/getIndexChange.req                |               |->     0.0018304161058289026
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//index/getIndexTimestamp.req             |               |->     1635790490000
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//index/getHistoryChartData.req           | "30_DAYS"     |->     [{"date":1632182400000,"ibiIndexPrice":0.0,"omxIndexPrice":0.0},{"date":1632268800000,"ibiIndexPrice":0.28,"omxIndexPrice":1.07},{"date":1632355200000,"ibiIndexPrice":2.42,"omxIndexPrice":2.77},{"date":1632441600000,"ibiIndexPrice":1.23,"omxIndexPrice":1.69},{"date":1632700800000,"ibiIndexPrice":0.32,"omxIndexPrice":1.28},{"date":1632787200000,"ibiIndexPrice":-2.45,"omxIndexPrice":-0.92},{"date":1632873600000,"ibiIndexPrice":-2.29,"omxIndexPrice":-0.85},{"date":1632960000000,"ibiIndexPrice":-1.22,"omxIndexPrice":-0.69},{"date":1633046400000,"ibiIndexPrice":-1.12,"omxIndexPrice":-0.91},{"date":1633305600000,"ibiIndexPrice":-1.54,"omxIndexPrice":-1.83},{"date":1633392000000,"ibiIndexPrice":-1.03,"omxIndexPrice":-0.88},{"date":1633478400000,"ibiIndexPrice":-2.33,"omxIndexPrice":-2.37},{"date":1633564800000,"ibiIndexPrice":-0.86,"omxIndexPrice":-0.75},{"date":1633651200000,"ibiIndexPrice":-2.19,"omxIndexPrice":-1.52},{"date":1633910400000,"ibiIndexPrice":-3.24,"omxIndexPrice":-1.82},{"date":1633996800000,"ibiIndexPrice":-1.6,"omxIndexPrice":-1.05},{"date":1634083200000,"ibiIndexPrice":0.48,"omxIndexPrice":0.09},{"date":1634169600000,"ibiIndexPrice":1.92,"omxIndexPrice":0.96},{"date":1634256000000,"ibiIndexPrice":2.55,"omxIndexPrice":1.76},{"date":1634515200000,"ibiIndexPrice":2.67,"omxIndexPrice":1.62},{"date":1634601600000,"ibiIndexPrice":3.3,"omxIndexPrice":2.28},{"date":1634688000000,"ibiIndexPrice":3.93,"omxIndexPrice":2.26},{"date":1634774400000,"ibiIndexPrice":5.63,"omxIndexPrice":2.21},{"date":1634860800000,"ibiIndexPrice":7.22,"omxIndexPrice":3.25},{"date":1635120000000,"ibiIndexPrice":6.6,"omxIndexPrice":2.43},{"date":1635206400000,"ibiIndexPrice":6.95,"omxIndexPrice":3.05},{"date":1635292800000,"ibiIndexPrice":8.11,"omxIndexPrice":2.12},{"date":1635379200000,"ibiIndexPrice":7.97,"omxIndexPrice":1.69},{"date":1635465600000,"ibiIndexPrice":7.03,"omxIndexPrice":0.7},{"date":1635724800000,"ibiIndexPrice":7.22,"omxIndexPrice":1.2}]
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//index/getProductWeights.req             |               |->     [{"product":"BURE","productName":"Bure Equity","weight":5.466406647961071},{"product":"CRED A","productName":"Creades A","weight":4.213734233531307},{"product":"FASTAT","productName":"Fastator","weight":8.159464790488007},{"product":"HAV B","productName":"Havsfrun Investment B","weight":0.23882108515277398},{"product":"INDU C","productName":"Industrivärden C","weight":7.7425795806529765},{"product":"INVE B","productName":"Investor B","weight":8.0042814392779},{"product":"KDEV","productName":"Karolinska Development B","weight":9.379802865465232},{"product":"KINV B","productName":"Kinnevik B","weight":5.55142442734767},{"product":"LATO B","productName":"Latour B","weight":3.002356850199813},{"product":"LINC","productName":"Linc","weight":4.809336147483615},{"product":"LUND B","productName":"Lundbergföretagen B","weight":7.8269615510557475},{"product":"NAXS","productName":"NAXS","weight":8.378404368436808},{"product":"ORES","productName":"Öresund","weight":7.152525652349821},{"product":"SVOL B","productName":"Svolder B","weight":5.505203098695396},{"product":"TRAC B","productName":"Traction  B","weight":7.6295313073016064},{"product":"VNV","productName":"VNV Global","weight":6.939165954600251}]
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//index/getProducts.req                   |               |->     [{"product":"AJA B","productName":"Byggmästare A J Ahlström","netAssetValue":312.34,"netAssetValueCalculated":310.31,"netAssetValueCalculatedRebatePremium":5.9005510618413854,"netAssetValueRebatePremium":6.512134212716902,"netAssetValueChangeDate":1631664000000,"price":292.0,"previousPrice":300.0,"priceChange":-2.6666666666666616},{"product":"BURE","productName":"Bure Equity","netAssetValue":323.8,"netAssetValueCalculated":320.20047852425324,"netAssetValueCalculatedRebatePremium":-26.35833708454438,"netAssetValueRebatePremium":-24.95367510809141,"netAssetValueChangeDate":1629331200000,"price":404.6,"previousPrice":398.2,"priceChange":1.6072325464590698},{"product":"CRED A","productName":"Creades A","netAssetValue":86.0,"netAssetValueCalculated":88.92352854342059,"netAssetValueCalculatedRebatePremium":-37.47767548417333,"netAssetValueRebatePremium":-42.15116279069768,"netAssetValueChangeDate":1634083200000,"price":122.25,"previousPrice":119.4,"priceChange":2.386934673366836},{"product":"FASTAT","productName":"Fastator","netAssetValue":21.8,"netAssetValueCalculated":22.188504844638572,"netAssetValueCalculatedRebatePremium":13.558844391290837,"netAssetValueRebatePremium":12.018348623853214,"netAssetValueChangeDate":1629244800000,"price":19.18,"previousPrice":19.5,"priceChange":-1.6410256410256396},{"product":"FLAT B","productName":"Flat Capital","netAssetValue":10.78,"netAssetValueCalculated":10.78,"netAssetValueCalculatedRebatePremium":-209.64749536178113,"netAssetValueRebatePremium":-209.64749536178113,"netAssetValueChangeDate":1635206400000,"price":33.38,"previousPrice":32.5,"priceChange":2.707692307692322},{"product":"HAV B","productName":"Havsfrun Investment B","netAssetValue":11.59,"netAssetValueCalculated":11.590000151173914,"netAssetValueCalculatedRebatePremium":-96.7213089094797,"netAssetValueRebatePremium":-96.72131147540985,"netAssetValueChangeDate":1634256000000,"price":22.8,"previousPrice":22.55,"priceChange":1.1086474501108556},{"product":"INDU C","productName":"Industrivärden C","netAssetValue":305.0,"netAssetValueCalculated":304.8923446054971,"netAssetValueCalculatedRebatePremium":6.261995403722198,"netAssetValueRebatePremium":6.295081967213112,"netAssetValueChangeDate":1635724800000,"price":285.8,"previousPrice":278.9,"priceChange":2.474005019720349},{"product":"INVE B","productName":"Investor B","netAssetValue":223.0,"netAssetValueCalculated":233.6579836339935,"netAssetValueCalculatedRebatePremium":13.998230715380966,"netAssetValueRebatePremium":9.887892376681616,"netAssetValueChangeDate":1634515200000,"price":200.95,"previousPrice":197.9,"priceChange":1.5411824153612752},{"product":"KDEV","productName":"Karolinska Development B","netAssetValue":5.7,"netAssetValueCalculated":5.682550428720482,"netAssetValueCalculatedRebatePremium":28.553207737847142,"netAssetValueRebatePremium":28.771929824561415,"netAssetValueChangeDate":1632700800000,"price":4.06,"previousPrice":4.06,"priceChange":0.0},{"product":"KINV B","productName":"Kinnevik B","netAssetValue":272.97,"netAssetValueCalculated":267.8727784668765,"netAssetValueCalculatedRebatePremium":-26.141970055304654,"netAssetValueRebatePremium":-23.78649668461734,"netAssetValueChangeDate":1634688000000,"price":337.9,"previousPrice":336.65,"priceChange":0.37130551017376945},{"product":"LATO B","productName":"Latour B","netAssetValue":197.0,"netAssetValueCalculated":197.32803721878398,"netAssetValueCalculatedRebatePremium":-58.517767879679724,"netAssetValueRebatePremium":-58.781725888324885,"netAssetValueChangeDate":1629676800000,"price":312.8,"previousPrice":311.2,"priceChange":0.5141388174807249},{"product":"LINC","productName":"Linc","netAssetValue":62.4,"netAssetValueCalculated":56.98926626986665,"netAssetValueCalculatedRebatePremium":-46.69429082332983,"netAssetValueRebatePremium":-33.974358974358964,"netAssetValueChangeDate":1635465600000,"price":83.6,"previousPrice":84.82,"priceChange":-1.43834001414761},{"product":"LUND B","productName":"Lundbergföretagen B","netAssetValue":538.0,"netAssetValueCalculated":498.4276727129032,"netAssetValueCalculatedRebatePremium":0.10586745917038343,"netAssetValueRebatePremium":7.453531598513019,"netAssetValueChangeDate":1629763200000,"price":497.9,"previousPrice":494.6,"priceChange":0.6672058228871736},{"product":"NAXS","productName":"NAXS","netAssetValue":68.49,"netAssetValueCalculated":68.49000077365014,"netAssetValueCalculatedRebatePremium":15.024092068062822,"netAssetValueRebatePremium":15.024091108190962,"netAssetValueChangeDate":1634860800000,"price":58.2,"previousPrice":60.6,"priceChange":-3.960396039603953},{"product":"SPILTAN","productName":"Spiltan","netAssetValue":208.71,"netAssetValueCalculated":208.82,"netAssetValueCalculatedRebatePremium":-9.663825304089645,"netAssetValueRebatePremium":-9.72162330506443,"netAssetValueChangeDate":1633305600000,"price":229.0,"previousPrice":229.0,"priceChange":0.0},{"product":"SVOL B","productName":"Svolder B","netAssetValue":285.0,"netAssetValueCalculated":288.88377775390626,"netAssetValueCalculatedRebatePremium":-22.748325557441284,"netAssetValueRebatePremium":-24.421052631578966,"netAssetValueChangeDate":1635724800000,"price":354.6,"previousPrice":348.2,"priceChange":1.8380241240666395},{"product":"TRAC B","productName":"Traction  B","netAssetValue":253.0,"netAssetValueCalculated":268.3649091082552,"netAssetValueCalculatedRebatePremium":10.196902866021318,"netAssetValueRebatePremium":4.743083003952564,"netAssetValueChangeDate":1634860800000,"price":241.0,"previousPrice":241.0,"priceChange":0.0},{"product":"VEFL SDB","productName":"VEF","netAssetValue":4.12,"netAssetValueCalculated":4.19,"netAssetValueCalculatedRebatePremium":-44.152744630071595,"netAssetValueRebatePremium":-46.601941747572816,"netAssetValueChangeDate":1627430400000,"price":6.04,"previousPrice":6.22,"priceChange":-2.893890675241151},{"product":"VNV","productName":"VNV Global","netAssetValue":122.5,"netAssetValueCalculated":121.8592416271134,"netAssetValueCalculatedRebatePremium":-5.28540821925938,"netAssetValueRebatePremium":-4.734693877551033,"netAssetValueChangeDate":1634860800000,"price":128.3,"previousPrice":126.0,"priceChange":1.8253968253968411},{"product":"ORES","productName":"Öresund","netAssetValue":144.0,"netAssetValueCalculated":146.7975709558335,"netAssetValueCalculatedRebatePremium":0.13458734674359762,"netAssetValueRebatePremium":-1.8055555555555491,"netAssetValueChangeDate":1633910400000,"price":146.6,"previousPrice":149.4,"priceChange":-1.8741633199464647}]
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//index/getTrends.req                     |               |->     [{"product":"AJA B","productName":"Byggmästare A J Ahlström","navCalculatedPerShare":310.31,"price":292.0,"thirtyDaysNavChange":3.6093489148580904,"sixMonthNavChange":55.155,"oneYearNavChange":96.39873417721519,"threeYearNavChange":100.20000000000002,"fiveYearNavChange":214.55651292448044,"thirtyDaysPriceChange":9.363295880149813,"sixMonthPriceChange":26.406926406926413,"oneYearPriceChange":88.38709677419354,"threeYearPriceChange":116.2962962962963,"fiveYearPriceChange":215.6756756756757},{"product":"BURE","productName":"Bure Equity","navCalculatedPerShare":320.20047852425324,"price":404.6,"thirtyDaysNavChange":6.7399723174801585,"sixMonthNavChange":15.476799661209828,"oneYearNavChange":53.12251245744537,"threeYearNavChange":134.94767628335023,"fiveYearNavChange":206.94064275714462,"thirtyDaysPriceChange":14.682539682539675,"sixMonthPriceChange":5.0909090909091015,"oneYearPriceChange":58.41816758026626,"threeYearPriceChange":233.82838283828386,"fiveYearPriceChange":323.66492146596863},{"product":"CRED A","productName":"Creades A","navCalculatedPerShare":88.92352854342059,"price":122.25,"thirtyDaysNavChange":4.222891437789755,"sixMonthNavChange":13.764817563421339,"oneYearNavChange":76.08576401850884,"threeYearNavChange":188.6164535537306,"fiveYearNavChange":254.277006149086,"thirtyDaysPriceChange":19.152046783625742,"sixMonthPriceChange":4.487179487179493,"oneYearPriceChange":35.98442714126806,"threeYearPriceChange":345.35519125683055,"fiveYearPriceChange":467.2853828306264},{"product":"FASTAT","productName":"Fastator","navCalculatedPerShare":22.188504844638572,"price":19.18,"thirtyDaysNavChange":-0.7831807763511445,"sixMonthNavChange":3.684602077750343,"oneYearNavChange":3.7815942218829335,"threeYearNavChange":100.98283373766823,"fiveYearNavChange":0.0,"thirtyDaysPriceChange":-0.1561686621551317,"sixMonthPriceChange":-7.521697203471545,"oneYearPriceChange":-15.506607929515425,"threeYearPriceChange":104.04255319148933,"fiveYearPriceChange":0.0},{"product":"FLAT B","productName":"Flat Capital","navCalculatedPerShare":10.78,"price":33.38,"thirtyDaysNavChange":6.627101879327402,"sixMonthNavChange":6.627101879327402,"oneYearNavChange":6.627101879327402,"threeYearNavChange":6.627101879327402,"fiveYearNavChange":6.627101879327402,"thirtyDaysPriceChange":233.8,"sixMonthPriceChange":233.8,"oneYearPriceChange":233.8,"threeYearPriceChange":233.8,"fiveYearPriceChange":233.8},{"product":"HAV B","productName":"Havsfrun Investment B","navCalculatedPerShare":11.590000151173914,"price":22.8,"thirtyDaysNavChange":-2.3588863395030746,"sixMonthNavChange":-1.1941883679796539,"oneYearNavChange":-7.722927421386016,"threeYearNavChange":-35.3597290463179,"fiveYearNavChange":-45.739699666788795,"thirtyDaysPriceChange":-4.801670146137782,"sixMonthPriceChange":-12.307692307692308,"oneYearPriceChange":19.060052219321165,"threeYearPriceChange":25.96685082872927,"fiveYearPriceChange":18.75},{"product":"INDU C","productName":"Industrivärden C","navCalculatedPerShare":304.8923446054971,"price":285.8,"thirtyDaysNavChange":4.173792694040612,"sixMonthNavChange":-2.3738053892289446,"oneYearNavChange":22.31035497069429,"threeYearNavChange":43.065510927902736,"fiveYearNavChange":70.33091877402073,"thirtyDaysPriceChange":7.8490566037735965,"sixMonthPriceChange":-7.026675341574484,"oneYearPriceChange":23.66940718303765,"threeYearPriceChange":51.85972369819343,"fiveYearPriceChange":80.54327226784585},{"product":"INVE B","productName":"Investor B","navCalculatedPerShare":233.6579836339935,"price":200.95,"thirtyDaysNavChange":5.681466379448752,"sixMonthNavChange":11.60470794079027,"oneYearNavChange":38.245450981224074,"threeYearNavChange":84.07275467230801,"fiveYearNavChange":145.95577224630895,"thirtyDaysPriceChange":7.609510549427001,"sixMonthPriceChange":10.930168368755155,"oneYearPriceChange":48.41211225997044,"threeYearPriceChange":105.83866837387963,"fiveYearPriceChange":154.36708860759492},{"product":"KDEV","productName":"Karolinska Development B","navCalculatedPerShare":5.682550428720482,"price":4.06,"thirtyDaysNavChange":-0.18116432442033537,"sixMonthNavChange":29.148873380010954,"oneYearNavChange":11.42255742589182,"threeYearNavChange":29.148873380010954,"fiveYearNavChange":95.95001478346492,"thirtyDaysPriceChange":0.4950495049504955,"sixMonthPriceChange":158.59872611464968,"oneYearPriceChange":65.71428571428568,"threeYearPriceChange":-41.159420289855085,"fiveYearPriceChange":-28.771929824561415},{"product":"KINV B","productName":"Kinnevik B","navCalculatedPerShare":267.8727784668765,"price":337.9,"thirtyDaysNavChange":2.230547759669932,"sixMonthNavChange":-37.018159128061804,"oneYearNavChange":-31.435500085603962,"threeYearNavChange":-6.303483553220534,"fiveYearNavChange":-5.009653025930305,"thirtyDaysPriceChange":11.702479338842963,"sixMonthPriceChange":-24.38178359628511,"oneYearPriceChange":-8.9709051724138,"threeYearPriceChange":36.195082627972575,"fiveYearPriceChange":49.91126885536823},{"product":"LATO B","productName":"Latour B","navCalculatedPerShare":197.32803721878398,"price":312.8,"thirtyDaysNavChange":6.001894341142666,"sixMonthNavChange":12.96575802510256,"oneYearNavChange":48.90755949339842,"threeYearNavChange":93.11818319906354,"fiveYearNavChange":146.66004652347996,"thirtyDaysPriceChange":18.89015583428353,"sixMonthPriceChange":19.617590822179732,"oneYearPriceChange":49.808429118773944,"threeYearPriceChange":181.80180180180182,"fiveYearPriceChange":276.9810183790299},{"product":"LINC","productName":"Linc","navCalculatedPerShare":56.98926626986665,"price":83.6,"thirtyDaysNavChange":-5.661596382598955,"sixMonthNavChange":0.0,"oneYearNavChange":0.0,"threeYearNavChange":0.0,"fiveYearNavChange":0.0,"thirtyDaysPriceChange":-6.067415730337089,"sixMonthPriceChange":0.0,"oneYearPriceChange":0.0,"threeYearPriceChange":0.0,"fiveYearPriceChange":0.0},{"product":"LUND B","productName":"Lundbergföretagen B","navCalculatedPerShare":498.4276727129032,"price":497.9,"thirtyDaysNavChange":4.2771327273882775,"sixMonthNavChange":-0.5566981000654558,"oneYearNavChange":27.223521889772506,"threeYearNavChange":65.91080291086524,"fiveYearNavChange":97.78875901305682,"thirtyDaysPriceChange":3.750781412794324,"sixMonthPriceChange":2.112387202625099,"oneYearPriceChange":23.487103174603163,"threeYearPriceChange":76.68559261887862,"fiveYearPriceChange":71.6896551724138},{"product":"NAXS","productName":"NAXS","navCalculatedPerShare":68.49000077365014,"price":58.2,"thirtyDaysNavChange":4.3100840471195,"sixMonthNavChange":8.653799306717879,"oneYearNavChange":13.057113957071852,"threeYearNavChange":9.91815501012081,"fiveYearNavChange":26.388634016700752,"thirtyDaysPriceChange":3.928571428571437,"sixMonthPriceChange":6.593406593406592,"oneYearPriceChange":26.521739130434785,"threeYearPriceChange":18.775510204081634,"fiveYearPriceChange":21.250000000000014},{"product":"SPILTAN","productName":"Spiltan","navCalculatedPerShare":208.82,"price":229.0,"thirtyDaysNavChange":1.030254767934391,"sixMonthNavChange":-8.057300145671276,"oneYearNavChange":-16.890919113614842,"threeYearNavChange":49.552388455203044,"fiveYearNavChange":224.7084434769087,"thirtyDaysPriceChange":14.500000000000002,"sixMonthPriceChange":20.52631578947368,"oneYearPriceChange":23.118279569892476,"threeYearPriceChange":141.05263157894737,"fiveYearPriceChange":387.2340425531915},{"product":"SVOL B","productName":"Svolder B","navCalculatedPerShare":288.88377775390626,"price":354.6,"thirtyDaysNavChange":13.561028067375581,"sixMonthNavChange":32.50196375184928,"oneYearNavChange":96.95811962613976,"threeYearNavChange":177.50958394343402,"fiveYearNavChange":233.96968526463152,"thirtyDaysPriceChange":32.511210762331835,"sixMonthPriceChange":38.7323943661972,"oneYearPriceChange":125.00000000000004,"threeYearPriceChange":256.84814330280767,"fiveYearPriceChange":292.9085872576178},{"product":"TRAC B","productName":"Traction  B","navCalculatedPerShare":268.3649091082552,"price":241.0,"thirtyDaysNavChange":8.89492838221484,"sixMonthNavChange":12.28657284864234,"oneYearNavChange":46.83009206816027,"threeYearNavChange":39.51434715666873,"fiveYearNavChange":68.78296170330513,"thirtyDaysPriceChange":3.87931034482758,"sixMonthPriceChange":1.6877637130801704,"oneYearPriceChange":40.116279069767444,"threeYearPriceChange":41.76470588235295,"fiveYearPriceChange":57.51633986928104},{"product":"VEFL SDB","productName":"VEF","navCalculatedPerShare":4.19,"price":6.04,"thirtyDaysNavChange":0.0,"sixMonthNavChange":-1.1792452830188593,"oneYearNavChange":33.015873015873034,"threeYearNavChange":40.6040268456376,"fiveYearNavChange":199.28571428571433,"thirtyDaysPriceChange":1.8549747048903997,"sixMonthPriceChange":51.0,"oneYearPriceChange":118.84057971014497,"threeYearPriceChange":226.48648648648648,"fiveYearPriceChange":316.55172413793105},{"product":"VNV","productName":"VNV Global","navCalculatedPerShare":121.8592416271134,"price":128.3,"thirtyDaysNavChange":0.5690841607467689,"sixMonthNavChange":15.09062896192297,"oneYearNavChange":34.32456016340672,"threeYearNavChange":28.856128808792757,"fiveYearNavChange":100.4923356813317,"thirtyDaysPriceChange":19.906542056074784,"sixMonthPriceChange":23.484119345524547,"oneYearPriceChange":67.93193717277488,"threeYearPriceChange":91.49253731343285,"fiveYearPriceChange":85.2707581227437},{"product":"ORES","productName":"Öresund","navCalculatedPerShare":146.7975709558335,"price":146.6,"thirtyDaysNavChange":2.645537774846418,"sixMonthNavChange":-1.9774055927093914,"oneYearNavChange":22.36260349308474,"threeYearNavChange":10.280063187243126,"fiveYearNavChange":19.347618663279253,"thirtyDaysPriceChange":1.947148817802491,"sixMonthPriceChange":-4.057591623036661,"oneYearPriceChange":22.986577181208045,"threeYearPriceChange":3.9716312056737646,"fiveYearPriceChange":1.982608695652166}]
---------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------
\BOLAGEN
BASEURL: 
ibindex.se/ibi//companies/
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//companies/getCompanies.req              |               |->     [{"product":"BURE","productName":"Bure Equity","indexWeight":5.466406647961071,"marketWeight":2.5431},{"product":"CRED A","productName":"Creades A","indexWeight":4.213734233531307,"marketWeight":0.9649},{"product":"FASTAT","productName":"Fastator","indexWeight":8.159464790488007,"marketWeight":0.1252},{"product":"HAV B","productName":"Havsfrun Investment B","indexWeight":0.23882108515277398,"marketWeight":0.0198},{"product":"INDU C","productName":"Industrivärden C","indexWeight":7.7425795806529765,"marketWeight":10.6292},{"product":"INVE B","productName":"Investor B","indexWeight":8.0042814392779,"marketWeight":52.3434},{"product":"KDEV","productName":"Karolinska Development B","indexWeight":9.379802865465232,"marketWeight":0.0599},{"product":"KINV B","productName":"Kinnevik B","indexWeight":5.55142442734767,"marketWeight":7.9378},{"product":"LATO B","productName":"Latour B","indexWeight":3.002356850199813,"marketWeight":15.7032},{"product":"LINC","productName":"Linc","indexWeight":4.809336147483615,"marketWeight":0.4104},{"product":"LUND B","productName":"Lundbergföretagen B","indexWeight":7.8269615510557475,"marketWeight":6.4156},{"product":"NAXS","productName":"NAXS","indexWeight":8.378404368436808,"marketWeight":0.055},{"product":"SVOL B","productName":"Svolder B","indexWeight":5.505203098695396,"marketWeight":0.7764},{"product":"TRAC B","productName":"Traction  B","indexWeight":7.6295313073016064,"marketWeight":0.2901},{"product":"VNV","productName":"VNV Global","indexWeight":6.939165954600251,"marketWeight":1.1609},{"product":"ORES","productName":"Öresund","indexWeight":7.152525652349821,"marketWeight":0.5649}]
---------------------------------------------------------------------------------------------------
\BURE
BASEURL: 
ibindex.se/ibi//company/
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getPrice.req                    |  "BURE"       |->     {"product":"BURE","price":404.6,"previousPrice":398.2,"priceChange":1.6072325464590698,"timestamp":1635790490000}
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getAbout.req                    |  "BURE"       |->     {"product":"BURE","productName":"Bure Equity","about":"&quot;Bure är en långsiktig huvudägare av rörelsedrivande verksamheter. Vi stödjer våra portföljbolag med \r\nvärdeökande initiativ och aktiviteter. Vår målsättning är att vara en lönsam investering för våra \r\naktieägare och ett konkurrenskraftigt investeringsalternativ på marknaden.&quot; <span class=\"bold\" style=\"font-size: 10pt;\">- bure.se</span>"}
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getCompanyName.req              |  "BURE"       |->     "Bure Equity"
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getChartDataPercent.req         | {"product":"BURE","interval":"30_DAYS"} |->     [{"date":1632182400000,"ibiIndexPrice":0.0,"omxIndexPrice":0.0,"productPrice":0.0,"product":"BURE"},{"date":1632268800000,"ibiIndexPrice":0.28,"omxIndexPrice":1.07,"productPrice":0.05,"product":"BURE"},{"date":1632355200000,"ibiIndexPrice":2.42,"omxIndexPrice":2.77,"productPrice":2.77,"product":"BURE"},{"date":1632441600000,"ibiIndexPrice":1.23,"omxIndexPrice":1.69,"productPrice":1.55,"product":"BURE"},{"date":1632700800000,"ibiIndexPrice":0.32,"omxIndexPrice":1.28,"productPrice":-0.59,"product":"BURE"},{"date":1632787200000,"ibiIndexPrice":-2.45,"omxIndexPrice":-0.92,"productPrice":-3.47,"product":"BURE"},{"date":1632873600000,"ibiIndexPrice":-2.29,"omxIndexPrice":-0.85,"productPrice":-4.16,"product":"BURE"},{"date":1632960000000,"ibiIndexPrice":-1.22,"omxIndexPrice":-0.69,"productPrice":-3.09,"product":"BURE"},{"date":1633046400000,"ibiIndexPrice":-1.12,"omxIndexPrice":-0.91,"productPrice":-3.52,"product":"BURE"},{"date":1633305600000,"ibiIndexPrice":-1.54,"omxIndexPrice":-1.83,"productPrice":-5.87,"product":"BURE"},{"date":1633392000000,"ibiIndexPrice":-1.03,"omxIndexPrice":-0.88,"productPrice":-4.27,"product":"BURE"},{"date":1633478400000,"ibiIndexPrice":-2.33,"omxIndexPrice":-2.37,"productPrice":-5.28,"product":"BURE"},{"date":1633564800000,"ibiIndexPrice":-0.86,"omxIndexPrice":-0.75,"productPrice":-3.84,"product":"BURE"},{"date":1633651200000,"ibiIndexPrice":-2.19,"omxIndexPrice":-1.52,"productPrice":-4.86,"product":"BURE"},{"date":1633910400000,"ibiIndexPrice":-3.24,"omxIndexPrice":-1.82,"productPrice":-6.46,"product":"BURE"},{"date":1633996800000,"ibiIndexPrice":-1.6,"omxIndexPrice":-1.05,"productPrice":-4.0,"product":"BURE"},{"date":1634083200000,"ibiIndexPrice":0.48,"omxIndexPrice":0.09,"productPrice":-0.59,"product":"BURE"},{"date":1634169600000,"ibiIndexPrice":1.92,"omxIndexPrice":0.96,"productPrice":0.16,"product":"BURE"},{"date":1634256000000,"ibiIndexPrice":2.55,"omxIndexPrice":1.76,"productPrice":2.03,"product":"BURE"},{"date":1634515200000,"ibiIndexPrice":2.67,"omxIndexPrice":1.62,"productPrice":4.32,"product":"BURE"},{"date":1634601600000,"ibiIndexPrice":3.3,"omxIndexPrice":2.28,"productPrice":4.7,"product":"BURE"},{"date":1634688000000,"ibiIndexPrice":3.93,"omxIndexPrice":2.26,"productPrice":4.43,"product":"BURE"},{"date":1634774400000,"ibiIndexPrice":5.63,"omxIndexPrice":2.21,"productPrice":6.46,"product":"BURE"},{"date":1634860800000,"ibiIndexPrice":7.22,"omxIndexPrice":3.25,"productPrice":6.99,"product":"BURE"},{"date":1635120000000,"ibiIndexPrice":6.6,"omxIndexPrice":2.43,"productPrice":6.62,"product":"BURE"},{"date":1635206400000,"ibiIndexPrice":6.95,"omxIndexPrice":3.05,"productPrice":8.27,"product":"BURE"},{"date":1635292800000,"ibiIndexPrice":8.11,"omxIndexPrice":2.12,"productPrice":5.76,"product":"BURE"},{"date":1635379200000,"ibiIndexPrice":7.97,"omxIndexPrice":1.69,"productPrice":8.0,"product":"BURE"},{"date":1635465600000,"ibiIndexPrice":7.03,"omxIndexPrice":0.7,"productPrice":6.24,"product":"BURE"},{"date":1635724800000,"ibiIndexPrice":7.22,"omxIndexPrice":1.2,"productPrice":7.95,"product":"BURE"}]
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getChartDataPrice.req           | {"product":"BURE","interval":"30_DAYS"} |-> [{"product":"BURE","date":1632182400000,"productPrice":374.8,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":329.4913893093416},{"product":"BURE","date":1632268800000,"productPrice":375.0,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":325.0592712582091},{"product":"BURE","date":1632355200000,"productPrice":385.2,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":330.4777485487226},{"product":"BURE","date":1632441600000,"productPrice":380.6,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":327.29997744613024},{"product":"BURE","date":1632700800000,"productPrice":372.6,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":309.8590315881087},{"product":"BURE","date":1632787200000,"productPrice":361.8,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":305.9995874204945},{"product":"BURE","date":1632873600000,"productPrice":359.2,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":303.35812005868723},{"product":"BURE","date":1632960000000,"productPrice":363.2,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":305.89709531026915},{"product":"BURE","date":1633046400000,"productPrice":361.6,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":304.4268965369445},{"product":"BURE","date":1633305600000,"productPrice":352.8,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":299.9817889889184},{"product":"BURE","date":1633392000000,"productPrice":358.8,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":303.19339385515417},{"product":"BURE","date":1633478400000,"productPrice":355.0,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":300.5155354987701},{"product":"BURE","date":1633564800000,"productPrice":360.4,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":303.04651760657737},{"product":"BURE","date":1633651200000,"productPrice":356.6,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":299.78616206598787},{"product":"BURE","date":1633910400000,"productPrice":350.6,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":298.09231771201934},{"product":"BURE","date":1633996800000,"productPrice":359.8,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":298.78306295820425},{"product":"BURE","date":1634083200000,"productPrice":372.6,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":306.3842198288989},{"product":"BURE","date":1634169600000,"productPrice":375.4,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":314.1182000868249},{"product":"BURE","date":1634256000000,"productPrice":382.4,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":315.1984225292376},{"product":"BURE","date":1634515200000,"productPrice":391.0,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":319.81331116230706},{"product":"BURE","date":1634601600000,"productPrice":392.4,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":319.7311388803319},{"product":"BURE","date":1634688000000,"productPrice":391.4,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":322.0540644931163},{"product":"BURE","date":1634774400000,"productPrice":399.0,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":315.1382036295209},{"product":"BURE","date":1634860800000,"productPrice":401.0,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":316.5663590912966},{"product":"BURE","date":1635120000000,"productPrice":399.6,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":316.89068086724734},{"product":"BURE","date":1635206400000,"productPrice":405.8,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":319.26953783286564},{"product":"BURE","date":1635292800000,"productPrice":396.4,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":316.7874085654885},{"product":"BURE","date":1635379200000,"productPrice":404.8,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":320.4492374133782},{"product":"BURE","date":1635465600000,"productPrice":398.2,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":321.59484419589046},{"product":"BURE","date":1635724800000,"productPrice":404.6,"netAssetValuePrice":323.8,"netAssetValueCalculatedPrice":320.20047852425324}]
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getHoldingsDate.req             |  "BURE"       |->    1625011200000 
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getNetAssetValue.req            |  "BURE"       |->    {"product":"BURE","netAssetValue":323.8,"netAssetValueCalculated":320.20047852425324,"netAssetValueChangeDate":1629331200000}
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getHoldings.req                 |  "BURE"       |->    [{"holdingProduct":"1","holdingName":"Allgon","holdingValue":7.35E8,"holdingValuePrevious":7.35E8,"listed":false},{"holdingProduct":"2","holdingName":"Atle Investment Management","holdingValue":1.93E8,"holdingValuePrevious":1.93E8,"listed":false},{"holdingProduct":"3","holdingName":"Bure Growth","holdingValue":1.293E9,"holdingValuePrevious":1.293E9,"listed":false},{"holdingProduct":"4","holdingName":"Investment AB Bure","holdingValue":1.78E8,"holdingValuePrevious":1.78E8,"listed":false},{"holdingProduct":"5","holdingName":"Mercuri International Group","holdingValue":1.28E8,"holdingValuePrevious":1.28E8,"listed":false},{"holdingProduct":"6","holdingName":"Vitrolife - Emission","holdingValue":-4.01E7,"holdingValuePrevious":-4.01E7,"listed":false},{"holdingProduct":"7","holdingName":"Likvida medel och Övriga tillgångar","holdingValue":6.46E8,"holdingValuePrevious":6.46E8,"listed":false},{"holdingProduct":"ACQ SPAC","holdingName":"ACQ Bure SPAC","holdingValue":7.154E8,"holdingValuePrevious":7.28E8,"listed":true},{"holdingProduct":"CCC","holdingName":"Cavotec","holdingValue":7.666114275E8,"holdingValuePrevious":7.700185894000001E8,"listed":true},{"holdingProduct":"MCAP","holdingName":"MedCap","holdingValue":2.803597898E8,"holdingValuePrevious":2.812034E8,"listed":true},{"holdingProduct":"MNTC","holdingName":"Mentice","holdingValue":4.29998962E8,"holdingValuePrevious":3.93558372E8,"listed":true},{"holdingProduct":"MYCR","holdingName":"Mycronic","holdingValue":5.416072145400001E9,"holdingValuePrevious":5.242378869599999E9,"listed":true},{"holdingProduct":"OVZON","holdingName":"Ovzon","holdingValue":2.665141306E8,"holdingValuePrevious":2.612780966E8,"listed":true},{"holdingProduct":"VITR","holdingName":"Vitrolife","holdingValue":1.121034047E10,"holdingValuePrevious":1.1561956315E10,"listed":true},{"holdingProduct":"XVIVO","holdingName":"Xvivo Perfusion","holdingValue":1.52368266E9,"holdingValuePrevious":1.473973864E9,"listed":true}]
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getCurrentRebatePremium.req     |  "BURE"       |->    {"rebatePremium":-24.95367510809141,"calculatedRebatePremium":-26.35833708454438}
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getRebatePremiums.req           |  "BURE"       |->    [{"rebatePremium":-24.95367510809141,"calculatedRebatePremium":-26.35833708454438,"rebatePremiumMax":-24.95367510809141,"rebatePremiumMin":-24.95367510809141,"rebatePremiumAverage":-24.95367510809141,"calculatedRebatePremiumMax":-26.35833708454438,"calculatedRebatePremiumMin":-26.35833708454438,"calculatedRebatePremiumAverage":-26.35833708454438,"label":"Nuvarande"},{"rebatePremiumMax":-8.27671402100063,"rebatePremiumMin":-25.3242742433601,"rebatePremiumAverage":-16.76549310273831,"calculatedRebatePremiumMax":-13.751075797650225,"calculatedRebatePremiumMin":-27.10263646024138,"calculatedRebatePremiumAverage":-20.78111162281731,"label":"30 dagar"},{"rebatePremiumMax":-8.27671402100063,"rebatePremiumMin":-76.94272163443998,"rebatePremiumAverage":-28.16749106505665,"calculatedRebatePremiumMax":-13.751075797650225,"calculatedRebatePremiumMin":-46.22958546231914,"calculatedRebatePremiumAverage":-23.181283825197116,"label":"3 månader"},{"rebatePremiumMax":-8.27671402100063,"rebatePremiumMin":-76.94272163443998,"rebatePremiumAverage":-34.996006853350536,"calculatedRebatePremiumMax":-13.751075797650225,"calculatedRebatePremiumMin":-46.22958546231914,"calculatedRebatePremiumAverage":-28.52202981827912,"label":"6 månader"},{"rebatePremiumMax":-2.468636179684336,"rebatePremiumMin":-76.94272163443998,"rebatePremiumAverage":-31.69721940383698,"calculatedRebatePremiumMax":-7.151113228294648,"calculatedRebatePremiumMin":-46.22958546231914,"calculatedRebatePremiumAverage":-25.611705322759757,"label":"1 år"},{"rebatePremiumMax":31.62666666666667,"rebatePremiumMin":-76.94272163443998,"rebatePremiumAverage":-12.316805572153768,"calculatedRebatePremiumMax":24.05287946195577,"calculatedRebatePremiumMin":-46.22958546231914,"calculatedRebatePremiumAverage":-9.288548869382435,"label":"3 år"},{"rebatePremiumMax":31.62666666666667,"rebatePremiumMin":-76.94272163443998,"rebatePremiumAverage":-3.509984845212191,"calculatedRebatePremiumMax":24.05287946195577,"calculatedRebatePremiumMin":-46.22958546231914,"calculatedRebatePremiumAverage":-1.0219426692943137,"label":"5 år"}]
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getRelativePrice.req            |  "BURE"       |->    [{"relativePrice":386.7416973831735,"relativePriceDifference":-4.413816761449951,"label":"30 dagar"},{"relativePrice":394.4270602605997,"relativePriceDifference":-2.5143202519526175,"label":"3 månader"},{"relativePrice":411.8689440544459,"relativePriceDifference":1.7965753965511144,"label":"6 månader"},{"relativePrice":402.2092815259516,"relativePriceDifference":-0.5908844473673791,"label":"1 år"},{"relativePrice":349.942456451975,"relativePriceDifference":-13.50903201879018,"label":"3 år"},{"relativePrice":323.4727438415772,"relativePriceDifference":-20.051224952650227,"label":"5 år"}]
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//company/getEvents.req                   |  "BURE"       |->    [{"product":"BURE","productName":"Bure Equity","eventDate":1604534400000,"eventType":"THIRD_QUARTER_EARNINGS_RESULTS","eventName":"Q3 Rapport","eventDetails":""},{"product":"BURE","productName":"Bure Equity","eventDate":1614211200000,"eventType":"FOURTH_QUARTER_EARNINGS_RESULTS","eventName":"Q4 Rapport","eventDetails":""},{"product":"BURE","productName":"Bure Equity","eventDate":1618272000000,"eventType":"ANNUAL_REPORT","eventName":"Årsredovisning","eventDetails":""},{"product":"BURE","productName":"Bure Equity","eventDate":1619481600000,"eventType":"FIRST_QUARTER_EARNINGS_RESULTS","eventName":"Q1 Rapport","eventDetails":""},{"product":"BURE","productName":"Bure Equity","eventDate":1620259200000,"eventType":"GENERAL_MEETING","eventName":"Årsstämma","eventDetails":""},{"product":"BURE","productName":"Bure Equity","eventDate":1620345600000,"eventType":"DIVIDEND","eventName":"Utdelning (X-dag)","eventDetails":"2 SEK"},{"product":"BURE","productName":"Bure Equity","eventDate":1629331200000,"eventType":"SECOND_QUARTER_EARNINGS_RESULTS","eventName":"Q2 Rapport","eventDetails":""},{"product":"BURE","productName":"Bure Equity","eventDate":1636588800000,"eventType":"THIRD_QUARTER_EARNINGS_RESULTS","eventName":"Q3 Rapport","eventDetails":""},{"product":"BURE","productName":"Bure Equity","eventDate":1645660800000,"eventType":"FOURTH_QUARTER_EARNINGS_RESULTS","eventName":"Q4 Rapport","eventDetails":""},{"product":"BURE","productName":"Bure Equity","eventDate":1651536000000,"eventType":"GENERAL_MEETING","eventName":"Årsstämma","eventDetails":""}]
---------------------------------------------------------------------------------------------------
\SPILTAN
BASEURL: 
ibindex.se/ibi//spiltan/
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//spiltan/getPrice.req                                    |->     {"product":"SPILTAN","price":229.0,"previousPrice":229.0,"priceChange":0.0,"timestamp":1635785268000}
ibindex.se/ibi//spiltan/getChartDataPercent.req         | {"interval":"30_DAYS"}    |->     [{"date":1632182400000,"ibiIndexPrice":0.0,"omxIndexPrice":0.0,"productPrice":0.0,"product":"SPILTAN"},{"date":1632268800000,"ibiIndexPrice":0.28,"omxIndexPrice":1.07,"productPrice":0.0,"product":"SPILTAN"},{"date":1632355200000,"ibiIndexPrice":2.42,"omxIndexPrice":2.77,"productPrice":0.0,"product":"SPILTAN"},{"date":1632441600000,"ibiIndexPrice":1.23,"omxIndexPrice":1.69,"productPrice":0.0,"product":"SPILTAN"},{"date":1632700800000,"ibiIndexPrice":0.32,"omxIndexPrice":1.28,"productPrice":0.0,"product":"SPILTAN"},{"date":1632787200000,"ibiIndexPrice":-2.45,"omxIndexPrice":-0.92,"productPrice":0.0,"product":"SPILTAN"},{"date":1632873600000,"ibiIndexPrice":-2.29,"omxIndexPrice":-0.85,"productPrice":0.0,"product":"SPILTAN"},{"date":1632960000000,"ibiIndexPrice":-1.22,"omxIndexPrice":-0.69,"productPrice":0.0,"product":"SPILTAN"},{"date":1633046400000,"ibiIndexPrice":-1.12,"omxIndexPrice":-0.91,"productPrice":0.0,"product":"SPILTAN"},{"date":1633305600000,"ibiIndexPrice":-1.54,"omxIndexPrice":-1.83,"productPrice":0.0,"product":"SPILTAN"},{"date":1633392000000,"ibiIndexPrice":-1.03,"omxIndexPrice":-0.88,"productPrice":0.0,"product":"SPILTAN"},{"date":1633478400000,"ibiIndexPrice":-2.33,"omxIndexPrice":-2.37,"productPrice":0.0,"product":"SPILTAN"},{"date":1633564800000,"ibiIndexPrice":-0.86,"omxIndexPrice":-0.75,"productPrice":0.0,"product":"SPILTAN"},{"date":1633651200000,"ibiIndexPrice":-2.19,"omxIndexPrice":-1.52,"productPrice":0.0,"product":"SPILTAN"},{"date":1633910400000,"ibiIndexPrice":-3.24,"omxIndexPrice":-1.82,"productPrice":0.0,"product":"SPILTAN"},{"date":1633996800000,"ibiIndexPrice":-1.6,"omxIndexPrice":-1.05,"productPrice":0.0,"product":"SPILTAN"},{"date":1634083200000,"ibiIndexPrice":0.48,"omxIndexPrice":0.09,"productPrice":0.0,"product":"SPILTAN"},{"date":1634169600000,"ibiIndexPrice":1.92,"omxIndexPrice":0.96,"productPrice":0.0,"product":"SPILTAN"},{"date":1634256000000,"ibiIndexPrice":2.55,"omxIndexPrice":1.76,"productPrice":0.0,"product":"SPILTAN"},{"date":1634515200000,"ibiIndexPrice":2.67,"omxIndexPrice":1.62,"productPrice":0.0,"product":"SPILTAN"},{"date":1634601600000,"ibiIndexPrice":3.3,"omxIndexPrice":2.28,"productPrice":0.0,"product":"SPILTAN"},{"date":1634688000000,"ibiIndexPrice":3.93,"omxIndexPrice":2.26,"productPrice":0.0,"product":"SPILTAN"},{"date":1634774400000,"ibiIndexPrice":5.63,"omxIndexPrice":2.21,"productPrice":0.0,"product":"SPILTAN"},{"date":1634860800000,"ibiIndexPrice":7.22,"omxIndexPrice":3.25,"productPrice":0.0,"product":"SPILTAN"},{"date":1635120000000,"ibiIndexPrice":6.6,"omxIndexPrice":2.43,"productPrice":0.0,"product":"SPILTAN"},{"date":1635206400000,"ibiIndexPrice":6.95,"omxIndexPrice":3.05,"productPrice":14.5,"product":"SPILTAN"},{"date":1635292800000,"ibiIndexPrice":8.11,"omxIndexPrice":2.12,"productPrice":14.5,"product":"SPILTAN"},{"date":1635379200000,"ibiIndexPrice":7.97,"omxIndexPrice":1.69,"productPrice":14.5,"product":"SPILTAN"},{"date":1635465600000,"ibiIndexPrice":7.03,"omxIndexPrice":0.7,"productPrice":14.5,"product":"SPILTAN"},{"date":1635724800000,"ibiIndexPrice":7.22,"omxIndexPrice":1.2,"productPrice":14.5,"product":"SPILTAN"}]
ibindex.se/ibi//spiltan/getChartDataPrice.req           | {"interval":"30_DAYS"}    |->     [{"product":"SPILTAN","date":1632182400000,"productPrice":200.0,"netAssetValuePrice":236.9,"netAssetValueCalculatedPrice":209.62479363547018},{"product":"SPILTAN","date":1632268800000,"productPrice":200.0,"netAssetValuePrice":236.9,"netAssetValueCalculatedPrice":212.88697566521208},{"product":"SPILTAN","date":1632355200000,"productPrice":200.0,"netAssetValuePrice":236.9,"netAssetValueCalculatedPrice":215.5624166457777},{"product":"SPILTAN","date":1632441600000,"productPrice":200.0,"netAssetValuePrice":236.9,"netAssetValueCalculatedPrice":214.99134516969826},{"product":"SPILTAN","date":1632700800000,"productPrice":200.0,"netAssetValuePrice":236.9,"netAssetValueCalculatedPrice":213.72920977288766},{"product":"SPILTAN","date":1632787200000,"productPrice":200.0,"netAssetValuePrice":236.9,"netAssetValueCalculatedPrice":211.49297921770926},{"product":"SPILTAN","date":1632873600000,"productPrice":200.0,"netAssetValuePrice":236.9,"netAssetValueCalculatedPrice":207.98155565416562},{"product":"SPILTAN","date":1632960000000,"productPrice":200.0,"netAssetValuePrice":236.9,"netAssetValueCalculatedPrice":209.95102751553145},{"product":"SPILTAN","date":1633046400000,"productPrice":200.0,"netAssetValuePrice":236.9,"netAssetValueCalculatedPrice":205.897575192017},{"product":"SPILTAN","date":1633305600000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":206.6905606440939},{"product":"SPILTAN","date":1633392000000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":208.68617027167187},{"product":"SPILTAN","date":1633478400000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":206.54306590831717},{"product":"SPILTAN","date":1633564800000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":204.58583431653935},{"product":"SPILTAN","date":1633651200000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":205.64828075889528},{"product":"SPILTAN","date":1633910400000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":203.15419096607158},{"product":"SPILTAN","date":1633996800000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":203.31658166303373},{"product":"SPILTAN","date":1634083200000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":204.575158284838},{"product":"SPILTAN","date":1634169600000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":208.28812704131886},{"product":"SPILTAN","date":1634256000000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":207.18665882404716},{"product":"SPILTAN","date":1634515200000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":207.0353670350808},{"product":"SPILTAN","date":1634601600000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":211.2912516747209},{"product":"SPILTAN","date":1634688000000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":209.992163804997},{"product":"SPILTAN","date":1634774400000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":210.43818019846927},{"product":"SPILTAN","date":1634860800000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":211.54407210507273},{"product":"SPILTAN","date":1635120000000,"productPrice":200.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":211.21736469969332},{"product":"SPILTAN","date":1635206400000,"productPrice":229.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":207.01},{"product":"SPILTAN","date":1635292800000,"productPrice":229.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":206.14},{"product":"SPILTAN","date":1635379200000,"productPrice":229.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":206.72},{"product":"SPILTAN","date":1635465600000,"productPrice":229.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":206.11},{"product":"SPILTAN","date":1635724800000,"productPrice":229.0,"netAssetValuePrice":208.71,"netAssetValueCalculatedPrice":208.82}]
ibindex.se/ibi//spiltan/getHoldingsDate.req
ibindex.se/ibi//spiltan/getNetAssetValue.req
ibindex.se/ibi//spiltan/getHoldings.req                                 |->     [{"holdingProduct":"1","holdingName":"Amhult 2","holdingValue":5.3E7,"holdingValuePrevious":5.3E7,"listed":false},{"holdingProduct":"2","holdingName":"Berkshire Hathaway (justerat 2021-11-01)","holdingValue":1.8389708085E8,"holdingValuePrevious":1.8389708085E8,"listed":false},{"holdingProduct":"3","holdingName":"KlaraBo","holdingValue":3.97E8,"holdingValuePrevious":3.97E8,"listed":false},{"holdingProduct":"5","holdingName":"P&E Fastigheter","holdingValue":2.45E8,"holdingValuePrevious":2.45E8,"listed":false},{"holdingProduct":"6","holdingName":"Spiltan Fonder","holdingValue":4.8E8,"holdingValuePrevious":4.8E8,"listed":false},{"holdingProduct":"7","holdingName":"Övriga noterade","holdingValue":4.07E8,"holdingValuePrevious":4.07E8,"listed":false},{"holdingProduct":"8","holdingName":"Övriga onoterade","holdingValue":7.02E8,"holdingValuePrevious":7.02E8,"listed":false},{"holdingProduct":"9","holdingName":"Kassa","holdingValue":5.36E8,"holdingValuePrevious":5.36E8,"listed":false},{"holdingProduct":"AJA B","holdingName":"Byggmästare A J Ahlström H","holdingValue":1.64066916E8,"holdingValuePrevious":1.685619E8,"listed":true},{"holdingProduct":"ALCA","holdingName":"Alcadon Group","holdingValue":1.75943981E8,"holdingValuePrevious":1.7015341960000002E8,"listed":true},{"holdingProduct":"BONAS","holdingName":"Bonäsudden Holding","holdingValue":1.03310426E8,"holdingValuePrevious":1.07172498E8,"listed":true},{"holdingProduct":"IDUN B","holdingName":"Idun Industrier B","holdingValue":1.00141108E8,"holdingValuePrevious":1.00484057E8,"listed":true},{"holdingProduct":"INSTAL","holdingName":"Instalco","holdingValue":9.25385634E7,"holdingValuePrevious":9.0626445E7,"listed":true},{"holdingProduct":"PDX","holdingName":"Paradox Interactive","holdingValue":2.3032400017000003E9,"holdingValuePrevious":2.227231314E9,"listed":true},{"holdingProduct":"SECARE","holdingName":"Swedencare","holdingValue":7.90041E7,"holdingValuePrevious":7.8284875E7,"listed":true},{"holdingProduct":"SLITE","holdingName":"Slitevind","holdingValue":5.60405222E7,"holdingValuePrevious":5.6486468E7,"listed":true},{"holdingProduct":"TEQ","holdingName":"Teqnion","holdingValue":2.54907324E8,"holdingValuePrevious":2.4234147E8,"listed":true},{"holdingProduct":"TRAIN B","holdingName":"Train Alliance Sweden B","holdingValue":1.5250695E8,"holdingValuePrevious":1.5311697779999998E8,"listed":true}]
ibindex.se/ibi//spiltan/getCurrentRebatePremium.req
ibindex.se/ibi//spiltan/getRebatePremiums.req
ibindex.se/ibi//spiltan/getRelativePrice.req
---------------------------------------------------------------------------------------------------
\FLAT CAPITAL
BASEURL: 
ibindex.se/ibi//flatcapital/
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//flatcapital/getPrice.req
...
---------------------------------------------------------------------------------------------------
\Byggmästare Anders Ahlström Holding AB
BASEURL: 
ibindex.se/ibi//aja/
---------------------------------------------------------------------------------------------------
...
---------------------------------------------------------------------------------------------------
\VEF
BASEURL: 
ibindex.se/ibi//vef/
---------------------------------------------------------------------------------------------------
ibindex.se/ibi//vef/getHoldings.req
...
---------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------


---------------------------------------------------------------------------------------------------




*/
