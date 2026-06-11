// Hovedløs røgtest for metabolismen: viser at én celle kan spise, lave ATP og dø.
// Kør: node src/smoke.js   (eller: npm run smoke)
import { createWorld } from './core/world.js';
import { createCell } from './core/entities.js';
import { Metabolism } from './config/index.js';

const STEP = 1 / 60; // fast tidsskridt: 60 skridt pr. sekund

function report(cell, world) {
  const { atp, maxAtp } = cell.energy;
  const { amino, nucleotide } = cell.resources;
  console.log(`  strategi:  ${Metabolism[cell.metabolism.strategy].label}`);
  console.log(`  sim-tid:   ${world.state.time.toFixed(1)}s`);
  console.log(`  ATP:       ${atp.toFixed(1)} / ${maxAtp}`);
  console.log(`  byggesten: ${amino.toFixed(1)} aminosyre · ${nucleotide.toFixed(1)} nukleotid`);
  console.log(`  status:    ${cell.dead ? '☠ DØD' : '✓ LEVER'}`);
}

// --- Scenarie 1: mad i vandet → cellen lever og samler byggesten op til deling ---
console.log('\nScenarie 1 — åbent vand (mad til rådighed):');
{
  const world = createWorld({ seed: 1, width: 1000, height: 1000 });
  const cell = createCell(world.state, { x: 500, y: 500, isPlayer: true });
  for (let i = 0; i < 30 * 60; i++) world.step(STEP); // 30 sekunder
  report(cell, world);
  const klar = cell.resources.amino >= 2.99 && cell.resources.nucleotide >= 2.99;
  console.log(`  → ${klar ? 'nok byggesten til første deling (3+3) — deler sig lige efter (se scenarie 3)' : 'samler stadig byggesten'}`);
}

// --- Scenarie 2: tomt vand (ingen mad) → ATP løber ud, cellen dør ---
console.log('\nScenarie 2 — tomt vand (ingen mad):');
{
  const world = createWorld({ seed: 1, width: 1000, height: 1000, environment: { food: 0 } });
  const cell = createCell(world.state, { x: 500, y: 500, isPlayer: true });
  let deathTime = null;
  for (let i = 0; i < 300 * 60 && deathTime === null; i++) {
    world.step(STEP);
    if (cell.dead) deathTime = world.state.time;
  }
  report(cell, world);
  if (deathTime !== null) console.log(`  → ATP nåede 0 og cellen døde efter ${deathTime.toFixed(1)}s`);
  else console.log('  → cellen overlevede uventet (tjek tallene)');
}

// --- Scenarie 3: deling over tid → én celle bliver til en voksende slægt ---
console.log('\nScenarie 3 — deling over tid (åbent vand):');
{
  const world = createWorld({ seed: 1, width: 1000, height: 1000 });
  createCell(world.state, { x: 500, y: 500, isPlayer: true });
  let prev = 0;
  for (const mark of [30, 60, 120, 180]) {
    for (let i = 0; i < Math.round((mark - prev) * 60); i++) world.step(STEP);
    prev = mark;
    const cells = world.state.entities.filter((e) => e.kind === 'cell');
    const maxGen = Math.max(0, ...cells.map((c) => c.lineage.generation));
    console.log(`  t≈${mark}s: ${cells.length} celle(r) · højeste generation ${maxGen}`);
  }
}

console.log('');
