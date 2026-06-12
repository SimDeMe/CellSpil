// input/ — oversætter mus/taster til INTENTS (ikke direkte celle-mutation). Se ARCHITECTURE.md §9.
// Intent-typer: 'move-to', 'divide', 'use-ability', 'set-policy', 'rally', 'take-over-cell',
//               'buy-mutation', 'set-lens'.
import { Secretions } from '../config/index.js';

const ABILITY_KEYS = Object.keys(Secretions); // tal-tast 1..n → udskil n'te evne

export function createInput(target /* window/element */) {
  const queue = [];
  const emit = (intent) => queue.push(intent);

  // Vi gemmer musens SKÆRM-position råt. Spil-løkken (game/main.js) regner den om til
  // verdens-koordinater via kameraet og udsender så 'move-to'-intent'en. På den måde svømmer
  // cellen mod det rigtige punkt, også når kameraet følger den rundt i verden.
  const mouse = { x: 0, y: 0, seen: false };

  if (target?.addEventListener) {
    target.addEventListener('mousemove', (ev) => {
      mouse.x = ev.clientX; mouse.y = ev.clientY; mouse.seen = true;
    });
  }

  // Tasten D → 'divide'-intent (del den styrede celle, hvis den er klar).
  if (target?.addEventListener) {
    target.addEventListener('keydown', (ev) => {
      if (ev.repeat) return; // ét tryk = én handling (ignorér auto-gentag ved hold)
      if (ev.key === 'd' || ev.key === 'D') { emit({ type: 'divide' }); return; }
      // Tal-taster 1..n → udskil den tilsvarende sky-evne (cloudSystem tjekker, om genet haves).
      const n = Number(ev.key);
      if (Number.isInteger(n) && n >= 1 && n <= ABILITY_KEYS.length) {
        emit({ type: 'use-ability', ability: ABILITY_KEYS[n - 1] });
      }
    });
  }

  // TODO: flere event-listeners (E/R→use-ability ...).

  return {
    emit,
    mouse,
    /** Tøm køen ind i state.intents i starten af en tick. */
    drainInto(state) {
      for (const i of queue) state.intents.push(i);
      queue.length = 0;
    },
  };
}
