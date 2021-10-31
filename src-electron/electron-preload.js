/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 */

// Preload (Isolated World)
const { contextBridge, ipcRenderer } = require('electron')
 
contextBridge.exposeInMainWorld(
    'ipc',
    {
        axiosRequest: async ( options ) => { return await ipcRenderer.invoke('axios-request', options)},
        fetchRequest: async ( url, options ) => { return await ipcRenderer.invoke('fetch-request', url, options)} 
    },
);