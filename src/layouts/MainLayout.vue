<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <!--  Top toolbar -->
      <q-toolbar >
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleDrawer"/>

        <q-toolbar-title>Stoqster</q-toolbar-title>

        <!-- Toggle dark / light mode -->
        <q-btn flat round icon="invert_colors" @click.stop="$q.dark.toggle()">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ $q.dark.isActive ? "Light mode" : "Dark mode" }}
          </q-tooltip>
        </q-btn>

        <!-- Populate the toolbar with menu item icons an actions -->
        <q-btn flat round 
          v-for="item in menuItems"
          :key="item.title"
          :icon="item.icon"
          @click="$router.replace({path: item.path})"
        >
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ item.caption }}
          </q-tooltip>
        </q-btn>

      </q-toolbar>
    </q-header>

    <!--  Left drawer listing menu items -->
    <q-drawer v-model="drawer" bordered>
      <q-list>
        <q-item-label header >Application Links</q-item-label>

        <q-item clickable v-ripple
          v-for="item in menuItems"
          :key="item.title"
          :icon="item.icon"
          @click="$router.replace({path: item.path})"
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
    title: 'Info',
    caption: 'Application information',
    path: '/info',
    icon: 'info'
  }
]

import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'MainLayout',

  components: {},

  setup () {
    const drawer = ref(false);

    return {
      menuItems: links,
      drawer,
      
      toggleDrawer () {
        drawer.value = !drawer.value;
      }
    }
  }
});
</script>
