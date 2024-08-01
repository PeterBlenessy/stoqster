<template>
    <q-layout view="hHh lpr fFf">
        <q-header elevated>
            <!--  Top toolbar -->
            <q-toolbar>
                <q-btn flat dense round icon="mdi-menu" aria-label="Meny" @click="drawer = !drawer">
                    <q-tooltip transition-show="scale" transition-hide="scale">{{ "Visa/dölj meny" }}</q-tooltip>
                </q-btn>
                <q-toolbar-title>Stoqster</q-toolbar-title>

                <!-- Toggle dark / light mode -->
                <q-btn flat round icon="mdi-invert-colors" @click="toggleDarkMode">
                    <q-tooltip transition-show="scale" transition-hide="scale">{{ darkMode ? "Ljust läge" : "Mörkt läge"
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
        title: 'Ibindex',
        caption: 'Bevakningar',
        icon: 'mdi-apps',
        path: '/'
    },
    {
        title: 'Ibindex',
        caption: 'Investmentbolag',
        path: '/ibindex',
        icon: 'mdi-format-list-bulleted'
    },
    {
        title: 'Fonder - FinansInspektionen',
        caption: 'Fonder',
        path: '/funds',
        icon: 'mdi-briefcase-variant'
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

        // Restore application states from last session
        onMounted(() => {
            $q.dark.set(darkMode.value);
            router.replace(routerPath.value);
        });

        // Watch for application state changes
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
