// Hovedløs røgtest for bevægelsen: viser at en celle svømmer mod sit mål og bruger ATP.
// Kør: node src/movementSmoke.js   (eller: npm run smoke:movement)
import { createWorld } from './core/world.js';
import { createCell, createEnemy } from './core/entities.js';
import { Motility, Movement } from './config/index.js';

const STEP = 1 / 60; // fast tidsskridt: 60 skridt pr. sekund

function dist(cell, tx, ty) {
  return Math.hypot(tx - cell.transform.x, ty - cell.transform.y);
}

console.log('\nScenarie — flagel-celle svømmer mod et mål og betaler ATP:');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000 });

  // Svømmer: flagel + et fast mål langt væk (spillerens "musemål").
  const swimmer = createCell(world.state, { x: 500, y: 500, isPlayer: true, motility: 'flagellum' });
  const TX = 4500, TY = 4500;
  swimmer.moveTarget = { x: TX, y: TY };

  // Kontrol: samme celle og stofskifte, men intet mål → står stille (kun stofskifte rører ATP).
  const idle = createCell(world.state, { x: 500, y: 500, isPlayer: true, motility: 'flagellum' });

  const startDist = dist(swimmer, TX, TY);
  const startAtp = swimmer.energy.atp;

  for (let i = 0; i < 10 * 60; i++) world.step(STEP); // 10 sekunder

  const endDist = dist(swimmer, TX, TY);
  const speedPerSec = Motility.flagellum.speed * Movement.speedScale;

  console.log(`  fart:        ${speedPerSec} enheder/s (flagel ${Motility.flagellum.speed} × skala ${Movement.speedScale})`);
  console.log(`  afstand:     ${startDist.toFixed(0)} → ${endDist.toFixed(0)} enheder til målet`);
  console.log(`  position:    (${swimmer.transform.x.toFixed(0)}, ${swimmer.transform.y.toFixed(0)}) · tilstand ${swimmer.motilityC.state}`);
  console.log(`  ATP svømmer: ${startAtp.toFixed(1)} → ${swimmer.energy.atp.toFixed(1)}`);
  console.log(`  ATP stille:  ${idle.energy.atp.toFixed(1)} (til sammenligning)`);

  const cameCloser = endDist < startDist - 100;
  const spentAtp = swimmer.energy.atp < idle.energy.atp - 1;
  console.log(`  → ${cameCloser ? 'svømmede mod målet ✓' : 'kom IKKE nærmere ✗'}`);
  console.log(`  → ${spentAtp ? 'brugte ATP på at svømme (mindre end den stillestående) ✓' : 'brugte IKKE ekstra ATP ✗'}`);
}

console.log('\nScenarie — fjende får øje på spilleren og jager:');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000 });

  // Spilleren står stille (intet musemål); en bacillus starter et stykke væk, inden for synsvidde.
  const player = createCell(world.state, { x: 2500, y: 2500, isPlayer: true, motility: 'flagellum' });
  const enemy = createEnemy(world.state, { x: 2900, y: 2500 }); // ai.policy 'hunt', flagel

  const startGap = Math.hypot(player.transform.x - enemy.transform.x, player.transform.y - enemy.transform.y);
  for (let i = 0; i < 6 * 60; i++) world.step(STEP); // 6 sekunder
  const endGap = Math.hypot(player.transform.x - enemy.transform.x, player.transform.y - enemy.transform.y);

  const targetingPlayer = enemy.ai.target === player;
  console.log(`  afstand:   ${startGap.toFixed(0)} → ${endGap.toFixed(0)} enheder til spilleren`);
  console.log(`  fjende:    (${enemy.transform.x.toFixed(0)}, ${enemy.transform.y.toFixed(0)}) · tilstand ${enemy.motilityC.state} · sigter på spiller: ${targetingPlayer}`);
  console.log(`  → ${endGap < startGap - 100 ? 'fjenden jagede spilleren ✓' : 'fjenden nærmede sig IKKE ✗'}`);
}

console.log('');
