import { createStore } from 'vuex'
import { LocalStorage } from 'quasar'

import plugins from './plugins'

import { 
  mutations, 
  DARK_MODE_KEY,
  ROUTER_PATH_KEY,
  WATCHLIST_KEY, 
  ALERTS_KEY 
} from './mutations'


export default createStore({
  modules: {},

  state: {
    darkMode: JSON.parse(LocalStorage.getItem(DARK_MODE_KEY) || 'false'),
    routerPath: LocalStorage.getItem(ROUTER_PATH_KEY) || '',
    watchlist: LocalStorage.getItem(WATCHLIST_KEY) || [],
    alerts: LocalStorage.getItem(ALERTS_KEY) || []
  },

  mutations,

  plugins,

  // enable strict mode (adds overhead!)
  // for dev mode and --debug builds only
  strict: process.env.DEBUGGING
})
