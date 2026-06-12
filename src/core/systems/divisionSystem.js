// divisionSystem — når en celle har nok byggesten (og ATP nok til at være rask), deler den
// sig i to. Datteren arver gener/strategi/tolerance; ATP og resterende ressourcer fordeles
// ligeligt (ingen gratis energi). Mutation ved deling er forberedt (TODO) men hører til
// evolutionssystemet. Se SPEC.md §3 + SOCIAL.md §1 + BALANCE.md §2.
import { Cell as CellCfg, World } from '../../config/index.js';
import { createEntity } from '../entities.js';
import * as C from '../components.js';

/** Antal byggesten en deling kræver (skalerer med mutationer, BALANCE §2). */
export function divisionNeed(cell) {
  const mutations = cell.lineage?.mutations ?? 0;
  const extra = mutations * CellCfg.divisionPerMutation;
  return {
    amino: CellCfg.divisionBase.amino + extra,
    nucleotide: CellCfg.divisionBase.nucleotide + extra,
  };
}

/** Delings-status: er der nok byggesten, og er der ATP nok? (til knappens forklaring.) */
export function divisionStatus(cell) {
  if (!cell || cell.dead || cell.kind !== 'cell' || !cell.resources || !cell.energy) {
    return { ready: false, hasResources: false, hasAtp: false };
  }
  const need = divisionNeed(cell);
  const minAtp = (cell.energy.maxAtp ?? CellCfg.maxAtp) * CellCfg.divisionMinAtpFraction;
  const hasResources = cell.resources.amino >= need.amino && cell.resources.nucleotide >= need.nucleotide;
  const hasAtp = cell.energy.atp >= minAtp;
  return { ready: hasResources && hasAtp, hasResources, hasAtp };
}

/** Er cellen klar til at dele sig? (nok byggesten OG ATP nok til at være rask.) */
export function isDivisionReady(cell) {
  return divisionStatus(cell).ready;
}

/** @param {import('../state.js').WorldState} state @param {number} dt */
export function divisionSystem(state, dt) {
  // Spillerens celle deler sig KUN, når du beder om det (knap/tast → 'divide'-intent denne tick).
  // Autonome afkom (AI-celler) deler sig automatisk, når de er klar, så flokken kan vokse selv.
  const playerWantsDivide = state.intents.some((i) => i.type === 'divide');

  // Tæl nuværende slægts-celler. Kolonien har et loft (World.colonyMax): når det er nået, holder
  // AFKOMMENE op med at dele sig (ellers eksploderer befolkningen). Spilleren kan altid selv dele sig.
  let cellCount = 0;
  for (const e of state.entities) if (!e.dead && e.kind === 'cell') cellCount++;

  // Find først alle celler klar til deling. Vi opretter døtre EFTER løkken, så en nyfødt
  // datter ikke når at dele sig i samme tick.
  const ready = [];
  for (const e of state.entities) {
    if (!isDivisionReady(e)) continue;
    if (e.control && !playerWantsDivide) continue; // din celle venter på dit valg
    ready.push({ cell: e, need: divisionNeed(e) });
  }

  for (const { cell, need } of ready) {
    // Loftet gælder kun afkom (autonome celler) — ikke spillerens bevidste valg.
    if (!cell.control && cellCount >= World.colonyMax) continue;
    divide(state, cell, need);
    cellCount++;
  }
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
      // Datteren arver mutations-tællingen, så dens delingspris matcher dens (arvede) gen-sæt.
      mutations: parent.lineage.mutations ?? 0,
    },
    combat: C.Combat(parent.combat?.maxHp ?? parent.energy.maxAtp, parent.combat?.dps ?? 0),
    vesicles: C.Vesicles(),
    // Spilleren beholder forælderen; datteren lever videre som autonom klon (SOCIAL §1).
    ai: C.AIState('forage'),
  });
}
