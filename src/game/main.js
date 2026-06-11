// game/main.js — samler lagene og kører fast-tidsskridt-løkken. Browser-entry (kræver PixiJS + DOM).
// Se ARCHITECTURE.md §4 & §9. (Kører IKKE under node — det gør den hovedløse src/smoke.js.)
import { createWorld } from '../core/world.js';
import { createCell, createFood } from '../core/entities.js';
import { createRenderer } from '../render/renderer.js';
import { createInput } from '../input/input.js';
import { createHud } from '../ui/hud.js';

const STEP = 1 / 60; // fast simulationsskridt (sekunder)

export async function startGame(/* { app, root } */ deps = {}) {
  const world = createWorld({ seed: Date.now() & 0xffff, width: 5000, height: 5000 });

  // Startopsætning (TODO: rigtig spawn via spawnSystem).
  createCell(world.state, { x: 2500, y: 2500, isPlayer: true });
  for (let i = 0; i < 200; i++) {
    createFood(world.state, { x: world.state.rng() * 5000, y: world.state.rng() * 5000 });
  }

  const input = createInput(deps.window || globalThis);
  const renderer = deps.app ? createRenderer(deps.app, world.state) : null;
  const hud = deps.root ? createHud(deps.root) : null;

  // Fast-tidsskridt-løkke med akkumulator (afkobler sim fra framerate).
  let acc = 0;
  let last = performance.now();

  function frame(now) {
    acc += (now - last) / 1000;
    last = now;

    input.drainInto(world.state);
    while (acc >= STEP) {
      world.step(STEP);
      acc -= STEP;
    }

    const alpha = acc / STEP; // til interpolation af rendering
    if (renderer) renderer.render(world.state, alpha);
    if (hud) hud.update(world.state);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return world;
}
