'use strict';
// =====================================================================================
//  Modo creativo: lo que USAS no se gasta (flechas, balas, bombas, comida, bebida, pociones,
//  pergaminos, semillas, abonos, cebo, vendas, bloques que colocas, cubetas…), ni se
//  desgastan las herramientas y armas. Pero MOVER cosas sigue siendo real (de la mochila a un
//  cofre, una máquina, un banco o el Núcleo): si no, al meter algo se quedaba también en la
//  mochila y se duplicaba.
//  Cómo: cada acción de «usar» abre un ámbito en el que invTake no quita nada; y lo que se gasta
//  restando a mano de la ranura (comer, beber…) se repone al terminar.
// =====================================================================================
let _creUse = 0;
{ const t0 = invTake; invTake = (id, n) => S && S.creative && _creUse > 0 ? n : t0(id, n); }
const creScope = f => (...a) => { if (!S || !S.creative) return f(...a); _creUse++; try { return f(...a); } finally { _creUse--; } };
// Usar con F, atacar/disparar/lanzar, hechizos, picar y poner suelo, colocar bloques, cubetas,
// tejados, plantar y abonar, curas, pesca
useItem = creScope(useItem); playerAttack = creScope(playerAttack); updateMining = creScope(updateMining); tryPlace = creScope(tryPlace);
if (typeof castSpell === 'function') castSpell = creScope(castSpell);
if (typeof bucketAct === 'function') bucketAct = creScope(bucketAct);
if (typeof roofPut === 'function') roofPut = creScope(roofPut);
if (typeof farmAction === 'function') farmAction = creScope(farmAction);
if (typeof plantAt === 'function') plantAt = creScope(plantAt);
if (typeof applyProc === 'function') applyProc = creScope(applyProc);
if (typeof fishLand === 'function') fishLand = creScope(fishLand);
// Lo que se gasta restando directamente de la ranura (comer, beber, pociones, consumibles):
// se repone la ranura tal como estaba; si en su sitio quedó otra cosa (p. ej. la cubeta vacía), va a la mochila
{ const u0 = useItem; useItem = () => {
  if (!S || !S.creative) return u0(); const i = S.sel, s = S.inv[i], snap = s && { ...s };
  const r = u0(); if (!snap) return r;
  const cur = S.inv[i];
  if (!cur || (cur.id === snap.id && cur.n < snap.n)) S.inv[i] = snap;
  else if (cur.id !== snap.id) { S.inv[i] = snap; invAdd(cur.id, cur.n); }
  invVersion++; return r;
}; }
// Sin desgaste
{ const w0 = wearItem; wearItem = (id, n, where) => S && S.creative ? undefined : w0(id, n, where); }
// La pista del modo
{ const m0 = CMDS.modo && CMDS.modo.run; if (CMDS.modo) for (const k in CMDS) if (CMDS[k] === CMDS.modo || CMDS[k].alias === 'modo') CMDS[k].d = 'Creativo: sacas lo que quieras del recetario (B), nada de lo que usas se gasta ni se desgasta, sin daño y rompes al instante.'; void m0; }
