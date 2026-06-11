// hazardSystem — farezoner (gift, antibiotika) + parameter-ekstremer (pH, temp, iltchok,
// iltsvind, UV) → skade efter cellens forsvar/tolerance. Se ENEMIES.md §2 + ENVIRONMENT.md.
/** @param {import('../state.js').WorldState} state @param {number} dt */
export function hazardSystem(state, dt) {
  // TODO: for hver aktiv farezone/ekstrem — påfør skade til ubeskyttede celler i området,
  //       reduceret af relevante forsvars-gener (config.Defenses).
  return state;
}
