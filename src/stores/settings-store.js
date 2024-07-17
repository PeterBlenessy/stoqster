import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', () => {

    // Helper functions to save and load state from local storage
    const saveState = (key, state) => {
        localStorage.setItem(key, JSON.stringify(state));
    }
    
    const loadState = (key) => {
        const state = localStorage.getItem(key);
        return state ? JSON.parse(state) : null;
    }

    // Load initial state from local storage
    const darkMode = ref(loadState('darkMode') || 'false');
    const routerPath = ref(loadState('routerPath') || '/');
    const watchlist = ref(loadState('watchlist') || []);
    const alerts = ref(loadState('alerts') || []);
    const refreshInterval = ref(loadState('refreshInterval') || 60 * 60 * 1000);


    // Watch and save changes to local storage
    watch(darkMode, (newValue) => saveState('darkMode', newValue), { deep: true });
    watch(routerPath, (newValue) => saveState('routerPath', newValue), { deep: true });
    watch(watchlist, (newValue) => saveState('watchlist', newValue), { deep: true });
    watch(alerts, (newValue) => saveState('alerts', newValue), { deep: true });
    watch(refreshInterval, (newValue) => saveState('refreshInterval', newValue), { deep: true });

    return {
        darkMode,
        routerPath,
        watchlist,
        alerts,
        refreshInterval
    }
});