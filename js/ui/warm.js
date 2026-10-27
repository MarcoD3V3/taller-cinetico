'use strict';
// Al entrar en un mundo, cuando el navegador está libre, se prepara por adelantado el recetario
// (la primera vez que se abría tenía que dibujar todos sus iconos y tardaba un momento).
{ const e0 = enterWorld; enterWorld = (...a) => { const r = e0(...a);
  const idle = window.requestIdleCallback || (f => setTimeout(f, 600));
  idle(() => { try { if (S && ui.open !== 'book' && $('mBook').hidden) renderBook(); } catch (e) { } }, { timeout: 5000 });
  return r; }; }
