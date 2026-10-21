'use strict';
// Fauna: animales ligeros (no se guardan). Aparecen al cargarse un chunk según su bioma,
// deambulan, huyen del jugador y solo se simulan cerca de él. Se cazan con la mano
// (clic mantenido) o con trampas. Al descargarse el chunk desaparecen y vuelven a nacer después.
// c: cuerpo · c2: detalle · s: tamaño · v: velocidad (casillas/s) · aq: acuático · fly: vuela · drops
const SPECIES = {
  // Fantasía (biomas raros)
  wisp: { glow: 1, n: 'Fuego fatuo', c: '#9af0ff', c2: '#ffffff', s: 4, v: 2, drops: [['wispEssence', 1]], bird: 1, fly: 1 },
  frostwolf: { n: 'Lobo de escarcha', c: '#cfe8ff', c2: '#5a8ab8', s: 8, v: 3, drops: [['frostFang', 1], ['fur', 1]] },
  basilisk: { n: 'Basilisco', c: '#4a6a2a', c2: '#e0d040', s: 7, v: 1.6, drops: [['basiliskEye', 1], ['scales', 2]], snake: 1 },
  griffin: { n: 'Grifo', c: '#c8a060', c2: '#f4f0e0', s: 10, v: 3.4, drops: [['griffinFeather', 2], ['meat', 1]], bird: 1, fly: 1 },
  drake: { n: 'Draco', c: '#a83a2a', c2: '#f0a040', s: 9, v: 2.4, drops: [['drakeScale', 2], ['meat', 1]], tail: 1 },
  unicorn: { n: 'Unicornio', c: '#f8f4ff', c2: '#e0a0ff', s: 9, v: 3.2, drops: [['unicornHorn', 1], ['hide', 1]], horn: 1 },
  shadowcat: { n: 'Gato sombrío', c: '#2a2238', c2: '#a060ff', s: 6, v: 3.4, drops: [['shadowPelt', 1]], ears: 1, tail: 1 },
  golem: { glow: 1, n: 'Gólem de cristal', c: '#9a8ab8', c2: '#e0d0ff', s: 10, v: 0.8, drops: [['golemCore', 1], ['crystal', 2]] },
  phoenix: { glow: 1, n: 'Fénix', c: '#ff7a2a', c2: '#ffe040', s: 7, v: 4, drops: [['phoenixFeather', 1]], bird: 1, fly: 1 },
  slime: { n: 'Limo arcano', c: '#7af0a0', c2: '#2a8a5a', s: 5, v: 1, drops: [['slimeGel', 2]], hop: 1 },
  deer: { n: 'Ciervo', c: '#9a6a3c', c2: '#e8d4b0', s: 8, v: 2.4, drops: [['meat', 1], ['hide', 1]], horn: 1 },
  reindeer: { n: 'Reno', c: '#8a7058', c2: '#f0ece0', s: 8, v: 2.2, drops: [['meat', 1], ['fur', 1]], horn: 1 },
  rabbit: { n: 'Conejo', c: '#b89a7a', c2: '#f4ece0', s: 4, v: 3, drops: [['meat', 1], ['hide', 1]], ears: 1 },
  boar: { n: 'Jabalí', c: '#5a4434', c2: '#e8e0d0', s: 7, v: 2, drops: [['meat', 2], ['hide', 1]] },
  sheep: { n: 'Oveja', c: '#eeeae0', c2: '#3a3430', s: 7, v: 1.4, drops: [['wool', 2], ['meat', 1]], fluffy: 1 },
  goat: { n: 'Cabra montés', c: '#c8c0b0', c2: '#5a5048', s: 6, v: 2.4, drops: [['wool', 1], ['hide', 1]], horn: 1 },
  horse: { n: 'Caballo', c: '#7a4a2a', c2: '#2a1a10', s: 9, v: 3, drops: [['hide', 2]] },
  wolf: { n: 'Lobo', c: '#7a7a80', c2: '#d8d8dc', s: 7, v: 2.8, drops: [['bone', 1], ['fur', 1]] },
  fox: { n: 'Zorro', c: '#d8742a', c2: '#f4ece0', s: 5, v: 3, drops: [['fur', 1]], ears: 1 },
  polarbear: { n: 'Oso polar', c: '#f0f0ea', c2: '#2a2a2a', s: 11, v: 1.6, drops: [['fur', 2], ['meat', 2]] },
  penguin: { n: 'Pingüino', c: '#1e2228', c2: '#f4f4f4', s: 5, v: 1.2, drops: [['feather', 2]], bird: 1 },
  seal: { n: 'Foca', c: '#6a6a70', c2: '#9a9aa0', s: 8, v: 1.2, drops: [['fur', 1], ['meat', 1]], swim: 1 },
  camel: { n: 'Camello', c: '#c8a46a', c2: '#8a6a3a', s: 10, v: 1.8, drops: [['wool', 2], ['hide', 1]] },
  lizard: { n: 'Lagarto', c: '#6a9a4a', c2: '#e0d070', s: 4, v: 3.2, drops: [['scales', 1]], tail: 1 },
  scorpion: { n: 'Escorpión', c: '#5a3a1e', c2: '#c8a050', s: 4, v: 2.2, drops: [['venom', 1], ['chitin', 1]], tail: 1 },
  snake: { n: 'Serpiente', c: '#4a7a2a', c2: '#d8c84a', s: 5, v: 2, drops: [['scales', 1], ['venom', 1]], snake: 1 },
  parrot: { n: 'Loro', c: '#e83a2a', c2: '#2a8ae8', s: 4, v: 3.5, drops: [['feather', 2]], bird: 1, fly: 1 },
  monkey: { n: 'Mono', c: '#6a4a2a', c2: '#d8b890', s: 5, v: 3, drops: [['hide', 1]], ears: 1 },
  panda: { n: 'Panda', c: '#f4f4f0', c2: '#1a1a1a', s: 9, v: 1, drops: [['fur', 2]] },
  spider: { n: 'Araña gigante', c: '#2a2422', c2: '#c83a2a', s: 5, v: 2.6, drops: [['silk', 2], ['venom', 1]], legs8: 1 },
  frog: { n: 'Rana', c: '#4a9a3a', c2: '#e8e070', s: 3, v: 2.4, drops: [['venom', 1]], hop: 1 },
  heron: { n: 'Garza', c: '#c8d0d8', c2: '#2a2a30', s: 6, v: 2, drops: [['feather', 2]], bird: 1 },
  crab: { n: 'Cangrejo', c: '#d8502a', c2: '#f4c0a0', s: 4, v: 1.8, drops: [['shell', 1], ['meat', 1]], legs8: 1 },
  turtle: { n: 'Tortuga', c: '#4a7a4a', c2: '#a8c88a', s: 6, v: 0.8, drops: [['shell', 2]], swim: 1 },
  seagull: { n: 'Gaviota', c: '#f4f4f4', c2: '#e8a030', s: 4, v: 3.5, drops: [['feather', 1]], bird: 1, fly: 1 },
  flamingo: { n: 'Flamenco', c: '#f490b0', c2: '#2a2a2a', s: 6, v: 2, drops: [['feather', 2]], bird: 1 },
  buffalo: { n: 'Búfalo', c: '#4a3a2e', c2: '#d8c8b0', s: 11, v: 1.6, drops: [['hide', 2], ['meat', 2]], horn: 1 },
  antelope: { n: 'Antílope', c: '#c8904a', c2: '#f4ece0', s: 7, v: 3.4, drops: [['hide', 1], ['meat', 1]], horn: 1 },
  elephant: { n: 'Elefante', c: '#8a8a90', c2: '#f4ecd4', s: 14, v: 1, drops: [['ivory', 1], ['hide', 2]] },
  vulture: { n: 'Buitre', c: '#4a3a32', c2: '#e8b8a0', s: 6, v: 3, drops: [['feather', 2], ['bone', 1]], bird: 1, fly: 1 },
  salamander: { n: 'Salamandra de fuego', c: '#e85a1a', c2: '#2a1a1a', s: 5, v: 2.4, drops: [['scales', 1], ['sulfur', 1]], tail: 1, glow: 1 },
  beetle: { n: 'Escarabajo', c: '#2a3a4a', c2: '#5ae0a0', s: 4, v: 1.6, drops: [['chitin', 1]], legs8: 1 },
  crystalbeetle: { n: 'Escarabajo de cristal', c: '#9a7ae0', c2: '#e0d0ff', s: 5, v: 1.6, drops: [['chitin', 1], ['crystal', 1]], legs8: 1, glow: 1 },
  moth: { n: 'Polilla gigante', c: '#c8b890', c2: '#6a5a3a', s: 4, v: 2.4, drops: [['silk', 1]], fly: 1, wings: 1 },
  bee: { n: 'Abeja', c: '#f0b030', c2: '#2a2010', s: 3, v: 2.8, drops: [['honeycomb', 1]], fly: 1, wings: 1 },
  butterfly: { n: 'Mariposa', c: '#5aa0f0', c2: '#f0e060', s: 3, v: 2, drops: [['petals', 1]], fly: 1, wings: 1 },
  mooshroom: { n: 'Vaca champiñón', c: '#c83a32', c2: '#f4e8e0', s: 9, v: 1.2, drops: [['mushroom', 2], ['hide', 1]] },
  fish: { n: 'Pez', c: '#7ab0d0', c2: '#f0f0f0', s: 4, v: 2, drops: [['fish', 1]], aq: 1 },
  dolphin: { n: 'Delfín', c: '#6a8aa8', c2: '#e0e8f0', s: 9, v: 4, drops: [['fish', 2]], aq: 1 },
  squid: { n: 'Calamar', c: '#3a3a6a', c2: '#8a8ac8', s: 6, v: 1.4, drops: [['ink', 2]], aq: 1 },
  jellyfish: { n: 'Medusa', c: '#e8a0f0', c2: '#fff0ff', s: 5, v: 0.7, drops: [['venom', 1]], aq: 1, glow: 1 },
};
let ANIMALS = [];
const MAX_ANIMALS = 160;
function canStand(sp, x, y) { const t = gnd(x, y), g = GI[t]; if (sp.aq) return !!g.liquid && g.liquid === 'water' && !g.walk; if (sp.fly) return true; if (sp.swim && g.liquid === 'water') return true; return walkable(t) && !GI[t].solid && !((b => b && !BD[b.type].walk)(at(x, y))); }
// Nacen al cargar un chunk cerca del jugador (determinista por chunk)
function spawnFauna(c) {
  if (c.faunaDone || ANIMALS.length >= MAX_ANIMALS) return; c.faunaDone = true;
  const s = S.gen.seed, k = ckey(c.cx, c.cy);
  const bio = c.bio[(16 << CSH) | 16], B = BIOMES[bio]; if (!B.fauna || !B.faunaSum) return;
  const n = Math.round(B.fd * (0.5 + hash2(c.cx, c.cy, s + 1001)) * (S.gen.fauna ?? 1));
  for (let i = 0; i < n * 3 && c._fn !== n; i++) {
    const lx = Math.floor(hash2(c.cx * 7 + i, c.cy, s + 1010) * CS), ly = Math.floor(hash2(c.cx, c.cy * 7 + i, s + 1020) * CS);
    const b = BIOMES[c.bio[(ly << CSH) | lx]]; if (!b.fauna) continue;
    let r = hash2(i, k % 9973, s + 1030) * b.faunaSum, id = b.fauna[0][0];
    for (const [sp, w] of b.fauna) { r -= w; if (r <= 0) { id = sp; break; } }
    const sp = SPECIES[id], x = c.cx * CS + lx, y = c.cy * CS + ly;
    if (!canStand(sp, x, y)) continue;
    ANIMALS.push({ sp: id, x: (x + 0.5) * T, y: (y + 0.5) * T, tx: 0, ty: 0, t: 0, face: 1, ph: hash2(x, y, 3) * 6, ck: k, cx: c.cx, cy: c.cy });
    c._fn = (c._fn || 0) + 1;
  }
}
onChunkUnload = c => { if (ANIMALS.length) ANIMALS = ANIMALS.filter(a => a.ck !== ckey(c.cx, c.cy)); };
let _faunaRespawn = 0;
function faunaTick(dt) {
  const px = S.player.x, py = S.player.y, R = 3 * CS * T;
  for (let i = ANIMALS.length - 1; i >= 0; i--) {
    const a = ANIMALS[i], sp = SPECIES[a.sp];
    const dx = a.x - px, dy = a.y - py, d2 = dx * dx + dy * dy;
    if (d2 > R * R * 4) continue; // lejos: congelado
    a.ph += dt * (sp.wings ? 18 : 8);
    if (a.frz > 0) { a.frz -= dt; continue; } // congelado por un arma de escarcha
    // Los depredadores persiguen y atacan; el resto huye si el jugador se acerca
    const hs = HOSTILE[a.sp] ? hostileStep(a, sp, d2, dt) : false;
    if (hs === 'hold') continue;
    const flee = !hs && d2 < (4 * T) * (4 * T) && sp.s < 11;
    a.t -= dt;
    if (hs) { }
    else if (flee) { const l = Math.sqrt(d2) || 1; a.tx = a.x + dx / l * 6 * T; a.ty = a.y + dy / l * 6 * T; a.t = 1; }
    else if (a.t <= 0) { a.tx = a.x + (Math.random() - 0.5) * 10 * T; a.ty = a.y + (Math.random() - 0.5) * 10 * T; a.t = 2 + Math.random() * 4; a.rest = Math.random() < 0.4; }
    if (a.rest && !flee) continue;
    const mx = a.tx - a.x, my = a.ty - a.y, ml = Math.hypot(mx, my);
    if (ml < 2) { a.rest = true; continue; }
    const v = sp.v * T * dt * (hs ? 1.1 : flee ? 1.8 : 1), nx = a.x + mx / ml * v, ny = a.y + my / ml * v;
    const tx = Math.floor(nx / T), ty = Math.floor(ny / T);
    if (!peekChunk(tx >> CSH, ty >> CSH) || !canStand(sp, tx, ty)) { a.t = 0; continue; }
    a.x = nx; a.y = ny; if (Math.abs(mx) > 0.5) a.face = mx > 0 ? 1 : -1;
    // ¿Ha pisado una trampa?
    const b = at(tx, ty);
    if (b && b.type === 'trap' && !sp.fly && !sp.aq && total(b.out) < 32) { for (const [id, n] of sp.drops) dictAdd(b.out, id, n); b.caught = (b.caught || 0) + 1; ANIMALS.splice(i, 1); }
  }
  // Repoblación lenta en chunks cercanos que se han quedado vacíos
  _faunaRespawn += dt;
  if (_faunaRespawn > 45) {
    _faunaRespawn = 0;
    const pcx = Math.floor(px / T / CS), pcy = Math.floor(py / T / CS);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const c = peekChunk(pcx + dx, pcy + dy);
      if (c && c.faunaDone && !ANIMALS.some(a => a.ck === ckey(c.cx, c.cy))) { c.faunaDone = false; c._fn = 0; spawnFauna(c); }
    }
  }
}
function animalAt(wx, wy, reach = 0) {
  let best = null, bd = 1e9;
  for (const a of ANIMALS) { const d = Math.hypot(a.x - wx, a.y - wy), r = SPECIES[a.sp].s + 6 + reach; if (d < r && d < bd) { bd = d; best = a; } }
  return best;
}
// Caza con o sin arma: el arma decide el botín extra y los efectos de su elemento
function huntAnimal(a, w, got) {
  const sp = SPECIES[a.sp], own = !got; got = got || {};
  const loot = (w ? w.loot || 0 : 0) + (invCount('fortuneAmulet') ? 0.25 : 0);
  for (const [id0, n] of sp.drops) {
    const id = w && w.el === 'fire' && id0 === 'meat' ? 'cookedMeat' : id0;
    const k = n + (Math.random() < loot ? n : 0); got[id] = (got[id] || 0) + k;
  }
  if (w && w.el === 'life' && Math.random() < 0.5) got.essenceLife = (got.essenceLife || 0) + 1;
  const i = ANIMALS.indexOf(a); if (i >= 0) ANIMALS.splice(i, 1);
  if (!own) return;
  let lost = 0; for (const id in got) lost += invAdd(id, got[id]);
  toast(`${sp.n}: ${Object.keys(got).map(id => got[id] + ' ' + ITEMS[id].n).join(', ')}${lost ? ' (inventario lleno)' : ''}`);
}
function huntWith(a, w) {
  const got = {}, list = [a];
  if (w && (w.sweep || w.chain)) {
    const near = ANIMALS.filter(o => o !== a).map(o => [o, Math.hypot(o.x - a.x, o.y - a.y)]).sort((p, q) => p[1] - q[1]);
    let chained = 0;
    for (const [o, d] of near) { if (w.sweep && d < w.sweep) list.push(o); else if (chained < (w.chain || 0) && d < 4 * T) { list.push(o); chained++; } }
  }
  if (w && w.el === 'frost') for (const o of ANIMALS) if (Math.hypot(o.x - a.x, o.y - a.y) < 6 * T) o.frz = 6;
  for (const o of list) huntAnimal(o, w, got);
  let lost = 0; for (const id in got) lost += invAdd(id, got[id]);
  const sp = SPECIES[a.sp];
  toast(`${list.length > 1 ? list.length + ' presas' : sp.n}: ${Object.keys(got).map(id => got[id] + ' ' + ITEMS[id].n).join(', ')}${lost ? ' (inventario lleno)' : ''}`);
}
// El dibujo de los animales está en render/animals.js
