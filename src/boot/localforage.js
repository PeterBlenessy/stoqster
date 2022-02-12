import { boot } from 'quasar/wrappers'
import localforage from 'localforage'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async (/* { app, router, ... } */) => {

    // Set common config options for localForage instances
    const dbName = 'stoqster';

    localforage.config({
        driver: localforage.INDEXEDDB,
        name: dbName
    });

    const tableCommon = localforage.createInstance({ name: dbName, storeName: 'common', description: '...' });
    const tableFunds = localforage.createInstance({ name: dbName, storeName: 'funds', description: '...' });
    const tableFundsHoldings = localforage.createInstance({ name: dbName, storeName: 'funds-holdings', description: '...' });

    const tableCompanies = localforage.createInstance({ name: dbName, storeName: 'companies', description: '...' });


})
