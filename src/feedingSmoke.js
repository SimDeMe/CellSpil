// Hovedløs røgtest for spisning: en celle æder mad i kontakt og får ATP + byggesten.
// Kør: node src/feedingSmoke.js   (eller: npm run smoke:feeding)
import { createWorld } from './core/world.js';
import { createCell, createFood } from './core/entities.js';
import { Food } from './config/index.js';

const STEP = 1 / 60;

console.log('\nScenarie — celle står i en klump mad og æder den:');
{
  const world = createWorld({ seed: 1, width: 1000, height: 1000, spawn: false, zones: false });
  const cell = createCell(world.state, { x: 500, y: 500, isPlayer: true });
  cell.energy.atp = 50; // sulten, så vi kan se ATP stige

  // Læg 4 mad-partikler tæt på cellen (inden for rækkevidde) — for lidt til straks at dele sig.
  const N = 4;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    createFood(world.state, { x: 500 + Math.cos(a) * 15, y: 500 + Math.sin(a) * 15 });
  }

  const before = { food: N, atp: cell.energy.atp, amino: cell.resources.amino, nucleo: cell.resources.nucleotide };
  world.step(STEP); // ét skridt er nok til at æde alt i kontakt
  const foodLeft = world.state.entities.filter((e) => !e.dead && e.kind === 'food').length;

  console.log(`  pakke pr. mad: ${JSON.stringify(Food.glucose)}`);
  console.log(`  mad:       ${before.food} → ${foodLeft}`);
  console.log(`  ATP:       ${before.atp.toFixed(1)} → ${cell.energy.atp.toFixed(1)} (loft ${cell.energy.maxAtp})`);
  console.log(`  byggesten: ${before.amino.toFixed(1)}→${cell.resources.amino.toFixed(1)} amino · ${before.nucleo.toFixed(1)}→${cell.resources.nucleotide.toFixed(1)} nukleotid`);

  const ate = foodLeft < before.food;
  const gained = cell.resources.amino > before.amino && cell.energy.atp > before.atp;
  console.log(`  → ${ate ? 'maden blev spist ✓' : 'maden blev IKKE spist ✗'}`);
  console.log(`  → ${gained ? 'cellen fik ATP + byggesten ✓' : 'cellen fik IKKE ressourcer ✗'}`);
}

console.log('');
