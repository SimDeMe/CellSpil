// game/main.js — samler lagene og kører fast-tidsskridt-løkken. Browser-entry (kræver PixiJS + DOM).
// Se ARCHITECTURE.md §4 & §9. (Kører IKKE under node — det gør den hovedløse src/smoke.js.)
import { createWorld } from '../core/world.js';
import { createCell } from '../core/entities.js';
import { createRenderer } from '../render/renderer.js';
import { createInput } from '../input/input.js';
import { createHud } from '../ui/hud.js';
import { createMinimap } from '../ui/minimap.js';
import { createInspector } from '../ui/inspector.js';
import { createDivideButton } from '../ui/divideButton.js';
import { createCellInspect } from '../ui/cellInspect.js';
import { createAbilityBar } from '../ui/abilityBar.js';

const STEP = 1 / 60; // fast simulationsskridt (sekunder)

export async function startGame(deps = {}) {
  const world = createWorld({ seed: Date.now() & 0xffff, width: 5000, height: 5000 });

  // Spilleren starter i midten. Mad og fjender klarer spawnSystem selv (spawnEnabled er til).
  // En flagel giver cellen fart, så musestyringen kan mærkes med det samme.
  createCell(world.state, { x: 2500, y: 2500, isPlayer: true, motility: 'flagellum' });

  const input = createInput(deps.window || globalThis);
  const renderer = deps.app ? createRenderer(deps.app, world.state) : null;
  const hud = deps.hudRoot ? createHud(deps.hudRoot) : null;
  const minimap = deps.minimapCanvas ? createMinimap(deps.minimapCanvas) : null;
  const inspector = deps.inspectorRoot ? createInspector(deps.inspectorRoot, input.emit) : null;
  const divideButton = deps.divideButton ? createDivideButton(deps.divideButton, input.emit) : null;
  const cellInspect = deps.inspect ? createCellInspect(deps.inspect) : null;
  const abilityBar = deps.abilityBar ? createAbilityBar(deps.abilityBar, input.emit) : null;

  // Pause: stopper KUN simulationen — rendering + paneler (fx Inspect) kører videre, så man
  // kan studere cellen i ro. Knap + mellemrumstast slår pause til/fra.
  let paused = false;
  const pauseBtn = deps.pauseButton || null;
  function togglePause() {
    paused = !paused;
    if (pauseBtn) {
      pauseBtn.textContent = paused ? '▶ Fortsæt' : '⏸ Pause';
      pauseBtn.classList.toggle('paused', paused);
    }
  }
  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
  (deps.window || globalThis).addEventListener('keydown', (ev) => {
    if (ev.code === 'Space') { ev.preventDefault(); togglePause(); }
  });

  // Fast-tidsskridt-løkke med akkumulator (afkobler sim fra framerate).
  let acc = 0;
  let last = performance.now();

  function frame(now) {
    const elapsed = (now - last) / 1000;
    last = now;

    if (!paused) {
      acc += elapsed;

      // Musens skærm-position → verdens-koordinat via kameraet → 'move-to'-intent.
      if (renderer && input.mouse.seen) {
        const w = renderer.screenToWorld(input.mouse.x, input.mouse.y);
        input.emit({ type: 'move-to', x: w.x, y: w.y });
      }

      input.drainInto(world.state);
      while (acc >= STEP) {
        world.step(STEP);
        acc -= STEP;
      }
    }

    const alpha = acc / STEP; // til interpolation af rendering
    if (renderer) renderer.render(world.state, alpha);
    if (hud) hud.update(world.state);
    if (minimap) minimap.update(world.state);
    if (inspector) inspector.update(world.state);
    if (divideButton) divideButton.update(world.state);
    if (cellInspect) cellInspect.update(world.state);
    if (abilityBar) abilityBar.update(world.state);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return world;
}
