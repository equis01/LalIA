const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fss = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;
let mainWindow;
let openedFolder = null;
let shellProc = null;
let shellCwd = process.env.USERPROFILE || process.cwd();
let lastCpu = snapshotCpu();
let pendingLaunchPath = null;

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'release', 'build', '.next', '.vite', '.cache', 'coverage', '.dart_tool', '.gradle', 'ios/Pods']);
const SKIP_EXTS = new Set(['.png','.jpg','.jpeg','.gif','.webp','.ico','.pdf','.zip','.rar','.7z','.exe','.dll','.bin','.mp4','.mov','.avi','.mp3','.wav','.ttf','.otf','.db','.sqlite']);
const TEXT_EXTS = new Set(['.js','.jsx','.ts','.tsx','.json','.html','.css','.scss','.md','.txt','.yml','.yaml','.xml','.php','.py','.dart','.java','.kt','.swift','.c','.cpp','.h','.cs','.go','.rs','.sql','.env','.gitignore','.ps1','.bat','.cmd']);

function pickLaunchPath(argv = process.argv) {
  const candidates = argv
    .slice(1)
    .filter(arg => arg && !arg.startsWith('-'))
    .filter(arg => arg !== '.' && arg !== app.getAppPath());
  for (const candidate of candidates) {
    const clean = String(candidate).replace(/^\"|\"$/g, '');
    if (path.isAbsolute(clean) && fss.existsSync(clean)) return clean;
  }
  return null;
}

async function openPathFromSystem(targetPath) {
  if (!targetPath || !fss.existsSync(targetPath)) return;
  try {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) {
      openedFolder = targetPath;
      safeSend('system:openPath', { kind: 'folder', folderPath: openedFolder, tree: await buildTree(openedFolder) });
      return;
    }
    const dir = path.dirname(targetPath);
    openedFolder = dir;
    const ext = path.extname(targetPath).toLowerCase();
    const rel = path.relative(openedFolder, targetPath).replace(/\\/g, '/');
    const payload = { kind: 'file', folderPath: openedFolder, tree: await buildTree(openedFolder), path: rel };
    if (TEXT_EXTS.has(ext)) payload.content = await fs.readFile(targetPath, 'utf8');
    else payload.error = 'Archivo no editable como texto desde el menú contextual.';
    safeSend('system:openPath', payload);
  } catch (err) {
    safeSend('system:openPath', { kind: 'error', error: err.message, targetPath });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 1150,
    minHeight: 720,
    backgroundColor: '#070b14',
    title: 'LalIA',
    icon: path.join(__dirname, '../assets/LalIA.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.webContents.once('did-finish-load', () => {
    if (pendingLaunchPath) {
      const target = pendingLaunchPath;
      pendingLaunchPath = null;
      openPathFromSystem(target);
    }
  });

  mainWindow.on('closed', () => { stopShell(); mainWindow = null; });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const launchPath = pickLaunchPath(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (launchPath) openPathFromSystem(launchPath);
    } else if (launchPath) {
      pendingLaunchPath = launchPath;
    }
  });

  app.whenReady().then(() => {
    pendingLaunchPath = pickLaunchPath(process.argv);
    createWindow();
    createAppMenu();
  });
}
app.on('window-all-closed', () => { stopShell(); if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

function createAppMenu() {
  const template = [
    { label: 'Archivo', submenu: [
      { label: 'Nuevo archivo de texto', accelerator: 'CmdOrCtrl+N', click: () => safeSend('menu:action', 'show-home') },
      { label: 'Abrir archivo...', accelerator: 'CmdOrCtrl+O', click: () => safeSend('menu:action', 'open-file') },
      { label: 'Abrir carpeta...', accelerator: 'CmdOrCtrl+K', click: () => safeSend('menu:action', 'open-folder') },
      { type: 'separator' },
      { label: 'Guardar', accelerator: 'CmdOrCtrl+S', click: () => safeSend('menu:action', 'save-file') },
      { type: 'separator' },
      { label: 'Salir', role: process.platform === 'darwin' ? 'close' : 'quit' }
    ] },
    { label: 'Editar', submenu: [
      { role: 'undo', label: 'Deshacer' }, { role: 'redo', label: 'Rehacer' }, { type: 'separator' },
      { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' },
      { type: 'separator' }, { label: 'Paleta de comandos...', accelerator: 'CmdOrCtrl+Shift+P', click: () => safeSend('menu:action', 'command-palette') }
    ] },
    { label: 'Selección', submenu: [
      { role: 'selectAll', label: 'Seleccionar todo' },
      { label: 'Agregar selección al chat de LalIA', accelerator: 'CmdOrCtrl+U', click: () => safeSend('menu:action', 'add-selection') }
    ] },
    { label: 'Ver', submenu: [
      { label: 'Paleta de comandos...', accelerator: 'CmdOrCtrl+Shift+P', click: () => safeSend('menu:action', 'command-palette') },
      { label: 'Explorador', click: () => safeSend('menu:action', 'show-home') },
      { label: 'Buscar', click: () => safeSend('menu:action', 'show-search') },
      { label: 'Control de código fuente', click: () => safeSend('menu:action', 'show-source') },
      { label: 'Ejecutar y depurar', click: () => safeSend('menu:action', 'show-run') },
      { label: 'Extensiones', click: () => safeSend('menu:action', 'show-extensions') },
      { type: 'separator' }, { label: 'Panel inferior / Terminal', accelerator: 'CmdOrCtrl+T', click: () => safeSend('menu:action', 'toggle-powershell') },
      { label: 'Recargar ventana', role: 'reload' }, { label: 'Pantalla completa', role: 'togglefullscreen' }, { label: 'Herramientas de desarrollador', role: 'toggleDevTools' }
    ] },
    { label: 'Ir', submenu: [
      { label: 'Ir a archivo...', accelerator: 'CmdOrCtrl+P', click: () => safeSend('menu:action', 'command-palette') },
      { label: 'Ir a control de código fuente', click: () => safeSend('menu:action', 'show-source') }
    ] },
    { label: '...', submenu: [
      { label: 'Ejecutar npm run dev', accelerator: 'F5', click: () => safeSend('menu:action', 'run-dev') },
      { label: 'Nueva terminal', click: () => safeSend('menu:action', 'toggle-powershell') },
      { type: 'separator' },
      { label: 'Página de Eva Vázquez', click: () => shell.openExternal('https://www.evazquez.me') },
      { label: 'Repositorio de LalIA', click: () => shell.openExternal('https://github.com/equis01/LalIA') },
      { label: 'Acerca de LalIA', click: () => safeSend('menu:action', 'about') }
    ] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function safeSend(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function isPathInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel));
}

function normalizeRel(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function getHistoryPath() {
  return path.join(app.getPath('userData'), 'lalia-history.json');
}

async function readHistory() {
  try { return JSON.parse(await fs.readFile(getHistoryPath(), 'utf8')); }
  catch { return []; }
}
function normalizeHistoryForDisk(history) {
  // Compatibilidad v19/v20: v19 esperaba un array; v20 guarda un objeto con sesiones por proyecto.
  if (Array.isArray(history)) return history.slice(-200);
  if (history && typeof history === 'object') {
    const copy = { ...history };
    if (copy.sessionsByProject && typeof copy.sessionsByProject === 'object') {
      const trimmed = {};
      for (const [projectKey, sessions] of Object.entries(copy.sessionsByProject)) {
        trimmed[projectKey] = Array.isArray(sessions)
          ? sessions.slice(-80).map((session) => ({
              ...session,
              messages: Array.isArray(session.messages) ? session.messages.slice(-300) : []
            }))
          : [];
      }
      copy.sessionsByProject = trimmed;
    }
    return copy;
  }
  return [];
}

async function writeHistory(history) {
  await fs.mkdir(path.dirname(getHistoryPath()), { recursive: true });
  await fs.writeFile(getHistoryPath(), JSON.stringify(normalizeHistoryForDisk(history), null, 2), 'utf8');
}

ipcMain.handle('system:openPathInNewWindow', async (_event, targetPath) => {
  if (!targetPath || !fss.existsSync(targetPath)) return { ok: false, error: 'Ruta no encontrada' };
  try {
    const child = require('child_process').spawn(process.execPath, [targetPath], { detached: true, stdio: 'ignore' });
    child.unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths?.[0]) return null;
  openedFolder = result.filePaths[0];
  return { folderPath: openedFolder, tree: await buildTree(openedFolder) };
});

ipcMain.handle('dialog:openFolderPath', async (_event, folderPath) => {
  if (!folderPath || !fss.existsSync(folderPath)) return null;
  const stat = await fs.stat(folderPath);
  if (!stat.isDirectory()) return null;
  openedFolder = folderPath;
  return { folderPath: openedFolder, tree: await buildTree(openedFolder) };
});


ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Código y texto', extensions: ['js','jsx','ts','tsx','json','html','css','scss','md','txt','yml','yaml','xml','php','py','dart','java','kt','swift','c','cpp','h','cs','go','rs','sql','env','ps1','bat','cmd'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths?.[0]) return null;
  const fullPath = result.filePaths[0];
  const dir = path.dirname(fullPath);
  if (!openedFolder || !isPathInside(openedFolder, fullPath)) {
    openedFolder = dir;
  }
  const rel = path.relative(openedFolder, fullPath).replace(/\\/g, '/');
  const content = await fs.readFile(fullPath, 'utf8');
  return { folderPath: openedFolder, tree: await buildTree(openedFolder), path: rel, content };
});

ipcMain.handle('files:refreshTree', async () => {
  if (!openedFolder) return [];
  return buildTree(openedFolder);
});

ipcMain.handle('files:readFile', async (_event, relPath) => {
  if (!openedFolder) throw new Error('No hay carpeta abierta.');
  const safeRel = normalizeRel(relPath);
  const fullPath = path.join(openedFolder, safeRel);
  if (!isPathInside(openedFolder, fullPath)) throw new Error('Ruta no permitida.');
  const content = await fs.readFile(fullPath, 'utf8');
  return { path: safeRel, content };
});

ipcMain.handle('files:writeFile', async (_event, relPath, content) => {
  if (!openedFolder) throw new Error('No hay carpeta abierta.');
  const safeRel = normalizeRel(relPath);
  const fullPath = path.join(openedFolder, safeRel);
  if (!isPathInside(openedFolder, fullPath)) throw new Error('Ruta no permitida.');
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');
  return { ok: true };
});


ipcMain.handle('files:createFile', async (_event, relPath, content = '') => {
  if (!openedFolder) throw new Error('No hay carpeta abierta.');
  const safeRel = normalizeRel(relPath);
  if (!safeRel) throw new Error('Nombre de archivo vacío.');
  const fullPath = path.join(openedFolder, safeRel);
  if (!isPathInside(openedFolder, fullPath)) throw new Error('Ruta no permitida.');
  if (fss.existsSync(fullPath)) throw new Error('Ya existe un archivo o carpeta con ese nombre.');
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');
  return { ok: true, path: safeRel, tree: await buildTree(openedFolder) };
});

ipcMain.handle('files:createFolder', async (_event, relPath) => {
  if (!openedFolder) throw new Error('No hay carpeta abierta.');
  const safeRel = normalizeRel(relPath);
  if (!safeRel) throw new Error('Nombre de carpeta vacío.');
  const fullPath = path.join(openedFolder, safeRel);
  if (!isPathInside(openedFolder, fullPath)) throw new Error('Ruta no permitida.');
  await fs.mkdir(fullPath, { recursive: true });
  return { ok: true, path: safeRel, tree: await buildTree(openedFolder) };
});

ipcMain.handle('files:rename', async (_event, oldRelPath, newRelPath) => {
  if (!openedFolder) throw new Error('No hay carpeta abierta.');
  const oldRel = normalizeRel(oldRelPath);
  const newRel = normalizeRel(newRelPath);
  if (!oldRel || !newRel) throw new Error('Ruta inválida.');
  const oldFull = path.join(openedFolder, oldRel);
  const newFull = path.join(openedFolder, newRel);
  if (!isPathInside(openedFolder, oldFull) || !isPathInside(openedFolder, newFull)) throw new Error('Ruta no permitida.');
  if (!fss.existsSync(oldFull)) throw new Error('El archivo/carpeta original no existe.');
  if (fss.existsSync(newFull)) throw new Error('Ya existe un archivo o carpeta con ese nombre.');
  await fs.mkdir(path.dirname(newFull), { recursive: true });
  await fs.rename(oldFull, newFull);
  return { ok: true, oldPath: oldRel, newPath: newRel, tree: await buildTree(openedFolder) };
});

ipcMain.handle('files:delete', async (_event, relPath) => {
  if (!openedFolder) throw new Error('No hay carpeta abierta.');
  const safeRel = normalizeRel(relPath);
  if (!safeRel) throw new Error('Ruta inválida.');
  const fullPath = path.join(openedFolder, safeRel);
  if (!isPathInside(openedFolder, fullPath)) throw new Error('Ruta no permitida.');
  if (!fss.existsSync(fullPath)) throw new Error('No existe.');
  const stat = await fs.stat(fullPath);
  if (stat.isDirectory()) await fs.rm(fullPath, { recursive: true, force: true });
  else await fs.unlink(fullPath);
  return { ok: true, path: safeRel, tree: await buildTree(openedFolder) };
});

ipcMain.handle('files:reveal', async (_event, relPath) => {
  if (!openedFolder) throw new Error('No hay carpeta abierta.');
  const safeRel = normalizeRel(relPath || '');
  const fullPath = path.join(openedFolder, safeRel);
  if (!isPathInside(openedFolder, fullPath)) throw new Error('Ruta no permitida.');
  if (fss.existsSync(fullPath)) shell.showItemInFolder(fullPath);
  else shell.openPath(openedFolder);
  return { ok: true };
});

ipcMain.handle('files:applyChanges', async (_event, changes) => {
  if (!openedFolder) throw new Error('No hay carpeta abierta.');
  const applied = [];
  for (const change of changes || []) {
    const rel = normalizeRel(change.path);
    const fullPath = path.join(openedFolder, rel);
    if (!isPathInside(openedFolder, fullPath)) throw new Error(`Ruta no permitida: ${rel}`);
    const backupPath = fullPath + `.bak-${Date.now()}`;
    if (fss.existsSync(fullPath)) await fs.copyFile(fullPath, backupPath).catch(() => {});
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, change.content ?? '', 'utf8');
    applied.push(rel);
  }
  return { ok: true, applied, tree: await buildTree(openedFolder) };
});

ipcMain.handle('files:getProjectContext', async (_event, options = {}) => {
  if (!openedFolder) throw new Error('No hay carpeta abierta.');
  const maxFiles = options.maxFiles || 90;
  const maxChars = options.maxChars || 180000;
  const files = [];
  await collectFiles(openedFolder, '', files, maxFiles * 3);
  let output = '';
  let used = 0;
  for (const file of files.slice(0, maxFiles)) {
    try {
      const full = path.join(openedFolder, file);
      const stat = await fs.stat(full);
      if (stat.size > 120000) continue;
      const content = await fs.readFile(full, 'utf8');
      const chunk = `\n\n--- FILE: ${file} ---\n${content}`;
      if (used + chunk.length > maxChars) break;
      output += chunk;
      used += chunk.length;
    } catch {}
  }
  return { root: openedFolder, fileCount: files.length, includedChars: used, context: output };
});

ipcMain.handle('history:load', async () => readHistory());
ipcMain.handle('history:save', async (_event, history) => { await writeHistory(history); return { ok: true }; });
ipcMain.handle('history:clear', async () => { await writeHistory([]); return { ok: true }; });

ipcMain.handle('shell:start', async (_event, folderPath) => {
  const target = folderPath || openedFolder || shellCwd;
  startShell(target);
  return { ok: true, cwd: shellCwd };
});
ipcMain.handle('shell:send', async (_event, command) => {
  if (!shellProc) startShell(openedFolder || shellCwd);
  shellProc.stdin.write(String(command || '') + '\n');
  return { ok: true };
});
ipcMain.handle('shell:stop', async () => { stopShell(); return { ok: true }; });
ipcMain.handle('system:stats', async () => getStats());
ipcMain.handle('ollama:listModels', async () => listOllamaModels());

function listOllamaModels() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk.toString());
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const models = (parsed.models || []).map(m => m.name || m.model).filter(Boolean);
          resolve({ ok: true, models });
        } catch (err) {
          resolve({ ok: false, models: [], error: err.message });
        }
      });
    });
    req.on('error', (err) => resolve({ ok: false, models: [], error: err.message }));
    req.setTimeout(1800, () => { req.destroy(); resolve({ ok: false, models: [], error: 'timeout' }); });
  });
}

async function buildTree(root, rel = '', depth = 0) {
  if (depth > 8) return [];
  const dir = path.join(root, rel);
  let entries = await fs.readdir(dir, { withFileTypes: true });
  entries = entries
    .filter(e => !e.name.startsWith('.') || e.name === '.env' || e.name === '.gitignore')
    .filter(e => !(e.isDirectory() && SKIP_DIRS.has(e.name)))
    .sort((a,b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
  const tree = [];
  for (const e of entries.slice(0, 350)) {
    const childRel = path.join(rel, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) tree.push({ name: e.name, path: childRel, type: 'dir', children: await buildTree(root, childRel, depth + 1) });
    else tree.push({ name: e.name, path: childRel, type: 'file' });
  }
  return tree;
}

async function collectFiles(root, rel, files, max) {
  if (files.length >= max) return;
  let entries = [];
  try { entries = await fs.readdir(path.join(root, rel), { withFileTypes: true }); } catch { return; }
  entries.sort((a,b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
  for (const e of entries) {
    if (files.length >= max) break;
    const childRel = path.join(rel, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      await collectFiles(root, childRel, files, max);
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (SKIP_EXTS.has(ext)) continue;
      if (TEXT_EXTS.has(ext) || e.name.includes('.')) files.push(childRel);
    }
  }
}

function startShell(cwd) {
  stopShell();
  shellCwd = cwd || process.env.USERPROFILE || process.cwd();
  const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');
  const args = process.platform === 'win32'
    ? ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass']
    : [];
  shellProc = spawn(shell, args, { cwd: shellCwd, env: process.env, windowsHide: false });
  safeSend('shell:data', `\r\n[LalIA] PowerShell iniciado en: ${shellCwd}\r\n`);
  shellProc.stdout.on('data', d => safeSend('shell:data', d.toString()));
  shellProc.stderr.on('data', d => safeSend('shell:data', d.toString()));
  shellProc.on('exit', code => {
    safeSend('shell:data', `\r\n[LalIA] PowerShell finalizó con código ${code}.\r\n`);
    shellProc = null;
  });
}
function stopShell() {
  if (shellProc) {
    try { shellProc.stdin.write('exit\n'); } catch {}
    try { shellProc.kill(); } catch {}
  }
  shellProc = null;
}

function snapshotCpu() {
  return os.cpus().map(cpu => ({ ...cpu.times }));
}
function cpuPercent(prev, next) {
  let idle = 0, total = 0;
  for (let i = 0; i < next.length; i++) {
    const p = prev[i] || next[i];
    const n = next[i];
    const idleDiff = n.idle - p.idle;
    const totalDiff = Object.keys(n).reduce((sum, k) => sum + (n[k] - p[k]), 0);
    idle += idleDiff;
    total += totalDiff;
  }
  if (!total) return 0;
  return Math.round((1 - idle / total) * 100);
}
function getStats() {
  const current = snapshotCpu();
  const cpu = cpuPercent(lastCpu, current);
  lastCpu = current;
  const total = os.totalmem();
  const free = os.freemem();
  const mem = Math.round(((total - free) / total) * 100);
  return {
    cpu,
    mem,
    ramUsedGb: Number(((total - free) / 1024 / 1024 / 1024).toFixed(1)),
    ramTotalGb: Number((total / 1024 / 1024 / 1024).toFixed(1)),
    platform: os.platform(),
    cwd: shellCwd,
    warnings: [
      cpu >= 90 ? 'CPU alta' : null,
      mem >= 85 ? 'RAM alta' : null,
    ].filter(Boolean)
  };
}
