// Hovedløs røgtest for slægts-arv: dør den styrede celle, overtager en slægtscelle styringen.
// Kør: node src/lifecycleSmoke.js   (eller: npm run smoke:lifecycle)
import { createWorld } from './core/world.js';
import { createCell } from './core/entities.js';

const STEP = 1 / 60;

console.log('\nScenarie — spillerens celle dør, en slægtscelle overtager styringen:');
{
  // food:0 → stofskiftet kan ikke genoplade en tom celle inden lifecycle kører.
  const world = createWorld({ seed: 1, width: 1000, height: 1000, spawn: false, zones: false, environment: { food: 0 } });
  const player = createCell(world.state, { x: 500, y: 500, isPlayer: true });
  const sibling = createCell(world.state, { x: 550, y: 500, isPlayer: false }); // har AI-politik
  sibling.lineage.lineageId = player.lineage.lineageId; // samme slægt (som en datter ville være)

  console.log(`  før:  spiller=#${player.id} (styret) · søster=#${sibling.id} (AI '${sibling.ai.policy}')`);
  player.energy.atp = 0; // sult ihjel
  world.step(STEP);

  const playerGone = !world.state.entities.includes(player);
  const heirControls = sibling.control?.player === true;
  const heirNoAi = !sibling.ai;
  console.log(`  efter: spiller fjernet=${playerGone} · søster styret=${heirControls} · søster uden AI=${heirNoAi}`);
  console.log(`  → ${playerGone && heirControls && heirNoAi ? 'styringen gik i arv til slægtscellen ✓' : 'arv fejlede ✗'}`);
}

console.log('');
