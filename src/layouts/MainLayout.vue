<template>
    <q-layout view="hHh lpr fFf">
        <q-header elevated>
            <!--  Top toolbar -->
            <q-toolbar>
                <q-btn flat dense round icon="mdi-menu" aria-label="Menu" @click="drawer = !drawer">
                    <q-tooltip transition-show="scale" transition-hide="scale">{{ "Show/hide drawer" }}</q-tooltip>
                </q-btn>
                <q-toolbar-title>Stoqster</q-toolbar-title>

                <!-- Toggle dark / light mode -->
                <q-btn flat round icon="mdi-invert-colors" @click="toggleDarkMode">
                    <q-tooltip transition-show="scale" transition-hide="scale">{{ darkMode ? "Light mode" : "Dark mode"
                        }}</q-tooltip>
                </q-btn>

                <!-- Populate the toolbar with menu item icons an actions -->
                <q-btn flat round v-for="item in menuItems" :key="item.title" :icon="item.icon"
                    @click="setRouterPath({ path: item.path })">
                    <q-tooltip transition-show="scale" transition-hide="scale">{{ item.caption }}</q-tooltip>
                </q-btn>
            </q-toolbar>
        </q-header>

        <!--  Left drawer listing menu items -->
        <q-drawer v-model="drawer" bordered overlay>
            <q-list>
                <q-item-label header>Application Links</q-item-label>

                <q-item clickable v-ripple v-for="item in menuItems" :key="item.title" :icon="item.icon"
                    @click="setRouterPath({ path: item.path })">
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
        caption: 'Dashboard',
        icon: 'mdi-apps',
        path: '/'
    },
    {
        title: 'Ibindex',
        caption: 'Ibindex companies',
        path: '/ibindex',
        icon: 'mdi-format-list-bulleted'
    },
    {
        title: 'Ibindex - weights',
        caption: 'Market and index weights',
        path: '/ibindex-weights',
        icon: 'mdi-chart-pie'
    },
    {
        title: 'Funds',
        caption: 'Funds',
        path: '/funds',
        icon: 'mdi-briefcase-variant'
    },
    {
        title: 'Info',
        caption: 'Application information',
        path: '/info',
        icon: 'mdi-information'
    }
]

import { onMounted, watch, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../stores/settings-store.js';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api';

export default {
    name: 'MainLayout',

    components: {},

    setup() {
        const $q = useQuasar();
        const settingsStore = useSettingsStore();
        const { darkMode, routerPath } = storeToRefs(settingsStore);
        const router = useRouter();
        const drawer = ref(false);

        // Show the main window when all web content has loaded.
        // This fixes the issue of flickering when the app starts and is in darkMode.
        onMounted(() => invoke('show_main_window'));

        watch(darkMode, () => $q.dark.set(darkMode.value));
        watch(routerPath, () => router.replace(routerPath.value));

        return {
            menuItems: links,
            darkMode,
            drawer,

            toggleDarkMode: () => darkMode.value = !darkMode.value,
            setRouterPath: (newPath) => routerPath.value = newPath
        }
    }
}
</script>
