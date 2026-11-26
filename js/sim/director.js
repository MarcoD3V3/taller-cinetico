'use strict';
// =====================================================================================
//  Director de eventos: un solo sitio decide CUÁNDO puede pasar cada cosa, para que el mundo tenga ritmo
//  (calma → algo importante → descanso) y no salga todo junto ni al azar.
//
//  Tipos de evento
//   · Grandes: Coloso, jefe de la luna de sangre, lluvia de meteoritos, incendio forestal. Solo uno a la vez.
//   · Medianos: migraciones de manadas. No coinciden con un grande ni con una tormenta.
//   · Del calendario: luna de sangre (cada 5 noches) y el evento de cada estación (día 4). Tienen prioridad: ese
//     día no se lanza ningún grande al azar.
//  Reglas
//   · Los 2 primeros días son tranquilos: nada grande al azar (deja aprender a jugar).
//   · Entre dos eventos grandes pasa al menos día y cuarto; entre medianos, medio día.
//   · Después de un evento grande hay un respiro: tiempo tranquilo (sin tormentas) durante un tercio de día.
//   · El tiempo dura más: un cielo despejado de 6 a 12 min, lluvia o nieve de 3,5 a 6, tormenta de 2 a 3,5.
//     Tras una tormenta no vuelve a haber otra hasta pasados 2 días. Durante un evento grande no hay tormentas.
//   · El Coloso (cada 6 días) espera si coincide con otro grande o con el evento de la estación: sale en cuanto
//     se pueda ese día o el siguiente.
//   · Si coincide con un Coloso o con meteoritos, la luna de sangre se pasa a la noche siguiente.
//  Todo se guarda con la partida (S.dir).
// =====================================================================================
const DIR_GAP_GRANDE = 1.25, DIR_GAP_MEDIO = 0.5, DIR_RESPIRO = 0.33, DIR_CALMA_INICIAL = 2, DIR_SIN_TORMENTA = 2; // en días
const dirD = () => S.dir || (S.dir = { ultGrande: -1e9, ultMedio: -1e9, finGrande: -1e9, ultTormenta: -1e9, lunaPend: false });
const dirDia = () => (S.gen.dayLen || DAY_LEN);
const dirHoy = () => Math.floor(S.time / dirDia()) + 1;
// ¿Qué evento grande está en marcha ahora? (o null)
function dirActivo() {
  if (!S) return null;
  if (typeof BOSS !== 'undefined' && BOSS) return 'jefe';
  if (S.wb && S.wb.st && S.wb.st !== 'wait') return 'coloso';
  if (typeof EV !== 'undefined') { if (EV.met) return 'meteoritos'; if (EV.fuegos && EV.fuegos.size) return 'incendio'; }
  if (typeof _bloodMoon !== 'undefined' && _bloodMoon) return 'luna';
  return null;
}
const dirDiaDeEstacion = () => typeof seasonInfo === 'function' && !S.alwaysDay && seasonInfo().ev;
// ¿Puede empezar ahora un evento de este tipo?  ('grande' | 'medio' | 'coloso')
function dirPuede(tipo) {
  if (!S || S.alwaysDay) return false; const D = dirD(), dia = dirDia(), act = dirActivo();
  if (tipo === 'medio') return !act && S.time - D.ultMedio > DIR_GAP_MEDIO * dia && !(WX && /storm|blizzard|sandstorm/.test(WX.type));
  if (act) return false;
  if (S.time - D.ultGrande < DIR_GAP_GRANDE * dia) return false;
  if (tipo === 'coloso') return !dirDiaDeEstacion();
  if (dirHoy() <= DIR_CALMA_INICIAL || dirDiaDeEstacion()) return false;
  return true;
}
function dirMarca(tipo) { if (!S) return; const D = dirD(); if (tipo === 'medio') D.ultMedio = S.time; else D.ultGrande = S.time; }
// Cuando un evento grande termina empieza el respiro
let _dirAntes = null;
function dirTick() {
  if (!S || S.alwaysDay) return; const a = dirActivo(), D = dirD();
  if (_dirAntes && !a) { D.finGrande = S.time; D.ultGrande = S.time; } // el hueco hasta el siguiente cuenta desde que ACABA
  if (a && !_dirAntes) D.ultGrande = S.time;                                // los que empiezan solos (calendario) también cuentan
  _dirAntes = a;
}
// ---------- Tiempo atmosférico con más calma ----------
const DIR_SEVERO = ['storm', 'blizzard', 'sandstorm', 'ashfall'];
{ const w0 = wxWeights; wxWeights = key => { const w = { ...w0(key) }; if (!S || S.alwaysDay) return w; const D = dirD(), dia = dirDia();
  const calma = dirActivo() || S.time - D.finGrande < DIR_RESPIRO * dia || S.time - D.ultTormenta < DIR_SIN_TORMENTA * dia || dirHoy() <= 1;
  if (calma) for (const k of DIR_SEVERO) delete w[k];
  if (w.clear !== undefined) w.clear *= 1.6; // más días despejados
  return w; }; }
{ const t0 = weatherTick; weatherTick = dt => { const antes = WX.type; t0(dt); if (!S || WX.type === antes) return;
  const r = (a, b) => a + Math.random() * (b - a), ty = WX.type; // al cambiar el tiempo, cuánto dura
  WX.t = ty === 'clear' ? r(360, 720) : DIR_SEVERO.includes(ty) ? r(120, 210) : /rain|snow/.test(ty) ? r(210, 360) : r(180, 330);
  if (DIR_SEVERO.includes(ty)) dirD().ultTormenta = S.time; }; }
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); try { dirTick(); } catch (e) { console.warn(e); } }; }
// Para ver cómo va: /director
if (typeof cmd === 'function') cmd('director', { u: '/director', d: 'Muestra qué evento hay en marcha y cuándo podrá haber otro.', run() {
  if (!S || S.alwaysDay) return 'En este mundo no hay eventos (siempre de día).'; const D = dirD(), dia = dirDia(), falta = Math.max(0, DIR_GAP_GRANDE * dia - (S.time - D.ultGrande));
  return `Ahora: ${dirActivo() || 'nada'} · próximo evento grande posible en ${Math.ceil(falta / 60)} min · tiempo: ${WX_T[WX.type] ? WX_T[WX.type].n : WX.type} (${Math.ceil(WX.t / 60)} min más)`; } });
