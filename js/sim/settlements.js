'use strict';
// =====================================================================================
//  Asentamientos: aldeas, ciudades, clanes, tribus y pueblos mineros, cada uno de un pueblo
//  (etnia) con su propia historia. Se generan con el mundo, a partir de la semilla.
//  · Reparto: el mundo se divide en celdas de STL_CELL casillas; en cada una puede haber como
//    mucho un asentamiento, lejos del borde, así que nunca hay dos cerca. Lo que sale depende
//    del bioma del sitio: cada pueblo vive en sus tierras (valles, nieve, desierto, selva, montes).
//  · Plano: plaza con pozo, fuente, hoguera o tótems; caminos que salen de ella; casas a los
//    lados de los caminos (con la puerta hacia el camino), edificios especiales (herrería,
//    taberna, templo, cuartel, salón del clan, mina…), granjas con cultivos y vallas, faroles,
//    flores y setos, y murallas, empalizadas o tótems alrededor. Las casas de las ciudades a
//    veces tienen dos pisos (sim/floors.js).
//  · Se dibuja con los bloques normales del juego: se puede entrar, comerciar y (si quieres)
//    romperlo todo. Se coloca al generarse cada chunk por primera vez; lo ya explorado antes
//    de esta versión no cambia.
//  · Vida: los aldeanos (no se guardan; aparecen cuando te acercas) van a trabajar de día —
//    granjeros en los campos, herreros en el yunque, mineros en la mina, mercaderes en la
//    plaza, guardias de ronda que disparan a los monstruos— y de noche vuelven a casa.
//    Pulsa F sobre uno para comerciar; el anciano (o el jarl, el chamán…) te cuenta la historia.
// =====================================================================================
const STL_CELL = 340;
const stlR = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pickR = (R, a) => a[(R() * a.length) | 0];
// ---------- Pueblos (etnias) ----------
const STL_CULT = {
  valle: { n: 'la Gente del Valle', gent: 'valleños', i: '🌾', c: '#9ae07a', bios: ['plains', 'flowerField', 'meadow', 'forest', 'birchForest', 'cherryGrove'], kinds: [['ciudad', 0.3], ['aldea', 1]],
    base: 'GRASS', plaza: 'COBBLE', road: 'GRAVEL', floor: 'PLANKFLOOR', walls: ['woodWall', 'logWall', 'woodWall'], cityWalls: ['stoneBricks', 'brickWall', 'stoneBricks'], roofs: ['roofThatch', 'roofWood', 'roofTile'], cityRoofs: ['roofTile', 'roofSlate', 'roofTile'], crops: ['wheat', 'carrot', 'potato', 'corn'],
    syl: [['Bru', 'Val', 'Mira', 'Ro', 'San', 'Al', 'Fuen', 'Pra', 'Vi', 'Lo', 'Ce', 'Ar'], ['ma', 'de', 'ga', 'sal', 'ver', 'ble', 'fra', 'mon', 'ce', 'ri'], ['valle', 'dal', 'sol', 'rena', 'monte', 'fuente', 'vega', 'ledo', 'ar', 'ena']],
    pers: [['Al', 'Be', 'Ca', 'Do', 'El', 'Fer', 'Gil', 'Ma', 'Ro', 'Te'], ['ra', 'ni', 'lo', 'ber', 'ria', 'san', 'de'], ['n', 'to', 'na', 'ro', 'da', 'ldo', 'sa']],
    leader: ['el alcalde', 'la alcaldesa'], elder: 'Anciano', motto: ['«La tierra da a quien la cuida»', '«Pan para todos, puertas abiertas»', '«Del valle, para el valle»'],
    found: ['huyeron de las crecidas del Gran Río y buscaron tierra alta y fértil', 'siguieron una estrella fugaz hasta este lugar y juraron no volver a vagar', 'eran pastores que encontraron aquí la hierba más verde de la región', 'llegaron tras la Larga Sequía con las últimas semillas que les quedaban'],
    event: ['una plaga de no-muertos salió de las ruinas cercanas y la milicia la detuvo en el puente', 'un invierno terrible mató medio rebaño y casi deja el pueblo vacío', 'un incendio arrasó el viejo granero y lo levantaron de nuevo en piedra', 'unos bandidos asaltaron las caravanas hasta que la guardia los expulsó'],
    econ: 'Viven de sus campos de trigo y del mercado de la plaza.' },
  norte: { n: 'los Clanes de Hierro del Norte', gent: 'norteños', i: '🪓', c: '#9ad8ff', bios: ['taiga', 'snowyTaiga', 'tundra', 'iceSpikes'], kinds: [['clan', 1]],
    base: 'SNOW', plaza: 'COBBLE', road: 'GRAVEL', floor: 'PLANKFLOOR', walls: ['logWall', 'logWall', 'woodWall'], roofs: ['roofWood', 'roofThatch', 'roofWood'], crops: ['potato', 'carrot'],
    syl: [['Hrol', 'Skar', 'Jor', 'Ulf', 'Bjar', 'Thor', 'Kjel', 'Grim', 'Hal', 'Vig'], ['ga', 'vi', 'stad', 'mun', 'ra', 'ke'], ['heim', 'gard', 'vik', 'fjell', 'borg', 'dal']],
    pers: [['Ra', 'Sig', 'Har', 'Ein', 'Ing', 'Ul', 'Gun', 'Bri', 'Tor', 'As'], ['gn', 'ur', 'al', 'var', 'hil', 'na'], ['ar', 'rid', 'd', 'ulf', 'a', 'stein']],
    leader: ['el jarl', 'la jarl'], elder: 'Jarl', motto: ['«El hierro no se dobla»', '«Juntos contra el invierno»', '«Ningún lobo entra en nuestra casa»'],
    found: ['desembarcaron de los fiordos helados en tres barcos y quemaron dos para no volver', 'juraron guardar el Paso del Lobo después de que su vieja aldea cayera', 'siguieron a una manada de renos durante un invierno entero hasta aquí', 'forjaron su primera hacha con el hierro de una estrella caída'],
    event: ['una gran helada duró una estación entera y sobrevivieron comiendo pescado del hielo', 'otro clan rival les robó su estandarte y lo recuperaron tras siete días de marcha', 'un oso gigante rondó la empalizada durante años hasta que el jarl lo venció', 'una avalancha sepultó el salón viejo y levantaron uno más grande'],
    econ: 'Viven de la caza, la forja y de lo que traen de sus incursiones.' },
  arena: { n: 'las Tribus Kaar de las Arenas', gent: 'kaar', i: '🐫', c: '#ffd34a', bios: ['desert', 'redDesert', 'badlands', 'saltFlats', 'savanna', 'shrubland'], kinds: [['tribu', 1]],
    base: 'SAND', plaza: 'GRAVEL', road: 'GRAVEL', floor: 'SAND', walls: ['sandstone', 'clayBlock', 'sandstone'], roofs: ['roofThatch', 'roofThatch', 'roofTile'], crops: ['corn', 'wheat'],
    syl: [['Ka', 'Zu', 'Ma', 'Ta', 'Sha', 'Ra', 'Na', 'Qa', 'Ha', 'Ya'], ['ra', 'hi', 'mel', 'sa', 'dun', 'kar'], ['bad', 'ruk', 'zan', 'mar', 'esh', 'tun']],
    pers: [['Za', 'Ra', 'Ka', 'Ta', 'Ish', 'Om', 'Na', 'Sa'], ['hi', 'ma', 'ri', 'ka', 'lem', 'di'], ['ra', 'r', 'ma', 'a', 'el', 'm']],
    leader: ['el gran chamán', 'la gran chamana'], elder: 'Chamán', motto: ['«El agua es vida, la arena es memoria»', '«Seguimos el viento»', '«Lo que el sol quema, la tribu lo cura»'],
    found: ['siguieron a los camellos sagrados durante cuarenta días hasta un oasis escondido', 'sobrevivieron a la Tormenta Roja refugiándose en estas rocas', 'una visión de su chamán les mostró agua bajo la arena', 'eran mercaderes de sal que se quedaron donde se cruzaban las caravanas'],
    event: ['el oasis se secó y lo devolvieron a la vida cavando el pozo más hondo de las arenas', 'escorpiones gigantes atacaron en la luna roja y los cazadores los rechazaron', 'una tormenta de arena enterró media aldea durante tres días', 'una caravana perdida trajo una enfermedad que la curandera venció con hierbas'],
    econ: 'Viven del comercio de sal, de las caravanas y de su pozo.' },
  selva: { n: 'el Pueblo Yaruma de la Selva', gent: 'yaruma', i: '🌿', c: '#5ad8a0', bios: ['jungle', 'bambooJungle', 'mangrove', 'swamp'], kinds: [['tribu', 1]],
    base: 'JUNGLEGRASS', plaza: 'DIRT', road: 'DIRT', floor: 'PLANKFLOOR', walls: ['logWall', 'woodWall', 'logWall'], roofs: ['roofThatch', 'roofThatch', 'roofWood'], crops: ['tomato', 'corn'],
    syl: [['Ya', 'Ta', 'Ku', 'Ma', 'Ix', 'Oca', 'Tu', 'Wa', 'Na'], ['ru', 'ka', 'pa', 'mi', 'ti', 'lo'], ['ma', 'pan', 'kuy', 'tlan', 'ri', 'ra']],
    pers: [['I', 'Ta', 'Ku', 'Ya', 'Ma', 'Ne', 'Ti'], ['xi', 'ru', 'la', 'na', 'ko'], ['a', 'tl', 'mi', 'n', 'ri']],
    leader: ['el chamán', 'la chamana'], elder: 'Chamán', motto: ['«Las raíces nos unen»', '«La selva da y la selva quita»', '«Hablamos con los árboles»'],
    found: ['nacieron, dicen, de las raíces del Árbol Madre en la noche más larga', 'escaparon de la Fiebre Verde subiendo río arriba', 'siguieron el canto de un pájaro de fuego hasta este claro', 'eran recolectores que domaron las primeras bestias de la selva'],
    event: ['el río se desbordó y levantaron sus casas sobre troncos', 'un jaguar sombrío se llevaba niños hasta que la cazadora lo siguió hasta su cueva', 'una sequía secó los arroyos y el chamán encontró agua escuchando a los árboles', 'exploradores de otras tierras talaron el bosque sagrado y los echaron con flechas'],
    econ: 'Viven de la recolección, la caza y las plantas medicinales.' },
  monte: { n: 'la Hermandad del Yunque', gent: 'hermanos del yunque', i: '⛏', c: '#c8b8a0', bios: ['hills', 'darkForest', 'stonyShore'], kinds: [['minero', 1]],
    base: 'GRASS', plaza: 'COBBLE', road: 'GRAVEL', floor: 'PLANKFLOOR', walls: ['stoneBricks', 'stoneBlock', 'mossyBricks'], roofs: ['roofSlate', 'roofWood', 'roofSlate'], crops: ['potato'],
    syl: [['Dur', 'Gor', 'Bal', 'Thra', 'Kaz', 'Mor', 'Brun', 'Dra'], ['an', 'ek', 'um', 'ol', 'ar'], ['dun', 'grim', 'hold', 'rock', 'peña', 'roca']],
    pers: [['Dur', 'Bal', 'Gim', 'Thor', 'Bru', 'Hil', 'Mag'], ['in', 'ra', 'li', 'go', 'da'], ['n', 'k', 'rin', 'da', 'ra']],
    leader: ['el gran capataz', 'la gran capataza'], elder: 'Capataz', motto: ['«Piedra a piedra, veta a veta»', '«El fuego de la forja nunca se apaga»', '«Bajo tierra, todos somos hermanos»'],
    found: ['abrieron la primera veta de hierro con sus propias manos y un pico prestado', 'huyeron del derrumbe de la Mina Vieja y juraron excavar con más cuidado', 'siguieron un filón de plata desde el río hasta estas colinas', 'eran herreros errantes que encontraron aquí carbón y hierro juntos'],
    event: ['un gas de la mina prendió fuego y siete mineros quedaron atrapados tres días', 'reptadores del barro salieron de las galerías y sellaron la mina honda', 'encontraron una geoda gigante y con ella pagaron la muralla', 'la forja se quedó sin carbón un invierno y quemaron hasta las mesas'],
    econ: 'Viven de la mina, de la forja y de vender herramientas.' },
};
const STL_KIND = {
  aldea: { n: 'Aldea', R: 46, houses: [10, 14], roads: [3, 4], rw: 2, farms: [3, 5], wall: 'fence', specials: ['smithy', 'tavern', 'elder', 'storehouse'] },
  ciudad: { n: 'Ciudad', R: 76, houses: [24, 32], roads: [4, 4], rw: 3, farms: [4, 6], wall: 'stone', specials: ['smithy', 'tavern', 'temple', 'barracks', 'elder', 'storehouse', 'library', 'tailor'] },
  clan: { n: 'Asentamiento del clan', R: 42, houses: [6, 9], roads: [3, 3], rw: 2, farms: [1, 2], wall: 'palisade', specials: ['hall', 'smithy', 'elder', 'barracks'] },
  tribu: { n: 'Tribu', R: 40, houses: [9, 13], roads: [3, 4], rw: 2, farms: [2, 3], wall: 'totems', specials: ['elder', 'herbs', 'storehouse'], small: 1 },
  minero: { n: 'Pueblo minero', R: 42, houses: [7, 10], roads: [3, 3], rw: 2, farms: [1, 2], wall: 'fence', specials: ['mine', 'smithy', 'smithy2', 'elder', 'storehouse'] },
};
const stlName = (R, syl) => { const s = pickR(R, syl[0]) + pickR(R, syl[1]) + pickR(R, syl[2]); return s[0].toUpperCase() + s.slice(1).toLowerCase(); };
// ---------- ¿Hay un asentamiento en esta celda? ----------
const _stlCand = new Map(), _stlPlan = new Map(); let _stlSeed = null;
function stlCand(ix, iy) {
  if (_stlSeed !== S.gen.seed) { _stlSeed = S.gen.seed; _stlCand.clear(); _stlPlan.clear(); _stlPend.clear(); if (typeof FOLK !== 'undefined') FOLK.clear(); } // otro mundo, otra semilla
  const k = ix + ',' + iy; if (_stlCand.has(k)) return _stlCand.get(k); let r = null;
  const R = stlR(((S.gen.seed | 0) * 7919 + ix * 92821 + iy * 68917) | 0);
  if (R() < 0.62) { const x = Math.round(ix * STL_CELL + STL_CELL * (0.3 + 0.4 * R())), y = Math.round(iy * STL_CELL + STL_CELL * (0.3 + 0.4 * R()));
    if (Math.hypot(x, y) > 220) { const B = BIOMES[biomeAt(x, y)], key = B && B.key; let cult = null; for (const ck in STL_CULT) if (STL_CULT[ck].bios.includes(key)) cult = ck;
      if (cult && !B.ocean) { const C = STL_CULT[cult], u = R(); let kind = C.kinds[C.kinds.length - 1][0]; for (const [kk, p] of C.kinds) if (u < p) { kind = kk; break; }
        r = { id: k, x, y, cult, kind, R: STL_KIND[kind].R, name: stlName(R, C.syl), seed: (R() * 2147483647) | 0, bio: key }; } } }
  _stlCand.set(k, r); return r;
}
// Asentamientos cuya zona toca un rectángulo de casillas
function stlNear(x0, y0, x1, y1) { const out = [], a = Math.floor((x0 - 80) / STL_CELL), b = Math.floor((x1 + 80) / STL_CELL), c = Math.floor((y0 - 80) / STL_CELL), d = Math.floor((y1 + 80) / STL_CELL);
  for (let iy = c; iy <= d; iy++) for (let ix = a; ix <= b; ix++) { const s = stlCand(ix, iy); if (s && s.x + s.R + 4 >= x0 && s.x - s.R - 4 <= x1 && s.y + s.R + 4 >= y0 && s.y - s.R - 4 <= y1) out.push(s); } return out; }
// Solo en la superficie del mundo normal (ni capas, ni pisos, ni mazmorras, ni la otra dimensión)
const stlSurface = (tx, ty) => Math.abs(ty) < 40000 && Math.abs(tx) < 300000;
// ---------- Historia ----------
function stlLore(s) {
  const C = STL_CULT[s.cult], R = stlR(s.seed ^ 0x5bd1e995), yrs = 90 + ((R() * 520) | 0), ev = 10 + ((R() * (yrs - 20)) | 0), lead = pickR(R, C.leader), who = stlName(R, C.pers), founder = stlName(R, C.pers);
  let nb = null; { const ix = Math.floor(s.x / STL_CELL), iy = Math.floor(s.y / STL_CELL); let bd = 1e9; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (!dx && !dy) continue; const o = stlCand(ix + dx, iy + dy); if (!o) continue; const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < bd) { bd = d; nb = o; } } }
  const rel = nb ? (nb.cult === s.cult ? `Son parientes de ${nb.name}, a ${Math.round(Math.hypot(nb.x - s.x, nb.y - s.y))} casillas, y se casan entre ellos en las fiestas de la cosecha.` : `Comercian con ${nb.name} (${STL_CULT[nb.cult].n}), aunque nunca se han fiado del todo.`) : 'No conocen a nadie más: creen estar solos en el mundo.';
  return { yrs, ev, lead, who, founder, rel, motto: pickR(R, C.motto),
    text: [`${s.name} es ${STL_KIND[s.kind].n.toLowerCase()} de ${C.n}. Hace ${yrs} años, ${founder} y los suyos ${pickR(R, C.found)}.`, `Hace ${ev} años ${pickR(R, C.event)}. Todavía lo cuentan junto al fuego.`, C.econ, rel, `Hoy los gobierna ${lead} ${who}. Su lema: ${pickR(R, C.motto)}`] };
}
// ---------- Plano ----------
function stlPlan(s) {
  if (_stlPlan.has(s.id)) return _stlPlan.get(s.id);
  const C = STL_CULT[s.cult], K = STL_KIND[s.kind], R = stlR(s.seed), cx = s.x, cy = s.y, RR = s.R, city = s.kind === 'ciudad';
  const P = { s, tiles: new Map(), chunks: new Map(), roofs: [], houses: [], farms: [], spots: { plaza: [], anvil: [], mine: [], stall: [], patrol: [], road: [], wander: [] }, folk: [] };
  const occ = new Set(), K2 = (x, y) => x + ',' + y, gid = k => G[k] !== undefined ? G[k] : G.GRASS;
  const setT = (x, y, t) => P.tiles.set(K2(x, y), gid(t));
  const addB = (x, y, type, dir = 0, extra) => { if (!BD[type]) return; const ck = ckey(x >> CSH, y >> CSH); let L = P.chunks.get(ck); if (!L) P.chunks.set(ck, L = []); L.push([x, y, type, dir, extra]); occ.add(K2(x, y)); };
  // Contorno irregular (nada de círculos): el borde sube y baja con ondas propias de cada pueblo
  const ph = [R() * 6.283, R() * 6.283, R() * 6.283, R() * 6.283];
  const edgeA = a => RR * (0.74 + 0.11 * Math.sin(3 * a + ph[0]) + 0.08 * Math.sin(5 * a + ph[1]) + 0.05 * Math.sin(2 * a + ph[2]) + 0.03 * Math.sin(7 * a + ph[3]));
  const edgeAt = (x, y) => edgeA(Math.atan2(y - cy, x - cx)); P.edgeAt = edgeAt;
  const inR = (x, y, m = 0) => Math.hypot(x - cx, y - cy) <= edgeAt(x, y) - m;
  // Plaza de forma irregular y su centro
  const pr = city ? 9 : K.small ? 5 : 6, pp = R() * 6.283, pEdge = a => pr * (0.82 + 0.16 * Math.sin(3 * a + pp) + 0.1 * Math.sin(2 * a + pp * 1.7));
  for (let y = -pr - 3; y <= pr + 3; y++) for (let x = -pr - 3; x <= pr + 3; x++) if (Math.hypot(x, y) <= pEdge(Math.atan2(y, x))) { setT(cx + x, cy + y, C.plaza); occ.add(K2(cx + x, cy + y)); }
  if (s.kind === 'ciudad') { for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) setT(cx + x, cy + y, 'WATER'); for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (Math.max(Math.abs(x), Math.abs(y)) === 2) addB(cx + x, cy + y, 'stoneBricks'); for (const [x, y] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) addB(cx + x, cy + y, 'lampPost'); addB(cx, cy - 5, 'statue'); }
  else if (s.kind === 'aldea' || s.kind === 'minero') { setT(cx, cy, 'WATER'); for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]) addB(cx + x, cy + y, 'stoneBlock'); addB(cx + 2, cy + 2, 'lampPost'); addB(cx - 2, cy - 2, 'lampPost'); addB(cx + 3, cy - 1, 'bench'); addB(cx - 3, cy + 1, 'bench'); }
  else { addB(cx, cy, 'campfire'); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; addB(Math.round(cx + Math.cos(a) * 3), Math.round(cy + Math.sin(a) * 3), s.kind === 'tribu' ? 'totemPole' : i % 2 ? 'banner' : 'woodpile'); } }
  for (let i = 0; i < 10; i++) { const a = R() * Math.PI * 2, d = 2.5 + R() * (pr - 3); P.spots.plaza.push([Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d)]); }
  // Caminos que serpentean desde la plaza hasta salir del pueblo, y callejones que salen de ellos
  const roads = [], roadT = new Set(), WAT = gid('WATER');
  const paint = (x, y, w) => { const a = Math.floor((w - 1) / 2), b = Math.ceil((w - 1) / 2); for (let j = -a; j <= b; j++) for (let i = -a; i <= b; i++) { const X = Math.round(x) + i, Y = Math.round(y) + j, k = K2(X, Y); if (P.tiles.get(k) !== WAT && P.tiles.get(k) !== gid(C.plaza)) setT(X, Y, C.road); occ.add(k); roadT.add(k); } };
  const walk = (x, y, a, len, w, drift, out) => { const a0 = a, pts = []; for (let t = 0; t < len; t += 0.5) { a += (R() - 0.5) * drift; a = a0 + Math.max(-0.75, Math.min(0.75, a - a0)); x += Math.cos(a) * 0.5; y += Math.sin(a) * 0.5;
    if (out ? Math.hypot(x - cx, y - cy) > edgeAt(x, y) + 3 : !inR(x, y, 4)) break; pts.push([x, y, Math.cos(a), Math.sin(a)]); paint(x, y, w); } return pts; };
  const nr = K.roads[0] + ((R() * (K.roads[1] - K.roads[0] + 1)) | 0), a0 = R() * Math.PI * 2;
  for (let i = 0; i < nr; i++) { const a = a0 + i / nr * Math.PI * 2 + (R() - 0.5) * 0.5, d = pEdge(a) * 0.9; roads.push({ pts: walk(cx + Math.cos(a) * d, cy + Math.sin(a) * d, a, RR * 1.7, K.rw, 0.16, true), w: K.rw, main: 1 }); }
  const nl = city ? 12 : s.kind === 'aldea' ? 6 : 4;
  for (let i = 0; i < nl; i++) { const rd = pickR(R, roads.filter(r => r.main)); if (rd.pts.length < 24) continue; const p = rd.pts[12 + ((R() * (rd.pts.length - 24)) | 0)], sd = R() < 0.5 ? -1 : 1, a = Math.atan2(p[3], p[2]) + sd * (Math.PI / 2 + (R() - 0.5) * 0.6), w = Math.max(1, K.rw - 1);
    const pts = walk(p[0], p[1], a, 10 + R() * 18, w, 0.3, false); if (pts.length > 6) roads.push({ pts, w }); }
  for (const r of roads) for (let i = 8; i < r.pts.length; i += 12) P.spots.road.push([Math.round(r.pts[i][0]), Math.round(r.pts[i][1])]);
  // Casas a los lados de los caminos y callejones
  const free = (x0, y0, x1, y1, m = 1) => { for (let y = y0 - m; y <= y1 + m; y++) for (let x = x0 - m; x <= x1 + m; x++) { if (occ.has(K2(x, y))) return false; if (!inR(x, y, 3)) return false; } return true; };
  const specials = [...K.specials], nh = K.houses[0] + ((R() * (K.houses[1] - K.houses[0] + 1)) | 0);
  const house = (x0, y0, w, h, doorSide, spec) => {
    const x1 = x0 + w - 1, y1 = y0 + h - 1, wall = spec === 'temple' || spec === 'library' ? (city ? 'stoneBricks' : pickR(R, C.walls)) : pickR(R, city ? C.cityWalls : C.walls), roof = pickR(R, city ? C.cityRoofs : C.roofs);
    const dx = doorSide === 'S' || doorSide === 'N' ? x0 + (w >> 1) : doorSide === 'E' ? x1 : x0, dy = doorSide === 'S' ? y1 : doorSide === 'N' ? y0 : y0 + (h >> 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { setT(x, y, C.floor); P.roofs.push([x, y, roof]); const edge = x === x0 || x === x1 || y === y0 || y === y1;
      if (!edge) { occ.add(K2(x, y)); continue; }
      if (x === dx && y === dy) addB(x, y, 'door');
      else if (y === y1 && (x === x0 + 1 || x === x1 - 1) && w >= 5 && !(x0 === x1)) addB(x, y, 'glassBlock'); // ventanas en la fachada
      else addB(x, y, wall); }
    // Delante de la puerta, un camino corto hasta el principal
    const ox = doorSide === 'E' ? 1 : doorSide === 'W' ? -1 : 0, oy = doorSide === 'S' ? 1 : doorSide === 'N' ? -1 : 0; setT(dx + ox, dy + oy, C.road);
    const ins = []; for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) ins.push([x, y]);
    const put = (t, pick = ins) => { const i = (R() * pick.length) | 0, p = pick.splice(i, 1)[0]; if (p && !(p[0] === dx - ox && p[1] === dy - oy)) { addB(p[0], p[1], t); return p; } return null; };
    const corner = ins.filter(([x, y]) => (x === x0 + 1 || x === x1 - 1) && (y === y0 + 1 || y === y1 - 1));
    const H = { x0, y0, x1, y1, door: [dx + ox, dy + oy], spec, inside: [x0 + (w >> 1), y0 + (h >> 1)] };
    if (spec === 'smithy' || spec === 'smithy2') { put('furnace', corner); const a = put('anvil'); if (a) P.spots.anvil.push(a); put('chest', corner); put('torch', corner); }
    else if (spec === 'tavern') { for (let i = 0; i < 3; i++) put('table'); for (let i = 0; i < 5; i++) put('chair'); put('torch', corner); put('chest', corner); put('rug'); }
    else if (spec === 'temple') { for (let i = 0; i < 4; i++) put('bookshelf'); put('torch', corner); put('torch', corner); put('rug'); put('painting'); }
    else if (spec === 'library') { for (let i = 0; i < 6; i++) put('bookshelf'); put('table'); put('chair'); put('torch', corner); }
    else if (spec === 'barracks') { put('weaponRack'); put('weaponRack'); put('bed', corner); put('bed', corner); put('torch', corner); }
    else if (spec === 'storehouse') { for (let i = 0; i < 4; i++) put('chest'); put('torch', corner); }
    else if (spec === 'hall') { put('campfire'); for (let i = 0; i < 3; i++) put('table'); for (let i = 0; i < 4; i++) put('chair'); put('weaponRack', corner); put('torch', corner); put('torch', corner); }
    else if (spec === 'herbs') { put('herbRack'); put('herbRack'); put('bed', corner); put('torch', corner); }
    else if (spec === 'tailor') { put('loom'); put('chest', corner); put('torch', corner); put('rug'); }
    else { put('bed', corner); put('table'); put('chair'); put('torch', corner); if (spec === 'elder') { put('bookshelf'); put('painting'); } else if (R() < 0.5) put('chest', corner); if (R() < 0.4) put('flowerPot'); if (R() < 0.3) put('rug'); }
    // Flores o setos delante
    if (R() < 0.6 && (doorSide === 'S' || doorSide === 'N')) { const fy = doorSide === 'S' ? y1 + 1 : y0 - 1; for (const fx of [x0, x1]) if (!occ.has(K2(fx, fy))) addB(fx, fy, R() < 0.7 ? 'flowerBed' : 'hedge'); }
    // En la ciudad, una de cada tres casas tiene dos pisos (sim/floors.js)
    if (city && !spec && R() < 0.35 && typeof flOff === 'function') { const dy1 = flOff(1); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { P.roofs.push([x, y + dy1, roof]); const edge = x === x0 || x === x1 || y === y0 || y === y1; if (edge) addB(x, y + dy1, y === y1 && (x === x0 + 1 || x === x1 - 1) ? 'glassBlock' : wall); }
      const st = ins.length ? ins[0] : null; if (st) { addB(st[0], st[1], 'stairsL'); addB(st[0], st[1] + dy1, 'stairsDown'); addB(x0 + 1, y0 + 1 + dy1, 'bed'); addB(x1 - 1, y0 + 1 + dy1, 'torch'); } H.floors = 2; }
    P.houses.push(H); return H;
  };
  // Estructuras: se buscan sitio libre dentro del pueblo
  const struct = (w, h, fn, dmin = 0.35, dmax = 0.85, n = 300) => { for (let i = 0; i < n; i++) { const a = R() * 6.283, d = edgeA(a) * (dmin + R() * (dmax - dmin)), x0 = Math.round(cx + Math.cos(a) * d - w / 2), y0 = Math.round(cy + Math.sin(a) * d - h / 2); if (free(x0, y0, x0 + w - 1, y0 + h - 1, 1)) { fn(x0, y0, x0 + w - 1, y0 + h - 1); return true; } } return false; };
  const ring = (x0, y0, x1, y1, mat, gate = 'S') => { const gx = (x0 + x1) >> 1, gy = (y0 + y1) >> 1; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (x > x0 && x < x1 && y > y0 && y < y1) continue; if ((gate === 'S' && y === y1 || gate === 'N' && y === y0) && x === gx || (gate === 'E' && x === x1 || gate === 'W' && x === x0) && y === gy) continue; addB(x, y, mat); } };
  const inside = (x0, y0, x1, y1, f) => { for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) f(x, y); };
  // Granjas con espantapájaros y heno
  const nf = K.farms[0] + ((R() * (K.farms[1] - K.farms[0] + 1)) | 0);
  for (let fi = 0; fi < nf; fi++) { const w = city ? 9 : 7, h = city ? 6 : 5;
    struct(w + 2, h + 2, (x0, y0) => { x0++; y0++; const crop = pickR(R, C.crops), F = { x0, y0, x1: x0 + w - 1, y1: y0 + h - 1, tiles: [] }, mid = x0 + (w >> 1);
      for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) { const edge = x === x0 - 1 || x === x0 + w || y === y0 - 1 || y === y0 + h;
        if (edge) { if (!(y === y0 + h && x === mid)) addB(x, y, 'fence'); continue; }
        if (x === mid) { setT(x, y, 'WATER'); occ.add(K2(x, y)); continue; } setT(x, y, 'FARMWET'); F.tiles.push([x, y]);
        if (x === x0 + 1 && y === y0 + 1 && BD.scarecrow) { addB(x, y, 'scarecrow'); continue; }
        if (CROP && CROP[crop]) addB(x, y, 'crop', 0, { crop, g: 0.35 + R() * 0.65 }); }
      if (!occ.has(K2(mid + 1, y0 + h + 1))) addB(mid + 1, y0 + h + 1, 'haystack'); P.farms.push(F); }, 0.45, 0.88); }
  let tries = 0; const lots = roads.filter(r => r.pts.length > 10);
  while (lots.length && P.houses.length < nh && tries++ < 3500) { const rd = pickR(R, lots), p = rd.pts[4 + ((R() * (rd.pts.length - 6)) | 0)], side = R() < 0.5 ? -1 : 1, spec = specials.length ? specials[0] : null;
    let w = (K.small ? 5 : 5 + ((R() * 3) | 0)) + (spec === 'hall' ? 6 : spec === 'tavern' || spec === 'temple' ? 2 : 0), h = (K.small ? 5 : 5 + ((R() * 2) | 0)) + (spec === 'hall' ? 1 : 0);
    const px = p[0], py = p[1], horiz = Math.abs(p[2]) > Math.abs(p[3]), gap = rd.w / 2 + 1.5 + (R() < 0.3 ? 1 : 0);
    let x0, y0, door;
    if (horiz) { x0 = Math.round(px - w / 2 + (R() - 0.5) * 2); y0 = side < 0 ? Math.round(py - gap - h + 1) : Math.round(py + gap); door = side < 0 ? 'S' : 'N'; }
    else { y0 = Math.round(py - h / 2 + (R() - 0.5) * 2); x0 = side < 0 ? Math.round(px - gap - w + 1) : Math.round(px + gap); door = side < 0 ? 'E' : 'W'; }
    if (!free(x0, y0, x0 + w - 1, y0 + h - 1)) continue;
    house(x0, y0, w, h, door, spec); if (spec) specials.shift(); }
  // Molino (aldeas y ciudades del valle)
  if (s.cult === 'valle') for (let i = 0; i < (city ? 2 : 1); i++) struct(5, 5, (x0, y0, x1, y1) => { inside(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (x, y) => setT(x, y, C.road)); addB(x0 + 2, y0 + 2, 'windmill'); addB(x0, y1, 'haystack'); addB(x1, y1, 'haystack'); addB(x0, y0 + 1, 'cart'); addB(x1, y0, 'crate'); }, 0.55, 0.9);
  // Torres de vigía
  for (let i = 0; i < (city ? 3 : s.kind === 'clan' ? 2 : s.kind === 'aldea' ? 1 : 0); i++) struct(3, 3, (x0, y0) => { for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) addB(x0 + x, y0 + y, x === 1 && y === 1 ? 'stonePillar' : s.kind === 'clan' ? 'logWall' : 'stoneBricks'); addB(x0 + 1, y0 + 3, 'banner', 0, { col: C.c }); addB(x0 + 3, y0 + 1, 'torch'); P.spots.patrol.push([x0 + 1, y0 + 4]); }, 0.75, 0.92);
  // Cementerio
  if (s.kind !== 'tribu') struct(7, 6, (x0, y0, x1, y1) => { ring(x0, y0, x1, y1, city ? 'ironFence' : 'fence', 'S'); inside(x0, y0, x1, y1, (x, y) => { if ((x - x0) % 2 === 1 && y < y1 - 1) addB(x, y, 'tombstone'); else if (R() < 0.3) addB(x, y, 'flowerBed'); }); addB(x1 + 1, y1, 'lampPost'); }, 0.6, 0.9);
  // Corral con abrevadero y heno
  if (s.kind === 'aldea' || s.kind === 'clan' || s.kind === 'tribu') struct(8, 6, (x0, y0, x1, y1) => { ring(x0, y0, x1, y1, 'fence', 'S'); inside(x0, y0, x1, y1, (x, y) => setT(x, y, 'DIRT')); addB(x0 + 1, y0 + 1, 'trough'); addB(x0 + 2, y0 + 1, 'trough'); addB(x1 - 1, y0 + 1, 'haystack'); addB(x1 - 2, y0 + 1, 'haystack'); addB(x1 + 1, y1, 'cart'); }, 0.5, 0.88);
  // Parques en la ciudad: setos, flores, bancos y una estatua
  if (city) for (let i = 0; i < 2; i++) struct(7, 7, (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const e = x === x0 || x === x1 || y === y0 || y === y1, mid = x === ((x0 + x1) >> 1) || y === ((y0 + y1) >> 1); setT(x, y, 'GRASS'); if (e && !mid) addB(x, y, 'hedge'); else if (!e && mid) setT(x, y, 'GRAVEL'); else if (!e && R() < 0.5) addB(x, y, 'flowerBed'); }
    addB((x0 + x1) >> 1, (y0 + y1) >> 1, 'statue'); addB(x0 + 1, y0 + 2, 'bench'); addB(x1 - 1, y1 - 2, 'bench'); addB(x0 + 1, y1 - 1, 'lampPost'); addB(x1 - 1, y0 + 1, 'lampPost'); }, 0.3, 0.8);
  // Tiendas, tótems, secaderos y vasijas en las tribus; leña y estandartes en los clanes
  if (s.kind === 'tribu') { for (let i = 0; i < 7; i++) struct(1, 1, (x, y) => addB(x, y, 'tent'), 0.3, 0.85, 60); for (let i = 0; i < 4; i++) struct(1, 1, (x, y) => addB(x, y, i % 2 ? 'dryingRack' : 'pot'), 0.3, 0.8, 60); }
  if (s.kind === 'clan') for (let i = 0; i < 5; i++) struct(1, 1, (x, y) => addB(x, y, i % 2 ? 'woodpile' : 'banner', 0, { col: C.c }), 0.3, 0.8, 60);
  // Detalles junto a las casas: barriles, cajas, leña, tendederos, vasijas
  const extras = s.kind === 'tribu' ? ['pot', 'dryingRack', 'woodpile'] : s.kind === 'clan' ? ['woodpile', 'barrel', 'woodpile', 'crate'] : s.kind === 'minero' ? ['crate', 'barrel', 'orePile', 'woodpile'] : city ? ['barrel', 'crate', 'flowerCart', 'barrel', 'clothesline'] : ['barrel', 'crate', 'woodpile', 'clothesline', 'haystack'];
  for (const H of P.houses) { const out = []; for (let x = H.x0 - 1; x <= H.x1 + 1; x++) out.push([x, H.y0 - 1], [x, H.y1 + 1]); for (let y = H.y0; y <= H.y1; y++) out.push([H.x0 - 1, y], [H.x1 + 1, y]);
    const n = 1 + ((R() * 3) | 0); for (let i = 0; i < n; i++) { const p = out.splice((R() * out.length) | 0, 1)[0]; if (p && !occ.has(K2(p[0], p[1])) && inR(p[0], p[1], 2) && !(p[0] === H.door[0] && p[1] === H.door[1])) addB(p[0], p[1], pickR(R, extras)); } }
  // Farolas (o antorchas) a los lados de los caminos, donde quede sitio
  const lamp = s.kind === 'tribu' || s.kind === 'clan' ? 'torch' : 'lampPost';
  for (const r of roads) for (let i = 10; i < r.pts.length - 2; i += 16) { const p = r.pts[i], sd = (i / 16 | 0) % 2 ? 1 : -1, o = r.w / 2 + 0.8, X = Math.round(p[0] - p[3] * o * sd), Y = Math.round(p[1] + p[2] * o * sd); if (!occ.has(K2(X, Y)) && inR(X, Y, 1)) addB(X, Y, lamp); }
  // Muralla, empalizada, valla o tótems siguiendo el contorno (con puertas donde pasan los caminos)
  const gateAt = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (roadT.has(K2(x + i, y + j))) return true; return false; };
  const wallPts = [], seenW = new Set(); for (let i = 0; i < RR * 9; i++) { const a = i / (RR * 9) * Math.PI * 2, e = edgeA(a), x = Math.round(cx + Math.cos(a) * e), y = Math.round(cy + Math.sin(a) * e), k = K2(x, y); if (!seenW.has(k)) { seenW.add(k); wallPts.push([x, y, a]); } }
  if (K.wall === 'totems') { wallPts.forEach(([x, y], i) => { if (i % 9 === 0 && !gateAt(x, y) && !occ.has(K2(x, y))) addB(x, y, i % 27 === 0 ? 'campfire' : 'totemPole'); }); }
  else { const mat = K.wall === 'stone' ? 'stoneBricks' : K.wall === 'palisade' ? 'logWall' : 'fence';
    for (const [x, y] of wallPts) { const k = K2(x, y); if (gateAt(x, y)) { if (!occ.has(k) && !roadT.has(k)) addB(x, y, city ? 'stonePillar' : K.wall === 'palisade' ? 'torch' : 'lampPost'); continue; } if (occ.has(k)) continue; if (K.wall === 'fence' && R() < 0.1) continue; addB(x, y, mat); }
    if (K.wall === 'stone') for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2, e = edgeA(a), tx = Math.round(cx + Math.cos(a) * e), ty = Math.round(cy + Math.sin(a) * e); if (gateAt(tx, ty)) continue; for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (!roadT.has(K2(tx + x, ty + y))) addB(tx + x, ty + y, x || y ? 'stoneBricks' : 'stonePillar'); addB(Math.round(tx - Math.cos(a) * 2.5), Math.round(ty - Math.sin(a) * 2.5), 'banner', 0, { col: C.c }); } }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, e = edgeA(a) - 3; P.spots.patrol.push([Math.round(cx + Math.cos(a) * e), Math.round(cy + Math.sin(a) * e)]); }
  // Carteles en las entradas
  for (const r of roads) if (r.main) { const p = r.pts.find(q => Math.hypot(q[0] - cx, q[1] - cy) > edgeAt(q[0], q[1]) - 5); if (p) { const X = Math.round(p[0] - p[3] * (r.w / 2 + 1)), Y = Math.round(p[1] + p[2] * (r.w / 2 + 1)); if (!occ.has(K2(X, Y))) addB(X, Y, 'signpost'); } }
  // Algo de naturaleza junto al borde: rocas y arbustos
  for (let i = 0; i < (city ? 10 : 14); i++) struct(1, 1, (x, y) => addB(x, y, R() < 0.6 ? 'bush' : 'boulder'), 0.8, 0.95, 40);
  // Mina (pueblo minero): un montículo de roca con la boca hacia el pueblo, vagonetas y mena
  if (s.kind === 'minero') struct(11, 9, (x0, y0) => { const mx = x0 + 5, my = y0 + 4;
    for (let y = -3; y <= 3; y++) for (let x = -4; x <= 4; x++) { const edge = Math.abs(x) === 4 || Math.abs(y) === 3, mouth = y === 3 && Math.abs(x) <= 1; setT(mx + x, my + y, 'COBBLE'); if (edge && !mouth) addB(mx + x, my + y, R() < 0.8 ? 'stoneBlock' : 'mossyBricks'); }
    addB(mx - 2, my + 1, 'minecart'); addB(mx + 2, my + 1, 'orePile'); addB(mx - 3, my - 2, 'torch'); addB(mx + 3, my - 2, 'torch'); addB(mx - 2, my + 4, 'lampPost'); addB(mx + 2, my + 4, 'lampPost'); addB(mx + 4, my + 4, 'orePile'); addB(mx - 4, my + 4, 'woodpile');
    for (let i = 0; i < 4; i++) P.spots.mine.push([mx - 2 + i, my - 1 + (i % 2)]); }, 0.55, 0.85);
  // Puestos del mercado con toldo en la plaza
  if (s.kind !== 'tribu' || R() < 0.5) for (let i = 0; i < (city ? 4 : 2); i++) { const a = i / (city ? 4 : 2) * Math.PI * 2 + 0.6, d = pEdge(a) - 1.5, x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d); if (occ.has(K2(x, y)) && !P.tiles.has(K2(x, y))) continue; addB(x, y, 'awning'); if (!occ.has(K2(x + 1, y))) addB(x + 1, y, R() < 0.5 ? 'crate' : 'barrel'); P.spots.stall.push([x, y + 1]); }
  for (let i = 0; i < 6; i++) { const a = R() * Math.PI * 2, d = pEdge(a) - 2; P.spots.plaza.push([Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d)]); }
  // Vecinos: quién vive aquí y en qué trabaja
  const role = (r, type, n) => { for (let i = 0; i < n; i++) P.folk.push({ role: r, type }); };
  const farmers = Math.max(1, Math.round(P.farms.length * 1.4));
  if (s.kind === 'ciudad') { role('guard', 'guard', 9); role('merchant', 'merchant', 4); role('smith', 'smith', 2); role('farmer', 'farmer', farmers); role('elder', 'mage', 1); role('walker', 'alchemist', 2); role('walker', 'medic', 2); role('walker', 'tailor', 3); role('walker', 'mage', 2); role('child', 'farmer', 4); }
  else if (s.kind === 'aldea') { role('guard', 'guard', 3); role('merchant', 'merchant', 1); role('smith', 'smith', 1); role('farmer', 'farmer', farmers); role('elder', 'mage', 1); role('walker', 'tailor', 2); role('walker', 'medic', 1); role('child', 'farmer', 2); }
  else if (s.kind === 'clan') { role('guard', 'guard', 5); role('walker', 'hunter', 3); role('smith', 'smith', 1); role('farmer', 'farmer', farmers); role('elder', 'guard', 1); role('child', 'hunter', 2); }
  else if (s.kind === 'tribu') { role('walker', 'hunter', 3); role('guard', 'hunter', 2); role('farmer', 'farmer', farmers); role('elder', 'mage', 1); role('walker', 'tamer', 1); role('walker', 'medic', 1); role('child', 'tamer', 3); }
  else { role('miner', 'engineer', 6); role('smith', 'smith', 2); role('guard', 'guard', 2); role('merchant', 'merchant', 1); role('farmer', 'farmer', farmers); role('elder', 'engineer', 1); }
  for (const F of P.farms) for (const t of F.tiles) if (R() < 0.3) P.spots.wander.push(t);
  for (const r of roads) for (let k = 6; k < r.pts.length; k += 10) P.spots.wander.push([Math.round(r.pts[k][0]), Math.round(r.pts[k][1])]);
  P.lore = stlLore(s);
  _stlPlan.set(s.id, P); return P;
}
// ---------- Al generar un chunk: suelo, bloques y tejados del plano ----------
const _stlPend = new Map();
{ const g0 = genChunkTiles; genChunkTiles = c => { g0(c); try { stlStamp(c); } catch (e) { console.warn('asentamiento', e); } }; }
function stlStamp(c) {
  const x0 = c.cx * CS, y0 = c.cy * CS; if (!stlSurface(x0, y0)) return;
  for (const s of stlNear(x0, y0, x0 + CS - 1, y0 + CS - 1)) { const P = stlPlan(s), C = STL_CULT[s.cult], base = gid2(C.base);
    for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) { const tx = x0 + x, ty = y0 + y, i = (y << CSH) | x, d = Math.hypot(tx - s.x, ty - s.y); if (d > s.R + 4) continue; const e = P.edgeAt(tx, ty); if (d > e + 4) continue;
      let t = P.tiles.get(tx + ',' + ty); if (t === undefined) { const g = GI[c.g[i]]; if (d <= e + 1.5 ? c.g[i] !== base : (g.solid || g.liquid || g.tree || g.hole)) t = base; }
        if (t === base && d <= e && base === G.GRASS) { const h = hash2(tx, ty, (S.gen.seed | 0) + 4242); if (h < 0.035 && G.TALLGRASS !== undefined) t = G.TALLGRASS; else if (h < 0.045 && G.FLOWERS !== undefined) t = G.FLOWERS; } /* algo de hierba y flores sueltas: que parezca cuidado, no pelado */
      if (t !== undefined) { c.g[i] = t; c.t[i] = GI[t].hp || 0; } }
    const ck = ckey(c.cx, c.cy), L = P.chunks.get(ck); if (L) _stlPend.set(ck, (_stlPend.get(ck) || []).concat(L));
    let nr = 0; for (const [x, y, id] of P.roofs) { const yy = Math.abs(y) > 60000 && typeof flOff === 'function' ? y - flOff(1) : y; if (!(x >= x0 && x < x0 + CS && yy >= y0 && yy < y0 + CS)) continue; /* los tejados del piso de arriba van con el chunk de abajo */ (S.roof || (S.roof = {}))[x + ',' + y] = id; nr++; }
    if (nr && typeof _roofVer !== 'undefined') { _roofVer++; _roofReg = null; } }
  // Bloques del piso de arriba (casas de dos pisos): llegan cuando se genera esa franja
}
const gid2 = k => G[k] !== undefined ? G[k] : G.GRASS;
// Los pisos de arriba de las casas de ciudad: sus paredes, cama y escalera (sim/floors.js genera el suelo)
{ const o0 = onChunkGen; onChunkGen = c => { o0(c); const ck = ckey(c.cx, c.cy), L = _stlPend.get(ck); if (!L) { stlUpper(c); return; } _stlPend.delete(ck); stlPut(L); stlUpper(c); }; }
function stlUpper(c) { if (typeof floorOfY !== 'function') return; const f = floorOfY(c.cy * CS + 16); if (f !== 1) return; const x0 = c.cx * CS, y0 = c.cy * CS - flOff(1);
  for (const s of stlNear(x0, y0, x0 + CS - 1, y0 + CS - 1)) { const P = stlPlan(s), L = P.chunks.get(ckey(c.cx, c.cy)); if (L && !P['up' + ckey(c.cx, c.cy)]) { P['up' + ckey(c.cx, c.cy)] = 1; stlPut(L.filter(([x, y]) => !at(x, y))); } } }
function stlPut(L) { let n = 0; for (const [x, y, type, dir, ex] of L) { if (at(x, y) || !BD[type]) continue; const b = makeB(type, x, y, dir); if (ex) Object.assign(b, ex); if (type === 'crop') b.planted = S.time; setBlockAt(x, y, b); blocks.push(b); n++; }
  if (n) { markAll(); if (typeof dirty !== 'undefined') dirty.lists = true; } }
// El terreno del asentamiento es llano (sin terrazas)
{ const l0 = chunkLv; chunkLv = c => { const h = l0(c); const x0 = c.cx * CS, y0 = c.cy * CS; if (!stlSurface(x0, y0)) return h;
  for (const s of stlNear(x0, y0, x0 + CS - 1, y0 + CS - 1)) for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) if (Math.hypot(x0 + x - s.x, y0 + y - s.y) <= s.R + 3) h[(y << CSH) | x] = 0; return h; }; }

// =====================================================================================
//  Vida en los asentamientos: aldeanos que trabajan de día y duermen de noche
// =====================================================================================
const FOLK = new Map(); let _folkT = 0, _stlHere = null;
const ROLE_N = { guard: 'Guardia', merchant: 'Mercader', smith: 'Herrero', farmer: 'Granjero', elder: '', walker: '', child: 'Niño', miner: 'Minero' };
const ROLE_TOOL = { guard: ['ironSword', 'bronzeSword', 'woodSword'], farmer: ['ironHoe', 'woodHoe', 'hoe'], smith: ['hammer'], miner: ['ironPickaxe', 'stonePickaxe', 'woodPickaxe'], walker: [] };
function folkSpawn(s) { const P = stlPlan(s), C = STL_CULT[s.cult], R = stlR(s.seed ^ 0x2468ace), list = [];
  for (const f of P.folk) { const H = P.houses.length ? pickR(R, P.houses) : null, home = H ? H.inside : [s.x, s.y], N = NPCS[f.type] || NPCS.merchant;
    const look = { skin: (R() * 6) | 0, hair: (R() * 9) | 0, eyes: (R() * 6) | 0, hairStyle: (R() * 9) | 0, beard: R() < 0.4 ? (R() * 5) | 0 : 0, body: (R() * 3) | 0, shirt: N.c, pants: (R() * 12) | 0, shoes: 9 };
    const equip = f.role === 'guard' ? { head: 'ironHelmet', chest: 'ironChest' } : f.role === 'miner' ? { head: 'ironHelmet' } : f.role === 'smith' ? { chest: 'leatherChest' } : {}; for (const k in equip) if (!ITEMS[equip[k]]) delete equip[k];
    const tool = (ROLE_TOOL[f.role] || []).find(id => ITEMS[id]) || null, name = f.role === 'elder' ? P.lore.who : stlName(R, C.pers); /* el anciano es quien gobierna */
    const label = f.role === 'elder' ? `${C.elder} ${name}` : `${name}${ROLE_N[f.role] ? ' · ' + ROLE_N[f.role] : f.role === 'walker' ? ' · ' + N.n : ''}`;
    const sp = H ? H.door : home; list.push({ folk: 1, sid: s.id, role: f.role, type: f.type, x: (sp[0] + 0.5) * T, y: (sp[1] + 0.5) * T, home, door: H ? H.door : home, look, equip, tool, label, t: R() * 3, ph: 0, work: 0, kid: f.role === 'child' }); }
  FOLK.set(s.id, list); return list; }
const folkHour = () => { const dl = S.gen.dayLen || DAY_LEN; return ((S.time % dl) + dl) % dl / dl * 24; };
function folkTarget(n, P) { const night = (() => { const h = folkHour(); return h < 6 || h >= 20.5; })(), sp = P.spots, pick = a => a && a.length ? a[(Math.random() * a.length) | 0] : null;
  if (night && n.role !== 'guard') return Math.random() < 0.8 ? n.home : n.door;
  let p = null; if (n.role === 'farmer') p = P.farms.length ? pick(pick(P.farms).tiles) : pick(sp.wander); else if (n.role === 'smith') p = pick(sp.anvil) || pick(sp.plaza); else if (n.role === 'miner') p = pick(sp.mine) || pick(sp.wander);
  else if (n.role === 'merchant') p = pick(sp.stall) || pick(sp.plaza); else if (n.role === 'guard') p = pick(sp.patrol); else if (n.role === 'elder') p = Math.random() < 0.5 ? pick(sp.plaza) : n.home; else if (n.role === 'child') p = pick(sp.plaza); else p = Math.random() < 0.3 ? n.door : pick(sp.wander) || pick(sp.plaza);
  return p || n.home; }
function folkTick(dt) {
  if (!S || !S.player) return; const px = S.player.x / T, py = S.player.y / T; if (!stlSurface(px, py)) { if (_stlHere) _stlHere = null; return; }
  if ((_folkT -= dt) <= 0) { _folkT = 1.5; const near = stlNear(px - 90, py - 90, px + 90, py + 90); for (const s of near) if (!FOLK.has(s.id) && Math.hypot(s.x - px, s.y - py) < 95) folkSpawn(s);
    for (const k of [...FOLK.keys()]) { const s = _stlCand.get(k); if (!s || Math.hypot(s.x - px, s.y - py) > 130) FOLK.delete(k); }
    // ¿Has entrado en un asentamiento?
    let here = null; for (const s of near) if (Math.hypot(s.x - px, s.y - py) < s.R) here = s;
    if (here && here !== _stlHere) { const C = STL_CULT[here.cult], P = stlPlan(here), D = S.towns || (S.towns = {}); const first = !D[here.id]; D[here.id] = { name: here.name, x: here.x, y: here.y, cult: here.cult, kind: here.kind };
      wvBanner(`${C.i} ${here.name}`, `${STL_KIND[here.kind].n} de ${C.n} · ${P.folk.length + P.houses.length * 2} habitantes${first ? ' · ¡nuevo!' : ''}`, C.c, 3.5); if (first) toast(`🗺 Has descubierto ${here.name}. Habla con ${C.elder === 'Anciano' ? 'el anciano' : 'el ' + C.elder.toLowerCase()} para conocer su historia (Aventura › Pueblos).`, true); }
    _stlHere = here; }
  for (const [sid, list] of FOLK) { const s = _stlCand.get(sid); if (!s) continue; const P = stlPlan(s);
    for (const n of list) { if (Math.abs(n.x / T - px) > 70 || Math.abs(n.y / T - py) > 70) continue;
      if (n.tx === undefined || (n.t -= dt) <= 0 && n.arrived) { const p = folkTarget(n, P); n.tx = (p[0] + 0.5) * T + (Math.random() - 0.5) * 10; n.ty = (p[1] + 0.5) * T + (Math.random() - 0.5) * 10; n.arrived = false; n.t = 4 + Math.random() * 8; }
      const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy), sp = (n.kid ? 2.2 : n.role === 'guard' ? 1.3 : 1.1) * T * dt;
      if (d > 3) { const nx = n.x + dx / d * Math.min(sp, d), ny = n.y + dy / d * Math.min(sp, d);
        if (passable(nx, ny + 4, n)) { n.x = nx; n.y = ny; } else if (passable(nx, n.y + 4, n)) n.x = nx; else if (passable(n.x, ny + 4, n)) n.y = ny; else { n.stuck = (n.stuck || 0) + dt; if (n.stuck > 1.2) { n.stuck = 0; n.tx = undefined; } }
        n.face = dx > 0 ? 1 : -1; n.ph = (n.ph || 0) + dt * 8; n.work = 0; }
      else { if (!n.arrived) { n.arrived = true; n.t = 5 + Math.random() * 10; } n.work = ['farmer', 'smith', 'miner'].includes(n.role) ? (n.work || 0) + dt : 0;
        if (n.work && Math.random() < dt * 1.5 && typeof fxAdd === 'function') fxAdd({ x: n.x + n.face * 10, y: n.y + 6, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, life: 0.5, t: 0, size: 1.5, col: n.role === 'farmer' ? '#7a5a32' : '#ffc860', glow: n.role !== 'farmer' ? 1 : 0, drag: 1 }); }
      // La guardia defiende el pueblo
      if (n.role === 'guard') { n.cd = (n.cd || 0) - dt; const f = nearestFoe(n.x, n.y, 9 * T); if (f && n.cd <= 0) { n.cd = 1.1; const a = Math.atan2(f.y - n.y, f.x - n.x); PROJ.push({ x: n.x, y: n.y, vx: Math.cos(a) * 22 * T, vy: Math.sin(a) * 22 * T, r: 4, dmg: 10, c: '#e8e0c8', team: 'p', life: 1.2, arrow: 0, hit: new Set() }); } } } }
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); try { folkTick(fdt); } catch (e) { } }; }
// Dibujo (después de las criaturas)
{ const d0 = drawCombat; drawCombat = (ctx, ...a) => { const r = d0(ctx, ...a); if (S && FOLK.size) { const vx0 = view.x - cw / 2 / view.z - 40, vx1 = view.x + cw / 2 / view.z + 40, vy0 = view.y - ch / 2 / view.z - 60, vy1 = view.y + ch / 2 / view.z + 60;
  const vis = []; for (const list of FOLK.values()) for (const n of list) if (n.x > vx0 && n.x < vx1 && n.y > vy0 && n.y < vy1) vis.push(n); vis.sort((p, q) => p.y - q.y);
  for (const n of vis) { const moving = n.tx !== undefined && !n.arrived, near = Math.hypot(S.player.x - n.x, S.player.y - n.y) < 4 * T, ang = near ? Math.atan2(S.player.y - n.y, S.player.x - n.x) : moving ? Math.atan2(n.ty - n.y, n.tx - n.x) : n.face > 0 ? 0 : Math.PI;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(n.x, n.y + 8, n.kid ? 6 : 9, 3.5, 0, 0, 7); ctx.fill();
    const swing = n.work ? (Math.sin(n.work * 7) + 1) / 2 : 0; drawAvatar(ctx, n.look, n.equip, n.x, n.y + 8, ang, n.ph || 0, moving, n.kid ? 1.15 : 1.6, n.tool, swing);
    if (near || view.z > 1.2) { ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; const yl = n.y - (n.kid ? 24 : 34); ctx.fillStyle = '#000'; ctx.fillText(n.label, n.x + 1, yl + 1); ctx.fillStyle = n.role === 'elder' ? '#ffd34a' : '#e8dcc0'; ctx.fillText(n.label, n.x, yl); } } } return r; }; }
// F sobre un aldeano: comerciar (como con los vecinos de tus casas) o escuchar la historia
{ const a0 = npcAt; npcAt = (wx, wy) => { const r = a0(wx, wy); if (r) return r; for (const list of FOLK.values()) for (const n of list) if (Math.hypot(n.x - wx, n.y - wy) < 14) return n; return null; }; }
{ const o0 = openTrade; openTrade = n => { if (n && n.folk && (n.role === 'elder' || n.kid)) { stlLoreOpen(n.sid, n); return; } o0(n); }; }
// ---------- Ventana de historia ----------
{ const m = document.createElement('div'); m.id = 'mTown'; m.className = 'modal'; m.hidden = true; m.innerHTML = '<div class="modal-in townm" id="townBody"></div>'; document.body.appendChild(m); MODALS.town = 'mTown';
  m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); }); }
function stlLoreOpen(sid, n) { const s = _stlCand.get(sid); if (!s) return; const P = stlPlan(s), C = STL_CULT[s.cult], L = P.lore;
  const greet = n && n.kid ? `«¿Eres de fuera? ¡Mi abuelo dice que ${s.name} tiene ${L.yrs} años! Pregúntale al ${C.elder.toLowerCase()} en la plaza.»` : n ? `«Siéntate, forastero. Te contaré la historia de ${s.name}.»` : '';
  $('townBody').innerHTML = `<header><h2>${C.i} ${esc(s.name)}</h2><span class="chip" style="color:${C.c}">${esc(STL_KIND[s.kind].n)} · ${esc(C.n)}</span><button data-close>Cerrar <kbd>Esc</kbd></button></header>
    ${greet ? `<p class="towng">${n ? esc(n.label) + ': ' : ''}${esc(greet)}</p>` : ''}${L.text.map(t => `<p>${esc(t)}</p>`).join('')}
    <div class="townf"><span>🏠 ${P.houses.length} casa${P.houses.length === 1 ? '' : 's'}</span><span>🌾 ${P.farms.length} granja${P.farms.length === 1 ? '' : 's'}</span><span>👥 ${P.folk.length + P.houses.length * 2} habitantes</span><span>📍 ${s.x}, ${s.y}</span></div>`;
  openModal('town'); }
// Pestaña de Aventura: los asentamientos que has descubierto
ADV.tabs.towns = { n: '🗺 Pueblos', render() { const D = S.towns || {}, ks = Object.keys(D); if (!ks.length) return '<p class="mut">Aún no has descubierto ningún asentamiento. Explora: hay aldeas, ciudades, clanes, tribus y pueblos mineros repartidos por el mundo, cada uno en las tierras de su pueblo.</p>';
  const px = S.player.x / T, py = S.player.y / T; return `<div class="townl">${ks.map(k => D[k]).sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py)).map(t => { const C = STL_CULT[t.cult]; return `<button class="towni" data-town="${t.x},${t.y}" style="--tc:${C.c}"><b>${C.i} ${esc(t.name)}</b><small>${esc(STL_KIND[t.kind].n)} de ${esc(C.n)} · a ${Math.round(Math.hypot(t.x - px, t.y - py))} casillas</small></button>`; }).join('')}</div>`; } };
document.addEventListener('click', e => { const b = e.target.closest('[data-town]'); if (!b || !S) return; const [x, y] = b.dataset.town.split(',').map(Number), ix = Math.floor(x / STL_CELL), iy = Math.floor(y / STL_CELL), s = stlCand(ix, iy); if (s) { closeModal(); stlLoreOpen(s.id, null); } });
cmd('pueblos', { a: ['aldeas', 'towns'], u: '/pueblos [cuántos]', d: 'Lista los asentamientos más cercanos con sus coordenadas, distancia y dirección (sin teletransportarte).', run(a) {
  const n = Math.max(1, Math.min(15, parseInt(a[0]) || 5)), px = S.player.x / T, py = S.player.y / T, D = S.towns || {};
  if (!stlSurface(px, py)) return errMsg('Sal a la superficie para orientarte');
  const dir = (dx, dy) => { const a = Math.atan2(-dy, dx) * 180 / Math.PI, k = Math.round(((a + 360) % 360) / 45) % 8; return ['este', 'noreste', 'norte', 'noroeste', 'oeste', 'suroeste', 'sur', 'sureste'][k]; };
  const list = stlNear(px - 1600, py - 1600, px + 1600, py + 1600).sort((p, q) => Math.hypot(p.x - px, p.y - py) - Math.hypot(q.x - px, q.y - py)).slice(0, n);
  if (!list.length) return 'No hay asentamientos en 1600 casillas a la redonda.';
  sysMsg(`🗺 Los ${list.length} asentamientos más cercanos (tú estás en ${Math.round(px)}, ${Math.round(py)}):`);
  for (const s of list) { const C = STL_CULT[s.cult], d = Math.round(Math.hypot(s.x - px, s.y - py)); sysMsg(`${C.i} ${s.name} — ${STL_KIND[s.kind].n} de ${C.n} · 📍 ${s.x}, ${s.y} · a ${d} casillas al ${dir(s.x - px, s.y - py)}${D[s.id] ? ' · ✔ visitado' : ''}`); }
  return ''; } });
cmd('irpueblo', { a: ['tppueblo'], u: '/irpueblo', d: 'Te lleva al asentamiento más cercano.', cheat: 1, run() { const px = S.player.x / T, py = S.player.y / T, near = stlNear(px - 900, py - 900, px + 900, py + 900).sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py))[0]; if (!near) return errMsg('No hay ninguno cerca'); S.player.x = (near.x + 0.5) * T; S.player.y = (near.y + STL_KIND[near.kind].R * 0 + 3.5) * T; view.x = S.player.x; view.y = S.player.y; return `Te has ido a ${near.name}.`; } });
