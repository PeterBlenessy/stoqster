
const getStyle = (value) => {
    return (value < 0 ? 'color:red' : 'color:green')
}

const ibindex = {

    // IB companies and their reported and calculated net asset values and price
    getCompanies: {
        title: 'Ibindex: reported and calculated net asset values, rebate / premium, and price',
        url: 'https://ibindex.se/ibi//index/getProducts.req',
        fields: ['productName', 'product', 'netAssetValue', 'netAssetValueCalculated', 'netAssetValueCalculatedRebatePremium', 'netAssetValueRebatePremium', 'netAssetValueChangeDate', 'price', 'previousPrice', 'priceChange'],
        columns: [
            { name: 'productName', label: 'Investmentbolag', field: 'productName', align: 'left', required: true},
            { name: 'product', label: 'Aktiekod', name: 'product' },
            { name: 'netAssetValue', label: 'Substansvärde', field: 'netAssetValue', 
                format: val => `${val.toFixed(2)}`,
                style: val => ( parseFloat(val)<0 ? 'color:red' : 'color:primary') 
            },
            { name: 'netAssetValueCalculated', label: 'Beräknat substansvärde', field: 'netAssetValueCalculated',
                format: val => `${val.toFixed(2)}`
            },
            { name: 'netAssetValueCalculatedRebatePremium', label: 'Beräknad Rabatt/Premie', field: 'netAssetValueCalculatedRebatePremium',
                format: val => `${val.toFixed(2)}%`,
                style: val => getStyle(val.netAssetValueCalculatedRebatePremium),
                required: true
            },
            { name: 'netAssetValueRebatePremium', label: 'Rabatt/Premie', field: 'netAssetValueRebatePremium',
                format: val => `${val.toFixed(2)}%`,
                style: val => getStyle(val.netAssetValueRebatePremium),
                required: true
            },
            { name: 'netAssetValueChangeDate', label: 'Ändrat', field: 'netAssetValueChangeDate',
                format: val => `${new Date(val).toISOString().slice(0, 10)}`
            },
            { name: 'price', label: 'Pris', field: 'price',
                format: val => `${val.toFixed(2)}`
            },
            { name: 'previousPrice', label: 'Tidigare pris', field: 'previousPrice',
                format: val => `${val.toFixed(2)}`
            },
            { name: 'priceChange', label: 'Prisändring', field: 'priceChange',
                format: val => `${val.toFixed(2)}%`,
                style: val => getStyle(val.priceChange) 
            },
        ],
        visibleColumns: [ 
            'productName', 
            'netAssetValue', 'netAssetValueCalculated', 
            'netAssetValueRebatePremium', 'netAssetValueCalculatedRebatePremium',
            'netAssetValueChangeDate',
            'price', 'priceChange'
        ]
    },

    // Index and market weights of IB companies
    getWeights: {
        title: 'Ibindex: Index and market weights of ibindex companies',
        url: 'https://ibindex.se/ibi//companies/getCompanies.req',
        fields: ['product', 'productName', 'indexWeight', 'marketWeight'],
        columns: [
            { name: 'product', label: 'Aktiekod', field: 'product' },
            { name: 'productName', label: 'Bolag', field: 'productName', align: 'left', required: true },
            { name: 'indexWeight', label: 'Indexvikt', field: 'indexWeight', required: true,
              format: val => `${val.toFixed(2)}%`
            },
            { name: 'marketWeight', label: 'Marknadsvikt', field: 'marketWeight', required: true ,
              format: val => `${val.toFixed(2)}%`
            },
        ],
        visibleColumns: [ 'productName', 'indexWeight', 'marketWeight'],
    },

    getTrends: {
        title: 'Ibindex: Price and net asset value trends',
        url : 'https://ibindex.se/ibi//index/getTrends.req',
        fields : ["product", "productName", "price", "navCalculatedPerShare", "thirtyDaysPriceChange", "sixMonthPriceChange", "oneYearPriceChange", "threeYearPriceChange", "fiveYearPriceChange", "thirtyDaysNavChange", "sixMonthNavChange", "oneYearNavChange", "threeYearNavChange", "fiveYearNavChange"],
        header : ["IB-aktie", "Investmentbolag", "Pris", "Beräknat substansvärde", "30 dagar", "6 månader", "1 år", "3 år", "5 år", "30 dagar", "6 månader", "1 år", "3 år", "5 år"],
        columns: [
            { name: 'product', label: 'Aktie-id', type: 'string' },
            { name: 'productName', label: 'Bolag', align: 'start', width: '220px', type: 'string' },
            { name: 'price', label: 'Pris', type: 'currency' },
            { name: 'navCalculatedPerShare', label: 'Beräknat substansvärde', type: 'currency' },
            { name: 'thirtyDaysPriceChange', label: '30 dagar', type: 'percentage' },
            { name: 'sixMonthPriceChange', label: '6 månader', type: 'percentage' },
            { name: 'oneYearPriceChange', label: '1 år', type: 'percentage' },
            { name: 'threeYearPriceChange', label: '3 år', type: 'percentage' },
            { name: 'fiveYearPriceChange', label: '5 år', type: 'percentage' },
            { name: 'thirtyDaysNavChange', label: '30 dagar', type: 'percentage' },
            { name: 'sixMonthNavChange', label: '6 månader', type: 'percentage' },
            { name: 'oneYearNavChange', label: '1 år', type: 'percentage' },
            { name: 'threeYearNavChange', label: '3 år', type: 'percentage' },
            { name: 'fiveYearNavChange', label: '5 år', type: 'percentage' },
        ],
        payload : '',
    
    },

    // Holdings of an IB company
    getHoldings: {
        url: 'https://ibindex.se/ibi//company/getHoldings.req',
        fields : ["holdingProduct", "holdingName", "holdingValue", "holdingValuePrevious", "listed"],
        columns: [
            { name: 'holdingProduct', label: 'Aktie-id', type: 'string' },
            { name: 'holdingName', label: 'Bolag', align: 'start', width: '220px', type: 'string' },
            { name: 'holdingValue', label: 'Värde', type: 'currency' },
            { name: 'holdingValuePrevious', label: 'Tidigare värde', type: 'currency' },
            { name: 'listed', label: 'Noterat', type: 'boolean' },
        ],
        payload: (company) => JSON.stringify(company),
    },

    getNetAssetValue : {
        'url' : 'https://ibindex.se/ibi//company/getNetAssetValue.req',
        'header' : '[]',
        'fields' : '[]',
        payload: (company) => JSON.stringify(company),
      },

    // -----------------------------
    getSpecialHoldings: {
        'AJA B': 'https://ibindex.se/ibi//aja/getHoldings.req',
        'FLAT A': 'https://ibindex.se/ibi//flatcapital/getHoldings.req',
        'SPILTAN': 'https://ibindex.se/ibi//spiltan/getHoldings.req',
        'VEFL SDB': 'https://ibindex.se/ibi//vef/getHoldings.req',
    }
}

function ibiAxiosOptions(ibiRequest) {
    return {
                method: 'post',
                url: ibindex[ibiRequest].url,
                responseType: 'arraybuffer',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                }
            }
}

module.exports = {
    ibindex,
    ibiAxiosOptions,

}