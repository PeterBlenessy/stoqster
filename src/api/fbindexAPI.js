import { ResponseType } from "@tauri-apps/api/http";

const baseUrl = 'https://www.fbindex.se';

const fbindex = {
    getCompanies: {
        title: 'Fbindex: Company Information',
        url: baseUrl + '/api/companies',
        fields: ['companyName', 'companyCode', 'netAssetValue', 'price', 'priceChange'],
        columns: [
            { name: 'companyName', label: 'Company Name', field: 'companyName', align: 'left', required: true, sortable: true },
            { name: 'companyCode', label: 'Company Code', field: 'companyCode', sortable: true },
            { name: 'netAssetValue', label: 'Net Asset Value', field: 'netAssetValue', sortable: true },
            { name: 'price', label: 'Price', field: 'price', sortable: true },
            { name: 'priceChange', label: 'Price Change', field: 'priceChange', sortable: true },
        ],
        visibleColumns: ['companyName', 'netAssetValue', 'price', 'priceChange'],
        localForageConfig: {
            storeName: 'fbindex-companies',
        },
    },
};

function fbindexRequestOptions(apiRequest) {
    return {
        url: fbindex[apiRequest].url,
        options: {
            method: 'get',
            responseType: ResponseType.JSON,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            }
        }
    };
}

export {
    fbindex,
    fbindexRequestOptions
};
