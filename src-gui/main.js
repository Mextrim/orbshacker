const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');
const updater = require('./updater');
const { getLiveDiscordProfile } = require('./discord-account');
const pkg = require('./package.json');

let mainWindow = null;
let rustProcess = null;
let tray = null;
let isQuitting = false;
let hasShownTrayNotice = false;
let isMiniMode = false;
let savedBounds = null;
let nextRequestId = 1;
const pendingRequests = new Map();

function findRustBinary() {
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'orbshacker-core.exe' : 'orbshacker-core';

  const candidates = [
    path.join(__dirname, '..', 'src-rust', 'target', 'release', binName),
    path.join(__dirname, '..', 'src-rust', 'target', 'debug', binName),
    path.join(path.dirname(process.execPath || ''), binName),
    path.join(process.resourcesPath || '', 'bin', binName),
    path.join(__dirname, 'bin', binName),
    path.join(process.cwd(), 'src-rust', 'target', 'release', binName),
    path.join(process.cwd(), 'dist', binName),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

function startRustCore() {
  const binaryPath = findRustBinary();
  if (!binaryPath) {
    console.error('orbshacker-core binary not found! Please build src-rust first.');
    return;
  }

  console.log('Starting Rust core sidecar from:', binaryPath);
  rustProcess = spawn(binaryPath, [], {
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
  });

  const rl = readline.createInterface({
    input: rustProcess.stdout,
    terminal: false,
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const msg = JSON.parse(trimmed);

      // 1. Response to a pending request
      if (msg.id !== undefined && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error));
        } else {
          resolve(msg.result);
        }
        return;
      }

      // 2. Broadcast asynchronous event to renderer
      if (msg.event && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('rpc:event', {
          event: msg.event,
          data: msg.data,
        });
      }
    } catch (err) {
      console.error('Failed to parse message from Rust core:', trimmed, err);
    }
  });

  rustProcess.on('exit', (code) => {
    console.log('Rust core exited with code:', code);
    rustProcess = null;
  });
}

function sendRustRpc(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!rustProcess || !rustProcess.stdin.writable) {
      return reject(new Error('Rust core engine is not running'));
    }

    const id = nextRequestId++;
    pendingRequests.set(id, { resolve, reject });

    const req = JSON.stringify({ id, method, params }) + '\n';
    rustProcess.stdin.write(req);

    // Timeout safety
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`RPC request '${method}' timed out after 30 seconds`));
      }
    }, 30000);
  });
}

function createTray() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'assets', 'icon.ico')
    : path.join(__dirname, 'assets', 'icon.png');
  const fallbackPath = path.join(__dirname, 'assets', 'icon.png');

  let trayIcon = null;
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else if (fs.existsSync(fallbackPath)) {
    trayIcon = nativeImage.createFromPath(fallbackPath);
  }

  if (!trayIcon || trayIcon.isEmpty()) {
    return;
  }

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  tray.setToolTip('ORBSHACKER v2.5.0 — Discord Quests & Badges Spoofer');

  const contextMenu = Menu.buildFromTemplate([
    { label: '⚡ ORBSHACKER v2.5.0', enabled: false },
    { type: 'separator' },
    {
      label: '⚡ Показать окно',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Скрыть в трей',
      click: () => {
        if (mainWindow) mainWindow.hide();
      },
    },
    { type: 'separator' },
    {
      label: '⏹️ Остановить фарм',
      click: () => {
        sendRustRpc('stop_farm').catch(() => {});
        sendRustRpc('stop_badge_farm').catch(() => {});
      },
    },
    { type: 'separator' },
    {
      label: '❌ Полный выход',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 780,
    minWidth: 920,
    minHeight: 660,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0c10',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (!hasShownTrayNotice && tray && process.platform === 'win32') {
        hasShownTrayNotice = true;
        tray.displayBalloon({
          title: 'ORBSHACKER v2.5.0',
          content: 'Приложение свёрнуто в системный трей и продолжает работу в фоне.',
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('rpc:call', async (_event, { method, params }) => {
  return await sendRustRpc(method, params);
});

ipcMain.handle('discord:get-live-profile', async () => {
  try {
    return await getLiveDiscordProfile();
  } catch (err) {
    return { connected: false, error: err.message };
  }
});

ipcMain.handle('open-discord-quests', async () => {
  try {
    // Open Discord client directly to Quests home tab
    await shell.openExternal('discord:///quest-home');
  } catch (_) {
    try {
      await shell.openExternal('https://discord.com/quest-home');
    } catch (e) {
      console.error('Failed to open discord quests url:', e);
    }
  }
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

// Auto-Updater Handlers (GitHub Releases)
ipcMain.handle('updater:check', async () => {
  try {
    return await updater.checkForUpdates(pkg.version);
  } catch (err) {
    console.error('Update check failed:', err);
    return { hasUpdate: false, error: err.message, currentVersion: pkg.version };
  }
});

ipcMain.handle('updater:download', async (_event, { downloadUrl, checksumUrl, assetName }) => {
  try {
    return await updater.downloadAndInstall(downloadUrl, checksumUrl, assetName, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:progress', progress);
      }
    });
  } catch (err) {
    console.error('Download update failed:', err);
    throw err;
  }
});

ipcMain.handle('open-external', async (_event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
  }
});

// Mini-Widget Overlay Mode
ipcMain.handle('window:toggle-mini-mode', () => {
  if (!mainWindow) return { isMini: false };
  if (!isMiniMode) {
    savedBounds = mainWindow.getBounds();
    isMiniMode = true;
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setMinimumSize(340, 120);
    mainWindow.setBounds({ width: 360, height: 130 });
    mainWindow.webContents.send('window:mini-mode-changed', true);
  } else {
    isMiniMode = false;
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(920, 660);
    if (savedBounds) {
      mainWindow.setBounds(savedBounds);
    } else {
      mainWindow.setBounds({ width: 1080, height: 780 });
    }
    mainWindow.webContents.send('window:mini-mode-changed', false);
  }
  return { isMini: isMiniMode };
});

// Auto-Launch on OS Boot
ipcMain.handle('app:get-auto-launch', () => {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch (_) {
    return false;
  }
});

ipcMain.handle('app:set-auto-launch', (_event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      openAsHidden: true,
      name: 'ORBSHACKER',
    });
    return true;
  } catch (err) {
    console.error('Failed to set login item:', err);
    return false;
  }
});

// Safe System Shutdown after farm completion
ipcMain.handle('system:shutdown', async () => {
  try {
    if (rustProcess) {
      try {
        rustProcess.stdin.write(JSON.stringify({ method: 'stop_farm' }) + '\n');
        rustProcess.kill();
      } catch (_) {}
    }
    if (process.platform === 'win32') {
      spawn('shutdown.exe', ['/s', '/t', '0'], { detached: true });
    } else {
      spawn('shutdown', ['-h', 'now'], { detached: true });
    }
    app.exit(0);
    return true;
  } catch (err) {
    console.error('Shutdown command failed:', err);
    return false;
  }
});

// Clipboard Helper
ipcMain.handle('clipboard:write', (_event, text) => {
  try {
    clipboard.writeText(text || '');
    return true;
  } catch (_) {
    return false;
  }
});

app.whenReady().then(() => {
  updater.cleanupOldExe();
  startRustCore();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (rustProcess) {
    try {
      rustProcess.stdin.write(JSON.stringify({ method: 'stop_farm' }) + '\n');
    } catch (_) {}
    rustProcess.kill();
    rustProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
