// Entitet-fabrik: samler komponenter til celler, mad, fager osv. Se ARCHITECTURE.md §4.
import * as C from './components.js';

export function createEntity(state, components = {}) {
  const e = { id: state.nextId++, dead: false, ...components };
  state.entities.push(e);
  return e;
}

export function createCell(state, opts = {}) {
  const {
    x = 0, y = 0, isPlayer = false,
    genes = [], strategy = 'ferment', motility = 'none',
  } = opts;
  return createEntity(state, {
    kind: 'cell',
    transform: C.Transform(x, y, 20),
    energy: C.Energy(100, 100),
    resources: C.Resources(),
    genome: C.Genome(genes),
    metabolism: C.Metabolism(strategy),
    motilityC: C.Motility(motility),
    tolerance: C.Tolerance(),
    lineage: C.Lineage(state.nextId),
    combat: C.Combat(100, 0),
    vesicles: C.Vesicles(),
    ...(isPlayer ? { control: C.PlayerControlled() } : { ai: C.AIState('forage') }),
  });
}

export function createFood(state, opts = {}) {
  const { x = 0, y = 0, kind = 'glucose' } = opts;
  return createEntity(state, {
    kind: 'food',
    transform: C.Transform(x, y, 3),
    food: C.Food(kind),
  });
}

export function createEnemy(state, opts = {}) {
  const { x = 0, y = 0, type = 'bacillus', hp = 50, radius = 14 } = opts;
  return createEntity(state, {
    kind: 'enemy',
    enemyType: type,
    transform: C.Transform(x, y, radius),
    energy: C.Energy(hp, hp),
    metabolism: C.Metabolism('ferment'),
    motilityC: C.Motility('flagellum'),
    combat: C.Combat(hp, 0),
    ai: C.AIState('hunt'),
  });
}
