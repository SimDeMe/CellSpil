// Entitet-fabrik: samler komponenter til celler, mad, fager osv. Se ARCHITECTURE.md §4.
import * as C from './components.js';
import { Secretions, Food } from '../config/index.js';

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
  const fk = Food[kind] ?? {};
  const food = C.Food(kind);

  // Substrater (maltose/peptid) er kæder: bestem længden (antal prikker = antal produkter).
  let radius = 3;
  if (fk.substrate) {
    const n = fk.parts ?? (fk.partsMin + Math.floor(state.rng() * (fk.partsMax - fk.partsMin + 1)));
    food.n = n;
    radius = Math.min(8, 3 + n); // længere kæde = lidt bredere figur
  }

  return createEntity(state, {
    kind: 'food',
    transform: C.Transform(x, y, radius),
    food,
  });
}

export function createCloud(state, opts = {}) {
  const { x = 0, y = 0, type = 'toxin' } = opts;
  const cfg = Secretions[type] ?? {};
  return createEntity(state, {
    kind: 'cloud',
    cloudType: type,
    transform: C.Transform(x, y, cfg.radius ?? 80),
    cloud: C.Cloud(type, cfg.life ?? 4),
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
