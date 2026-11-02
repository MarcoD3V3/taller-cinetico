'use strict';
// =====================================================================================
//  Mascotas que suben de nivel (hasta el 20).
//  · Ganan experiencia peleando a tu lado, cuando cae un enemigo cerca, produciendo (las de
//    granja) y llevándote de paseo (las monturas).
//  · Cada nivel: más vida y más daño. Y desbloquean:
//      Nv 3  → recogen los objetos del suelo que hay cerca y te los traen.
//      Nv 5  → todas pelean (también las de granja y las monturas cuando no las montas).
//      Nv 10 → las de granja producen el doble; las monturas corren un 15 % más.
//  · Encima de cada mascota se ve su nivel; en Aventura (Y) › Mascotas, sus barras y lo que saben hacer.
// =====================================================================================
const PET_MAX = 20, PT = { kills: 0 };
const petNeed = lv => Math.round(18 * Math.pow(lv, 1.55));
const petName = pt => pt.name || SPECIES[pt.sp].n;
function petInit(pt) { if (!pt.lv) { pt.lv = 1; pt.xp = 0; } if (!pt.mhp0) pt.mhp0 = pt.mhp; }
function petXP(pt, n) {
  petInit(pt); if (pt.lv >= PET_MAX || !n) return; pt.xp += n;
  while (pt.lv < PET_MAX && pt.xp >= petNeed(pt.lv)) { pt.xp -= petNeed(pt.lv); pt.lv++; pt.mhp = Math.round(pt.mhp0 * (1 + 0.12 * (pt.lv - 1))); pt.hp = pt.mhp;
    const perk = { 3: 'Ahora recoge los objetos del suelo y te los trae.', 5: 'Ahora pelea a tu lado contra los enemigos.', 10: TAME[pt.sp] && TAME[pt.sp].role === 'farm' ? 'Ahora produce el doble.' : TAME[pt.sp] && TAME[pt.sp].role === 'mount' ? 'Ahora corre un 15 % más.' : 'Ahora pega todavía más fuerte.' }[pt.lv];
    fxText(pt.x, pt.y - 24, `¡Nivel ${pt.lv}!`, '#ffd34a', true); sparkRing(pt.x, pt.y, 26, '#ffd34a', 110, { up: 40, life: 0.8 }); tone(780, 0.12, 'triangle', 0.05, 1.3); tone(1170, 0.2, 'triangle', 0.05, 1, 0.1);
    toast(`🐾 ${petName(pt)} sube a nivel ${pt.lv}.${perk ? ' ' + perk : ''}`, !!perk); }
}
const petNear = (pt, r) => Math.hypot(pt.x - S.player.x, pt.y - S.player.y) < r * T;
// Lo que hace petsTick y, además, lo de los niveles
{ const p0 = petsTick; petsTick = dt => {
  const L = S.pets || [], before = L.map(pt => { petInit(pt); return [pt, pt.cd || 0, pt.prodT || 0]; });
  p0(dt);
  for (const [pt, cd0, prod0] of before) { if (!L.includes(pt)) continue; const sp = SPECIES[pt.sp], tm = TAME[pt.sp];
    // Ha atacado (su espera se reinició): más daño según el nivel y experiencia
    if ((pt.cd || 0) > cd0 + 0.5 && tm.role === 'combat') { const f = nearestFoe(S.player.x, S.player.y, 8 * T); if (f && pt.lv > 1) damageFoe(f, sp.s * 2.4 * 0.1 * (pt.lv - 1)); petXP(pt, 2); }
    // Ha producido: experiencia y, a nivel 10, el doble
    if (tm.prod && (pt.prodT || 0) > prod0 + 1) { petXP(pt, 3); if (pt.lv >= 10 && petNear(pt, 14)) invGive(tm.prod[0], 1, pt.x, pt.y); }
    if (pt.ride) { pt._walk = (pt._walk || 0) + Math.hypot(P.mvx || 0, P.mvy || 0) * dt / T; if (pt._walk >= 25) { pt._walk -= 25; petXP(pt, 1); } continue; }
    if (pt.mode === 'stay') continue;
    // Nv 5: las que no son de pelea también muerden
    if (tm.role !== 'combat' && pt.lv >= 5) { pt.cd2 = (pt.cd2 || 0) - dt; const f = nearestFoe(pt.x, pt.y, 2.5 * T); if (f && pt.cd2 <= 0) { pt.cd2 = 1.3; damageFoe(f, sp.s * 1.6 * (1 + 0.08 * pt.lv)); petXP(pt, 2); fxAdd({ x: f.x, y: f.y - 6, vx: 0, vy: -30, life: 0.3, t: 0, size: 2, col: '#ffffff', drag: 2 }); } }
    // Nv 3: te trae lo que hay por el suelo
    if (pt.lv >= 3 && S.gitems && S.gitems.length) { pt.fetch = (pt.fetch || 0) - dt; if (pt.fetch <= 0) { pt.fetch = 1.2;
      let best = null, bd = 9 * T; for (const o of S.gitems) { if (o.t < 1.5 || o.vx || o.vy) continue; const dp = Math.hypot(o.x - S.player.x, o.y - S.player.y); if (dp < 2 * T) continue; const d = Math.hypot(o.x - pt.x, o.y - pt.y); if (d < bd) { bd = d; best = o; } }
      if (best) { const a = Math.atan2(S.player.y - best.y, S.player.x - best.x), d = Math.hypot(S.player.x - best.x, S.player.y - best.y); pt.x = best.x; pt.y = best.y; best.vx = Math.cos(a) * Math.min(260, d * 3); best.vy = Math.sin(a) * Math.min(260, d * 3); best.z = 4; best.vz = 60; fxBurst(best.x, best.y, 6, { col: '#ffd34a', sp: 40, life: 0.3, size: 1.5 }); } } }
  }
}; }
// Cae un enemigo cerca: experiencia para las que te siguen
{ const k0 = killFoe; killFoe = f => { const was = FOES.includes(f); k0(f); if (!was || FOES.includes(f) || f.clone || f.summoned || !S || !S.pets) return; for (const pt of S.pets) if (pt.mode !== 'stay' && Math.hypot(pt.x - f.x, pt.y - f.y) < 10 * T) petXP(pt, f.boss ? 60 : 4 + (f.D.tier || 0) * 2); }; }
// Nv 10: montura un 15 % más rápida
{ const s0 = speedMul; speedMul = () => { const v = s0(), m = typeof mountPet === 'function' && S && mountPet(); return m && (m.lv || 1) >= 10 ? v * 1.15 : v; }; }
// El nivel encima de cada mascota
{ const d0 = drawCombat; drawCombat = (ctx, k, ox, oy, x0, y0, x1, y1) => { const r = d0(ctx, k, ox, oy, x0, y0, x1, y1); if (S && S.pets) { ctx.save(); ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
  for (const pt of S.pets) { if (pt.ride || Math.abs(pt.x - view.x) > 30 * T || Math.abs(pt.y - view.y) > 20 * T) continue; petInit(pt); const sp = SPECIES[pt.sp], y = pt.y - sp.s * 2.2 - 12, txt = `★${pt.lv}`, w = ctx.measureText(txt).width + 8;
    ctx.fillStyle = 'rgba(10,10,14,.6)'; ctx.fillRect(pt.x - w / 2, y - 8, w, 11); ctx.fillStyle = pt.lv >= 10 ? '#ffd34a' : pt.lv >= 5 ? '#9ae09a' : '#e8e0d0'; ctx.fillText(txt, pt.x, y);
    if (pt.lv < PET_MAX) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(pt.x - w / 2, y + 3, w, 2); ctx.fillStyle = '#ffd34a'; ctx.fillRect(pt.x - w / 2, y + 3, w * Math.min(1, pt.xp / petNeed(pt.lv)), 2); } }
  ctx.restore(); } return r; }; }
// ---------- Pestaña en la ventana de Aventura ----------
ADV.tabs.pets = { n: '🐾 Mascotas', render() {
  const L = S.pets || []; if (!L.length) return '<p class="mut">No tienes mascotas. Pulsa F sobre un animal con su comida favorita en la mano para domesticarlo. Tus mascotas ganan experiencia peleando, produciendo o llevándote, y suben hasta el nivel 20.</p>';
  const perks = pt => { const tm = TAME[pt.sp]; return [[3, 'Recoge objetos'], [5, tm.role === 'combat' ? 'Pega más fuerte' : 'Pelea contigo'], [10, tm.role === 'farm' ? 'Produce el doble' : tm.role === 'mount' ? '+15 % de velocidad' : 'Golpes brutales']].map(([lv, n]) => `<span class="${pt.lv >= lv ? 'on' : ''}">Nv ${lv}: ${n}</span>`).join(''); };
  return `<p class="mut">Ganan experiencia peleando a tu lado, cuando cae un enemigo cerca, produciendo o llevándote encima. Cada nivel les da más vida y más daño.</p><div class="petlist">${L.map(pt => { petInit(pt); const tm = TAME[pt.sp], need = petNeed(pt.lv);
    return `<div class="petc"><div class="pt"><b>${esc(petName(pt))}</b><span class="lv">Nivel ${pt.lv}${pt.lv >= PET_MAX ? ' (máximo)' : ''}</span><small>${tm.role === 'mount' ? '🐎 Montura' : tm.role === 'farm' ? '🌾 Granja' : '⚔ Combate'} · ❤ ${Math.round(pt.hp)}/${pt.mhp}</small></div>${pt.lv < PET_MAX ? `<div class="ab"><i style="transform:scaleX(${Math.min(1, pt.xp / need).toFixed(3)})"></i></div><span class="av">${Math.floor(pt.xp)} / ${need} de experiencia</span>` : ''}<div class="perks">${perks(pt)}</div></div>`; }).join('')}</div>`;
} };
