const electron = require('electron')
const fs = require('fs')

// Module to control application life.
const app = electron.app

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const Menu = electron.Menu
const MenuItem = electron.MenuItem
const ipc = electron.ipcMain

let mWs = []

function createWindow() {
    var mWx = mWs.push(new BrowserWindow({
        width: 1080,
        height: 720,
        frame: false,
        titleBarStyle: 'hidden'
    })) - 1

    mWs[mWx].loadURL(`file://${__dirname}/index.html`)

    // Open the DevTools.
    mWs[mWx].webContents.openDevTools()

    mWs[mWx].on('closed', function() {
        (function(mWx2) {
            mWs.splice(mWx2, 1)
        })(mWx)
    })

    mWs[mWx].show()

    mWs[mWx].on('page-title-updated', function(event, title) {
        mWs[mWx].setTitle(title)
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function() {
    if (mainWindow === null) {
        createWindow()
    }
})

ipc.on('new_window', function(event) {
    createWindow()
})