import { createLogger } from 'vuex'
import { LocalStorage } from 'quasar'

import { 
  DARK_MODE_KEY,
  ROUTER_PATH_KEY,
  WATCHLIST_KEY,
  ALERTS_KEY
} from './mutations'

const localStoragePlugin = store => {

  store.subscribe((mutation, { darkMode }) => {
    LocalStorage.set(DARK_MODE_KEY, JSON.stringify(darkMode));
  }),

  store.subscribe((mutation, {routerPath }) => {
    LocalStorage.set(ROUTER_PATH_KEY, routerPath);
  }),

  store.subscribe((mutation, {watchlist }) => {
    LocalStorage.set(WATCHLIST_KEY, watchlist);
  }),

  store.subscribe((mutation, {alerts }) => {
    LocalStorage.set(ALERTS_KEY, alerts);
  })

}

export default process.env.NODE_ENV !== 'production'
  ? [createLogger(), localStoragePlugin]
  : [localStoragePlugin]