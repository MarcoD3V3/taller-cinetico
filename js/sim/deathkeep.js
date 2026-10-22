'use strict';
// =====================================================================================
//  Al morir, los enemigos se quedan donde estaban (también el que te mató, y el jefe):
//  antes se borraban los de alrededor y los que quedaban lejos al reaparecer.
//   · Los que estaban cerca al morir se «recuerdan» 15 minutos: aunque reaparezcas lejos,
//     siguen allí rondando, y puedes volver a por ellos (y a por tus cosas).
//   · Al reaparecer, los que estén junto a la cama o el núcleo se quedan aturdidos 3 s
//     y se olvidan de ti, para que no te maten nada más volver.
// =====================================================================================
const KEEP_SECS = 900;
{ const d0 = die; die = () => { if (S) for (const f of FOES) if (f.boss || dist(f.x, f.y, S.player.x, S.player.y) < 30 * T) f.keepT = S.time + KEEP_SECS; d0(); }; }
{ const r0 = respawn; respawn = () => {
  const keep = FOES.slice(), boss = BOSS;
  r0();
  FOES = keep; // la reaparición ya no borra a nadie
  if (boss && FOES.includes(boss) && !BOSS) { BOSS = boss; if (typeof buildBossBar === 'function') buildBossBar(); }
  for (const f of FOES) { f.ag = 0; if (dist(f.x, f.y, S.player.x, S.player.y) < 8 * T) f.stun = Math.max(f.stun || 0, 3); }
}; }
$('bRespawn').onclick = () => respawn();
// Lejos de ti no se borran mientras se les recuerda: siguen rondando por allí
{ const t0 = foeTarget; foeTarget = f => { const r = t0(f); if (f.keepT > S.time && r.td > 34 * T) return { tx: f.x, ty: f.y, td: 33 * T, tgt: 'player' }; return r; }; }
// El jefe no se va mientras estás muerto; lejos, espera (no te persigue por medio mundo)
{ const b0 = bossAI; bossAI = (f, dt) => { if (ui.open === 'dead') return; if (f.keepT > S.time && dist(f.x, f.y, S.player.x, S.player.y) > 60 * T) return; b0(f, dt); }; }
// En línea: si muere un invitado, el anfitrión (que mueve a los enemigos) también los recuerda
{ const d0 = die; die = () => { if (S && typeof inGame === 'function' && inGame() && typeof isGuest === 'function' && isGuest() && typeof netEmit === 'function') netEmit('mob', { t: 'keep', x: Math.round(S.player.x), y: Math.round(S.player.y) }); d0(); }; }
{ const w0 = wireGame; wireGame = r => { w0(r); r.on('mob', m => { const d = m.data; if (m.sameTab || !d || d.t !== 'keep' || !S || !(NET.game && NET.game.host)) return; for (const f of FOES) if (f.boss || dist(f.x, f.y, +d.x || 0, +d.y || 0) < 30 * T) f.keepT = S.time + KEEP_SECS; }); }; }
