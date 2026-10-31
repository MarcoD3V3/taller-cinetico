'use strict';
// =====================================================================================
//  La Gran Oleada: un evento que llega cada 100 días (o con /oleada). Te lleva a una arena
//  plana y cerrada, con su propio ambiente, y te lanza 6 oleadas cada vez peores desde todas
//  las direcciones: más enemigos, más vida, más daño, criaturas nuevas y minijefes.
//  · 5 arenas: Páramo Mutante, Llanura Infernal, Tundra Eterna, Vacío Estelar y Chatarrería.
//    Cada una con sus criaturas y sus 6 oleadas distintas (30 oleadas, ninguna se repite).
//  · Cada oleada resiste un tipo de daño (⚔ cuerpo a cuerpo, 🏹 a distancia, ✦ magia) y los
//    minijefes cambian de resistencia en cada fase: te obliga a cambiar de arma.
//  · Si mueres vuelves a donde estabas en tu mundo, con toda tu vida, y puedes volver a entrar
//    (se repite la oleada en curso). A la 5.ª muerte el evento termina. Si superas las 6, premio.
//  · Las arenas están en una franja lejana del mismo mundo (y = −300 000): se generan planas.
// =====================================================================================
const WV_Y = -300000, WV_R = 30, WV_HP = [1, 1.55, 2.3, 3.3, 4.6, 6.4], WV_DMG = [1, 1.18, 1.4, 1.65, 1.95, 2.35];
const CAT = { melee: ['⚔', 'cuerpo a cuerpo'], ranged: ['🏹', 'a distancia'], magic: ['✦', 'magia'] };
// ---------- Criaturas ----------
// [clave, nombre, forma, color, color 2, radio, vida, daño, velocidad, IA, extras]
const WM = (k, n, shape, c, c2, s, hp, dmg, v, ai, x = {}) => { ENEMIES[k] = { n, shape, c, c2, s, hp, dmg, v, wound: x.wound || 'cut', ai, el: x.el || null, elite: !!x.elite, bio: null, tier: 99, night: false, undead: false, phase: !!x.phase, venom: !!x.venom, drain: !!x.drain, split: !!x.split, splitInto: x.splitInto, splits: x.splits, regen: x.regen || 0, blink: !!x.blink, glow: !!x.glow || !!x.el, proj: x.proj || null, summon: x.summon || null, drops: [['coin', x.coin || 1, 0.45]], xp: Math.round(6 + hp / 5), horns: x.horns, crown: x.crown, heads: x.heads, mab: x.mab, mini: x.mini, res: x.res, wave: 1 }; };
// Páramo mutante
WM('wvLarva', 'Larva mutante', 'bug', '#9ab83a', '#e0f060', 6, 16, 5, 4, 'melee', { venom: 1 });
WM('wvCrawler', 'Reptante mutado', 'bug', '#5a8a2a', '#c8e030', 8, 38, 8, 3.2, 'melee', { venom: 1, el: 'poison' });
WM('wvHound', 'Sabueso bicéfalo', 'quad', '#6a4a2a', '#a8f040', 11, 70, 12, 3.8, 'charger', { heads: 2, wound: 'bite' });
WM('wvBloater', 'Hinchado tóxico', 'blob', '#8ab83a', '#e0ff60', 12, 80, 34, 1.7, 'exploder', { el: 'poison' });
WM('wvSpitter', 'Escupidor de ácido', 'hum', '#4a6a2a', '#c8f040', 9, 48, 9, 1.9, 'ranged', { el: 'poison', proj: { c: '#a8f040', spd: 12, dmg: 10 }, res: { ranged: 0.5 } });
WM('wvBrute', 'Bruto deforme', 'hum', '#6a8a4a', '#3a5a1a', 16, 260, 26, 1.5, 'melee', { horns: 1, regen: 3, wound: 'fracture', res: { melee: 0.6 } });
WM('wvShaman', 'Chamán de esporas', 'hum', '#5a4a6a', '#a8f040', 10, 90, 10, 1.6, 'summoner', { summon: 'wvLarva', proj: { c: '#c8f040', spd: 10, dmg: 12 }, el: 'poison' });
WM('wvSporeGhost', 'Espíritu de esporas', 'ghost', '#8ad84a', '#e0ff90', 10, 70, 14, 2.6, 'caster', { phase: 1, blink: 1, proj: { c: '#c0ff60', spd: 13, dmg: 13 }, el: 'poison', res: { melee: 0.4 } });
WM('wvAbomination', 'Abominación', 'hum', '#5a7a3a', '#c8e030', 32, 2600, 34, 1.7, 'melee', { mini: 1, heads: 2, horns: 1, regen: 6, wound: 'fracture', mab: [['summon', 'wvLarva', 6], ['slam'], ['ring', 12], ['charge']] });
WM('wvPlagueMother', 'Madre de la Plaga', 'blob', '#4a6a1a', '#e0ff40', 46, 6200, 40, 1.4, 'summoner', { mini: 1, crown: 1, el: 'poison', summon: 'wvBloater', proj: { c: '#c8f040', spd: 12, dmg: 18 }, mab: [['ring', 18], ['summon', 'wvBloater', 3], ['nova'], ['spiral'], ['summon', 'wvCrawler', 6]] });
// Llanura infernal
WM('wvImp', 'Diablillo', 'fly', '#c83a1a', '#ffb030', 7, 30, 8, 3.6, 'melee', { el: 'fire' });
WM('wvHellhound', 'Can infernal', 'quad', '#2a1010', '#ff6a1a', 11, 85, 14, 3.9, 'charger', { el: 'fire', wound: 'bite' });
WM('wvPyro', 'Piromante caído', 'hum', '#5a1a2a', '#ff8a2a', 10, 70, 10, 1.8, 'caster', { el: 'fire', proj: { c: '#ff8a2a', spd: 13, dmg: 15 }, horns: 1 });
WM('wvEmberGolem', 'Gólem de brasas', 'golem', '#4a2a1a', '#ff6a1a', 18, 340, 28, 1.1, 'melee', { el: 'fire', regen: 4, res: { magic: 0.4 }, wound: 'fracture' });
WM('wvMagmaSlug', 'Babosa de magma', 'blob', '#ff6a1a', '#ffd040', 12, 120, 14, 1.3, 'melee', { el: 'fire', split: 1, splits: 2 });
WM('wvCultist', 'Cultista suicida', 'hum', '#3a1a1a', '#ff4a10', 8, 40, 40, 3.2, 'exploder', { el: 'fire' });
WM('wvSuccubus', 'Súcubo', 'hum', '#6a1a3a', '#ff5a8a', 10, 110, 16, 3.1, 'melee', { horns: 1, drain: 1, blink: 1, el: 'void', res: { ranged: 0.4 } });
WM('wvHellKnight', 'Caballero del averno', 'hum', '#2a2a2a', '#ff3a1a', 14, 300, 24, 2.1, 'charger', { horns: 1, el: 'fire', res: { melee: 0.35 }, wound: 'cut' });
WM('wvPitLord', 'Señor del Foso', 'hum', '#5a0a0a', '#ff6a1a', 36, 3000, 38, 1.8, 'melee', { mini: 1, horns: 1, el: 'fire', mab: [['meteor', 5], ['charge'], ['summon', 'wvImp', 6], ['ring', 14]] });
WM('wvArchdemon', 'Archidemonio Vorgath', 'hum', '#3a0505', '#ff4a10', 48, 7400, 46, 2, 'caster', { mini: 1, horns: 1, crown: 1, el: 'fire', proj: { c: '#ff6a1a', spd: 15, dmg: 22 }, mab: [['meteor', 8], ['spiral'], ['summon', 'wvHellhound', 4], ['nova'], ['ring', 20], ['charge']] });
// Tundra eterna
WM('wvFrostBat', 'Murciélago de escarcha', 'fly', '#8ab8e0', '#e0f4ff', 7, 26, 7, 4.2, 'melee', { el: 'frost' });
WM('wvIceWolf', 'Lobo de hielo', 'quad', '#c8e0ff', '#5ab8ff', 10, 65, 12, 3.9, 'melee', { el: 'frost', wound: 'bite' });
WM('wvIceArcher', 'Arquero helado', 'skel', '#9ad8ff', '#e0f8ff', 9, 55, 10, 2, 'ranged', { el: 'frost', proj: { c: '#bff0ff', spd: 18, dmg: 13 } });
WM('wvSnowSpider', 'Araña de nieve', 'bug', '#e8f0ff', '#8ad8ff', 9, 50, 10, 3.4, 'melee', { el: 'frost', venom: 1 });
WM('wvYeti', 'Yeti brutal', 'hum', '#f0f4ff', '#5ab8ff', 16, 320, 28, 1.7, 'charger', { el: 'frost', wound: 'fracture', res: { ranged: 0.5 } });
WM('wvFrostWraith', 'Espectro gélido', 'ghost', '#bfe8ff', '#ffffff', 11, 90, 14, 2.4, 'caster', { el: 'frost', phase: 1, proj: { c: '#e0f8ff', spd: 12, dmg: 14 }, res: { melee: 0.35 } });
WM('wvSentinel', 'Centinela de cristal', 'golem', '#8ad8ff', '#ffffff', 15, 380, 20, 1.1, 'ranged', { el: 'frost', proj: { c: '#9ad8ff', spd: 15, dmg: 18 }, res: { magic: 0.4 } });
WM('wvBehemoth', 'Behemot glacial', 'quad', '#a8c8e8', '#ffffff', 40, 3200, 40, 1.8, 'charger', { mini: 1, el: 'frost', horns: 1, mab: [['charge'], ['slam'], ['ring', 14], ['summon', 'wvIceWolf', 4]] });
WM('wvWinterQueen', 'Reina del Invierno Eterno', 'ghost', '#e0f4ff', '#5ab8ff', 40, 7000, 40, 2.2, 'caster', { mini: 1, crown: 1, el: 'frost', phase: 1, proj: { c: '#bff0ff', spd: 16, dmg: 20 }, mab: [['ring', 20], ['spiral'], ['nova'], ['summon', 'wvFrostWraith', 3], ['shield'], ['blink']] });
// Vacío estelar
WM('wvVoidEye', 'Ojo flotante', 'fly', '#2a1a4a', '#c080ff', 9, 50, 9, 2.6, 'ranged', { el: 'void', proj: { c: '#c080ff', spd: 14, dmg: 12 } });
WM('wvStalker', 'Acechador del vacío', 'quad', '#1a0a2a', '#a060ff', 11, 90, 16, 3.6, 'melee', { el: 'void', blink: 1, wound: 'cut' });
WM('wvTentacle', 'Horror tentacular', 'blob', '#3a1a5a', '#e060ff', 15, 230, 18, 1.5, 'melee', { el: 'void', drain: 1, regen: 4, res: { magic: 0.4 } });
WM('wvPhase', 'Espectro de fase', 'ghost', '#5a3a8a', '#e0c8ff', 10, 80, 15, 3, 'melee', { phase: 1, blink: 1, el: 'void', res: { melee: 0.3 } });
WM('wvStarspawn', 'Engendro estelar', 'bug', '#a060ff', '#ffe0ff', 9, 70, 11, 3.4, 'melee', { el: 'void', split: 1, splits: 3 });
WM('wvVoidMage', 'Hechicero del abismo', 'hum', '#1a0a3a', '#c080ff', 10, 120, 12, 1.7, 'summoner', { el: 'void', summon: 'wvVoidEye', proj: { c: '#a060ff', spd: 12, dmg: 16 }, crown: 1 });
WM('wvNullKnight', 'Caballero nulo', 'golem', '#2a2a3a', '#a060ff', 16, 420, 26, 1.6, 'charger', { el: 'void', res: { ranged: 0.35, magic: 0.6 } });
WM('wvElderEye', 'Ojo Primordial', 'fly', '#2a0a3a', '#ff60ff', 36, 3200, 36, 1.6, 'caster', { mini: 1, el: 'void', proj: { c: '#ff60ff', spd: 14, dmg: 18 }, mab: [['ring', 16], ['spiral'], ['pull'], ['summon', 'wvVoidEye', 4], ['blink']] });
WM('wvStarEater', 'Devorador de Estrellas', 'blob', '#0a0518', '#a060ff', 54, 8000, 48, 1.4, 'melee', { mini: 1, crown: 1, el: 'void', mab: [['pull'], ['ring', 22], ['summon', 'wvStalker', 4], ['spiral'], ['nova'], ['shield'], ['meteor', 6]] });
// Chatarrería titánica
WM('wvNano', 'Nanoenjambre', 'bug', '#8a96a6', '#5af0ff', 6, 15, 5, 4.4, 'melee', { el: 'storm' });
WM('wvDrone', 'Dron de combate', 'fly', '#7f8a96', '#ff3a3a', 9, 55, 10, 3, 'ranged', { el: 'storm', proj: { c: '#ff5a3a', spd: 20, dmg: 12 } });
WM('wvSawbot', 'Sierra rodante', 'bug', '#a0a8b0', '#ffd040', 10, 90, 18, 2.6, 'charger', { wound: 'cut', res: { melee: 0.5 } });
WM('wvBomber', 'Bomba andante', 'golem', '#5a5a5a', '#ff3a1a', 8, 45, 42, 3, 'exploder', { el: 'fire' });
WM('wvSniper', 'Francotirador', 'hum', '#4a5260', '#ff3a3a', 9, 70, 10, 1.8, 'ranged', { proj: { c: '#ffe08a', spd: 30, dmg: 22 }, res: { ranged: 0.5 } });
WM('wvTank', 'Tanque blindado', 'golem', '#5a6270', '#ffd040', 18, 480, 26, 1, 'ranged', { proj: { c: '#ffb030', spd: 11, dmg: 26 }, res: { ranged: 0.25, melee: 0.7 } });
WM('wvInfiltrator', 'Infiltrador sintético', 'hum', '#2a3a4a', '#5af0ff', 10, 140, 18, 3.2, 'melee', { el: 'storm', blink: 1, res: { magic: 0.4 } });
WM('wvExterminator', 'Exterminador X-9', 'golem', '#7f8a96', '#ff3a3a', 36, 3400, 40, 1.6, 'charger', { mini: 1, mab: [['charge'], ['ring', 16], ['summon', 'wvDrone', 4], ['slam'], ['shield']] });
WM('wvOmega', 'Titán Omega', 'golem', '#c8a04a', '#5af0ff', 56, 9000, 50, 1.2, 'ranged', { mini: 1, crown: 1, el: 'storm', proj: { c: '#5af0ff', spd: 18, dmg: 24 }, mab: [['spiral'], ['ring', 24], ['summon', 'wvSawbot', 4], ['meteor', 8], ['nova'], ['shield'], ['summon', 'wvBomber', 5]] });

// ---------- Arenas y sus 6 oleadas ----------
// mix: [criatura, cuántas] · res: resistencias de toda la oleada · mini: minijefe al final
const ARENAS = {
  mutant: { n: 'Páramo Mutante', i: '☣', c: '#a8f040', d: 'Una llanura tóxica donde la plaga creó horrores. Enjambres, venenos y cosas que explotan.', g: 'SPOREFLOOR', alt: 'MYCELIUM', wall: 'ROTSTONE', mus: 'swampHydra', mul: 1, amb: 'spores', waves: [
    { n: 'El enjambre despierta', mix: [['wvLarva', 22], ['wvCrawler', 12]], res: {}, d: 'Muchos y rápidos: barre con golpes amplios.' },
    { n: 'Lluvia de ácido', mix: [['wvSpitter', 14], ['wvCrawler', 16], ['wvHound', 6]], res: { ranged: 0.35 }, d: 'Resisten las flechas: acércate.' },
    { n: 'La carne se hincha', mix: [['wvBloater', 12], ['wvHound', 12], ['wvLarva', 20]], res: { melee: 0.4 }, mini: 'wvAbomination', d: 'No los golpees de cerca: explotan.' },
    { n: 'Brutos y chamanes', mix: [['wvBrute', 8], ['wvShaman', 6], ['wvSpitter', 14]], res: { magic: 0.4 }, d: 'La magia apenas les hace nada.' },
    { n: 'Espíritus de la ciénaga', mix: [['wvSporeGhost', 14], ['wvBloater', 10], ['wvHound', 14], ['wvShaman', 4]], res: { melee: 0.35 }, d: 'Fantasmas que atraviesan paredes y resisten espadas.' },
    { n: 'La Madre de la Plaga', mix: [['wvBrute', 10], ['wvSporeGhost', 12], ['wvBloater', 14], ['wvCrawler', 20]], res: {}, mini: 'wvPlagueMother', d: 'Todo lo que la plaga ha engendrado, a la vez.' }] },
  infernal: { n: 'Llanura Infernal', i: '🔥', c: '#ff6a1a', d: 'Ceniza, brasas y demonios. Todo quema: lleva agua y armas que no sean de fuego.', g: 'CINDERFLOOR', alt: 'ASH', wall: 'HELLSTONE', mus: 'demonLord', mul: 1.25, amb: 'embers', waves: [
    { n: 'Puertas abiertas', mix: [['wvImp', 26], ['wvHellhound', 10]], res: {}, d: 'Diablillos voladores y perros que embisten.' },
    { n: 'Coro de piromantes', mix: [['wvPyro', 14], ['wvImp', 16], ['wvCultist', 8]], res: { magic: 0.35 }, d: 'Los cultistas explotan: dispárales antes.' },
    { n: 'Magma vivo', mix: [['wvMagmaSlug', 12], ['wvEmberGolem', 6], ['wvHellhound', 14]], res: { melee: 0.45 }, mini: 'wvPitLord', d: 'Las babosas se dividen al morir.' },
    { n: 'La seducción', mix: [['wvSuccubus', 14], ['wvPyro', 10], ['wvCultist', 12]], res: { ranged: 0.4 }, d: 'Te roban la vida y aparecen a tu lado.' },
    { n: 'Legión del averno', mix: [['wvHellKnight', 12], ['wvEmberGolem', 8], ['wvImp', 24]], res: { melee: 0.3, magic: 1.3 }, d: 'Armaduras infernales: la magia las atraviesa.' },
    { n: 'Vorgath el Archidemonio', mix: [['wvHellKnight', 10], ['wvSuccubus', 12], ['wvPyro', 14], ['wvCultist', 14], ['wvHellhound', 14]], res: {}, mini: 'wvArchdemon', d: 'El señor de esta llanura en persona.' }] },
  frozen: { n: 'Tundra Eterna', i: '❄', c: '#9ad8ff', d: 'Viento helado y nieve sin fin. Te congelan, te frenan y te rodean en manada.', g: 'SNOW', alt: 'ICE', wall: 'DEEPSLATE', mus: 'ancientYeti', mul: 1.45, amb: 'snow', waves: [
    { n: 'Aullidos en la ventisca', mix: [['wvIceWolf', 20], ['wvFrostBat', 20]], res: {}, d: 'Manadas veloces: no te quedes quieto.' },
    { n: 'Flechas de escarcha', mix: [['wvIceArcher', 16], ['wvIceWolf', 14], ['wvSnowSpider', 10]], res: { melee: 0.4 }, d: 'Esqueletos que resisten golpes: dispárales.' },
    { n: 'El paso del yeti', mix: [['wvYeti', 8], ['wvSnowSpider', 16], ['wvFrostBat', 18]], res: { ranged: 0.4 }, mini: 'wvBehemoth', d: 'Brutos que embisten y resisten flechas.' },
    { n: 'Almas heladas', mix: [['wvFrostWraith', 16], ['wvIceArcher', 12], ['wvIceWolf', 14]], res: { magic: 0.4 }, d: 'Espectros que atraviesan todo.' },
    { n: 'Muralla de cristal', mix: [['wvSentinel', 10], ['wvYeti', 8], ['wvFrostWraith', 12], ['wvFrostBat', 20]], res: { ranged: 0.35, melee: 1.3 }, d: 'Torres que disparan: rómpelas de cerca.' },
    { n: 'La Reina del Invierno', mix: [['wvSentinel', 8], ['wvYeti', 10], ['wvFrostWraith', 14], ['wvIceWolf', 20], ['wvIceArcher', 12]], res: {}, mini: 'wvWinterQueen', d: 'El invierno nunca termina.' }] },
  void: { n: 'Vacío Estelar', i: '🌌', c: '#a060ff', d: 'Un suelo flotando entre estrellas. Criaturas que se teletransportan, te arrastran y se multiplican.', g: 'VOIDFLOOR', alt: 'DEEPFLOOR', wall: 'VOIDSTONE', mus: 'voidDevourer', mul: 1.7, amb: 'stars', waves: [
    { n: 'Miradas en la oscuridad', mix: [['wvVoidEye', 18], ['wvStarspawn', 14]], res: {}, d: 'Ojos que disparan y engendros que se dividen.' },
    { n: 'Los acechadores', mix: [['wvStalker', 18], ['wvPhase', 12], ['wvVoidEye', 10]], res: { ranged: 0.35 }, d: 'Aparecen a tu lado: golpéalos rápido.' },
    { n: 'Tentáculos', mix: [['wvTentacle', 10], ['wvStarspawn', 18], ['wvStalker', 10]], res: { magic: 0.35 }, mini: 'wvElderEye', d: 'Te roban vida: no te quedes en su alcance.' },
    { n: 'El cónclave del abismo', mix: [['wvVoidMage', 10], ['wvPhase', 16], ['wvVoidEye', 16]], res: { melee: 0.35 }, d: 'Invocadores: mátalos primero.' },
    { n: 'Caballeros nulos', mix: [['wvNullKnight', 12], ['wvTentacle', 8], ['wvStalker', 16], ['wvStarspawn', 14]], res: { ranged: 0.3, magic: 0.6, melee: 1.3 }, d: 'Solo el acero les hace daño de verdad.' },
    { n: 'El Devorador de Estrellas', mix: [['wvNullKnight', 10], ['wvVoidMage', 8], ['wvPhase', 16], ['wvTentacle', 10], ['wvStalker', 16]], res: {}, mini: 'wvStarEater', d: 'Se traga la luz… y a ti.' }] },
  machine: { n: 'Chatarrería Titánica', i: '⚙', c: '#ffc040', d: 'Un desguace sin fin donde las máquinas se rebelaron. Blindajes, láseres y enjambres.', g: 'STONEFLOOR', alt: 'BRICKFLOOR', wall: 'OBSIDIAN', mus: 'supremeAutomaton', mul: 1.95, amb: 'sparks', waves: [
    { n: 'Enjambre de nanos', mix: [['wvNano', 34], ['wvDrone', 10]], res: {}, d: 'Miles de piezas diminutas.' },
    { n: 'Sierras y bombas', mix: [['wvSawbot', 16], ['wvBomber', 12], ['wvNano', 16]], res: { melee: 0.4 }, d: 'Las bombas explotan: mantén la distancia.' },
    { n: 'Línea de tiro', mix: [['wvSniper', 12], ['wvDrone', 16], ['wvSawbot', 10]], res: { ranged: 0.35 }, mini: 'wvExterminator', d: 'Francotiradores: cúbrete y acércate.' },
    { n: 'Infiltración', mix: [['wvInfiltrator', 14], ['wvBomber', 12], ['wvDrone', 14]], res: { magic: 0.35 }, d: 'Sintéticos que saltan a tu lado.' },
    { n: 'División acorazada', mix: [['wvTank', 10], ['wvSniper', 10], ['wvSawbot', 14], ['wvNano', 20]], res: { ranged: 0.3, magic: 1.3 }, d: 'Tanques: la magia funde su blindaje.' },
    { n: 'El Titán Omega', mix: [['wvTank', 8], ['wvInfiltrator', 12], ['wvExterminator', 1], ['wvSniper', 10], ['wvBomber', 14], ['wvDrone', 16]], res: {}, mini: 'wvOmega', d: 'La máquina definitiva despierta.' }] },
};
const WV_KEYS = Object.keys(ARENAS);
WV_KEYS.forEach((k, i) => { const A = ARENAS[k]; A.k = k; A.x = 200000 + i * 4000; A.gI = G[A.g]; A.altI = G[A.alt]; A.wallI = G[A.wall]; BI('arena_' + k, { n: A.n, g: A.g, fauna: [], fd: 0, mc: A.c }); A.bio = BI_['arena_' + k]; });
const arenaAtTile = (tx, ty) => { if (Math.abs(ty - WV_Y) > 96) return null; for (const k of WV_KEYS) if (Math.abs(tx - ARENAS[k].x) <= 96) return ARENAS[k]; return null; };
const inArena = () => !!(S && S.player && arenaAtTile(Math.floor(S.player.x / T), Math.floor(S.player.y / T)));
// Suelo plano y liso del tipo de la arena (centro y borde con el secundario); fuera del círculo, muro
{ const g0 = genChunkTiles; genChunkTiles = c => { const A = arenaAtTile(c.cx * CS + 16, c.cy * CS + 16); if (!A) return g0(c);
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) { const tx = c.cx * CS + x, ty = c.cy * CS + y, dx = tx - A.x, dy = ty - WV_Y, d = Math.hypot(dx, dy), i = (y << CSH) | x;
    let t = d > WV_R ? A.wallI : A.gI;
    if (d <= WV_R && (d < 2.5 || d > WV_R - 1.2)) t = A.altI; // centro y borde marcados; el resto, liso
    c.g[i] = t; c.bio[i] = A.bio; c.t[i] = GI[t].hp || 0; } }; }
// En la arena no aparece nada por su cuenta, el clima no hiela ni quema y siempre hay luz
{ const s0 = spawnTick; spawnTick = dt => { if (!inArena()) s0(dt); }; }
{ const e0 = envCheck; envCheck = () => { if (!inArena()) e0(); }; }
{ const d0 = daylight; daylight = () => inArena() ? 0.9 : d0(); }

// ---------- Origen del daño (para las resistencias) ----------
let WV_SRC = null;
class SrcSet extends Set { constructor(s) { super(); this.s = s; } add(v) { WV_SRC = this.s; return super.add(v); } }
{ const a0 = playerAttack; playerAttack = (id, mw) => { const np = PROJ.length; WV_SRC = 'melee'; let r; try { r = a0(id, mw); } finally { const cat = manaCost(id) > 0 || isWand(id) ? 'magic' : 'ranged'; for (let i = np; i < PROJ.length; i++) if (PROJ[i].team === 'p' && PROJ[i].hit) PROJ[i].hit = new SrcSet(cat); WV_SRC = null; } return r; }; }
{ const c0 = castSpell; castSpell = slot => { const np = PROJ.length; WV_SRC = 'magic'; try { c0(slot); } finally { for (let i = np; i < PROJ.length; i++) if (PROJ[i].team === 'p' && PROJ[i].hit) PROJ[i].hit = new SrcSet('magic'); WV_SRC = null; } }; }
{ const d0 = damageFoe; damageFoe = (f, dmg, el, src) => {
  if (f && f.res && WV_SRC) { const m = f.res[WV_SRC]; if (m !== undefined && m !== 1) { dmg *= m; const now = performance.now(); if (now - (f._rt || 0) > 900) { f._rt = now; fxText(f.x, f.y - f.D.s - 16, m < 1 ? `resiste ${CAT[WV_SRC][0]}` : `¡débil a ${CAT[WV_SRC][0]}!`, m < 1 ? '#9a9a9a' : '#ffd34a'); } } }
  return d0(f, dmg, el, src); }; }

// ---------- Estado del evento ----------
const WV = { on: false, a: null, wave: 0, st: 'off', deaths: 0, id: 0, quota: [], total: 0, kills: 0, burstT: 0, restT: 0, t: 0, pend: [], mini: null, miniDone: false, introT: 0, amb: [] };
const curA = () => ARENAS[WV.a], curW = () => curA().waves[WV.wave];
const wvAlive = () => FOES.filter(f => f.wv === WV.id);
function wvTeleport(x, y, cb) {
  const el = document.getElementById('wvPortal') || Object.assign(document.createElement('div'), { id: 'wvPortal' }); if (!el.parentNode) document.body.appendChild(el);
  el.style.setProperty('--c', WV.a ? curA().c : '#c8a8ff'); el.className = 'on'; tone(220, 0.8, 'sine', 0.06, 3); noise(0.6, 0.05, 900);
  setTimeout(() => { S.player.x = x; S.player.y = y; view.x = x; view.y = y; P.iframe = 1.5; for (const pj of PROJ.slice()) if (pj.team === 'e') PROJ.splice(PROJ.indexOf(pj), 1); HAZ.length = 0; if (cb) cb(); el.className = 'out'; setTimeout(() => el.className = '', 700); }, 650);
}
function wvStart(k) {
  if (WV.on) { toastErr('Ya estás en la Gran Oleada'); return; } if (!S || isGuest()) { toastErr('Solo el anfitrión puede empezar la Gran Oleada'); return; }
  const A = ARENAS[k]; Object.assign(WV, { on: true, a: k, wave: 0, st: 'intro', deaths: 0, id: Math.random(), kills: 0, t: 0, pend: [], mini: null, miniDone: false, introT: 4.5 });
  S.wvHome = { x: S.player.x, y: S.player.y }; S.wvRun = { a: k, wave: 0, deaths: 0 }; closePick();
  wvTeleport((A.x + 0.5) * T, (WV_Y + 0.5) * T, () => { wvBanner(A.i + ' ' + A.n, A.d, A.c, 4); bossMusic(true, A.mus); bossRoar(); });
}
function wvBeginWave(i) {
  const W = curA().waves[i]; WV.wave = i; WV.st = 'fight'; WV.quota = []; for (const [k, n] of W.mix) for (let j = 0; j < n; j++) WV.quota.push(k);
  for (let j = WV.quota.length - 1; j > 0; j--) { const r = (Math.random() * (j + 1)) | 0; [WV.quota[j], WV.quota[r]] = [WV.quota[r], WV.quota[j]]; }
  WV.total = WV.quota.length + (W.mini ? 1 : 0); WV.kills = 0; WV.burstT = 2.5; WV.mini = null; WV.miniDone = !W.mini; S.wvRun.wave = i;
  const rs = Object.entries(W.res).map(([c, m]) => m < 1 ? `resiste ${CAT[c][0]} ${CAT[c][1]}` : `débil a ${CAT[c][0]} ${CAT[c][1]}`).join(' · ');
  wvBanner(`Oleada ${i + 1} de 6`, `«${W.n}» — ${W.d}${rs ? '\n' + rs : ''}`, curA().c, 4.2); bossRoar(); shake = Math.max(shake || 0, 0.3);
}
// Enemigos de la oleada: más vida y daño en cada oleada y en cada arena; persiguen siempre
function wvSpawn(k, x, y) {
  const A = curA(), W = curW(), B = ENEMIES[k], hm = WV_HP[WV.wave] * A.mul, dm = WV_DMG[WV.wave] * Math.sqrt(A.mul);
  const f = spawnFoe(k, x, y, { minion: 1, ag: 1, wv: WV.id });
  f.D = { ...B, dmg: B.dmg * dm, v: B.v * (1 + WV.wave * 0.04), proj: B.proj ? { ...B.proj, dmg: B.proj.dmg * dm } : null }; f.mhp = f.hp = Math.round(f.hp * hm);
  f.res = { ...W.res, ...(B.res || {}) };
  if (B.mini) { f.mini = 1; f.res = {}; f.ph2 = -1; f.mt = 3; f.miniCats = Object.keys(CAT).sort(() => Math.random() - 0.5); }
  sparkRing(x, y, 16, A.c, 90, { life: 0.5 }); return f;
}
// Portales: avisan 1,2 s antes por dónde vienen
function wvPortal(x, y, list) { WV.pend.push({ x, y, t: 0, life: 1.2, list }); HAZ.push({ x, y, r: 26, t: 1.2, dl: 1.2, kind: 'warn', c: curA().c }); }
function wvBurst() {
  const A = curA(), p = S.player, n = Math.min(WV.quota.length, 5 + WV.wave * 2), dirs = 2 + Math.min(3, (Math.random() * (2 + WV.wave)) | 0), base = Math.random() * 6.28;
  for (let d = 0; d < dirs; d++) { const a = base + d / dirs * 6.28 + rnd(-0.3, 0.3), r = rnd(11, 16) * T; let x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    const cx = (A.x + 0.5) * T, cy = (WV_Y + 0.5) * T, dd = Math.hypot(x - cx, y - cy), mx = (WV_R - 3) * T; if (dd > mx) { x = cx + (x - cx) / dd * mx; y = cy + (y - cy) / dd * mx; }
    const list = WV.quota.splice(0, Math.ceil(n / dirs)); if (list.length) wvPortal(x, y, list); }
}
function wvMiniTick(f, dt) {
  const D = f.D, fr = f.hp / f.mhp, ph = fr < 0.34 ? 2 : fr < 0.67 ? 1 : 0; if (f.shieldT > 0) f.shieldT -= dt; // fuera de los jefes nadie más lo descuenta
  if (ph !== f.ph2) { f.ph2 = ph; const c = f.miniCats[ph]; f.res = { [c]: 0.15 };
    if (ph) { wvBanner(`${D.n} · fase ${ph + 1}`, `Ahora resiste ${CAT[c][0]} ${CAT[c][1]}: ¡cambia de arma!`, curA().c, 2.6); shake = Math.max(shake || 0, 0.45); sparkRing(f.x, f.y, 50, curA().c, 220, { life: 0.8, size: 3 }); bossRoar(); f.stun = 0; f.frz = 0; } }
  if (f.dashT > 0) { f.dashT -= dt; fStep(f, f.x + f.dvx * dt, f.y + f.dvy * dt); if (dist(f.x, f.y, S.player.x, S.player.y) < D.s + 12) hitPlayer(D.dmg * 1.3, 'fracture', 'Arrollado por: ' + D.n, D.el); if (Math.random() < 0.6) fxSmoke(f.x, f.y + D.s * 0.6, 'rgba(120,110,100,', 5); }
  if (f.spT > 0) { f.spT -= dt; f.spE = (f.spE || 0) - dt; if (f.spE <= 0) { f.spE = 0.07; f.spA = (f.spA || 0) + 0.42; for (const o of [0, Math.PI]) wvShot(f, f.spA + o, 0.55); } }
  if (f.frz > 0 || f.stun > 0) return; f.mt -= dt; if (f.mt > 0) return;
  const ab = D.mab[(f.abI = ((f.abI || 0) + 1)) % D.mab.length], p = S.player; f.mt = 2.8 - ph * 0.55;
  sparkRing(f.x, f.y - D.s * 0.5, 14, D.c2 || curA().c, 70, { life: 0.4 });
  switch (ab[0]) {
    case 'ring': { const n = ab[1] + ph * 4; for (let i = 0; i < n; i++) wvShot(f, i / n * 6.283 + (f.abI % 2) * 0.2, 0.6); break; }
    case 'spiral': f.spT = 2 + ph * 0.6; break;
    case 'summon': for (let i = 0; i < ab[2] + ph; i++) { const a = i / (ab[2] + ph) * 6.28; wvPortal(f.x + Math.cos(a) * 3 * T, f.y + Math.sin(a) * 3 * T, [ab[1]]); } WV.total += ab[2] + ph; break;
    case 'slam': HAZ.push({ x: f.x, y: f.y, r: D.s * 2.6, t: 0.9, dl: 0.9, kind: 'warn', dmg: D.dmg * 1.4, wound: 'fracture', team: 'e', src: D.n, c: '#ff3a2a', shake: 1, follow: f }); break;
    case 'meteor': for (let i = 0; i < ab[1] + ph * 2; i++) { const ox = i ? rnd(-6, 6) * T : 0, oy = i ? rnd(-6, 6) * T : 0; HAZ.push({ x: p.x + ox, y: p.y + oy, r: 46, t: 1.1 + i * 0.1, dl: 1.1 + i * 0.1, kind: 'warn', dmg: D.dmg, wound: 'burn', team: 'e', src: D.n, c: D.el === 'frost' ? '#9ad8ff' : '#ff6a1a', el: D.el, shake: 1 }); } break;
    case 'nova': HAZ.push({ x: p.x, y: p.y, r: 95, t: 1.2, dl: 1.2, kind: 'warn', dmg: D.dmg * 1.2, wound: 'burn', team: 'e', src: D.n, c: curA().c, el: D.el, shake: 1 }); break;
    case 'charge': { const a = Math.atan2(p.y - f.y, p.x - f.x), v = D.v * T * 4.2; f.dvx = Math.cos(a) * v; f.dvy = Math.sin(a) * v; f.dashT = 0.65; fxText(f.x, f.y - D.s - 8, '¡!', '#ff3a2a', true); break; }
    case 'pull': { const a = Math.atan2(f.y - p.y, f.x - p.x); movePlayer(Math.cos(a) * 70, Math.sin(a) * 70); for (let i = 0; i < 20; i++) fxAdd({ x: p.x + rnd(-30, 30), y: p.y + rnd(-30, 30), vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.4, t: 0, size: 2, col: curA().c, glow: 1, drag: 1 }); break; }
    case 'shield': f.shieldT = 2.2 + ph * 0.5; FX.push({ x: f.x, y: f.y, ring: D.s * 1.6, t: 0.6, c: '#c8a8ff' }); break;
    case 'blink': { const a = Math.random() * 6.28, nx = p.x + Math.cos(a) * 4 * T, ny = p.y + Math.sin(a) * 4 * T; if (passable(nx, ny, foeWho(D))) { sparkRing(f.x, f.y, 24, curA().c, 120); f.x = nx; f.y = ny; sparkRing(f.x, f.y, 24, curA().c, 120); } break; }
  }
}
function wvShot(f, a, m) { const pr = f.D.proj || { c: f.D.c2 || '#ff5a3a', spd: 11, dmg: f.D.dmg * 0.5 }; PROJ.push({ x: f.x, y: f.y, vx: Math.cos(a) * pr.spd * T * 0.8, vy: Math.sin(a) * pr.spd * T * 0.8, r: 6, dmg: (pr.dmg || f.D.dmg * 0.5) * m * 1.4, c: pr.c, team: 'e', life: 3, el: f.D.el, wound: f.D.wound || 'cut', src: f.D.n }); }
// Tras matar a cada enemigo de la oleada
{ const k0 = killFoe; killFoe = f => { const was = FOES.includes(f); k0(f); if (was && !FOES.includes(f) && f.wv && f.wv === WV.id) { WV.kills++; if (f.mini) { if (f.k === curW().mini) WV.miniDone = true; wvBanner(`☠ ${f.D.n} ha caído`, '', curA().c, 2.6); sparkRing(f.x, f.y, 90, curA().c, 300, { life: 1.2, size: 3 }); screenFlash(curA().c, 0.35); shake = Math.max(shake || 0, 0.6); } else if (Math.random() < 0.5) sparkRing(f.x, f.y, 8, curA().c, 60, { life: 0.35 }); } }; }
function wvTick(dt) {
  // 100 días: llega sola. Un día antes, aviso.
  const dl = S.gen.dayLen || DAY_LEN, day = Math.floor(S.time / dl) + 1;
  if (!WV.on && !isGuest()) { if (day % 100 === 99 && S.wvWarn !== day) { S.wvWarn = day; toast('⚠ Mañana llega la Gran Oleada. Prepara tus armas.', true); }
    if (day >= 100 && day % 100 === 0 && S.wvDay !== day && !ui.open) { S.wvDay = day; openPick(true); } }
  // Partida guardada dentro de la arena sin evento: de vuelta a casa
  if (!WV.on && inArena() && WV.st !== 'away') { const h = S.wvHome || { x: 0, y: 0 }; S.player.x = h.x; S.player.y = h.y; view.x = h.x; view.y = h.y; S.wvHome = null; for (const f of FOES.slice()) if (f.wv) FOES.splice(FOES.indexOf(f), 1); }
  if (!WV.on || WV.st === 'away') return; WV.t += dt;
  for (const f of FOES) if (!f.wv && inArena() && dist(f.x, f.y, S.player.x, S.player.y) < 40 * T) { f.wv = WV.id; f.minion = 1; f.ag = 1; } // hijos de los que se dividen
  for (let i = WV.pend.length - 1; i >= 0; i--) { const o = WV.pend[i]; o.t += dt; if (o.t >= o.life) { WV.pend.splice(i, 1); o.list.forEach((k, j) => { const a = j / o.list.length * 6.28; const f = wvSpawn(k, o.x + Math.cos(a) * 14 * (j ? 1 : 0), o.y + Math.sin(a) * 14 * (j ? 1 : 0)); if (f.mini && k === curW().mini) { WV.mini = f; wvBanner(`⚠ ${f.D.n}`, 'MINIJEFE', curA().c, 3); bossRoar(); shake = Math.max(shake || 0, 0.7); screenFlash(curA().c, 0.3); } }); } }
  for (const f of FOES) if (f.mini && f.wv === WV.id) wvMiniTick(f, dt);
  if (WV.st === 'intro') { WV.introT -= dt; if (WV.introT <= 0) wvBeginWave(WV.wave); return; }
  if (WV.st === 'rest') { WV.restT -= dt; if (WV.restT <= 0) wvBeginWave(WV.wave + 1); return; }
  if (WV.st === 'won') { WV.restT -= dt; if (WV.restT <= 0) wvEnd(true); return; }
  if (WV.st !== 'fight') return;
  const alive = wvAlive().length; WV.burstT -= dt;
  if (WV.quota.length && WV.burstT <= 0 && alive < 34 + WV.wave * 4) { WV.burstT = Math.max(3.2, 7 - WV.wave * 0.6); wvBurst(); }
  const W = curW();
  if (!WV.quota.length && !WV.pend.length && W.mini && !WV.mini && !WV.miniDone) { const a = Math.random() * 6.28; wvPortal(S.player.x + Math.cos(a) * 9 * T, S.player.y + Math.sin(a) * 9 * T, [W.mini]); WV.mini = 'coming'; }
  if (!WV.quota.length && !WV.pend.length && !alive && WV.miniDone) {
    if (WV.wave >= 5) { WV.st = 'won'; WV.restT = 6; wvBanner('🏆 ¡HAS SOBREVIVIDO A LA GRAN OLEADA!', `${curA().n} conquistado en ${fmtT(WV.t)} · ${WV.deaths} caída${WV.deaths === 1 ? '' : 's'}`, '#ffd34a', 6); wvReward(); bossMusic(false); return; }
    WV.st = 'rest'; WV.restT = 14; wvBanner('✔ ¡Oleada superada!', `Recuperas vida y maná. Siguiente en 14 s`, '#7fd07a', 3);
    if (S.pc) { S.pc.hp = Math.min(maxHp(), S.pc.hp + maxHp() * 0.4); S.pc.mana = Math.min(maxMana(), (S.pc.mana || 0) + maxMana() * 0.6); vitalsDirty = true; } sparkRing(S.player.x, S.player.y, 40, '#7fd07a', 120, { up: 30 });
  }
}
const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function wvClear() { for (const f of FOES.slice()) if (f.wv) FOES.splice(FOES.indexOf(f), 1); for (const pj of PROJ.slice()) if (pj.team === 'e') PROJ.splice(PROJ.indexOf(pj), 1); WV.pend = []; }
function wvEnd(win, why) {
  wvClear(); bossMusic(false); const h = S.wvHome || { x: S.player.x, y: S.player.y }, A = curA();
  WV.on = false; WV.st = 'off'; S.wvRun = null; $('wvDead') && ($('wvDead').hidden = true);
  if (inArena()) wvTeleport(h.x, h.y, () => { S.wvHome = null; }); else S.wvHome = null;
  if (!win) setTimeout(() => wvBanner(why === 'quit' ? 'Has abandonado la Gran Oleada' : '💀 La Gran Oleada te ha vencido', why === 'quit' ? '' : `Llegaste a la oleada ${WV.wave + 1} de 6 en ${A.n}`, '#ff6b5b', 4), 800);
}
function wvReward() {
  const A = curA(), idx = WV_KEYS.indexOf(WV.a), rec = S.wvRec || (S.wvRec = {}); rec[WV.a] = Math.max(rec[WV.a] || 0, 6);
  const got = [['coin', 400 + idx * 250]]; const pool = Object.keys(ITEMS).filter(id => ITEMS[id].weapon && typeof TR !== 'undefined' && TR[id] && (TR[id].r || 0) >= 3);
  for (let i = 0; i < 2 + Math.floor(idx / 2) && pool.length; i++) got.push([pool.splice((Math.random() * pool.length) | 0, 1)[0], 1]);
  for (const id of ['tPotHeal4', 'tPotMana4']) if (ITEMS[id]) got.push([id, 5]);
  for (const [id, n] of got) invAdd(id, n); invVersion++;
  toast('🏆 Premio: ' + got.map(([id, n]) => n + ' ' + ITEMS[id].n).join(', '), true);
}
// Morir en la arena: vuelves a casa con toda la vida. 5 caídas y se acaba
{ const d0 = die; die = () => { if (!WV.on || !inArena()) return d0();
  WV.deaths++; S.wvRun.deaths = WV.deaths; wvClear(); bossMusic(false);
  const pc = S.pc; Object.assign(pc, { hp: maxHp(), stam: maxStam(), poison: 0, temp: 37 }); for (const p of PARTS) pc.parts[p] = []; vitalsDirty = true;
  if (WV.deaths >= 5) { wvEnd(false); return; }
  WV.st = 'away'; const h = S.wvHome; wvTeleport(h.x, h.y, () => showDead()); }; }
function wvReenter() { if (!WV.on || WV.st !== 'away') return; $('wvDead').hidden = true; const A = curA(); WV.st = 'intro'; WV.introT = 3; wvTeleport((A.x + 0.5) * T, (WV_Y + 0.5) * T, () => { bossMusic(true, A.mus); wvBanner(`Vuelves a ${A.n}`, `Oleada ${WV.wave + 1} de 6 · te quedan ${5 - WV.deaths} vida${5 - WV.deaths === 1 ? '' : 's'}`, A.c, 3); }); }

// ---------- Interfaz ----------
const wvDiv = (id, cls) => { let e = document.getElementById(id); if (!e) { e = document.createElement('div'); e.id = id; if (cls) e.className = cls; document.body.appendChild(e); } return e; };
function wvBanner(t, sub, c, life) { const e = wvDiv('wvBanner'); e.style.setProperty('--c', c); e.innerHTML = `<h1>${esc(t)}</h1>${sub ? `<p>${esc(sub).replace(/\n/g, '<br>')}</p>` : ''}`; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), (life || 3) * 1000); }
function wvHud() {
  const e = wvDiv('wvHud'), show = WV.on && WV.st !== 'away' && !ui.open; if (e.hidden === show) e.hidden = !show; if (!show) return;
  const A = curA(), W = curW(), alive = wvAlive().length, left = WV.quota.length + WV.pend.reduce((s, o) => s + o.list.length, 0) + alive + (W.mini && !WV.mini ? 1 : 0), prog = WV.total ? Math.max(0, Math.min(1, 1 - left / WV.total)) : 0;
  const mini = WV.mini && WV.mini.hp > 0 && FOES.includes(WV.mini) ? WV.mini : null, mres = mini && Object.keys(mini.res || {})[0];
  const st = WV.st === 'rest' ? `Siguiente oleada en ${Math.ceil(WV.restT)} s` : WV.st === 'intro' ? 'Preparándose…' : WV.st === 'won' ? '¡Victoria!' : `Quedan ${left}`;
  const res = Object.entries(W.res).map(([c, m]) => `<span class="${m < 1 ? 'r' : 'w'}" title="${m < 1 ? 'Resisten' : 'Débiles a'} ${CAT[c][1]}">${CAT[c][0]}${m < 1 ? '↓' : '↑'}</span>`).join('');
  const sig = [WV.a, WV.wave, st, Math.round(prog * 200), WV.deaths, Math.floor(WV.t), mini ? Math.round(mini.hp / mini.mhp * 300) + mres : ''].join('|'); if (e._s === sig) return; e._s = sig;
  e.style.setProperty('--c', A.c);
  e.innerHTML = `<div class="wvt"><b>${A.i} ${esc(A.n)}</b><span>Oleada ${WV.wave + 1}/6 · «${esc(W.n)}»</span></div><div class="wvbar"><i style="transform:scaleX(${prog.toFixed(3)})"></i></div>
    <div class="wvs"><span>${st}</span><span>⏱ ${fmtT(WV.t)}</span><span class="lives" title="Vidas">${'♥'.repeat(5 - WV.deaths)}<s>${'♥'.repeat(WV.deaths)}</s></span>${res ? `<span class="wvres">${res}</span>` : ''}</div>
    ${mini && mres ? `<div class="wvmini"><b>☠ ${esc(mini.D.n)}</b><div class="wvmb"><i style="transform:scaleX(${(mini.hp / mini.mhp).toFixed(3)})"></i></div><small>Fase ${mini.ph2 + 1}/3 · resiste ${CAT[mres][0]} ${CAT[mres][1]}</small></div>` : ''}`;
}
function openPick(forced) {
  const e = wvDiv('wvPick'); e.hidden = false; const rec = S.wvRec || {}; e._forced = forced; e._t = forced ? 30 : 0;
  e.innerHTML = `<div class="wvpin"><h2>${forced ? `☠ Día ${Math.floor(S.time / (S.gen.dayLen || DAY_LEN)) + 1}: la Gran Oleada ha llegado` : 'La Gran Oleada'}</h2><p class="mut">Elige tu campo de batalla. 6 oleadas, minijefes y 5 vidas. Si caes, vuelves aquí y puedes regresar.</p>
    <div class="wvcards">${WV_KEYS.map((k, i) => { const A = ARENAS[k], mobs = [...new Set(A.waves.flatMap(w => w.mix.map(m => m[0])))].slice(0, 5); return `<button class="wvcard" data-wva="${k}" style="--c:${A.c}"><span class="ic">${A.i}</span><b>${A.n}</b><small>${A.d}</small><span class="stars">${'★'.repeat(i + 1)}${'☆'.repeat(4 - i)}</span><em>${mobs.map(m => ENEMIES[m].n).join(' · ')}</em>${rec[k] ? '<i class="won">🏆 Superada</i>' : ''}</button>`; }).join('')}</div>
    <div class="wvpf">${forced ? '<span class="mut" id="wvPickT"></span>' : '<button data-wva="x">Cancelar</button>'}</div></div>`;
}
function closePick() { const e = $('wvPick'); if (e) e.hidden = true; }
function showDead() { const e = wvDiv('wvDead'); e.hidden = false; const A = curA(); e.innerHTML = `<div class="wvdin" style="--c:${A.c}"><h2>💀 Has caído en ${esc(A.n)}</h2><p>Te quedan <b>${5 - WV.deaths}</b> vida${5 - WV.deaths === 1 ? '' : 's'}. Si vuelves, la oleada ${WV.wave + 1} empieza de nuevo.</p><div class="lives">${'♥'.repeat(5 - WV.deaths)}<s>${'♥'.repeat(WV.deaths)}</s></div><div class="row gap"><button class="pri" data-wvd="go">⚔ Volver a la arena</button><button data-wvd="quit">Abandonar el evento</button></div></div>`; }
document.addEventListener('click', e => { const b = e.target.closest('[data-wva],[data-wvd]'); if (!b) return;
  if (b.dataset.wva === 'x') closePick(); else if (b.dataset.wva) wvStart(b.dataset.wva);
  if (b.dataset.wvd === 'go') wvReenter(); if (b.dataset.wvd === 'quit') { $('wvDead').hidden = true; WV.st = 'fight'; wvEnd(false, 'quit'); } });
// Ambiente de cada arena (en pantalla): esporas, brasas, nieve, estrellas o chispas, y una viñeta de su color
{ const w0 = drawWeatherScreen; drawWeatherScreen = (ctx, dt) => { w0(ctx, dt); if (!ctx || !inArena()) return; const A = arenaAtTile(Math.floor(S.player.x / T), Math.floor(S.player.y / T)), W = ctx.canvas.width, H = ctx.canvas.height, L = WV.amb;
  if (L.k !== A.k) { L.length = 0; L.k = A.k; for (let i = 0; i < 90; i++) L.push({ x: Math.random() * W, y: Math.random() * H, s: rnd(0.5, 1.5), p: Math.random() * 6 }); }
  const d = dt || 0.016; ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, A.c + '55'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const o of L) { o.p += d;
    if (A.amb === 'snow') { o.y += 40 * o.s * d; o.x += Math.sin(o.p) * 20 * d - 15 * d; ctx.fillStyle = '#ffffffc0'; ctx.fillRect(o.x, o.y, 2 * o.s + 1, 2 * o.s + 1); }
    else if (A.amb === 'embers') { o.y -= 35 * o.s * d; o.x += Math.sin(o.p * 2) * 15 * d; ctx.fillStyle = o.s > 1 ? '#ffb040' : '#ff5a1a'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(o.p * 5); ctx.fillRect(o.x, o.y, 2 * o.s, 2 * o.s); ctx.globalAlpha = 1; }
    else if (A.amb === 'spores') { o.y -= 12 * o.s * d; o.x += Math.sin(o.p) * 10 * d; ctx.fillStyle = '#c8f06080'; ctx.beginPath(); ctx.arc(o.x, o.y, 1.5 * o.s + 0.5, 0, 7); ctx.fill(); }
    else if (A.amb === 'stars') { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(o.p * o.s)); ctx.fillRect(o.x, o.y, o.s > 1.2 ? 2 : 1, o.s > 1.2 ? 2 : 1); ctx.globalAlpha = 1; }
    else { o.y += 160 * o.s * d; o.x += 30 * d; if (o.y > H) { o.y = -10; o.x = Math.random() * W; } ctx.fillStyle = '#ffd060'; ctx.globalAlpha = Math.random() < 0.97 ? 0.6 : 0; ctx.fillRect(o.x, o.y, 1, 4); ctx.globalAlpha = 1; }
    if (o.y > H + 5) o.y = -5; if (o.y < -5) o.y = H + 5; if (o.x > W + 5) o.x = -5; if (o.x < -5) o.x = W + 5; }
  ctx.restore(); }; }
// Portales en el mundo
{ const d0 = drawFxWorld; drawFxWorld = ctx => { d0(ctx); if (!WV.on || !WV.pend.length) return; const c = curA().c; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const o of WV.pend) { const k = o.t / o.life, r = 8 + k * 22; ctx.globalAlpha = 0.5 + 0.5 * k; ctx.strokeStyle = c; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(o.x, o.y, r * (1 - i * 0.25), r * 0.45 * (1 - i * 0.25), 0, o.t * (4 + i * 2), o.t * (4 + i * 2) + 4.2); ctx.stroke(); }
    ctx.fillStyle = '#000'; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.6 * k; ctx.beginPath(); ctx.ellipse(o.x, o.y, r * 0.6, r * 0.27, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'lighter';
    if (Math.random() < 0.7) fxAdd({ x: o.x + rnd(-r, r), y: o.y + rnd(-r, r) * 0.45, vx: 0, vy: rnd(-60, -20), life: 0.5, t: 0, size: 2, col: c, glow: 1, drag: 1 }); }
  ctx.restore(); }; }
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (!S) return; wvTick(fdt); wvHud(); const pk = $('wvPick'); if (pk && !pk.hidden && pk._forced) { pk._t -= fdt; const t = $('wvPickT'); if (t) t.textContent = `Si no eliges, en ${Math.ceil(pk._t)} s te llevará a una al azar`; if (pk._t <= 0) wvStart(WV_KEYS[(Math.random() * WV_KEYS.length) | 0]); } }; }
// ---------- Comando ----------
cmd('oleada', { a: ['wave', 'horda'], u: '/oleada [mutant|infernal|frozen|void|machine|salir|siguiente]', d: 'Fuerza la Gran Oleada: sin nada abre la elección de arena; con un nombre entra directo. «salir» la abandona; «siguiente» salta a la siguiente oleada.', cheat: 1, run(a) {
  const q = normTxt(a[0] || '');
  if (!q) { if (WV.on) return errMsg('Ya estás en la Gran Oleada (usa /oleada salir)'); openPick(false); return 'Elige tu arena.'; }
  if (q === 'salir' || q === 'quit') { if (!WV.on) return errMsg('No hay ninguna oleada en marcha'); wvEnd(false, 'quit'); return 'Has salido de la Gran Oleada.'; }
  if (q === 'siguiente' || q === 'next') { if (!WV.on) return errMsg('No hay ninguna oleada en marcha'); wvClear(); WV.quota = []; WV.miniDone = true; WV.mini = null; return 'Oleada terminada.'; }
  const k = WV_KEYS.find(k => k === q || normTxt(ARENAS[k].n).includes(q)); if (!k) return errMsg('Arenas: ' + WV_KEYS.join(', '));
  if (WV.on) return errMsg('Ya estás en la Gran Oleada'); wvStart(k); return `Entrando en ${ARENAS[k].n}…`; } });
