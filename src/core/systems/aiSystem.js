// aiSystem — fjende-adfærd (jagt/flok) + politik for spillerens ikke-styrede celler.
// Sætter ai.target (en entitet eller et {x,y}-punkt), som movementSystem bagefter svømmer mod.
// Se ENEMIES.md + SOCIAL.md §1.
//
// Politikker:
//   'hunt'   — fjender jager nærmeste spiller-celle inden for huntVision; ellers strejfer de.
//   'forage' — spillerens autonome celler søger nærmeste mad inden for forageVision; ellers strejfer.
//   'follow' — holder sig nær den spiller-styrede celle (flokken samles).
// Andre/ukendte politikker → strejf (driv tilfældigt rundt, så intet står dødt).
import { AI } from '../../config/index.js';
import { canAbsorb } from './feedingSystem.js';

/** Nærmeste levende entitet, der opfylder match(), inden for radius — via spatial-index. */
function nearest(state, x, y, radius, match) {
  let best = null;
  let bestD2 = radius * radius;
  for (const e of state.spatial.queryRadius(x, y, radius)) {
    if (e.dead || !e.transform || !match(e)) continue;
    const dx = e.transform.x - x;
    const dy = e.transform.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) { bestD2 = d2; best = e; }
  }
  return best;
}

/** Den spiller-styrede celle (flokkens leder), eller null. */
function findPlayer(state) {
  for (const e of state.entities) if (!e.dead && e.control && e.transform) return e;
  return null;
}

/** Sæt (eller forny) et tilfældigt strejf-mål, så entiteten driver rundt i stedet for at stå stille. */
function roam(state, e) {
  const r = e.ai.roam;
  const reached = r && Math.hypot(r.x - e.transform.x, r.y - e.transform.y) <= AI.roamArrive;
  if (!r || reached) {
    const ang = state.rng() * Math.PI * 2;
    const len = AI.roamRadius * (0.4 + 0.6 * state.rng());
    e.ai.roam = {
      x: Math.max(0, Math.min(state.width, e.transform.x + Math.cos(ang) * len)),
      y: Math.max(0, Math.min(state.height, e.transform.y + Math.sin(ang) * len)),
    };
  }
  e.ai.target = e.ai.roam;
}

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function aiSystem(state, dt) {
  const player = findPlayer(state);

  for (const e of state.entities) {
    if (e.dead || !e.ai || !e.transform) continue;
    const { x, y } = e.transform;

    switch (e.ai.policy) {
      case 'hunt': {
        // Bytte = spiller-celler (spilleren selv + hans autonome kloner). Fjender jager ikke hinanden.
        const prey = nearest(state, x, y, AI.huntVision, (c) => c.kind === 'cell');
        if (prey) { e.ai.target = prey; e.ai.roam = null; }
        else roam(state, e);
        break;
      }
      case 'forage': {
        // Søg kun mad, cellen faktisk kan optage (spring fx maltose over uden maltase).
        const food = nearest(state, x, y, AI.forageVision, (c) => c.kind === 'food' && canAbsorb(e, c.food?.kind));
        if (food) { e.ai.target = food; e.ai.roam = null; }
        else roam(state, e);
        break;
      }
      case 'follow': {
        // Hold dig nær lederen; er du allerede tæt nok på, så strejf lokalt.
        if (player && Math.hypot(player.transform.x - x, player.transform.y - y) > AI.followKeep) {
          e.ai.target = player; e.ai.roam = null;
        } else roam(state, e);
        break;
      }
      default:
        roam(state, e);
    }
  }
  return state;
}
