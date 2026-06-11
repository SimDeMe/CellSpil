// World State: den ene beholder al simulation læser/skriver. Se ARCHITECTURE.md §2 & §4.
import { createRng } from './rng.js';
import { FieldGrid } from './fields.js';
import { SpatialHash } from './spatial.js';
import { Environment } from '../config/index.js';

/**
 * @typedef {Object} WorldState
 * @property {number} time            sim-tid i sekunder
 * @property {number} width
 * @property {number} height
 * @property {Array}  entities        alle entiteter (data-poser)
 * @property {Array}  intents         input-intents til behandling denne tick
 * @property {number} nextId
 * @property {() => number} rng        seedet tilfældighed
 * @property {FieldGrid} fields        miljø-gitter
 * @property {SpatialHash} spatial     nabo-opslag (genopbygges hver tick)
 */

export function createWorldState(opts = {}) {
  const {
    seed = 1, width = 5000, height = 5000, fieldCell = 100, environment = {},
  } = opts;
  const cols = Math.ceil(width / fieldCell);
  const rows = Math.ceil(height / fieldCell);
  const params = ['light', 'oxygen', 'co2', 'ph', 'temp', 'sulfur', 'nitrate', 'ammonia', 'hydrogen'];

  return {
    time: 0,
    width,
    height,
    entities: [],
    intents: [],
    nextId: 1,
    rng: createRng(seed),
    fields: new FieldGrid(cols, rows, fieldCell, params),
    spatial: new SpatialHash(fieldCell),
    // Cellens lokale miljø (åbent vand som standard). Midlertidigt globalt — erstattes
    // senere af pr.-position felt-sampling, når environmentSystem fylder fields. Se config.
    environment: { ...Environment.ambient, ...environment },
  };
}
