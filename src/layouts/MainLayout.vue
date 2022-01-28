<template>
  <q-layout view="hHh lpr fFf">
    <q-header elevated>
      <!--  Top toolbar -->
      <q-toolbar >
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawer = !drawer"/>

        <q-toolbar-title>Stoqster</q-toolbar-title>

        <!-- Toggle dark / light mode -->
        <q-btn flat round icon="invert_colors" @click="toggleDarkMode">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ darkMode ? "Light mode" : "Dark mode" }}
          </q-tooltip>
        </q-btn>

        <!-- Populate the toolbar with menu item icons an actions -->
        <q-btn flat round 
          v-for="item in menuItems"
          :key="item.title"
          :icon="item.icon"
          @click="setRouterPath({path: item.path})"
        >
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ item.caption }}
          </q-tooltip>
        </q-btn>

      </q-toolbar>
    </q-header>

    <!--  Left drawer listing menu items -->
    <q-drawer v-model="drawer" bordered overlay>
      <q-list>
        <q-item-label header >Application Links</q-item-label>

        <q-item clickable v-ripple
          v-for="item in menuItems"
          :key="item.title"
          :icon="item.icon"
          @click="setRouterPath({path: item.path})"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ item.title }}</q-item-label>
            <q-item-label caption>{{ item.caption }}</q-item-label>
          </q-item-section>
        
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>

const links = [
  {
    title: 'Dashboard ',
    caption: 'Display the dashboard of watchlisted companies',
    icon: 'apps',
    path: '/'
  },
  {
    title: 'Ibindex',
    caption: 'Ibindex companies',
    path: '/ibindex',
    icon: 'list'
  },
  {
    title: 'Ibindex - weights',
    caption: 'Market and index weights',
    path: '/ibindex-weights',
    icon: 'pie_chart'
  },
  {
    title: 'Fonder',
    caption: 'Fonder',
    path: '/funds',
    icon: 'business_center'
  },
  {
    title: 'Info',
    caption: 'Application information',
    path: '/info',
    icon: 'info'
  }
]

import { onMounted, computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router'

export default {
  name: 'MainLayout',

  components: {},

  setup () {
    const $q = useQuasar();
    const store = useStore();
    const router = useRouter();
    const darkMode = computed(() => store.state.darkMode);
    const drawer = ref(false);

    // Sets Quasar dark mode plugin value based on stored mode.
    // Used at app start.
    function setDarkMode() {
      $q.dark.set(darkMode.value)
    }
 
    // Make sure to set the store dark mode for app
    onMounted(setDarkMode);

    return {
      menuItems: links,
      darkMode,
      drawer,

      toggleDarkMode: () => {
        store.commit('toggleDarkMode');
        $q.dark.toggle();
      },
      setRouterPath: (newPath) => { 
        store.commit('setRouterPath', newPath);
        router.replace(newPath);
      }
    }
  }
}
</script>
