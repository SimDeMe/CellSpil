// Hovedløs røgtest for spawn: mad og fjender dukker op af sig selv over tid.
// Kør: node src/spawnSmoke.js   (eller: npm run smoke:spawn)
import { createWorld } from './core/world.js';
import { createCell } from './core/entities.js';
import { World, Enemies } from './config/index.js';

const STEP = 1 / 60;

function counts(state) {
  let food = 0, enemies = 0;
  const byType = {};
  for (const e of state.entities) {
    if (e.dead) continue;
    if (e.kind === 'food') food++;
    if (e.kind === 'enemy') { enemies++; byType[e.enemyType] = (byType[e.enemyType] || 0) + 1; }
  }
  return { food, enemies, byType };
}

console.log('\nScenarie — tom verden befolkes over tid (mad + fjender):');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000 });
  createCell(world.state, { x: 2500, y: 2500, isPlayer: true }); // spilleren, til sikkerheds-afstand

  console.log(`  mad pr. sekund: ${World.foodPerSecond} (cap ${World.foodMax}) · bacillus spawnAfter ${Enemies.bacillus.spawnAfter}s`);
  let prev = 0;
  for (const mark of [10, 30, 65, 130]) {
    for (let i = 0; i < Math.round((mark - prev) * 60); i++) world.step(STEP);
    prev = mark;
    const c = counts(world.state);
    const types = Object.entries(c.byType).map(([t, n]) => `${t}×${n}`).join(', ') || 'ingen';
    console.log(`  t≈${String(mark).padStart(3)}s: ${String(c.food).padStart(3)} mad · ${c.enemies} fjende(r) [${types}]`);
  }

  const c = counts(world.state);
  console.log(`  → ${c.food > 100 ? 'mad dukkede op og voksede ✓' : 'mad voksede ikke ✗'}`);
  console.log(`  → ${(c.byType.bacillus || 0) >= 1 ? 'bacillus blev introduceret ✓' : 'ingen bacillus ✗'}`);
}

console.log('');
