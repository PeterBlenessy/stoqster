import { fiFunds, fiDownload, funds, fundHoldings } from './fiAPI';
import { ResponseType } from "@tauri-apps/api/http";

describe('fiAPI', () => {
    test('fiFunds API should have correct URL and options', () => {
        expect(fiFunds.url).toBe('https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/');
        expect(fiFunds.options.method).toBe('get');
        expect(fiFunds.options.responseType).toBe(ResponseType.Text);
    });

    test('fiDownload API should have correct URL and options', () => {
        expect(fiDownload.url).toBe('https://www.fi.se');
        expect(fiDownload.options.method).toBe('get');
        expect(fiDownload.options.responseType).toBe('arraybuffer');
        expect(fiDownload.options.headers).toEqual({
            'Accept': 'application/zip',
            'Content-Type': 'application/zip'
        });
    });

    test('funds object should have correct properties', () => {
        expect(funds.title).toBe('FI: Information om fonder och innehav');
        expect(funds.localForageConfig.storeName).toBe('fi-funds');
        expect(funds.fields).toEqual([
            'Aktiv_risk', 
            'FinansiellaInstrument/FinansielltInstrument',
            'Fond_ISIN-kod', 'Fond_institutnummer', 'Fond_namn', 'Fondförmögenhet', 
            'Förvaltningsavgift/UtanAndelsklasser/Förvaltningsavgift_fast',
            'Jämförelseindex/Jämförelseindex',
            'Likvida_medel', 'Standardavvikelse_24_månader', 'Övriga_tillgångar_och_skulder'
        ]);
    });

    test('fundHoldings object should have correct properties', () => {
        expect(fundHoldings.title).toBe('Fondens innehav');
        expect(fundHoldings.localForageConfig.storeName).toBe('fi-funds-holdings');
        expect(fundHoldings.fields).toEqual([
            'Andel_av_fondförmögenhet_instrument', 'Antal', 'Bransch/Bransch_namn_instrument', 'Bransch/Branschkod_instrument', 'ISIN-kod_instrument', 'Instrumentnamn', 'Kurs_som_använts_vid_värdering_av_instrumentet', 
            'Landkod_Emittent', 'Marknadsvärde_instrument', 'Nominellt_belopp', 'Tillgångsslag_enligt_LVF_5_kap', 'Valuta', 'Valutakurs_instrument'
        ]);
    });
});
