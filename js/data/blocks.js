'use strict';
// Definición de todos los bloques colocables.
// kin: 'axis'|'all'|'belt'|'ratio' (red cinética) · impact: SU por RPM · gen: generador cinético
// pw: energía {role:'gen'|'use'|'store'|'diode', rate FE/s, cap FE} · cable: conductor eléctrico
// fl: fluidos {tanks, in, out, store, drain} · machine: clave de RECIPES · inv: tiene entrada/salida
// place: regla de colocación · emit: emite redstone · rsin: recibe redstone · rsable: modo redstone
// sides: configuración por cara · cfg: parámetros ajustables con T / panel · light: radio de luz
const CATS = ['Cinética', 'Generadores', 'Procesado', 'Logística', 'Energía', 'Fluidos', 'Lógica'];
const PARAMS = {
  mult: { n: 'Multiplicador', vals: [0.25, 0.5, 2, 4], f: v => '×' + String(v).replace('.', ','), kin: 1 },
  period: { n: 'Periodo', vals: [0.5, 1, 2, 4, 8, 16], f: v => String(v).replace('.', ',') + ' s' },
  th: { n: 'Umbral', vals: [0.01, 0.25, 0.5, 0.75, 1], f: v => v < 0.05 ? 'no vacío' : Math.round(v * 100) + ' %' },
  freq: { n: 'Frecuencia', vals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], f: v => 'canal ' + v },
  delay: { n: 'Retardo', vals: [0.1, 0.2, 0.5, 1, 2], f: v => String(v).replace('.', ',') + ' s' },
  target: { n: 'Contar hasta', vals: [2, 4, 8, 16, 32, 64], f: v => v + ' pulsos' },
  mode: { n: 'Modo', vals: [0, 1], f: v => v ? 'Restar' : 'Comparar' },
  invert: { n: 'Salida', vals: [0, 1], f: v => v ? 'Invertida (noche)' : 'Normal (día)' },
  dist: { n: 'Distancia', vals: [2, 3, 4, 5, 6], f: v => v + ' casillas' },
};
const BD = {};
function B(id, o) { BD[id] = o; }

// ---------- Cinética ----------
B('shaft', { n: 'Eje', cat: 0, kin: 'axis', dir: 1, d: 'Transmite rotación en línea recta. Arrastra para hacer líneas.' });
B('gearbox', { n: 'Caja de engranajes', cat: 0, kin: 'all', d: 'Transmite rotación en las 4 direcciones.' });
B('clutch', { n: 'Embrague', cat: 0, kin: 'axis', dir: 1, rsin: 1, tier: 1, d: 'Eje que se desconecta al recibir redstone.' });
B('brake', { n: 'Freno', cat: 0, kin: 'all', rsin: 1, tier: 1, d: 'Con redstone frena y detiene toda su red.' });
B('speedometer', { n: 'Velocímetro', cat: 0, kin: 'axis', dir: 1, emit: 1, tier: 1, d: 'Eje que emite redstone según las RPM (256 RPM = 15).' });
B('stressometer', { n: 'Medidor de estrés', cat: 0, kin: 'axis', dir: 1, emit: 1, tier: 1, d: 'Eje que emite redstone según el estrés usado (lleno = 15).' });
B('doubler', { n: 'Multiplicador ×2', cat: 0, kin: 'ratio', dir: 1, tier: 2, d: 'Duplica las RPM hacia la flecha (y el estrés de lo que mueve).' });
B('speedctl', { n: 'Caja de cambios', cat: 0, kin: 'ratio', dir: 1, tier: 2, cfg: ['mult'], d: 'Multiplica las RPM hacia la flecha de ×0,25 a ×4.' });

// ---------- Generadores ----------
B('crank', { n: 'Manivela', cat: 1, kin: 'all', gen: { rpm: 32, cap: 256 }, d: 'F: girar 8 s (acumula hasta 30 s).' });
B('waterwheel', { n: 'Rueda hidráulica', cat: 1, kin: 'all', gen: { rpm: 16, cap: 512 }, place: 'water', d: 'Junto al agua. Gira siempre.' });
B('windmill', { n: 'Molino de viento', cat: 1, kin: 'all', gen: { rpm: 24, cap: 1024 }, tier: 1, d: 'Sin otro molino a 3 casillas.' });
B('steam', { n: 'Motor de vapor', cat: 1, kin: 'all', gen: { rpm: 64, cap: 4096 }, inv: 1, fuel: ['coal', 'log', 'planks'], tier: 2, d: 'Quema combustible para dar mucha potencia.' });
B('emotor', { n: 'Motor eléctrico', cat: 1, kin: 'all', gen: { rpm: 64, cap: 1536 }, pw: { role: 'use', rate: 80, cap: 400 }, tier: 3, d: 'Convierte energía en rotación.' });

// ---------- Procesado ----------
B('bench', { n: 'Banco de ensamblaje', cat: 2, kin: 'all', impact: 2, d: 'Fabrica con núcleo + dientes. Las recetas avanzadas piden RPM.' });
B('drill', { n: 'Taladro mecánico', cat: 2, kin: 'all', dir: 1, impact: 4, inv: 1, rsable: 1, place: 'res', d: 'Sobre menas, piedra, arena o árboles. Extrae sin fin.' });
B('furnace', { n: 'Horno', cat: 2, machine: 'furnace', dir: 1, inv: 1, rsable: 1, light: 2, d: 'Funde con carbón (1 carbón = 8 piezas).' });
B('millstone', { n: 'Muela', cat: 2, machine: 'millstone', kin: 'all', dir: 1, impact: 4, inv: 1, rsable: 1, d: 'Tritura menas en 2. Piedra → arena.' });
B('saw', { n: 'Sierra mecánica', cat: 2, machine: 'saw', kin: 'all', dir: 1, impact: 4, inv: 1, rsable: 1, d: 'Tronco → 6 tablones.' });
B('press', { n: 'Prensa mecánica', cat: 2, machine: 'press', kin: 'all', dir: 1, impact: 8, inv: 1, rsable: 1, tier: 1, d: 'Lingote → lámina.' });
B('lathe', { n: 'Torno', cat: 2, machine: 'lathe', kin: 'all', dir: 1, impact: 4, inv: 1, rsable: 1, tier: 1, d: 'Hierro → varillas. Andesita → engranajes.' });
B('wiremill', { n: 'Trefiladora', cat: 2, machine: 'wiremill', kin: 'all', dir: 1, impact: 4, inv: 1, rsable: 1, tier: 1, d: 'Cobre → 2 bobinas.' });
B('mixer', { n: 'Mezcladora', cat: 2, machine: 'mixer', kin: 'all', dir: 1, impact: 6, inv: 1, rsable: 1, tier: 2, d: 'Aleaciones: latón y andesita.' });
B('crusher', { n: 'Ruedas trituradoras', cat: 2, machine: 'crusher', kin: 'all', dir: 1, impact: 12, inv: 1, rsable: 1, tier: 2, d: 'Tritura 3 veces más rápido que la muela.' });
B('efurnace', { n: 'Horno eléctrico', cat: 2, machine: 'furnace', dir: 1, inv: 1, rsable: 1, light: 2, pw: { role: 'use', rate: 40, cap: 400 }, tier: 2, d: 'Funde el doble de rápido sin carbón.' });
B('blastFurnace', { n: 'Alto horno', cat: 2, machine: 'blast', dir: 1, inv: 1, rsable: 1, light: 3, pw: { role: 'use', rate: 100, cap: 1000 }, tier: 3, d: 'Acero y silicio.' });
B('vulcanizer', { n: 'Vulcanizadora', cat: 2, machine: 'vulcan', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 40, cap: 400 }, tier: 3, d: 'Látex + carbón → caucho.' });
B('treetap', { n: 'Extractor de savia', cat: 2, dir: 1, inv: 1, rsable: 1, place: 'tree', tier: 3, d: 'Sobre un árbol: produce látex.' });
B('assembler', { n: 'Ensamblador mecánico', cat: 2, kin: 'all', dir: 1, impact: 8, inv: 1, rsable: 1, tier: 4, d: 'Banco automático: elige receta (T) y aliméntalo con cintas.' });

// ---------- Logística ----------
B('belt', { n: 'Cinta mecánica', cat: 3, kin: 'belt', dir: 1, impact: 0.25, rsable: 1, d: 'Mueve objetos. Necesita rotación: más RPM, más rápida.' });
B('brassBelt', { n: 'Cinta de latón', cat: 3, kin: 'belt', dir: 1, impact: 0.5, rsable: 1, tier: 4, d: 'El doble de rápida que la normal.' });
B('chest', { n: 'Cofre', cat: 3, slots: 27, d: '27 ranuras. Recibe de cintas y embudos.' });
B('vault', { n: 'Bóveda', cat: 3, slots: 54, tier: 2, d: '54 ranuras.' });
B('depot', { n: 'Depósito', cat: 3, tier: 1, d: 'Guarda una pila de un tipo de objeto. Los brazos lo usan.' });
B('extractor', { n: 'Embudo extractor', cat: 3, dir: 1, rsin: 1, filter: 1, d: 'Saca del bloque de atrás y deja delante. Se bloquea con redstone.' });
B('splitter', { n: 'Túnel divisor', cat: 3, dir: 1, tier: 1, d: 'Reparte entre delante, izquierda y derecha.' });
B('sorter', { n: 'Clasificador', cat: 3, dir: 1, filter: 1, tier: 2, d: 'El objeto del filtro sale a la izquierda; el resto, recto.' });
B('trash', { n: 'Papelera', cat: 3, tier: 1, d: 'Destruye todo lo que recibe.' });
B('arm', { n: 'Brazo mecánico', cat: 3, kin: 'all', dir: 1, impact: 2, filter: 1, rsable: 1, tier: 2, d: 'Coge de detrás (incluso de cintas) y deja delante.' });
B('ejector', { n: 'Lanzador', cat: 3, kin: 'all', dir: 1, impact: 4, cfg: ['dist'], rsable: 1, tier: 2, d: 'Lanza objetos varias casillas hacia delante, por encima de todo.' });

// ---------- Energía ----------
B('cableCu', { n: 'Cable de cobre', cat: 4, cable: { kind: 'cu', cap: 400 }, tier: 2, d: 'Lleva 400 FE/s. Solo se une a cables iguales.' });
B('cableRub', { n: 'Cable aislado', cat: 4, cable: { kind: 'rub', cap: 1500 }, tier: 3, d: 'Lleva 1500 FE/s.' });
B('cableBr', { n: 'Cable de latón', cat: 4, cable: { kind: 'br', cap: 6000 }, tier: 4, d: 'Lleva 6000 FE/s.' });
B('pswitch', { n: 'Interruptor eléctrico', cat: 4, cable: { kind: '*', cap: 6000 }, rsin: 1, tier: 2, d: 'Une cualquier tipo de cable. Con redstone, corta la corriente.' });
B('dynamo', { n: 'Dinamo', cat: 4, kin: 'all', impact: 8, pw: { role: 'gen', rate: 512, cap: 600 }, tier: 2, d: 'Rotación → energía: 2 FE/s por RPM.' });
B('solar', { n: 'Panel solar', cat: 4, pw: { role: 'gen', rate: 30, cap: 200 }, tier: 4, d: '30 FE/s a pleno sol. Nada de noche.' });
B('combGen', { n: 'Generador de combustión', cat: 4, inv: 1, fuel: ['coal', 'log', 'planks'], pw: { role: 'gen', rate: 120, cap: 1200 }, light: 1, tier: 3, d: 'Quema combustible: 120 FE/s.' });
B('turbine', { n: 'Turbina de vapor', cat: 4, pw: { role: 'gen', rate: 320, cap: 2000 }, fl: { tanks: { s: 2000 }, in: { s: ['steam'] } }, tier: 3, d: 'Vapor → energía: hasta 320 FE/s.' });
B('gasGen', { n: 'Generador de gas', cat: 4, pw: { role: 'gen', rate: 300, cap: 2000 }, fl: { tanks: { g: 1000 }, in: { g: ['gas', 'hydrogen'] } }, light: 1, tier: 4, d: 'Gas o hidrógeno → 300 FE/s.' });
B('battery', { n: 'Batería', cat: 4, pw: { role: 'store', rate: 500, cap: 20000 }, sides: 1, tier: 2, d: 'Guarda 20k FE. Configura cada cara: entrada, salida o bloqueada.' });
B('bigBattery', { n: 'Batería grande', cat: 4, pw: { role: 'store', rate: 3000, cap: 200000 }, sides: 1, tier: 4, d: 'Guarda 200k FE.' });
B('capacitor', { n: 'Condensador', cat: 4, pw: { role: 'store', rate: 5000, cap: 2000 }, sides: 1, tier: 2, d: 'Poca capacidad pero carga y descarga al instante.' });
B('diode', { n: 'Diodo', cat: 4, dir: 1, pw: { role: 'diode', rate: 2000, cap: 400 }, tier: 3, d: 'La energía solo pasa de atrás hacia la flecha.' });
B('pmeter', { n: 'Medidor de energía', cat: 4, dir: 1, emit: 1, tier: 2, d: 'Emite redstone según la carga del bloque de delante.' });
B('elamp', { n: 'Foco eléctrico', cat: 4, pw: { role: 'use', rate: 4, cap: 40 }, light: 6, tier: 2, d: 'Ilumina mucho de noche. 4 FE/s.' });

// ---------- Fluidos ----------
B('pipe', { n: 'Tubería', cat: 5, pipe: 1, tier: 3, d: 'Lleva fluidos (2000 mB/s).' });
B('valve', { n: 'Válvula', cat: 5, pipe: 1, rsin: 1, tier: 3, d: 'Tubería que se cierra con redstone.' });
B('mpump', { n: 'Bomba mecánica', cat: 5, kin: 'all', impact: 4, place: 'liquid', fl: { tanks: { o: 1000 }, out: ['o'] }, rsable: 1, tier: 3, d: 'Junto a cualquier líquido (agua, lava, ácido, miel, petróleo): lo bombea según las RPM.' });
B('epump', { n: 'Bomba eléctrica', cat: 5, pw: { role: 'use', rate: 20, cap: 200 }, place: 'pump', fl: { tanks: { o: 2000 }, out: ['o'] }, rsable: 1, tier: 4, d: 'Junto a cualquier líquido o sobre un pozo de petróleo.' });
B('derrick', { n: 'Torre petrolífera', cat: 5, kin: 'all', impact: 8, place: 'oil', fl: { tanks: { o: 2000 }, out: ['o'] }, rsable: 1, tier: 4, d: 'Sobre petróleo: lo extrae según las RPM.' });
B('gasx', { n: 'Extractor de gas', cat: 5, pw: { role: 'use', rate: 30, cap: 300 }, place: 'gas', fl: { tanks: { o: 2000 }, out: ['o'] }, rsable: 1, tier: 4, d: 'Sobre un géiser de gas natural.' });
B('tank', { n: 'Tanque de fluidos', cat: 5, fl: { tanks: { m: 8000 }, store: LIQUIDS, rate: 2000 }, sides: 1, tier: 3, d: 'Guarda 8000 mB de un líquido (agua, petróleo, lava, ácido o miel).' });
B('gastank', { n: 'Tanque de gas', cat: 5, fl: { tanks: { m: 16000 }, store: GASES, rate: 3000 }, sides: 1, tier: 4, d: 'Guarda 16000 mB de vapor, gas o hidrógeno.' });
B('boiler', { n: 'Caldera', cat: 5, inv: 1, fuel: ['coal', 'log', 'planks'], fl: { tanks: { w: 2000, g: 1000, s: 2000 }, in: { w: ['water'], g: ['gas', 'hydrogen'] }, out: ['s'] }, light: 1, tier: 3, d: 'Agua + combustible (o gas) → vapor.' });
B('refinery', { n: 'Refinería', cat: 5, machine: 'refinery', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 80, cap: 800 }, fl: { tanks: { o: 2000, g: 2000 }, in: { o: ['oil'] }, out: ['g'] }, tier: 4, d: 'Petróleo → plástico + gas natural.' });
B('electrolyzer', { n: 'Electrolizador', cat: 5, machine: 'electro', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 60, cap: 600 }, fl: { tanks: { w: 2000, h: 2000 }, in: { w: ['water'] }, out: ['h'] }, tier: 4, d: 'Agua → hidrógeno.' });
B('drain', { n: 'Sumidero', cat: 5, fl: { tanks: {}, drain: 1 }, tier: 3, d: 'Elimina el fluido sobrante.' });
B('levelSensor', { n: 'Sensor de nivel', cat: 5, dir: 1, emit: 1, tier: 3, d: 'Emite redstone según lo lleno que esté el tanque de delante.' });

// ---------- Lógica ----------
B('lever', { n: 'Palanca', cat: 6, emit: 1, d: 'F: encender o apagar.' });
B('button', { n: 'Botón', cat: 6, emit: 1, d: 'F: pulso de 1 segundo.' });
B('plate', { n: 'Placa de presión', cat: 6, emit: 1, d: 'Emite mientras estás encima.' });
B('wire', { n: 'Cable de redstone', cat: 6, logic: 1, d: 'Lleva la señal; pierde 1 de fuerza por casilla.' });
B('wirebridge', { n: 'Puente de redstone', cat: 6, logic: 1, tier: 2, d: 'Cruza dos líneas de redstone sin mezclarlas.' });
B('lamp', { n: 'Lámpara', cat: 6, rsin: 1, light: 4, d: 'Se enciende con señal.' });
B('display', { n: 'Pantalla', cat: 6, rsin: 1, tier: 3, d: 'Muestra la fuerza de la señal (0–15).' });
B('inverter', { n: 'Inversor (NO)', cat: 6, dir: 1, emit: 1, tier: 1, d: 'Emite si NO recibe señal por detrás.' });
B('andgate', { n: 'Puerta Y', cat: 6, dir: 1, emit: 1, tier: 2, d: 'Emite si recibe por la izquierda Y por la derecha.' });
B('orgate', { n: 'Puerta O', cat: 6, dir: 1, emit: 1, tier: 1, d: 'Emite si recibe por la izquierda, la derecha o detrás.' });
B('xorgate', { n: 'Puerta O exclusiva', cat: 6, dir: 1, emit: 1, tier: 2, d: 'Emite si solo un lado (izq./der.) tiene señal.' });
B('repeater', { n: 'Repetidor', cat: 6, dir: 1, emit: 1, cfg: ['delay'], tier: 1, d: 'Repite la señal de detrás a fuerza 15 con retardo.' });
B('flipflop', { n: 'Biestable', cat: 6, dir: 1, emit: 1, tier: 2, d: 'Cada pulso por detrás cambia su estado. Los lados lo apagan.' });
B('counter', { n: 'Contador', cat: 6, dir: 1, emit: 1, cfg: ['target'], tier: 2, d: 'Emite un pulso cada N pulsos recibidos. Los lados lo reinician.' });
B('comparator', { n: 'Comparador', cat: 6, dir: 1, emit: 1, cfg: ['mode'], tier: 2, d: 'Compara (o resta) la señal de detrás con la de los lados.' });
B('clock', { n: 'Reloj', cat: 6, emit: 1, cfg: ['period'], tier: 1, d: 'Emite un pulso cada N segundos.' });
B('observer', { n: 'Observador', cat: 6, dir: 1, emit: 1, filter: 1, tier: 2, d: 'Emite si el bloque de delante tiene objetos (del filtro).' });
B('stockpile', { n: 'Interruptor de reservas', cat: 6, dir: 1, emit: 1, cfg: ['th'], tier: 2, d: 'Emite si el contenedor de delante supera el umbral.' });
B('transmitter', { n: 'Emisor inalámbrico', cat: 6, rsin: 1, cfg: ['freq'], tier: 3, d: 'Envía su señal a todos los receptores del mismo canal.' });
B('receiver', { n: 'Receptor inalámbrico', cat: 6, emit: 1, cfg: ['freq'], tier: 3, d: 'Emite la señal de su canal.' });
B('daysensor', { n: 'Sensor de luz', cat: 6, emit: 1, cfg: ['invert'], tier: 3, d: 'Emite según la luz del día (o al revés).' });

// ---------- Biomas ----------
B('trap', { n: 'Trampa', cat: 3, inv: 1, d: 'Los animales que la pisan quedan atrapados. Saca el botín con un embudo o un brazo.' });
B('beehive', { n: 'Colmena', cat: 2, inv: 1, d: 'Produce panal según las flores que tenga alrededor (radio 4).' });
B('digester', { n: 'Biodigestor', cat: 5, machine: 'digest', dir: 1, inv: 1, rsable: 1, fl: { tanks: { g: 4000 }, out: ['g'] }, tier: 3, d: 'Materia orgánica (bayas, setas, algas, carne…) → gas natural.' });
B('geotherm', { n: 'Generador geotérmico', cat: 4, pw: { role: 'gen', rate: 240, cap: 2400 }, place: 'lava', light: 2, tier: 3, d: 'Junto a la lava: 240 FE/s sin combustible.' });
B('core', { n: 'Núcleo', cat: -1, d: 'Recibe objetos: los del objetivo cuentan y el resto va a tu inventario.' });

// Bloques también son ítems
for (const id in BD) if (BD[id].cat >= 0) ITEMS[id] = { n: BD[id].n, block: 1, cat: 4, d: BD[id].d };
const ITEM_ORDER = Object.keys(ITEMS);
const ORDER_IDX = {}; ITEM_ORDER.forEach((k, i) => ORDER_IDX[k] = i);
// Tipos que dibujan conexiones de redstone
const LOGIC_LINK = new Set(Object.keys(BD).filter(k => BD[k].emit || BD[k].rsin || BD[k].logic || BD[k].rsable));

function blockStats(id) {
  const d = BD[id], o = [];
  if (!d) return o;
  if (d.gen) o.push(`Genera ${d.gen.rpm} RPM · ${d.gen.cap} SU`);
  if (d.impact) o.push(`Impacto: ${d.impact} SU por RPM`);
  if (d.pw) {
    if (d.pw.role === 'use') o.push(`Consume ${d.pw.rate} FE/s`);
    if (d.pw.role === 'gen') o.push(id === 'dynamo' ? 'Produce 2 FE/s por RPM' : `Produce hasta ${d.pw.rate} FE/s`);
    if (d.pw.role === 'store') o.push(`Capacidad ${fmt(d.pw.cap)} FE · ${fmt(d.pw.rate)} FE/s`);
  }
  if (d.cable) o.push(`Capacidad ${fmt(d.cable.cap)} FE/s`);
  if (d.fl && d.fl.store) o.push(`Capacidad ${fmt(d.fl.tanks.m)} mB`);
  if (d.slots) o.push(`${d.slots} ranuras`);
  if (d.dir) o.push('Orientable (R)');
  if (d.cfg) o.push('Ajustable con T: ' + d.cfg.map(p => PARAMS[p].n.toLowerCase()).join(', '));
  if (d.filter) o.push('Admite filtro');
  if (d.sides) o.push('Caras configurables');
  if (d.rsable) o.push('Control por redstone');
  return o;
}
