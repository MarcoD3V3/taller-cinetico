'use strict';
// Paso fijo de simulación (20 por segundo). El orden importa:
// lógica → cinética → redes → generadores → energía/fluidos → máquinas → logística
function tick(dt) {
  S.time += dt;
  if (dirty.lists) rebuildLists();
  logicTick(dt);
  kineticTick();
  if (dirty.net) rebuildNets();
  genTick(dt);
  powerTick();
  fluidTick();
  machinesTick(dt);
  logisticsTick(dt);
  faunaTick(dt);
}
function checkTier() {
  const tier = TIERS[S.tier]; if (!tier) return;
  for (const k in tier.goal) if ((S.del[k] || 0) < tier.goal[k]) return;
  const un = unlocksOf(S.tier);
  S.tier++; S.del = {}; ui.goalDirty = true; endOnTier(S.tier);
  if (un.length) toast(`¡${tier.n} completado! Desbloqueas: ${un.map(u => BD[u].n).join(', ')}`, true);
  if (S.tier >= TIERS.length && !S.won) { S.won = true; toast('¡Fábrica completa! Has dominado todas las tecnologías. Sigue en modo libre.', true); }
  invVersion++;
}
