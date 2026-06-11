// spawnSystem — føde og fjender dukker op over tid efter pacing i config (World + Enemies).
// Se ENEMIES.md §6 + BALANCE.md §1. (Farezoner hører til hazardSystem.)
//
// Mad: fylder op til World.foodMax med World.foodPerSecond partikler/sekund.
// Fjender: hver type introduceres ved sin spawnAfter (sekunder), derefter én pr. spawnInterval
//   op til popCap. spawnInterval 0 = kun én gang. Fjender spawner mindst enemySafeRadius fra
//   spilleren (fair varsel). Typer der kræver endnu ikke-byggede systemer (fag-infektion,
//   rival-kolonier) spawner ikke endnu.
import { World, Enemies } from '../../config/index.js';
import { createFood, createEnemy } from '../entities.js';

/** Spawner denne fjendetype automatisk endnu? (fag + rival-koloni venter på egne systemer). */
function autoSpawns(cfg) {
  return !cfg.infectionTime && !cfg.cellCount;
}

/** Et tilfældigt punkt mindst `safe` fra spilleren (eller hvor som helst, hvis ingen spiller). */
function spawnPos(state, player, safe) {
  for (let i = 0; i < 8; i++) {
    const x = state.rng() * state.width;
    const y = state.rng() * state.height;
    if (!player || Math.hypot(x - player.transform.x, y - player.transform.y) >= safe) {
      return { x, y };
    }
  }
  // Gav op efter 8 forsøg: skub punktet ud fra spilleren langs en tilfældig retning.
  const ang = state.rng() * Math.PI * 2;
  const px = player?.transform.x ?? state.width / 2;
  const py = player?.transform.y ?? state.height / 2;
  return {
    x: Math.max(0, Math.min(state.width, px + Math.cos(ang) * safe)),
    y: Math.max(0, Math.min(state.height, py + Math.sin(ang) * safe)),
  };
}

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function spawnSystem(state, dt) {
  const s = (state.spawn ??= { foodAcc: 0, enemyNext: {} });

  // --- MAD ---
  let foodCount = 0;
  for (const e of state.entities) if (!e.dead && e.kind === 'food') foodCount++;

  s.foodAcc += World.foodPerSecond * dt;
  while (s.foodAcc >= 1 && foodCount < World.foodMax) {
    createFood(state, { x: state.rng() * state.width, y: state.rng() * state.height });
    s.foodAcc -= 1;
    foodCount++;
  }
  if (foodCount >= World.foodMax) s.foodAcc = 0; // ophob ikke "gæld", når verden er fuld

  // --- FJENDER ---
  let player = null;
  for (const e of state.entities) if (!e.dead && e.control && e.transform) { player = e; break; }

  for (const [type, cfg] of Object.entries(Enemies)) {
    if (!autoSpawns(cfg) || state.time < cfg.spawnAfter) continue;

    // Første gang typen er moden: planlæg første spawn til netop spawnAfter.
    if (s.enemyNext[type] === undefined) s.enemyNext[type] = cfg.spawnAfter;
    if (state.time < s.enemyNext[type]) continue;

    let count = 0;
    for (const e of state.entities) if (!e.dead && e.kind === 'enemy' && e.enemyType === type) count++;
    if (count < cfg.popCap) {
      const pos = spawnPos(state, player, World.enemySafeRadius);
      createEnemy(state, { x: pos.x, y: pos.y, type, hp: cfg.hp, radius: cfg.radius });
    }

    // Planlæg næste spawn (interval 0 = aldrig igen).
    s.enemyNext[type] = cfg.spawnInterval > 0 ? s.enemyNext[type] + cfg.spawnInterval : Infinity;
  }

  return state;
}
