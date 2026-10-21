'use strict';
// Pantalla de inicio: lista de mundos guardados y creador de mundos con vista previa en vivo.
// Cada opción del creador se traduce a un parámetro de GEN_DEFAULT (chunks.js).
const SLIDERS = [
  { k: 'biomeSize', n: 'Tamaño de los biomas', min: 0.5, max: 2.5, step: 0.05, lab: a => a < .25 ? 'Pequeños' : a < .55 ? 'Normales' : a < .8 ? 'Grandes' : 'Enormes' },
  { k: 'rivers', n: 'Ríos', min: 0, max: 2.5, step: 0.05 },
  { k: 'terrain', n: 'Tamaño de las colinas', min: 12, max: 70, step: 1, lab: a => a < .3 ? 'Islas pequeñas' : a < .65 ? 'Medianos' : 'Enormes' },
  { k: 'water', n: 'Nivel del agua', min: 0.2, max: 0.5, step: 0.01 },
  { k: 'sand', n: 'Playas y arena', min: 0, max: 0.15, step: 0.005 },
  { k: 'mountain', n: 'Montañas', min: 0.5, max: 0.78, step: 0.01, inv: 1 },
  { k: 'ores', n: 'Menas en las montañas', min: 0.45, max: 0.75, step: 0.01, inv: 1 },
  { k: 'forest', n: 'Bosques', min: 0.45, max: 0.8, step: 0.01, inv: 1 },
  { k: 'oil', n: 'Petróleo', min: 0.55, max: 0.9, step: 0.01, inv: 1 },
  { k: 'gas', n: 'Géiseres de gas', min: 0, max: 0.005, step: 0.0002 },
  { k: 'veins', n: 'Tamaño de las vetas', min: 0.6, max: 1.8, step: 0.05, lab: a => a < .25 ? 'Finas' : a < .6 ? 'Normales' : 'Enormes' },
  { k: 'lakes', n: 'Lagos', min: -0.08, max: 0.1, step: 0.005 },
  { k: 'flora', n: 'Plantas y hierbas', min: 0.3, max: 2, step: 0.05 },
];
// Clima y mundo: cambian el carácter del mundo, no lo que hay en él (los biomas raros siguen siendo raros)
const SLIDERS2 = [
  { k: 'temp', n: 'Temperatura', min: -0.15, max: 0.15, step: 0.005, lab: a => a < .2 ? 'Glacial' : a < .4 ? 'Fría' : a < .6 ? 'Templada' : a < .8 ? 'Cálida' : 'Tórrida' },
  { k: 'humid', n: 'Humedad', min: -0.15, max: 0.15, step: 0.005, lab: a => a < .2 ? 'Árida' : a < .4 ? 'Seca' : a < .6 ? 'Normal' : a < .8 ? 'Húmeda' : 'Tropical' },
  { k: 'contSize', n: 'Tamaño de los continentes', min: 0.6, max: 1.8, step: 0.05, lab: a => a < .25 ? 'Fragmentados' : a < .55 ? 'Normales' : a < .8 ? 'Grandes' : 'Supercontinentes' },
  { k: 'islands', n: 'Islas en el océano', min: 0, max: 2.5, step: 0.05 },
  { k: 'chaos', n: 'Bordes de los biomas', min: 0.3, max: 2.2, step: 0.05, lab: a => a < .2 ? 'Rectos' : a < .45 ? 'Suaves' : a < .7 ? 'Irregulares' : 'Caóticos' },
  { k: 'fauna', n: 'Animales', min: 0.2, max: 2.5, step: 0.05 },
  { k: 'dayLen', n: 'Duración del día', min: 240, max: 1800, step: 30, lab: (a, v) => Math.round(v / 60) + ' min' },
];
const ALL_SL = SLIDERS.concat(SLIDERS2);
// Pestañas del creador de mundos (todo cabe sin desplazarse)
const CW_TABS = [['gen', '🌍 General'], ['ter', '⛰ Terreno'], ['cli', '🌦 Clima y mundo'], ['play', '⚔ Partida']];
const PRESETS = {
  normal: { n: 'Normal', g: {} },
  islands: { n: 'Archipiélago', g: { terrain: 18, water: 0.45, sand: 0.04 } },
  continents: { n: 'Continentes', g: { terrain: 60, water: 0.33 } },
  mountains: { n: 'Montañoso', g: { mountain: 0.54, water: 0.3, ores: 0.55 } },
  plains: { n: 'Llanuras', g: { mountain: 0.74, forest: 0.68, water: 0.3 } },
  desert: { n: 'Desierto', g: { sand: 0.14, water: 0.27, forest: 0.78, oil: 0.62 } },
  rich: { n: 'Rico en recursos', g: { ores: 0.5, oil: 0.62, gas: 0.003, mountain: 0.58 } },
};
let cwS = null, _prevTimer = 0;
const sliderAmount = (s, v) => s.inv ? (s.max - v) / (s.max - s.min) : (v - s.min) / (s.max - s.min);
const amountLabel = (s, a, v) => s.lab ? s.lab(a, v) : a < 0.15 ? 'Casi nada' : a < 0.4 ? 'Poco' : a < 0.6 ? 'Normal' : a < 0.85 ? 'Mucho' : 'Muchísimo';
function parseSeed(str, fallback) {
  str = String(str || '').trim(); if (!str) return fallback;
  if (/^-?\d+$/.test(str)) return (parseInt(str, 10) | 0) || 1;
  let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return (h | 0) || 1;
}
const fmtDate = t => { try { return new Date(t).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return ''; } };

function openTitle() {
  if (S && currentWorld) saveGame(true);
  closeModal(); ui.open = 'title'; $('mTitle').hidden = false; showList();
}
function closeTitle() { $('mTitle').hidden = true; ui.open = null; }
function showList() {
  const list = worldIndex().sort((a, b) => (b.played || 0) - (a.played || 0));
  let h = `<div class="trow"><h2>Tus mundos</h2><div class="row gap">${S && currentWorld ? '<button data-w="resume" class="pri">Volver a la partida</button>' : ''}<button data-w="new" class="${S && currentWorld ? '' : 'pri'}">Crear mundo nuevo</button><button data-w="import">Importar</button></div></div>`;
  if (!list.length) h += `<div class="empty"><p>Todavía no tienes mundos.</p><p class="mut">Crea uno: elige nombre, semilla y cómo quieres que sea el terreno.</p></div>`;
  h += `<div class="wlist">`;
  for (const w of list) {
    const cur = w.id === currentWorld && S;
    h += `<div class="wcard ${cur ? 'cur' : ''}" data-id-w="${w.id}">
      <div class="wmain"><div class="wname" id="wn-${w.id}">${esc(w.name)}${cur ? ' <span class="tag">abierto</span>' : ''}${w.sandbox ? ' <span class="tag">modo libre</span>' : ''}</div>
      <div class="mut small">Semilla ${esc(w.seed)} · ${w.sandbox ? 'todo desbloqueado' : 'nivel ' + Math.min((w.tier || 0) + 1, TIERS.length) + (w.tier >= TIERS.length ? ' (completo)' : '')} · ${w.blocks || 0} bloques · ${w.kb || 0} KB</div>
      <div class="mut small">Jugado: ${fmtDate(w.played)}</div></div>
      <div class="wbtns"><button class="pri" data-w="play:${w.id}">Jugar</button><button data-w="rename:${w.id}">Renombrar</button><button data-w="dup:${w.id}">Duplicar</button><button data-w="export:${w.id}">Exportar</button><button data-w="del:${w.id}" class="danger">Borrar</button></div>
    </div>`;
  }
  h += `</div><div id="tExtra"></div>`;
  $('tBody').innerHTML = h;
}
function showCreate() {
  const n = worldIndex().length + 1;
  cwS = { pv: 'near', name: 'Mundo ' + n, seed: '', rand: ((Math.random() * 2e9) | 0) || 1, preset: 'normal', gen: { ...GEN_DEFAULT }, startHour: 7, alwaysDay: false, sandbox: false, spawnKit: true, safeSpawn: true, diff: 1 };
  let h = `<div class="trow"><h2>Crear mundo</h2><button data-w="back">← Volver</button></div><div class="cgrid"><div class="cform">
    <div class="cwtabs">${CW_TABS.map(([k, n]) => `<button data-w="cwt:${k}" class="${k === 'gen' ? 'on' : ''}">${n}</button>`).join('')}</div>
    <div class="cwp" data-cwp="gen">
    <label class="fl"><span>Nombre</span><input id="cwName" type="text" maxlength="40" value="${esc(cwS.name)}"></label>
    <label class="fl"><span>Semilla <span class="mut small">(número o texto; vacía = al azar)</span></span><span class="row gap"><input id="cwSeed" type="text" maxlength="40" placeholder="Al azar"><button data-w="rseed" title="Semilla al azar">🎲</button></span><span class="mut small" id="cwSeedOut"></span></label>
    <div class="fl"><span>Tipo de mundo</span><div class="presets">${Object.entries(PRESETS).map(([k, p]) => `<button data-w="preset:${k}" class="${k === 'normal' ? 'on' : ''}">${p.n}</button>`).join('')}</div></div>
    </div>
    <div class="cwp" data-cwp="ter" hidden><div class="slgrid">${SLIDERS.map(slHTML).join('')}</div></div>
    <div class="cwp" data-cwp="cli" hidden><div class="slgrid">${SLIDERS2.map(slHTML).join('')}</div><p class="mut small">Estas opciones cambian el carácter del mundo, pero no deciden qué encontrarás: los biomas raros y las menas de fantasía siguen siendo raros y su sitio depende de la semilla.</p></div>
    <div class="cwp" data-cwp="play" hidden>
      <label class="fl"><span>Hora de inicio</span><select id="cwHour"><option value="7">Amanecer (07:00)</option><option value="12">Mediodía (12:00)</option><option value="18">Atardecer (18:00)</option><option value="22">Noche cerrada (22:00)</option></select></label>
      <label class="fl"><span>Enemigos</span><select id="cwFoes"><option value="0">Ninguno (mundo pacífico)</option><option value="0.5">Pocos</option><option value="1" selected>Normales</option><option value="1.6">Muchos</option><option value="2.4">Horda</option></select></label>
      <label class="fl"><span>Dificultad</span><select id="cwDiff"><option value="1">Normal</option><option value="1.5">Difícil (picar y cazar cuesta un 50 % más)</option><option value="2">Extremo (el doble)</option></select></label>
      <label class="chk"><input type="checkbox" id="cwSpawn" checked> Zona de inicio con recursos garantizados cerca</label>
      <label class="chk"><input type="checkbox" id="cwSafe" checked> Empezar en un bosque templado (si no, puedes nacer en cualquier bioma)</label>
      <label class="chk"><input type="checkbox" id="cwSurv" checked> Supervivencia: vida, hambre, sed, heridas y animales peligrosos</label>
      <label class="chk"><input type="checkbox" id="cwDay"> Siempre de día</label>
      <label class="chk"><input type="checkbox" id="cwSand"> Modo libre: todo desbloqueado, sin objetivos</label>
    </div>
  </div><div class="cprev"><div class="row gap"><button data-w="pv:near" class="on" id="pvNear">Zona de inicio</button><button data-w="pv:far" id="pvFar">Mapa de biomas</button></div><canvas id="cwPrev" width="352" height="352"></canvas><p class="mut small" id="pvCap"></p><div id="pvQuirks" class="pvq"></div><div id="pvBiomes" class="pvb"></div><button class="pri big" data-w="create">Crear mundo y jugar</button></div></div>`;
  $('tBody').innerHTML = h; syncSliders(); schedulePreview();
}
const slHTML = s => `<label class="sl"><span>${s.n}</span><input type="range" id="sl-${s.k}" min="0" max="1000" step="1"><span class="mut small" id="slv-${s.k}"></span></label>`;
function syncSliders() {
  for (const s of ALL_SL) {
    const v = cwS.gen[s.k], a = sliderAmount(s, v), el = $('sl-' + s.k);
    if (el) { el.value = Math.round(a * 1000); $('slv-' + s.k).textContent = amountLabel(s, a, v); }
  }
  const seed = parseSeed(cwS.seed, cwS.rand); $('cwSeedOut').textContent = cwS.seed ? `Semilla numérica: ${seed}` : `Al azar: ${seed}`;
}
function schedulePreview() { clearTimeout(_prevTimer); _prevTimer = setTimeout(drawPreview, 90); }
function previewGen() { return applyQuirks({ ...cwS.gen, seed: parseSeed(cwS.seed, cwS.rand), spawnKit: cwS.spawnKit, safeSpawn: cwS.safeSpawn, diff: cwS.diff }); }
function showQuirks(P) { const el = $('pvQuirks'); if (!el) return; el.innerHTML = `<div class="cat">Rasgos de esta semilla <span class="mut small">(no se pueden elegir)</span></div>` + P.quirks.map(n => { const q = QUIRKS.find(x => x.n === n); return `<span class="chip" title="${esc(q.d)}">✦ ${esc(n)}</span>`; }).join(' ') + `<div class="mut small">${P.quirks.map(n => esc(QUIRKS.find(x => x.n === n).d)).join(' ')}</div>`; }
// Vista previa por partes (unas filas por tramo) para no congelar la interfaz
let _pvJob = 0;
function drawPreview() {
  const cv2 = $('cwPrev'); if (!cv2) return;
  const far = cwS.pv === 'far', N = far ? 128 : 176, span = far ? 4000 : 240, step = span / N, P = previewGen(), job = ++_pvJob;
  showQuirks(P);
  const c = cv2.getContext('2d'), img = c.createImageData(N, N), d = img.data, tmp = mkCanvas(N, N), counts = new Map(), cl = [0, 0, 0, 0, 0];
  $('pvCap').textContent = far ? 'Mapa de biomas (4.000 × 4.000 casillas alrededor del inicio). Lo que no ves aquí puede estar mucho más lejos.' : 'Zona de inicio (240 × 240 casillas). El mundo no tiene límites.';
  let row = 0;
  const slice = () => {
    if (job !== _pvJob) return;
    for (let n = 0; n < (far ? 8 : 22) && row < N; n++, row++) for (let px = 0; px < N; px++) {
      const x = Math.floor((px - N / 2) * step), y = Math.floor((row - N / 2) * step);
      let col;
      if (far) {
        climate(x, y, P, cl); const b = pickBiome(cl[0], cl[1], cl[2], cl[3], cl[4], P), B = BIOMES[b];
        counts.set(b, (counts.get(b) || 0) + 1);
        col = hexRGB(B.mc);
        if (!B.ocean && cl[0] > oceanLevel(P) + 0.04 && riverAt(x, y, P) === 2) col = GI[B.riverI].c;
      } else col = mapRGB(x, y, genTile(x, y, P));
      const i = (row * N + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    tmp.getContext('2d').putImageData(img, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(tmp, 0, 0, cv2.width, cv2.height);
    if (row < N) { setTimeout(slice, 0); return; }
    if (!$('pvBiomes')) return; // se salió del creador mientras se dibujaba
    c.strokeStyle = '#e0b54c'; c.lineWidth = 2; c.beginPath(); c.arc(cv2.width / 2, cv2.height / 2, 6, 0, 7); c.stroke();
    if (far) { const tot = N * N; const all = [...counts.entries()].sort((a, b) => b[1] - a[1]); $('pvBiomes').innerHTML = all.slice(0, 9).map(([b, n]) => `<span class="chip"><i class="fdot" style="background:${BIOMES[b].mc}"></i>${esc(BIOMES[b].n)} ${n / tot < 0.01 ? '<1' : Math.round(n / tot * 100)} %</span>`).join('') + `<span class="mut small">${all.length > 9 ? '+' + (all.length - 9) + ' más · ' : ''}${counts.size} de ${BIOMES.length} biomas en esta zona</span>`; }
    else $('pvBiomes').innerHTML = '';
  };
  slice();
}
function createFromForm() {
  const gen = previewGen(), id = newWorldId();
  if (S && currentWorld) saveGame(true);
  newGame(gen, { name: (cwS.name || '').trim() || 'Mi mundo', kit: cwS.kit, alwaysDay: cwS.alwaysDay, sandbox: cwS.sandbox, surv: cwS.surv !== false });
  S.created = Date.now(); currentWorld = id;
  if (!saveGame(true)) toast('Aviso: este navegador no permite guardar; la partida se perderá al cerrar');
  openCharCreator('new', () => { saveGame(true); enterWorld(); openModal('help'); });
}
function enterWorld() {
  charData(); if (!S.char.made) { openCharCreator('old', () => { saveGame(true); enterWorld(); }); return; }
  view.x = S.player.x; view.y = S.player.y; ui.held = null; ui.hand = false;
  buildHotbar(); renderGoal(); closeTitle(); toast(`Mundo: ${S.name}`);
}
// ---------- Acciones ----------
const _delArm = {};
function worldAction(act, btn) {
  const [k, id] = act.split(':');
  switch (k) {
    case 'resume': closeTitle(); break;
    case 'new': showCreate(); break;
    case 'back': showList(); break;
    case 'play':
      if (id === currentWorld && S) { closeTitle(); break; }
      if (S && currentWorld) saveGame(true);
      if (loadWorld(id)) enterWorld(); else toast('No se pudo abrir el mundo: los datos están dañados o no son compatibles');
      break;
    case 'rename': {
      const el = $('wn-' + id), w = worldIndex().find(x => x.id === id); if (!el || !w) break;
      el.innerHTML = `<span class="row gap"><input type="text" id="rn-${id}" maxlength="40" value="${esc(w.name)}"><button class="pri" data-w="rnok:${id}">Guardar</button></span>`;
      setTimeout(() => { const i = $('rn-' + id); if (i) { i.focus(); i.select(); } }, 0); break;
    }
    case 'rnok': {
      const name = ($('rn-' + id).value || '').trim() || 'Mi mundo';
      if (id === currentWorld && S) { S.name = name; saveGame(true); }
      else { const raw = lsGet(WKEY(id)); try { const d = JSON.parse(raw); d.name = name; lsSet(WKEY(id), JSON.stringify(d)); } catch (e) { } const list = worldIndex(); const w = list.find(x => x.id === id); if (w) w.name = name; saveIndex(list); }
      showList(); break;
    }
    case 'dup': {
      if (id === currentWorld && S) saveGame(true);
      const raw = lsGet(WKEY(id)), list = worldIndex(), w = list.find(x => x.id === id); if (!raw || !w) break;
      const nid = newWorldId(), name = w.name + ' (copia)';
      let data = raw; try { const d = JSON.parse(raw); d.name = name; data = JSON.stringify(d); } catch (e) { }
      if (!lsSet(WKEY(nid), data)) { toast('No hay espacio para duplicar el mundo'); break; }
      list.unshift({ ...w, id: nid, name, created: Date.now(), played: Date.now() }); saveIndex(list); toast('Mundo duplicado'); showList(); break;
    }
    case 'export': {
      if (id === currentWorld && S) saveGame(true);
      const raw = lsGet(WKEY(id)) || '';
      $('tExtra').innerHTML = `<div class="xbox"><h3>Exportar mundo</h3><p class="mut small">Guarda este texto donde quieras. Para recuperarlo, usa «Importar».</p><textarea id="xText" readonly rows="5">${esc(raw)}</textarea><div class="row gap"><button class="pri" data-w="copy">Copiar</button><span class="mut small">${Math.round(raw.length / 1024)} KB</span></div></div>`;
      $('xText').select(); break;
    }
    case 'copy': { const t = $('xText'); navigator.clipboard && navigator.clipboard.writeText(t.value).then(() => toast('Copiado al portapapeles'), () => { t.select(); toast('Selecciona el texto y cópialo con Ctrl+C'); }); break; }
    case 'import':
      $('tExtra').innerHTML = `<div class="xbox"><h3>Importar mundo</h3><p class="mut small">Pega aquí el texto de un mundo exportado.</p><textarea id="iText" rows="5" placeholder="{&quot;v&quot;:3, …}"></textarea><div class="row gap"><button class="pri" data-w="imok">Importar</button></div></div>`;
      setTimeout(() => { const i = $('iText'); if (i) i.focus(); }, 0); break;
    case 'imok': {
      const raw = $('iText').value.trim();
      let d; try { d = JSON.parse(raw); } catch (e) { toast('Ese texto no es un mundo válido'); break; }
      if (!d || d.v !== 3 || !d.gen) { toast('Ese texto no es un mundo de esta versión del juego'); break; }
      const nid = newWorldId(); if (!lsSet(WKEY(nid), raw)) { toast('No hay espacio para importar el mundo'); break; }
      const list = worldIndex(); list.unshift({ id: nid, name: d.name || 'Mundo importado', seed: d.gen.seed, created: Date.now(), played: Date.now(), tier: d.tier || 0, sandbox: !!d.sandbox, blocks: (d.bs || []).length, kb: Math.round(raw.length / 1024) });
      saveIndex(list); toast('Mundo importado'); showList(); break;
    }
    case 'del':
      if (!_delArm[id]) { _delArm[id] = 1; btn.textContent = '¿Seguro? Borrar'; btn.classList.add('armed'); setTimeout(() => { _delArm[id] = 0; if (btn.isConnected) { btn.textContent = 'Borrar'; btn.classList.remove('armed'); } }, 3000); break; }
      _delArm[id] = 0; deleteWorld(id);
      if (id === currentWorld) { currentWorld = null; S = null; }
      toast('Mundo borrado'); showList(); break;
    case 'rseed': cwS.seed = String(((Math.random() * 2e9) | 0) || 1); $('cwSeed').value = cwS.seed; syncSliders(); schedulePreview(); break;
    case 'preset':
      cwS.preset = id; cwS.gen = { ...GEN_DEFAULT, ...PRESETS[id].g };
      document.querySelectorAll('.presets button').forEach(b => b.classList.toggle('on', b.dataset.w === act));
      syncSliders(); schedulePreview(); break;
    case 'create': createFromForm(); break;
    case 'cwt': document.querySelectorAll('.cwtabs button').forEach(b => b.classList.toggle('on', b.dataset.w === act)); document.querySelectorAll('.cwp').forEach(p => p.hidden = p.dataset.cwp !== id); break;
    case 'pv': cwS.pv = id; $('pvNear').classList.toggle('on', id === 'near'); $('pvFar').classList.toggle('on', id === 'far'); drawPreview(); break;
  }
}
$('mTitle').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) worldAction(b.dataset.w, b); });
$('mTitle').addEventListener('input', e => {
  const t = e.target; if (!cwS) return;
  if (t.id === 'cwName') cwS.name = t.value;
  else if (t.id === 'cwSeed') { cwS.seed = t.value; syncSliders(); schedulePreview(); }
  else if (t.id && t.id.startsWith('sl-')) {
    const s = ALL_SL.find(x => 'sl-' + x.k === t.id), a = +t.value / 1000;
    const v = s.inv ? s.max - a * (s.max - s.min) : s.min + a * (s.max - s.min);
    cwS.gen[s.k] = Math.round(v / s.step) * s.step; $('slv-' + s.k).textContent = amountLabel(s, a, cwS.gen[s.k]);
    document.querySelectorAll('.presets button').forEach(b => b.classList.remove('on'));
    schedulePreview();
  }
});
$('mTitle').addEventListener('change', e => {
  const t = e.target; if (!cwS) return;
  if (t.id === 'cwHour') cwS.startHour = +t.value;
  if (t.id === 'cwDay') cwS.alwaysDay = t.checked;
  if (t.id === 'cwSand') cwS.sandbox = t.checked;
  if (t.id === 'cwSpawn') { cwS.spawnKit = t.checked; schedulePreview(); }
  if (t.id === 'cwSafe') { cwS.safeSpawn = t.checked; schedulePreview(); }
  if (t.id === 'cwDiff') cwS.diff = +t.value;
  if (t.id === 'cwFoes') cwS.gen.foes = +t.value;
  if (t.id === 'cwSurv') cwS.surv = t.checked;
});
$('mTitle').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('rn-')) worldAction('rnok:' + e.target.id.slice(3)); });
