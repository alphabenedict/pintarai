import { app, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as http from 'http';

const isDev = !app.isPackaged;

let ollamaProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;
let loadingWindow: BrowserWindow | null = null;

function getOllamaPath(): string {
  if (isDev) {
    // In dev, use system Ollama
    return 'ollama';
  }
  // In prod, use bundled ollama.exe next to the resources
  return path.join(process.resourcesPath, 'ollama', 'ollama.exe');
}

function getModelsPath(): string {
  if (isDev) {
    // In dev, use user's existing models
    return path.join(process.env.USERPROFILE || '', '.ollama', 'models');
  }
  return path.join(process.resourcesPath, 'models');
}

function startOllama(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ollamaPath = getOllamaPath();
    const modelsPath = getModelsPath();
    const ollamaDir = isDev ? undefined : path.join(process.resourcesPath, 'ollama');

    console.log('[Ollama] Starting server...', { ollamaPath, modelsPath });

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      OLLAMA_MODELS: modelsPath,
      OLLAMA_HOST: '127.0.0.1:11434',
      OLLAMA_KEEP_ALIVE: '-1', // Keep model in memory
      PATH: ollamaDir ? `${ollamaDir};${process.env.PATH}` : process.env.PATH,
    };

    ollamaProcess = spawn(ollamaPath, ['serve'], {
      env,
      cwd: ollamaDir,
      windowsHide: true,
      detached: false,
    });

    ollamaProcess.stdout?.on('data', (d: Buffer) => console.log('[Ollama]', d.toString().trim()));
    ollamaProcess.stderr?.on('data', (d: Buffer) => console.log('[Ollama stderr]', d.toString().trim()));

    ollamaProcess.on('error', (err: Error) => {
      console.error('[Ollama] Failed to start:', err);
      reject(err);
    });

    // Poll until ready
    const timeout = setTimeout(() => reject(new Error('Ollama timeout')), 60000);
    const poll = setInterval(() => {
      http.get('http://127.0.0.1:11434/api/tags', (res) => {
        if (res.statusCode === 200) {
          clearInterval(poll);
          clearTimeout(timeout);
          console.log('[Ollama] Ready!');
          resolve();
        }
      }).on('error', () => {}); // Ignore connection refused during startup
    }, 1000);
  });
}

function createLoadingWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 480,
    height: 340,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  const loadingHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 480px; height: 340px;
    background: linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%);
    border-radius: 24px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: 'Segoe UI', system-ui, sans-serif;
    overflow: hidden;
    box-shadow: 0 24px 60px rgba(37,99,235,0.18), 0 8px 0 #1d4ed8;
    border: 2px solid rgba(255,255,255,0.8);
  }
  .owl {
    font-size: 72px;
    margin-bottom: 16px;
    animation: bounce 1.8s ease-in-out infinite;
  }
  @keyframes bounce {
    0%,100% { transform: translateY(0px); }
    50% { transform: translateY(-12px); }
  }
  h1 {
    font-size: 32px; font-weight: 800;
    background: linear-gradient(135deg, #2563EB, #7C3AED);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
  }
  p {
    font-size: 14px; color: #64748b;
    margin-bottom: 24px;
  }
  .dots {
    display: flex; gap: 8px;
  }
  .dot {
    width: 10px; height: 10px;
    background: #2563EB; border-radius: 50%;
    animation: pulse 1.2s ease-in-out infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pulse {
    0%,100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.3); opacity: 1; }
  }
  .status {
    font-size: 12px; color: #94a3b8;
    margin-top: 16px;
  }
</style>
</head>
<body>
  <div class="owl">🦉</div>
  <h1>PintarAI</h1>
  <p>Memuat AI, harap tunggu...</p>
  <div class="dots">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
  <p class="status">Menghidupkan asisten belajar...</p>
</body>
</html>`;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHTML)}`);
  win.once('ready-to-show', () => win.show());
  return win;
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    title: 'PintarAI',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    backgroundColor: '#F8FAFC',
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  return win;
}

app.whenReady().then(async () => {
  loadingWindow = createLoadingWindow();
  mainWindow = createMainWindow();

  try {
    await startOllama();

    // Ollama is ready — show main window, close loading
    mainWindow.once('ready-to-show', () => {
      loadingWindow?.close();
      mainWindow?.show();
      mainWindow?.focus();
    });
    mainWindow.webContents.reload(); // Ensure it loads now that Ollama is up
    if (!mainWindow.webContents.isLoading()) {
      mainWindow.show();
      loadingWindow?.close();
    }
  } catch (err) {
    console.error('Failed to start Ollama:', err);
    // Show main window anyway — app will show disconnected state
    mainWindow.once('ready-to-show', () => {
      loadingWindow?.close();
      mainWindow?.show();
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (ollamaProcess) {
    console.log('[Ollama] Shutting down...');
    ollamaProcess.kill('SIGTERM');
    ollamaProcess = null;
  }
});
