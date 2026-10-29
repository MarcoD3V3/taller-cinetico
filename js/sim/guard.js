'use strict';
// =====================================================================================
//  Red de seguridad del bucle del juego: si algo falla en un fotograma (un dibujo, una
//  criatura, un efecto…), el juego no se congela. Se apunta el error (una vez por tipo),
//  se avisa con discreción y el siguiente fotograma sigue como si nada.
// =====================================================================================
const GUARD = { seen: new Set(), n: 0, last: '' };
{ const f0 = frame; frame = now => {
  try { f0(now); }
  catch (e) {
    const k = String(e && e.message) + '|' + String(e && e.stack || '').split('\n')[1];
    if (!GUARD.seen.has(k)) { GUARD.seen.add(k); GUARD.last = String(e && e.stack || e); console.error('Fallo en un fotograma (el juego sigue):', e); if (typeof toastErr === 'function' && GUARD.n++ < 3) toastErr('⚠ Algo falló en el dibujo, pero el juego sigue. Si se repite, avisa.'); }
    // limpiar lo que más suele romperse para que no falle en bucle
    try { if (typeof FX !== 'undefined') FX.length = Math.min(FX.length, 40); } catch (e2) { }
    requestAnimationFrame(frame);
  }
}; }
