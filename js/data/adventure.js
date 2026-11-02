'use strict';
// =====================================================================================
//  Aventura: logros con títulos, mazmorras y encargos de los aldeanos.
//  Aquí solo los datos; la lógica está en sim/achievements.js, sim/dungeons.js y sim/quests.js.
// =====================================================================================
XB('questBoard', { n: 'Tablón de encargos', cat: HOUSE_CAT, d: 'F: ver los encargos del día. Los aldeanos pagan en monedas y te ganas su aprecio (rebajas en sus tiendas).', look: { c: '#7a5a34', g: '📜', a: '' } });
RB('questBoard', 1, 'planks', 'planks,planks,stick', 0, 0);

// ---------- Mazmorras: estilos ----------
// Muros y suelos propios, sin nada que soltar: no se pueden picar ni cavar
const DG_THEMES = {
  crypt: { n: 'Cripta', c: '#b08aff', wall: [56, 50, 64], floor: [96, 92, 104], alt: [112, 106, 122], names: ['Olvidada', 'de los Lamentos', 'del Rey Sin Nombre', 'Sellada', 'de las Mil Tumbas'] },
  cave: { n: 'Caverna', c: '#e0b070', wall: [92, 74, 56], floor: [122, 102, 82], alt: [136, 116, 92], names: ['de los Ecos', 'Profunda', 'del Minero Perdido', 'Hambrienta', 'de las Raíces'] },
  ice: { n: 'Gruta', c: '#9ae0ff', wall: [104, 134, 156], floor: [178, 200, 214], alt: [200, 220, 232], names: ['Helada', 'del Invierno Eterno', 'de Escarcha', 'del Hielo Azul', 'Silenciosa'] },
  lava: { n: 'Fragua', c: '#ff8a3a', wall: [70, 34, 30], floor: [98, 62, 52], alt: [120, 70, 50], names: ['Infernal', 'del Dragón Dormido', 'de Ceniza', 'Ardiente', 'del Herrero Maldito'] },
  temple: { n: 'Templo', c: '#ffd060', wall: [146, 116, 70], floor: [196, 168, 112], alt: [214, 186, 128], names: ['Perdido', 'del Sol', 'de las Arenas', 'Dorado', 'de los Antiguos'] },
  void: { n: 'Santuario', c: '#c060ff', wall: [40, 24, 60], floor: [70, 52, 96], alt: [88, 64, 120], names: ['del Vacío', 'Estelar', 'de la Nada', 'Invertido', 'del Ojo Abierto'] },
};
for (const k in DG_THEMES) { const D = DG_THEMES[k], sp = '#' + D.alt.map(v => Math.min(255, v + 24).toString(16).padStart(2, '0')).join('');
  TLx('DGW_' + k, { n: 'Muro de mazmorra', c: D.wall, rock: 1, solid: 1, speck: '#' + D.wall.map(v => Math.max(0, v - 18).toString(16).padStart(2, '0')).join('') });
  TLx('DGF_' + k, { n: 'Suelo de mazmorra', c: D.floor, speck: sp });
  TLx('DGA_' + k, { n: 'Losa de mazmorra', c: D.alt, dot: sp });
  TLx('DGT_' + k, { n: 'Brasero', c: D.alt, dot: D.c, light: 2 });
  BI('dg_' + k, { n: D.n, g: 'DGF_' + k, fauna: [], fd: 0, mc: D.c }); }

// ---------- Logros ----------
// [id, nombre, cómo se consigue, icono, categoría, estadística, meta, título que da]
const ACH_CATS = { com: ['⚔', 'Combate'], mag: ['✦', 'Magia'], exp: ['🧭', 'Exploración'], ofi: ['⚒', 'Oficios'], wav: ['☠', 'Gran Oleada'], dun: ['🗝', 'Mazmorras'], vil: ['📜', 'Aldea'], meta: ['🏆', 'Leyenda'] };
const ACH_LIST = [
  ['firstBlood', 'Primera sangre', 'Derrota a tu primer enemigo.', '🗡', 'com', 'kills', 1, 'el Novato'],
  ['hunter', 'Cazador', 'Derrota a 100 enemigos.', '🏹', 'com', 'kills', 100, 'el Cazador'],
  ['exterminator', 'Exterminador', 'Derrota a 1.000 enemigos.', '💀', 'com', 'kills', 1000, 'el Exterminador'],
  ['scourge', 'Azote de monstruos', 'Derrota a 5.000 enemigos.', '☠', 'com', 'kills', 5000, 'Azote de Monstruos'],
  ['slimes', 'Pisaslimes', 'Mata 100 slimes.', '🟢', 'com', 'slimes', 100, 'Pisaslimes'],
  ['undead', 'Sin descanso', 'Devuelve a la tumba a 200 no muertos.', '⚰', 'com', 'undead', 200, 'Cazador de No Muertos'],
  ['bossOne', 'Matajefes', 'Derrota a un jefe.', '👑', 'com', 'bosses', 1, 'Matajefes'],
  ['bossTen', 'Leyenda viva', 'Derrota a 10 jefes.', '🐉', 'com', 'bosses', 10, 'Leyenda Viva'],
  ['bossKinds', 'Bestiario de reyes', 'Derrota a 5 jefes distintos.', '📕', 'com', 'bossKinds', 5, 'Domajefes'],
  ['skyKill', 'Muerte desde el cielo', 'Derrota a 25 enemigos mientras vuelas.', '🦅', 'com', 'skyKills', 25, 'Halcón de Guerra'],
  ['massacre', 'Masacre', 'Derrota a 10 enemigos en menos de 3 segundos.', '💥', 'com', 'combo', 10, 'la Tormenta'],
  ['almost', 'Inmortal… casi', 'Muere 10 veces. Nadie dijo que fuera fácil.', '🪦', 'com', 'deaths', 10, 'el Testarudo'],
  ['apprentice', 'Aprendiz', 'Lanza tu primer hechizo.', '✨', 'mag', 'spells', 1, 'Aprendiz de Mago'],
  ['sorcerer', 'Hechicero', 'Lanza 500 hechizos.', '🔮', 'mag', 'spells', 500, 'el Hechicero'],
  ['archmage', 'Archimago', 'Lanza 3.000 hechizos.', '🌌', 'mag', 'spells', 3000, 'Archimago'],
  ['forbidden', 'Magia prohibida', 'Lanza un hechizo mortal.', '☄', 'mag', 'mortals', 1, 'Portador de Muerte'],
  ['endLord', 'Señor del fin', 'Lanza 50 hechizos mortales.', '🌑', 'mag', 'mortals', 50, 'Señor del Fin'],
  ['legendary', 'Poder legendario', 'Lanza el mega hechizo de una varita legendaria.', '🪄', 'mag', 'megas', 1, 'Elegido de la Varita'],
  ['army', 'Ejército de uno', 'Invoca clones 20 veces.', '👥', 'mag', 'clones', 20, 'el Multiplicado'],
  ['waves', 'Empuja y vencerás', 'Lanza 100 ondas expansivas.', '◎', 'mag', 'shocks', 100, 'Rompeondas'],
  ['scholar', 'Coleccionista arcano', 'Lanza 20 hechizos distintos.', '📚', 'mag', 'spellKinds', 20, 'Erudito Arcano'],
  ['library', 'Biblioteca andante', 'Lanza 50 hechizos distintos.', '🏛', 'mag', 'spellKinds', 50, 'Gran Sabio'],
  ['walker', 'Caminante', 'Recorre 1.000 casillas a pie.', '👣', 'exp', 'walk', 1000, 'el Caminante'],
  ['globetrotter', 'Trotamundos', 'Recorre 20.000 casillas a pie.', '🗺', 'exp', 'walk', 20000, 'Trotamundos'],
  ['wings', 'Vuela 1 km', 'Recorre 1.000 casillas volando.', '🪽', 'exp', 'fly', 1000, 'el Alado'],
  ['skyLord', 'Señor de los cielos', 'Recorre 20.000 casillas volando.', '☁', 'exp', 'fly', 20000, 'Señor de los Cielos'],
  ['survivor', 'Superviviente', 'Llega al día 10.', '🌅', 'exp', 'days', 10, 'Superviviente'],
  ['centenary', 'Centenario', 'Llega al día 100.', '💯', 'exp', 'days', 100, 'el Centenario'],
  ['yearly', 'Un año entero', 'Llega al día 365.', '📅', 'exp', 'days', 365, 'el Veterano'],
  ['cryptSeeker', 'Buscador de criptas', 'Descubre 5 entradas de mazmorra.', '🕳', 'exp', 'dgFound', 5, 'Buscador de Criptas'],
  ['engineer', 'Ingeniero', 'Lleva tu fábrica al nivel 3.', '⚙', 'exp', 'tier', 2, 'el Ingeniero'],
  ['industrial', 'Magnate industrial', 'Lleva tu fábrica al nivel 6.', '🏭', 'exp', 'tier', 5, 'Magnate'],
  ['stonecutter', 'Picapedrero', 'Pica 500 bloques de roca.', '⛏', 'ofi', 'mined', 500, 'Picapedrero'],
  ['dwarf', 'Enano honorario', 'Pica 10.000 bloques de roca.', '⛰', 'ofi', 'mined', 10000, 'Corazón de Piedra'],
  ['artisan', 'Artesano', 'Fabrica 100 veces.', '🔨', 'ofi', 'crafted', 100, 'el Artesano'],
  ['master', 'Maestro artesano', 'Fabrica 2.000 veces.', '🛠', 'ofi', 'crafted', 2000, 'Maestro Artesano'],
  ['bite', '¡Pica!', 'Pesca algo por primera vez.', '🎣', 'ofi', 'fish', 1, 'el Pescador'],
  ['seaWolf', 'Lobo de mar', 'Pesca 200 veces.', '🐟', 'ofi', 'fish', 200, 'Lobo de Mar'],
  ['farmer', 'Granjero', 'Cosecha 100 cultivos maduros.', '🌾', 'ofi', 'crops', 100, 'el Granjero'],
  ['harvestKing', 'Rey de la cosecha', 'Cosecha 2.000 cultivos maduros.', '🌽', 'ofi', 'crops', 2000, 'Rey de la Cosecha'],
  ['bestFriend', 'Mejor amigo', 'Domestica a un animal.', '🐾', 'ofi', 'pets', 1, 'el Domador'],
  ['zoo', 'Zoológico', 'Ten 8 animales domesticados a la vez.', '🦁', 'ofi', 'pets', 8, 'Señor de las Bestias'],
  ['hood', 'Vecindario', 'Ten 3 aldeanos viviendo en tus casas.', '🏠', 'ofi', 'npcs', 3, 'el Fundador'],
  ['city', 'Ciudad próspera', 'Ten 6 aldeanos viviendo en tus casas.', '🏘', 'ofi', 'npcs', 6, 'el Alcalde'],
  ['rich', 'Bolsa llena', 'Lleva 1.000 monedas encima.', '💰', 'ofi', 'coins', 1000, 'el Rico'],
  ['sleepy', 'Dormilón', 'Duerme 30 noches en una cama.', '🛏', 'ofi', 'sleeps', 30, 'el Dormilón'],
  ['wvWin', 'Superviviente de la Oleada', 'Termina una Gran Oleada.', '🛡', 'wav', 'wvWins', 1, 'Superviviente de la Oleada'],
  ['wvFlawless', 'Intocable', 'Termina una Gran Oleada sin morir ni una vez.', '💎', 'wav', 'wvFlawless', 1, 'el Intocable'],
  ['wvAll', 'Conquistador', 'Supera las 5 arenas de la Gran Oleada.', '🏟', 'wav', 'wvArenas', 5, 'Conquistador de Arenas'],
  ['warlord', 'Señor de la guerra', 'Termina 10 Grandes Oleadas.', '⚔', 'wav', 'wvWins', 10, 'Señor de la Guerra'],
  ['dgFirst', 'Primer descenso', 'Completa una mazmorra.', '🗝', 'dun', 'dungeons', 1, 'el Saqueador'],
  ['dgRat', 'Rata de mazmorra', 'Completa 10 mazmorras.', '🐀', 'dun', 'dungeons', 10, 'Rata de Mazmorra'],
  ['dgLord', 'Señor de las profundidades', 'Completa 50 mazmorras.', '🕯', 'dun', 'dungeons', 50, 'Señor de las Profundidades'],
  ['treasure', 'Cazatesoros', 'Abre 25 cofres de mazmorra.', '🧰', 'dun', 'dgChests', 25, 'Cazatesoros'],
  ['bright', 'Mente brillante', 'Resuelve 10 puzles de palancas.', '🧩', 'dun', 'dgPuzzles', 10, 'Mente Brillante'],
  ['ghost', 'El fantasma', 'Completa una mazmorra sin recibir ni un golpe.', '👻', 'dun', 'dgFlawless', 1, 'el Fantasma'],
  ['abyss', 'Abismo superado', 'Completa una mazmorra de nivel 5.', '🌋', 'dun', 'dgDeep', 1, 'Caminante del Abismo'],
  ['errand', 'Al servicio del pueblo', 'Completa un encargo de los aldeanos.', '📜', 'vil', 'quests', 1, 'el Recadero'],
  ['localHero', 'Héroe local', 'Completa 25 encargos.', '🎖', 'vil', 'quests', 25, 'Héroe Local'],
  ['villageLegend', 'Leyenda del pueblo', 'Completa 100 encargos.', '🏅', 'vil', 'quests', 100, 'Leyenda del Pueblo'],
  ['beloved', 'Querido por todos', 'Llega al máximo aprecio de los aldeanos.', '❤', 'vil', 'repLv', 5, 'Querido por Todos'],
  ['halfway', 'Medio camino', 'Consigue 30 logros.', '🥈', 'meta', 'achs', 30, 'el Coleccionista'],
  ['platinum', 'Platino', 'Consigue todos los demás logros.', '🏆', 'meta', 'achs', 62, 'el Completo'],
].map(([id, n, d, i, cat, st, goal, t]) => ({ id, n, d, i, cat, st, goal, t }));
const ACH = Object.fromEntries(ACH_LIST.map(a => [a.id, a]));

// ---------- Aprecio de los aldeanos ----------
// [puntos para llegar, nombre, rebaja en sus tiendas]
const REP_LV = [[0, 'Forastero', 0], [30, 'Conocido', 0.04], [90, 'Vecino', 0.08], [200, 'Amigo del pueblo', 0.12], [400, 'Héroe local', 0.16], [700, 'Leyenda', 0.2]];
