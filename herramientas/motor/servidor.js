'use strict';
// =====================================================================================
//  Motor de sprites de Taller Cinético: servidor local (solo en este ordenador, 127.0.0.1).
//  Sirve el juego y el editor (http://127.0.0.1:8795/motor/), guarda los ajustes en sprites/ajustes.js
//  y sube o retira imágenes de sprites/. Sin dependencias: «node herramientas/motor/servidor.js» o motor.bat.
// =====================================================================================
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), APP = __dirname, SPR = path.join(ROOT, 'sprites'), PAPELERA = path.join(APP, 'papelera');
const PORT = +process.env.MOTOR_PORT || 8795, AJ_FILE = path.join(SPR, 'ajustes.js'), BORRADOR = path.join(APP, 'borrador.json');
const { execFile } = require('child_process');
const git = args => new Promise((ok, ko) => execFile('git', args, { cwd: ROOT, timeout: 120000, windowsHide: true }, (e, so, se) => e ? ko(new Error((se || e.message).trim())) : ok(so)));
const { writeList } = require(path.join(ROOT, 'sprites-lista.js'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const CABECERA = '// Ajustes de sprites hechos con el Motor de sprites (motor.bat). Lo escribe el motor al pulsar «Guardar»:\n// mejor no editarlo a mano. Lo aplica js/render/motor-ajustes.js.\n';

const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise((ok, ko) => { let n = 0; const ch = []; req.on('data', d => { n += d.length; if (n > 30e6) { ko(new Error('demasiado grande')); req.destroy(); } else ch.push(d); }); req.on('end', () => { try { ok(JSON.parse(Buffer.concat(ch).toString('utf8') || '{}')); } catch (e) { ko(e); } }); });
const inside = (base, p) => { const r = path.resolve(base, p); return r === base || r.startsWith(base + path.sep) ? r : null; };
const okName = s => typeof s === 'string' && /^[a-z0-9_]{1,40}$/.test(s);

function leerAjustes() {
  try { const t = fs.readFileSync(AJ_FILE, 'utf8'), a = t.indexOf('{'), b = t.lastIndexOf('}'); return JSON.parse(t.slice(a, b + 1)); }
  catch (e) { return { v: 1, sprites: {}, suelo: { cats: {}, grounds: {} }, biomas: {} }; }
}
function limpiar(o) { // quita lo vacío para que el archivo quede corto y legible
  if (Array.isArray(o)) return o; if (!o || typeof o !== 'object') return o;
  const r = {}; for (const k in o) { const v = limpiar(o[k]); if (v === undefined || v === null || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length && k !== 'sprites' && k !== 'cats' && k !== 'grounds' && k !== 'biomas' && k !== 'suelo')) continue; r[k] = v; }
  return r;
}

const server = http.createServer(async (req, res) => {
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  // Solo peticiones de esta misma página (nada de otras webs escribiendo en tus archivos)
  if (req.method === 'POST') { const o = req.headers.origin; if (o && o !== `http://127.0.0.1:${PORT}` && o !== `http://localhost:${PORT}`) return send(res, 403, { error: 'origen no permitido' }); }
  try {
    if (p === '/api/ajustes' && req.method === 'GET') return send(res, 200, leerAjustes());
    if (p === '/api/ajustes' && req.method === 'POST') {
      const a = limpiar(await body(req)); if (!a || typeof a !== 'object') return send(res, 400, { error: 'ajustes no válidos' });
      a.v = 1; a.sprites = a.sprites || {}; a.suelo = a.suelo || { cats: {}, grounds: {} }; a.biomas = a.biomas || {};
      fs.writeFileSync(AJ_FILE, CABECERA + 'window.AJUSTES = ' + JSON.stringify(a, null, 1) + ';\n');
      return send(res, 200, { ok: true, archivo: 'sprites/ajustes.js' });
    }
    // Borrador: se guarda solo, a cada rato; el juego no lo ve hasta «Publicar»
    if (p === '/api/borrador' && req.method === 'GET') { try { return send(res, 200, JSON.parse(fs.readFileSync(BORRADOR, 'utf8'))); } catch (e) { return send(res, 200, null); } }
    if (p === '/api/borrador' && req.method === 'POST') { const b = await body(req); if (!b || typeof b.ajustes !== 'object') return send(res, 400, { error: 'borrador no válido' }); fs.writeFileSync(BORRADOR, JSON.stringify({ t: Date.now(), ajustes: b.ajustes })); return send(res, 200, { ok: true, t: Date.now() }); }
    // Publicar: escribe sprites/ajustes.js y sube TODO lo de sprites/ (ajustes e imágenes) a GitHub → llega a la web y a la app
    if (p === '/api/publicar' && req.method === 'POST') {
      const a = limpiar(await body(req)); if (!a || typeof a !== 'object') return send(res, 400, { error: 'ajustes no válidos' });
      a.v = 1; a.sprites = a.sprites || {}; a.suelo = a.suelo || { cats: {}, grounds: {} }; a.biomas = a.biomas || {};
      fs.writeFileSync(AJ_FILE, CABECERA + 'window.AJUSTES = ' + JSON.stringify(a, null, 1) + ';\n'); writeList();
      try { fs.unlinkSync(BORRADOR); } catch (e) { }
      const out = []; let subido = false, nada = false;
      try {
        await git(['rev-parse', '--is-inside-work-tree']);
        await git(['add', '--', 'sprites']); out.push('Preparado: sprites/');
        const st2 = await git(['diff', '--cached', '--name-only']); const files = st2.trim().split('\n').filter(Boolean);
        if (!files.length) { nada = true; out.push('No había cambios nuevos que subir.'); }
        else { await git(['commit', '-m', `Motor de sprites: publicar ${files.length} archivo(s)`]); out.push(`Guardado en el historial: ${files.length} archivo(s).`); await git(['push']); subido = true; out.push('Subido a GitHub: la web se actualiza en unos minutos.'); }
      } catch (e) { out.push('No se pudo subir a GitHub: ' + String(e.message || e).split('\n')[0]); }
      return send(res, 200, { ok: true, archivo: 'sprites/ajustes.js', subido, nada, git: out });
    }
    if (p === '/api/subir' && req.method === 'POST') {
      const b = await body(req); if (!['arboles', 'suelo'].includes(b.carpeta) || !okName(b.nombre)) return send(res, 400, { error: 'carpeta o nombre no válidos (solo a-z, 0-9 y _)' });
      const m = /^data:image\/(png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(b.datos || ''); if (!m) return send(res, 400, { error: 'la imagen debe ser PNG o WEBP' });
      const dir = path.join(SPR, b.carpeta); fs.mkdirSync(dir, { recursive: true });
      let n = 1; const re = new RegExp('^' + b.nombre + '_(\\d+)\\.(png|webp)$'); for (const f of fs.readdirSync(dir)) { const q = re.exec(f); if (q) n = Math.max(n, +q[1] + 1); }
      const file = `${b.nombre}_${n}.${m[1]}`; fs.writeFileSync(path.join(dir, file), Buffer.from(m[2], 'base64')); writeList();
      return send(res, 200, { ok: true, key: `${b.carpeta}/${b.nombre}_${n}` });
    }
    if (p === '/api/reemplazar' && req.method === 'POST') { // imagen editada en el motor: la anterior va a la papelera (se puede recuperar)
      const b = await body(req), k = String(b.key || ''); if (!/^(arboles|suelo)\/[a-z0-9_]+$/.test(k)) return send(res, 400, { error: 'clave no válida' });
      const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(b.datos || ''); if (!m) return send(res, 400, { error: 'la imagen debe ser PNG' });
      const dst = path.join(SPR, k + '.png'), old = ['.png', '.webp'].map(e => path.join(SPR, k + e)).find(f => fs.existsSync(f));
      if (old) { fs.mkdirSync(PAPELERA, { recursive: true }); fs.copyFileSync(old, path.join(PAPELERA, Date.now() + '_' + k.replace('/', '__') + path.extname(old))); if (old !== dst) fs.unlinkSync(old); }
      fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, Buffer.from(m[1], 'base64')); writeList();
      return send(res, 200, { ok: true, key: k });
    }
    if (p === '/api/borrar' && req.method === 'POST') { // no se borra: va a la papelera del motor (se puede recuperar)
      const b = await body(req), k = String(b.key || ''); if (!/^(arboles|suelo)\/[a-z0-9_]+$/.test(k)) return send(res, 400, { error: 'clave no válida' });
      const src = ['.png', '.webp'].map(e => path.join(SPR, k + e)).find(f => fs.existsSync(f)); if (!src) return send(res, 404, { error: 'no existe' });
      fs.mkdirSync(PAPELERA, { recursive: true }); fs.renameSync(src, path.join(PAPELERA, Date.now() + '_' + k.replace('/', '__') + path.extname(src))); writeList();
      return send(res, 200, { ok: true });
    }
    if (p.startsWith('/api/')) return send(res, 404, { error: 'no existe' });
    // archivos: el editor en /motor/, el juego en el resto
    let f;
    if (p === '/' ) { res.writeHead(302, { Location: '/motor/' }); return res.end(); }
    if (p === '/motor' || p.startsWith('/motor/')) f = inside(APP, p.slice(7) || 'index.html'); else f = inside(ROOT, p.slice(1) || 'index.html');
    if (!f) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (f.startsWith(PAPELERA) || path.basename(f).startsWith('.')) { res.writeHead(404); return res.end(); }
    fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end('No encontrado'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
});
writeList();
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Motor de sprites de Taller Cinético`);
  console.log(`  Ábrelo en: http://127.0.0.1:${PORT}/motor/`);
  console.log(`  (cierra esta ventana para apagarlo)\n`);
});
server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `\n  El puerto ${PORT} ya está en uso: el motor ya está abierto → http://127.0.0.1:${PORT}/motor/\n` : e); process.exit(1); });
