'use strict';
// =====================================================================================
//  El final del juego: reparación, crónicas de los Forjadores, la Gran Ruina (Ciudadela del
//  Primer Engranaje), los Ocho Sellos, la Puerta del Ocaso, el Corazón del Mundo y su guardián.
//  Aquí solo hay datos; la lógica está en sim/endgame.js y sim/durability.js.
// =====================================================================================
const LORE_CAT = ICATS.length; ICATS.push('Reliquias');

// ---------- Reparación (las herramientas, armas y armaduras se desgastan) ----------
IT('whetstone', 'Piedra de afilar', '#9a9890', 'gem', 9, 'Úsala con F: devuelve el 30 % de los usos a la herramienta o arma más gastada que lleves.');
IT('repairKit', 'Kit de reparación', '#c8843a', 'block', 9, 'Úsalo con F: devuelve el 50 % de los usos a la pieza más gastada (herramienta, arma o armadura).');
IT('arcaneRepair', 'Esencia restauradora', '#9af0ff', 'potion', 9, 'Úsala con F: deja como nuevas todas las piezas gastadas que lleves y vistas.');
ITEMS.whetstone.repair = { amt: 0.3, only: 'tool' }; ITEMS.repairKit.repair = { amt: 0.5 }; ITEMS.arcaneRepair.repair = { amt: 1, all: 1 };
R2('whetstone', 2, 'stone', 'sand,stone', 0, 0);
R2('repairKit', 1, 'ironIngot', 'planks,stick,ironIngot', 0, 0);
R2('arcaneRepair', 1, 'crystal', 'redstone,redstone,goldIngot', 0, 3);

// ---------- Reliquias ----------
IT('loreTablet', 'Tablilla de los Forjadores', '#c8b48a', 'sheet', LORE_CAT, 'Una losa grabada con letras de latón. Léela con F: añade una página a tus Crónicas (J).');
IT('heartShard', 'Esquirla del Corazón', '#ff9a4a', 'gem', LORE_CAT, 'Un pedazo caliente del Corazón del Mundo. Late al ritmo de tus máquinas.');
weapon('primeCogBlade', 'Hoja del Primer Engranaje', '#ffcf5a', 'sword', { dmg: 22, reach: 70, sweep: 96, el: 'storm' }, 'Forjada con la última chispa del Corazón.');
RX('primeCogBlade', 'heartShard', ['heartShard', 'heartShard', 'kineticCore'], 0, 0);

// Los Ocho Sellos: cada Guardián guarda uno desde que la Gran Artífice cerró la Puerta
const SEALS = [
  ['ancientYeti', 'frost', 'Sello de la Escarcha', '#8ad8ff', 'Norte helado'],
  ['pharaoh', 'sand', 'Sello de la Arena', '#ffd34a', 'Desierto'],
  ['swampHydra', 'mire', 'Sello de la Ciénaga', '#8ac84a', 'Pantano'],
  ['primalTreant', 'root', 'Sello de la Raíz', '#6aa83a', 'Bosque'],
  ['elderDrake', 'ember', 'Sello de la Brasa', '#ff6a2a', 'Volcanes'],
  ['lich', 'dusk', 'Sello del Ocaso', '#5af0ff', 'Criptas y noche'],
  ['stormTitan', 'thunder', 'Sello del Trueno', '#f0f05a', 'Cumbres'],
  ['voidDevourer', 'void', 'Sello del Vacío', '#a060ff', 'Más allá'],
];
for (const [boss, k, n, c] of SEALS) {
  IT('seal_' + k, n, c, 'coin', LORE_CAT, `Uno de los Ocho Sellos de la Puerta del Ocaso. Lo guardaba ${BOSSES[boss].n}. Colócalo en su pedestal de la Gran Ruina (F).`);
  BOSSES[boss].seal = 'seal_' + k;
}

// ---------- El guardián final ----------
BOSSES.rustHeart = {
  n: 'Herrumbre, el Engranaje Hambriento', shape: 'golem', c: '#5a3a22', c2: '#ff7a2a', s: 74, hp: 9000, dmg: 40, v: 1.25, el: 'void', crown: 1,
  ab: [['beam'], ['summon', 'automaton', 3], ['spiral'], ['ring', 24], ['meteor', 8], ['pull'], ['shield'], ['hazard'], ['charge']],
  tier: 99, final: 1, drops: [['heartShard', 3, 1], ['coin', 800, 1], ['arcaneRepair', 2, 1]],
};

// ---------- Casillas de la ruina y del Corazón (siempre al final de la tabla) ----------
function TLx(key, o) { TL(key, o); const t = GI[G[key]]; t.u = t.under ? G[t.under] : -1; if (!t.c) t.c = GI[t.u].c; t.flora = false; t.solid = !!o.solid; }
TLx('RUINFLOOR', { n: 'Losas de la Ciudadela', c: [96, 90, 82], ruin: 'floor' });
TLx('RUINWALL', { n: 'Muro de los Forjadores', c: [74, 69, 64], ruin: 'wall', solid: 1, sealed: 1 });
TLx('RUINRUBBLE', { n: 'Escombros antiguos', c: [104, 98, 90], ruin: 'rubble', solid: 1, drop: 'stone', hp: 3, under: 'RUINFLOOR', extra: ['loreTablet', 0.12], mt: 0.9 });
TLx('RUINPILLAR', { n: 'Columna de latón', c: [96, 90, 82], ruin: 'pillar', solid: 1, sealed: 1 });
TLx('RUINRUNE', { n: 'Losa rúnica', c: [70, 66, 80], ruin: 'rune', light: 1 });
TLx('RUINCANAL', { n: 'Canal de latón', c: [90, 84, 74], ruin: 'canal' });
TLx('SOCKET', { n: 'Pedestal del Sello', c: [96, 90, 82], ruin: 'socket', solid: 1, sealed: 1, light: 1 });
TLx('PORTALFRAME', { n: 'Arco de la Puerta del Ocaso', c: [60, 50, 40], ruin: 'frame', solid: 1, sealed: 1 });
TLx('PORTALCORE', { n: 'Puerta del Ocaso', c: [24, 18, 32], ruin: 'portal', light: 2 });
TLx('RUNESTONE', { n: 'Piedra rúnica', c: [96, 90, 82], ruin: 'stone', solid: 1, drop: 'loreTablet', hp: 1, under: 'RUINFLOOR', light: 1, mt: 1.2 });
TLx('ABYSS', { n: 'Abismo', c: [8, 6, 16], liquid: 'void', abyss: 1 });
TLx('HEARTFLOOR', { n: 'Placas del Corazón', c: [62, 44, 40], ruin: 'heart' });
TLx('HEARTBRIDGE', { n: 'Puente de engranajes', c: [86, 70, 50], ruin: 'bridge' });
TLx('HEARTCORE', { n: 'Corazón del Mundo', c: [120, 50, 20], ruin: 'core', solid: 1, sealed: 1, light: 3 });
TLx('RETURNPORTAL', { n: 'Portal de regreso', c: [24, 18, 32], ruin: 'return', light: 2 });
GI[G.RUINRUBBLE].need = { k: 'pick', lv: 3 }; GI[G.RUNESTONE].need = { k: 'pick', lv: 1 };

// ---------- Crónicas ----------
// on: cuándo se desbloquea · start · tier:N · tablet (al leer tablillas, en orden) · boss:k · ruin · seal · portal · dim · end
const LORE = [
  { id: 'spark', on: 'start', t: 'I. La Chispa', x: 'Despiertas junto a una máquina que no recuerdas haber construido: un engranaje de latón que gira solo, sin agua ni viento que lo empuje. Lo llaman el Núcleo. Late como un corazón dormido. Cuando le entregas lo que fabricas, gira un poco más deprisa… y por un instante te parece oír voces dentro.' },
  { id: 'still', on: 'tablet', t: 'II. El Mundo Quieto', x: '«Antes de nosotros el mundo no giraba. No había viento, ni ríos, ni estaciones. El sol colgaba inmóvil sobre un mar de cristal y las cosas no envejecían porque nada cambiaba. Lo llamábamos el Mundo Quieto, y en él éramos pocos y teníamos frío.» — Primera tablilla de la Ciudadela.' },
  { id: 'forgers', on: 'tablet', t: 'III. Los Forjadores', x: 'Se llamaban a sí mismos los Artífices del Primer Engranaje. No adoraban dioses: adoraban el movimiento. Creían que todo lo que gira está vivo, y que todo lo vivo puede aprender a girar mejor. Sus niños aprendían a leer en los dientes de las ruedas antes que en los libros.' },
  { id: 'heart', on: 'tablet', t: 'IV. El Corazón del Mundo', x: '«Lo construimos en mil años y lo encendimos en un instante.» Bajo la Ciudadela levantaron una máquina tan grande que su eje atravesaba el mundo de lado a lado: el Corazón. Cuando dio su primera vuelta sopló el primer viento. Con la segunda corrieron los ríos. Con la tercera llegó la noche.' },
  { id: 'cores', on: 'tablet', t: 'V. Las Chispas', x: 'El Corazón estaba lejos de las aldeas, así que la ingeniera Maru Vell diseñó los Núcleos: copias diminutas que guardaban una chispa de su giro. Cada pueblo tenía el suyo. «Entregadle vuestro trabajo», escribió Maru, «y os devolverá el doble. Un Núcleo aprende de lo que le das.»' },
  { id: 'hunger', on: 'tablet', t: 'VI. El Hambre', x: 'Informe del vigía Oren, año 812 del Giro: «El Corazón pide más. Cada estación quema el doble de mineral que la anterior. Los maestros dicen que es normal, que una máquina viva crece. Pero esta mañana he visto óxido en los dientes del eje mayor. Óxido que se movía.»' },
  { id: 'rust', on: 'tablet', t: 'VII. La Herrumbre', x: 'No era óxido. Era hambre con forma. La Herrumbre nació dentro del Corazón y se extendió por sus engranajes como una enfermedad que piensa. Donde tocaba, el metal se volvía suyo. Los autómatas guardianes fueron los primeros en volverse contra sus creadores.' },
  { id: 'monsters', on: 'tablet', t: 'VIII. Lo que se derramó', x: 'Al resquebrajarse, el Corazón derramó su energía sobre el mundo. En los bosques, los árboles despertaron con rabia. En los desiertos, los muertos dejaron de estar quietos. En las cumbres, las tormentas aprendieron a andar. Los monstruos que te acechan de noche son ecos de aquel derrame.' },
  { id: 'ilvane', on: 'tablet', t: 'IX. La Gran Artífice', x: 'Ilvane Dorr era la última Gran Artífice. Cuando las ciudades caían, no huyó: bajó al Corazón con doscientos ingenieros. Ninguno volvió a subir. Dicen que trabajaron cuarenta días sin dormir, girando a mano las ruedas que la Herrumbre ya había comido.' },
  { id: 'gate', on: 'tablet', t: 'X. La Puerta del Ocaso', x: 'Ilvane no pudo destruir el Corazón: sin él, el mundo volvería a quedarse quieto. Así que lo arrancó del mundo. Lo encerró en un pliegue más allá del cielo y lo selló tras un arco de latón y piedra negra: la Puerta del Ocaso, en el centro de la Ciudadela.' },
  { id: 'eight', on: 'tablet', t: 'XI. Los Ocho Sellos', x: 'La llave de la Puerta se partió en ocho sellos, uno por cada fuerza que el Corazón movía: Escarcha, Arena, Ciénaga, Raíz, Brasa, Ocaso, Trueno y Vacío. Ilvane confió cada sello a un Guardián, criaturas antiguas que juraron no entregarlo jamás a nadie… salvo a quien portara una Chispa despierta.' },
  { id: 'oath', on: 'tablet', t: 'XII. El juramento de los Guardianes', x: '«Guardaré el sello hasta que el último engranaje se pare. No lo entregaré al hambre, ni al miedo, ni al oro. Solo lo entregaré, vencido, a quien lleve la Chispa y la haya enseñado a recordar.» Pero el juramento duró más que la cordura: la Herrumbre que escapó por las grietas también los alcanzó a ellos.' },
  { id: 'child', on: 'tablet', t: 'XIII. Una nota pequeña', x: 'Grabada con un clavo en una losa del suelo, con letra torcida: «Mamá dice que nos vamos a otro sitio donde el viento sopla menos. Le he dejado mi rueda de juguete al Núcleo de la plaza para que no esté solo. Si alguien la encuentra, dele vueltas. Le gusta.»' },
  { id: 'exodus', on: 'tablet', t: 'XIV. El Éxodo', x: 'Los supervivientes abandonaron la Ciudadela y se dispersaron. Con los siglos olvidaron cómo funcionaban los Núcleos y los enterraron, los usaron de altar o de piedra de molino. Uno a uno se apagaron. Todos menos uno.' },
  { id: 'slowing', on: 'tablet', t: 'XV. El mundo se para', x: 'Sin el Corazón, el mundo funciona con la inercia de aquel primer giro. Pero la inercia se acaba. Los vientos son más flojos que hace un siglo. Los ríos, más lentos. Algún día la noche no terminará. Las tablillas lo llaman el Segundo Silencio.' },
  { id: 'heir', on: 'tablet', t: 'XVI. Quien porta la Chispa', x: 'El último Núcleo no te encontró por casualidad. Las Chispas eligen a quien construye. Cada máquina que levantas le enseña un recuerdo perdido: la metalurgia, la electricidad, la química… Cuando haya aprendido todo lo que sabían los Forjadores, recordará también el camino a casa.' },
  { id: 't1', on: 'tier:1', t: 'Recuerdo: la piedra y el eje', x: 'Al recibir tu andesita y tus lingotes, el Núcleo proyecta una imagen borrosa: manos que encajan un eje en una rueda de piedra. Una voz: «Primero el giro. Después todo lo demás.»' },
  { id: 't3', on: 'tier:3', t: 'Recuerdo: la corriente', x: 'Chispas azules recorren el Núcleo. Ves una ciudad entera iluminada por cables de cobre que cuelgan entre torres de latón, y a gente que no tiene miedo de la noche.' },
  { id: 't5', on: 'tier:5', t: 'Recuerdo: la precisión', x: '«Un diente mal tallado detiene mil ruedas.» El Núcleo te muestra talleres donde los Forjadores medían en milésimas. Uno de ellos se gira y te mira, como si supiera que lo estás viendo.' },
  { id: 't7', on: 'tier:7', t: 'Recuerdo: los procesadores', x: 'El Núcleo zumbaba distinto. Ves salas llenas de circuitos que piensan, y a Ilvane Dorr entre ellos, más joven, dibujando el plano de una puerta con ocho cerraduras.' },
  { id: 'awake', on: 'tier:8', t: 'XVII. La Chispa despierta', x: 'El Núcleo da una vuelta completa sobre sí mismo y se detiene. Por primera vez está en silencio. Luego un rayo de luz dorada sale disparado hacia el horizonte: hacia la Ciudadela del Primer Engranaje. Ahora sabes dónde está. Ahora sabes lo que tienes que hacer.' },
  { id: 'ruin', on: 'ruin', t: 'XVIII. La Ciudadela', x: 'Muros más altos que árboles, columnas de latón verdoso, canales secos que antes llevaban aceite hasta el corazón de la plaza. En el centro, ocho pedestales vacíos rodean un arco negro. El aire huele a metal caliente aunque todo esté frío.' },
  { id: 'firstSeal', on: 'seal', t: 'XIX. El primer sello', x: 'El sello encaja en su pedestal con un chasquido que resuena en toda la Ciudadela. Las runas del suelo se encienden una a una. En algún lugar, muy lejos, algo enorme y oxidado deja de masticar y escucha.' },
  { id: 'portal', on: 'portal', t: 'XX. La Puerta se abre', x: 'Ocho sellos. Una Chispa despierta. El arco del Ocaso se llena de una luz que gira como un remolino de engranajes. Al otro lado se oye un latido lento, enfermo, cada vez más débil. El Corazón todavía vive. Por poco.' },
  { id: 'dim', on: 'dim', t: 'XXI. Más allá del cielo', x: 'Aquí no hay suelo: solo puentes de engranajes suspendidos sobre un abismo lleno de estrellas que no se mueven. A lo lejos, el Corazón del Mundo, enorme y rojo, cubierto de Herrumbre. Y encima, algo que se alimenta de él.' },
  { id: 'devour', on: 'boss:rustHeart', t: 'XXII. El Engranaje Hambriento', x: 'La Herrumbre ya no tiene forma de óxido: se ha construido un cuerpo con los restos de doscientos ingenieros y sus máquinas. Cuando cae, deja escapar un sonido parecido a un suspiro. El Corazón, libre al fin, late una vez con fuerza. Ahora debes decidir.' },
  { id: 'endA', on: 'end:revive', t: 'Epílogo: El Segundo Giro', x: 'Reavivas el Corazón. Su latido atraviesa la Puerta y recorre el mundo: los vientos soplan como en las tablillas, los ríos corren deprisa y tu Núcleo brilla como nunca. Los Forjadores soñaron con un mundo que no dejara de moverse, y tú lo has devuelto. Quizá algún día el hambre vuelva. Para entonces, tu fábrica estará preparada.' },
  { id: 'endB', on: 'end:free', t: 'Epílogo: La Chispa Libre', x: 'Liberas la Chispa. El Corazón se deshace en un millón de chispas doradas que atraviesan la Puerta y caen sobre el mundo como lluvia. Ya no hay un centro que la Herrumbre pueda devorar: cada rueda, cada río, cada viento es ahora un pedazo del Corazón. La magia fluye por todas partes, y tu Núcleo late al mismo ritmo que el mundo.' },
];
const LORE_BY = {}; for (const e of LORE) LORE_BY[e.id] = e;
const TABLET_ORDER = LORE.filter(e => e.on === 'tablet').map(e => e.id);
// Primera victoria contra cada Guardián: una página sobre él
for (const [boss, , n] of SEALS) LORE.push({ id: 'g_' + boss, on: 'boss:' + boss, t: `Guardián: ${BOSSES[boss].n}`, x: `${BOSSES[boss].n} guardaba el ${n} desde los días de Ilvane Dorr. La Herrumbre lo había vuelto loco, pero al caer, sus ojos se aclararon un instante. Te entregó el sello sin luchar más, como si llevara siglos esperando a alguien que lo mereciera.` });
for (const e of LORE) LORE_BY[e.id] = e;
