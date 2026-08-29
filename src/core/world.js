// World: orkestrerer ét fast tidsskridt. Se ARCHITECTURE.md §4.
// step(dt) kører systemerne i fast rækkefølge over den fælles state.
import { createWorldState } from './state.js';
import { pipeline } from './systems/index.js';

export function createWorld(opts = {}) {
  const state = createWorldState(opts);

  return {
    state,

    /** Ét simulationsskridt. Kald med fast dt (akkumulator-mønster i game/main.js). */
    step(dt) {
      // Genopbyg spatial-index for denne tick.
      state.spatial.clear();
      for (const e of state.entities) if (!e.dead) state.spatial.insert(e);

      // Kør systemer i rækkefølge.
      for (const system of pipeline) system(state, dt);

      // Ryd døde entiteter (lifecycleSystem markerer dem).
      if (state.entities.some((e) => e.dead)) {
        state.entities = state.entities.filter((e) => !e.dead);
      }

      // Intents er kun gyldige denne tick — tøm køen, så den ikke vokser uendeligt.
      // (Blivende mål, fx spillerens musemål, gemmes på selve cellen af movementSystem.)
      state.intents.length = 0;

      state.time += dt;
      return state;
    },
  };
}
