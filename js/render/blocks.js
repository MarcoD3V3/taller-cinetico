'use strict';
// Aspecto de cada bloque. b: parte estática (se cachea como sprite, clave = tipo|dir|k(b))
// a: parte animada (se dibuja cada fotograma; el contexto ya está centrado en la casilla).
const R90 = Math.PI / 2;
const DRAW = {};
const D = (types, o) => { for (const t of types.split(' ')) DRAW[t] = o; };

// ---------- Ayudas ----------
function shaftBar(c, len = 16) { c.fillStyle = '#a9afb6'; c.fillRect(-len, -4, len * 2, 8); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.strokeRect(-len, -4, len * 2, 8); }
function stripes(c, b, len = 16) { c.rotate((b.dir & 1) * R90); c.fillStyle = '#62676e'; const o = ((b.angle * 6) % 8 + 8) % 8; for (let x = -len + o; x < len - 1; x += 8) c.fillRect(x, -4, 2, 8); }
function stubs(c) { c.fillStyle = '#a9afb6'; c.fillRect(10, -3.5, 6, 7); c.fillRect(-16, -3.5, 6, 7); c.fillRect(-3.5, 10, 7, 6); c.fillRect(-3.5, -16, 7, 6); }
function bar(c, frac, col, y = 10) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(-12, y, 24, 3); c.fillStyle = col; c.fillRect(-12, y, 24 * clamp(frac, 0, 1), 3); }
function progressOf(b) {
  const d = BD[b.type];
  if (d.machine && b.cur >= 0) { const r = RECIPES[d.machine][b.cur]; return r ? b.prog / r.t : 0; }
  if (b.type === 'drill' || b.type === 'treetap') return b.prog / (b.type === 'drill' ? 2.5 : 5);
  if (b.type === 'assembler') return b.prog / 2;
  return 0;
}
const SIDE_COL = ['#9aa0a8', '#5aa8ff', '#ffa14a', '#e24b3b'];
function sideMarks(c, b) {
  for (let d = 0; d < 4; d++) {
    const m = b.sides ? b.sides[d] : 0; c.save(); c.rotate(d * R90);
    c.fillStyle = SIDE_COL[m]; c.fillRect(12.5, -5, 3, 10);
    if (m === 3) { c.strokeStyle = '#2a0e0a'; c.lineWidth = 1; c.beginPath(); c.moveTo(12.5, -4); c.lineTo(15.5, 4); c.stroke(); }
    c.restore();
  }
}
function litOf(b) {
  switch (b.type) {
    case 'lamp': return !!b.powered;
    case 'furnace': return (b.fuel || 0) > 0 && b.cur >= 0;
    case 'efurnace': case 'blastFurnace': return b.cur >= 0 && b.E > 0;
    case 'elamp': case 'combGen': case 'gasGen': case 'boiler': return !!b.lit;
    case 'geotherm': return b.E > 0;
    case 'reactor': case 'voidGen': case 'chronoAccel': return !!b.lit;
    case 'welder': case 'laserEngraver': case 'arcaneForge': case 'plasmaFuser': case 'collider': case 'alloySmelter': case 'cryoChamber': case 'distiller': case 'chronoForge': case 'transmuter': case 'grower': return b.cur >= 0;
  }
  return false;
}
const keyLit = b => litOf(b) ? 1 : 0;
const keyPow = b => b.powered ? 1 : 0;
const keyO = b => b.o > 0 ? 1 : 0;
function kinAnimCog(c, b, x = 9, y = -9) { drawCog(c, x, y, 4.5, 6, '#e0b54c', b.angle * 1.5); }
function machineAnim(extra) {
  return (c, b, t) => { if (extra) extra(c, b, t); const p = progressOf(b); if (p > 0) bar(c, p, '#7fd07a'); };
}
function pumpWheel(c) { for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillStyle = '#c9ced3'; c.fillRect(0, -1.5, 8, 3); } circ(c, 0, 0, 3, '#555'); }

// ---------- Cinética ----------
D('shaft', { b: (c, b) => { c.rotate((b.dir & 1) * R90); shaftBar(c); }, a: stripes });
D('clutch', {
  k: keyPow, b: (c, b) => { c.rotate((b.dir & 1) * R90); shaftBar(c); },
  a: (c, b) => { stripes(c, b); box(c, -8, -8, 16, 16, b.powered ? '#7b3a32' : '#59605f'); c.fillStyle = b.powered ? '#ff5a4a' : '#2b1715'; c.fillRect(-3, -3, 6, 6); }
});
D('brake', {
  k: keyPow, b: (c, b) => { mbox(c, '#5e6266'); stubs(c); c.fillStyle = b.powered ? '#d84a3a' : '#3a3d40'; c.fillRect(-11, -7, 4, 14); c.fillRect(7, -7, 4, 14); },
  a: (c, b) => drawCog(c, 0, 0, 6, 10, '#bfc4c9', b.angle)
});
function dialAnim(c, b) { c.rotate((b.dir & 1) * R90); c.fillStyle = '#62676e'; const o = ((b.angle * 6) % 8 + 8) % 8; for (let x = -16 + o; x < -8; x += 8) c.fillRect(x, -4, 2, 8); c.rotate(-(b.dir & 1) * R90); const a = -Math.PI * 0.75 + (b.o / 15) * Math.PI * 1.5; c.strokeStyle = '#d23b2b'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 2); c.lineTo(Math.cos(a) * 7, 2 + Math.sin(a) * 7); c.stroke(); }
D('speedometer stressometer', {
  b: (c, b) => { c.save(); c.rotate((b.dir & 1) * R90); shaftBar(c); c.restore(); box(c, -10, -9, 20, 20, b.type === 'speedometer' ? '#3f5f7a' : '#7a4f3f'); c.beginPath(); c.arc(0, 2, 8, Math.PI, 0); c.fillStyle = '#e8e2cf'; c.fill(); },
  a: dialAnim
});
D('gearbox', { b: c => { mbox(c, '#8b6a43'); stubs(c); }, a: (c, b) => drawCog(c, 0, 0, 10, 8, '#d6b06a', b.angle) });
D('doubler speedctl', {
  b: (c, b) => { c.rotate(b.dir * R90); shaftBar(c); box(c, -11, -12, 22, 24, b.type === 'doubler' ? '#6b5a3f' : '#4f5a6b'); arrow(c, 14); },
  a: (c, b) => { c.rotate(b.dir * R90); drawCog(c, -3, 0, 7, 10, '#c9a46a', b.angle); drawCog(c, 6, 0, 4, 6, '#e0b54c', -b.angle * ratioOf(b)); }
});
// ---------- Generadores ----------
D('crank', {
  b: c => { circ(c, 0, 0, 6, '#4a3a26'); },
  a: (c, b) => { drawCog(c, 0, 0, 12, 10, '#8b6a43', b.angle); c.rotate(b.angle); c.strokeStyle = '#4a3a26'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 0); c.stroke(); circ(c, 10, 0, 3.5, b.timer > 0 ? '#e0b54c' : '#caa36a'); }
});
const wheelFn = c => { circ(c, 0, 0, 14.5, '#6b4a2a', '#3a2816'); for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.fillStyle = '#9b7244'; c.fillRect(4, -2, 11, 4); } circ(c, 0, 0, 4, '#a9afb6'); };
D('waterwheel', { b: () => { }, a: (c, b) => drawRotor(c, 'wheel', 32, wheelFn, b.angle) });
const sailsFn = c => { for (let i = 0; i < 4; i++) { c.rotate(R90); c.fillStyle = '#e8dcc0'; c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.beginPath(); c.rect(3, -4, 25, 8); c.fill(); c.stroke(); c.fillStyle = '#5a4128'; c.fillRect(0, -1, 28, 2); } circ(c, 0, 0, 3.5, '#a9afb6'); };
D('windmill', { tall: 1, b: c => { box(c, -10, -10, 20, 20, '#7a5c38'); }, a: (c, b) => drawRotor(c, 'sails', 60, sailsFn, b.angle * 0.7) });
D('steam', {
  k: b => (b.fuel || 0) > 0 ? 1 : 0,
  b: (c, b) => { mbox(c, '#3d4148'); circ(c, -3, 0, 8, '#c27a46', '#5a3418'); c.fillStyle = '#2a2d31'; c.fillRect(5, -11, 6, 22); if ((b.fuel || 0) > 0) circ(c, -3, 0, 4, '#ff9a3a'); },
  a: (c, b) => { const y = Math.sin(b.angle * 2) * 6; c.fillStyle = '#c9ced3'; c.fillRect(6, y - 2, 4, 4); kinAnimCog(c, b, 9, 9); }
});
D('emotor', {
  b: c => { mbox(c, '#3f4a57'); c.fillStyle = '#c86a32'; for (let i = -9; i <= 9; i += 3) c.fillRect(i - 1, -9, 2, 18); c.fillStyle = '#222'; c.fillRect(-11, -3, 22, 6); },
  a: (c, b) => drawCog(c, 0, 0, 5, 8, '#e0b54c', b.angle)
});
// ---------- Procesado ----------
D('bench', {
  b: c => { box(c, -15, -15, 30, 30, '#8a5f33', '#3a2512', 3); c.fillStyle = '#a67a46'; c.fillRect(-13, -13, 26, 26); c.strokeStyle = '#5a3a1c'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.strokeRect(Math.cos(a) * 9 - 2.5, Math.sin(a) * 9 - 2.5, 5, 5); } },
  a: (c, b) => { drawCog(c, 0, 0, 5.5, 8, '#e0b54c', b.angle + (b.prog || 0) * 3); if (b.prog > 0) bar(c, b.prog / 2, '#7fd07a', 11); }
});
D('drill', {
  b: (c, b) => { mbox(c, '#8b6a43'); dirArrow(c, b.dir); },
  a: machineAnim((c, b) => { c.rotate(b.angle * 1.5); c.beginPath(); for (let i = 0; i < 3; i++) { const g = i * Math.PI * 2 / 3; c.lineTo(Math.cos(g) * 10, Math.sin(g) * 10); c.lineTo(Math.cos(g + 1.05) * 3, Math.sin(g + 1.05) * 3); } c.closePath(); c.fillStyle = '#d6d9dc'; c.fill(); c.strokeStyle = '#555'; c.lineWidth = 1; c.stroke(); c.rotate(-b.angle * 1.5); })
});
function furnaceBase(col, inner) { return (c, b) => { mbox(c, col); c.fillStyle = '#2a2826'; c.fillRect(-8, -6, 16, 12); if (litOf(b)) { c.fillStyle = inner; c.fillRect(-7, -1, 14, 6); } dirArrow(c, b.dir); }; }
D('furnace', { k: keyLit, b: furnaceBase('#6c6a66', '#ff9a30'), a: machineAnim() });
D('efurnace', { k: keyLit, b: furnaceBase('#5a6672', '#ffb84a'), a: machineAnim((c) => { c.fillStyle = '#d9733a'; c.fillRect(-12, -12, 4, 4); }) });
D('blastFurnace', { k: keyLit, b: (c, b) => { mbox(c, '#4a4440'); c.fillStyle = '#2a2826'; c.beginPath(); c.moveTo(-9, 8); c.lineTo(-5, -10); c.lineTo(5, -10); c.lineTo(9, 8); c.fill(); if (litOf(b)) { c.fillStyle = '#ff7a20'; c.fillRect(-6, 0, 12, 7); } dirArrow(c, b.dir); }, a: machineAnim() });
D('vulcanizer', { k: keyLit, b: (c, b) => { mbox(c, '#3f3f3f'); circ(c, 0, 0, 8, '#1f1f1f', '#777'); dirArrow(c, b.dir); }, a: machineAnim((c, b) => { if (b.cur >= 0) circ(c, 0, 0, 4 + Math.sin(performance.now() / 200) * 1, '#ffb05a'); }) });
D('millstone', { b: (c, b) => { mbox(c, '#7d8079'); dirArrow(c, b.dir); }, a: machineAnim((c, b) => { c.rotate(b.angle); circ(c, 0, 0, 10, '#a5a89f', '#5d605a'); c.strokeStyle = '#5d605a'; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { c.rotate(R90); c.beginPath(); c.moveTo(3, 0); c.lineTo(9, 0); c.stroke(); } }) });
D('crusher', { b: (c, b) => { mbox(c, '#5d6066'); dirArrow(c, b.dir); }, a: machineAnim((c, b) => { drawCog(c, -5, 0, 7, 12, '#9aa0a6', b.angle * 2); drawCog(c, 5.5, 0, 7, 12, '#9aa0a6', -b.angle * 2); }) });
D('saw', { b: (c, b) => { mbox(c, '#8a6b45'); dirArrow(c, b.dir); }, a: machineAnim((c, b) => drawCog(c, 0, 0, 10, 16, '#d6d9dc', b.angle * 2)) });
D('press', { b: (c, b) => { mbox(c, '#8a6b45'); c.fillStyle = '#3a3d40'; c.fillRect(-9, -9, 18, 18); dirArrow(c, b.dir); }, a: machineAnim((c, b) => { const k = b.cur >= 0 ? Math.abs(Math.sin(b.prog * Math.PI * 2)) : 0.2, s = 5 + k * 4; c.fillStyle = '#c4c8cc'; c.fillRect(-s, -s, s * 2, s * 2); c.strokeStyle = '#555'; c.lineWidth = 1; c.strokeRect(-s, -s, s * 2, s * 2); }) });
D('lathe', { b: (c, b) => { mbox(c, '#6f6250'); c.fillStyle = '#3a3d40'; c.fillRect(-11, -4, 22, 8); dirArrow(c, b.dir); }, a: machineAnim((c, b) => { c.fillStyle = '#d9dde0'; c.fillRect(-9, -2, 18, 4); c.fillStyle = '#7d8288'; const o = ((b.angle * 5) % 4 + 4) % 4; for (let x = -9 + o; x < 9; x += 4) c.fillRect(x, -2, 1, 4); }) });
D('wiremill', { b: (c, b) => { mbox(c, '#6f6250'); dirArrow(c, b.dir); }, a: machineAnim((c, b) => { drawRotor(c, 'spool', 14, cc => { circ(cc, 0, 0, 6, '#d9733a', '#6a2e10'); cc.fillStyle = '#6a2e10'; cc.fillRect(-1, -6, 2, 12); }, b.angle, -4, 0); drawRotor(c, 'spool', 14, null, -b.angle, 5, 0); }) });
D('mixer', { b: (c, b) => { mbox(c, '#8a6b45'); circ(c, 0, 0, 10, '#3a3d40'); dirArrow(c, b.dir); }, a: machineAnim((c, b) => { c.rotate(b.angle * 1.5); c.strokeStyle = '#d6d9dc'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-8, 0); c.lineTo(8, 0); c.stroke(); } }) });
D('treetap', { b: (c, b) => { circ(c, 0, -2, 12, '#2f6a34'); circ(c, -3, -5, 7, '#3b7e40'); box(c, -6, 4, 12, 9, '#9b7244'); c.fillStyle = '#f4f1e2'; c.fillRect(-4, 6, 8, 3); dirArrow(c, b.dir, 13); }, a: machineAnim() });
D('assembler', { b: (c, b) => { mbox(c, '#4f5a6b'); c.strokeStyle = '#e0b54c'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.strokeRect(Math.cos(a) * 8 - 2, Math.sin(a) * 8 - 2, 4, 4); } dirArrow(c, b.dir); }, a: machineAnim((c, b) => drawCog(c, 0, 0, 4.5, 8, '#e0b54c', b.angle)) });
// ---------- Logística ----------
const beltStrip = (() => {
  const s = mkCanvas(52 * SPR_S, 20 * SPR_S), c = s.getContext('2d'); c.scale(SPR_S, SPR_S);
  c.strokeStyle = '#6d7076'; c.lineWidth = 2; c.lineCap = 'round';
  for (let x = 2; x < 52; x += 10) { c.beginPath(); c.moveTo(x - 3, 3); c.lineTo(x + 2, 10); c.lineTo(x - 3, 17); c.stroke(); }
  return s;
})();
function beltBase(edge) { return (c, b) => { c.rotate(b.dir * R90); c.fillStyle = '#2a2b2d'; c.fillRect(-16, -13, 32, 26); c.fillStyle = edge; c.fillRect(-16, -13, 32, 3); c.fillRect(-16, 10, 32, 3); }; }
function beltAnim(c, b) { c.rotate(b.dir * R90); const o = ((b.phase || 0) * 32 % 10 + 10) % 10; c.globalAlpha = b.rpm > 0 ? 1 : 0.55; c.drawImage(beltStrip, (10 - o) * SPR_S, 0, 32 * SPR_S, 20 * SPR_S, -16, -10, 32, 20); c.globalAlpha = 1; }
D('belt', { b: beltBase('#46484c'), a: beltAnim });
D('brassBelt', { b: beltBase('#c9a43c'), a: beltAnim });
D('chest', { b: c => { box(c, -13, -12, 26, 24, '#9a6c35', '#4a3216'); c.fillStyle = '#6e4a20'; c.fillRect(-13, -3, 26, 2); c.fillStyle = '#d9c36a'; c.fillRect(-2.5, -4, 5, 6); } });
D('vault', { b: c => { box(c, -15, -15, 30, 30, '#5f6670', '#23272c', 4); c.strokeStyle = '#2a2e33'; c.lineWidth = 1; c.strokeRect(-11, -11, 22, 22); circ(c, 0, 0, 5, '#c9a43c', '#5a4a1c'); } });
D('depot', { b: c => { box(c, -13, -13, 26, 26, '#8b6a43'); c.fillStyle = '#3a3d40'; c.fillRect(-10, -10, 20, 20); }, a: (c, b) => { if (b.item) { drawItem(c, b.item.id, 0, 0, 14); if (b.item.n > 1) { label(c, b.item.n, 9, '#fff', 8); } } } });
D('trash', { b: c => { box(c, -11, -13, 22, 26, '#4a4f55'); c.fillStyle = '#2a2d31'; for (let i = -6; i <= 6; i += 4) c.fillRect(i - 1, -9, 2, 18); } });
D('extractor', {
  k: b => (b.powered ? 1 : 0) + '|' + (b.filter || ''),
  b: (c, b) => { c.save(); c.rotate(b.dir * R90); c.beginPath(); c.moveTo(-13, -12); c.lineTo(-13, 12); c.lineTo(10, 6); c.lineTo(10, -6); c.closePath(); c.fillStyle = b.powered ? '#6b3a34' : '#7c827a'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#3a3d3a'; c.fillRect(-11, -8, 4, 16); arrow(c, 13); c.restore(); if (b.filter) drawItemPath(c, b.filter, 9); }
});
D('splitter sorter', {
  k: b => b.filter || '',
  b: (c, b) => { c.save(); c.rotate(b.dir * R90); box(c, -13, -13, 26, 26, b.type === 'sorter' ? '#5a6e5a' : '#5f6a72'); arrow(c, 10); c.rotate(-R90); arrow(c, 10, b.type === 'sorter' ? '#7fd07a' : '#c9c2a8'); if (b.type === 'splitter') { c.rotate(Math.PI); arrow(c, 10, '#c9c2a8'); } c.restore(); if (b.filter) drawItemPath(c, b.filter, 8); },
  a: (c, b) => { if (b.buf) drawItem(c, b.buf, 0, 0, 10); }
});
D('arm', {
  b: c => { circ(c, 0, 0, 9, '#5f6670', '#23272c'); },
  a: (c, b) => { c.rotate(b.dir * R90 + Math.PI - (1 - b.swing) * Math.PI); c.fillStyle = '#e0b54c'; c.fillRect(0, -2.5, 14, 5); circ(c, 14, 0, 3.5, '#c9a43c'); circ(c, 0, 0, 4, '#3a3d40'); if (b.swing > 0.05 && b.hold) { c.rotate(-(b.dir * R90 + Math.PI - (1 - b.swing) * Math.PI)); const a = b.dir * R90 + Math.PI - (1 - b.swing) * Math.PI; drawItem(c, b.hold, Math.cos(a) * 14, Math.sin(a) * 14, 9); } }
});
D('ejector', {
  b: (c, b) => { mbox(c, '#6f6250'); dirArrow(c, b.dir, 12); },
  a: (c, b) => { const k = b.kick || 0; c.rotate(b.dir * R90); c.fillStyle = '#c9ced3'; c.fillRect(-8 + k * 6, -9, 4, 18); c.strokeStyle = '#3a3d40'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 4; i++) { c.lineTo(-11 + i * (3 + k * 1.5), i % 2 ? -5 : 5); } c.stroke(); if (b.buf) { c.rotate(-b.dir * R90); drawItem(c, b.buf, 0, 0, 10); } }
});
// ---------- Conexiones con forma (cables, tuberías, redstone) ----------
function dirsOf(mask) { const r = []; for (let d = 0; d < 4; d++) if ((mask >> d) & 1) r.push(d); return r; }
function linkPath(c, mask, r = 16) {
  c.beginPath(); const ds = dirsOf(mask);
  if (ds.length === 2 && (ds[0] & 1) !== (ds[1] & 1)) { c.moveTo(DX[ds[0]] * r, DY[ds[0]] * r); c.quadraticCurveTo(0, 0, DX[ds[1]] * r, DY[ds[1]] * r); }
  else if (ds.length === 0) { c.arc(0, 0, 6, 0, Math.PI * 2); }
  else for (const d of ds) { c.moveTo(0, 0); c.lineTo(DX[d] * r, DY[d] * r); }
  return ds.length;
}
function maskOf(b, test) { let m = 0; for (let d = 0; d < 4; d++) { const n = at(b.x + DX[d], b.y + DY[d]); if (n && test(n, d)) m |= 1 << d; } return m; }
function cableMask(b) { if (b.icon) return 5; const k = BD[b.type].cable.kind; return maskOf(b, (n, d) => { const nc = BD[n.type].cable; if (nc) return nc.kind === k || nc.kind === '*' || k === '*'; return hasPort(n, 0, OPP(d)); }); }
function pipeMask(b) { if (b.icon) return 5; return maskOf(b, (n, d) => BD[n.type].pipe ? true : hasPort(n, 1, OPP(d))); }
function wireMask(b) { if (b.icon) return 5; return maskOf(b, n => LOGIC_LINK.has(n.type)); }
const CABLE_STY = { cu: ['#b8642e', '#7a3d18', '#f2a874'], rub: ['#2a2a2a', '#111', '#d9733a'], br: ['#c9a43c', '#8a6a1c', '#fff0a0'], '*': ['#555', '#222', '#ccc'] };
function drawCable(c, mask, kind, live) {
  const [jk, band, core] = CABLE_STY[kind]; c.lineCap = 'round'; c.lineJoin = 'round';
  const n = linkPath(c, mask); c.lineWidth = 7.5; c.strokeStyle = 'rgba(0,0,0,.55)'; c.stroke();
  linkPath(c, mask); c.lineWidth = 6; c.strokeStyle = jk; c.stroke();
  c.setLineDash([2, 3]); linkPath(c, mask); c.lineWidth = 6; c.strokeStyle = band; c.globalAlpha = 0.45; c.stroke(); c.globalAlpha = 1; c.setLineDash([]);
  linkPath(c, mask); c.lineWidth = 1.6; c.strokeStyle = live ? '#fff6c8' : core; c.stroke();
  if (n >= 3 || n === 1) { circ(c, 0, 0, n === 1 ? 3.5 : 5, '#8e949a', '#2a2d31'); circ(c, 0, 0, 1.5, live ? '#ffe680' : '#555'); }
}
D('cableCu cableRub cableBr', {
  k: b => cableMask(b) + '|' + (b.net && b.net.flow > 0.5 ? 1 : 0),
  b: (c, b) => drawCable(c, cableMask(b), BD[b.type].cable.kind, b.net && b.net.flow > 0.5)
});
D('pswitch', {
  k: b => cableMask(b) + '|' + keyPow(b),
  b: (c, b) => { drawCable(c, cableMask(b), '*', false); box(c, -8, -8, 16, 16, '#3a3d40'); c.fillStyle = b.powered ? '#e24b3b' : '#7fd07a'; c.fillRect(-4, -5, 8, 10); c.fillStyle = '#222'; c.fillRect(-2, b.powered ? 1 : -4, 4, 3); }
});
function drawPipe(c, mask, fluid) {
  c.lineCap = 'butt'; const n = linkPath(c, mask);
  c.lineWidth = 12; c.strokeStyle = '#3d4247'; c.stroke();
  linkPath(c, mask); c.lineWidth = 9.5; c.strokeStyle = '#8c949c'; c.stroke();
  linkPath(c, mask); c.lineWidth = 3.5; c.strokeStyle = fluid ? FLUIDS[fluid].c : '#5d646b'; c.stroke();
  for (const d of dirsOf(mask)) { c.save(); c.rotate(d * R90); c.fillStyle = '#6a7279'; c.fillRect(13, -7.5, 3, 15); c.restore(); }
  if (n >= 3 || n === 0) circ(c, 0, 0, 6.5, '#7a828a', '#3d4247');
}
const pipeKey = b => pipeMask(b) + '|' + (b.net && b.net.ft && b.net.flow > 0 ? b.net.ft : '');
D('pipe', { k: pipeKey, b: (c, b) => drawPipe(c, pipeMask(b), b.net && b.net.flow > 0 ? b.net.ft : null) });
D('valve', { k: b => pipeKey(b) + '|' + keyPow(b), b: (c, b) => { drawPipe(c, pipeMask(b), b.net && b.net.flow > 0 ? b.net.ft : null); circ(c, 0, 0, 6, b.powered ? '#b23b2b' : '#3f8a4f', '#222'); c.fillStyle = '#ddd'; c.save(); c.rotate(b.powered ? R90 : 0); c.fillRect(-5, -1.2, 10, 2.4); c.restore(); } });
const wireCol = s => s > 0 ? `rgb(${150 + s * 7},${18 + s * 3},18)` : '#5c1a16';
D('wire', {
  k: b => wireMask(b) + '|' + Math.ceil((b.sig || 0) / 4),
  b: (c, b) => { const m = wireMask(b), s = Math.ceil((b.sig || 0) / 4) * 4; c.lineCap = 'round'; c.lineJoin = 'round'; const n = linkPath(c, m); c.lineWidth = 4.5; c.strokeStyle = 'rgba(0,0,0,.4)'; c.stroke(); linkPath(c, m); c.lineWidth = 3; c.strokeStyle = wireCol(s); c.stroke(); if (n !== 2) circ(c, 0, 0, 3.2, wireCol(s)); }
});
D('wirebridge', {
  k: b => (b.sh > 0 ? 1 : 0) + '|' + (b.sv > 0 ? 1 : 0),
  b: (c, b) => { c.lineCap = 'round'; c.lineWidth = 3; c.strokeStyle = wireCol(b.sh > 0 ? 12 : 0); c.beginPath(); c.moveTo(-16, 0); c.lineTo(16, 0); c.stroke(); box(c, -6, -10, 12, 20, '#7d7f7c'); c.strokeStyle = wireCol(b.sv > 0 ? 12 : 0); c.beginPath(); c.moveTo(0, -16); c.lineTo(0, 16); c.stroke(); }
});
// ---------- Energía ----------
D('dynamo', { b: c => { mbox(c, '#3f4a57'); c.fillStyle = '#c86a32'; c.fillRect(-11, -11, 6, 22); c.fillRect(5, -11, 6, 22); }, a: (c, b) => { drawCog(c, 0, 0, 5, 8, '#e0b54c', b.angle); bar(c, b.E / BD.dynamo.pw.cap, '#ffd84a', 11); } });
D('solar', { b: c => { box(c, -15, -15, 30, 30, '#1f3550', '#9aa0a8', 2); c.strokeStyle = '#5a7fa8'; c.lineWidth = 0.8; for (let i = -10; i <= 10; i += 5) { c.beginPath(); c.moveTo(i, -14); c.lineTo(i, 14); c.moveTo(-14, i); c.lineTo(14, i); c.stroke(); } c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(-14, -14, 12, 6); } });
D('combGen', { k: keyLit, b: (c, b) => { mbox(c, '#4a4f55'); c.fillStyle = '#222'; c.fillRect(-9, -2, 18, 9); if (litOf(b)) { c.fillStyle = '#ff9a30'; c.fillRect(-8, 2, 16, 4); } c.fillStyle = '#c86a32'; c.fillRect(-10, -10, 20, 5); }, a: (c, b) => bar(c, b.E / BD.combGen.pw.cap, '#ffd84a', 11) });
D('turbine', { b: c => { mbox(c, '#5d6066'); circ(c, 0, 0, 11, '#2a2d31'); }, a: (c, b) => { b.tang = (b.tang || 0) + (b.spin || 0) * 0.4; drawRotor(c, 'turb', 22, cc => { for (let i = 0; i < 8; i++) { cc.rotate(Math.PI / 4); cc.fillStyle = '#c9ced3'; cc.beginPath(); cc.moveTo(2, -1); cc.quadraticCurveTo(7, -4, 10, 0); cc.lineTo(2, 1); cc.fill(); } circ(cc, 0, 0, 2.5, '#888'); }, b.tang); bar(c, b.E / BD.turbine.pw.cap, '#ffd84a', 11); } });
D('gasGen', { k: keyLit, b: (c, b) => { mbox(c, '#4f5a50'); circ(c, 0, -1, 7, '#2a2d31', '#d6c06a'); if (litOf(b)) circ(c, 0, -1, 4, '#7fc8ff'); }, a: (c, b) => bar(c, b.E / BD.gasGen.pw.cap, '#ffd84a', 11) });
function batteryBase(col) { return (c, b) => { box(c, -12, -12, 24, 24, col, '#1e2226', 3); c.fillStyle = '#1e2226'; c.fillRect(-7, -9, 14, 18); sideMarks(c, b); }; }
const batAnim = (c, b) => { const f = b.E / BD[b.type].pw.cap; c.fillStyle = f > 0.25 ? '#7fd07a' : '#e0b54c'; c.fillRect(-6, 8 - 16 * f, 12, 16 * f); };
D('battery', { k: b => b.sides.join(''), b: batteryBase('#4a5562'), a: batAnim });
D('bigBattery', { k: b => b.sides.join(''), b: (c, b) => { batteryBase('#2f5f7a')(c, b); c.strokeStyle = '#7fc8ff'; c.lineWidth = 1; c.strokeRect(-11, -11, 22, 22); }, a: batAnim });
D('capacitor', { k: b => b.sides.join(''), b: (c, b) => { box(c, -10, -12, 20, 24, '#5a4a72', '#1e2226', 6); c.fillStyle = '#ccc'; c.fillRect(-10, -3, 20, 2); sideMarks(c, b); }, a: batAnim });
D('diode', { b: (c, b) => { c.rotate(b.dir * R90); drawCable(c, 5, '*', false); box(c, -8, -7, 16, 14, '#2a2d31'); c.fillStyle = '#ffd84a'; c.beginPath(); c.moveTo(-4, -5); c.lineTo(4, 0); c.lineTo(-4, 5); c.fill(); c.fillRect(4, -5, 1.5, 10); } });
D('pmeter levelSensor', {
  b: (c, b) => { plate(c, b.type === 'pmeter' ? '#55606a' : '#4f6a6a'); c.beginPath(); c.arc(0, 3, 8, Math.PI, 0); c.fillStyle = '#e8e2cf'; c.fill(); dirArrow(c, b.dir, 12); },
  a: (c, b) => { const a = Math.PI + (b.o / 15) * Math.PI; c.strokeStyle = '#d23b2b'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 3); c.lineTo(Math.cos(a) * 7, 3 + Math.sin(a) * 7); c.stroke(); }
});
D('elamp', { k: keyLit, b: (c, b) => { box(c, -11, -11, 22, 22, '#3a3d40'); circ(c, 0, 0, 7, litOf(b) ? '#fff6d0' : '#55595c', '#222'); } });
// ---------- Fluidos ----------
function tankAnim(c, b) { const t = b.tanks.m; if (!t || !t.a) return; const f = t.a / t.c; c.fillStyle = FLUIDS[t.t].c; c.globalAlpha = 0.9; c.fillRect(-9, 9 - 18 * f, 18, 18 * f); c.globalAlpha = 1; }
D('tank', { k: b => b.sides.join(''), b: (c, b) => { box(c, -12, -12, 24, 24, '#6a7279', '#2a2d31', 3); c.fillStyle = '#1e2226'; c.fillRect(-9, -9, 18, 18); sideMarks(c, b); }, a: tankAnim });
D('gastank', { k: b => b.sides.join(''), b: (c, b) => { circ(c, 0, 0, 13, '#7f8a96', '#2a2d31'); c.fillStyle = '#1e2226'; c.fillRect(-9, -9, 18, 18); sideMarks(c, b); }, a: tankAnim });
D('mpump', { b: c => { mbox(c, '#4f6a7a'); circ(c, 0, 0, 9, '#2a2d31'); }, a: (c, b) => drawRotor(c, 'pump', 18, pumpWheel, b.angle * 2) });
D('epump', { b: c => { mbox(c, '#3f5f7a'); circ(c, 0, 0, 9, '#2a2d31'); c.fillStyle = '#d9733a'; c.fillRect(-13, -13, 5, 5); }, a: (c, b) => { b.tang = (b.tang || 0) + (b.E > 0 ? 0.3 : 0); drawRotor(c, 'pump', 18, pumpWheel, b.tang); } });
D('derrick', { tall: 1, b: c => { c.strokeStyle = '#3a3d40'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, 13); c.lineTo(0, -12); c.lineTo(12, 13); c.moveTo(-7, 3); c.lineTo(7, 3); c.stroke(); circ(c, 0, 10, 4, '#2a2018'); }, a: (c, b) => { const a = Math.sin(b.angle) * 0.35; c.rotate(a); c.fillStyle = '#c9a43c'; c.fillRect(-14, -14, 28, 4); c.fillStyle = '#2a2d31'; c.fillRect(-16, -16, 5, 8); } });
D('gasx', { b: c => { mbox(c, '#6a6a4a'); circ(c, 0, 0, 8, '#2a2d31', '#d6c06a'); }, a: (c, b) => { if (b.E > 0) { c.globalAlpha = 0.5 + Math.sin(performance.now() / 150) * 0.3; circ(c, 0, 0, 4, '#d6c06a'); c.globalAlpha = 1; } } });
D('boiler', { k: keyLit, b: (c, b) => { mbox(c, '#7a4a32'); c.fillStyle = '#2a2826'; c.fillRect(-8, 2, 16, 8); if (litOf(b)) { c.fillStyle = '#ff9a30'; c.fillRect(-7, 4, 14, 5); } circ(c, 0, -5, 6, '#c27a46', '#5a3418'); } });
D('refinery', { b: (c, b) => { mbox(c, '#4a4f55'); box(c, -9, -12, 7, 22, '#7f8a96'); box(c, 2, -8, 7, 18, '#7f8a96'); dirArrow(c, b.dir); }, a: machineAnim() });
D('electrolyzer', { b: (c, b) => { mbox(c, '#3f5f7a'); c.fillStyle = '#9fd8ff'; c.fillRect(-9, -6, 18, 12); c.fillStyle = '#333'; c.fillRect(-5, -10, 2, 14); c.fillRect(3, -10, 2, 14); dirArrow(c, b.dir); }, a: machineAnim((c, b) => { if (b.cur >= 0) { c.fillStyle = '#fff'; const t = performance.now() / 300; for (let i = 0; i < 3; i++) circ(c, -4 + i * 4, 4 - ((t + i) % 1) * 9, 1, '#fff'); } }) });
D('drain', { b: c => { box(c, -12, -12, 24, 24, '#4a4f55'); c.fillStyle = '#1a1c1e'; for (let i = -8; i <= 8; i += 4) c.fillRect(-9, i - 1, 18, 2); } });
// ---------- Lógica ----------
D('lever', { k: b => b.on ? 1 : 0, b: (c, b) => { plate(c, '#7d7f7c'); c.save(); c.rotate(b.on ? -0.8 : 0.8); c.strokeStyle = '#5a4128'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -9); c.stroke(); c.restore(); led(c, 0, 4, b.on); } });
D('button', { k: keyO, b: (c, b) => { plate(c, '#7d7f7c'); box(c, -6, -6, 12, 12, b.o ? '#a33' : '#c44', '#511', 3); } });
D('plate', { k: keyO, b: (c, b) => { box(c, -13, -13, 26, 26, b.o ? '#8a7046' : '#a88a58', '#4a3216', 2); } });
D('lamp', { k: keyPow, b: (c, b) => { box(c, -12, -12, 24, 24, b.powered ? '#ffe08a' : '#4a4130', '#2a2418'); c.strokeStyle = b.powered ? '#c99a2a' : '#2a2418'; c.lineWidth = 1; c.strokeRect(-6, -6, 12, 12); } });
D('display', { b: c => { box(c, -13, -11, 26, 22, '#1a1d20', '#5a5f66', 3); }, a: (c, b) => { c.font = 'bold 14px ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = b.pv > 0 ? '#7fd07a' : '#2f4a35'; c.fillText(String(b.pv || 0), 0, 1); } });
function gate(sym) { return { k: keyO, b: (c, b) => { c.save(); c.rotate(b.dir * R90); plate(c); c.restore(); label(c, sym, 0); c.save(); c.rotate(b.dir * R90); led(c, 9, 0, b.o > 0); c.restore(); } }; }
DRAW.inverter = gate('NO'); DRAW.andgate = gate('Y'); DRAW.orgate = gate('O'); DRAW.xorgate = gate('OX');
DRAW.flipflop = gate('T'); DRAW.comparator = { k: b => keyO(b) + '|' + b.mode, b: (c, b) => { gate(b.mode ? '−' : '≥').b(c, b); } };
DRAW.repeater = { k: keyO, b: (c, b) => { c.save(); c.rotate(b.dir * R90); plate(c); c.fillStyle = '#5a5c59'; c.fillRect(-7, -1.5, 14, 3); led(c, -5, 0, b.o > 0); led(c, 5, 0, b.o > 0); arrow(c, 11, '#5a1a16'); c.restore(); } };
DRAW.counter = { k: keyO, b: (c, b) => { c.save(); c.rotate(b.dir * R90); plate(c); led(c, 9, 0, b.o > 0); c.restore(); }, a: (c, b) => label(c, String(b.cnt), 1, '#2a2c2e', 10) };
D('clock', { k: keyO, b: (c, b) => { plate(c); circ(c, 0, 0, 8, b.o ? '#ff7a5e' : '#d8cfb8', '#4a4c49'); }, a: (c, b) => { const ang = (b.t || 0) / (b.period || 2) * Math.PI * 2 - R90; c.strokeStyle = '#4a4c49'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ang) * 6, Math.sin(ang) * 6); c.stroke(); } });
D('observer', { k: b => keyO(b) + '|' + (b.filter || ''), b: (c, b) => { c.save(); c.rotate(b.dir * R90); box(c, -12, -12, 24, 24, '#55595c'); c.fillStyle = '#2a2c2e'; c.fillRect(6, -8, 6, 16); c.fillStyle = '#d8d4c8'; c.fillRect(8, -4, 3, 8); led(c, -7, 0, b.o > 0); c.restore(); if (b.filter) drawItemPath(c, b.filter, 8); } });
D('stockpile', { k: b => keyO(b) + '|' + b.th, b: (c, b) => { c.save(); c.rotate(b.dir * R90); box(c, -12, -12, 24, 24, '#6e6a58'); c.fillStyle = '#2a2c2e'; c.fillRect(-8, -3, 16, 6); c.fillStyle = '#e0b54c'; c.fillRect(-8, -3, 16 * Math.min(1, b.th || 0.5), 6); arrow(c, 12); led(c, -8, -8, b.o > 0); c.restore(); } });
const FREQ_COL = i => `hsl(${(i * 47) % 360},70%,55%)`;
D('transmitter', { k: b => keyPow(b) + '|' + b.freq, b: (c, b) => { plate(c, '#5a5f66'); c.strokeStyle = '#c9ced3'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, -6); c.stroke(); circ(c, 0, -7, 3, b.powered ? '#ff5a4a' : '#5a1a16'); c.fillStyle = FREQ_COL(b.freq); c.fillRect(-10, 7, 20, 3); } });
D('receiver', { k: b => keyO(b) + '|' + b.freq, b: (c, b) => { plate(c, '#5a5f66'); c.strokeStyle = '#c9ced3'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 2, 7, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.beginPath(); c.arc(0, 2, 3.5, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); led(c, 0, 3, b.o > 0); c.fillStyle = FREQ_COL(b.freq); c.fillRect(-10, 7, 20, 3); } });
D('daysensor', { k: b => b.invert, b: (c, b) => { plate(c, '#5a5f66'); c.beginPath(); c.arc(0, 2, 8, Math.PI, 0); c.fillStyle = b.invert ? '#3a4a7a' : '#e8c24a'; c.fill(); } });
// ---------- Biomas ----------
D('trap', { b: c => { c.strokeStyle = '#7a5a34'; c.lineWidth = 2; c.strokeRect(-12, -12, 24, 24); c.strokeStyle = '#a9afb6'; c.lineWidth = 1.5; for (let i = -8; i <= 8; i += 4) { c.beginPath(); c.moveTo(i, -10); c.lineTo(i + 2, 10); c.stroke(); } circ(c, 0, 0, 3, '#3a3d40'); }, a: (c, b) => { const n = total(b.out || {}); if (n) label(c, String(n), 9, '#ffd84a', 9); } });
D('beehive', { b: c => { box(c, -11, -13, 22, 26, '#d8a040', '#6a4a1a', 8); c.strokeStyle = '#8a5a1a'; c.lineWidth = 1.2; for (let y = -7; y <= 7; y += 5) { c.beginPath(); c.moveTo(-10, y); c.lineTo(10, y); c.stroke(); } circ(c, 0, 6, 2.5, '#3a2a10'); }, a: (c, b) => { const t = performance.now() / 300; for (let i = 0; i < 2; i++) circ(c, Math.cos(t + i * 3) * 13, Math.sin(t * 1.3 + i) * 10, 1.6, '#f0b030'); } });
D('digester', { b: (c, b) => { mbox(c, '#4f5a3a'); circ(c, 0, 0, 10, '#6a7a3a', '#2a3018'); c.fillStyle = '#d6c06a'; c.fillRect(-2, -13, 4, 6); dirArrow(c, b.dir); }, a: machineAnim((c, b) => { if (b.cur >= 0) { const t = performance.now() / 400; for (let i = 0; i < 3; i++) circ(c, -4 + i * 4, 4 - ((t + i * 0.3) % 1) * 9, 1.2, '#c8d870'); } }) });
D('geotherm', { b: c => { mbox(c, '#3a2a28'); c.fillStyle = '#1a1210'; c.fillRect(-9, -9, 18, 18); c.fillStyle = '#c86a32'; c.fillRect(-12, -3, 3, 6); c.fillRect(9, -3, 3, 6); }, a: (c, b) => { const on = b.E > 0; c.fillStyle = on ? `rgba(255,${120 + Math.sin(performance.now() / 200) * 40 | 0},40,.95)` : '#3a1a10'; c.fillRect(-7, -7, 14, 14); bar(c, b.E / BD.geotherm.pw.cap, '#ffd84a', 11); } });
D('core', { b: c => { box(c, -15, -15, 30, 30, '#3b2f17', '#e0b54c', 5); }, a: c => { drawCog(c, 0, 0, 11, 12, '#e0b54c', performance.now() / 1600); circ(c, 0, 0, 3, '#fff4cc'); } });

// ---------- Aspecto genérico para los bloques de la expansión ----------
// Cuerpo del color del bloque + símbolo + animación (giro, prensa, brillo o pulso) + barra de progreso
// Texturas de construcción (casilla completa, 32×32)
function texDraw(c, tex, col, b) {
  const h = (i) => hash2((b && b.x) || 0, (b && b.y) || 0, i), dk = shade(col, -0.3), lt = shade(col, 0.25);
  const R = (x, y, w, h2, cc) => { c.fillStyle = cc; c.fillRect(x, y, w, h2); };
  switch (tex) {
    case 'stone': R(-16, -16, 32, 32, col); for (let i = 0; i < 5; i++) R(-14 + h(i) * 24, -14 + h(i + 9) * 24, 5 + h(i + 3) * 5, 3, dk); R(-16, -16, 32, 2, lt); R(-16, 14, 32, 2, dk); break;
    case 'bricks': R(-16, -16, 32, 32, dk); for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) { const x = -16 + k * 16 + (r & 1 ? 8 : 0); R(x + 1, -16 + r * 8 + 1, 14, 6, col); R(x + 1, -16 + r * 8 + 1, 14, 1, lt); } break;
    case 'pillar': R(-16, -16, 32, 32, dk); R(-11, -16, 22, 32, col); R(-9, -16, 3, 32, lt); R(-13, -16, 26, 4, lt); R(-13, 12, 26, 4, dk); break;
    case 'log': R(-16, -16, 32, 32, col); for (let k = 0; k < 4; k++) { R(-16 + k * 8, -16, 1, 32, dk); R(-13 + k * 8, -16, 1, 32, lt); } c.beginPath(); c.arc(0, 0, 5, 0, 7); c.fillStyle = shade(col, 0.4); c.fill(); c.strokeStyle = dk; c.stroke(); break;
    case 'plank': R(-16, -16, 32, 32, col); for (let k = 1; k < 4; k++) R(-16, -16 + k * 8, 32, 1, dk); for (let k = 0; k < 4; k++) R(-16 + ((k * 13 + ((b && b.x) || 0) * 7) & 31), -16 + k * 8, 1, 8, dk); break;
    case 'glass': R(-16, -16, 32, 32, 'rgba(190,228,240,.35)'); c.strokeStyle = '#6a8a9a'; c.lineWidth = 2; c.strokeRect(-15, -15, 30, 30); c.beginPath(); c.moveTo(-8, 8); c.lineTo(6, -10); c.moveTo(-2, 10); c.lineTo(10, -4); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.stroke(); break;
    case 'metal': R(-16, -16, 32, 32, col); R(-16, -16, 32, 2, lt); R(-16, -16, 2, 32, lt); R(-16, 14, 32, 2, dk); R(14, -16, 2, 32, dk); for (const [x, y] of [[-11, -11], [9, -11], [-11, 9], [9, 9]]) R(x, y, 3, 3, dk); break;
    case 'crystal': R(-16, -16, 32, 32, dk); c.beginPath(); c.moveTo(-14, 14); c.lineTo(-6, -14); c.lineTo(2, 6); c.lineTo(10, -12); c.lineTo(14, 14); c.closePath(); c.fillStyle = col; c.fill(); c.beginPath(); c.moveTo(-6, -14); c.lineTo(-3, 4); c.strokeStyle = lt; c.stroke(); break;
    case 'sand': case 'dirt': case 'gravel': R(-16, -16, 32, 32, col); for (let i = 0; i < 9; i++) R(-15 + h(i) * 29, -15 + h(i + 20) * 29, 2, 2, i & 1 ? dk : lt); if (tex === 'sand') R(-16, -4, 32, 1, dk); break;
    case 'ice': R(-16, -16, 32, 32, col); c.beginPath(); c.moveTo(-14, -6); c.lineTo(-2, 0); c.lineTo(4, 12); c.moveTo(-2, 0); c.lineTo(12, -8); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.2; c.stroke(); R(-16, -16, 32, 2, lt); break;
    case 'leaf': R(-16, -16, 32, 32, dk); for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(-10 + h(i) * 20, -10 + h(i + 5) * 20, 6 + h(i + 2) * 3, 0, 7); c.fillStyle = i & 1 ? col : lt; c.fill(); } break;
    case 'fence': R(-13, -12, 4, 26, col); R(9, -12, 4, 26, col); R(-16, -6, 32, 3, lt); R(-16, 4, 32, 3, lt); R(-13, -12, 4, 2, lt); R(9, -12, 4, 2, lt); break;
    case 'flower': for (let i = 0; i < 6; i++) { const x = -12 + h(i) * 24, y = -12 + h(i + 7) * 24; R(x, y, 1, 5, '#3e7a34'); c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fillStyle = ['#f4e04a', '#e84a6a', '#f4f4f4', '#7a6ae8', '#f49a3a'][(h(i + 3) * 5) | 0]; c.fill(); } break;
    case 'grass': c.strokeStyle = col; c.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const x = -12 + h(i) * 24; c.beginPath(); c.moveTo(x, 12); c.lineTo(x + (h(i + 4) - 0.5) * 8, -6 + h(i + 8) * 10); c.stroke(); } break;
  }
}
function genericDraw(d) {
  const L2 = d.look, logic = L2.a === 'led';
  return {
    k: b => (litOf(b) ? 1 : 0) + '|' + (b.o > 0 ? 1 : 0) + '|' + (b.seq || 0),
    b: (c, b) => {
      if (logic) { c.save(); c.rotate((b.dir || 0) * R90); plate(c, L2.c); c.restore(); }
      else if (L2.tex) { texDraw(c, L2.tex, L2.c, b); return; }
      else { mbox(c, L2.c); c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(-10, -10, 20, 20); }
      label(c, L2.g, logic ? 0 : -1, logic ? '#2a2c2e' : '#f4ead0', L2.g.length > 1 ? 9 : 13);
      if (d.dir) { if (logic) { c.save(); c.rotate(b.dir * R90); led(c, 9, 0, b.o > 0); c.restore(); } else dirArrow(c, b.dir); }
      else if (logic) led(c, 8, -8, b.o > 0);
      if (b.type === 'sequencer') { c.save(); c.rotate((b.seq || 0) * R90); arrow(c, 11, '#ff3a2e'); c.restore(); }
      if (d.pw && !logic) { c.fillStyle = '#d9733a'; c.fillRect(-13, 10, 4, 3); }
    },
    a: logic ? null : (c, b) => {
      const t = performance.now() / 1000, act = b.cur >= 0 || litOf(b) || b.rpm > 0 || (b.E > 0 && !d.machine);
      if (L2.a === 'spin') drawCog(c, 9, -9, 4.5, 6, '#e0b54c', b.rpm > 0 ? b.angle * 1.5 : act ? t * 3 : 0);
      else if (L2.a === 'press') { const k = act ? Math.abs(Math.sin(t * 5)) : 0; c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-9, -9 + k * 3, 18, 3); }
      else if (L2.a === 'glow' && act) { c.globalAlpha = 0.35 + Math.sin(t * 6) * 0.2; circ(c, 0, -1, 9, L2.c === '#3a5a3a' ? '#7aff4a' : '#ffd060'); c.globalAlpha = 1; }
      else if (L2.a === 'pulse' && act) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.beginPath(); c.arc(0, -1, 4 + (t * 8 % 7), 0, 7); c.stroke(); }
      if (S && b.boostT > S.time) { c.strokeStyle = '#c8a8ff'; c.lineWidth = 1.2; c.strokeRect(-15, -15, 30, 30); }
      const p = progressOf(b); if (p > 0) bar(c, p, '#7fd07a');
      if (d.pw && d.pw.role !== 'use') bar(c, b.E / d.pw.cap, '#ffd84a', 11);
    },
  };
}
for (const k in BD) if (!DRAW[k] && BD[k].look) DRAW[k] = genericDraw(BD[k]);
for (const k in BD) if (!DRAW[k]) console.warn('Bloque sin dibujo', k);

// ---------- Caché de sprites base ----------
const _base = new Map();
// Acabado de «imagen» para cada bloque (una vez, en caché): luz direccional, grano de material,
// oclusión en los bordes y sombra suave proyectada al suelo
const _noise = (() => { const n = mkCanvas(80, 80), c = n.getContext('2d'), d = c.createImageData(80, 80); for (let i = 0; i < d.data.length; i += 4) { const v = 110 + Math.random() * 90 | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } c.putImageData(d, 0, 0); return n; })();
const _mpTmp = mkCanvas(80, 80);
function materialPass(s) {
  const c = s.getContext('2d'), w = s.width, h = s.height;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,248,230,.16)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,10,.26)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.globalAlpha = 0.07; c.drawImage(_noise, 0, 0, w, h); c.globalAlpha = 1;
  const rg = c.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.62); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.18)'); c.fillStyle = rg; c.fillRect(0, 0, w, h);
  // Sombra: copia en negro, desenfocada, detrás y un poco abajo a la derecha
  if (_mpTmp.width !== w) { _mpTmp.width = w; _mpTmp.height = h; }
  const t = _mpTmp.getContext('2d'); t.clearRect(0, 0, w, h); t.drawImage(s, 0, 0);
  c.globalCompositeOperation = 'destination-over'; c.filter = 'blur(2px) brightness(0)'; c.globalAlpha = 0.38; c.drawImage(_mpTmp, w * 0.04, h * 0.06); c.filter = 'none'; c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}
function blockSprite(b) {
  const dr = DRAW[b.type]; const k = b.type + '|' + b.dir + '|' + (dr.k ? dr.k(b) : '');
  let s = _base.get(k);
  if (!s) {
    if (_base.size > 3000) _base.clear();
    s = mkCanvas(40 * SPR_S, 40 * SPR_S); const c = s.getContext('2d');
    c.scale(SPR_S, SPR_S); c.translate(20, 20); RICH = true; try { dr.b(c, b); } finally { RICH = false; }
    if (!b.icon) materialPass(s); _base.set(k, s);
  }
  return s;
}
function drawBlockIcon(c, id) {
  const b = makeB(id, -99, -99, 0); b.icon = 1; if (id === 'crank') b.timer = 1; if (id === 'lamp') b.powered = true;
  const dr = DRAW[id]; c.save(); RICH = true; try { dr.b(c, b); } finally { RICH = false; } c.restore(); if (dr.a) { c.save(); dr.a(c, b, 0); c.restore(); }
}
