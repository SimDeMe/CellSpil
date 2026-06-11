// Hovedløs røgtest for tolerance: miljøet straffer celler uden for deres komfort-vindue,
// og ilt forgifter anaerober. Kør: node src/toleranceSmoke.js  (eller: npm run smoke:tolerance)
import { createWorld } from './core/world.js';
import { createCell } from './core/entities.js';

const STEP = 1 / 60;

console.log('\nScenarie 1 — standard-celle: tryg ved overfladen, kuldestresset i dybet:');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false }); // zoner TIL
  const surface = createCell(world.state, { x: 2500, y: 250, isPlayer: true });
  const deep = createCell(world.state, { x: 2500, y: 4750, isPlayer: false });

  world.step(STEP);
  console.log(`  komfort: overflade ${surface.tolerance.comfort.toFixed(2)} · dyb ${deep.tolerance.comfort.toFixed(2)}`);
  const ok = surface.tolerance.comfort > deep.tolerance.comfort && deep.tolerance.comfort < 1;
  console.log(`  → ${ok ? 'dybet er ubehageligt (kulde), overfladen tryg ✓' : 'komfort skiller ikke ✗'}`);
}

console.log('\nScenarie 2 — methanogen: forgiftes af ilt ved overfladen, trives i det iltfrie dyb:');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false });
  const top = createCell(world.state, { x: 2500, y: 250, isPlayer: true, strategy: 'methanogen' });
  const mud = createCell(world.state, { x: 2500, y: 4900, isPlayer: false, strategy: 'methanogen' });

  let topDeath = null;
  for (let i = 0; i < 60 * 60 && topDeath === null; i++) {
    world.step(STEP);
    if (top.dead) topDeath = world.state.time;
  }
  console.log(`  overflade-methanogen: ATP ${top.energy.atp.toFixed(1)} · komfort ${top.tolerance.comfort.toFixed(2)} · ${top.dead ? `DØD efter ${topDeath.toFixed(1)}s` : 'lever'}`);
  console.log(`  dyb-methanogen:       ATP ${mud.energy.atp.toFixed(1)} · komfort ${mud.tolerance.comfort.toFixed(2)} · ${mud.dead ? 'DØD' : 'lever'}`);

  const correct = top.dead && !mud.dead;
  console.log(`  → ${correct ? 'ilt dræbte overflade-anaeroben; dybet var dens hjem ✓' : 'identitets-relativ fare virkede ikke ✗'}`);
}

console.log('');
