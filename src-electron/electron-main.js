import { app, BrowserWindow, nativeTheme, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import axios from 'axios'

try {
  if (process.platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    require('fs').unlinkSync(require('path').join(app.getPath('userData'), 'DevTools Extensions'))
  }
} catch (_) { }

let mainWindow

function createWindow () {
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
      contextIsolation: true,
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
      mainWindow.webContents.closeDevTools()
    })
  }

  // Check for updates
  mainWindow.once('ready-to-show', () => { 
    autoUpdater.checkForUpdatesAndNotify();
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

//  console.log("--------------------------------------------------------------------");
//  console.log(options);

  try { 
      let response =  await axios.request(options);
      //console.log(response);  
      let data;

      if (response.config.responseType === 'arraybuffer') {
          // We need to handle special charactesr such as åäöÅÄÖ
          data = JSON.parse(response.data.toString('latin1'));
      } else {
          data = response.data;
      }

      // IPC does not allow you to directly return promises, 
      // you can only return basic types and objects that can be serializable.
      return { data: data, status: response.status, statusText: response.statusText}
  } catch (error) {
      console.log(error);
  }
})