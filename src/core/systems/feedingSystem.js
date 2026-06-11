// feedingSystem — celler æder mad-partikler, de rører, og får ressourcer (ATP + byggesten).
// Forager-AI'en svømmer cellerne hen til maden (aiSystem); her bliver maden faktisk spist.
// Se BALANCE.md §1-2. ATP fyldes op til maxAtp (overskud spildes); byggesten tæller til deling.
import { Food, Cell } from '../../config/index.js';

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function feedingSystem(state, dt) {
  for (const cell of state.entities) {
    if (cell.dead || cell.kind !== 'cell' || !cell.transform || !cell.resources || !cell.energy) continue;

    const reach = cell.transform.radius + Food.reach;
    const maxAtp = cell.energy.maxAtp ?? Cell.maxAtp;

    for (const food of state.spatial.queryRadius(cell.transform.x, cell.transform.y, reach)) {
      if (food.dead || food.kind !== 'food' || !food.transform) continue;

      const dx = food.transform.x - cell.transform.x;
      const dy = food.transform.y - cell.transform.y;
      if (Math.hypot(dx, dy) > reach) continue; // ikke helt i kontakt endnu

      const pack = Food[food.food?.kind] ?? Food.glucose;
      if (pack.atp) cell.energy.atp = Math.min(maxAtp, cell.energy.atp + pack.atp);
      if (pack.amino) cell.resources.amino += pack.amino;
      if (pack.nucleotide) cell.resources.nucleotide += pack.nucleotide;

      food.dead = true; // spist — lifecycle/oprydning fjerner den
    }
  }
  return state;
}
