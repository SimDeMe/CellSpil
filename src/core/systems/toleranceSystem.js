// toleranceSystem — sammenlign cellens lokale miljø med dens komfort-vinduer → stress/skade,
// og sæt tolerance.comfort (driver trivsels-glød). Plus ilt-toksicitet for anaerobe strategier.
// Mutationer kan senere flytte ranges. Se ENVIRONMENT.md §3-4 + config.Tolerance.
import { Tolerance, Metabolism, Defenses, Environment } from '../../config/index.js';

/** Skade (ATP/s) og komfort (0..1) for én parameter mod ét range. */
function bandFor(v, r) {
  if (v >= r.optMin && v <= r.optMax) return { dmg: 0, comfort: 1 };

  // Hvor langt uden for optimum, på vej mod den dødelige grænse.
  let span, dist;
  if (v < r.optMin) { span = r.optMin - r.lethalMin; dist = r.optMin - v; }
  else { span = r.lethalMax - r.optMax; dist = v - r.optMax; }
  const frac = span > 0 ? Math.min(1, dist / span) : 1; // 0 ved opt-kant → 1 ved lethal-kant

  const beyondLethal = v < r.lethalMin || v > r.lethalMax;
  const dmg = beyondLethal ? Tolerance.lethalDamage : frac * Tolerance.stressDamage;
  return { dmg, comfort: 1 - frac };
}

/** Største relevante forsvars-fraskud (0..1) på tværs af cellens gener. */
function resistOf(cell, field) {
  let r = 0;
  if (cell.genome) for (const g of cell.genome.genes) {
    const d = Defenses[g];
    if (d && d[field]) r = Math.max(r, d[field]);
  }
  return r;
}

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function toleranceSystem(state, dt) {
  for (const e of state.entities) {
    if (e.dead || !e.tolerance || !e.energy) continue;
    const env = e.localEnv ?? state.environment ?? Environment.ambient;

    let damage = 0;
    let comfort = 1;

    // 1) Temperatur/pH mod komfort-vinduer (cellens egne ranges, ellers standard).
    for (const [param, def] of Object.entries(Tolerance.defaultRanges)) {
      const v = env[param];
      if (v === undefined) continue; // miljøet har ikke denne parameter (fx isolerede tests)
      const band = bandFor(v, e.tolerance.ranges?.[param] ?? def);
      damage += band.dmg;
      comfort = Math.min(comfort, band.comfort);
    }

    // 2) Ilt-toksicitet for anaerobe strategier (methanogen m.fl.) — dæmpes af katalase.
    const strat = Metabolism[e.metabolism?.strategy];
    const o2 = env.oxygen ?? 0;
    if (strat?.oxygenToxic !== undefined && o2 > strat.oxygenToxic) {
      const over = (o2 - strat.oxygenToxic) / (1 - strat.oxygenToxic);
      damage += over * Tolerance.oxygenToxicDamage * (1 - resistOf(e, 'oxygenDamageResist'));
      comfort = 0;
    }

    if (damage > 0) e.energy.atp = Math.max(0, e.energy.atp - damage * dt);
    e.tolerance.comfort = comfort;
  }
  return state;
}
