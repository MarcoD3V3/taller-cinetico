'use strict';
// =====================================================================================
//  Enfermarse, de forma realista: ni a cada rato ni imposible.
//   · Lo del entorno (frío y mojado, polvo, polen, sol…) tiene que durar: cada vez que
//     se dan las condiciones, solo una parte de las veces acaba en enfermedad.
//   · Lo que haces mal (comer crudo, agua del pantano, alcohol…) sigue pasando factura,
//     pero no siempre.
//   · Tras ponerte enfermo, unos minutos de margen antes de otra cosa; al curarte de algo,
//     quedas inmune a eso un buen rato; y como mucho dos enfermedades a la vez.
//   · Junto al fuego o bajo techo no te resfrías ni te salen sabañones.
//   · Empeorar (resfriado → gripe…) tarda bastante más.
// =====================================================================================
const ILL_GAP = 300, ILL_IMMUNE = 900, ILL_MAX = 2;
const ILL_DIRECT = new Set(['comida cruda', 'agua del pantano', 'demasiado alcohol', 'estimulantes de noche', 'demasiado dulce', 'comer demasiado', 'algo muy frío', 'picante', 'alergia al marisco']);
const ILL_WARMOK = new Set(['cold', 'chilblains', 'soreThroat', 'flu']);
for (const k in ILLS) if (ILLS[k].next) ILLS[k].next[1] = Math.round(ILLS[k].next[1] * 2.5);
const illProgress = why => Object.values(ILLS).some(D => D.next && D.next[2] === why);
const illSheltered = () => (typeof _heatV !== 'undefined' && _heatV > 4) || (typeof indoorRegion === 'function' && !!indoorRegion());
{ const c0 = catchIll; catchIll = (id, why) => {
  if (!S || !S.pc || !ILLS[id]) return; const pc = S.pc, now = pc.alive || 0, L2 = pc.ills || {};
  if (illProgress(why)) return c0(id, why); // empeorar no tiene margen: lo dejaste sin tratar
  if (Object.keys(L2).length >= ILL_MAX) return;
  if ((pc.immune || {})[id] > now) return;
  if (ILL_WARMOK.has(id) && illSheltered()) return;
  const direct = ILL_DIRECT.has(why) || id === 'fever';
  if (!direct && now - (pc.illLast || -1e9) < ILL_GAP) return;
  const k = typeof diff === 'function' ? diff() : 1, chance = direct ? clamp(0.55 * k, 0.35, 0.8) : clamp(0.3 * k, 0.18, 0.45);
  if (Math.random() > chance) return;
  const had = !!L2[id]; c0(id, why); if (!had && pc.ills && pc.ills[id]) pc.illLast = now;
}; }
// Inmunidad: al curarte (o pasársete) no vuelves a pillar lo mismo enseguida
function illImmunize(before) { const pc = S.pc, after = pc.ills || {}; for (const id of before) if (!after[id] && !(ILLS[id].next && after[ILLS[id].next[0]])) (pc.immune || (pc.immune = {}))[id] = (pc.alive || 0) + ILL_IMMUNE; }
{ const t0 = illTick; illTick = dt => { const b = S && S.pc && S.pc.ills ? Object.keys(S.pc.ills) : []; t0(dt); if (b.length) illImmunize(b); }; }
{ const c0 = cureIll; cureIll = (id, power, src) => { const b = S && S.pc && S.pc.ills ? Object.keys(S.pc.ills) : []; const r = c0(id, power, src); if (b.length) illImmunize(b); return r; }; }
