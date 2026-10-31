const {app, BrowserWindow} = require('electron')
const path = require('node:path')

app.setName('Decision Map Studio')

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 620,
    title: 'Decision Map Studio',
    backgroundColor: '#f8f7f4',
    webPreferences: {nodeIntegration: false, contextIsolation: true, sandbox: true}
  })
  window.webContents.setWindowOpenHandler(() => ({action: 'deny'}))
  window.webContents.on('will-navigate', event => event.preventDefault())
  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {if (BrowserWindow.getAllWindows().length === 0) createWindow()})
})
app.on('window-all-closed', () => {if (process.platform !== 'darwin') app.quit()})
