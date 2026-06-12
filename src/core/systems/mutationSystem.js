// mutationSystem — erhverver mutationer for den styrede celle ud fra 'buy-mutation'-intents.
// Se EVOLUTION.md + BALANCE.md §2. Effekterne ligger allerede i de andre systemer; her ÆNDRER vi
// kun cellens data (aktiv strategi/motorik, gen-sæt, størrelse) og betaler i nukleotider.
//
// Tre grene (config Evolution.branches):
//   - metabolisme & motorik = SKIFT: man låser op (betaler én gang) og kan derefter skifte aktiv
//     gratis mellem de oplåste. Aktiv = cell.metabolism.strategy / cell.motilityC.type.
//   - værktøjer = ADDITIVE: lægges i cell.genome.genes og stabler (kamp/forsvar/upkeep/størrelse).
// Hvert KØB tæller lineage.mutations op → divisionSystem hæver automatisk delingsprisen.
import { Metabolism, Motility, Tools, Evolution, PlayerSize } from '../../config/index.js';

function branchOf(id) {
  const b = Evolution.branches;
  if (b.metabolism.includes(id)) return 'metabolism';
  if (b.motility.includes(id)) return 'motility';
  if (b.tool.includes(id)) return 'tool';
  return null;
}

function priceOf(branch, id) {
  if (branch === 'metabolism') return Metabolism[id]?.price ?? 0;
  if (branch === 'motility') return Motility[id]?.price ?? 0;
  return Tools[id]?.price ?? 0;
}

/** Har cellen allerede låst denne mutation op? (start-gener tæller som oplåst.) */
export function ownsMutation(cell, branch, id) {
  if (branch === 'metabolism' && id === Evolution.startStrategy) return true;
  if (branch === 'motility' && id === Evolution.startMotility) return true;
  return !!cell.genome?.genes.has(id);
}

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function mutationSystem(state, dt) {
  const buys = state.intents.filter((i) => i.type === 'buy-mutation');
  if (!buys.length) return state;

  const player = state.entities.find((e) => e.control && !e.dead);
  if (!player || !player.genome) return state;

  for (const b of buys) {
    const branch = branchOf(b.id);
    if (branch) applyBuy(player, branch, b.id);
  }
  return state;
}

function applyBuy(cell, branch, id) {
  const already = ownsMutation(cell, branch, id);

  // Skift-grene: betal kun, hvis den ikke er oplåst endnu; skift derefter altid aktiv (gratis).
  if (branch === 'metabolism' || branch === 'motility') {
    if (!already && !pay(cell, priceOf(branch, id))) return; // ikke råd → ingen ændring
    if (!already) registerMutation(cell, id);
    if (branch === 'metabolism') cell.metabolism.strategy = id;
    else cell.motilityC.type = id;
    return;
  }

  // Værktøjsgren: kun køb hvis ikke ejet og man har råd.
  if (already) return;
  if (!pay(cell, priceOf('tool', id))) return;
  registerMutation(cell, id);
  applyToolSideEffects(cell, id);
}

/** Træk prisen fra nukleotider. Returnér false (uden at ændre noget), hvis ikke råd. */
function pay(cell, price) {
  if ((cell.resources?.nucleotide ?? 0) < price) return false;
  cell.resources.nucleotide -= price;
  return true;
}

function registerMutation(cell, id) {
  cell.genome.genes.add(id);
  cell.lineage.mutations = (cell.lineage.mutations ?? 0) + 1;
}

function applyToolSideEffects(cell, id) {
  // Megacytose gør cellen stor (radius) — påvirker både opsluging og forsvar mod opsluging.
  if (id === 'megacytosis' && cell.transform) {
    cell.transform.radius = Math.max(cell.transform.radius, PlayerSize.megacytosis);
  }
}
