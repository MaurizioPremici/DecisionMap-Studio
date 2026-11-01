const {contextBridge, clipboard} = require('electron')

contextBridge.exposeInMainWorld('desktopClipboard', {
  readImage() {
    const image = clipboard.readImage()
    if (!image.isEmpty()) {
      return {dataUrl: image.toDataURL(), name: 'clipboard.png', type: 'image/png'}
    }
    const text = clipboard.readText().trim()
    if (/^<svg[\s>]/i.test(text)) {
      return {text, name: 'clipboard.svg', type: 'image/svg+xml'}
    }
    return null
  }
})
