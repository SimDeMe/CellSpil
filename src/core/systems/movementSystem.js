// movementSystem — bevægelse pr. motorik-type (flagel, gliding, spiral, gasvesikler, cilier)
// + bevægelsesomkostning i ATP + chemotaksis-styring. Se EVOLUTION.md §A + BALANCE.md §4.
//
// Hvor vil entiteten hen?
//   - Spilleren: mod musen — kommer ind som en 'move-to'-intent (x,y i verden). Vi gemmer
//     den som blivende mål på cellen, så den bliver ved med at svømme dertil mellem intents.
//   - AI-celler/fjender: mod ai.target (enten en anden entitet eller et fast punkt).
// Bevægelse koster moveCost ATP/s mens cellen faktisk svømmer (står den stille, koster det intet).
import { Motility, Movement } from '../../config/index.js';

/** Find målpunktet {x,y} for en AI-entitet: et mål kan være en entitet eller et fast punkt. */
function pointOf(target) {
  if (!target) return null;
  if (target.transform) return { x: target.transform.x, y: target.transform.y };
  if (typeof target.x === 'number') return { x: target.x, y: target.y };
  return null;
}

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function movementSystem(state, dt) {
  // Spillerens seneste 'flyt-til'-intent (musen). Sidste vinder, hvis der kom flere denne tick.
  let moveTo = null;
  for (const i of state.intents) if (i.type === 'move-to') moveTo = i;

  for (const e of state.entities) {
    if (e.dead || !e.transform || !e.motilityC || !e.energy) continue;

    const mot = Motility[e.motilityC.type] ?? Motility.none;
    if (mot.speed <= 0) { e.motilityC.state = 'idle'; continue; } // 'none' = ren drift

    // Spilleren husker sit musemål; AI bruger sit ai.target.
    if (e.control && moveTo) e.moveTarget = { x: moveTo.x, y: moveTo.y };
    const target = e.control ? e.moveTarget : pointOf(e.ai?.target);
    if (!target) { e.motilityC.state = 'idle'; continue; }

    const dx = target.x - e.transform.x;
    const dy = target.y - e.transform.y;
    const dist = Math.hypot(dx, dy);

    // Nået frem (inden for egen radius + lidt slæk)? Stå stille og spar ATP.
    if (dist <= e.transform.radius + Movement.arriveSlack) {
      e.motilityC.state = 'idle';
      continue;
    }

    // Bevægelse koster ATP — men kun for spillerens celler (de kører på ATP-økonomien).
    // Fjender lever på deres HP-pulje (styret af kamp), ikke stofskifte, så de svømmer "gratis".
    const paysAtp = e.kind === 'cell';
    const cost = mot.moveCost * dt;
    if (paysAtp && e.energy.atp < cost) { e.motilityC.state = 'stalled'; continue; }

    // Flyt mod målet i denne ticks fart, men overskyd aldrig målet.
    const speed = mot.speed * Movement.speedScale; // verdens-enheder pr. sekund
    const stepDist = Math.min(speed * dt, dist);
    e.transform.x += (dx / dist) * stepDist;
    e.transform.y += (dy / dist) * stepDist;
    e.transform.angle = Math.atan2(dy, dx);
    e.motilityC.targetAngle = e.transform.angle;
    e.motilityC.state = 'moving';
    if (paysAtp) e.energy.atp -= cost;

    // Hold inden for verdenskanten.
    if (e.transform.x < 0) e.transform.x = 0;
    else if (e.transform.x > state.width) e.transform.x = state.width;
    if (e.transform.y < 0) e.transform.y = 0;
    else if (e.transform.y > state.height) e.transform.y = state.height;
  }
  return state;
}
