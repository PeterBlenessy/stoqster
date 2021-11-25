export const DARK_MODE_KEY = 'darkMode'
export const ROUTER_PATH_KEY = 'routerPath'
export const WATCHLIST_KEY = 'watchlist'
export const ALERTS_KEY = 'alerts'
export const REFRESH_INTERVAL_KEY = 'refreshInterval'

export const mutations = {

    toggleDarkMode (state) {
        state.darkMode = !state.darkMode;
    },

    setRouterPath (state, path) {
        state.routerPath = path;
    },

    setWatchlist (state, watchlist) {
        state.watchlist = watchlist;
    },

    setAlerts (state, alerts) {
        state.alerts = alerts;
    },

    setRefreshInterval (state, refreshInterval) {
        state.refreshInterval = refreshInterval;
    }
}