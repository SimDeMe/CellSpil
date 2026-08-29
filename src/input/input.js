// input/ — oversætter mus/taster til INTENTS (ikke direkte celle-mutation). Se ARCHITECTURE.md §9.
// Intent-typer: 'move-to', 'move-dir', 'divide', 'use-ability', 'set-policy', 'rally',
//               'take-over-cell', 'buy-mutation', 'set-lens'.
import { Secretions } from '../config/index.js';

const ABILITY_KEYS = Object.keys(Secretions); // tal-tast 1..n → udskil n'te evne

// De to styringsmåder, spilleren kan vælge imellem.
export const CONTROL_MODES = ['mouse', 'keys'];

// Piletaster → retning. Kun piletaster (ikke WASD), fordi D allerede betyder "del dig".
const ARROWS = {
  ArrowUp:    { dx:  0, dy: -1 },
  ArrowDown:  { dx:  0, dy:  1 },
  ArrowLeft:  { dx: -1, dy:  0 },
  ArrowRight: { dx:  1, dy:  0 },
};

export function createInput(target /* window/element */) {
  const queue = [];
  const emit = (intent) => queue.push(intent);

  // Vi gemmer musens SKÆRM-position råt. Spil-løkken (game/main.js) regner den om til
  // verdens-koordinater via kameraet og udsender så 'move-to'-intent'en. På den måde svømmer
  // cellen mod det rigtige punkt, også når kameraet følger den rundt i verden.
  const mouse = { x: 0, y: 0, seen: false };

  // Hvilke piletaster holdes nede lige nu (navn → true).
  const held = new Set();

  // Valgt styring. Spil-løkken læser den hver frame og sender den rette intent.
  const api = { mode: 'mouse' };

  if (target?.addEventListener) {
    target.addEventListener('mousemove', (ev) => {
      mouse.x = ev.clientX; mouse.y = ev.clientY; mouse.seen = true;
    });

    target.addEventListener('keydown', (ev) => {
      // Piletaster: husk at de holdes nede (og lad ikke siden scrolle).
      if (ARROWS[ev.key]) { held.add(ev.key); ev.preventDefault(); return; }

      if (ev.repeat) return; // ét tryk = én handling (ignorér auto-gentag ved hold)
      // Tasten D → 'divide'-intent (del den styrede celle, hvis den er klar).
      if (ev.key === 'd' || ev.key === 'D') { emit({ type: 'divide' }); return; }
      // Tal-taster 1..n → udskil den tilsvarende sky-evne (cloudSystem tjekker, om genet haves).
      const n = Number(ev.key);
      if (Number.isInteger(n) && n >= 1 && n <= ABILITY_KEYS.length) {
        emit({ type: 'use-ability', ability: ABILITY_KEYS[n - 1] });
      }
    });

    target.addEventListener('keyup', (ev) => {
      if (ARROWS[ev.key]) held.delete(ev.key);
    });

    // Klikker man væk fra vinduet, "slipper" vi tasterne — ellers sidder cellen fast i én retning.
    target.addEventListener('blur', () => held.clear());
  }

  // TODO: flere event-listeners (E/R→use-ability ...).

  api.emit = emit;
  api.mouse = mouse;

  /** Summen af de piletaster, der holdes nede, som en retning {dx,dy} (0,0 = ingen). */
  api.direction = () => {
    let dx = 0, dy = 0;
    for (const key of held) { dx += ARROWS[key].dx; dy += ARROWS[key].dy; }
    return { dx, dy };
  };

  /** Skift styring. Ukendte navne ignoreres. Retur: den mode der nu gælder. */
  api.setMode = (mode) => {
    if (CONTROL_MODES.includes(mode)) {
      api.mode = mode;
      held.clear(); // start på en frisk, så en holdt tast ikke hænger ved
    }
    return api.mode;
  };

  /** Tøm køen ind i state.intents i starten af en tick. */
  api.drainInto = (state) => {
    for (const i of queue) state.intents.push(i);
    queue.length = 0;
  };

  return api;
}
