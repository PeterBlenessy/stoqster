// Get color based on value being negative or positive
const setStyle = (number, ifNegative='red', ifPositive='green') => {
    if (number != 0) {
        return (number < 0 ? 'color:'+ifNegative : 'color:'+ifPositive)
    }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat
//const locale = new Intl.locale("se-SV", { language: 'sv'});
const formatter = new Intl.NumberFormat('sv-SE', {
//   style: 'currency',
//   currency: 'SEK',
//   currencyDisplay: 'code',
  //notation: 'compact',
  //compactDisplay: 'short',
  // These options are needed to round to whole numbers if that's what you want.
  //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

const isValidNumber = (val) => {
    return (val!=0 && val!='' && val!=' ' && typeof Number.parseFloat(val) === 'number' && isFinite(val));
}

const baseUrl = 'https://www.fi.se';

const fiFunds = {
    url: baseUrl + '/sv/vara-register/fondinnehav-per-kvartal/',
    options: {
        method: 'get',
        mode: 'cors'
    }
};

// Return an Axios options object for file download
const fiDownload = {
    url: baseUrl,
    options: {
        method: 'get',
        mode: 'no-cors',
        responseType: 'arraybuffer',
        headers: { 
            'Accept': 'application/zip', 
            'Content-Type': 'application/zip' 
        }
    }
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
    title: 'Quarterly reported funds and their holdings',
    url: '',
    localForageConfig: {
        storeName: 'fi-funds',
    },
    fields: [
        'Aktiv_risk', 
        'FinansiellaInstrument/FinansielltInstrument',
        'Fond_ISIN-kod', 'Fond_institutnummer', 'Fond_namn', 'Fondförmögenhet', 
        'Förvaltningsavgift/UtanAndelsklasser/Förvaltningsavgift_fast',
        'Jämförelseindex/Jämförelseindex',
        'Likvida_medel', 'Standardavvikelse_24_månader', 'Övriga_tillgångar_och_skulder'
    ],
    qTableConfig: {
        columns: [
            { name: 'Fond_namn', label: 'Fondnamn', field: 'Fond_namn', align: 'left', required: true, sortable: true },
            { name: 'Fond_ISIN-kod', label: 'ISIN-kod', field: 'Fond_ISIN-kod', align: 'left', required: false },
            { 
                name: 'Fondförmögenhet', label: 'Fondförmögenhet', field: 'Fondförmögenhet', align: 'right', required: false, sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: val => `${isValidNumber(val) ? formatter.format(val) : ''}`,
            },
            { 
                name: 'Jämförelseindex', label: 'Jämförelseindex', 
                field: (val) => val['Jämförelseindex']['Jämförelseindex'],
                align: 'left', required: false, sortable: true 
            },
            { 
                name: 'Likvida_medel', label: 'Likvida medel', field: 'Likvida_medel', align: 'right', required: false, sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: val => isValidNumber(val) ? formatter.format(val) : '',
                style: val => setStyle(val['Likvida_medel'], 'red', 'primary')
            },
            {
                name: 'Standardavvikelse_24_månader', label: 'Standardavvikelse 24 månader', field: 'Standardavvikelse_24_månader', align: 'right', required: false, sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: val => isValidNumber(val) ? Number.parseFloat(val) : ''
            },
            { 
                name: 'Övriga_tillgångar_och_skulder', label: 'Övriga tillgångar och skulder', field: 'Övriga_tillgångar_och_skulder', align: 'right', required: false, sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: val => isValidNumber(val) ? formatter.format(val) : '',
                style: val => setStyle(val['Övriga_tillgångar_och_skulder'], 'red', 'primary')
            },
        ],
        visibleColumns: ['Fond_namn', 'Fond_ISIN-kod', 'Fondförmögenhet', 'Likvida_medel', 'Standardavvikelse_24_månader', 'Övriga_tillgångar_och_skulder']
    }
};

/**
 * Fields
 *  - Bransch
 *      - Alt-1: Present if 'Tillgångsslag_enligt_LVF_5_kap' = 'ÖverlåtbartVärdepapper' or 'Fondandel' or 'Penningmarknadsinstrument'
 *      - Alt-2: Missing if 'Tillgångsslag_enligt_LVF_5_kap' = 'DerivatinstrumentSamtTeknikerOchInstrument'
 */
const fundHoldings = {
    title: 'Fund holdings',
    url: '',
    localForageConfig: {
        storeName: 'fi-funds-holdings',
    },
    fields: [ 'Andel_av_fondförmögenhet_instrument', 'Antal', 'Bransch/Bransch_namn_instrument', 'Bransch/Branschkod_instrument', 'ISIN-kod_instrument', 'Instrumentnamn', 'Kurs_som_använts_vid_värdering_av_instrumentet', 
        'Landkod_Emittent', 'Marknadsvärde_instrument', 'Nominellt_belopp', 'Tillgångsslag_enligt_LVF_5_kap', 'Valuta', 'Valutakurs_instrument' ],
    qTableConfig: {
        columns: [
            { name: 'Instrumentnamn', label: 'Instrumentnamn', field: 'Instrumentnamn', align: 'left', required: true, sortable: true },
            { name: 'ISIN-kod_instrument', label: 'ISIN-kod', field: 'ISIN-kod_instrument', align: 'right', required: true, sortable: true },
            { 
                name: 'Marknadsvärde_instrument', label: 'Marknadsvärde', field: 'Marknadsvärde_instrument', align: 'right', required: false, sortable: true, 
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: val => isValidNumber(val) ? formatter.format(val) : '',
            },
            { 
                name: 'Antal', label: 'Antal', field: 'Antal', align: 'right', required: false, sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: val => isValidNumber(val) ? formatter.format(val) : ''
             },
            { name: 'Valuta', label: 'Valuta', field: 'Valuta', align: 'right', required: false, sortable: true },
            { 
                name: 'Andel_av_fondförmögenhet_instrument', label: 'Andel av fondförmögenhet', field: 'Andel_av_fondförmögenhet_instrument', align: 'right', required: true, sortable: true,
                sort: (a, b) => parseFloat(a) - parseFloat(b),
                format: val => isValidNumber(val) ? Number.parseFloat(val) : ''
            }
        ],
        visibleColumns: ['Instrumentnamn', 'Bransch', 'ISIN-kod_instrument', 'Marknadsvärde_instrument', 'Andel_av_fondförmögenhet_instrument', 'Antal', 'Valuta']
    }
};

module.exports = {
    fiFunds,
    fiDownload,
    funds,
    fundHoldings
}
