'use strict';
// =====================================================================================
//  Expansión: componentes, química, electrónica, textiles, esencias, objetos de uso,
//  máquinas reales y extrañas. Todo encadenado: casi cada objeto es ingrediente de otro.
//  En las recetas, "@material.forma" se traduce al objeto de esa forma (ver materials.js).
// =====================================================================================
const mf = s => { if (s[0] !== '@') return s; const [m, f] = s.slice(1).split('.'); return MF[m][f]; };
const teethOf = s => s ? s.split(',').map(p => { const [id, c] = p.split('*'); return mf(id) + (c ? '*' + c : ''); }).join(',') : '';
function RB(out, n, core, teeth, rpm = 0, tier, cat) { return R2(mf(out), n, mf(core), teethOf(teeth), rpm, tier, cat); }
function RM(machine, ins, outs, t = 2, fin, fout) {
  const r = { in: {}, out: {}, t }; for (const k in ins) r.in[mf(k)] = ins[k]; for (const k in outs) r.out[mf(k)] = outs[k];
  if (fin) r.fin = fin; if (fout) r.fout = fout; addRec(machine, r);
}
function IT(id, n, c, s, cat, d) { ITEMS[id] = { n, c, s, cat, d }; }

// ---------- Fluidos nuevos ----------
Object.assign(FLUIDS, { nitricAcid: { n: 'Ácido nítrico', c: '#f0e8a0' }, ethanol: { n: 'Etanol', c: '#e8f0ff' }, nitrogen: { n: 'Nitrógeno líquido', c: '#c8f0ff' }, plasma: { n: 'Plasma', c: '#ff5af0', gas: true }, lubricantF: { n: 'Aceite lubricante', c: '#c8a040' } });
LIQUIDS.push('nitricAcid', 'ethanol', 'nitrogen', 'lubricantF'); GASES.push('plasma');

// ---------- Piezas mecánicas ----------
IT('bearing', 'Rodamiento', '#c8ccd0', 'ring', 5, 'Ejes que giran sin rozamiento. Base de motores y máquinas rápidas.');
IT('piston', 'Pistón', '#a9afb6', 'lrod', 5, 'Movimiento lineal para prensas y cilindros.');
IT('crankshaft', 'Cigüeñal', '#7f8a96', 'lrod', 5, 'Convierte empuje en rotación.');
IT('chain', 'Cadena', '#9aa0a8', 'ring', 5, 'Transmite fuerza a distancia.');
IT('gasket', 'Junta de goma', '#2d2d2d', 'ring', 5, 'Sella tuberías y cilindros.');
IT('hydraulicCylinder', 'Cilindro hidráulico', '#b8c4cc', 'lrod', 5, 'Fuerza enorme con aceite a presión.');
IT('heatsink', 'Disipador', '#dfe6ec', 'chip', 5, 'Enfría la electrónica de potencia.');
IT('fanBlade', 'Ventilador', '#c8d0d8', 'cog', 5, 'Mueve aire: refrigeración y secado.');
IT('turbineBlade', 'Álabe de turbina', '#9aa6b8', 'sheet', 5, 'Resiste vapor a alta presión.');
IT('propeller', 'Hélice', '#c8843a', 'cog', 5, 'Impulsa fluidos.');
IT('frame', 'Bastidor de acero', '#7f8a96', 'block', 5, 'Estructura de toda máquina pesada.');
IT('casing', 'Carcasa mecánica', '#8a8f94', 'block', 5, 'Bastidor cerrado y protegido.');
IT('rotor', 'Rotor', '#a8b0a0', 'cog', 5, 'El corazón giratorio de motores y bombas.');
IT('gearTrain', 'Tren de engranajes', '#c8843a', 'cog', 5, 'Reduce o multiplica velocidad con precisión.');
RB('bearing', 2, '@steel.ring', '@iron.nugget*4');
RB('piston', 1, '@iron.longRod', '@iron.plate*2,@iron.spring');
RB('crankshaft', 1, '@steel.longRod', '@steel.gear*2,bearing');
RB('chain', 4, '@iron.ring', '@iron.ring*5');
RM('cutter', { rubber: 1 }, { gasket: 4 }, 1);
RB('hydraulicCylinder', 1, 'piston', 'gasket*2,@stainless.doublePlate,@steel.bolt*2', 16);
RB('heatsink', 1, '@aluminum.plate', '@copper.foil*4');
RB('fanBlade', 1, 'rotor', '@aluminum.plate*3');
RB('turbineBlade', 2, '@titanium.doublePlate', '@titanium.rod');
RB('propeller', 1, '@bronze.ring', '@bronze.plate*3');
RB('frame', 1, '@steel.longRod', '@steel.longRod*3,@steel.bolt*2');
RB('casing', 1, 'frame', '@iron.plate*4');
RB('rotor', 1, '@steel.rod', '@steel.plate*2,bearing');
RB('gearTrain', 1, '@brass.gear', '@brass.smallGear*3,@iron.rod');

// ---------- Electricidad y electrónica ----------
IT('magnet', 'Imán', '#c84a4a', 'ingot', 7, 'Varilla de hierro magnetizada (polarizador).');
IT('electromagnet', 'Electroimán', '#d86a3a', 'coil', 7, 'Imán que se activa con corriente.');
IT('lvMotor', 'Motor eléctrico BT', '#5a8ac8', 'cell', 7, 'Motor de baja tensión.');
IT('mvMotor', 'Motor eléctrico MT', '#4a6ab8', 'cell', 7, 'Motor de media tensión.');
IT('hvMotor', 'Motor eléctrico AT', '#3a4aa8', 'cell', 7, 'Motor de alta tensión.');
IT('transformerCore', 'Núcleo de transformador', '#8a8a96', 'block', 7, 'Cambia el voltaje.');
IT('relayItem', 'Relé', '#4a5a6a', 'chip', 7, 'Interruptor controlado por corriente.');
IT('resistor', 'Resistencia', '#c8a070', 'rod', 7, 'Limita la corriente.');
IT('capacitorItem', 'Condensador cerámico', '#4a7ac8', 'cell', 7, 'Guarda carga un instante.');
IT('inductor', 'Inductor', '#d9733a', 'ring', 7, 'Bobina que suaviza la corriente.');
IT('siliconWafer', 'Oblea de silicio', '#7a8696', 'foil', 7, 'Base de los chips.');
IT('dopedWafer', 'Oblea dopada', '#5a6a8a', 'foil', 7, 'Oblea tratada con ácido nítrico.');
IT('transistor', 'Transistor', '#2a2a2a', 'chip', 7, 'El interruptor más pequeño.');
IT('diodeItem', 'Diodo LED', '#ff5a5a', 'gem', 7, 'Luz y paso de corriente en un sentido.');
IT('circuitBoard', 'Placa base', '#2f8a4c', 'sheet', 7, 'Plástico y cobre laminado.');
IT('goodCircuit', 'Circuito mejorado', '#3aa05a', 'chip', 7, 'Segundo nivel de circuitos.');
IT('advancedCircuit', 'Circuito avanzado', '#3a7ac8', 'chip', 7, 'Tercer nivel de circuitos.');
IT('eliteCircuit', 'Circuito de élite', '#a03ac8', 'chip', 7, 'Cuarto nivel de circuitos.');
IT('quantumCircuit', 'Circuito cuántico', '#ff5af0', 'chip', 8, 'El circuito definitivo.');
IT('logicChip', 'Chip lógico', '#1a3d25', 'chip', 7, 'Puertas lógicas grabadas.');
IT('ramChip', 'Memoria RAM', '#1a2a4a', 'chip', 7, 'Guarda datos.');
IT('processor', 'Procesador', '#c8c8d8', 'chip', 7, 'Cerebro de las máquinas inteligentes.');
IT('oscillator', 'Cristal oscilador', '#f4eee4', 'gem', 7, 'Cuarzo que vibra a ritmo fijo: relojes precisos.');
IT('solarCell', 'Célula solar', '#1f3550', 'foil', 7, 'Convierte luz en electricidad.');
IT('lens', 'Lente', '#d8f0ff', 'gem', 7, 'Vidrio pulido.');
IT('prism', 'Prisma', '#e0d0ff', 'gem', 7, 'Separa la luz.');
IT('laserDiode', 'Diodo láser', '#ff3a3a', 'gem', 7, 'Luz concentrada.');
IT('photonCell', 'Celda fotónica', '#ffe0ff', 'cell', 8, 'Guarda luz pura.');
IT('lithiumCell', 'Celda de litio', '#f0d0e0', 'cell', 7, 'Batería recargable de alta densidad.');
IT('superconductor', 'Cable superconductor', '#8ad8ff', 'coil', 7, 'Cero resistencia (enfriado con nitrógeno).');
IT('fuelRod', 'Barra de combustible', '#7ae05a', 'lrod', 7, 'Uranio para el reactor de fisión.');
IT('depletedRod', 'Barra agotada', '#4a6a3a', 'lrod', 7, 'Se recicla en la centrífuga.');
IT('sensorItem', 'Sensor', '#5a6a7a', 'chip', 7, 'Detecta objetos, luz y movimiento.');
IT('emitterItem', 'Emisor', '#7a5a6a', 'chip', 7, 'Envía señales y energía sin cables.');
IT('robotArmItem', 'Brazo robótico', '#e0b54c', 'lrod', 7, 'Pieza para máquinas automáticas.');
IT('conveyorModule', 'Módulo transportador', '#46484c', 'sheet', 7, 'Cinta motorizada en miniatura.');
IT('pumpModule', 'Módulo de bombeo', '#4f6a7a', 'cog', 7, 'Bomba eléctrica en miniatura.');
IT('servo', 'Servomotor', '#4a5a8a', 'cell', 7, 'Motor de posición exacta.');
IT('battery2', 'Paquete de baterías', '#5fb3e0', 'block', 7, 'Varias celdas de litio en serie.');
RM('polarizer', { '@iron.rod': 1 }, { magnet: 1 }, 2);
RB('electromagnet', 1, 'magnet', 'coil*3');
RB('lvMotor', 1, '@iron.rod', 'coil*2,@iron.plate*2,magnet', 16, 2);
RB('mvMotor', 1, '@steel.rod', '@aluminum.wire*2,@steel.plate*2,bearing,magnet', 32, 5);
RB('hvMotor', 1, '@titanium.rod', 'superconductor*2,@titanium.plate*2,bearing*2', 64, 6);
RB('transformerCore', 1, '@iron.doublePlate', 'coil*4');
RB('relayItem', 2, 'electromagnet', '@copper.spring,@iron.plate');
RM('blast', { coal: 3 }, { graphite: 1 }, 3);
RB('resistor', 4, 'graphite', 'coil');
RB('capacitorItem', 4, 'ceramic', '@aluminum.foil*2');
RB('inductor', 2, '@iron.ring', 'coil*2');
RM('cutter', { silicon: 1 }, { siliconWafer: 2 }, 1.5);
RM('chemReactor', { siliconWafer: 1 }, { dopedWafer: 1 }, 2, { nitricAcid: 20 });
RB('transistor', 4, 'dopedWafer', '@gold.wire,plastic');
RB('diodeItem', 4, 'siliconWafer', 'glass,@copper.foil');
RM('press', { plastic: 1, '@copper.foil': 2 }, { circuitBoard: 1 }, 2);
RM('circuitFab', { circuitBoard: 1, transistor: 2, resistor: 2, '@solder.wire': 1 }, { goodCircuit: 1 }, 3);
RM('circuitFab', { circuitBoard: 1, processor: 1, capacitorItem: 2, '@gold.wire': 2 }, { advancedCircuit: 1 }, 4);
RM('circuitFab', { advancedCircuit: 2, ramChip: 2, '@platinum.foil': 2 }, { eliteCircuit: 1 }, 5);
RM('circuitFab', { eliteCircuit: 2, quantumDot: 2, '@aetherium.foil': 1 }, { quantumCircuit: 1 }, 6);
RM('laserEngraver', { dopedWafer: 1 }, { logicChip: 4 }, 2);
RM('laserEngraver', { dopedWafer: 1, '@gold.foil': 1 }, { ramChip: 2 }, 3);
RM('laserEngraver', { dopedWafer: 2, '@gold.wire': 2, logicChip: 2 }, { processor: 1 }, 4);
RM('cutter', { quartz: 1 }, { oscillator: 2 }, 1);
RB('solarCell', 2, 'siliconWafer', 'glass,@silver.foil');
RM('lathe', { glass: 1 }, { lens: 1 }, 1.5);
RM('lathe', { crystal: 1 }, { prism: 1 }, 2);
RB('laserDiode', 1, 'diodeItem', 'lens,@gold.wire');
RB('photonCell', 1, 'prism', 'laserDiode,@etherium.foil*2', 64, 7);
RB('lithiumCell', 2, '@lithium.plate', '@cobalt.foil,plastic,electrolyte', 32, 5);
RM('cryoChamber', { '@electrum.wire': 2 }, { superconductor: 2 }, 3, { nitrogen: 50 });
RB('fuelRod', 1, '@stainless.longRod', '@uranium.nugget*4', 32, 6);
RM('centrifuge', { depletedRod: 1 }, { '@lead.dust': 2, '@uranium.nugget': 1, '@stainless.rod': 1 }, 4);
RB('sensorItem', 1, 'circuit', 'lens,coil');
RB('emitterItem', 1, 'circuit', 'laserDiode,coil');
RB('robotArmItem', 1, 'mvMotor', '@steel.longRod,@steel.gear,sensorItem', 32, 5);
RB('conveyorModule', 1, 'lvMotor', 'rubber*2,@steel.plate');
RB('pumpModule', 1, 'lvMotor', 'propeller,pipe*2');
RB('servo', 1, 'lvMotor', 'gearTrain,sensorItem');
RB('battery2', 1, 'lithiumCell', 'lithiumCell*3,@copper.foil*2', 16, 5);

// ---------- Química ----------
IT('graphite', 'Grafito', '#3a3a3e', 'rock', 6, 'Carbón cristalizado en el alto horno.');
IT('carbonFiber', 'Fibra de carbono', '#1e1e22', 'sheet', 6, 'Ligera y más dura que el acero.');
IT('graphene', 'Grafeno', '#4a4a5a', 'foil', 6, 'Una capa de átomos de carbono.');
IT('gunpowder', 'Pólvora', '#4a4a4a', 'dust', 6, 'Salitre, azufre y carbón.');
IT('fertilizer', 'Fertilizante', '#8a7a4a', 'dust', 6, 'Hace crecer los cultivos más rápido.');
IT('cement', 'Cemento', '#a8a8a0', 'dust', 6, 'Arcilla, ceniza y arena.');
IT('concrete', 'Hormigón', '#9a9a94', 'block', 6, 'Cemento y grava.');
IT('pvc', 'PVC', '#e8eef2', 'sheet', 6, 'Plástico con cloro de la sal.');
IT('ptfe', 'Teflón', '#f4f4f4', 'sheet', 6, 'Plástico que nada corroe.');
IT('epoxy', 'Resina epoxi', '#e8c870', 'drop', 6, 'Pegamento estructural.');
IT('lubricant', 'Lubricante', '#c8a040', 'drop', 6, 'Reduce el desgaste (catalizador en el banco).');
IT('electrolyte', 'Electrolito', '#b0e0f0', 'drop', 6, 'Para celdas de litio.');
IT('ceramic', 'Cerámica', '#e8e0d0', 'sheet', 6, 'Arcilla y cuarzo cocidos.');
IT('glassFiber', 'Fibra de vidrio', '#d8f0ff', 'rod', 6, 'Transmite luz.');
IT('bioplastic', 'Bioplástico', '#c8e0a0', 'sheet', 6, 'Plástico de cactus y hierbas.');
IT('paper', 'Papel', '#f4f0e4', 'sheet', 6, 'Bambú prensado.');
IT('dye', 'Tinte', '#c84a8a', 'dust', 6, 'Pétalos molidos.');
IT('salve', 'Ungüento', '#a8d870', 'drop', 6, 'Hierbas y resina.');
RM('mixer', { saltpeter: 2, sulfur: 1, coal: 1 }, { gunpowder: 4 }, 2);
RM('mixer', { saltpeter: 1, ash: 1 }, { fertilizer: 2 }, 1.5);
RM('mixer', { bone: 1, mud: 1 }, { fertilizer: 2 }, 1.5);
RM('mixer', { clay: 1, ash: 1, sand: 1 }, { cement: 3 }, 2);
RM('mixer', { cement: 1, gravel: 2 }, { concrete: 3 }, 2);
RM('chemReactor', { graphite: 2, resin: 1 }, { carbonFiber: 1 }, 3);
RM('laserEngraver', { graphite: 1 }, { graphene: 1 }, 3);
RM('chemReactor', { plastic: 1, salt: 1 }, { pvc: 2 }, 2);
RM('chemReactor', { plastic: 2 }, { ptfe: 1 }, 3, { acid: 30 });
RM('chemReactor', { resin: 2, plastic: 1 }, { epoxy: 2 }, 2);
RM('chemReactor', {}, { lubricant: 2 }, 2, { oil: 40 });
RM('chemReactor', { '@lithium.dust': 1, salt: 1 }, { electrolyte: 2 }, 2, { water: 40 });
RM('chemReactor', { saltpeter: 2 }, {}, 2, { water: 40 }, { nitricAcid: 40 });
RM('chemReactor', { sulfur: 1 }, {}, 2, { water: 40 }, { acid: 40 });
RM('chemReactor', { berries: 2 }, {}, 2, { water: 20 }, { ethanol: 40 });
RM('chemReactor', { cactus: 2, herbs: 1 }, { bioplastic: 2 }, 2);
RM('chemReactor', {}, { lubricant: 1 }, 2, { lubricantF: 50 });
RM('furnace', { clay: 2, quartz: 1 }, { ceramic: 2 }, 3);
RM('extruder', { glass: 1 }, { glassFiber: 4 }, 1.5);
RM('extruder', { plastic: 1 }, { pipe: 2 }, 1);
RM('extruder', { bioplastic: 2 }, { plastic: 1 }, 1);
RM('press', { bamboo: 2 }, { paper: 3 }, 1);
RM('pulverizer', { petals: 2 }, { dye: 1 }, 1);
RM('mixer', { herbs: 2, resin: 1 }, { salve: 2 }, 1.5);
RM('pulverizer', { coal: 2 }, { graphite: 1 }, 2);

// ---------- Textiles ----------
IT('thread', 'Hilo', '#f4f0e8', 'coil', 6, 'De algodón, lana o seda.');
IT('cloth', 'Tela', '#e8e0d0', 'sheet', 6, 'Hilo tejido.');
IT('leather', 'Cuero curtido', '#8a5a2a', 'sheet', 6, 'Cuero tratado en la curtiduría.');
IT('rope', 'Cuerda', '#c8a870', 'coil', 6, 'Juncos o hilo trenzado.');
IT('filter', 'Filtro', '#d8d8c8', 'sheet', 6, 'Tela tensada en un aro.');
IT('sail', 'Vela de molino', '#f0ead8', 'sheet', 6, 'Hace girar los molinos de viento.');
IT('insulation', 'Aislante', '#f0e0a0', 'block', 6, 'Lana y fibra de vidrio.');
RM('loom', { cotton: 2 }, { thread: 3 }, 1);
RM('loom', { wool: 1 }, { thread: 2 }, 1);
RM('loom', { silk: 1 }, { thread: 4 }, 1);
RM('loom', { thread: 4 }, { cloth: 1 }, 1.5);
RM('loom', { reeds: 3 }, { rope: 1 }, 1);
RM('loom', { thread: 3 }, { rope: 2 }, 1);
RM('tanner', { hide: 1, salt: 1 }, { leather: 2 }, 3);
RM('tanner', { hide: 1 }, { leather: 1 }, 4);
RM('tanner', { fur: 1 }, { leather: 1, wool: 1 }, 3);
RM('tanner', { scales: 2 }, { leather: 1 }, 3);
RB('filter', 2, '@iron.ring', 'cloth');
RB('sail', 1, 'cloth', 'cloth*3,rope');
RB('insulation', 2, 'wool', 'glassFiber*2');

// ---------- Esencias y exótico ----------
IT('essenceLife', 'Esencia de vida', '#7ae05a', 'drop', 8, 'Destilada de hierbas y bayas.');
IT('essenceFire', 'Esencia de fuego', '#ff6a1a', 'drop', 8, 'Azufre y lava destilados.');
IT('essenceFrost', 'Esencia de escarcha', '#8ad8ff', 'drop', 8, 'Hielo destilado.');
IT('essenceVoid', 'Esencia del vacío', '#3a2a5a', 'drop', 8, 'Obsidiana y tinta de calamar.');
IT('essenceMind', 'Esencia mental', '#e0a0ff', 'drop', 8, 'Setas luminosas y cristal.');
IT('essenceStorm', 'Esencia de tormenta', '#f0f05a', 'drop', 8, 'Plumas cargadas de redstone.');
IT('resonantCrystal', 'Cristal resonante', '#c8a8ff', 'gem', 8, 'Cristal que vibra a 128 RPM.');
IT('timeCrystal', 'Cristal del tiempo', '#ffe0ff', 'gem', 8, 'Late fuera del tiempo normal.');
IT('antimatter', 'Antimateria', '#ff5af0', 'cell', 8, 'Fruto del colisionador de partículas.');
IT('plasmaCell', 'Celda de plasma', '#ff8af8', 'cell', 8, 'Plasma confinado.');
IT('quantumDot', 'Punto cuántico', '#5af0ff', 'gem', 8, 'Un átomo artificial.');
IT('condensedMatter', 'Materia condensada', '#4a3a6a', 'block', 8, 'Polvo comprimido hasta lo imposible.');
IT('singularity', 'Singularidad', '#0a0a14', 'gem', 8, 'Un agujero negro de bolsillo.');
IT('gravitonCoil', 'Bobina de gravitones', '#6a4ac8', 'coil', 8, 'Dobla la gravedad.');
IT('voidCore', 'Núcleo del vacío', '#2a1a4a', 'block', 8, 'Energía del vacío estabilizada.');
IT('chronoCore', 'Núcleo crónico', '#e0c8ff', 'block', 8, 'Acelera el tiempo a su alrededor.');
IT('kineticCore', 'Núcleo cinético', '#ffd84a', 'block', 8, 'Guarda rotación pura.');
IT('aetherLens', 'Lente etérea', '#f0e8ff', 'gem', 8, 'Ve lo invisible.');
const ESS = { essenceLife: [['herbs', 3], ['berries', 2]], essenceFire: [['sulfur', 2], ['ash', 2]], essenceFrost: [['ice', 4]], essenceVoid: [['obsidian', 2], ['ink', 1]], essenceMind: [['glowcap', 2], ['crystal', 1]], essenceStorm: [['feather', 3], ['redstone', 2]] };
for (const e in ESS) RM('distiller', Object.fromEntries(ESS[e]), { [e]: 1 }, 3, e === 'essenceFire' ? { lava: 50 } : null);
RM('crystalResonator', { crystal: 1 }, { resonantCrystal: 1 }, 3);
RM('chronoForge', { resonantCrystal: 1, essenceMind: 1, '@platinum.dust': 1 }, { timeCrystal: 1 }, 6);
RM('collider', {}, { antimatter: 1 }, 10, { hydrogen: 400 });
RM('plasmaFuser', { '@stainless.doublePlate': 1 }, { plasmaCell: 1 }, 4, { plasma: 100 });
RM('plasmaFuser', {}, {}, 2, { hydrogen: 100 }, { plasma: 40 });
RM('laserEngraver', { graphene: 1, essenceMind: 1 }, { quantumDot: 4 }, 4);
for (const m of ['iron', 'copper', 'tin', 'lead', 'stone', 'aluminum', 'nickel']) RM('matterCondenser', m === 'stone' ? { stone: 32 } : { ['@' + m + '.dust']: 12 }, { condensedMatter: 1 }, 5);
RM('matterCondenser', { condensedMatter: 9 }, { singularity: 1 }, 10);
RB('gravitonCoil', 1, 'singularity', 'superconductor*4,@voidsteel.ring', 64, 7);
RB('voidCore', 1, 'essenceVoid', '@voidsteel.plate*4,antimatter', 64, 7);
RB('chronoCore', 1, 'timeCrystal', '@chronium.gear*2,processor,@kinetite.spring*2', 64, 7);
RB('kineticCore', 1, '@kinetite.gear', 'bearing*2,@kinetite.spring*2', 64, 6);
RB('aetherLens', 1, 'prism', '@aetherium.foil*2,@etherium.ring', 64, 7);
// Aleaciones exóticas (forja arcana)
RM('arcaneForge', { goldIngot: 2, copperIngot: 2, crystal: 1 }, { '@orichalcum.ingot': 2 }, 4);
RM('arcaneForge', { '@silver.ingot': 2, crystal: 2, glowcap: 1 }, { '@etherium.ingot': 2 }, 4);
RM('arcaneForge', { steel: 2, obsidian: 2, essenceVoid: 1 }, { '@voidsteel.ingot': 2 }, 5);
RM('arcaneForge', { brass: 2, redstone: 2, resonantCrystal: 1 }, { '@kinetite.ingot': 2 }, 4);
RM('arcaneForge', { '@silver.ingot': 1, glowcap: 2, glass: 1 }, { '@luminite.ingot': 1 }, 3);
RM('arcaneForge', { '@platinum.ingot': 1, crystal: 2, feather: 2 }, { '@aetherium.ingot': 1 }, 4);
RM('arcaneForge', { '@cobalt.ingot': 2, ice: 4, essenceFrost: 1 }, { '@cryonite.ingot': 2 }, 4);
RM('arcaneForge', { '@tungsten.ingot': 1, sulfur: 2, essenceFire: 1 }, { '@ignitite.ingot': 1 }, 4, { lava: 100 });
RM('arcaneForge', { '@platinum.ingot': 2, timeCrystal: 1 }, { '@chronium.ingot': 2 }, 6);
// Transmutación de polvos (círculo de metales)
const CYCLE = ['iron', 'copper', 'tin', 'lead', 'silver', 'gold', 'platinum'];
CYCLE.forEach((m, i) => RM('transmuter', { ['@' + m + '.dust']: 4 }, { ['@' + CYCLE[(i + 1) % CYCLE.length] + '.dust']: 1 }, 4));
// Cultivos
RM('grower', { herbs: 1, fertilizer: 1 }, { herbs: 4 }, 6, { water: 40 });
RM('grower', { berries: 1, fertilizer: 1 }, { berries: 4 }, 6, { water: 40 });
RM('grower', { cotton: 1, fertilizer: 1 }, { cotton: 4 }, 6, { water: 40 });
RM('grower', { mushroom: 1, fertilizer: 1 }, { mushroom: 3 }, 6, { water: 20 });
RM('grower', { bamboo: 1 }, { bamboo: 3 }, 5, { water: 40 });
RM('grower', { cactus: 1 }, { cactus: 2 }, 6, { water: 10 });
RM('grower', { log: 1, fertilizer: 1 }, { log: 4 }, 8, { water: 60 });
RM('grower', { glowcap: 1, fertilizer: 1 }, { glowcap: 2 }, 8, { water: 20 });

// ---------- Objetos de uso ----------
IT('lantern', 'Farol', '#ffd84a', 'cell', 9, 'Llévalo en la mano: ilumina mucho de noche.');
IT('speedBoots', 'Botas rápidas', '#8a5a2a', 'sheet', 9, 'Llevarlas en el inventario te hace correr un 50 % más.');
IT('prospector', 'Prospector de menas', '#c8c8d8', 'chip', 9, 'En la mano: marca las menas en 16 casillas a la redonda.');
IT('wrench', 'Llave inglesa', '#7f8a96', 'rod', 9, 'En la mano: clic gira el bloque · Shift+clic lo recoge.');
IT('compass', 'Brújula del núcleo', '#e0b54c', 'gem', 9, 'En la mano: flecha hacia el Núcleo y distancia.');
IT('spyglass', 'Catalejo', '#c8843a', 'lrod', 9, 'En la mano: permite alejar mucho más la cámara.');
IT('biomeScanner', 'Escáner de biomas', '#5af0ff', 'chip', 9, 'En la mano: muestra el bioma y su clima bajo el cursor, incluso lejos.');
RB('lantern', 1, 'glass', '@iron.ring,glowcap');
RB('speedBoots', 1, 'leather', 'leather,@kinetite.spring*2', 16, 6);
RB('prospector', 1, 'circuit', 'coil,magnet,lens', 16, 3);
RB('wrench', 1, '@steel.rod', '@steel.plate,@steel.bolt');
RB('compass', 1, 'magnet', 'glass,@iron.plate');
RB('spyglass', 1, '@brass.longRod', 'lens*2');
RB('biomeScanner', 1, 'sensorItem', 'aetherLens,@electrum.wire', 32, 7);

// ---------- Bloques nuevos ----------
// look: aspecto genérico { c: color, g: símbolo, a: animación }
const XB = (id, o) => { BD[id] = o; };
XB('orewasher', { n: 'Lavadora de menas', cat: 2, machine: 'orewasher', kin: 'all', dir: 1, impact: 4, inv: 1, rsable: 1, fl: { tanks: { w: 2000 }, in: { w: ['water'] } }, tier: 2, d: 'Triturado + agua → mena lavada (1 lingote + 3 pepitas).', look: { c: '#3f6a8a', g: '≈', a: 'spin' } });
XB('pulverizer', { n: 'Pulverizador', cat: 2, machine: 'pulverizer', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 60, cap: 600 }, tier: 3, d: 'Lingotes y láminas → polvo. Menas → triturado + polvo extra.', look: { c: '#6a5a4a', g: '✱', a: 'spin' } });
XB('rolling', { n: 'Laminadora', cat: 2, machine: 'rolling', kin: 'all', dir: 1, impact: 6, inv: 1, rsable: 1, tier: 2, d: 'Lámina → 4 papeles metálicos.', look: { c: '#5a6a72', g: '═', a: 'spin' } });
XB('bender', { n: 'Dobladora', cat: 2, machine: 'bender', kin: 'all', dir: 1, impact: 6, inv: 1, rsable: 1, tier: 2, d: 'Láminas dobles, anillos y muelles.', look: { c: '#6a5a72', g: '∩', a: 'press' } });
XB('cutter', { n: 'Cortadora', cat: 2, machine: 'cutter', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 40, cap: 400 }, tier: 2, d: 'Pernos, engranajes pequeños, obleas, juntas, osciladores.', look: { c: '#7a4a4a', g: '✂', a: 'spin' } });
XB('gearpress', { n: 'Prensa de engranajes', cat: 2, machine: 'gearpress', kin: 'all', dir: 1, impact: 8, inv: 1, rsable: 1, tier: 2, d: '4 láminas → engranaje de cualquier metal.', look: { c: '#8a6b45', g: '⚙', a: 'press' } });
XB('welder', { n: 'Soldadora', cat: 2, machine: 'welder', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 80, cap: 800 }, light: 2, tier: 3, d: '2 varillas → varilla larga.', look: { c: '#4a4a5a', g: '⚡', a: 'glow' } });
XB('compactor', { n: 'Compactadora', cat: 2, machine: 'compactor', kin: 'all', dir: 1, impact: 10, inv: 1, rsable: 1, tier: 2, d: '9 pepitas → lingote · 9 lingotes → bloque.', look: { c: '#5a5e66', g: '▣', a: 'press' } });
XB('alloySmelter', { n: 'Horno de aleación', cat: 2, machine: 'alloy', dir: 1, inv: 1, rsable: 1, burn: 1, fuel: ['coal', 'log', 'planks', 'peat', 'coconut', 'stick', 'bamboo', 'resin'], light: 2, tier: 2, d: 'Bronce, invar, electro, constantán… (gasta combustible). El polvo rinde más.', look: { c: '#8a4a2a', g: '⚗', a: 'glow' } });
XB('centrifuge', { n: 'Centrífuga', cat: 2, machine: 'centrifuge', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 100, cap: 1000 }, tier: 5, d: 'Separa mezclas y recicla barras agotadas.', look: { c: '#5a6a5a', g: '◎', a: 'spin' } });
XB('chemReactor', { n: 'Reactor químico', cat: 5, machine: 'chemReactor', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 120, cap: 1200 }, fl: { tanks: { a: 4000, b: 4000 }, in: { a: ['water', 'oil', 'acid', 'nitricAcid', 'lubricantF'] }, out: ['b'] }, tier: 4, d: 'Ácidos, plásticos, electrolito, lubricante, etanol, fibra de carbono…', look: { c: '#4a7a5a', g: '⚛', a: 'pulse' } });
XB('circuitFab', { n: 'Fábrica de circuitos', cat: 2, machine: 'circuitFab', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 100, cap: 1000 }, tier: 5, d: 'Circuitos mejorados, avanzados, de élite y cuánticos.', look: { c: '#2f6a4c', g: '⌁', a: 'pulse' } });
XB('laserEngraver', { n: 'Grabador láser', cat: 2, machine: 'laserEngraver', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 200, cap: 2000 }, light: 2, tier: 5, d: 'Chips lógicos, RAM, procesadores, grafeno, puntos cuánticos.', look: { c: '#3a3a5a', g: '◈', a: 'glow' } });
XB('extruder', { n: 'Extrusora', cat: 2, machine: 'extruder', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 60, cap: 600 }, tier: 3, d: 'Fibra de vidrio, tuberías de plástico.', look: { c: '#6a6a4a', g: '⇉', a: 'press' } });
XB('loom', { n: 'Telar', cat: 2, machine: 'loom', kin: 'all', dir: 1, impact: 2, inv: 1, rsable: 1, tier: 1, d: 'Hilo, tela y cuerda.', look: { c: '#9a7a4a', g: '#', a: 'spin' } });
XB('tanner', { n: 'Curtiduría', cat: 2, machine: 'tanner', dir: 1, inv: 1, rsable: 1, tier: 1, d: 'Cuero, pelaje y escamas → cuero curtido.', look: { c: '#7a5a3a', g: '▤', a: 'pulse' } });
XB('grower', { n: 'Invernadero', cat: 2, machine: 'grower', dir: 1, inv: 1, rsable: 1, fl: { tanks: { w: 2000 }, in: { w: ['water'] } }, light: 1, tier: 2, d: 'Multiplica plantas con agua (y fertilizante).', look: { c: '#3a7a3a', g: '❀', a: 'pulse' } });
XB('polarizer', { n: 'Polarizador', cat: 4, machine: 'polarizer', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 50, cap: 500 }, tier: 2, d: 'Varilla de hierro → imán.', look: { c: '#7a3a3a', g: 'N', a: 'pulse' } });
XB('cryoChamber', { n: 'Cámara criogénica', cat: 5, machine: 'cryoChamber', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 150, cap: 1500 }, fl: { tanks: { n: 4000 }, in: { n: ['nitrogen'] } }, tier: 5, d: 'Superconductores enfriados con nitrógeno líquido.', look: { c: '#4a8aaa', g: '❄', a: 'glow' } });
XB('airSeparator', { n: 'Separador de aire', cat: 5, dir: 1, pw: { role: 'use', rate: 80, cap: 800 }, fl: { tanks: { o: 4000 }, out: ['o'] }, rsable: 1, tier: 5, d: 'Saca nitrógeno líquido del aire con electricidad.', look: { c: '#6a8aaa', g: 'N₂', a: 'spin' } });
XB('distiller', { n: 'Destilador de esencias', cat: 2, machine: 'distiller', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 60, cap: 600 }, fl: { tanks: { l: 2000 }, in: { l: ['lava'] } }, light: 1, tier: 6, d: 'Plantas, minerales y criaturas → esencias.', look: { c: '#6a3a7a', g: '⚱', a: 'pulse' } });
XB('reactor', { n: 'Reactor de fisión', cat: 4, inv: 1, fuel2: ['fuelRod'], fl: { tanks: { w: 8000, s: 8000 }, in: { w: ['water'] }, out: ['s'] }, light: 3, tier: 6, d: 'Barras de uranio: convierte 200 mB/s de agua en vapor. Conéctalo a turbinas.', look: { c: '#3a5a3a', g: '☢', a: 'glow' } });
// Extrañas
XB('crystalResonator', { n: 'Resonador cristalino', cat: 2, machine: 'crystalResonator', kin: 'all', dir: 1, impact: 16, minRpm: 128, inv: 1, rsable: 1, tier: 6, d: 'Necesita ≥128 RPM: cristal → cristal resonante.', look: { c: '#7a5aaa', g: '◇', a: 'spin' } });
XB('arcaneForge', { n: 'Forja arcana', cat: 2, machine: 'arcaneForge', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 300, cap: 3000 }, fl: { tanks: { l: 2000 }, in: { l: ['lava'] } }, light: 3, tier: 6, d: 'Aleaciones exóticas: oricalco, eterio, acero del vacío, cinetita…', look: { c: '#8a3a5a', g: '✦', a: 'glow' } });
XB('matterCondenser', { n: 'Condensador de materia', cat: 2, machine: 'matterCondenser', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 400, cap: 4000 }, tier: 7, d: 'Comprime polvo en materia condensada y esta en singularidades.', look: { c: '#2a2a4a', g: '●', a: 'pulse' } });
XB('collider', { n: 'Colisionador de partículas', cat: 5, machine: 'collider', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 1500, cap: 15000 }, fl: { tanks: { h: 8000 }, in: { h: ['hydrogen'] } }, light: 3, tier: 7, d: 'Hidrógeno + muchísima energía → antimateria.', look: { c: '#5a2a6a', g: '⊛', a: 'spin' } });
XB('plasmaFuser', { n: 'Fusor de plasma', cat: 5, machine: 'plasmaFuser', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 500, cap: 5000 }, fl: { tanks: { h: 4000, p: 4000 }, in: { h: ['hydrogen', 'plasma'] }, out: ['p'] }, light: 3, tier: 7, d: 'Hidrógeno → plasma. Plasma + lámina doble → celda de plasma.', look: { c: '#8a2a8a', g: '✺', a: 'glow' } });
XB('chronoForge', { n: 'Forja crónica', cat: 2, machine: 'chronoForge', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 600, cap: 6000 }, light: 2, tier: 7, d: 'Crea cristales del tiempo.', look: { c: '#6a4a8a', g: '⧗', a: 'spin' } });
XB('transmuter', { n: 'Transmutador', cat: 2, machine: 'transmuter', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 200, cap: 2000 }, light: 2, tier: 6, d: '4 polvos de un metal → 1 del siguiente (hierro→cobre→estaño→plomo→plata→oro→platino→hierro).', look: { c: '#4a6a4a', g: '⟳', a: 'spin' } });
XB('chronoAccel', { n: 'Acelerador crónico', cat: 2, pw: { role: 'use', rate: 300, cap: 3000 }, rsable: 1, light: 2, tier: 7, d: 'Las máquinas de alrededor (8 casillas vecinas) trabajan el doble de rápido.', look: { c: '#c8a8ff', g: '⧖', a: 'spin' } });
XB('gravityWell', { n: 'Pozo gravitatorio', cat: 3, inv: 1, pw: { role: 'use', rate: 60, cap: 600 }, rsable: 1, tier: 7, d: 'Atrae los objetos de las cintas en 5 casillas. Sácalos con un embudo.', look: { c: '#1a1a2a', g: '◉', a: 'pulse' } });
XB('entangler', { n: 'Enlace cuántico', cat: 3, dir: 1, cfg: ['freq'], pw: { role: 'use', rate: 20, cap: 200 }, tier: 7, d: 'Lo que entra por detrás sale al instante por delante de otro enlace del mismo canal. Sin cintas ni distancia.', look: { c: '#2a6a8a', g: '∞', a: 'pulse' } });
XB('voidGen', { n: 'Generador del vacío', cat: 4, inv: 1, fuel2: ['essenceVoid', 'voidCore'], pw: { role: 'gen', rate: 1000, cap: 10000 }, light: 2, tier: 7, d: 'Quema esencia del vacío: 1000 FE/s.', look: { c: '#2a1a3a', g: '◐', a: 'glow' } });
XB('kineticGen', { n: 'Motor de cinetita', cat: 1, kin: 'all', gen: { rpm: 128, cap: 8192 }, inv: 1, fuel2: ['kineticCore'], tier: 7, d: 'Libera un núcleo cinético: 128 RPM y 8192 SU durante 5 minutos.', look: { c: '#8a7a2a', g: '⚙', a: 'spin' } });
// Lógica nueva
XB('adder', { n: 'Sumador', cat: 6, dir: 1, emit: 1, tier: 3, d: 'Emite delante la suma de las señales de detrás e izquierda/derecha (máx. 15).', look: { c: '#8d8f8b', g: '+', a: 'led' } });
XB('latch', { n: 'Memoria analógica', cat: 6, dir: 1, emit: 1, tier: 3, d: 'Recuerda la señal más alta recibida por detrás. Los lados la borran.', look: { c: '#8d8f8b', g: 'M', a: 'led' } });
XB('proximity', { n: 'Detector de jugador', cat: 6, emit: 1, cfg: ['dist'], tier: 2, d: 'Emite si estás a menos de N casillas.', look: { c: '#6a7a8a', g: '☺', a: 'led' } });
XB('faunaSensor', { n: 'Detector de fauna', cat: 6, emit: 1, tier: 2, d: 'Emite tantos puntos de señal como animales haya cerca (6 casillas).', look: { c: '#6a8a6a', g: '🐾', a: 'led' } });
XB('beltCounter', { n: 'Contador de cinta', cat: 6, dir: 1, emit: 1, tier: 2, d: 'Emite según cuántos objetos hay en la cinta de delante (×4).', look: { c: '#6a6a5a', g: '#', a: 'led' } });
XB('randomizer', { n: 'Generador aleatorio', cat: 6, emit: 1, tier: 3, d: 'Emite pulsos al azar (de media uno por segundo).', look: { c: '#8a6a8a', g: '?', a: 'led' } });
XB('sequencer', { n: 'Secuenciador', cat: 6, emit: 1, tier: 3, d: 'Con cada pulso de entrada, cambia la cara por la que emite (N→E→S→O).', look: { c: '#7a7a9a', g: '↻', a: 'led' } });
XB('thermometer', { n: 'Termómetro', cat: 6, emit: 1, tier: 3, d: 'Emite según la temperatura del bioma (0 helado – 15 abrasador).', look: { c: '#9a6a5a', g: '°', a: 'led' } });

// Recetas de los bloques nuevos
RB('orewasher', 1, 'casing', 'propeller,pipe*2,@iron.gear', 16);
RB('pulverizer', 1, 'casing', 'lvMotor,@steel.gear*2,@tungsten.plate', 32);
RB('rolling', 1, 'frame', '@steel.rod*2,bearing*2', 16);
RB('bender', 1, 'frame', 'piston,@iron.gear', 16);
RB('cutter', 1, 'casing', 'lvMotor,@steel.smallGear*2', 16);
RB('gearpress', 1, 'frame', 'piston*2,@iron.gear', 16);
RB('welder', 1, 'casing', 'transformerCore,@copper.wire*2', 16);
RB('compactor', 1, 'frame', 'piston*2,@steel.plate*2', 16);
RB('alloySmelter', 1, 'furnace', 'brick*4,@iron.plate', 16);
RB('centrifuge', 1, 'casing', 'mvMotor,rotor,bearing*2', 32);
RB('chemReactor', 1, 'casing', 'pumpModule,@stainless.doublePlate*2,glass', 32);
RB('circuitFab', 1, 'casing', 'robotArmItem,sensorItem,goodCircuit', 32);
RB('laserEngraver', 1, 'casing', 'laserDiode*2,servo,advancedCircuit', 64);
RB('extruder', 1, 'casing', 'lvMotor,heatsink,@steel.longRod', 16);
RB('loom', 1, 'planks', 'planks*2,@iron.gear,rope');
RB('loom', 1, 'planks', 'planks*2,cog,stick*2');
RB('tanner', 1, 'chest', 'salt,@iron.ring');
RB('grower', 1, 'glass', 'glass*3,pipe,@iron.plate');
RB('polarizer', 1, 'casing', 'electromagnet,coil*2', 16);
RB('cryoChamber', 1, 'casing', 'insulation*2,pumpModule,heatsink', 32);
RB('airSeparator', 1, 'casing', 'fanBlade,filter*2,pumpModule', 32);
RB('distiller', 1, 'casing', 'glass*2,@electrum.wire*2,heatsink', 32);
RB('reactor', 1, 'casing', '@lead.doublePlate*4,advancedCircuit,pumpModule', 64);
RB('crystalResonator', 1, 'casing', '@electrum.ring*2,prism,bearing', 64);
RB('arcaneForge', 1, 'alloySmelter', '@orichalcum.plate*2,essenceFire,essenceMind,advancedCircuit', 64);
RB('matterCondenser', 1, 'casing', 'hvMotor*2,@tungsten.doublePlate*2,eliteCircuit', 64);
RB('collider', 1, 'casing', 'superconductor*4,eliteCircuit,electromagnet', 64);
RB('plasmaFuser', 1, 'casing', 'superconductor*2,electromagnet*2,@tungsten.doublePlate', 64);
RB('chronoForge', 1, 'casing', '@chronium.plate*2,timeCrystal,eliteCircuit', 64);
RB('transmuter', 1, 'casing', 'essenceMind*2,@electrum.gear,advancedCircuit', 64);
RB('chronoAccel', 1, 'chronoCore', '@chronium.doublePlate*2,eliteCircuit', 64);
RB('gravityWell', 1, 'gravitonCoil', '@voidsteel.plate*2,processor', 64);
RB('entangler', 2, 'quantumCircuit', '@aetherium.ring*2,emitterItem*2', 64);
RB('voidGen', 1, 'voidCore', 'casing,transformerCore,superconductor*2', 64);
RB('kineticGen', 1, 'kineticCore', 'casing,gearTrain,bearing*2', 64);
RB('adder', 1, 'logicChip', 'stone,redstone*2');
RB('latch', 1, 'ramChip', 'stone,redstone');
RB('proximity', 1, 'sensorItem', 'redstone,stone');
RB('faunaSensor', 1, 'sensorItem', 'redstone,feather');
RB('beltCounter', 1, 'sensorItem', 'redstone,belt');
RB('randomizer', 1, 'logicChip', 'redstone,dye');
RB('sequencer', 1, 'logicChip', 'redstone*2,oscillator');
RB('thermometer', 1, 'glass', 'redstone,@copper.wire,@lead.nugget');
// Alternativas que conectan sistemas antiguos con los nuevos
RB('windmill', 1, 'largeCog', 'sail*4,@bronze.rod', 16);
RB('clock', 2, 'oscillator', 'redstone,stone');
RB('circuit', 4, 'circuitBoard', 'transistor,resistor');
RB('steam', 1, 'casing', 'piston*2,crankshaft,@copper.plate*2', 32);
RB('emotor', 2, 'lvMotor', 'casing,gearTrain', 16);
RB('dynamo', 2, 'rotor', 'magnet*2,coil*2', 16);
RB('battery', 2, 'battery2', '@copper.foil', 16);
RB('elamp', 4, 'diodeItem', 'glass,heatsink');
RB('arm', 2, 'robotArmItem', '@iron.plate');

// ---------- Niveles nuevos ----------
TIERS.push(
  { n: 'Nivel 6 · Aleaciones', goal: { [MF.bronze.ingot]: 40, [MF.tin.plate]: 40, [MF.steel.gear]: 20, [MF.invar.ingot]: 20, lvMotor: 10 } },
  { n: 'Nivel 7 · Electrónica avanzada', goal: { processor: 10, [MF.aluminum.foil]: 60, [MF.titanium.plate]: 30, goodCircuit: 20, mvMotor: 10 } },
  { n: 'Nivel 8 · Ingeniería exótica', goal: { [MF.orichalcum.ingot]: 20, resonantCrystal: 20, timeCrystal: 5, antimatter: 2 } },
);

