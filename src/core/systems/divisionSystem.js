// divisionSystem — når en celle har nok byggesten (og ATP nok til at være rask), deler den
// sig i to. Datteren arver gener/strategi/tolerance; ATP og resterende ressourcer fordeles
// ligeligt (ingen gratis energi). Mutation ved deling er forberedt (TODO) men hører til
// evolutionssystemet. Se SPEC.md §3 + SOCIAL.md §1 + BALANCE.md §2.
import { Cell as CellCfg } from '../../config/index.js';
import { createEntity } from '../entities.js';
import * as C from '../components.js';

/** Antal byggesten en deling kræver (skalerer med mutationer, BALANCE §2). */
function divisionNeed(cell) {
  const mutations = cell.lineage?.mutations ?? 0; // 0 indtil mutation-ved-deling bygges
  const extra = mutations * CellCfg.divisionPerMutation;
  return {
    amino: CellCfg.divisionBase.amino + extra,
    nucleotide: CellCfg.divisionBase.nucleotide + extra,
  };
}

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function divisionSystem(state, dt) {
  // Find først alle celler klar til deling. Vi opretter døtre EFTER løkken, så en nyfødt
  // datter ikke når at dele sig i samme tick.
  const ready = [];
  for (const e of state.entities) {
    if (e.dead || e.kind !== 'cell' || !e.resources || !e.energy) continue;
    const need = divisionNeed(e);
    const minAtp = (e.energy.maxAtp ?? CellCfg.maxAtp) * CellCfg.divisionMinAtpFraction;
    if (e.energy.atp >= minAtp &&
        e.resources.amino >= need.amino &&
        e.resources.nucleotide >= need.nucleotide) {
      ready.push({ cell: e, need });
    }
  }

  for (const { cell, need } of ready) divide(state, cell, need);
  return state;
}

function divide(state, parent, need) {
  // 1) Betal byggesten-prisen — det er datterens krop (BALANCE §2).
  parent.resources.amino -= need.amino;
  parent.resources.nucleotide -= need.nucleotide;

  // 2) Fordel ATP og alle resterende ressourcer ligeligt mellem forælder og datter.
  parent.energy.atp /= 2;
  const daughterResources = C.Resources();
  for (const k of Object.keys(parent.resources)) {
    const half = parent.resources[k] / 2;
    parent.resources[k] = half;
    daughterResources[k] = half;
  }

  // 3) Placér datteren lige ved siden af forælderen.
  const r = parent.transform.radius;
  const angle = state.rng() * Math.PI * 2;
  const x = parent.transform.x + Math.cos(angle) * r;
  const y = parent.transform.y + Math.sin(angle) * r;

  // 4) Datteren arver gener, strategi, motorik og tolerance; samme slægt, næste generation.
  // TODO (evolution): her muteres genome'et — tilføj/fjern et gen og tæl lineage.mutations op.
  //   Via divisionNeed() hæver det automatisk delingsprisen (BALANCE §2 + EVOLUTION.md).
  createEntity(state, {
    kind: 'cell',
    transform: C.Transform(x, y, r),
    energy: C.Energy(parent.energy.atp, parent.energy.maxAtp),
    resources: daughterResources,
    genome: C.Genome([...parent.genome.genes]),
    metabolism: C.Metabolism(parent.metabolism.strategy),
    motilityC: C.Motility(parent.motilityC.type),
    tolerance: C.Tolerance({ ...parent.tolerance.ranges }),
    lineage: {
      lineageId: parent.lineage.lineageId,
      colonyId: parent.lineage.colonyId,
      role: parent.lineage.role,
      generation: (parent.lineage.generation ?? 0) + 1,
    },
    combat: C.Combat(parent.combat?.maxHp ?? parent.energy.maxAtp, parent.combat?.dps ?? 0),
    vesicles: C.Vesicles(),
    // Spilleren beholder forælderen; datteren lever videre som autonom klon (SOCIAL §1).
    ai: C.AIState('forage'),
  });
}
