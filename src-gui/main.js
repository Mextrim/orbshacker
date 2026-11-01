const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');

let mainWindow = null;
let rustProcess = null;
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('rpc:call', async (_event, { method, params }) => {
  return await sendRustRpc(method, params);
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

app.whenReady().then(() => {
  startRustCore();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
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
