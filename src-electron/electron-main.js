import { app, BrowserWindow, nativeTheme, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import logger from 'electron-log'
import path from 'path'
import axios from 'axios'

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
        width: 1200,
        height: 800,
        minWidth: 1200,
        minHeight: 800,
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

// IPC handler for generic axios get/post requests
// axios_options is the json object with 
ipcMain.handle('axios-request', async (_, options) => {

    try {
        let response = await axios.request(options);
        let data;
        
        console.log(response.config);

        if (response.config.responseType === 'arraybuffer') {

            if (response.config.headers['Content-Type'] === 'application/json;charset=UTF-8') {
                // We need to handle special charactesr such as åäöÅÄÖ
                data = JSON.parse(response.data.toString('latin1'));
            } else if (response.config.headers['Content-Type'] === 'application/zip') {
                data = response.data;
            }

        } else if (response.config.responseType === 'blob') {
            // console.log(response.headers);
            // console.log(response.config);
            // console.log(response.request);
            data = response.data;
        } else {
            data = response.data;
        }

        // IPC does not allow you to directly return promises, 
        // you can only return basic types and objects that can be serialized.
        return {
            status: response.status,
            statusText: response.statusText,
            headers: JSON.stringify(response.headers),
            config: JSON.stringify(response.config),
            data: data
        }

    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            // logger.error(error.response.status);
            // logger.error(error.response.headers);
            // logger.error(error.response.data);
            logger.error(error.response);
        } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            logger.error(error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.log('Error', error.message);
        }

        return error;
    }
})
