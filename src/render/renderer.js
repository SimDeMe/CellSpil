// render/ — PixiJS. Læser World State og tegner. Må ALDRIG mutere state. Se ARCHITECTURE.md §8.
// Bruger global PIXI (indlæst i index.html). Sætter et kamera op, der følger spilleren,
// og tre lag: miljø-baggrund → celler/mad/fjender → effekter.
import { drawCells } from './cellRenderer.js';
import { drawFields } from './fieldRenderer.js';
import { drawEffects } from './effects.js';

export function createRenderer(app /* PIXI.Application */, state) {
  const PIXI = globalThis.PIXI;

  // Ét container-træ: "world" forskydes/zoomes af kameraet; alt verdens-indhold ligger indeni.
  const world = new PIXI.Container();
  const fieldLayer = new PIXI.Container();
  const cellLayer = new PIXI.Container();
  const effectLayer = new PIXI.Container();
  world.addChild(fieldLayer, cellLayer, effectLayer);
  app.stage.addChild(world);

  // Kamera centrerer på spilleren. zoom > 1 = tættere "mikroskop"-syn.
  const camera = { x: state.width / 2, y: state.height / 2, zoom: 1.2 };

  // Delt tegne-kontekst, som lag-funktionerne bruger (sprite-puljer pr. entitet osv.).
  const gfx = { PIXI, app, fieldLayer, cellLayer, effectLayer, sprites: new Map() };

  return {
    /** @param {import('../core/state.js').WorldState} state @param {number} alpha interpolation 0..1 */
    render(state, alpha) {
      // Følg spillerens celle (kan skifte, hvis den dør og slægten arver styringen).
      const player = state.entities.find((e) => e.control && !e.dead);
      if (player?.transform) { camera.x = player.transform.x; camera.y = player.transform.y; }

      // Læg kamera-transformen på world-containeren: centrér mål-punktet på skærmen.
      const sw = app.screen.width, sh = app.screen.height;
      world.scale.set(camera.zoom);
      world.position.set(sw / 2 - camera.x * camera.zoom, sh / 2 - camera.y * camera.zoom);

      drawFields(state, camera, gfx);
      drawCells(state, camera, alpha, gfx);
      drawEffects(state, camera, alpha, gfx);
    },

    /** Skærm-punkt (mus) → verdens-koordinat, givet det aktuelle kamera. */
    screenToWorld(sx, sy) {
      const sw = app.screen.width, sh = app.screen.height;
      return {
        x: (sx - sw / 2) / camera.zoom + camera.x,
        y: (sy - sh / 2) / camera.zoom + camera.y,
      };
    },

    setCamera(x, y, zoom = camera.zoom) { camera.x = x; camera.y = y; camera.zoom = zoom; },
    camera,
  };
}
