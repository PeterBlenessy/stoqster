// Get color based on value being negative or positive
const setStyle = (number, ifNegative='red', ifPositive='green') => {
    if (number != 0) {
        return (number < 0 ? 'color:'+ifNegative : 'color:'+ifPositive)
    }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat
//const locale = new Intl.locale("se-SV", { language: 'sv'});
const formatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  currencyDisplay: 'narrowSymbol',
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
            { name: 'Fondförmögenhet', label: 'Fondförmögenhet', field: 'Fondförmögenhet', align: 'right', required: true, sortable: true,
              format: val => `${isValidNumber(val) ? formatter.format(val) : ''}`,
            },
            { name: 'Förvaltningsavgift', label: 'Förvaltningsavgift', field: 'Förvaltningsavgift', align: 'right', required: false, sortable: true,
              format: val => `${isValidNumber(val) ? formatter.format(val) : ''}`,
            },
            { name: 'Jämförelseindex', label: 'Jämförelseindex', field: 'Jämförelseindex', align: 'left', required: false },
            { name: 'Likvida_medel', label: 'Likvida medel', field: 'Likvida_medel', align: 'right', required: true, sortable: true,
              format: val => `${isValidNumber(val) ? formatter.format(val) : ''}`,
            },
            { name: 'Standardavvikelse_24_månader', label: 'Standardavvikelse 24 månader', field: 'Standardavvikelse_24_månader', align: 'right', required: true, sortable: true,
              format: val => `${ isValidNumber(val) ? Number.parseFloat(val) : '' }`
            },
            { name: 'Övriga_tillgångar_och_skulder', label: 'Övriga tillgångar och skulder', field: 'Övriga_tillgångar_och_skulder', align: 'right', required: true, sortable: true,
              format: val => `${isValidNumber(val) ? formatter.format(val) : ''}`,
              style: val => setStyle(val['Övriga_tillgångar_och_skulder'])
            },
        ],
        visibleColumns: ['Fond_namn', 'Fond_ISIN-kod', 'Fondförmögenhet', 'Likvida_medel', 'Standardavvikelse_24_månader', 'Övriga_tillgångar_och_skulder']
    }
};

const fundHoldings = {
    title: 'Fund holdings',
    url: '',
    localForageConfig: {
        storeName: 'fi-fund-holdings',
    },
    fields: [ 'Andel_av_fondförmögenhet_instrument', 'Antal', 'Bransch/Bransch_namn_instrument', 'Bransch/Branschkod_instrument', 'ISIN-kod_instrument', 'Instrumentnamn', 'Kurs_som_använts_vid_värdering_av_instrumentet', 
        'Landkod_Emittent', 'Marknadsvärde_instrument', 'Nominellt_belopp', 'Tillgångsslag_enligt_LVF_5_kap', 'Valuta', 'Valutakurs_instrument' ],
    qTableConfig: {
        columns: [],
        visibleColumns: ['Instrumentnamn', 'ISIN-kod_instrument', 'Andel_av_fondförmögenhet_instrument', 'Antal', 'Valuta', 'Valutakurs_instrument']
    }
};

module.exports = {
    fiFunds,
    fiDownload,
    funds,
    fundHoldings
}
