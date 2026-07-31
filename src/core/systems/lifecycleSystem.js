// lifecycleSystem — død (atp<=0 eller hp<=0), oprydning (markér dead), og slægts-arv:
// dør den styrede celle, overdrag styringen til en anden celle i slægten. Se SOCIAL.md §1.
/** @param {import('../state.js').WorldState} state @param {number} dt */
export function lifecycleSystem(state, dt) {
  let controlLost = null;

  for (const e of state.entities) {
    if (e.dead) continue;
    if ((e.energy && e.energy.atp <= 0) || (e.combat && e.combat.hp <= 0)) {
      e.dead = true;
      if (e.control) controlLost = e;
    }
  }

  // Mistede vi den styrede celle? Overdrag styringen til en levende slægtscelle — flokken er
  // dine ekstra liv (SOCIAL §1). Findes ingen, er slægten uddød (game over).
  if (controlLost) {
    const heir = state.entities.find((e) =>
      !e.dead && e.kind === 'cell' && e !== controlLost && !e.control &&
      e.lineage?.lineageId === controlLost.lineage?.lineageId);
    if (heir) {
      heir.control = controlLost.control; // spilleren styrer nu arvingen
      delete heir.ai;                     // den følger ikke længere en AI-politik
      heir.moveTarget = undefined;        // start uden det gamle musemål ...
      heir.moveDir = undefined;           // ... og uden en gammel piletast-retning
    }
  }

  return state;
}
