import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUpdateStore = defineStore('update', () => {
    // Global state
    const updateAvailable = ref(false)
    const updateInfo = ref(null)
    const lastCheckTime = ref(null)
    
    // Settings (persisted)
    const autoCheckEnabled = ref(true)
    const autoCheckIntervalMinutes = ref(60) // Check every hour by default
    
    // Computed
    const hasUpdate = computed(() => updateAvailable.value && updateInfo.value)
    
    // Load persisted state from localStorage
    function loadPersistedState() {
        try {
            // Load last check time
            const storedCheckTime = localStorage.getItem('stoqster-last-update-check')
            if (storedCheckTime) {
                lastCheckTime.value = new Date(storedCheckTime)
            }
            
            // Load settings
            const storedAutoCheck = localStorage.getItem('stoqster-auto-check-enabled')
            if (storedAutoCheck !== null) {
                autoCheckEnabled.value = JSON.parse(storedAutoCheck)
            }
            
            const storedInterval = localStorage.getItem('stoqster-auto-check-interval')
            if (storedInterval) {
                autoCheckIntervalMinutes.value = parseInt(storedInterval, 10)
            }
            
            console.log('📱 Loaded persisted update settings:', {
                autoCheckEnabled: autoCheckEnabled.value,
                autoCheckIntervalMinutes: autoCheckIntervalMinutes.value,
                lastCheckTime: lastCheckTime.value
            })
        } catch (error) {
            console.error('❌ Error loading persisted state:', error)
        }
    }
    
    // Save settings to localStorage
    function saveSettings() {
        try {
            localStorage.setItem('stoqster-auto-check-enabled', JSON.stringify(autoCheckEnabled.value))
            localStorage.setItem('stoqster-auto-check-interval', autoCheckIntervalMinutes.value.toString())
            console.log('💾 Saved update settings')
        } catch (error) {
            console.error('❌ Error saving settings:', error)
        }
    }
    
    // Update last check time and persist it
    function setLastCheckTime(time) {
        lastCheckTime.value = time
        try {
            localStorage.setItem('stoqster-last-update-check', time.toISOString())
        } catch (error) {
            console.error('❌ Error saving last check time:', error)
        }
    }
    
    // Set update info (when update is available)
    function setUpdateInfo(info) {
        updateInfo.value = info
        updateAvailable.value = !!info
        console.log('📦 Update info set:', info ? `Version ${info.version}` : 'No update')
    }
    
    // Clear update info (when no update available)
    function clearUpdateInfo() {
        updateInfo.value = null
        updateAvailable.value = false
        console.log('🧹 Update info cleared')
    }
    
    // Get scheduled update from localStorage
    function getScheduledUpdate() {
        try {
            const stored = localStorage.getItem('stoqster-scheduled-update')
            return stored ? JSON.parse(stored) : null
        } catch (error) {
            console.error('❌ Error reading scheduled update:', error)
            return null
        }
    }
    
    // Save scheduled update to localStorage
    function setScheduledUpdate(scheduleData) {
        try {
            localStorage.setItem('stoqster-scheduled-update', JSON.stringify(scheduleData))
            console.log('📅 Scheduled update saved:', scheduleData.version)
        } catch (error) {
            console.error('❌ Error saving scheduled update:', error)
        }
    }
    
    // Clear scheduled update from localStorage
    function clearScheduledUpdate() {
        try {
            localStorage.removeItem('stoqster-scheduled-update')
            console.log('🧹 Scheduled update cleared')
        } catch (error) {
            console.error('❌ Error clearing scheduled update:', error)
        }
    }
    
    // Update auto check settings
    function setAutoCheckEnabled(enabled) {
        autoCheckEnabled.value = enabled
        saveSettings()
    }
    
    function setAutoCheckInterval(minutes) {
        autoCheckIntervalMinutes.value = minutes
        saveSettings()
    }
    
    // Initialize store
    function initialize() {
        console.log('🔄 Initializing update store...')
        loadPersistedState()
    }
    
    return {
        // State (reactive)
        updateAvailable,
        updateInfo,
        lastCheckTime,
        autoCheckEnabled,
        autoCheckIntervalMinutes,
        
        // Computed
        hasUpdate,
        
        // Actions
        setLastCheckTime,
        setUpdateInfo,
        clearUpdateInfo,
        getScheduledUpdate,
        setScheduledUpdate,
        clearScheduledUpdate,
        setAutoCheckEnabled,
        setAutoCheckInterval,
        initialize
    }
})
