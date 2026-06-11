// render/ — PixiJS. Læser World State og tegner. Må ALDRIG mutere state. Se ARCHITECTURE.md §8.
// import * as PIXI from 'pixi.js'  (browser)
import { drawCells } from './cellRenderer.js';
import { drawFields } from './fieldRenderer.js';
import { drawEffects } from './effects.js';

export function createRenderer(app /* PIXI.Application */, state) {
  // TODO: opsæt lag (baggrund/felt-overlay → celler → effekter), kamera, container-refs.
  const camera = { x: 0, y: 0, zoom: 1 };

  return {
    /** @param {import('../core/state.js').WorldState} state @param {number} alpha interpolation 0..1 */
    render(state, alpha) {
      drawFields(state, camera);
      drawCells(state, camera, alpha);
      drawEffects(state, camera, alpha);
    },
    setCamera(x, y, zoom = 1) {
      camera.x = x; camera.y = y; camera.zoom = zoom;
    },
  };
}
