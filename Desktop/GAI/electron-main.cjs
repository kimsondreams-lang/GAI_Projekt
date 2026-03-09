/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, screen, ipcMain, globalShortcut, Notification, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
// const fs = require('fs');
const screenshot = require('screenshot-desktop');

let mainWindow;

// --- MENU DEFINITION ---
const createMenu = () => {
  const isMac = process.platform === 'darwin';
  
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ];

  // Remove default "Close Window" (Cmd+W) from Mac Window menu to let Renderer handle it
  // The default 'window' role or manually added items usually handle this.
  // By constructing it manually without 'close' role for Mac, we achieve the goal.

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

let serverProcess;

// const isDev = process.env.NODE_ENV === 'development';
const PORT = 1234; // GAIOS backend port

// --- IPC HANDLERS ---

ipcMain.handle('get-active-window', async () => {
    try {
        const { default: activeWin } = await import('active-win');
        const result = await activeWin();
        return result;
    } catch (error) {
        console.error('Failed to get active window:', error);
        return { error: error.message };
    }
});

ipcMain.handle('take-screenshot', async () => {
    try {
        // const displays = await screenshot.listDisplays();
        const img = await screenshot({ format: 'png' });
        return img.toString('base64');
    } catch (error) {
        console.error('Screenshot failed:', error);
        return { error: error.message };
    }
});

ipcMain.handle('show-notification', async (event, { title, body }) => {
    new Notification({ title, body }).show();
    return true;
});

ipcMain.handle('hide-window', () => {
    if (mainWindow) mainWindow.hide();
});

ipcMain.handle('show-window', () => {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
});

function startServer() {
  const serverPath = path.join(__dirname, 'server.js');
  console.log('[Electron] Starting backend server...');
  serverProcess = spawn('node', [serverPath], {
    env: { 
      ...process.env, 
      PORT: PORT,
      ELECTRON_RUN: 'true'
    },
    cwd: __dirname,
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('[Electron] Failed to start server:', err);
  });

  serverProcess.on('close', (code) => {
    console.log(`[Electron] Server process exited with code ${code}`);
  });
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    title: 'GAI OS',
    fullscreen: true,
    frame: false,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      plugins: true
    }
  });

  const loadUrl = () => {
      mainWindow.loadURL(`http://localhost:${PORT}?t=${Date.now()}`)
        .then(() => console.log('[Electron] Page loaded successfully'))
        .catch(err => {
            console.log('[Electron] Page load failed, retrying...', err);
            setTimeout(loadUrl, 1000);
        });
  };

  setTimeout(loadUrl, 3000);

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('disable-gpu-watchdog');
app.commandLine.appendSwitch('ignore-certificate-errors');

app.whenReady().then(() => {
  createMenu();
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  globalShortcut.register('Alt+Space', () => {
      if (mainWindow) {
          if (mainWindow.isVisible()) {
              mainWindow.hide();
          } else {
              mainWindow.show();
              mainWindow.focus();
          }
      }
  });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    console.log('[Electron] Killing server process...');
    serverProcess.kill();
  }
});