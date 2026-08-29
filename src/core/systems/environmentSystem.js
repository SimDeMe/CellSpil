// environmentSystem — cellens lokale miljø afhænger af dybden (y): solbeskinnet/iltet ved
// overfladen → mørkt, iltfrit, svovlrigt i dybet. Lægger e.localEnv på hver celle, som
// metabolismSystem (og senere tolerance) læser. Se ENVIRONMENT.md §1 + config.Depth.
import { Depth } from '../../config/index.js';

const PARAMS = ['light', 'oxygen', 'food', 'temp', 'ph', 'sulfur', 'nitrate', 'ammonia', 'hydrogen'];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

/** Miljøet på en given y-position, interpoleret mellem dybde-stoppene i config. */
export function sampleEnvironment(state, y) {
  const d = clamp01(y / state.height);
  const stops = Depth.stops;

  // Find de to stop, dybden ligger imellem.
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (d >= stops[i].at && d <= stops[i + 1].at) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const span = hi.at - lo.at || 1;
  const t = (d - lo.at) / span;

  const env = {};
  for (const p of PARAMS) env[p] = lerp(lo[p] ?? 0, hi[p] ?? 0, t);
  env.anoxic = d >= Depth.anoxicBelow;
  return env;
}

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function environmentSystem(state, dt) {
  state.fields.step(dt);
  if (state.zonesEnabled === false) return state; // isolerede tests bruger fast state.environment

  for (const e of state.entities) {
    if (e.dead || !e.transform) continue;
    e.localEnv = sampleEnvironment(state, e.transform.y);
  }
  return state;
}
