'use strict';
// =====================================================================================
//  Computadoras: un lenguaje sencillo en español (con alias en inglés) que se ejecuta
//  línea a línea en cada tick de redstone. Sin eval: el código se compila a funciones.
//  Lados: norte, sur, este, oeste (n, s, e, o). Comentarios con # o //.
// =====================================================================================
const SIDE = { este: 0, e: 0, east: 0, sur: 1, s: 1, south: 1, oeste: 2, o: 2, w: 2, west: 2, norte: 3, n: 3, north: 3 };
const COMP_HELP = [
  ['salida LADO valor', 'Pone redstone (0-15) en un lado. Ej.: salida este 15'],
  ['pulso LADO', 'Un pulso corto de redstone'],
  ['esperar segundos', 'Pausa. Ej.: esperar 0.5'],
  ['x = expresión', 'Guarda un valor en una variable'],
  ['si condición ir etiqueta', 'Salta si se cumple. Ej.: si entrada(norte) > 0 ir alarma'],
  ['ir etiqueta', 'Salta siempre'],
  ['etiqueta:', 'Marca una línea para saltar a ella'],
  ['mostrar expresión o "texto"', 'Escribe en la consola'],
  ['avisar "texto"', 'Muestra un aviso en tu pantalla'],
  ['maquina LADO encender|apagar', 'Enciende o apaga el bloque de ese lado'],
  ['pantalla LADO valor', 'Escribe un número en una pantalla vecina'],
  ['canal N valor', 'Emite por radio en un canal (1-16)'],
  ['sonar', 'Pitido'],
  ['fin', 'Detiene el programa'],
  ['Funciones', 'entrada(lado) · contar(lado) · nivel(lado) · energia(lado) · rpm(lado) · trabajando(lado) · enemigos() · dia() · tiempo() · azar(n) · canal(n) · min(a,b) · max(a,b)'],
  ['Operadores', '+ - * / %  ·  < > <= >= == !=  ·  y  o  no'],
];
const COMP_EX = {
  'Intermitente': 'inicio:\nsalida este 15\nesperar 0.5\nsalida este 0\nesperar 0.5\nir inicio',
  'Alarma de enemigos': '# Sirena al este, avisa si hay enemigos cerca\nbucle:\nsi enemigos() > 0 ir peligro\nsalida este 0\nesperar 1\nir bucle\npeligro:\nsalida este 15\navisar "¡Enemigos cerca de la base!"\nesperar 5\nir bucle',
  'Horno inteligente': '# Enciende el horno del norte solo si su cofre del sur tiene algo\nbucle:\nsi contar(sur) > 0 ir on\nmaquina norte apagar\nesperar 2\nir bucle\non:\nmaquina norte encender\nesperar 2\nir bucle',
  'Medidor de energía': '# Muestra el % de la batería del oeste en la pantalla del este\nbucle:\nx = energia(oeste)\npantalla este x\nsi x < 20 ir baja\nsalida sur 0\nesperar 1\nir bucle\nbaja:\nsalida sur 15\nmostrar "Batería baja: " + x\nesperar 1\nir bucle',
  'Contador': 'n = 0\nbucle:\nsi entrada(norte) > 0 ir sube\nesperar 0.1\nir bucle\nsube:\nn = n + 1\npantalla este n\nmostrar "Pulsos: " + n\nesperar 0.3\nir bucle',
  'Fábrica por turnos': '# Reparte el trabajo entre 3 máquinas cada 10 s\nbucle:\nmaquina norte encender\nmaquina este apagar\nmaquina sur apagar\nesperar 10\nmaquina norte apagar\nmaquina este encender\nesperar 10\nmaquina este apagar\nmaquina sur encender\nesperar 10\nir bucle',
};
// ---------- Expresiones ----------
function tokenize(s) {
  const out = [], re = /\s*(\d+\.?\d*|"[^"]*"|[A-Za-záéíóúñÁÉÍÓÚÑ_][\wáéíóúñÁÉÍÓÚÑ]*|<=|>=|==|!=|[-+*/%()<>,])/y; let m;
  while (re.lastIndex < s.length) { const i = re.lastIndex; m = re.exec(s); if (!m) { if (/^\s*$/.test(s.slice(i))) break; throw new Error('No entiendo: ' + s.slice(i, i + 8)); } out.push(m[1]); }
  return out;
}
function compileExpr(src, b) {
  const tk = tokenize(src); let i = 0;
  const peek = () => tk[i], next = () => tk[i++], kw = w => peek() && peek().toLowerCase() === w;
  const prim = () => {
    const t = next(); if (t === undefined) throw new Error('Falta un valor');
    if (t === '(') { const e = or(); if (next() !== ')') throw new Error('Falta )'); return e; }
    if (t === '-') { const e = prim(); return () => -e(); }
    if (/^\d/.test(t)) { const v = +t; return () => v; }
    if (t[0] === '"') { const v = t.slice(1, -1); return () => v; }
    const l = t.toLowerCase();
    if (l === 'no' || l === 'not') { const e = prim(); return () => e() ? 0 : 1; }
    if (peek() === '(') {
      next(); const args = []; if (peek() !== ')') { args.push(or()); while (peek() === ',') { next(); args.push(or()); } } if (next() !== ')') throw new Error('Falta )');
      const fn = COMP_FN[l]; if (!fn) throw new Error('Función desconocida: ' + t);
      return () => fn(b, ...args.map(a => a()));
    }
    if (SIDE[l] !== undefined) { const v = SIDE[l]; return () => v; }
    return () => (b.vars[l] ?? 0);
  };
  const mul = () => { let a = prim(); while (['*', '/', '%'].includes(peek())) { const o = next(), x = a, y = prim(); a = o === '*' ? () => x() * y() : o === '/' ? () => { const d = y(); return d ? x() / d : 0; } : () => x() % (y() || 1); } return a; };
  const add = () => { let a = mul(); while (peek() === '+' || peek() === '-') { const o = next(), x = a, y = mul(); a = o === '+' ? () => { const p = x(), q = y(); return typeof p === 'string' || typeof q === 'string' ? String(p) + String(q) : p + q; } : () => x() - y(); } return a; };
  const cmp = () => { let a = add(); while (['<', '>', '<=', '>=', '==', '!='].includes(peek())) { const o = next(), x = a, y = add(); a = { '<': () => +(x() < y()), '>': () => +(x() > y()), '<=': () => +(x() <= y()), '>=': () => +(x() >= y()), '==': () => +(x() == y()), '!=': () => +(x() != y()) }[o]; } return a; };
  const and = () => { let a = cmp(); while (kw('y') || kw('and')) { next(); const x = a, y = cmp(); a = () => +(x() && y()); } return a; };
  const or = () => { let a = and(); while (kw('o') || kw('or')) { next(); const x = a, y = and(); a = () => +(x() || y()); } return a; };
  const e = or(); if (i < tk.length) throw new Error('Sobra: ' + tk.slice(i).join(' ')); return e;
}
const nb = (b, s) => at(b.x + DX[s & 3], b.y + DY[s & 3]);
const COMP_FN = {
  entrada: (b, s) => inputFrom(b, s & 3), in: (b, s) => inputFrom(b, s & 3),
  contar: (b, s) => { const t = nb(b, s); if (!t) return 0; if (t.slots) return t.slots.reduce((a, x) => a + (x ? x.n : 0), 0); if (t.inv) return total(t.inv) + total(t.out || {}); if (t.items) return t.items.length; if (t.item) return t.item.n; return 0; },
  nivel: (b, s) => { const t = nb(b, s); return t && t.tanks ? Math.round(tankFrac(t) * 100) : 0; },
  energia: (b, s) => { const t = nb(b, s); return t && BD[t.type].pw ? Math.round((t.E || 0) / BD[t.type].pw.cap * 100) : 0; },
  rpm: (b, s) => { const t = nb(b, s); return t ? Math.round(Math.abs(t.rpm || 0)) : 0; },
  trabajando: (b, s) => { const t = nb(b, s); return t && (t.cur >= 0 || t.prog > 0) && !t.off ? 1 : 0; },
  enemigos: b => FOES.filter(f => Math.abs(f.x / T - b.x) < 8 && Math.abs(f.y / T - b.y) < 8).length,
  dia: () => daylight() > 0.5 ? 1 : 0, tiempo: () => Math.floor(S.time), azar: (b, n) => Math.floor(Math.random() * (n || 2)),
  canal: (b, n) => channels[clamp(n | 0, 0, 16)] || 0, min: (b, x, y) => Math.min(x, y), max: (b, x, y) => Math.max(x, y),
};
// ---------- Compilación de un programa ----------
function compileProgram(b) {
  const lines = (b.code || '').split('\n'), prog = [], labels = {};
  lines.forEach((raw, ln) => {
    const line = raw.replace(/(#|\/\/).*$/, '').trim(); if (!line) return;
    const lab = line.match(/^([\wáéíóúñ]+):$/i) || line.match(/^:([\wáéíóúñ]+)$/i); if (lab) { labels[lab[1].toLowerCase()] = prog.length; return; }
    const [w0, ...rest] = line.split(/\s+/), cmd = w0.toLowerCase(), arg = rest.join(' ');
    const side = t => { const v = SIDE[(t || '').toLowerCase()]; if (v === undefined) throw new Error(`Línea ${ln + 1}: lado desconocido "${t}" (norte, sur, este, oeste)`); return v; };
    try {
      const asg = line.match(/^(?:var\s+|set\s+)?([a-záéíóúñ_][\wáéíóúñ]*)\s*=\s*(.+)$/i);
      if (asg && !['si', 'if'].includes(cmd)) { const n = asg[1].toLowerCase(), e = compileExpr(asg[2], b); prog.push({ ln, f: () => { b.vars[n] = e(); } }); return; }
      switch (cmd) {
        case 'salida': case 'out': { const s = side(rest[0]), e = compileExpr(rest.slice(1).join(' '), b); prog.push({ ln, f: () => { b.so[s] = clamp(Math.round(+e() || 0), 0, 15); } }); break; }
        case 'pulso': case 'pulse': { const s = side(rest[0]); prog.push({ ln, f: () => { b.so[s] = 15; b.pulse = b.pulse || [0, 0, 0, 0]; b.pulse[s] = 3; } }); break; }
        case 'esperar': case 'wait': { const e = compileExpr(arg || '0.05', b); prog.push({ ln, f: () => { b.wait = Math.max(0.05, +e() || 0) - 0.05; return 'yield'; } }); break; }
        case 'si': case 'if': { const m = arg.match(/^(.+?)\s+(?:ir|goto|entonces ir)\s+([\wáéíóúñ]+)$/i); if (!m) throw new Error('Usa: si condición ir etiqueta'); const e = compileExpr(m[1], b), l = m[2].toLowerCase(); prog.push({ ln, f: () => e() ? { go: l } : null }); break; }
        case 'ir': case 'goto': { const l = arg.toLowerCase(); prog.push({ ln, f: () => ({ go: l }) }); break; }
        case 'mostrar': case 'print': { const e = compileExpr(arg, b); prog.push({ ln, f: () => compLog(b, String(e())) }); break; }
        case 'avisar': case 'alert': { const e = compileExpr(arg, b); prog.push({ ln, f: () => { toast('💻 ' + e()); sfx('beep'); } }); break; }
        case 'maquina': case 'máquina': case 'machine': { const s = side(rest[0]), on = /^(encender|on|1)$/i.test(rest[1] || ''); prog.push({ ln, f: () => { const t = nb(b, s); if (t && t.type !== 'core') t.off = !on; } }); break; }
        case 'pantalla': case 'display': { const s = side(rest[0]), e = compileExpr(rest.slice(1).join(' '), b); prog.push({ ln, f: () => { const t = nb(b, s); if (t && t.type === 'display') t.num = e(); } }); break; }
        case 'canal': case 'channel': { const c = compileExpr(rest[0], b), e = compileExpr(rest.slice(1).join(' '), b); prog.push({ ln, f: () => { b.chan = b.chan || {}; b.chan[clamp(c() | 0, 1, 16)] = clamp(+e() | 0, 0, 15); } }); break; }
        case 'sonar': case 'beep': prog.push({ ln, f: () => { sfx('beep'); } }); break;
        case 'fin': case 'end': prog.push({ ln, f: () => ({ end: 1 }) }); break;
        default: throw new Error(`Comando desconocido "${w0}"`);
      }
    } catch (e) { throw new Error(e.message.startsWith('Línea') ? e.message : `Línea ${ln + 1}: ${e.message}`); }
  });
  for (const p of prog) p.labels = labels;
  return { prog, labels };
}
function compLog(b, s) { (b.log || (b.log = [])).push(s); if (b.log.length > 40) b.log.shift(); if (ui.open === 'comp' && _compB === b) refreshComp(); }
function compStart(b) {
  try { b._c = compileProgram(b); } catch (e) { b.run = false; b.err = e.message; compLog(b, '⚠ ' + e.message); return false; }
  b.vars = {}; b.pc = 0; b.wait = 0; b.err = ''; b.run = true; b.so = [0, 0, 0, 0]; b.chan = {}; compLog(b, '▶ Programa en marcha'); return true;
}
function compStop(b) { b.run = false; b.so = [0, 0, 0, 0]; b.chan = {}; compLog(b, '■ Detenido'); dirty.logic = true; }
// Se llama en cada tick de lógica: devuelve un número que cambia si cambia alguna salida
function compStep(b, dt) {
  if (!b.so) b.so = [0, 0, 0, 0];
  if (b.pulse) for (let s = 0; s < 4; s++) if (b.pulse[s] > 0 && --b.pulse[s] === 0) b.so[s] = 0;
  if (b.run && !b._c) compStart(b); // tras cargar la partida
  if (b.run && b._c) {
    if (b.wait > 0) b.wait -= dt;
    if (b.wait <= 1e-6) {
      const { prog, labels } = b._c;
      for (let n = 0; n < 60; n++) {
        if (b.pc >= prog.length) { b.pc = 0; b.wait = 0.05; break; }
        const ins = prog[b.pc++]; let r;
        try { r = ins.f(); } catch (e) { b.err = `Línea ${ins.ln + 1}: ${e.message}`; compLog(b, '⚠ ' + b.err); b.run = false; break; }
        if (r === 'yield') break;
        if (r && r.end) { compStop(b); break; }
        if (r && r.go) { if (labels[r.go] === undefined) { b.err = `Línea ${ins.ln + 1}: no existe la etiqueta "${r.go}"`; compLog(b, '⚠ ' + b.err); b.run = false; break; } b.pc = labels[r.go]; }
        if (n === 59) b.wait = 0.05; // evita bucles infinitos sin espera
      }
    }
  }
  return b.so[0] + b.so[1] * 16 + b.so[2] * 256 + b.so[3] * 4096;
}
// ---------- Terminal ----------
let _compB = null;
function openComp(b) {
  _compB = b; openModal('comp');
  if (b.code === undefined) b.code = COMP_EX['Intermitente'];
  $('compBody').innerHTML = `<header><h2>💻 Computadora <span class="mut small">(${b.x}, ${b.y})</span></h2><div class="row gap"><select id="compEx"><option value="">Ejemplos…</option>${Object.keys(COMP_EX).map(k => `<option>${esc(k)}</option>`).join('')}</select><button id="compRun" class="pri"></button><button data-close>Cerrar <kbd>Esc</kbd></button></div></header>
  <div class="compgrid"><div><textarea id="compCode" spellcheck="false"></textarea><div class="compio" id="compIO"></div><pre id="compLog"></pre></div><div class="comphelp">${COMP_HELP.map(([a, d]) => `<div><code>${esc(a)}</code><span>${esc(d)}</span></div>`).join('')}<p class="mut small">Lados: norte, sur, este, oeste. La computadora emite redstone por cada lado y lee la de sus vecinos. Conecta pantallas, sirenas, lámparas, máquinas y cofres a su alrededor.</p></div></div>`;
  $('compCode').value = b.code; refreshComp();
}
function refreshComp() {
  const b = _compB; if (!b || !$('compRun')) return;
  $('compRun').textContent = b.run ? '■ Detener' : '▶ Ejecutar';
  $('compLog').textContent = (b.log || []).slice(-14).join('\n') || 'La consola está vacía.';
  const so = b.so || [0, 0, 0, 0], N = ['E', 'S', 'O', 'N'];
  $('compIO').innerHTML = [3, 0, 1, 2].map(s => `<span>${N[s]} ⟵ ${inputFrom(b, s)} · ⟶ ${so[s]}</span>`).join('') + (b.run ? `<span class="good">línea ${b._c && b._c.prog[Math.max(0, b.pc - 1)] ? b._c.prog[Math.max(0, b.pc - 1)].ln + 1 : '-'}</span>` : '') + (b.err ? `<span class="bad">${esc(b.err)}</span>` : '');
}
