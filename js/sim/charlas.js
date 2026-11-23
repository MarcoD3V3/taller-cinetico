'use strict';
// =====================================================================================
//  Charlas de los aldeanos: bocadillos de píxeles encima de la cabeza.
//   · Dos aldeanos que están cerca a veces charlan: uno dice algo y el otro contesta (dos o tres frases).
//   · Te saludan al pasar a su lado (según el aprecio que te tienen y la hora).
//   · Lo que dicen depende de su oficio, de la hora, del tiempo, de la estación y de lo que esté pasando
//     (incendio, meteoritos, luna de sangre…).
//  Solo es ambiente: no cambia nada de la partida.
// =====================================================================================
const CH_B = []; // bocadillos { n, txt, t, d }
let _chT = 0;
const CH_ROL = {
  farmer: ['Este año la cosecha viene buena.', 'Las zanahorias no crecen solas.', 'Hay que regar antes del mediodía.', 'Los cuervos se comieron medio trigal.'],
  smith: ['El yunque no descansa.', 'Necesito más carbón para la fragua.', 'Esta espada pide un buen temple.', '¿Has visto el hierro de la mina?'],
  merchant: ['¡Buen género, buen precio!', 'Hoy vendo barato, no se lo digas a nadie.', 'Los caminos están peligrosos.', 'Me llegó tela del sur.'],
  guard: ['Todo tranquilo por aquí.', 'Anoche oí algo en el bosque.', 'Nadie pasa sin que yo lo vea.', 'Mantén el arma a mano.'],
  miner: ['Abajo hay vetas que brillan solas.', 'Cuidado con los murciélagos.', 'Me duele la espalda de tanto picar.', 'Huele a gas en la galería norte.'],
  elder: ['En mis tiempos esto era bosque.', 'La historia de este lugar es larga.', 'Escucha a los mayores, joven.', 'Las piedras recuerdan más que nosotros.'],
  child: ['¡Pilla, pilla!', '¿Me enseñas tu espada?', '¡Vi una luciérnaga gigante!', '¡Yo de mayor seré aventurero!'],
  walker: ['¡Qué buen día!', '¿Te has enterado?', 'Voy a la plaza un momento.', 'Mi vecino ronca como un oso.'],
};
const CH_RESP = ['¡Ja, ja! Eso dicen.', 'No me digas…', 'Tienes razón.', 'Ya, ya…', '¡Qué cosas!', 'Habrá que verlo.', 'Eso mismo pensaba yo.', '¿En serio?'];
function chFrase(n) {
  const h = typeof folkHour === 'function' ? folkHour() : 12, L = [...(CH_ROL[n.kid ? 'child' : n.role] || CH_ROL.walker)];
  if (h < 9) L.push('Buenos días, vecino.', 'Qué sueño tengo todavía.'); else if (h > 19) L.push('Ya va siendo hora de cenar.', 'Pronto oscurece.');
  if (typeof WX !== 'undefined') { if (WX.type === 'rain' || WX.type === 'storm') L.push('Vaya chaparrón.', 'Con esta lluvia no se puede trabajar.'); if (WX.type === 'snow' || WX.type === 'blizzard') L.push('¡Qué frío hace!', 'La nieve llega hasta las rodillas.'); if (WX.type === 'heat') L.push('Este calor no hay quien lo aguante.'); }
  if (typeof EV !== 'undefined') { if (EV.fuegos && EV.fuegos.size) L.push('¡Hay fuego en el bosque!', 'Ojalá llueva pronto, el bosque arde.'); if (EV.met) L.push('¡Mira el cielo, caen piedras!', 'Dicen que los meteoritos traen metal raro.'); }
  if (typeof _bloodMoon !== 'undefined' && _bloodMoon) L.push('Luna de sangre… cierra bien la puerta.');
  if (typeof seasonInfo === 'function' && S && !S.alwaysDay) { const s = seasonInfo(); if (s.ev) L.push(`¡Hoy es ${s.S.ev}!`); }
  return L[(Math.random() * L.length) | 0];
}
function chSaludo(n) { const rep = typeof repLevel === 'function' ? repLevel() : 0, h = typeof folkHour === 'function' ? folkHour() : 12;
  const base = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const L = rep >= 3 ? [`¡${base}, amigo!`, '¡Mira quién viene!', '¡Nuestro héroe!'] : rep >= 1 ? [`${base}.`, '¡Hola otra vez!', '¿Qué tal te va?'] : [`${base}, forastero.`, 'Hola…', '¿Buscas algo?'];
  return n.kid ? '¡Hola!' : L[(Math.random() * L.length) | 0]; }
const chHabla = (n, txt, retraso = 0) => setTimeout(() => { if (!n) return; for (let i = CH_B.length - 1; i >= 0; i--) if (CH_B[i].n === n) CH_B.splice(i, 1); CH_B.push({ n, txt, t: 0, d: 2.4 + txt.length * 0.05 }); }, retraso);

function chTick(dt) {
  if (!S || !S.player || typeof FOLK === 'undefined' || !FOLK.size) { CH_B.length = 0; return; }
  for (let i = CH_B.length - 1; i >= 0; i--) if ((CH_B[i].t += dt) > CH_B[i].d) CH_B.splice(i, 1);
  _chT -= dt; if (_chT > 0) return; _chT = 0.8;
  const p = S.player, cerca = []; for (const list of FOLK.values()) for (const n of list) if (Math.hypot(n.x - p.x, n.y - p.y) < 18 * T) cerca.push(n);
  const ocupado = n => CH_B.some(b => b.n === n) || (n._chHasta || 0) > performance.now();
  for (const n of cerca) { // saludo al pasar a su lado
    if (Math.hypot(n.x - p.x, n.y - p.y) < 2.6 * T && !ocupado(n) && (n._saludo || 0) < performance.now()) { n._saludo = performance.now() + 90000; chHabla(n, chSaludo(n)); n._chHasta = performance.now() + 3000; break; } } // uno cada vez
  if (Math.random() < 0.3) { const pares = []; for (const a of cerca) { if (ocupado(a)) continue; const b = cerca.find(o => o !== a && !ocupado(o) && Math.hypot(o.x - a.x, o.y - a.y) < 3 * T); if (b) pares.push([a, b]); } // una charla entre dos que estén juntos
    if (!pares.length) return; const [a, b] = pares[(Math.random() * pares.length) | 0];
    const ahora = performance.now(); a._chHasta = b._chHasta = ahora + 9000;
    chHabla(a, chFrase(a)); chHabla(b, CH_RESP[(Math.random() * CH_RESP.length) | 0], 2600); if (Math.random() < 0.5) chHabla(a, chFrase(a), 5200); }
}
// Bocadillo de píxeles: marco oscuro, fondo claro, piquito hacia la cabeza; aparece con un pequeño salto
function chDibujo(ctx) {
  if (!CH_B.length) return; const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  ctx.font = 'bold 7px "Taller Pixel","Chakra Petch",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const b of CH_B) { const n = b.n, w = Math.ceil(ctx.measureText(b.txt).width) + 8, h = 11, X = Math.round(n.x - w / 2), sube = b.t < 0.12 ? Math.round((0.12 - b.t) * 30) : 0, Y = Math.round(n.y - (n.kid ? 46 : 60)) + sube, a = Math.min(1, (b.d - b.t) * 3);
    ctx.globalAlpha = a; ctx.fillStyle = '#1a1214'; ctx.fillRect(X + 1, Y - 1, w - 2, h + 2); ctx.fillRect(X, Y, w, h);                 // marco (esquinas redondeadas)
    ctx.fillStyle = '#f6eedc'; ctx.fillRect(X + 1, Y + 1, w - 2, h - 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 2, Y + 1, w - 4, 1);  // fondo y brillo
    ctx.fillStyle = '#d8ccb0'; ctx.fillRect(X + 2, Y + h - 2, w - 4, 1);                                                             // sombra de abajo
    ctx.fillStyle = '#1a1214'; ctx.fillRect(Math.round(n.x) - 1, Y + h, 3, 1); ctx.fillRect(Math.round(n.x), Y + h + 1, 1, 1);         // piquito
    ctx.fillStyle = '#f6eedc'; ctx.fillRect(Math.round(n.x), Y + h - 1, 1, 1);
    ctx.fillStyle = '#2a1e1a'; ctx.fillText(b.txt, Math.round(n.x), Y + h / 2 + 0.5); }
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic'; ctx.imageSmoothingEnabled = sm;
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); try { chTick(fdt); } catch (e) { console.warn(e); } }; }
{ const d0 = drawCombat; drawCombat = (ctx, ...a) => { const r = d0(ctx, ...a); try { chDibujo(ctx); } catch (e) { console.warn(e); } return r; }; }
