'use strict';
// =====================================================================================
//  Recortador de Sprites (Electron). Vigila una carpeta de hojas (por defecto «hojas/» del juego):
//  cada imagen que metes aparece sola y se abre para recortarla, como el Sprite Editor de Unity.
//  Los recortes se guardan como PNG en «sprites/<carpeta>/», donde el juego los usa en lugar del dibujo.
// =====================================================================================
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path'), fs = require('fs');

const GAME = path.resolve(__dirname, '..', '..');
const DEF_IN = path.join(GAME, 'hojas'), SPRITES = path.join(GAME, 'sprites');
const IMG = /\.(png|jpe?g|webp|gif|bmp)$/i;
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp' };

let cfg = {}, win = null, watcher = null;
const cfgFile = () => path.join(app.getPath('userData'), 'config.json');
function loadCfg() { try { cfg = JSON.parse(fs.readFileSync(cfgFile(), 'utf8')) || {}; } catch (e) { cfg = {}; } }
function saveCfg() { try { fs.mkdirSync(path.dirname(cfgFile()), { recursive: true }); fs.writeFileSync(cfgFile(), JSON.stringify(cfg, null, 2)); } catch (e) { } }
const inDir = () => cfg.inDir || DEF_IN;
// Carpeta de salida: una de las del juego (sprites/objetos…) o una que elijas
const outDir = target => target && target.startsWith('custom:') ? target.slice(7) : path.join(SPRITES, target || 'objetos');

// Solo nombres de archivo sencillos: nada de rutas ni caracteres raros
const safeName = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9_\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'sprite';
const inFolder = (dir, f) => { const p = path.resolve(dir, path.basename(f)); return p.startsWith(path.resolve(dir) + path.sep) ? p : null; };

function listFiles() {
  const d = inDir(); fs.mkdirSync(d, { recursive: true });
  return fs.readdirSync(d).filter(f => IMG.test(f)).map(f => {
    const st = fs.statSync(path.join(d, f));
    return { name: f, mtime: st.mtimeMs, size: st.size, done: fs.existsSync(path.join(d, f + '.recortes.json')) };
  }).sort((a, b) => b.mtime - a.mtime);
}
// Avisa a la ventana cuando una imagen aparece, cambia o se borra (espera a que se termine de copiar)
const pend = new Map();
function watch() {
  try { if (watcher) watcher.close(); } catch (e) { }
  const d = inDir(); fs.mkdirSync(d, { recursive: true });
  try {
    watcher = fs.watch(d, (ev, f) => {
      if (!f || !IMG.test(f)) return;
      clearTimeout(pend.get(f));
      pend.set(f, setTimeout(() => {
        pend.delete(f); const p = path.join(d, f), exists = fs.existsSync(p);
        if (win && !win.isDestroyed()) win.webContents.send('folder-changed', { file: f, exists, files: listFiles() });
      }, 500));
    });
  } catch (e) { watcher = null; }
}
// Nombres válidos del juego (sprites/NOMBRES.txt), por carpeta, para sugerirlos al nombrar
function gameNames() {
  const out = {}; let cur = null;
  try {
    for (const line of fs.readFileSync(path.join(SPRITES, 'NOMBRES.txt'), 'utf8').split(/\r?\n/)) {
      const h = line.match(/^##\s+([a-z]+)\//); if (h) { cur = h[1]; out[cur] = out[cur] || []; continue; }
      const m = cur && line.match(/^([a-z0-9_]+)\.png(?:\s+\(o\s+([A-Za-z0-9_]+)\.png\))?/); if (m) out[cur].push(m[1]);
    }
  } catch (e) { }
  return out;
}
function state() { return { inDir: inDir(), spritesDir: SPRITES, files: listFiles(), names: gameNames(), lastTarget: cfg.lastTarget || 'objetos', customOut: cfg.customOut || '' }; }

ipcMain.handle('state', () => state());
ipcMain.handle('read-image', (e, name) => {
  const p = inFolder(inDir(), name); if (!p || !fs.existsSync(p)) return null;
  return 'data:' + (MIME[path.extname(p).toLowerCase()] || 'image/png') + ';base64,' + fs.readFileSync(p).toString('base64');
});
ipcMain.handle('load-meta', (e, name) => { const p = inFolder(inDir(), name + '.recortes.json'); try { return p && JSON.parse(fs.readFileSync(p, 'utf8')); } catch (er) { return null; } });
ipcMain.handle('choose-in', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Carpeta que vigila el recortador', properties: ['openDirectory', 'createDirectory'], defaultPath: inDir() });
  if (!r.canceled && r.filePaths[0]) { cfg.inDir = r.filePaths[0]; saveCfg(); watch(); }
  return state();
});
ipcMain.handle('reset-in', () => { delete cfg.inDir; saveCfg(); watch(); return state(); });
ipcMain.handle('choose-out', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Carpeta donde guardar los recortes', properties: ['openDirectory', 'createDirectory'], defaultPath: cfg.customOut || SPRITES });
  if (!r.canceled && r.filePaths[0]) { cfg.customOut = r.filePaths[0]; saveCfg(); return r.filePaths[0]; }
  return null;
});
ipcMain.handle('open-folder', (e, which, target) => { const d = which === 'in' ? inDir() : outDir(target); fs.mkdirSync(d, { recursive: true }); return shell.openPath(d); });
ipcMain.handle('add-images', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Añadir hojas de sprites', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }] });
  if (r.canceled) return null; const d = inDir(); fs.mkdirSync(d, { recursive: true }); let last = null;
  for (const f of r.filePaths) { const to = path.join(d, path.basename(f)); if (path.resolve(f) !== path.resolve(to)) fs.copyFileSync(f, to); last = path.basename(f); }
  return last;
});
// Guarda los recortes (PNG) y el archivo de recortes de la hoja (para volver a abrirla tal cual)
ipcMain.handle('export', (e, job) => {
  const dir = outDir(job.target); fs.mkdirSync(dir, { recursive: true });
  const written = [], skipped = [];
  for (const s of job.sprites || []) {
    // «caminar/derecha» → subcarpeta caminar/derecha.png (cada parte, un nombre sencillo)
    const segs = String(s.name || '').split('/').map(safeName).filter(Boolean).slice(-3), file = segs.join('/') + '.png';
    const p = path.resolve(dir, ...segs.slice(0, -1), segs[segs.length - 1] + '.png'); if (!p.startsWith(path.resolve(dir) + path.sep)) continue;
    if (fs.existsSync(p) && !job.overwrite) { skipped.push(file); continue; }
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, Buffer.from(String(s.data).replace(/^data:image\/png;base64,/, ''), 'base64')); written.push(file);
  }
  const mp = inFolder(inDir(), job.sheet + '.recortes.json'); if (mp) fs.writeFileSync(mp, JSON.stringify(job.meta, null, 1));
  cfg.lastTarget = job.target; saveCfg();
  // El juego carga los sprites de la lista: se rehace aquí para que salgan al recargar
  let listed = false;
  try { const sl = path.join(GAME, 'sprites-lista.js'); if (dir.startsWith(SPRITES) && fs.existsSync(sl)) { delete require.cache[require.resolve(sl)]; require(sl).writeList(); listed = true; } } catch (er) { }
  return { dir, written, skipped, listed };
});
// Imagen soltada sobre la ventana: se copia a la carpeta vigilada
ipcMain.handle('save-dropped', (e, name, dataUrl) => {
  const m = String(dataUrl || '').match(/^data:image\/(png|jpeg|webp|gif|bmp);base64,(.+)$/); if (!m) return false;
  const ext = path.extname(name) && IMG.test(name) ? path.extname(name) : '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
  const p = inFolder(inDir(), safeName(path.basename(name, path.extname(name))) + ext.toLowerCase()); if (!p) return false;
  fs.mkdirSync(inDir(), { recursive: true }); fs.writeFileSync(p, Buffer.from(m[2], 'base64')); return path.basename(p);
});
ipcMain.handle('save-meta',(e, sheet, meta) => { const mp = inFolder(inDir(), sheet + '.recortes.json'); if (mp) fs.writeFileSync(mp, JSON.stringify(meta, null, 1)); return true; });

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 860, minWidth: 900, minHeight: 560, backgroundColor: '#15161a', title: 'Recortador de Sprites', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  // Ningún enlace abre ventanas nuevas dentro de la app
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', ev => ev.preventDefault());
  // Errores de la ventana, a la consola (para poder arreglarlos)
  win.webContents.on('console-message', (ev, level, message, line, src) => { if (level >= 2) console.error(`[ventana] ${message} (${path.basename(src || '')}:${line})`); });
  win.webContents.on('render-process-gone', (ev, d) => console.error('[ventana] se cerró:', d.reason));
  // Prueba rápida: RC_SMOKE=1 abre, comprueba que todo cargó y se cierra
  if (process.env.RC_SMOKE) win.webContents.once('did-finish-load', () => setTimeout(async () => {
    try { console.log('[prueba]', JSON.stringify(await win.webContents.executeJavaScript(process.env.RC_SMOKE_JS || `({ file: S.cur && S.cur.name, size: S.cur && [S.cur.w, S.cur.h], files: S.files.length, rects: S.rects.length })`))); } catch (er) { console.error('[prueba] fallo:', er.message); }
    if (process.env.RC_SHOT) { await new Promise(r => setTimeout(r, 600)); fs.writeFileSync(process.env.RC_SHOT, (await win.webContents.capturePage()).toPNG()); }
    win.webContents.removeAllListeners('will-prevent-unload'); app.exit(0);
  }, +process.env.RC_SMOKE_MS || 2500));
  // Cerrar con cambios sin exportar: se pregunta
  win.webContents.on('will-prevent-unload', ev => {
    const r = dialog.showMessageBoxSync(win, { type: 'question', buttons: ['Cerrar sin exportar', 'Cancelar'], defaultId: 1, cancelId: 1, title: 'Recortador de Sprites', message: 'Hay recortes sin exportar.', detail: '¿Cerrar y perder los cambios?' });
    if (r === 0) ev.preventDefault();
  });
}
app.whenReady().then(() => { loadCfg(); watch(); createWindow(); });
app.on('window-all-closed', () => app.quit());
