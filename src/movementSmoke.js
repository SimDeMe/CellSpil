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
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false, zones: false });

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

console.log('\nScenarie — piletast-styring: retning i stedet for musemål:');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false, zones: false });
  const player = createCell(world.state, { x: 2500, y: 2500, isPlayer: true, motility: 'flagellum' });

  // "Op + højre holdes nede" i 3 sekunder. Intents gælder kun én tick, så vi sender den hver tick
  // — præcis som spil-løkken gør, mens tasten er nede.
  const start = { x: player.transform.x, y: player.transform.y };
  for (let i = 0; i < 3 * 60; i++) {
    world.state.intents.push({ type: 'move-dir', dx: 1, dy: -1 });
    world.step(STEP);
  }
  const moved = { x: player.transform.x, y: player.transform.y };
  const travel = Math.hypot(moved.x - start.x, moved.y - start.y);

  // "Tasterne slippes" (0,0) i 2 sekunder → cellen skal stå helt stille.
  for (let i = 0; i < 2 * 60; i++) {
    world.state.intents.push({ type: 'move-dir', dx: 0, dy: 0 });
    world.step(STEP);
  }
  const drift = Math.hypot(player.transform.x - moved.x, player.transform.y - moved.y);

  console.log(`  holder op+højre: (${start.x.toFixed(0)}, ${start.y.toFixed(0)}) → (${moved.x.toFixed(0)}, ${moved.y.toFixed(0)}) · ${travel.toFixed(0)} enheder`);
  console.log(`  efter slip:      (${player.transform.x.toFixed(0)}, ${player.transform.y.toFixed(0)}) · tilstand ${player.motilityC.state} · flyttede sig ${drift.toFixed(1)}`);

  const wentUpRight = moved.x > start.x + 100 && moved.y < start.y - 100;
  console.log(`  → ${wentUpRight ? 'svømmede op og til højre ✓' : 'svømmede IKKE i den holdte retning ✗'}`);
  console.log(`  → ${drift < 0.001 ? 'stoppede da tasterne blev sluppet ✓' : 'blev ved med at flytte sig ✗'}`);
}

console.log('\nScenarie — retningen huskes på cellen (ét frame kan køre mange sim-skridt):');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false, zones: false });
  const player = createCell(world.state, { x: 2500, y: 2500, isPlayer: true, motility: 'flagellum' });

  // Send retningen ÉN gang, og kør så 2 sekunder uden at sende den igen — præcis som når
  // browseren har hakket, og ét frame skal indhente mange simulations-skridt.
  world.state.intents.push({ type: 'move-dir', dx: 0, dy: -1 });
  const y0 = player.transform.y;
  for (let i = 0; i < 2 * 60; i++) world.step(STEP);
  const travelled = y0 - player.transform.y;

  // Skifter man tilbage til musen, skal et musemål overtrumfe den huskede retning.
  world.state.intents.push({ type: 'move-to', x: player.transform.x, y: player.transform.y });
  world.step(STEP);
  const yAfterMouse = player.transform.y;
  for (let i = 0; i < 60; i++) world.step(STEP); // 1 sekund uden nye intents
  const driftAfterMouse = Math.abs(player.transform.y - yAfterMouse);

  console.log(`  ét 'op' + 2 sek:  svømmede ${travelled.toFixed(0)} enheder opad (forventet ~300)`);
  console.log(`  derefter musemål: står på (${player.transform.x.toFixed(0)}, ${player.transform.y.toFixed(0)}) · tilstand ${player.motilityC.state} · afdrift ${driftAfterMouse.toFixed(1)}`);
  console.log(`  → ${travelled > 250 ? 'retningen blev husket hele vejen ✓' : 'retningen blev glemt efter første skridt ✗'}`);
  console.log(`  → ${driftAfterMouse < 0.001 ? 'musemålet overtog styringen ✓' : 'kørte videre på den gamle retning ✗'}`);
}

console.log('\nScenarie — fjende får øje på spilleren og jager:');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false, zones: false });

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
