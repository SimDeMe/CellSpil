// combatSystem — skade ved kontakt mellem fjender og spiller-celler, opsluging (størrelse) og
// invasion. Spejler kampmodellen i balance/simulate.js (assessThreat). Se ENEMIES.md + BALANCE.md §8.
//
// Livspuljer (samme som balance-laget):
//   - Spiller-celle: ATP (energy.atp) — at blive angrebet tærer på din energi. (php = maxAtp.)
//   - Fjende:        HP (combat.hp)   — fjendens "effektive ATP-pulje".
// lifecycleSystem dræber alt, hvis ATP ≤ 0 eller HP ≤ 0.
//
// Hvem rammer hvem: kun fjende ↔ spiller-celle (fjender slås ikke indbyrdes; dine celler heller
// ikke). Begge retninger afgøres i ét gennemløb pr. fjende.
import { Offense, Enemies, Defenses } from '../../config/index.js';

/** Træk skade fra den rette livspulje. */
function applyDamage(e, amount) {
  if (amount <= 0) return;
  if (e.kind === 'enemy' && e.combat) e.combat.hp = Math.max(0, e.combat.hp - amount);
  else if (e.energy) e.energy.atp = Math.max(0, e.energy.atp - amount);
}

/** Spillerens skade/s mod en fjende: bedste gyldige våben + lysozym-bonus (mod pansrede). */
function playerDpsVs(genes, enemyCfg) {
  let best = 0, bonus = 0;
  for (const g of genes) {
    const o = Offense[g];
    if (!o) continue;
    if (o.secreted) continue; // toksin/bakteriocin virker som udskilte skyer (cloudSystem), ikke ved kontakt
    const applies =
      o.applies === 'all' ||
      (o.applies === 'bacteria' && enemyCfg.type === 'bacteria') ||
      (o.applies === 'walled' && enemyCfg.walled);
    if (!applies) continue;
    if (o.bonus) bonus += o.dps;        // lysozym lægges oven i
    else if (o.dps > best) best = o.dps;
  }
  return best + bonus;
}

/** Største forsvars-fraskud (0..1) for et givet felt på tværs af cellens gener. */
function resist(genes, field) {
  let r = 0;
  for (const g of genes) {
    const d = Defenses[g];
    if (d && d[field]) r = Math.max(r, d[field]);
  }
  return r;
}

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function combatSystem(state, dt) {
  for (const enemy of state.entities) {
    if (enemy.dead || enemy.kind !== 'enemy' || !enemy.transform) continue;
    const cfg = Enemies[enemy.enemyType];
    if (!cfg) continue;

    const reach = enemy.transform.radius;
    for (const cell of state.spatial.queryRadius(enemy.transform.x, enemy.transform.y, reach + 60)) {
      if (cell.dead || cell.kind !== 'cell' || !cell.transform) continue;

      // I kontakt? (cirklerne overlapper)
      const dx = cell.transform.x - enemy.transform.x;
      const dy = cell.transform.y - enemy.transform.y;
      if (Math.hypot(dx, dy) > reach + cell.transform.radius) continue;

      const genes = cell.genome?.genes ?? new Set();
      const pr = cell.transform.radius;

      // --- Kan fjenden opsluge eller invadere spilleren? (med forsvars-fraskud) ---
      const canEnemyEngulf = cfg.engulfBelowRadius > 0 && pr < cfg.engulfBelowRadius &&
        resist(genes, 'engulfResist') < 0.5;
      const canEnemyInvade = cfg.invades && pr >= (cfg.invadeMinRadius ?? Infinity) &&
        resist(genes, 'invadeResist') < 0.5;

      // --- Skade fjende → spiller ---
      let edps = cfg.contactDps || 0;
      if (canEnemyInvade) edps = Math.max(edps, cfg.insideDps || 0);
      if (canEnemyEngulf) edps = Math.max(edps, (cfg.contactDps || 0) * 2); // opsluging = hurtig død
      applyDamage(cell, edps * dt);

      // --- Skade spiller → fjende ---
      // Opsluging: endocytose + størrelsesovertag (≥120% af fjendens radius) = øjeblikkelig død.
      const canPlayerEngulf = genes.has('endocytosis') && pr >= cfg.radius * 1.2;
      if (canPlayerEngulf) {
        applyDamage(enemy, (enemy.combat?.hp ?? 0) + 1); // sikkert dødeligt
      } else {
        applyDamage(enemy, playerDpsVs(genes, cfg) * dt);
      }
    }
  }
  return state;
}
