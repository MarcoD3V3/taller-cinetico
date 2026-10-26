'use strict';
// =====================================================================================
//  Que nada se pierda al recargar ni al cambiar de ventana:
//   · Los enemigos se guardan con el mundo: el que te perseguía sigue ahí al recargar (Ctrl+R).
//   · Al recargar se vuelve solo al mismo mundo y, si estabas en línea, a la misma partida
//     (el anfitrión la sigue llevando con el mismo código; el invitado vuelve a entrar).
//   · Con la partida en línea, el mundo sigue vivo aunque la pestaña esté oculta o en otra
//     ventana: un temporizador en segundo plano (Worker) mueve la simulación cuando el
//     navegador deja de dibujar.
//   · Al abrir tu mundo, la dirección pasa a ser /server/<código> (el mismo enlace de invitación).
//   · Si te vas y la partida sigue sin ti, quien la lleva manda copias del mundo al servidor;
//     cuando se va el último, la última copia vuelve a tu mundo (solo al tuyo) y la recibes
//     al conectarte.
// =====================================================================================
// ---------- Enemigos en el guardado ----------
function packFoes() {
  if (!S || !S.player) return [];
  const out = [], px = S.player.x, py = S.player.y;
  for (const f of FOES) {
    if (!f || f.hp <= 0 || f._net || !(ENEMIES[f.k] || BOSSES[f.k])) continue;
    if (!f.boss && !(f.keepT > S.time) && dist(f.x, f.y, px, py) > 60 * T) continue;
    const o = {}; for (const k in f) { const v = f[k]; if (k === 'D' || k[0] === '_') continue; if (typeof v === 'number' ? isFinite(v) : typeof v === 'string' || typeof v === 'boolean') o[k] = v; }
    out.push(o); if (out.length >= 150) break;
  }
  return out;
}
function unpackFoes(a) {
  const list = [];
  if (Array.isArray(a)) for (const o of a) { if (!o || !(ENEMIES[o.k] || BOSSES[o.k])) continue; const f = makeFoe(o.k, +o.x || 0, +o.y || 0); Object.assign(f, o); f.D = ENEMIES[o.k] || BOSSES[o.k]; list.push(f); }
  return list;
}
{ const s0 = serialize; serialize = () => { if (!S) return s0(); S.foes = packFoes(); try { return s0(); } finally { delete S.foes; } }; }
{ const d0 = deserialize; deserialize = str => {
  const ok = d0(str); if (!ok || !S) return ok;
  const a = S.foes; delete S.foes; FOES = unpackFoes(a);
  if (typeof bossEnd === 'function' && BOSS) bossEnd();
  const b = FOES.find(f => f.boss); if (b) { BOSS = b; if (typeof buildBossBar === 'function') try { buildBossBar(); } catch (e) { } }
  return ok; }; }

// ---------- El mundo sigue con la pestaña oculta (solo en línea) ----------
let _rafAt = performance.now(), _bgLast = 0, _bgW = null;
{ const f0 = frame; frame = now => { _rafAt = performance.now(); return f0(now); }; }
function bgStep() {
  const now = performance.now();
  // Mientras el navegador dibuja, el bucle normal ya lo hace todo
  if (now - _rafAt < 400 || !S || !currentWorld || ui.open === 'title' || !inGame()) { _bgLast = now; return; }
  const dt = Math.min(0.25, (now - (_bgLast || now)) / 1000); _bgLast = now; if (dt <= 0) return;
  try {
    pmove.moving = pmove.sprint = false; P.mvx = P.mvy = 0;
    survTick(dt, false, false); weatherTick(dt); tickBursts(dt); combatTick(dt); npcTick(dt);
    acc += dt; let n = 0; while (acc >= DT && n < 6) { tick(DT); acc -= DT; n++; } if (n >= 6) acc = 0;
    chunkMaintenance(S.player.x, S.player.y, Math.ceil(Math.max(cw, ch) / view.z / T / CS / 2) + 1, dt);
    myPresence(dt); syncBlocks(dt); flushTiles();
    if (typeof msHost === 'function' && msHost()) msHostTick(dt);
    hoTick();
    saveT += dt; if (saveT > (typeof OPT !== 'undefined' ? OPT.autosave : 30)) { saveT = 0; saveGame(true); }
  } catch (e) { console.warn('segundo plano', e); }
}
function bgEnsure() {
  if (_bgW || typeof Worker === 'undefined') return;
  try { _bgW = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 50);'], { type: 'text/javascript' }))); _bgW.onmessage = bgStep; }
  catch (e) { _bgW = null; setInterval(bgStep, 50); _bgW = 1; }
}

// ---------- Dirección /server/<código> ----------
function mpsURL() {
  const g = NET.game; if (!g || !g.code || !inviteURL(g.code)) return;
  const want = '/server/' + g.code; if (location.pathname !== want) try { history.replaceState(null, '', want); } catch (e) { }
}
const mpsInfo = () => { const g = NET.game; if (g && g.r && NET.room && NET.room.info) { const i = NET.room.info(g.r.name); if (i) { if (i.owner) g.owner = i.owner; if (i.wid) g.wid = i.wid; } } };
{ const h0 = netHost; netHost = async opt => {
  // El servidor recuerda de quién es el mundo, para devolvérselo si la partida sigue sin él
  const c0 = NET.room && NET.room.create; if (c0 && S && currentWorld) NET.room.create = (n, meta) => c0(n, { ...meta, wid: currentWorld });
  try { await h0(opt); } finally { if (c0) NET.room.create = c0; }
  if (inGame() && NET.game.host) { mpsInfo(); mpsURL(); bgEnsure(); } }; }
{ const j0 = netJoin; netJoin = async (code, pass) => { const r = await j0(code, pass); if (inGame()) { mpsInfo(); mpsURL(); bgEnsure(); } return r; }; }
// Si el servidor se reinició y el anfitrión vuelve a abrir la partida, también dice de quién es
{ const r0 = netResumed; netResumed = async (r, ev) => { const c0 = r.create, g = NET.game; if (g && g.host && currentWorld && !String(currentWorld).startsWith('mp-')) r.create = (n, meta) => c0(n, { ...meta, wid: currentWorld }); try { return await r0(r, ev); } finally { r.create = c0; } }; }
{ const c0 = netHostChanged; netHostChanged = m => { c0(m); const g = NET.game; if (g && m.meta) { if (m.meta.owner) g.owner = m.meta.owner; if (m.meta.wid) g.wid = m.meta.wid; } }; }

// ---------- Copias del mundo para su dueño ----------
// Las manda quien lleva la partida cuando no es su propio mundo (el dueño ya lo guarda en local)
const hoMine = () => { const g = NET.game; return !!(g && g.host && !g.waiting && g.r && NET.kind === 'ws' && String(currentWorld || '').startsWith('mp-') && NET.room && NET.room.hoPut); };
function hoSnap() {
  for (const c of WORLD.values()) if (typeof fogSync === 'function') fogSync(c);
  const ws = {}; for (const k in S) if (!PERSONAL.has(k) && k !== '_sortPending') ws[k] = S[k];
  ws.name = String(S.name || 'Mundo').replace(/ \(en línea\)$/, '');
  const mp = ws.mpPlayers = { ...(S.mpPlayers || {}) }, mine = {}; for (const k of PDAT_KEYS) if (S[k] !== undefined) mine[k] = S[k];
  if (NET.me && NET.me.id) mp[NET.me.id] = mine; // tú también eres un invitado en ese mundo
  ws.foes = packFoes();
  const ch = []; for (const c of WORLD.values()) if (c.mod) ch.push([c.cx, c.cy, rle(c.g), rle(c.t)]);
  const bs = blocks.map(b => { const o = {}; for (const k in b) if (!SKIP.has(k)) o[k] = b[k]; return o; });
  return JSON.stringify({ ws, ch, bs, t: Date.now() });
}
// Cada copia lleva su número: si mientras se comprime sale otra más nueva, la vieja no se manda
let _hoAt = 0, _hoBusy = false, _hoSeq = 0;
async function hoUpload() {
  if (!hoMine() || _hoBusy) return; _hoBusy = true; _hoAt = performance.now(); const my = ++_hoSeq;
  const g = NET.game; try { const z = await gz(hoSnap()); if (my === _hoSeq && NET.game === g && g.host) NET.room.hoPut(g.r.name, z, true); } catch (e) { console.warn('copia', e); } finally { _hoBusy = false; }
}
function hoTick() { if (hoMine() && performance.now() - _hoAt > 45000) hoUpload(); }
setInterval(hoTick, 5000);
// Recibir la copia: el mundo queda como lo dejó el último jugador; tu inventario y tu sitio son los tuyos
const _hoWait = [];
async function hoApply(list) {
  const nsOk = () => NET.kind === 'ws' && WNS === (NET.me.verified ? nsOf(NET.me.id) : '');
  for (let i = 0; i < 60 && !nsOk(); i++) await new Promise(ok => setTimeout(ok, 500));
  if (!nsOk()) return;
  for (const h of list) {
    try {
      if (inGame() && NET.game.code && h.room === 'tc-' + NET.game.code) continue; // sigues dentro: aún no toca
      const playing = S && currentWorld === h.wid && !inGame(); if (playing) saveGame(true);
      const raw = lsGet(WKEY(h.wid)); if (!raw) continue; // ese mundo no está en este navegador: se queda esperando
      const loc = JSON.parse(raw), snap = JSON.parse(h.z ? await ungz(h.data) : h.data); if (!snap || !snap.ws) continue;
      const ws = snap.ws, me = NET.me.id, mp = { ...(loc.mpPlayers || {}), ...(ws.mpPlayers || {}) }, mine = mp[me]; delete mp[me];
      const per = {}; for (const k of PERSONAL) if (loc[k] !== undefined) per[k] = loc[k];
      if (mine) for (const k of PDAT_KEYS) if (mine[k] !== undefined) per[k] = mine[k]; // si jugaste allí como invitado, sigues como lo dejaste
      const out = { ...ws, ...per, mpPlayers: mp, mpOpt: loc.mpOpt || ws.mpOpt, name: loc.name || ws.name, v: 3, ch: snap.ch, bs: snap.bs, seen: loc.seen || [] };
      if (playing) { // estás en ese mundo ahora mismo: se recarga con la copia nueva
        const str = JSON.stringify(out); if (!lsSet(WKEY(h.wid), str)) continue;
        if (loadWorld(h.wid)) enterWorld();
      } else if (!lsSet(WKEY(h.wid), JSON.stringify(out))) continue;
      const idx = worldIndex(), e = idx.find(w => w.id === h.wid); if (e) { e.played = Date.now(); e.blocks = (snap.bs || []).length; saveIndex(idx); }
      NET.room.hoAck(h.wid);
      okMsg(`🌍 «${out.name}» siguió en línea sin ti: tu mundo queda como lo dejó el último jugador.`);
    } catch (e) { console.warn('entrega', e); }
  }
}
function hoWire() { if (NET.kind === 'ws' && NET.room && NET.room.onHandoff && NET.room._hoW !== true) { NET.room._hoW = true; NET.room.onHandoff(l => hoApply(l)); } }
setInterval(hoWire, 500);

// ---------- Al salir (recargar o cerrar), apuntar dónde estabas ----------
const MPS_KEY = 'tc-mp-stay';
function mpsNote() {
  try {
    const g = NET.game, me = NET.room && NET.room.me;
    if (g && g.r && NET.kind === 'ws' && me) {
      const mp = String(currentWorld || '').startsWith('mp-');
      sessionStorage.setItem(MPS_KEY, JSON.stringify({ t: Date.now(), code: g.code, host: !!g.host, mp, pass: g.host ? (g.opt && g.opt.pass) || '' : g.pass || '',
        opt: g.host ? g.opt : null, wid: g.host && !mp ? currentWorld : g.prev || null, wns: WNS, peer: me.peer, rt: me.rt }));
    } else if (S && currentWorld && !String(currentWorld).startsWith('mp-')) sessionStorage.setItem(MPS_KEY, JSON.stringify({ t: Date.now(), wid: currentWorld, wns: WNS }));
  } catch (e) { }
}
// Quien llevaba un mundo ajeno deja la última copia antes de irse (sin comprimir: no da tiempo)
function hoLast() { if (!hoMine()) return; ++_hoSeq; try { NET.room.hoPut(NET.game.r.name, hoSnap(), false); } catch (e) { } }
addEventListener('pagehide', () => { mpsNote(); hoLast(); });
addEventListener('beforeunload', mpsNote);
// Salir a propósito: no se vuelve a entrar al recargar, y si era un mundo ajeno, deja su copia
{ const l0 = netLeave; netLeave = async (quiet, gone) => {
  try { sessionStorage.removeItem(MPS_KEY); } catch (e) { }
  const g = NET.game, ajeno = !!(g && g.host && String(currentWorld || '').startsWith('mp-'));
  if (!gone && hoMine()) { ++_hoSeq; try { NET.room.hoPut(g.r.name, await gz(hoSnap()), true); } catch (e) { } }
  await l0(quiet, gone);
  // Llevabas el mundo de otro: no te quedas con una copia (es solo de su dueño); vuelves al tuyo
  if (ajeno && !NET.game && String(currentWorld || '').startsWith('mp-')) { FOES = []; ANIMALS = []; if (g.prev && loadWorld(g.prev)) enterWorld(); else { S = null; currentWorld = null; openTitle(); } }
}; }

// ---------- Al cargar: volver donde estabas ----------
const STAY = typeof WS_STAY !== 'undefined' ? WS_STAY : null;
if (STAY && STAY.code && typeof pendingJoin === 'function' && pendingJoin() === STAY.code) clearJoin(); // la dirección /server/… es la tuya
async function mpsResume() {
  const rec = STAY; if (!rec || !rec.wid && !rec.code) return;
  const sleep = ms => new Promise(ok => setTimeout(ok, ms));
  // Esperar a la conexión, a la cuenta (sus mundos) y al personaje elegido
  const ready = () => (!rec.code || (NET.kind === 'ws' && NET.room && NET.room.connected())) && WNS === (rec.wns || '') && (typeof PF === 'undefined' || PF.active) && !(typeof CL !== 'undefined' && CL);
  for (let i = 0; i < 60 && !ready(); i++) await sleep(500);
  if (!ready() || inGame()) return;
  const play = async id => {
    if (!id || !lsGet(WKEY(id))) return false; if (!(S && currentWorld === id)) worldAction('play:' + id);
    for (let i = 0; i < 40 && !(S && currentWorld === id && ui.open !== 'title'); i++) await sleep(250);
    return !!(S && currentWorld === id); };
  if (!rec.code) { await play(rec.wid); return; }
  const r = NET.room, name = 'tc-' + rec.code, resumed = !!(r.me && r.me.resumed);
  if (rec.host && !rec.mp) {
    // Tu mundo: vuelves a abrirlo con el mismo código; los demás siguen dentro
    if (!(await play(rec.wid))) return;
    const opt = { ...defaultOpt(), ...(rec.opt || {}) }; let rr = null;
    if (resumed) rr = r.attach(name);
    else try { rr = await r.create(name, { hostName: myNick(), name: opt.name, pass: opt.pass, max: opt.max, mode: opt.mode, requireDc: opt.requireDc, cheats: opt.cheats, keep: opt.keep !== false, wid: rec.wid }); }
    catch (e) { if (e.code === 'taken') { await netJoin(rec.code, rec.pass); if (inGame()) NET.game.prev = rec.wid; } else errMsg('No se pudo volver a abrir tu mundo: ' + (e.message || e.code)); return; }
    NET.game = { code: rec.code, host: true, opt, perm: opt, r: rr }; S.mpOpt = { ...opt, pass: '' }; S.mpPlayers = S.mpPlayers || {};
    wireGame(rr); lobbyPresence(); mpsInfo(); mpsURL(); bgEnsure();
    if (rr.onOut) rr.onOut(why => { if (NET.game && NET.game.host) { errMsg(WS_ERR[why] || 'La partida se cerró.'); netLeave(true, true); } });
    rr.presence({ nick: myNick(), host: true }).catch(() => { });
    okMsg(`📡 Has vuelto: tu mundo sigue abierto con el mismo código (${rec.code.toUpperCase()}).`); netRefreshUI(); return;
  }
  // Llevabas un mundo ajeno: lo pasas a otro jugador (o, si no queda nadie, vuelve a su dueño) y entras como invitado
  if (resumed && rec.host) { try { await r.attach(name).leave(); } catch (e) { } await sleep(600); }
  await netJoin(rec.code, rec.pass);
  if (inGame()) { if (rec.wid && !NET.game.prev) NET.game.prev = rec.wid; return; }
  if (rec.wid) await play(rec.wid);
}
setTimeout(mpsResume, 300);
