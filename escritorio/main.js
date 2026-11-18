'use strict';
// =====================================================================================
//  Taller Cinético para escritorio (Electron).
//   · Con internet abre el juego de Render: el mismo que en la web, con multijugador, cuentas,
//     Discord y mundos en la nube, y siempre la última versión sin reinstalar nada.
//   · Sin internet (o si el servidor no despierta) abre la copia que trae dentro: Un jugador.
//   · Rendimiento: GPU de alto rendimiento, sin frenar el juego en segundo plano y sin que
//     Windows suspenda la app; los FPS van a la frecuencia de tu monitor (60, 144, 240 Hz…).
// =====================================================================================
const { app, BrowserWindow, protocol, net, ipcMain, shell, powerSaveBlocker, Menu } = require('electron');
const path = require('path'), fs = require('fs');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const WEB = 'https://taller-cinetico.onrender.com';
const GAME_DIR = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..');

// ---------- Todos los FPS ----------
app.commandLine.appendSwitch('force_high_performance_gpu');      // la gráfica potente en portátiles con dos
app.commandLine.appendSwitch('ignore-gpu-blocklist');            // aceleración aunque la gráfica esté en la lista negra
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-renderer-backgrounding');  // no bajar prioridad al quitar el foco
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();

let win = null, mode = 'splash', waking = null;
const allowed = u => { try { const h = new URL(u); return h.origin === WEB || h.protocol === 'app:' || h.protocol === 'file:' || /(^|\.)discord\.com$/.test(h.hostname); } catch (e) { return false; } };

function createWindow() {
  win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 960, minHeight: 600, backgroundColor: '#120d10', show: false, title: 'Taller Cinético',
    icon: path.join(__dirname, 'build', 'icon.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false, contextIsolation: true, sandbox: true, spellcheck: false },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => { win.show(); win.focus(); });
  // Enlaces de fuera del juego, al navegador normal
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!allowed(url)) { e.preventDefault(); shell.openExternal(url); } });
  // F11 pantalla completa · Ctrl+R recargar · Ctrl+Shift+I herramientas
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (i.control && i.key.toLowerCase() === 'r') { win.webContents.reload(); e.preventDefault(); }
    if (i.control && i.shift && i.key.toLowerCase() === 'i') { win.webContents.toggleDevTools(); e.preventDefault(); }
  });
  // La página de Render no carga (sin internet, servidor caído): copia local
  win.webContents.on('did-fail-load', (e, code, desc, url, main) => { if (main && mode === 'online' && code !== -3) goOffline(); });
  win.on('closed', () => { win = null; });
  // Prueba automática (TC_SNAP=ruta.png): mide FPS y guarda una captura del juego, y se cierra
  if (process.env.TC_SNAP) win.webContents.on('did-finish-load', () => { if (mode === 'splash') return; setTimeout(async () => {
    const fps = await win.webContents.executeJavaScript('new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / 2)); }; requestAnimationFrame(f); })');
    const img = await win.webContents.capturePage(); require('fs').writeFileSync(process.env.TC_SNAP, img.toPNG());
    console.log('TC_SNAP', JSON.stringify({ mode, fps, url: win.webContents.getURL(), desktop: await win.webContents.executeJavaScript('!!window.TC_DESKTOP') })); app.quit(); }, 6000); });
  win.loadFile(path.join(__dirname, 'splash.html'));
  wake();
}

// Despierta el servidor de Render (el plan gratis se duerme) y entra en cuanto responde
async function wake() {
  const id = waking = Symbol(), t0 = Date.now();
  if (process.env.TC_OFFLINE) return goOffline();
  while (waking === id && win) {
    const left = Math.max(0, 75 - Math.round((Date.now() - t0) / 1000));
    status(left > 0 ? `Conectando con el servidor… (${left} s)` : 'El servidor no responde', left);
    try { const r = await net.fetch(WEB + '/api/info', { cache: 'no-store', signal: AbortSignal.timeout(8000) }); if (r.ok) { if (waking === id) goOnline(); return; } } catch (e) { }
    if (Date.now() - t0 > 75000) { if (waking === id) goOffline(); return; }
    await new Promise(r => setTimeout(r, 1500));
  }
}
function status(text, left) { if (win && mode === 'splash') win.webContents.send('tc-status', { text, left }); }
function goOnline() { waking = null; mode = 'online'; win && win.loadURL(WEB + '/'); }
function goOffline() { waking = null; mode = 'offline'; win && win.loadURL('app://game/index.html'); }
ipcMain.on('tc-offline', () => goOffline());
ipcMain.on('tc-online', () => { if (!win) return; mode = 'splash'; win.loadFile(path.join(__dirname, 'splash.html')).then(wake); });
ipcMain.on('tc-full', () => { if (win) win.setFullScreen(!win.isFullScreen()); });
ipcMain.handle('tc-info', () => ({ mode, version: app.getVersion() }));

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  // El nombre lleva tilde y Electron lo mete en el User-Agent: sin esto fallan las peticiones
  app.userAgentFallback = app.userAgentFallback.normalize('NFD').replace(/[^\x20-\x7e]/g, '');
  // La copia que trae la app: app://game/… → archivos del juego (solo dentro de su carpeta)
  protocol.handle('app', req => {
    const u = new URL(req.url), rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.normalize(path.join(GAME_DIR, rel));
    if (!f.startsWith(GAME_DIR + path.sep)) return new Response('No encontrado', { status: 404 });
    try { return new Response(fs.readFileSync(f), { headers: { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' } }); }
    catch (e) { return new Response('No encontrado', { status: 404 }); }
  });
  powerSaveBlocker.start('prevent-app-suspension');
  createWindow();
});
app.on('window-all-closed', () => app.quit());
