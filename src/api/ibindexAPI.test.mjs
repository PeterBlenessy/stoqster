import { ibindex, ibiRequestOptions } from './ibindexAPI';
import { ResponseType } from "@tauri-apps/api/http";

describe('ibindexAPI', () => {
    test('ibiRequestOptions should return correct URL and options for getCompanies', () => {
        const { url, options } = ibiRequestOptions('getCompanies');
        expect(url).toBe('https://ibindex.se/ibi//index/getProducts.req');
        expect(options.method).toBe('post');
        expect(options.responseType).toBe(ResponseType.JSON);
        expect(options.headers).toEqual({
            'Content-Type': 'application/json;charset=UTF-8'
        });
    });

    test('ibindex.getCompanies should have correct properties', () => {
        expect(ibindex.getCompanies.title).toBe('Ibindex: Rapporterade och beräknade värden');
        expect(ibindex.getCompanies.url).toBe('https://ibindex.se/ibi//index/getProducts.req');
        expect(ibindex.getCompanies.fields).toEqual([
            'productName', 'product', 'netAssetValue', 'netAssetValueCalculated', 'netAssetValueCalculatedRebatePremium', 'netAssetValueRebatePremium', 'netAssetValueChangeDate', 'price', 'previousPrice', 'priceChange'
        ]);
    });

    test('ibindex.getWeights should have correct properties', () => {
        expect(ibindex.getWeights.title).toBe('Ibindex: Index- och marknadsvikt');
        expect(ibindex.getWeights.url).toBe('https://ibindex.se/ibi//companies/getCompanies.req');
        expect(ibindex.getWeights.fields).toEqual([
            'product', 'productName', 'indexWeight', 'marketWeight'
        ]);
    });

    test('ibindex.getTrends should have correct properties', () => {
        expect(ibindex.getTrends.title).toBe('Ibindex: Trender - pris och substansvärde');
        expect(ibindex.getTrends.url).toBe('https://ibindex.se/ibi//index/getTrends.req');
        expect(ibindex.getTrends.fields).toEqual([
            "product", "productName", "price", "navCalculatedPerShare", "thirtyDaysPriceChange", "sixMonthPriceChange", "oneYearPriceChange", "threeYearPriceChange", "fiveYearPriceChange", "thirtyDaysNavChange", "sixMonthNavChange", "oneYearNavChange", "threeYearNavChange", "fiveYearNavChange"
        ]);
    });

    test('ibindex.getRebatePremiums should have correct properties', () => {
        expect(ibindex.getRebatePremiums.title).toBe('Rabatt & Premium över tid');
        expect(ibindex.getRebatePremiums.url).toBe('https://ibindex.se/ibi//company/getRebatePremiums.req');
        expect(ibindex.getRebatePremiums.fields).toEqual([
            'rebatePremium', 'calculatedRebatePremium', 'rebatePremiumMax', 'rebatePremiumMin', 'rebatePremiumAverage', 'calculatedRebatePremiumMax', 'calculatedRebatePremiumMin', 'calculatedRebatePremiumAverage', 'label'
        ]);
    });

    test('ibindex.getHoldings should have correct properties', () => {
        expect(ibindex.getHoldings.title).toBe('Bolagets innehav');
        expect(ibindex.getHoldings.url).toBe('https://ibindex.se/ibi//company/getHoldings.req');
        expect(ibindex.getHoldings.fields).toEqual([
            'holdingName', 'holdingProduct', 'holdingValue', 'holdingValuePrevious', 'listed'
        ]);
    });

    test('ibindex.getEvents should have correct properties', () => {
        expect(ibindex.getEvents.title).toBe('Kalender');
        expect(ibindex.getEvents.url).toBe('https://ibindex.se/ibi//company/getEvents.req');
        expect(ibindex.getEvents.fields).toEqual([
            'product', 'productName', 'eventDate', 'eventType', 'eventName', 'eventDetails'
        ]);
    });
});
