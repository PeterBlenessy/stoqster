<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar >
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer"/>

        <q-toolbar-title>Stoqster</q-toolbar-title>
    

        <q-btn flat round icon="invert_colors" @click.stop="$q.dark.toggle()">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ $q.dark.isActive ? "Light mode" : "Dark mode" }}
          </q-tooltip>
        </q-btn>
        <q-btn flat round icon="apps" @click="$router.replace({path: '/'})">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ "Dashboard" }}
          </q-tooltip>     
        </q-btn>
        <q-btn flat round icon="list" @click="$router.replace({path: '/ibindex'})">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ "Investmendbolag" }}
          </q-tooltip>     
        </q-btn>
        <q-btn flat round icon="pie_chart" @click="$router.replace({path: '/ibindex-weights'})">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ "Marknads- och indexvikt" }}
          </q-tooltip>     
        </q-btn>
        <q-btn flat round icon="info" @click="$router.replace({path: '/about'})">
          <q-tooltip transition-show="scale" transition-hide="scale">
            {{ "Info" }}
          </q-tooltip>
        </q-btn>

      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      bordered
    >
      <q-list>
        <q-item-label header>Application Links</q-item-label>
        <EssentialLink
          v-for="link in essentialLinks"
          :key="link.title"
          v-bind="link"
        />
      </q-list>

    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import EssentialLink from 'components/EssentialLink.vue'

const linksList = [
  {
    title: 'Dashboard',
    caption: 'Display watchlisted companies',
    icon: 'apps',
    link: '/'
  },
  {
    title: 'Ibindex',
    caption: 'Ibindex companies',
    icon: 'list',
    link: '/ibindex'
  },
  {
    title: 'Ibindex - weights',
    caption: 'Market and index weights',
    icon: 'pie_chart',
    link: '/ibindex-weights'
  }
];

import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'MainLayout',

  components: {
    EssentialLink
  },

  setup () {
    const leftDrawerOpen = ref(false)

    return {
      essentialLinks: linksList,
      leftDrawerOpen,
      
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      }
    }
  }
})
</script>
