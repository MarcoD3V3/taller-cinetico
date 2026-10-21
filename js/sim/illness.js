'use strict';
// =====================================================================================
//  Enfermedades (datos en data/ills.js). Se contraen por lo que haces y donde estás:
//  mojarte con frío, respirar polvo, ceniza o humo, beber agua del pantano, comer crudo,
//  abusar del dulce, del alcohol o de la bebida energética, trabajar sin parar, nadar mucho,
//  andar con los pies mojados, tratar con animales, estar en lo alto de la montaña…
//  Afectan según su gravedad, empeoran o se complican si las dejas (resfriado → gripe →
//  neumonía; tos → bronquitis; dolor de cabeza → migraña) y se curan con remedios (comida,
//  bebidas y medicinas), con descanso y durmiendo. Se notan: estornudos, tos, sudor,
//  escalofríos, mareo, picor, vista borrosa, cojera, bostezos… en el personaje y en pantalla.
// =====================================================================================
const IL_T = { sneeze: 0, cough: 0 };
const ills = () => (S.pc.ills || (S.pc.ills = {}));
function catchIll(id, why) {
  if (!survOn() || !ILLS[id]) return; const L2 = ills(); if (L2[id]) return;
  if (Object.keys(L2).length >= 4) return;
  const D = ILLS[id]; L2[id] = { left: D.dur * (0.8 + Math.random() * 0.4), t: 0, why: why || '' };
  toast(`${D.i} Te has puesto enfermo: ${D.n}${why ? ' (' + why + ')' : ''}. Mira la ficha (C) para tratarlo`, D.sev >= 2); vitalsDirty = true;
}
function cureIll(id, power, src) {
  const L2 = ills(), I = L2[id]; if (!I) return false;
  I.left -= ILLS[id].dur * power; I.treated = (I.treated || 0) + 1;
  if (I.left <= 0) { delete L2[id]; toast(`✓ Te has curado: ${ILLS[id].n}`, true); if (typeof fxBurst === 'function') fxBurst(S.player.x, S.player.y - 12, 16, { col: '#7ae07a', sp: 50, life: 0.9, glow: 1, shape: 'star', up: 25 }); }
  else toast(`${src ? ITEMS[src].n + ': ' : ''}${ILLS[id].n} mejora`); vitalsDirty = true; return true;
}
// Efectos combinados de lo que tienes ahora
function illFx(k, base = 1) {
  if (!S || !S.pc || !S.pc.ills) return base; let v = base;
  for (const id in S.pc.ills) { const f = ILLS[id].fx[k]; if (f === undefined) continue; if (k === 'hp' || k === 'pain' || k === 'temp') v += f; else v *= f; }
  return v;
}
{ const s0 = speedMul; speedMul = () => s0() * illFx('spd'); }
{ const w0 = workMul; workMul = () => w0() * illFx('wrk'); }
{ const p0 = painOf; painOf = () => p0() + illFx('pain', 0); }
{ const g0 = gainXP; gainXP = (k, n) => g0(k, n * illFx('xp')); }
// ---------- Causas ----------
let _ilT = 0, _ilWork = 0, _ilSwim = 0, _ilWalk = 0, _ilThirsty = 0, _ilTired = 0, _ilHigh = 0, _ilDmg = [], _ilSweets = [], _ilBooze = [], _ilEat = [];
function illTick(dt) {
  if (!survOn() || !S.pc) return; const pc = S.pc, L2 = ills();
  // Evolución, recuperación y efectos continuos
  const resting = !pmove.moving && !(ui.mine && ui.mine.t > 0);
  for (const id in L2) {
    const I = L2[id], D = ILLS[id]; I.t += dt;
    I.left -= dt * (resting ? 2 : 1) * (pc.food > 50 && pc.water > 50 ? 1.2 : 0.8) * (buff('regen') ? 1.5 : 1);
    if (D.next && !I.treated && I.t > D.next[1] && !L2[D.next[0]]) { const [nx, , why] = D.next; delete L2[id]; catchIll(nx, why); toast(`⚠ ${D.n} ha empeorado: ahora es ${ILLS[nx].n}`, true); continue; }
    if (I.left <= 0) { delete L2[id]; toast(`✓ Se te ha pasado: ${D.n}`); vitalsDirty = true; }
  }
  const hpD = illFx('hp', 0); if (hpD) { pc.hp -= hpD * dt; if (pc.hp <= 0) pc.cause = 'Enfermedad'; }
  const th = illFx('thi'), hu = illFx('hun'), en = illFx('ene'), st = illFx('stam'), tp = illFx('temp', 0);
  if (th !== 1) pc.water = clamp(pc.water - 0.083 * (th - 1) * dt, 0, 100);
  if (hu !== 1) pc.food = clamp(pc.food - 0.055 * (hu - 1) * dt, 0, 100);
  if (en !== 1) pc.energy = clamp(pc.energy - 0.07 * (en - 1) * dt, 0, 100);
  if (st < 1 && pc.rest > 0.8) pc.stam = Math.max(0, pc.stam - 14 * (1 - st) * dt);
  if (tp) pc.temp = Math.min(39.5, Math.max(pc.temp, 37 + tp * 0.9));
  // Contadores de lo que vas haciendo
  _ilWork = ui.mine && ui.mine.t > 0 ? _ilWork + dt : Math.max(0, _ilWork - dt * 0.2);
  _ilSwim = P.swim ? _ilSwim + dt : 0; _ilWalk += pmove.moving ? dt : 0;
  _ilThirsty = pc.water < 15 ? _ilThirsty + dt : 0; _ilTired = pc.energy <= 1 ? _ilTired + dt : 0;
  _ilHigh = lvAt(Math.floor(S.player.x / T), Math.floor(S.player.y / T)) >= 6 ? _ilHigh + dt : 0;
  _ilT -= dt; if (_ilT > 0) return; _ilT = 5;
  const p = S.player, tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), key = (BIOMES[biomeOf(tx, ty)] || {}).key || '', amb = ambient(), r = () => Math.random();
  const nearSmoke = (L.light || []).some(b => (b.type === 'campfire' || b.type === 'fireplace' || b.type === 'woodStove') && Math.abs(b.x - tx) < 2 && Math.abs(b.y - ty) < 2);
  if (WX.wet > 55 && amb < 14 && r() < 0.04) catchIll('cold', 'mojado y con frío');
  if ((WX.type === 'sandstorm' || WX.type === 'ashfall' || nearSmoke || /desert|volcan|ash/i.test(key)) && r() < (nearSmoke ? 0.02 : 0.012) * (1 - protOf('eyes') * 0.5)) catchIll('cough', nearSmoke ? 'humo' : 'polvo en el aire');
  if (_ilThirsty > 60 && r() < 0.15) catchIll('dehydration', 'mucho tiempo sin beber');
  if (_ilThirsty > 30 && _hot && r() < 0.06) catchIll('headache', 'sed y calor');
  if (/flower|meadow|plains|savanna/i.test(key) && daylight() > 0.5 && !buff('calm') && r() < 0.006) catchIll('hayFever', 'polen');
  if (_ilTired > 60 && r() < 0.2) catchIll('exhaustion', 'sin dormir');
  if (_ilWork > 180 && r() < 0.03) { catchIll('lumbago', 'mucho trabajo'); _ilWork = 0; }
  if (_ilSwim > 90 && r() < 0.05) catchIll(r() < 0.5 ? 'otitis' : 'nausea', 'demasiado tiempo en el agua');
  if (WX.wet > 60 && _ilWalk > 300 && protOf('blister') < 0.3 && r() < 0.02) { catchIll('athleteFoot', 'pies mojados'); _ilWalk = 0; }
  if (_ilWalk > 900 && r() < 0.02) { catchIll('ingrownNail', 'muchas horas andando'); _ilWalk = 0; }
  if (amb < 4 && WX.wet > 40 && r() < 0.03) catchIll('chilblains', 'frío húmedo');
  if (_ilHigh > 120 && r() < 0.06) catchIll('altitude', 'en lo alto de la montaña');
  if (hasWound('eyeDust') && r() < 0.05) catchIll('conjunctivitis', 'polvo en los ojos');
  if (WX.type === 'heat' && daylight() > 0.6 && r() < 0.01) catchIll('headache', 'el sol');
  const now = pc.alive; _ilDmg = _ilDmg.filter(t => now - t < 120); if (_ilDmg.length >= 8 && r() < 0.3) { catchIll('stress', 'muchos golpes seguidos'); _ilDmg = []; }
  if (L2.cold && !L2.cold.post) L2.cold.post = 1;
}
// Lo que comes y bebes también cuenta
const SWEETS = new Set(['cookies', 'caramel', 'candiedPetals', 'honeyCake', 'iceCream', 'berryJam', 'jamToast', 'honeyToast', 'pudding', 'berryPie', 'honeyPancakes', 'sugar', 'milkshake']);
const BOOZE = new Set(['berryWine', 'mead', 'cactusCider']);
{ const u0 = survUse; survUse = s => {
  const id = s && s.id; if (!id) return u0(s);
  // ¿Es un remedio para algo que tienes?
  if (survOn() && S.pc && S.pc.ills) { const L2 = ills(); const hit = Object.keys(L2).find(k => ILLS[k].cure.some(([c]) => c === id));
    if (hit && (!ITEMS[id].food || ITEMS[id].medItem || id === 'nailFile')) { const pw = ILLS[hit].cure.find(([c]) => c === id)[1]; if (id !== 'nailFile') { if (--s.n <= 0) S.inv[S.inv.indexOf(s)] = null; invVersion++; } cureIll(hit, pw, id); return true; } }
  const f = ITEMS[id].food, poison0 = S.pc ? S.pc.poison : 0, r = u0(s);
  if (!r || !f || !survOn()) return r; const pc = S.pc, now = pc.alive;
  // Comida y bebida que además cura
  for (const k in ills()) { const c = ILLS[k].cure.find(([c2]) => c2 === id); if (c) cureIll(k, c[1], id); }
  if (pc.poison > poison0 && f.raw) catchIll(Math.random() < 0.5 ? 'foodPoisoning' : 'diarrhea', 'comida cruda');
  if (id === 'snow' || id === 'ice' || id === 'iceCream') { if (Math.random() < 0.12) catchIll('soreThroat', 'algo muy frío'); }
  if (SWEETS.has(id)) { _ilSweets.push(now); _ilSweets = _ilSweets.filter(t => now - t < 300); if (_ilSweets.length >= 6) { catchIll('toothache', 'demasiado dulce'); _ilSweets = []; } }
  if (BOOZE.has(id)) { _ilBooze.push(now); _ilBooze = _ilBooze.filter(t => now - t < 240); if (_ilBooze.length >= 3) { setTimeout(() => catchIll('hangover', 'demasiado alcohol'), 40000); _ilBooze = []; } if (Math.random() < 0.15) catchIll('gastritis', 'alcohol'); }
  if (id === 'fireChili' || id === 'spicyShot') { if (Math.random() < 0.2) catchIll('gastritis', 'picante'); }
  if ((id === 'energyDrink' || id === 'mushroomTea') && daylight() < 0.35 && Math.random() < 0.4) catchIll('insomnia', 'estimulantes de noche');
  if ((id === 'crab' || id === 'shrimp' || id === 'seafoodStew') && Math.random() < 0.05) catchIll('hives', 'alergia al marisco');
  _ilEat.push([now, f.f || 0]); _ilEat = _ilEat.filter(([t]) => now - t < 90); if (_ilEat.reduce((a, [, v]) => a + v, 0) > 120) { catchIll('indigestion', 'comer demasiado'); _ilEat = []; }
  return r; }; }
// Beber del pantano, tocar animales, dormir
{ const d0 = drinkAt; drinkAt = (x, y) => { const sw = gnd(x, y) === G.SWAMPWATER, r = d0(x, y); if (r && sw && survOn() && Math.random() < 0.25) catchIll('diarrhea', 'agua del pantano'); return r; }; }
{ const h0 = huntAnimal; huntAnimal = (a, w, got) => { const r = h0(a, w, got); if (survOn() && Math.random() < 0.02) catchIll(Math.random() < 0.6 ? 'lice' : 'scabies', 'contacto con animales'); return r; }; }
{ const s0 = sleepIn; sleepIn = b => { s0(b); setTimeout(() => { if (!S || !S.pc || !S.pc.ills) return; for (const id in S.pc.ills) cureIll(id, 0.6); if (Math.random() < 0.06) catchIll('stiffNeck', 'mala postura al dormir'); if (S.pc.ills.insomnia) S.pc.energy = Math.min(S.pc.energy, 60); }, 2600); }; }
{ const h0 = hurt; hurt = (t, part, mult, cause) => { h0(t, part, mult, cause); if (S && S.pc) _ilDmg.push(S.pc.alive); }; }
// La fiebre de las infecciones (sim/medical) pasa a ser la enfermedad «Fiebre»
{ const m0 = medEvent; medEvent = (t, parts, cause) => { if (t === 'fever') { catchIll('fever', cause); return; } m0(t, parts, cause); }; }
{ const s0 = survTick; survTick = (dt, m, s) => { s0(dt, m, s); illTick(dt); }; }
// Aviso en la columna de estados (moodles)
{ const m0 = moodles; moodles = () => { const out = m0(); if (S && S.pc && S.pc.ills) for (const id in S.pc.ills) { const D = ILLS[id]; out.push({ i: D.i, n: `${D.n}: ${D.sym}`, lv: D.sev }); } return out; }; }
// ---------- Cómo se nota ----------
function illVisual(ctx) {
  if (!S || !S.pc || !S.pc.ills) return; const L2 = S.pc.ills, p = S.player, now = performance.now() / 1000, hx = p.x, hy = p.y - 30 - (P.z || 0);
  const has = v => Object.keys(L2).some(id => ILLS[id].vis === v);
  if (has('sneeze') && now > IL_T.sneeze) { IL_T.sneeze = now + 6 + Math.random() * 8; fxText(hx + 8, hy - 6, '¡Achís!', '#e8e0d0'); fxBurst(hx + Math.cos(P.faceA || 0) * 10, hy + 8, 10, { col: 'rgba(230,240,255,.9)', sp: 70, life: 0.5, size: 1.4 }); tone(900, 0.06, 'triangle', 0.02, 0.5); }
  if (has('cough') && now > IL_T.cough) { IL_T.cough = now + 4 + Math.random() * 6; fxText(hx + 8, hy - 6, 'cof, cof', '#c8c0b0'); for (let i = 0; i < 3; i++) fxSmoke(hx + Math.cos(P.faceA || 0) * 8, hy + 8, 'rgba(220,220,220,', 2); noise(0.08, 0.03, 600); }
  if (has('sweat') && Math.random() < 0.06) fxAdd({ x: hx + (Math.random() - 0.5) * 12, y: hy + 2, vx: 0, vy: 20, life: 0.6, t: 0, size: 1.6, col: '#8ad8ff', grav: 120 });
  if (has('itch') && Math.random() < 0.03) fxText(hx + (Math.random() - 0.5) * 16, hy, '*rasca*', '#e8a0a0');
  if (has('yawn') && Math.random() < 0.004) fxText(hx + 6, hy - 6, 'Zz…', '#a8b8ff');
  if (has('red')) { ctx.fillStyle = 'rgba(230,80,70,.6)'; ctx.beginPath(); ctx.arc(hx + Math.cos(P.faceA || 0) * 3, hy + 10, 1.6, 0, 7); ctx.fill(); }
  // Icono flotante de la peor enfermedad
  const worst = Object.keys(L2).sort((a, b) => ILLS[b].sev - ILLS[a].sev)[0];
  if (worst) { ctx.globalAlpha = 0.75 + Math.sin(now * 3) * 0.2; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(ILLS[worst].i, hx + 12, hy - 4 + Math.sin(now * 2) * 1.5); ctx.globalAlpha = 1; }
}
// Temblor (escalofríos), mareo, cojera: el personaje se mueve; pantalla verde (náuseas) o borrosa
{ const d0 = drawPlayer; drawPlayer = ctx => {
  const L2 = S && S.pc && S.pc.ills; if (!L2 || !Object.keys(L2).length) { d0(ctx); return; }
  const has = v => Object.keys(L2).some(id => ILLS[id].vis === v), t = performance.now() / 1000;
  let dx = 0, dy = 0; if (has('shiver')) dx += Math.sin(t * 40) * 0.6; if (has('dizzy')) { dx += Math.sin(t * 1.7) * 1.2; dy += Math.cos(t * 1.3) * 0.6; } if (has('limp') && pmove.moving) dy += Math.abs(Math.sin(P.walk * Math.PI / 2)) * 1.4;
  ctx.save(); ctx.translate(dx, dy); d0(ctx); ctx.restore(); illVisual(ctx); }; }
{ const w0 = drawWeatherScreen; drawWeatherScreen = (ctx, dt) => { w0(ctx, dt);
  const L2 = S && S.pc && S.pc.ills; if (!L2) return; const has = v => Object.keys(L2).some(id => ILLS[id].vis === v), W = cv.width, H = cv.height, t = performance.now() / 1000;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (has('green')) { ctx.fillStyle = `rgba(120,170,60,${0.07 + Math.sin(t * 1.5) * 0.03})`; ctx.fillRect(0, 0, W, H); }
  if (has('blur') || has('dizzy')) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7), a = has('blur') ? 0.35 : 0.18 + Math.sin(t * 1.7) * 0.06; g.addColorStop(0, 'rgba(20,20,30,0)'); g.addColorStop(1, `rgba(20,20,30,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  const sevMax = Math.max(0, ...Object.keys(L2).map(id => ILLS[id].sev)); if (sevMax >= 3) { ctx.fillStyle = `rgba(160,40,40,${0.06 + Math.sin(t * 2) * 0.03})`; ctx.fillRect(0, 0, W, H); }
}; }
// Vista borrosa de verdad (conjuntivitis, migraña): filtro suave sobre el lienzo
{ let _blur = 0; const tick = () => { const L2 = S && S.pc && S.pc.ills, on = !!L2 && Object.keys(L2).some(id => ILLS[id].vis === 'blur'); if (on !== !!_blur) { _blur = on ? 1 : 0; cv.style.setProperty('--ill', on && (typeof OPT === 'undefined' || OPT.illFx) ? 'blur(0.7px)' : 'blur(0)'); } setTimeout(tick, 500); }; setTimeout(tick, 500); }
// ---------- En la ficha (pestaña Estado) ----------
{ const st0 = CS_PANE.state; CS_PANE.state = () => {
  const L2 = S.pc.ills || {}, ks = Object.keys(L2); let h = '';
  if (ks.length) h = `<div class="cssub">Enfermedades</div><div class="csill">${ks.map(id => { const D = ILLS[id], I = L2[id], fx = D.fx, eff = [fx.spd && `velocidad ${Math.round((fx.spd - 1) * 100)} %`, fx.wrk && `fuerza ${Math.round((fx.wrk - 1) * 100)} %`, fx.stam && `aguante ${Math.round((fx.stam - 1) * 100)} %`, fx.thi && 'más sed', fx.hun && fx.hun < 1 && 'menos apetito', fx.ene && 'más cansancio', fx.hp && 'pierdes vida', fx.temp && 'fiebre', fx.pain && 'dolor', fx.xp && 'aprendes peor'].filter(Boolean).join(' · ');
    const cures = D.cure.filter(([c, pw]) => ITEMS[c] && pw > 0).map(([c, pw]) => { const n = invCount(c); return `<button class="wact ${n ? 'pri' : 'need'}" ${n ? `data-ilc="${id}|${c}"` : chainPossible(c, 1) ? `data-mkmed="${c}"` : `data-mgo="${c}"`} title="Cura un ${Math.round(pw * 100)} %">${itemImg(c, 16)} ${esc(ITEMS[c].n)}${n ? '' : ' <small>' + (chainPossible(c, 1) ? '🔨 fabricar' : 'no tienes') + '</small>'}</button>`; }).join('');
    const nx = D.next && !I.treated ? `<span class="warn" title="Si no lo tratas">→ ${esc(ILLS[D.next[0]].n)} en ${Math.max(0, Math.round((D.next[1] - I.t) / 60 * 10) / 10)} min</span>` : '';
    return `<div class="wnd2"><div class="wh"><span class="wi">${D.i}</span><b>${esc(D.n)}</b><span class="sev s${D.sev}">${['', 'leve', 'moderada', 'grave'][D.sev]}</span><span class="mut">· ${esc(D.sym)}</span> ${nx}<span class="wb"><i style="width:${(100 - clamp(I.left / D.dur, 0, 1) * 100).toFixed(0)}%"></i></span></div><div class="small mut">${eff || 'Sin efectos fuertes'}${I.why ? ' · por ' + esc(I.why) : ''} · ${Math.ceil(I.left / 60)} min · descansar y dormir ayuda</div><div class="wacts">${cures}</div></div>`; }).join('')}</div>`;
  return h + st0(); }; }
$('mChar').addEventListener('click', e => { const b = e.target.closest('[data-ilc]'); if (!b) return; const [id, c] = b.dataset.ilc.split('|'), s = S.inv.find(x => x && x.id === c); if (!s) return; const pw = ILLS[id].cure.find(([x]) => x === c)[1]; if (c !== 'nailFile') { if (--s.n <= 0) S.inv[S.inv.indexOf(s)] = null; invVersion++; } cureIll(id, pw, c); _charSig = ''; refreshChar(); });
