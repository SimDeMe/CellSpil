// toleranceSystem — sammenlign lokal miljøværdi med cellens ranges → bonus/stress/skade,
// og sæt tolerance.comfort (driver trivsels-glød). Mutationer flytter ranges. Se ENVIRONMENT.md §3-4.
/** @param {import('../state.js').WorldState} state @param {number} dt */
export function toleranceSystem(state, dt) {
  // TODO: for hver celle med tolerance — sample hver parameter, find værste bånd,
  //       påfør skade/straf eller bonus, og udregn comfort 0..1.
  return state;
}
