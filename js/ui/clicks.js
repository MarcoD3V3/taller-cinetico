'use strict';
// =====================================================================================
//  Clics como en Minecraft:
//   · Clic izquierdo: romper (bloques puestos y terreno), picar, talar y atacar.
//   · Clic derecho: colocar el bloque que llevas, usar lo que señalas (abrir, encender,
//     escalera…) o usar lo que llevas (sembrar, arar, regar…).
//  Por dentro se traduce al botón que entiende el resto del juego («izquierdo antiguo» =
//  usar/colocar, «derecho antiguo» = romper). La caña de pescar y la llave inglesa van igual que antes.
// =====================================================================================
const _clk = new Map(); // botón físico → botón que se le pasó al juego
function clkVirtual(e) {
  if (e.button !== 0 && e.button !== 2) return e.button;
  const id = heldId(), b = at(mouse.tx, mouse.ty), sel = selectedBlock();
  if (heldRod() || id === 'wrench' || id === 'grapple') return e.button;
  if (e.button === 0) {
    // Armas, o un enemigo bajo el cursor: atacar (como antes)
    const mw = mouseWorld(); if ((typeof WEAPONS !== 'undefined' && WEAPONS[id]) || nearestFoe(mw.x, mw.y, 30)) return 0;
    return b || sel ? 2 : 0;        // romper lo puesto (o picar el terreno aunque lleves un bloque)
  }
  // Clic derecho
  if (b && !(sel && e.shiftKey)) return 'use'; // abrir / usar el bloque señalado (Shift: colocar al lado igualmente)
  if (!sel && ((TOOLS[id] && TOOLS[id].kind !== 'util') || (typeof WEAPONS !== 'undefined' && WEAPONS[id]))) return 'use'; // con pico o arma, el derecho no pica: usa
  return 0;                                    // colocar el bloque o usar lo que llevas
}
cv.addEventListener('mousedown', e => {
  if (e.__clk || !S || ui.open || (e.button !== 0 && e.button !== 2)) return;
  mouse.x = e.clientX; mouse.y = e.clientY; updateHover();
  const v = clkVirtual(e); if (v === e.button) { _clk.set(e.button, v); return; }
  e.stopImmediatePropagation(); e.preventDefault();
  if (v === 'use') { _clk.set(e.button, null); interact(false, e.altKey); return; }
  _clk.set(e.button, v);
  const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: v, clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey }); ev.__clk = 1; cv.dispatchEvent(ev);
}, true);
addEventListener('mouseup', e => {
  if (e.__clk || !_clk.has(e.button)) return; const v = _clk.get(e.button); _clk.delete(e.button);
  if (v === e.button) return; e.stopImmediatePropagation();
  if (v === null) return;
  const ev = new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: v, clientX: e.clientX, clientY: e.clientY }); ev.__clk = 1; dispatchEvent(ev);
}, true);
