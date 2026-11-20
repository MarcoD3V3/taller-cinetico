'use strict';
// =====================================================================================
//  Recortador de Sprites — la ventana. Una hoja abierta + sus recortes (rectángulos en píxeles).
//  Recorte automático (islas de píxeles visibles), por cuadrícula, o a mano con asas como en Unity.
// =====================================================================================
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const S = {
  files: [], names: {}, inDir: '', cur: null, rects: [], sel: null, anims: [], asel: null, dirty: false, saved: '',
  hist: [], fut: [], view: { z: 1, ox: 0, oy: 0 }, seen: new Set(), customOut: '',
};
let uid = 1, drag = null, space = false, mouseImg = null, raf = 0;

// ---------- Utilidades ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const baseName = f => f.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9_\-]+/g, '_').replace(/^_+|_+$/g, '') || 'sprite';
const slug1 = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9_\-]+/g, '_').replace(/^_+|_+$/g, '');
const slug = s => String(s || '').split('/').map(slug1).filter(Boolean).slice(-3).join('/'); // «caminar/derecha» vale (subcarpeta)
// Estado que se guarda y se deshace: recortes (con pivote y bordes) y animaciones
const snap = () => JSON.stringify({ r: S.rects.map(({ id, name, x, y, w, h, px, py, b }) => ({ id, name, x, y, w, h, px, py, b })), a: S.anims });
const mkRect = (o = {}) => ({ id: uid++, name: nextName(), px: 0.5, py: 0.5, b: [0, 0, 0, 0], ...o });
function fixUid() { for (const r of S.rects) uid = Math.max(uid, (r.id | 0) + 1); for (const a of S.anims) uid = Math.max(uid, (a.id | 0) + 1); }
// Fotogramas de recortes que ya no existen: fuera
function prune() { const ids = new Set(S.rects.map(r => r.id)); for (const a of S.anims) a.frames = a.frames.filter(id => ids.has(id)); }
const selRect = () => S.rects.find(r => r.id === S.sel) || null;
const num = id => { const v = parseInt($(id).value, 10); return Number.isFinite(v) ? v : 0; };
let toastT = 0;
function toast(msg, kind = '', btn = null) {
  const t = $('toast'); $('toastMsg').textContent = msg; t.className = 'show ' + kind;
  const b = $('toastBtn'); b.hidden = !btn; if (btn) { b.textContent = btn.label; b.onclick = () => { t.className = ''; btn.fn(); }; }
  clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, btn ? 9000 : 3200);
}
function req() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }

// ---------- Historial ----------
function commit(before) { if (before === snap()) return; S.hist.push(before); if (S.hist.length > 200) S.hist.shift(); S.fut = []; changed(); }
function undo() { if (!S.hist.length) return; S.fut.push(snap()); load(S.hist.pop()); changed(); }
function redo() { if (!S.fut.length) return; S.hist.push(snap()); load(S.fut.pop()); changed(); }
function load(json) {
  const o = JSON.parse(json); S.rects = o.r.map(r => ({ ...r, b: [...(r.b || [0, 0, 0, 0])] })); S.anims = o.a.map(a => ({ ...a, frames: [...a.frames] })); fixUid();
  if (!selRect()) S.sel = null; if (!S.anims.find(a => a.id === S.asel)) S.asel = S.anims[0] ? S.anims[0].id : null;
}
function changed() { S.dirty = snap() !== S.saved; refreshList(); refreshSel(); refreshStatus(); refreshAnim(); req(); }

// ---------- Archivos ----------
async function init() {
  const st = await rc.state(); applyState(st);
  $('eTarget').value = st.lastTarget && st.lastTarget.startsWith('custom:') ? 'custom' : (st.lastTarget || 'objetos');
  S.customOut = st.customOut || ''; fillNames();
  for (const f of S.files) S.seen.add(f.name);
  if (S.files[0]) openFile(S.files[0].name);
}
function applyState(st) { S.files = st.files; S.names = st.names || S.names; S.inDir = st.inDir; $('inPath').textContent = st.inDir; $('inPath').title = st.inDir; renderFiles(); }
function renderFiles() {
  const L = $('fileList'); $('fCount').textContent = S.files.length || '';
  if (!S.files.length) { L.innerHTML = '<div class="empty">No hay imágenes todavía. Mete un PNG en la carpeta vigilada.</div>'; return; }
  L.innerHTML = '';
  for (const f of S.files) {
    const d = document.createElement('div'); d.className = 'file' + (S.cur && S.cur.name === f.name ? ' on' : '');
    d.innerHTML = `<div class="th"><img alt=""></div><div><b></b><small></small></div>`;
    d.querySelector('b').textContent = f.name;
    d.querySelector('small').innerHTML = f.done ? 'recortada' : '<span class="new">● nueva</span>';
    d.title = f.name; d.onclick = () => openFile(f.name);
    L.append(d);
    rc.readImage(f.name).then(u => { if (u) d.querySelector('img').src = u; });
  }
}
async function openFile(name, keepRects = false) {
  if (S.dirty && S.cur && S.cur.name !== name && !confirm(`Hay cambios sin exportar en «${S.cur.name}». ¿Abrir otra hoja y perderlos?`)) return;
  const url = await rc.readImage(name); if (!url) { toast('No se pudo leer ' + name, 'bad'); return; }
  const img = new Image(); img.src = url; await img.decode().catch(() => { });
  if (!img.naturalWidth) { toast('No es una imagen válida: ' + name, 'bad'); return; }
  const w = img.naturalWidth, h = img.naturalHeight, oc = document.createElement('canvas'); oc.width = w; oc.height = h;
  const g = oc.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const same = S.cur && S.cur.name === name;
  S.cur = { name, img, w, h, data: g.getImageData(0, 0, w, h), base: baseName(name) };
  if (!(keepRects && same)) {
    const meta = await rc.loadMeta(name);
    const num0 = (v, d) => Number.isFinite(+v) ? +v : d;
    S.rects = (meta && Array.isArray(meta.rects) ? meta.rects : []).map(r => ({ id: r.id | 0 || 0, name: slug(r.name) || 'sprite', x: r.x | 0, y: r.y | 0, w: Math.max(1, r.w | 0), h: Math.max(1, r.h | 0), px: num0(r.px, 0.5), py: num0(r.py, 0.5), b: Array.isArray(r.b) ? r.b.map(v => v | 0) : [0, 0, 0, 0] }));
    for (const r of S.rects) if (!r.id) r.id = uid++;
    S.anims = (meta && Array.isArray(meta.anims) ? meta.anims : []).map(a => ({ id: a.id | 0 || uid++, name: slug(a.name) || 'animacion', fps: clamp(a.fps | 0 || 8, 1, 60), loop: a.loop !== false, ping: !!a.ping, frames: (a.frames || []).map(v => v | 0) }));
    fixUid(); prune(); S.asel = S.anims[0] ? S.anims[0].id : null;
    if (meta && meta.target) { $('eTarget').value = meta.target.startsWith('custom:') ? 'custom' : meta.target; if (meta.target.startsWith('custom:')) S.customOut = meta.target.slice(7); fillNames(); }
    S.saved = snap(); S.hist = []; S.fut = []; S.sel = null;
    fit();
  }
  $('drop').hidden = true; renderFiles(); changed();
}
// La carpeta cambió: imagen nueva → se abre sola (si no hay cambios a medias); la abierta cambió → se recarga
rc.onFolderChanged(async d => {
  S.files = d.files; renderFiles();
  if (!d.exists) { if (S.cur && S.cur.name === d.file) toast(`«${d.file}» se ha borrado de la carpeta`, 'bad'); return; }
  const isNew = !S.seen.has(d.file); S.seen.add(d.file);
  if (S.cur && S.cur.name === d.file) { await openFile(d.file, true); toast(`«${d.file}» ha cambiado: recargada (los recortes se mantienen)`); return; }
  if (!isNew) return;
  if (!S.dirty) { await openFile(d.file); toast(`Nueva imagen: «${d.file}». Pulsa ✂ Recortar para separarla`, 'ok'); }
  else toast(`Nueva imagen: «${d.file}»`, 'ok', { label: 'Abrir', fn: () => openFile(d.file) });
});

// ---------- Vista ----------
function resize() { const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1; cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); req(); }
new ResizeObserver(resize).observe($('stage'));
function fit() {
  if (!S.cur) return; const r = cv.getBoundingClientRect(), pad = 40;
  let z = Math.min((r.width - pad * 2) / S.cur.w, (r.height - pad * 2) / S.cur.h); z = z >= 1 ? Math.floor(z * 4) / 4 : z;
  S.view.z = clamp(z, 0.05, 64); S.view.ox = (r.width - S.cur.w * S.view.z) / 2; S.view.oy = (r.height - S.cur.h * S.view.z) / 2; refreshStatus(); req();
}
function zoomAt(f, cx, cy) {
  const v = S.view, z = clamp(v.z * f, 0.05, 64); if (cx === undefined) { const r = cv.getBoundingClientRect(); cx = r.width / 2; cy = r.height / 2; }
  v.ox = cx - (cx - v.ox) * z / v.z; v.oy = cy - (cy - v.oy) * z / v.z; v.z = z; refreshStatus(); req();
}
const toImg = e => { const r = cv.getBoundingClientRect(), v = S.view; return { x: (e.clientX - r.left - v.ox) / v.z, y: (e.clientY - r.top - v.oy) / v.z, sx: e.clientX - r.left, sy: e.clientY - r.top }; };
const scr = (x, y) => ({ x: S.view.ox + x * S.view.z, y: S.view.oy + y * S.view.z });

// ---------- Dibujo ----------
let checker = null;
function draw() {
  const dpr = devicePixelRatio || 1; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  if (!S.cur) return;
  const v = S.view, { w, h } = S.cur;
  if (!checker) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#26282e'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#1c1e23'; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8); checker = ctx.createPattern(c, 'repeat'); }
  ctx.fillStyle = checker; ctx.fillRect(Math.round(v.ox * dpr), Math.round(v.oy * dpr), Math.round(w * v.z * dpr), Math.round(h * v.z * dpr));
  ctx.setTransform(dpr * v.z, 0, 0, dpr * v.z, dpr * v.ox, dpr * v.oy); ctx.imageSmoothingEnabled = false; ctx.drawImage(S.cur.img, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Rejilla de píxeles con mucho zoom
  if (v.z >= 10) {
    ctx.strokeStyle = '#ffffff10'; ctx.lineWidth = 1; ctx.beginPath();
    const r = cv.getBoundingClientRect(), x0 = Math.max(0, Math.floor(-v.ox / v.z)), x1 = Math.min(w, Math.ceil((r.width - v.ox) / v.z)), y0 = Math.max(0, Math.floor(-v.oy / v.z)), y1 = Math.min(h, Math.ceil((r.height - v.oy) / v.z));
    for (let x = x0; x <= x1; x++) { const s = Math.round(v.ox + x * v.z) + 0.5; ctx.moveTo(s, v.oy + y0 * v.z); ctx.lineTo(s, v.oy + y1 * v.z); }
    for (let y = y0; y <= y1; y++) { const s = Math.round(v.oy + y * v.z) + 0.5; ctx.moveTo(v.ox + x0 * v.z, s); ctx.lineTo(v.ox + x1 * v.z, s); }
    ctx.stroke();
  }
  const dupes = dupNames();
  ctx.font = '11px Segoe UI, sans-serif'; ctx.textBaseline = 'bottom';
  for (const r of S.rects) {
    const a = scr(r.x, r.y), on = r.id === S.sel, bw = r.w * v.z, bh = r.h * v.z;
    ctx.fillStyle = on ? '#4ad0ff1a' : '#ffb04a0d'; ctx.fillRect(a.x, a.y, bw, bh);
    ctx.lineWidth = on ? 2 : 1; ctx.strokeStyle = dupes.has(r.name) ? '#ff6b5b' : on ? '#4ad0ff' : '#ffb04acc';
    ctx.strokeRect(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5, Math.round(bw) - 1, Math.round(bh) - 1);
    if (bw > 34 && (on || v.z * Math.min(r.w, r.h) > 40)) { const t = r.name; const tw = ctx.measureText(t).width + 8; ctx.fillStyle = on ? '#4ad0ffdd' : '#000000aa'; ctx.fillRect(a.x, a.y - 15, Math.min(tw, Math.max(bw, 60)), 15); ctx.fillStyle = on ? '#08131a' : '#e8e4dc'; ctx.fillText(t, a.x + 4, a.y - 2, Math.max(bw, 60) - 8); }
  }
  const s = selRect();
  if (s) {
    // Bordes 9-slice (verde) y pivote (círculo azul)
    const a = scr(s.x, s.y), z = v.z, [bl, bt, br, bb] = s.b;
    ctx.strokeStyle = '#6be08acc'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.beginPath();
    if (bl) { const x = Math.round(a.x + bl * z) + 0.5; ctx.moveTo(x, a.y); ctx.lineTo(x, a.y + s.h * z); }
    if (br) { const x = Math.round(a.x + (s.w - br) * z) + 0.5; ctx.moveTo(x, a.y); ctx.lineTo(x, a.y + s.h * z); }
    if (bt) { const y = Math.round(a.y + bt * z) + 0.5; ctx.moveTo(a.x, y); ctx.lineTo(a.x + s.w * z, y); }
    if (bb) { const y = Math.round(a.y + (s.h - bb) * z) + 0.5; ctx.moveTo(a.x, y); ctx.lineTo(a.x + s.w * z, y); }
    ctx.stroke(); ctx.setLineDash([]);
    const pvx = a.x + s.px * s.w * z, pvy = a.y + s.py * s.h * z;
    ctx.beginPath(); ctx.arc(pvx, pvy, 5, 0, Math.PI * 2); ctx.strokeStyle = '#08131a'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#4ad0ff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  if (s) for (const hd of handles(s)) { ctx.fillStyle = '#4ad0ff'; ctx.fillRect(hd.x - 4, hd.y - 4, 8, 8); ctx.strokeStyle = '#08131a'; ctx.lineWidth = 1; ctx.strokeRect(hd.x - 3.5, hd.y - 3.5, 7, 7); }
  if (drag && drag.mode === 'new' && drag.big) { const r = normRect(drag.p0, drag.p1), a = scr(r.x, r.y); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#4ad0ff'; ctx.lineWidth = 1; ctx.strokeRect(a.x + 0.5, a.y + 0.5, r.w * v.z, r.h * v.z); ctx.setLineDash([]); }
}
function handles(r) {
  const a = scr(r.x, r.y), b = scr(r.x + r.w, r.y + r.h), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  return [{ k: 'nw', x: a.x, y: a.y }, { k: 'n', x: mx, y: a.y }, { k: 'ne', x: b.x, y: a.y }, { k: 'e', x: b.x, y: my }, { k: 'se', x: b.x, y: b.y }, { k: 's', x: mx, y: b.y }, { k: 'sw', x: a.x, y: b.y }, { k: 'w', x: a.x, y: my }];
}
const CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
function hitHandle(r, p) { for (const h of handles(r)) if (Math.abs(h.x - p.sx) <= 6 && Math.abs(h.y - p.sy) <= 6) return h.k; return null; }
function rectAt(p) { let best = null; for (const r of S.rects) if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h && (!best || r.w * r.h < best.w * best.h)) best = r; return best; }
function normRect(a, b) { const x0 = clamp(Math.floor(Math.min(a.x, b.x)), 0, S.cur.w), y0 = clamp(Math.floor(Math.min(a.y, b.y)), 0, S.cur.h), x1 = clamp(Math.ceil(Math.max(a.x, b.x)), 0, S.cur.w), y1 = clamp(Math.ceil(Math.max(a.y, b.y)), 0, S.cur.h); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }

// ---------- Ratón ----------
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { e.preventDefault(); if (!S.cur) return; const p = toImg(e); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.sx, p.sy); }, { passive: false });
cv.addEventListener('mousedown', e => {
  if (!S.cur) return; const p = toImg(e);
  if (e.button === 1 || e.button === 2 || (e.button === 0 && space)) { drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, ox: S.view.ox, oy: S.view.oy }; cv.style.cursor = 'grabbing'; return; }
  if (e.button !== 0) return;
  const s = selRect(), hk = s && hitHandle(s, p);
  if (hk) { drag = { mode: 'resize', k: hk, r: s, st: { ...s }, before: snap() }; return; }
  const hit = rectAt(p);
  if (hit) { S.sel = hit.id; drag = { mode: 'move', r: hit, st: { ...hit }, p0: p, before: snap() }; refreshSel(); refreshList(); req(); return; }
  S.sel = null; drag = { mode: 'new', p0: p, p1: p, big: false }; refreshSel(); refreshList(); req();
});
addEventListener('mousemove', e => {
  if (!S.cur) return; const p = toImg(e); mouseImg = p;
  $('stPos').textContent = p.x >= 0 && p.y >= 0 && p.x < S.cur.w && p.y < S.cur.h ? `x ${Math.floor(p.x)} · y ${Math.floor(p.y)}` : '';
  if (!drag) { const s = selRect(), hk = s && e.target === cv && hitHandle(s, p); cv.style.cursor = space ? 'grab' : hk ? CURSOR[hk] : (e.target === cv && rectAt(p) ? 'move' : 'crosshair'); return; }
  if (drag.mode === 'pan') { S.view.ox = drag.ox + e.clientX - drag.sx; S.view.oy = drag.oy + e.clientY - drag.sy; req(); return; }
  if (drag.mode === 'new') { drag.p1 = p; if (Math.hypot((p.x - drag.p0.x) * S.view.z, (p.y - drag.p0.y) * S.view.z) > 3) drag.big = true; req(); return; }
  if (drag.mode === 'move') {
    const r = drag.r, st = drag.st; r.x = clamp(Math.round(st.x + p.x - drag.p0.x), 0, S.cur.w - r.w); r.y = clamp(Math.round(st.y + p.y - drag.p0.y), 0, S.cur.h - r.h); refreshSel(); req(); return;
  }
  if (drag.mode === 'resize') {
    const r = drag.r, st = drag.st, k = drag.k, px = clamp(Math.round(p.x), 0, S.cur.w), py = clamp(Math.round(p.y), 0, S.cur.h);
    let x0 = st.x, y0 = st.y, x1 = st.x + st.w, y1 = st.y + st.h;
    if (k.includes('w')) x0 = Math.min(px, x1 - 1); if (k.includes('e')) x1 = Math.max(px, x0 + 1);
    if (k.includes('n')) y0 = Math.min(py, y1 - 1); if (k.includes('s')) y1 = Math.max(py, y0 + 1);
    Object.assign(r, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }); refreshSel(); req();
  }
});
addEventListener('mouseup', () => {
  if (!drag) return; const d = drag; drag = null; cv.style.cursor = '';
  if (d.mode === 'new' && d.big) {
    const r = normRect(d.p0, d.p1); if (r.w >= 1 && r.h >= 1) { const before = snap(); const nr = mkRect(r); S.rects.push(nr); S.sel = nr.id; commit(before); }
  } else if (d.mode === 'move' || d.mode === 'resize') commit(d.before);
  req();
});
addEventListener('keydown', e => { if (e.code === 'Space' && !isTyping(e)) { space = true; if (!drag) cv.style.cursor = 'grab'; e.preventDefault(); } });
addEventListener('keyup', e => { if (e.code === 'Space') { space = false; cv.style.cursor = ''; } });
// Soltar una imagen sobre la ventana: se copia a la carpeta vigilada (y se abre sola)
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', async e => {
  e.preventDefault(); const files = [...(e.dataTransfer && e.dataTransfer.files || [])].filter(f => /^image\//.test(f.type)); if (!files.length) return;
  for (const f of files) { const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(f); }); await rc.saveDropped(f.name, url); }
});

// ---------- Teclado ----------
const isTyping = e => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA'); };
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); doExport(); return; }
  if (isTyping(e)) { if (k === 'enter') e.target.blur(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'a') { e.preventDefault(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); dupSel(); return; }
  if (k === 'f') { fit(); return; }
  if (k === 'p') { togglePlay(); return; }
  if (k === 'a') { addFrames([S.sel]); return; }
  if (k === '1') { zoomAt(1 / S.view.z); return; }
  if (k === '+' || k === '=') { zoomAt(1.25); return; }
  if (k === '-') { zoomAt(0.8); return; }
  if (k === 'escape') { S.sel = null; refreshSel(); refreshList(); req(); return; }
  if (k === 'tab' && S.rects.length) { e.preventDefault(); const i = S.rects.findIndex(r => r.id === S.sel), n = S.rects.length; S.sel = S.rects[((i < 0 ? -1 : i) + (e.shiftKey ? n - 1 : 1)) % n].id; refreshSel(); refreshList(); req(); return; }
  const s = selRect(); if (!s) return;
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); delSel(); return; }
  const st = e.shiftKey ? 10 : 1, dir = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
  if (dir) {
    e.preventDefault(); const before = snap();
    if (e.altKey) { s.w = clamp(s.w + dir[0] * st, 1, S.cur.w - s.x); s.h = clamp(s.h + dir[1] * st, 1, S.cur.h - s.y); }
    else { s.x = clamp(s.x + dir[0] * st, 0, S.cur.w - s.w); s.y = clamp(s.y + dir[1] * st, 0, S.cur.h - s.h); }
    commit(before);
  }
});
function delSel() { const before = snap(); const i = S.rects.findIndex(r => r.id === S.sel); if (i < 0) return; S.rects.splice(i, 1); S.sel = S.rects[Math.min(i, S.rects.length - 1)] ? S.rects[Math.min(i, S.rects.length - 1)].id : null; prune(); commit(before); }
function dupSel() { const s = selRect(); if (!s) return; const before = snap(); const n = mkRect({ x: clamp(s.x + 4, 0, S.cur.w - s.w), y: clamp(s.y + 4, 0, S.cur.h - s.h), w: s.w, h: s.h, px: s.px, py: s.py, b: [...s.b] }); S.rects.push(n); S.sel = n.id; commit(before); }

// ---------- Recortar ----------
const alphaAt = (x, y) => S.cur.data.data[(y * S.cur.w + x) * 4 + 3];
// Caja de lo visible dentro de r (o null si está vacía)
function contentBox(r, thr) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (alphaAt(x, y) >= thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
// Islas de píxeles visibles (8 vecinos); las cercanas se unen (chispas, auras…)
function autoBoxes(thr, merge, minArea, pad, spark) {
  const { w, h } = S.cur, d = S.cur.data.data, seen = new Uint8Array(w * h), boxes = [], stack = new Int32Array(w * h);
  // Dos píxeles visibles a menos de «merge» píxeles de hueco cuentan como la misma pieza (distancia real, no por cajas)
  const R = Math.min(8, merge + 1);
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || d[i * 4 + 3] < thr) continue;
    let sp = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0; stack[sp++] = i; seen[i] = 1;
    while (sp) {
      const j = stack[--sp], x = j % w, y = (j / w) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx; if (!seen[q] && d[q * 4 + 3] >= thr) { seen[q] = 1; stack[sp++] = q; }
      }
    }
    boxes.push({ x0, y0, x1, y1, n });
  }
  const gap = (A, B) => Math.max(Math.max(A.x0, B.x0) - Math.min(A.x1, B.x1) - 1, Math.max(A.y0, B.y0) - Math.min(A.y1, B.y1) - 1, -1);
  const join = (A, B) => { A.x0 = Math.min(A.x0, B.x0); A.y0 = Math.min(A.y0, B.y0); A.x1 = Math.max(A.x1, B.x1); A.y1 = Math.max(A.y1, B.y1); A.n += B.n; };
  // Las piezas grandes ya vienen unidas por cercanía de píxeles; las pequeñas son chispas o detalles
  const big = boxes.filter(b => b.n >= minArea), small = boxes.filter(b => b.n < minArea);
  // Chispas y detalles sueltos: se pegan al sprite más cercano (sin unir sprites entre sí)
  for (const s of small) {
    let best = null, bd = Infinity; for (const B of big) { const g = gap(s, B); if (g < bd) { bd = g; best = B; } }
    if (best && bd <= spark) join(best, s);
  }
  return big.map(b => {
    const x = Math.max(0, b.x0 - pad), y = Math.max(0, b.y0 - pad);
    return { x, y, w: Math.min(w, b.x1 + 1 + pad) - x, h: Math.min(h, b.y1 + 1 + pad) - y };
  });
}
function gridBoxes(cw, ch, ox, oy, px, py, skip, trim, thr) {
  const out = []; if (cw < 1 || ch < 1) return out;
  for (let y = oy; y + ch <= S.cur.h; y += ch + py) for (let x = ox; x + cw <= S.cur.w; x += cw + px) {
    const r = { x, y, w: cw, h: ch }, c = (skip || trim) ? contentBox(r, thr) : r;
    if (skip && !c) continue; out.push(trim && c ? c : r);
  }
  return out;
}
// Orden de lectura: por filas (de arriba abajo) y dentro de cada fila de izquierda a derecha
function readingOrder(L) {
  if (L.length < 2) return L;
  const hs = L.map(r => r.h).sort((a, b) => a - b), mh = hs[hs.length >> 1] || 1;
  const byY = [...L].sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2)), rows = [];
  for (const r of byY) { const cy = r.y + r.h / 2, row = rows[rows.length - 1]; if (row && cy - row.cy < mh * 0.5) row.L.push(r); else rows.push({ cy, L: [r] }); }
  return rows.flatMap(rw => rw.L.sort((a, b) => a.x - b.x));
}
function nextName() { const used = new Set(S.rects.map(r => r.name)); let i = 0; while (used.has(S.cur.base + '_' + i)) i++; return S.cur.base + '_' + i; }
function doSlice() {
  if (!S.cur) return; const before = snap(), t = $('sType').value, thr = clamp(num('aAlpha') || 16, 1, 255);
  let boxes;
  if (t === 'auto') boxes = autoBoxes(thr, Math.max(0, num('aMerge')), Math.max(1, num('aMin')), Math.max(0, num('aPad')), Math.max(0, num('aSpark')));
  else {
    const ox = Math.max(0, num('gOX')), oy = Math.max(0, num('gOY')), px = Math.max(0, num('gPX')), py = Math.max(0, num('gPY'));
    let cw, ch;
    if (t === 'size') { cw = num('gW'); ch = num('gH'); }
    else { const c = Math.max(1, num('gC')), r = Math.max(1, num('gR')); cw = Math.floor((S.cur.w - ox - px * (c - 1)) / c); ch = Math.floor((S.cur.h - oy - py * (r - 1)) / r); }
    boxes = gridBoxes(cw, ch, ox, oy, px, py, $('gSkip').checked, $('gTrim').checked, thr);
  }
  boxes = readingOrder(boxes);
  if ($('sMethod').value === 'replace') S.rects = [];
  for (const b of boxes) S.rects.push(mkRect(b));
  S.sel = null; prune(); commit(before);
  toast(boxes.length ? `✂ ${boxes.length} recortes` : 'No se encontró nada que recortar (prueba a bajar el umbral o el tamaño mínimo)', boxes.length ? 'ok' : 'bad');
}

// ---------- Panel ----------
function dupNames() { const c = new Map(); for (const r of S.rects) c.set(r.name, (c.get(r.name) || 0) + 1); return new Set([...c].filter(([, n]) => n > 1).map(([k]) => k)); }
function refreshList() {
  const L = $('list'), dup = dupNames(); $('rCount').textContent = S.rects.length; L.innerHTML = '';
  S.rects.forEach((r, i) => {
    const d = document.createElement('div'); d.className = 'it' + (r.id === S.sel ? ' on' : '') + (dup.has(r.name) ? ' dup' : '');
    const c = document.createElement('canvas'); c.width = 28; c.height = 28; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const sc = Math.min(28 / r.w, 28 / r.h); g.drawImage(S.cur.img, r.x, r.y, r.w, r.h, (28 - r.w * sc) / 2, (28 - r.h * sc) / 2, r.w * sc, r.h * sc);
    const sp = document.createElement('span'); sp.textContent = r.name; const sm = document.createElement('small'); sm.textContent = `${r.w}×${r.h}`;
    d.append(c, sp, sm); d.onclick = () => { S.sel = r.id; refreshSel(); refreshList(); req(); };
    L.append(d); if (r.id === S.sel) requestAnimationFrame(() => d.scrollIntoView({ block: 'nearest' }));
  });
}
function refreshSel() {
  const s = selRect(); $('selNone').hidden = !!s; $('selBox').hidden = !s; $('selIdx').textContent = s ? `${S.rects.indexOf(s) + 1} / ${S.rects.length}` : '';
  if (!s) return;
  for (const [id, k] of [['iX', 'x'], ['iY', 'y'], ['iW', 'w'], ['iH', 'h']]) if (document.activeElement !== $(id)) $(id).value = s[k];
  if (document.activeElement !== $('iName')) $('iName').value = s.name;
  const pv = `${s.px},${s.py}`.replace(/0\./g, '.'), opt = [...$('iPiv').options].find(o => o.value === pv); $('iPiv').value = opt ? pv : 'custom';
  if (document.activeElement !== $('iPX')) $('iPX').value = s.px; if (document.activeElement !== $('iPY')) $('iPY').value = s.py;
  ['iBL', 'iBT', 'iBR', 'iBB'].forEach((id, i) => { if (document.activeElement !== $(id)) $(id).value = s.b[i]; });
  const list = S.names[targetFolder()] || [], ok = list.includes(s.name), dup = dupNames().has(s.name);
  $('nameHint').innerHTML = dup ? '<span style="color:var(--bad)">⚠ Hay otro recorte con este nombre: se sobrescribiría.</span>' : list.length ? (ok ? '<span style="color:var(--ok)">✔ El juego reconoce este nombre.</span>' : 'Este nombre no es de ningún objeto del juego (se guardará igual).') : '';
}
function refreshStatus() {
  $('stFile').textContent = S.cur ? S.cur.name : 'Sin imagen'; $('stSize').textContent = S.cur ? `${S.cur.w}×${S.cur.h}` : '';
  $('stZoom').textContent = S.cur ? Math.round(S.view.z * 100) + ' %' : ''; $('stDirty').innerHTML = S.dirty ? '<span class="dirty">● Cambios sin exportar</span>' : (S.cur ? 'Todo guardado' : '');
  $('bUndo').disabled = !S.hist.length; $('bRedo').disabled = !S.fut.length; $('bRevert').disabled = !S.dirty; $('bExport').disabled = !S.cur || !S.rects.length;
}
const targetFolder = () => $('eTarget').value === 'custom' ? '' : $('eTarget').value;
function fillNames() { const dl = $('gameNames'); dl.innerHTML = ''; const f = document.createDocumentFragment(); for (const n of S.names[targetFolder()] || []) { const o = document.createElement('option'); o.value = n; f.append(o); } dl.append(f); refreshSel(); }
// Edición desde el panel
for (const [id, k] of [['iX', 'x'], ['iY', 'y'], ['iW', 'w'], ['iH', 'h']]) $(id).addEventListener('change', () => {
  const s = selRect(); if (!s) return; const before = snap(); let v = num(id);
  if (k === 'x') v = clamp(v, 0, S.cur.w - s.w); if (k === 'y') v = clamp(v, 0, S.cur.h - s.h);
  if (k === 'w') v = clamp(v, 1, S.cur.w - s.x); if (k === 'h') v = clamp(v, 1, S.cur.h - s.y);
  s[k] = v; commit(before); refreshSel();
});
$('iName').addEventListener('input', () => { const s = selRect(); if (!s) return; const before = snap(); s.name = slug($('iName').value) || s.name; commit(before); });
$('iName').addEventListener('change', () => { const s = selRect(); if (s) $('iName').value = s.name; });
$('bTrim').onclick = () => { const s = selRect(); if (!s) return; const c = contentBox(s, clamp(num('aAlpha') || 16, 1, 255)); if (!c) { toast('Ese recorte está vacío', 'bad'); return; } const before = snap(); Object.assign(s, c); commit(before); };
$('bDel').onclick = delSel;
$('sType').onchange = () => { const t = $('sType').value; $('oAuto').hidden = t !== 'auto'; $('oSize').hidden = t !== 'size'; $('oCount').hidden = t !== 'count'; $('oGrid').hidden = t === 'auto'; };
$('bSlice').onclick = doSlice;
$('bClear').onclick = () => { if (!S.rects.length) return; const before = snap(); S.rects = []; S.sel = null; prune(); commit(before); };
$('bDup').onclick = dupSel;
// Pivote y bordes (9-slice)
$('iPiv').onchange = () => { const s = selRect(), v = $('iPiv').value; if (!s || v === 'custom') return; const before = snap(); const [x, y] = v.split(',').map(Number); s.px = x; s.py = y; commit(before); };
for (const [id, k] of [['iPX', 'px'], ['iPY', 'py']]) $(id).addEventListener('change', () => { const s = selRect(); if (!s) return; const before = snap(); const v = parseFloat($(id).value); s[k] = clamp(Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0.5, 0, 1); commit(before); });
['iBL', 'iBT', 'iBR', 'iBB'].forEach((id, i) => $(id).addEventListener('change', () => { const s = selRect(); if (!s) return; const before = snap(); s.b[i] = clamp(num(id), 0, i % 2 ? s.h : s.w); commit(before); }));
$('bUndo').onclick = undo; $('bRedo').onclick = redo;
$('bRevert').onclick = () => { if (!S.dirty) return; const before = snap(); load(S.saved); S.sel = null; commit(before); };
$('zIn').onclick = () => zoomAt(1.25); $('zOut').onclick = () => zoomAt(0.8); $('zFit').onclick = fit; $('z1').onclick = () => zoomAt(1 / S.view.z);
$('bAdd').onclick = async () => { const f = await rc.addImages(); if (f) toast('Copiada a la carpeta vigilada: ' + f, 'ok'); };
$('bIn').onclick = () => rc.openFolder('in');
$('bInChange').onclick = async () => { const st = await rc.chooseIn(); applyState(st); for (const f of S.files) S.seen.add(f.name); if (S.files[0] && !S.dirty) openFile(S.files[0].name); };
$('eTarget').onchange = async () => { if ($('eTarget').value === 'custom') { const d = await rc.chooseOut(); if (d) S.customOut = d; else if (!S.customOut) $('eTarget').value = 'objetos'; } fillNames(); };
$('bOut').onclick = () => rc.openFolder('out', exportTarget());
const exportTarget = () => $('eTarget').value === 'custom' ? 'custom:' + S.customOut : $('eTarget').value;

// ---------- Exportar ----------
function spritePNG(r, size) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  if (!size) { c.width = r.w; c.height = r.h; g.imageSmoothingEnabled = false; g.drawImage(S.cur.img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h); return c.toDataURL('image/png'); }
  c.width = c.height = size; const sc = Math.min(size / r.w, size / r.h), dw = Math.max(1, Math.round(r.w * sc)), dh = Math.max(1, Math.round(r.h * sc));
  g.imageSmoothingEnabled = sc < 1; g.imageSmoothingQuality = 'high'; g.drawImage(S.cur.img, r.x, r.y, r.w, r.h, Math.floor((size - dw) / 2), Math.floor((size - dh) / 2), dw, dh);
  return c.toDataURL('image/png');
}
async function doExport() {
  if (!S.cur || !S.rects.length) return;
  const dup = dupNames(); if (dup.size && !confirm(`Hay nombres repetidos (${[...dup].join(', ')}): se guardaría solo uno de cada. ¿Exportar igualmente?`)) return;
  if ($('eTarget').value === 'custom' && !S.customOut) { const d = await rc.chooseOut(); if (!d) return; S.customOut = d; }
  const size = +$('eSize').value, target = exportTarget();
  const meta = metaNow(target, size);
  const res = await rc.exportSprites({ sheet: S.cur.name, target, overwrite: $('eOver').checked, meta, sprites: S.rects.map(r => ({ name: r.name, data: spritePNG(r, size) })) });
  S.saved = snap(); changed();
  const f = S.files.find(x => x.name === S.cur.name); if (f) { f.done = true; renderFiles(); }
  toast(`💾 ${res.written.length} PNG guardados en ${res.dir}${res.skipped.length ? ` · ${res.skipped.length} ya existían (sin sobrescribir)` : ''}${res.listed ? ' · recarga el juego para verlos' : ''}`, 'ok', { label: 'Abrir carpeta', fn: () => rc.openFolder('out', target) });
}
$('bExport').onclick = doExport;
// Archivo de recortes de la hoja (como el .meta de Unity): recortes, pivotes, bordes y animaciones
function metaNow(target, size) { const o = JSON.parse(snap()); return { version: 2, image: S.cur.name, size: [S.cur.w, S.cur.h], target, exportSize: size, rects: o.r, anims: o.a }; }

// ---------- Animaciones ----------
// Cada animación es una lista de recortes (por id) con sus FPS. Se previsualiza aquí y se exporta como
// tira horizontal de cuadros iguales, alineados por el pivote: el formato que lee el juego.
const pv = $('pv'), pg = pv.getContext('2d');
const P = { playing: true, t0: performance.now(), frame: 0 };
const curAnim = () => S.anims.find(a => a.id === S.asel) || null;
const rectById = id => S.rects.find(r => r.id === id);
function animFrames(a) { return a ? a.frames.map(rectById).filter(Boolean) : []; }
function seqIndex(a, n, t) { // índice del fotograma para el tiempo t (bucle / ida y vuelta)
  if (n <= 1) return 0; const steps = Math.floor(t * a.fps / 1000);
  if (a.ping) { const L = 2 * n - 2, k = a.loop ? steps % L : Math.min(steps, L); return k < n ? k : L - k; }
  return a.loop ? steps % n : Math.min(steps, n - 1);
}
function refreshAnim() {
  const CL = $('clipList'); CL.innerHTML = '';
  if (!S.anims.length) CL.innerHTML = '<div class="empty">Sin animaciones.</div>';
  for (const a of S.anims) {
    const d = document.createElement('div'); d.className = 'clip' + (a.id === S.asel ? ' on' : '');
    const sp = document.createElement('span'); sp.textContent = a.name; const sm = document.createElement('small'); sm.textContent = `${a.frames.length} · ${a.fps} fps`;
    d.append(sp, sm); d.onclick = () => { S.asel = a.id; P.t0 = performance.now(); refreshAnim(); }; CL.append(d);
  }
  const a = curAnim(), on = !!a;
  for (const id of ['aAddSel', 'aAddAll', 'aClearF', 'aExport', 'aDel', 'aFps', 'aLoop', 'aPing', 'aName', 'aPlay']) $(id).disabled = !on;
  $('aTitle').textContent = a ? `Fotogramas de «${a.name}»` : 'Fotogramas';
  if (a) { if (document.activeElement !== $('aFps')) $('aFps').value = a.fps; $('aLoop').checked = a.loop; $('aPing').checked = a.ping; if (document.activeElement !== $('aName')) $('aName').value = a.name; }
  renderFrames();
}
let dragFrom = -1;
function renderFrames() {
  const F = $('frames'), a = curAnim(); F.innerHTML = '';
  if (!a) { F.innerHTML = '<div class="empty">Pulsa «＋ Nueva» para crear una animación y añade recortes como fotogramas.</div>'; return; }
  if (!a.frames.length) { F.innerHTML = '<div class="empty">Selecciona un recorte y pulsa «＋ Seleccionado» (o la tecla A), o «＋ Todos». Arrastra los fotogramas para ordenarlos.</div>'; return; }
  a.frames.forEach((id, i) => {
    const r = rectById(id); if (!r) return;
    const d = document.createElement('div'); d.className = 'fr' + (r.id === S.sel ? ' sel' : ''); d.draggable = true; d.dataset.i = i;
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const sc = Math.min(64 / r.w, 64 / r.h, 4); g.drawImage(S.cur.img, r.x, r.y, r.w, r.h, (64 - r.w * sc) / 2, (64 - r.h * sc) / 2, r.w * sc, r.h * sc);
    const sm = document.createElement('small'); sm.textContent = `${i + 1} · ${r.name}`;
    const x = document.createElement('button'); x.className = 'x mini danger'; x.textContent = '×'; x.title = 'Quitar de la animación';
    x.onclick = ev => { ev.stopPropagation(); const before = snap(); a.frames.splice(i, 1); commit(before); };
    d.append(c, sm, x);
    d.onclick = () => { S.sel = r.id; refreshSel(); refreshList(); renderFrames(); req(); };
    d.ondragstart = ev => { dragFrom = i; ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(i)); };
    d.ondragover = ev => { ev.preventDefault(); ev.stopPropagation(); d.classList.add('over'); };
    d.ondragleave = () => d.classList.remove('over');
    d.ondrop = ev => { ev.preventDefault(); ev.stopPropagation(); d.classList.remove('over'); if (dragFrom < 0 || dragFrom === i) return; const before = snap(); const [m] = a.frames.splice(dragFrom, 1); a.frames.splice(i, 0, m); dragFrom = -1; commit(before); };
    F.append(d);
  });
}
function addFrames(ids) {
  let a = curAnim(); ids = ids.filter(id => rectById(id)); if (!ids.length) { toast('Selecciona un recorte primero', 'bad'); return; }
  const before = snap(); if (!a) { a = newAnim(true); }
  a.frames.push(...ids); commit(before);
}
function newAnim(silent) {
  const used = new Set(S.anims.map(a => a.name)); let n = 'animacion', i = 1; while (used.has(n)) n = 'animacion_' + (++i);
  const a = { id: uid++, name: n, fps: 8, loop: true, ping: false, frames: [] }; S.anims.push(a); S.asel = a.id; P.t0 = performance.now();
  if (!silent) toast('Animación creada: añade recortes como fotogramas', 'ok'); return a;
}
function togglePlay() { P.playing = !P.playing; P.t0 = performance.now() - P.frame * 1000 / ((curAnim() || {}).fps || 8); $('aPlay').textContent = P.playing ? '⏸' : '▶'; }
$('aNew').onclick = () => { if (!S.cur) return; const before = snap(); newAnim(); commit(before); };
$('aAddSel').onclick = () => addFrames([S.sel]);
$('aAddAll').onclick = () => addFrames(S.rects.map(r => r.id));
$('aClearF').onclick = () => { const a = curAnim(); if (!a || !a.frames.length) return; const before = snap(); a.frames = []; commit(before); };
$('aDel').onclick = () => { const a = curAnim(); if (!a) return; const before = snap(); S.anims = S.anims.filter(x => x !== a); S.asel = S.anims[0] ? S.anims[0].id : null; commit(before); };
$('aPlay').onclick = togglePlay;
$('aFps').addEventListener('change', () => { const a = curAnim(); if (!a) return; const before = snap(); a.fps = clamp(num('aFps') || 8, 1, 60); commit(before); });
$('aLoop').onchange = () => { const a = curAnim(); if (!a) return; const before = snap(); a.loop = $('aLoop').checked; P.t0 = performance.now(); commit(before); };
$('aPing').onchange = () => { const a = curAnim(); if (!a) return; const before = snap(); a.ping = $('aPing').checked; P.t0 = performance.now(); commit(before); };
$('aName').addEventListener('change', () => { const a = curAnim(); if (!a) return; const before = snap(); a.name = slug($('aName').value) || a.name; $('aName').value = a.name; commit(before); });
// Caja común de todos los fotogramas, alineados por el pivote
function animLayout(frames) {
  let ax = 0, ay = 0, bx = 0, by = 0;
  for (const r of frames) { ax = Math.max(ax, r.px * r.w); ay = Math.max(ay, r.py * r.h); bx = Math.max(bx, (1 - r.px) * r.w); by = Math.max(by, (1 - r.py) * r.h); }
  return { ax, ay, W: Math.ceil(ax + bx), H: Math.ceil(ay + by), at: r => ({ x: Math.round(ax - r.px * r.w), y: Math.round(ay - r.py * r.h) }) };
}
function previewLoop(now) {
  requestAnimationFrame(previewLoop);
  const dpr = devicePixelRatio || 1, cw = Math.round(pv.clientWidth * dpr), ch = Math.round(pv.clientHeight * dpr);
  if (pv.width !== cw || pv.height !== ch) { pv.width = cw; pv.height = ch; }
  pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, pv.width, pv.height);
  const a = curAnim(), fr = animFrames(a); if (!S.cur || !fr.length) return;
  const L = animLayout(fr), sc = Math.max(1, Math.floor(Math.min((pv.width - 12) / L.W, (pv.height - 12) / L.H))) || 1, ox = Math.floor((pv.width - L.W * sc) / 2), oy = Math.floor((pv.height - L.H * sc) / 2);
  if (P.playing) P.frame = seqIndex(a, fr.length, Math.max(0, now - P.t0)); // el reloj del fotograma puede ir un pelín por detrás
  const i = clamp(P.frame | 0, 0, fr.length - 1);
  pg.imageSmoothingEnabled = false;
  const put = (r, alpha) => { const p = L.at(r); pg.globalAlpha = alpha; pg.drawImage(S.cur.img, r.x, r.y, r.w, r.h, ox + p.x * sc, oy + p.y * sc, r.w * sc, r.h * sc); pg.globalAlpha = 1; };
  if ($('aOnion').checked && fr.length > 1) put(fr[(i - 1 + fr.length) % fr.length], 0.3);
  put(fr[i], 1);
  pg.fillStyle = '#9a968e'; pg.font = `${10 * dpr}px Segoe UI`; pg.fillText(`${i + 1}/${fr.length}`, 6 * dpr, pv.height - 6 * dpr);
  // Resalta el fotograma que suena
  const els = $('frames').querySelectorAll('.fr'); els.forEach((el, k) => el.classList.toggle('cur', k === i));
}
requestAnimationFrame(previewLoop);
// Exportar la animación: tira horizontal (cuadros iguales) en la carpeta elegida
$('aExport').onclick = async () => {
  const a = curAnim(), fr = animFrames(a); if (!a || !fr.length) { toast('La animación no tiene fotogramas', 'bad'); return; }
  if ($('eTarget').value === 'custom' && !S.customOut) { const d = await rc.chooseOut(); if (!d) return; S.customOut = d; }
  const L = animLayout(fr), c = document.createElement('canvas'); c.width = L.W * fr.length; c.height = L.H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  fr.forEach((r, k) => { const p = L.at(r); g.drawImage(S.cur.img, r.x, r.y, r.w, r.h, k * L.W + p.x, p.y, r.w, r.h); });
  const target = exportTarget(), size = +$('eSize').value;
  const res = await rc.exportSprites({ sheet: S.cur.name, target, overwrite: $('eOver').checked, meta: metaNow(target, size), sprites: [{ name: a.name, data: c.toDataURL('image/png') }] });
  S.saved = snap(); changed();
  toast(res.written.length ? `🎞 Tira guardada: ${res.written[0]} (${fr.length} cuadros de ${L.W}×${L.H}) en ${res.dir}` : `Ya existía ${a.name}.png (activa «Sobrescribir»)`, res.written.length ? 'ok' : 'bad', { label: 'Abrir carpeta', fn: () => rc.openFolder('out', target) });
};
addEventListener('beforeunload', e => { if (S.dirty) { e.returnValue = false; } });

init();
