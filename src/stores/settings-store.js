import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', () => {

    return {
        // Application settings
        darkMode: ref('auto'),  // auto | light | dark
        routerPath: ref('/'),   // Current router path
        watchlist: ref([]),     // List of funds in the watchlist
        alerts: ref([]),        // List of alerts
        refreshInterval: ref(60*60*1000), // Refresh interval in milliseconds
    }
});