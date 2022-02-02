import { app, BrowserWindow, nativeTheme, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import logger from 'electron-log'
import path from 'path'

try {
    if (process.platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
        require('fs').unlinkSync(require('path').join(app.getPath('userData'), 'DevTools Extensions'))
    }
} catch (_) { }

let mainWindow

function createWindow() {
    /**
     * Initial window options
     */
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 1200,
        minWidth: 1600,
        minHeight: 1200,
        useContentSize: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            // By disabling webSecurity, it is possible to run fetch() in the browser.
            // Since we only load data from known sources, and no HTML or JS, the risk is kind of under control.
            webSecurity: false,
            // More info: /quasar-cli/developing-electron-apps/electron-preload-script
            preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
        }
    })

    mainWindow.loadURL(process.env.APP_URL)

    if (process.env.DEBUGGING) {
        // if on DEV or Production with debug enabled
        //    mainWindow.webContents.openDevTools()
    } else {
        // we're on production; no access to devtools pls
        mainWindow.webContents.on('devtools-opened', () => {
            //      mainWindow.webContents.closeDevTools()
        })
    }

    // Check for updates
    mainWindow.once('ready-to-show', () => {
        autoUpdater.logger = logger;
        autoUpdater.checkForUpdatesAndNotify();
        logger.info('registered-auto-update');

        setInterval(() => {
            autoUpdater.checkForUpdatesAndNotify();
            logger.info('registered-auto-update refresh interval');
        }, 1000 * 60 * 60); // Check every hour
    });

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})
