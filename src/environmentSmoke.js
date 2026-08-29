// Hovedløs røgtest for miljøet: cellens lokale vand afhænger af dybden (y), og det driver
// stofskiftet. Kør: node src/environmentSmoke.js   (eller: npm run smoke:environment)
import { createWorld } from './core/world.js';
import { createCell } from './core/entities.js';

const STEP = 1 / 60;
const f = (v) => v.toFixed(2);

console.log('\nScenarie — miljøet skifter med dybden (overflade → dyb):');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false }); // zoner TIL
  const surface = createCell(world.state, { x: 2500, y: 250, isPlayer: true });  // ~5% dybde
  const mid = createCell(world.state, { x: 2500, y: 2500, isPlayer: false });    // 50% dybde
  const deep = createCell(world.state, { x: 2500, y: 4750, isPlayer: false });   // ~95% dybde

  world.step(STEP); // environmentSystem sætter localEnv

  for (const [navn, c] of [['overflade', surface], ['åbent vand', mid], ['dyb/mudder', deep]]) {
    const e = c.localEnv;
    console.log(`  ${navn.padEnd(11)} y=${String(c.transform.y).padStart(4)}: lys ${f(e.light)} · ilt ${f(e.oxygen)} · mad ${f(e.food)} · svovl ${f(e.sulfur)} · iltfrit ${e.anoxic}`);
  }

  const lysFalder = surface.localEnv.light > mid.localEnv.light && mid.localEnv.light > deep.localEnv.light;
  const dybIltfrit = deep.localEnv.anoxic === true && surface.localEnv.anoxic === false;
  console.log(`  → ${lysFalder ? 'lys + ilt aftager med dybden ✓' : 'gradient forkert ✗'}`);
  console.log(`  → ${dybIltfrit ? 'dybet er iltfrit, overfladen ikke ✓' : 'iltfri-zone forkert ✗'}`);
}

console.log('\nScenarie — rig overflade giver hurtigere vækst end mager dyb:');
{
  const world = createWorld({ seed: 1, width: 5000, height: 5000, spawn: false });
  const surface = createCell(world.state, { x: 2500, y: 250, isPlayer: true });
  const deep = createCell(world.state, { x: 2500, y: 4750, isPlayer: false });
  for (let i = 0; i < 10 * 60; i++) world.step(STEP); // 10 sekunder (før deling)

  const sb = surface.resources.amino + surface.resources.nucleotide;
  const db = deep.resources.amino + deep.resources.nucleotide;
  console.log(`  byggesten efter 10s: overflade ${sb.toFixed(1)} · dyb ${db.toFixed(1)}`);
  console.log(`  → ${sb > db ? 'overfladecellen voksede hurtigst (mere mad/lys) ✓' : 'ingen forskel ✗'}`);
}

console.log('');
