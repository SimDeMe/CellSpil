// lifecycleSystem — død (atp<=0 eller hp<=0), oprydning (markér dead), og slægts-arv:
// dør den styrede celle, overdrag styringen til en anden celle i slægten. Se SOCIAL.md §1.
/** @param {import('../state.js').WorldState} state @param {number} dt */
export function lifecycleSystem(state, dt) {
  for (const e of state.entities) {
    if (e.dead) continue;
    if ((e.energy && e.energy.atp <= 0) || (e.combat && e.combat.hp <= 0)) {
      e.dead = true;
      // TODO: hvis e.control (spiller) — find anden slægtscelle og overdrag styringen.
    }
  }
  return state;
}
