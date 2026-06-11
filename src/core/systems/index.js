// System-pipeline: rækkefølgen systemerne kører i hver tick. Se ARCHITECTURE.md §5.
import { environmentSystem } from './environmentSystem.js';
import { metabolismSystem } from './metabolismSystem.js';
import { feedingSystem } from './feedingSystem.js';
import { toleranceSystem } from './toleranceSystem.js';
import { movementSystem } from './movementSystem.js';
import { combatSystem } from './combatSystem.js';
import { divisionSystem } from './divisionSystem.js';
import { colonySystem } from './colonySystem.js';
import { aiSystem } from './aiSystem.js';
import { spawnSystem } from './spawnSystem.js';
import { hazardSystem } from './hazardSystem.js';
import { lifecycleSystem } from './lifecycleSystem.js';

export const pipeline = [
  environmentSystem, // 1. opdater felter (diffusion, gradienter)
  metabolismSystem,  // 2. ATP ind/ud, udskillelse til felter
  feedingSystem,     // 2b. æd mad-partikler i kontakt → ATP + byggesten
  toleranceSystem,   // 3. miljø vs ranges → bonus/stress/skade
  aiSystem,          // 4. fjende- + flok-beslutninger (sætter intents/mål)
  movementSystem,    // 5. bevægelse + bevægelsesomkostning
  combatSystem,      // 6. våben, opsluging, fag-spredning
  colonySystem,      // 7. klynger, ressourcedeling, biofilm, quorum
  divisionSystem,    // 8. vækst, deling, mutation
  spawnSystem,       // 9. mad/fjender/farezoner efter pacing
  hazardSystem,      // 10. farezoner + parameter-ekstremer
  lifecycleSystem,   // 11. død, oprydning, slægts-arv
];
