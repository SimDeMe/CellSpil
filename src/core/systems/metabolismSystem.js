// metabolismSystem — ATP-indtægt/udgift efter aktiv strategi + lokalt miljø; upkeep;
// overskud → byggesten (vækst). Se EVOLUTION.md §B + BALANCE.md §2-4.
import { Metabolism, Tools, Cell, Environment } from '../../config/index.js';

// Nogle inputs mætter under fuld styrke: aerob respiration topper ved O2 = 0,5 (BALANCE §3).
const SATURATION = { oxygen: 0.5 };

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Hvor stærkt en begrænsende faktor bidrager (0..1). */
function scaleFactor(param, env) {
  const sat = SATURATION[param] ?? 1;
  return clamp01((env[param] ?? 0) / sat);
}

/** ATP/s en strategi yder i et givet miljø — med krav-tjek og fallback. */
function incomeFor(strategyId, env) {
  const s = Metabolism[strategyId];
  if (!s) return 0;

  // Opfylder miljøet strategiens krav? Ellers fald tilbage (gæring eller 0).
  let meetsRequirements = true;
  if (s.requires) {
    for (const [key, need] of Object.entries(s.requires)) {
      if (key === 'anoxic') { if (env.anoxic !== true) meetsRequirements = false; }
      else if ((env[key] ?? 0) < need) meetsRequirements = false;
    }
  }
  if (!meetsRequirements) {
    if (s.fallback === 'ferment') return incomeFor('ferment', env);
    return 0; // autotrof uden sit input giver ingenting (BALANCE invariant §1)
  }

  // Skaler maks-indtægten med de begrænsende faktorer (fx mad, lys, ilt).
  let scale = 1;
  for (const p of s.scaleBy ?? []) scale *= scaleFactor(p, env);
  return s.maxIncome * scale;
}

/** Samlet upkeep (ATP/s): basal + strategiens + alle geners. */
function upkeepFor(cell) {
  let upkeep = Cell.basalUpkeep;
  const s = Metabolism[cell.metabolism?.strategy];
  if (s?.upkeep) upkeep += s.upkeep;
  if (cell.genome) for (const g of cell.genome.genes) upkeep += Tools[g]?.upkeep ?? 0;
  return upkeep;
}

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function metabolismSystem(state, dt) {
  const globalEnv = state.environment ?? Environment.ambient;

  for (const e of state.entities) {
    if (e.dead || e.kind !== 'cell' || !e.energy) continue;

    // Cellens lokale miljø (dybde-baseret, sat af environmentSystem) — ellers det globale.
    const env = e.localEnv ?? globalEnv;
    const net = incomeFor(e.metabolism?.strategy, env) - upkeepFor(e);
    const gain = net * dt;
    const maxAtp = e.energy.maxAtp ?? Cell.maxAtp;

    if (gain >= 0) {
      // Fyld ATP-bufferen først; alt derover investeres i byggesten (vækst).
      const toAtp = Math.min(gain, maxAtp - e.energy.atp);
      e.energy.atp += toAtp;
      const overflow = gain - toAtp;
      if (overflow > 0 && e.resources) {
        const budget = overflow * Cell.growthEfficiency;
        // Byg amino + nukleotid i 1:1 (det forhold deling kræver). Et par koster amino+nukleotid ATP.
        const pairs = budget / (Cell.aminoAtpValue + Cell.nucleotideAtpValue);
        e.resources.amino += pairs;
        e.resources.nucleotide += pairs;
      }
    } else {
      // Underskud tærer på ATP. Når den når 0, dræber lifecycleSystem cellen.
      e.energy.atp = Math.max(0, e.energy.atp + gain);
    }
  }
  return state;
}
