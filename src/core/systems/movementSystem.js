// movementSystem — bevægelse pr. motorik-type (flagel, gliding, spiral, gasvesikler, cilier)
// + bevægelsesomkostning i ATP + chemotaksis-styring. Se EVOLUTION.md §A + BALANCE.md §4.
//
// Hvor vil entiteten hen? Spilleren kan styres på to måder (man vælger selv i spillet):
//   - MUS: en 'move-to'-intent (x,y i verden = et PUNKT). Vi gemmer den som blivende mål på
//     cellen, så den bliver ved med at svømme dertil mellem intents — og stopper, når den er fremme.
//   - PILETASTER: en 'move-dir'-intent (dx,dy = en RETNING). Cellen svømmer bare den vej,
//     så længe tasten holdes nede; dx=dy=0 betyder "slip" → stå stille.
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
  // Spillerens seneste styre-intents denne tick. Sidste vinder, hvis der kom flere.
  let moveTo = null;  // mus: et punkt
  let moveDir = null; // piletaster: en retning
  for (const i of state.intents) {
    if (i.type === 'move-to') moveTo = i;
    else if (i.type === 'move-dir') moveDir = i;
  }

  for (const e of state.entities) {
    if (e.dead || !e.transform || !e.motilityC || !e.energy) continue;

    const mot = Motility[e.motilityC.type] ?? Motility.none;
    if (mot.speed <= 0) { e.motilityC.state = 'idle'; continue; } // 'none' = ren drift

    // Spillerens styring gemmes PÅ CELLEN (e.moveTarget / e.moveDir), ikke i intent-køen.
    // Intents lever kun én tick, men et frame kan nå at køre mange ticks (fx efter et hak i
    // billedhastigheden). Ville retningen kun gælde den første tick, ville piletasterne flytte
    // cellen langsommere end musen. De to styringer udelukker hinanden: den nyeste vinder.
    if (e.control) {
      if (moveDir) {
        const len = Math.hypot(moveDir.dx, moveDir.dy);
        e.moveDir = len === 0 ? null : { dx: moveDir.dx / len, dy: moveDir.dy / len };
        e.moveTarget = null;
      } else if (moveTo) {
        e.moveTarget = { x: moveTo.x, y: moveTo.y };
        e.moveDir = null;
      }
    }

    // Find svømmeretningen (ux,uy = enhedsvektor) og hvor langt der er igen til målet.
    let ux, uy, dist;

    if (e.control && e.moveDir) {
      // TASTATUR-styring: ren retning, ingen destination at "nå frem til" — bare fremad.
      ux = e.moveDir.dx;
      uy = e.moveDir.dy;
      dist = Infinity;
    } else {
      // MÅL-styring: spilleren svømmer mod sit musemål; AI mod sit ai.target.
      const target = e.control ? e.moveTarget : pointOf(e.ai?.target);
      if (!target) { e.motilityC.state = 'idle'; continue; }

      const dx = target.x - e.transform.x;
      const dy = target.y - e.transform.y;
      dist = Math.hypot(dx, dy);

      // Nået frem (inden for egen radius + lidt slæk)? Stå stille og spar ATP.
      if (dist <= e.transform.radius + Movement.arriveSlack) {
        e.motilityC.state = 'idle';
        continue;
      }
      ux = dx / dist;
      uy = dy / dist;
    }

    // Bevægelse koster ATP — men kun for spillerens celler (de kører på ATP-økonomien).
    // Fjender lever på deres HP-pulje (styret af kamp), ikke stofskifte, så de svømmer "gratis".
    const paysAtp = e.kind === 'cell';
    const cost = mot.moveCost * dt;
    if (paysAtp && e.energy.atp < cost) { e.motilityC.state = 'stalled'; continue; }

    // Flyt i denne ticks fart, men overskyd aldrig målet (ved retnings-styring er dist uendelig).
    const speed = mot.speed * Movement.speedScale; // verdens-enheder pr. sekund
    const stepDist = Math.min(speed * dt, dist);
    e.transform.x += ux * stepDist;
    e.transform.y += uy * stepDist;
    e.transform.angle = Math.atan2(uy, ux);
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
