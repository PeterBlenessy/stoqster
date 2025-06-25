import { ref, readonly } from 'vue'
import { check } from '@tauri-apps/plugin-updater'

/**
 * Composable for managing application updates
 * Provides pure update operations without global state management
 */
export function useUpdater() {
    // Local state for operation tracking
    const isChecking = ref(false)
    const isInstalling = ref(false)
    
    /**
     * Check for available updates
     * @returns {Promise<{success: boolean, updateInfo?: object, error?: string}>}
     */
    async function checkForUpdates() {
        if (isChecking.value) {
            return { success: false, error: 'Update check already in progress' }
        }
        
        isChecking.value = true
        
        try {
            console.log('🔄 Checking for updates...')
            const update = await check()
            
            if (update?.available) {
                const updateInfo = {
                    version: update.version,
                    date: update.date,
                    body: update.body
                }
                
                console.log(`✅ Update available: ${update.version}`)
                console.log(`📅 Release date: ${update.date}`)
                console.log(`📝 Release notes: ${update.body}`)
                
                return { success: true, updateInfo }
            } else {
                console.log('✅ No updates available - you have the latest version')
                return { success: true, updateInfo: null }
            }
        } catch (error) {
            console.error('❌ Error checking for updates:', error)
            console.error('📋 Error details:', error.message || 'Unknown error')
            
            return { success: false, error: error.message || 'Unknown error occurred' }
        } finally {
            isChecking.value = false
        }
    }
    
    /**
     * Install an available update
     * @param {object} updateInfo - The update info object
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async function installUpdate(updateInfo) {
        if (!updateInfo) {
            return { success: false, error: 'No update info provided' }
        }
        
        if (isInstalling.value) {
            return { success: false, error: 'Update installation already in progress' }
        }
        
        isInstalling.value = true
        
        try {
            console.log('🚀 Installing update...')
            
            // Verify update is still available
            const update = await check()
            if (!update?.available || update.version !== updateInfo.version) {
                return { success: false, error: 'Update is no longer available' }
            }
            
            console.log('📦 Downloading and installing update...')
            await update.downloadAndInstall()
            
            console.log('✅ Update installed successfully - app will restart')
            return { success: true }
            
        } catch (error) {
            console.error('❌ Error installing update:', error)
            console.error('📋 Install error details:', error.message || 'Unknown error')
            
            return { success: false, error: error.message || 'Installation failed' }
        } finally {
            isInstalling.value = false
        }
    }
    
    /**
     * Prepare update info for scheduling
     * @param {object} updateInfo - The update info object
     * @returns {{success: boolean, scheduleData?: object, error?: string}}
     */
    function prepareScheduledUpdate(updateInfo) {
        if (!updateInfo) {
            return { success: false, error: 'No update info provided' }
        }
        
        console.log('📅 Preparing update for scheduling:', updateInfo.version)
        
        return {
            success: true,
            scheduleData: {
                version: updateInfo.version,
                date: updateInfo.date,
                body: updateInfo.body,
                scheduledAt: new Date().toISOString()
            }
        }
    }
    
    /**
     * Process a scheduled update on app startup
     * @param {object} scheduleData - The scheduled update data
     * @returns {Promise<{success: boolean, shouldInstall?: boolean, error?: string}>}
     */
    async function processScheduledUpdate(scheduleData) {
        if (!scheduleData) {
            return { success: true, shouldInstall: false }
        }
        
        try {
            console.log('📅 Processing scheduled update:', scheduleData.version)
            
            // Check if the scheduled update is still available
            const currentUpdate = await check()
            
            if (currentUpdate?.available && currentUpdate.version === scheduleData.version) {
                console.log('✅ Scheduled update is still available, ready to install')
                return { success: true, shouldInstall: true, updateInfo: scheduleData }
            } else {
                console.log('⚠️ Scheduled update is no longer available or version mismatch')
                return { success: true, shouldInstall: false }
            }
        } catch (error) {
            console.error('❌ Error processing scheduled update:', error)
            return { success: false, error: error.message || 'Failed to process scheduled update' }
        }
    }
    
    return {
        // State (read-only)
        isChecking: readonly(isChecking),
        isInstalling: readonly(isInstalling),
        
        // Operations
        checkForUpdates,
        installUpdate,
        prepareScheduledUpdate,
        processScheduledUpdate
    }
}
