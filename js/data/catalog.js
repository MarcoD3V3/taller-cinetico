'use strict';
// Se carga después de todos los datos: completa índices y avisa de recetas rotas.
// Bloques nuevos como objetos, entradas de máquinas, orden del inventario y conexiones de redstone
for (const id in BD) if (BD[id].cat >= 0 && !ITEMS[id]) ITEMS[id] = { n: BD[id].n, block: 1, cat: 4, d: BD[id].d };
for (const k in RECIPES) { const s = MACHINE_INPUTS[k] || (MACHINE_INPUTS[k] = new Set()); for (const r of RECIPES[k]) for (const i in r.in) s.add(i); }
Object.assign(MACHINE_NAME, { orewasher: 'Lavadora de menas', pulverizer: 'Pulverizador', rolling: 'Laminadora', bender: 'Dobladora', cutter: 'Cortadora', gearpress: 'Prensa de engranajes', welder: 'Soldadora', compactor: 'Compactadora', alloy: 'Horno de aleación', centrifuge: 'Centrífuga', chemReactor: 'Reactor químico', circuitFab: 'Fábrica de circuitos', laserEngraver: 'Grabador láser', extruder: 'Extrusora', loom: 'Telar', tanner: 'Curtiduría', grower: 'Invernadero', polarizer: 'Polarizador', cryoChamber: 'Cámara criogénica', distiller: 'Destilador de esencias', crystalResonator: 'Resonador cristalino', arcaneForge: 'Forja arcana', matterCondenser: 'Condensador de materia', collider: 'Colisionador', plasmaFuser: 'Fusor de plasma', chronoForge: 'Forja crónica', transmuter: 'Transmutador', alchemy: 'Mesa de alquimia', runecarve: 'Tallador de runas', enchant: 'Altar de encantamiento' });
ITEM_ORDER.length = 0; ITEM_ORDER.push(...Object.keys(ITEMS)); ITEM_ORDER.forEach((k, i) => ORDER_IDX[k] = i);
for (const k in BD) if (BD[k].emit || BD[k].rsin || BD[k].logic || BD[k].rsable) LOGIC_LINK.add(k);
for (const m in RECIPES) for (const r of RECIPES[m]) for (const k of [...Object.keys(r.in), ...Object.keys(r.out || {})]) if (!ITEMS[k]) console.warn('Receta de', m, 'con objeto desconocido', k);
for (const r of BENCH) for (const k of [r.out, r.core, ...r.teeth]) if (!ITEMS[k]) console.warn('Receta de banco con objeto desconocido', k, '→', r.out);
for (const m in RECIPES) for (const r of RECIPES[m]) if (r.fin) for (const f in r.fin) if (!FLUIDS[f]) console.warn('Fluido desconocido', f);
for (const id in ITEMS) if ((ITEMS[id].weapon || ITEMS[id].tool) && !RECIPE_FOR[id]) console.warn('Arma o herramienta sin receta', id);
