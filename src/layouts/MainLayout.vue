<template>
    <q-layout view="hHh lpr fFf">
        <q-header>
            <!--  Top toolbar -->
            <q-toolbar class="bg-dark text-white">
                <q-btn
                    flat
                    dense
                    round
                    icon="mdi-menu"
                    aria-label="Meny"
                    @click="drawer = !drawer"
                >
                    <q-tooltip
                        transition-show="scale"
                        transition-hide="scale"
                        >{{ "Visa/dölj meny" }}</q-tooltip
                    >
                </q-btn>
                <q-toolbar-title>Stoqster</q-toolbar-title>

                <!-- Populate the toolbar with menu item icons an actions -->
                <q-btn
                    flat
                    round
                    v-for="item in menuItems"
                    :key="item.title"
                    :icon="item.icon"
                    @click="setRouterPath({ path: item.path })"
                >
                    <q-tooltip
                        transition-show="scale"
                        transition-hide="scale"
                        >{{ item.caption }}</q-tooltip
                    >
                </q-btn>

                <q-separator vertical inset spaced size="1px" color="grey-3" />

                <!-- Toggle dark / light mode -->
                <q-btn
                    flat
                    round
                    icon="mdi-invert-colors"
                    @click="toggleDarkMode"
                >
                    <q-tooltip
                        transition-show="scale"
                        transition-hide="scale"
                        >{{ darkMode ? "Ljust läge" : "Mörkt läge" }}</q-tooltip
                    >
                </q-btn>

                <!-- Settings button -->
                <q-btn
                    flat
                    round
                    icon="mdi-cog"
                    @click="showSettingsDialog = true"
                >
                    <q-tooltip
                        transition-show="scale"
                        transition-hide="scale"
                        >Inställningar</q-tooltip
                    >
                </q-btn>
            </q-toolbar>
        </q-header>

        <!--  Left drawer listing menu items -->
        <q-drawer v-model="drawer" bordered overlay>
            <q-list>
                <q-item-label header>SEKTIONER</q-item-label>

                <q-item
                    clickable
                    v-ripple
                    v-for="item in menuItems"
                    :key="item.title"
                    :icon="item.icon"
                    @click="setRouterPath({ path: item.path })"
                >
                    <q-item-section avatar>
                        <q-icon :name="item.icon" />
                    </q-item-section>

                    <q-item-section>
                        <q-item-label>{{ item.title }}</q-item-label>
                        <q-item-label caption>{{ item.caption }}</q-item-label>
                    </q-item-section>
                </q-item>
                
                <q-separator spaced />
                
                <q-item-label header>INSTÄLLNINGAR</q-item-label>
                
                <!-- Check for updates menu item -->
                <q-item
                    clickable
                    v-ripple
                    @click="updateAvailable ? showUpdateDialog = true : checkForUpdates()"
                    :disable="isCheckingForUpdates"
                >
                    <q-item-section avatar>
                        <q-icon 
                            :name="updateAvailable ? 'mdi-download-circle' : 'mdi-update'" 
                            :color="updateAvailable ? 'orange' : undefined"
                        />
                    </q-item-section>

                    <q-item-section>
                        <q-item-label>
                            {{ updateAvailable ? 'Uppdatering tillgänglig' : 'Sök efter uppdateringar' }}
                        </q-item-label>
                        <q-item-label caption v-if="currentVersion">
                            Nuvarande version: {{ currentVersion }}
                        </q-item-label>
                        <q-item-label caption v-else-if="!isCheckingForUpdates">
                            Version: Okänd (utvecklingsläge)
                        </q-item-label>
                        <q-item-label caption>
                            {{ isCheckingForUpdates ? 'Söker...' : `Senast: ${formatLastCheck()}` }}
                        </q-item-label>
                    </q-item-section>
                    
                    <q-item-section side v-if="updateAvailable">
                        <q-badge color="orange" floating>
                            {{ updateInfo?.version }}
                        </q-badge>
                    </q-item-section>
                </q-item>
                
                <!-- Settings menu item -->
                <q-item
                    clickable
                    v-ripple
                    @click="showSettingsDialog = true"
                >
                    <q-item-section avatar>
                        <q-icon name="mdi-cog" />
                    </q-item-section>

                    <q-item-section>
                        <q-item-label>Inställningar</q-item-label>
                        <q-item-label caption>
                            Konfigurera applikationen
                        </q-item-label>
                    </q-item-section>
                </q-item>
            </q-list>
        </q-drawer>

        <q-page-container>
            <router-view />
        </q-page-container>
        
        <!-- Update Dialog -->
        <UpdateDialog v-model="showUpdateDialog" />
        
        <!-- Settings Dialog -->
        <SettingsDialog 
            v-model="showSettingsDialog" 
            @check-for-updates="checkForUpdates"
        />
    </q-layout>
</template>

<script>
const links = [
    {
        title: "Ibindex",
        caption: "Bevakningar",
        icon: "mdi-monitor-eye",
        iconUrl: "",
        path: "/",
    },
    {
        title: "Ibindex",
        caption: "Investmentbolag",
        icon: "mdi-briefcase-variant-outline",
        iconUrl: "https://ibindex.se/ibi/assets/images/logo.png",
        path: "/ibindex",
    },
    {
        title: "Fbindex",
        caption: "Fastighetsbolag",
        icon: "mdi-domain",
        iconUrl: "https://www.fbindex.se/fbi/assets/images/logo.png",
        path: "/fbindex",
    },
    {
        title: "Fonder - Finansinspektionen",
        caption: "Fonder",
        icon: "mdi-briefcase-variant",
        iconUrl: "https://www.fi.se/static/gfx/images/fi-logotyp.svg",
        path: "/funds",
    },
    {
        title: "Aktier",
        caption: "Aktieöversikt",
        icon: "mdi-chart-line",
        iconUrl: "",
        path: "/stocks",
    },
];

import { onMounted, onUnmounted, watch, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settings-store.js";
import { useUpdateStore } from "../stores/update-store.js";
import { useUpdater } from "../composables/useUpdater.js";
import { useQuasar } from "quasar";
import { useRouter } from "vue-router";
import UpdateDialog from "../components/UpdateDialog.vue";
import SettingsDialog from "../components/SettingsDialog.vue";
import { getVersion } from '@tauri-apps/api/app';
// import { invoke } from "@tauri-apps/api";

export default {
    name: "MainLayout",

    components: {
        UpdateDialog,
        SettingsDialog
    },

    setup() {
        const $q = useQuasar();
        const settingsStore = useSettingsStore();
        const updateStore = useUpdateStore();
        const updater = useUpdater();
        const { darkMode, routerPath } = storeToRefs(settingsStore);
        const { 
            updateAvailable, 
            updateInfo, 
            lastCheckTime,
            autoCheckEnabled,
            autoCheckIntervalMinutes
        } = storeToRefs(updateStore);
        const { isChecking: isCheckingForUpdates } = storeToRefs(updater);
        const router = useRouter();
        const drawer = ref(false);
        const showUpdateDialog = ref(false);
        const showSettingsDialog = ref(false);
        const currentVersion = ref('');
        const autoCheckInterval = ref(null);

        // Helper: Validate a path against current router routes
        function isValidRoute(path) {
            // Remove query/hash for matching
            const cleanPath = path && typeof path === 'object' ? path.path : path;
            return router.getRoutes().some(r => r.path === cleanPath || r.path === (cleanPath || '').replace(/\/$/, ''));
        }

        // Format last check time for display
        const formatLastCheck = () => {
            if (!lastCheckTime.value) return 'Aldrig kontrollerat'
            
            const now = new Date()
            const diff = now - lastCheckTime.value
            const minutes = Math.floor(diff / 60000)
            const hours = Math.floor(minutes / 60)
            const days = Math.floor(hours / 24)
            
            if (diff < 30000) return 'Nyss' // Less than 30 seconds
            if (minutes < 1) return 'Mindre än 1 min sedan'
            if (minutes < 60) return `${minutes} min sedan`
            if (hours < 24) return `${hours} tim sedan`
            if (days === 1) return 'Igår'
            if (days < 7) return `${days} dagar sedan`
            
            return lastCheckTime.value.toLocaleDateString('sv-SE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        }

        // Show notification helper
        const showNotification = (notification) => {
            $q.notify(notification);
        }

        // Check for updates manually
        const checkForUpdates = async () => {
            console.log('🔄 Manual update check requested')
            
            const result = await updater.checkForUpdates()
            updateStore.setLastCheckTime(new Date())
            
            if (result.success) {
                if (result.updateInfo) {
                    // Update available
                    updateStore.setUpdateInfo(result.updateInfo)
                    
                    showNotification({
                        type: 'info',
                        message: 'Uppdatering tillgänglig',
                        caption: `Version ${result.updateInfo.version} är redo att installeras`,
                        icon: 'mdi-download',
                        timeout: 0,
                        actions: [
                            {
                                label: 'Visa detaljer',
                                color: 'white',
                                handler: () => showUpdateDialog.value = true
                            },
                            {
                                label: 'Senare',
                                color: 'white'
                            }
                        ]
                    })
                } else {
                    // No update available
                    updateStore.clearUpdateInfo()
                    
                    showNotification({
                        type: 'dark',
                        message: 'Inga uppdateringar',
                        caption: 'Du har den senaste versionen',
                        icon: 'mdi-check-circle',
                        timeout: 3000
                    })
                }
            } else {
                // Error occurred
                showNotification({
                    type: 'negative',
                    message: 'Kunde inte söka efter uppdateringar',
                    caption: result.error || 'Okänt fel',
                    icon: 'mdi-alert-circle',
                    timeout: 5000
                })
            }
        }

        // Automatic update check
        const performAutoCheck = async () => {
            console.log('⏰ Automatic update check')
            
            const result = await updater.checkForUpdates()
            updateStore.setLastCheckTime(new Date())
            
            if (result.success && result.updateInfo) {
                updateStore.setUpdateInfo(result.updateInfo)
                
                // Show subtle notification for automatic checks
                showNotification({
                    type: 'info',
                    message: 'Uppdatering tillgänglig',
                    caption: `Version ${result.updateInfo.version} är redo att installeras`,
                    icon: 'mdi-download',
                    timeout: 5000,
                    actions: [
                        {
                            label: 'Visa',
                            color: 'white',
                            handler: () => showUpdateDialog.value = true
                        }
                    ]
                })
            } else if (result.success) {
                updateStore.clearUpdateInfo()
            }
        }

        // Start automatic checking
        const startAutoCheck = () => {
            if (autoCheckInterval.value) {
                clearInterval(autoCheckInterval.value)
            }
            
            if (autoCheckEnabled.value) {
                autoCheckInterval.value = setInterval(
                    performAutoCheck,
                    autoCheckIntervalMinutes.value * 60 * 1000
                )
                console.log(`🔄 Auto-update check started (every ${autoCheckIntervalMinutes.value} minutes)`)
            }
        }

        // Stop automatic checking
        const stopAutoCheck = () => {
            if (autoCheckInterval.value) {
                clearInterval(autoCheckInterval.value)
                autoCheckInterval.value = null
                console.log('🛑 Auto-update check stopped')
            }
        }

        // Show the main window when all web content has loaded.
        // This fixes the issue of flickering when the app starts and is in darkMode.
        // onMounted(() => invoke('show_main_window'));

        // Restore application states from last session and initialize updater
        onMounted(async () => {
            $q.dark.set(darkMode.value);
            // Validate routerPath before navigating
            if (!isValidRoute(routerPath.value)) {
                routerPath.value = '/';
            }
            router.replace(routerPath.value);
            
            // Get current app version
            try {
                currentVersion.value = await getVersion();
                console.log('📱 Current app version:', currentVersion.value);
            } catch (error) {
                console.error('❌ Error getting app version:', error);
                // Don't set a fallback - just leave it empty so the UI handles it gracefully
                currentVersion.value = '';
            }
            
            // Initialize update store
            updateStore.initialize();
            
            // Start automatic checking if enabled
            if (autoCheckEnabled.value) {
                startAutoCheck();
            }
            
            // Do initial update check after a delay
            setTimeout(() => {
                console.log('⏰ Running startup update check...');
                performAutoCheck();
            }, 5000);
        });

        // Cleanup on unmount
        onUnmounted(() => {
            stopAutoCheck();
        });

        // Watch for settings changes
        watch(autoCheckEnabled, (newValue) => {
            if (newValue) {
                startAutoCheck();
            } else {
                stopAutoCheck();
            }
        });

        watch(autoCheckIntervalMinutes, () => {
            if (autoCheckEnabled.value) {
                startAutoCheck(); // Restart with new interval
            }
        });

        // Watch for application state changes
        watch(darkMode, () => $q.dark.set(darkMode.value));
        watch(routerPath, (newPath) => {
            if (!isValidRoute(newPath)) {
                routerPath.value = '/';
                router.replace('/');
            } else {
                router.replace(newPath);
            }
        });

        return {
            menuItems: links,
            darkMode,
            drawer,
            isCheckingForUpdates,
            updateAvailable,
            updateInfo,
            lastCheckTime,
            showUpdateDialog,
            showSettingsDialog,
            currentVersion,

            toggleDarkMode: () => (darkMode.value = !darkMode.value),
            setRouterPath: (newPath) => (routerPath.value = newPath),
            checkForUpdates,
            formatLastCheck,
        };
    },
};
</script>
