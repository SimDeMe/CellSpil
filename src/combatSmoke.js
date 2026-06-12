// Hovedløs røgtest for kampen: fjender gør skade, spilleren slår igen, og opsluging.
// Kør: node src/combatSmoke.js   (eller: npm run smoke:combat)
import { createWorld } from './core/world.js';
import { createCell, createEnemy } from './core/entities.js';
import { Enemies, Offense } from './config/index.js';

const STEP = 1 / 60;

console.log('\nScenarie A — Megabacillus opsluger en lille spiller (16 skade/s):');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false, zones: false });
  const player = createCell(world.state, { x: 2500, y: 2500, isPlayer: true }); // radius 20 < 30
  createEnemy(world.state, { x: 2520, y: 2500, type: 'megabacillus', hp: 250, radius: 36 });

  const startAtp = player.energy.atp;
  let deathTime = null;
  for (let i = 0; i < 15 * 60 && deathTime === null; i++) {
    world.step(STEP);
    if (player.dead && deathTime === null) deathTime = world.state.time;
  }
  console.log(`  spiller-ATP: ${startAtp.toFixed(1)} → ${player.energy.atp.toFixed(1)}`);
  console.log(`  → ${deathTime !== null ? `spilleren blev ædt og døde efter ${deathTime.toFixed(1)}s ✓` : 'spilleren overlevede uventet ✗'}`);
}

console.log('\nScenarie B — spiller udskiller toksin-skyer og slår en Bacillus ihjel:');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false, zones: false });
  const player = createCell(world.state, { x: 2500, y: 2500, isPlayer: true, genes: ['toxin'] });
  player.energy.atp = 999; player.resources.amino = 99; // rigeligt til at udskille skyer i testen
  const enemy = createEnemy(world.state, { x: 2516, y: 2500, type: 'bacillus', hp: 50, radius: 14 });

  const startHp = enemy.combat.hp;
  let killTime = null;
  for (let i = 0; i < 20 * 60 && killTime === null; i++) {
    if (i % 90 === 0) world.state.intents.push({ type: 'use-ability', ability: 'toxin' }); // udskil sky løbende
    world.step(STEP);
    if (enemy.dead && killTime === null) killTime = world.state.time;
  }
  console.log(`  toksin-sky-dps: ${Offense.toxin.dps} · fjende-HP ${startHp}`);
  console.log(`  spiller lever: ${!player.dead}`);
  console.log(`  → ${killTime !== null ? `fjenden døde i skyen efter ${killTime.toFixed(1)}s ✓` : 'fjenden overlevede ✗'}`);
}

console.log('\nScenarie C — stor spiller med endocytose opsluger en Bacillus øjeblikkeligt:');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false, zones: false });
  const player = createCell(world.state, { x: 2500, y: 2500, isPlayer: true, genes: ['endocytosis'] });
  player.transform.radius = 40; // stor celle (≥ 120% af fjendens radius 14)
  const enemy = createEnemy(world.state, { x: 2540, y: 2500, type: 'bacillus', hp: 50, radius: 14 });

  world.step(STEP); // ét skridt
  console.log(`  fjende død efter 1 skridt: ${enemy.dead}`);
  console.log(`  → ${enemy.dead ? 'spilleren opslugte fjenden ✓' : 'fjenden blev ikke opslugt ✗'}`);
}

console.log('');
