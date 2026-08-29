// cloudSystem — udskilte skyer (toksin/bakteriocin/maltase). To opgaver:
//   1) UDSKIL: spilleren udløser en evne ('use-ability'-intent) → en sky opstår på cellen, hvis den
//      har genet og råd (ATP + aminosyrer). Se EVOLUTION.md §C.
//   2) VIRK: hver tick ældes skyerne, og deres områdeeffekt påføres:
//        - toksin/bakteriocin: skade til fjender i radius (skade + målfilter fra Offense).
//        - maltase: nedbryder maltose-substrat i radius til glukose (Food[kind].breaksInto/Count).
import { Secretions, Offense, Enemies, Food } from '../../config/index.js';
import { createCloud, createFood } from '../entities.js';

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function cloudSystem(state, dt) {
  // 1) Udskil nye skyer fra spillerens evne-intents.
  const uses = state.intents.filter((i) => i.type === 'use-ability');
  if (uses.length) {
    const player = state.entities.find((e) => e.control && !e.dead);
    if (player) for (const u of uses) secrete(state, player, u.ability);
  }

  // 2) Ældn + virk på eksisterende skyer.
  for (const c of state.entities) {
    if (c.dead || c.kind !== 'cloud' || !c.cloud || !c.transform) continue;
    c.cloud.life -= dt;
    if (c.cloud.life <= 0) { c.dead = true; continue; }
    if (Secretions[c.cloud.type]?.enzyme) applyEnzymeCloud(state, c, dt);
    else applyDamageCloud(state, c, dt);
  }
  return state;
}

/** Forsøg at udskille en sky: kræver genet og betaling (ATP + evt. aminosyrer). */
function secrete(state, player, ability) {
  const cfg = Secretions[ability];
  if (!cfg) return;
  if (!player.genome?.genes.has(ability)) return;        // mangler genet
  const costAtp = cfg.costAtp ?? 0;
  const costAmino = cfg.costAmino ?? 0;
  if (player.energy.atp < costAtp) return;               // ikke råd (ATP)
  if ((player.resources?.amino ?? 0) < costAmino) return; // ikke råd (byggesten)
  player.energy.atp -= costAtp;
  if (player.resources) player.resources.amino -= costAmino;
  createCloud(state, { x: player.transform.x, y: player.transform.y, type: ability });
}

/** Enzym-sky (maltase/peptidase): nedbryd matchende substrater i radius GRADVIST over breakTime
 *  sekunder. Hvert substrat samler 'digest' op, mens det ligger i skyen; når det når breakTime,
 *  spaltes det til sine produkter (antal = kædelængden food.n). */
function applyEnzymeCloud(state, c, dt) {
  const R = c.transform.radius;
  for (const f of state.spatial.queryRadius(c.transform.x, c.transform.y, R)) {
    if (f.dead || f.kind !== 'food' || !f.transform || !f.food) continue;
    const fk = Food[f.food.kind];
    if (!fk?.substrate || fk.enzyme !== c.cloud.type) continue; // kun substrater DENNE enzym bryder
    if (Math.hypot(f.transform.x - c.transform.x, f.transform.y - c.transform.y) > R) continue;

    f.food.digest = (f.food.digest ?? 0) + dt;
    if (f.food.digest < (fk.breakTime ?? 2)) continue;          // endnu ikke færdig-nedbrudt

    f.dead = true;
    const into = fk.breaksInto ?? 'glucose';
    const n = f.food.n ?? fk.parts ?? 2;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 7;                        // spred produkterne ud langs kæden
      createFood(state, { x: f.transform.x + off, y: f.transform.y, kind: into });
    }
  }
}

/** Skade-sky (toksin/bakteriocin): ram fjender i radius efter Offense-reglerne. */
function applyDamageCloud(state, c, dt) {
  const o = Offense[c.cloud.type];
  if (!o || !o.dps) return;
  const R = c.transform.radius;
  for (const e of state.spatial.queryRadius(c.transform.x, c.transform.y, R + 40)) {
    if (e.dead || e.kind !== 'enemy' || !e.combat || !e.transform) continue;
    if (Math.hypot(e.transform.x - c.transform.x, e.transform.y - c.transform.y) > R + e.transform.radius) continue;
    const ecfg = Enemies[e.enemyType] ?? {};
    const applies = o.applies === 'all'
      || (o.applies === 'bacteria' && ecfg.type === 'bacteria')
      || (o.applies === 'walled' && ecfg.walled);
    if (!applies) continue;
    e.combat.hp = Math.max(0, e.combat.hp - o.dps * dt);
  }
}
