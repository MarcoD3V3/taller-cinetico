'use strict';
// Utilidades compartidas: direcciones, ruido, diccionarios de objetos, formato.
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // 0 Este, 1 Sur, 2 Oeste, 3 Norte
const OPP = d => (d + 2) & 3;
const DIR_N = ['Este', 'Sur', 'Oeste', 'Norte'];
const DIR_A = ['E', 'S', 'O', 'N'];

function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) {
  let t = 0, a = .5, f = 1, n = 0;
  for (let i = 0; i < 4; i++) { t += vnoise(x * f, y * f, s + i * 17) * a; n += a; a *= .5; f *= 2; }
  return t / n;
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function total(o) { let t = 0; for (const k in o) t += o[k]; return t; }
function has(inv, req) { for (const k in req) if ((inv[k] || 0) < req[k]) return false; return true; }
function take(inv, req) { for (const k in req) { inv[k] -= req[k]; if (inv[k] <= 0) delete inv[k]; } }
function give(inv, add, m = 1) { for (const k in add) inv[k] = (inv[k] || 0) + add[k] * m; }
function dictAdd(o, k, n) { const v = (o[k] || 0) + n; if (v <= 0) delete o[k]; else o[k] = v; }
function firstKey(o, filter) { for (const k in o) if (o[k] > 0 && (!filter || filter === k)) return k; return null; }
function fmt(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (a >= 1e4) return Math.round(n / 1e3) + 'k';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return (Math.round(n * 10) / 10).toString();
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
