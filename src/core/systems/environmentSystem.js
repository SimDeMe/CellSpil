// environmentSystem — opdaterer miljø-gitteret: diffusion, faste gradienter (lys efter dybde,
// temp efter zone), henfald. Se ENVIRONMENT.md §1.
/** @param {import('../state.js').WorldState} state @param {number} dt */
export function environmentSystem(state, dt) {
  state.fields.step(dt);
  // TODO: påfør faste gradienter + henfald af udskilte stoffer.
  return state;
}
