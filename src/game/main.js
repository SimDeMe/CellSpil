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
import { createLegend } from '../ui/legend.js';

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
  // Forklaringen på madprikkerne er statisk (bygges én gang, opdateres ikke hver frame).
  createLegend(deps.legendRoot);

  // --- Styring: mus eller piletaster. Spilleren vælger selv med knappen i topbaren (eller M).
  // Valget huskes i browseren, så det er det samme næste gang spillet åbnes.
  const win = deps.window || globalThis;
  const store = win.localStorage || null;
  const CONTROL_KEY = 'cellspil.controlMode';
  const controlBtn = deps.controlButton || null;

  function showControlMode() {
    if (controlBtn) {
      controlBtn.textContent = input.mode === 'keys' ? '⌨️ Piletaster' : '🖱️ Mus';
      controlBtn.title = input.mode === 'keys'
        ? 'Styring: piletaster (klik for at skifte til mus)'
        : 'Styring: musen (klik for at skifte til piletaster)';
    }
    if (deps.hintText) {
      deps.hintText.textContent = input.mode === 'keys'
        ? 'Hold piletasterne nede — din celle svømmer den vej.'
        : 'Bevæg musen — din celle svømmer derhen.';
    }
  }

  function setControlMode(mode) {
    input.setMode(mode);
    try { store?.setItem(CONTROL_KEY, input.mode); } catch { /* privat browsing: bare drop det */ }
    showControlMode();
  }

  let savedMode = null;
  try { savedMode = store?.getItem(CONTROL_KEY); } catch { /* ingen adgang til localStorage */ }
  setControlMode(savedMode || 'mouse');

  const toggleControlMode = () => setControlMode(input.mode === 'keys' ? 'mouse' : 'keys');
  if (controlBtn) controlBtn.addEventListener('click', toggleControlMode);

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
  win.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space') { ev.preventDefault(); togglePause(); }
    else if (ev.key === 'm' || ev.key === 'M') toggleControlMode();
  });

  // Fast-tidsskridt-løkke med akkumulator (afkobler sim fra framerate).
  let acc = 0;
  let last = performance.now();

  function frame(now) {
    const elapsed = (now - last) / 1000;
    last = now;

    if (!paused) {
      acc += elapsed;

      if (input.mode === 'keys') {
        // Piletaster: send den retning, der holdes nede (0,0 = slip → cellen stopper).
        const d = input.direction();
        input.emit({ type: 'move-dir', dx: d.dx, dy: d.dy });
      } else if (renderer && input.mouse.seen) {
        // Mus: skærm-position → verdens-koordinat via kameraet → 'move-to'-intent.
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
