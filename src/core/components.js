// Komponenter = rene data-poser (ingen adfærd). Systemer fortolker dem.
// Se ARCHITECTURE.md §4. En entitet er et objekt med en delmængde af disse felter.

export const Transform = (x = 0, y = 0, radius = 20) => ({ x, y, radius, angle: 0 });

export const Energy = (atp = 100, maxAtp = 100) => ({ atp, maxAtp });

export const Resources = () => ({
  amino: 0, nucleotide: 0,
  glucose: 0, carbon: 0, nitrogen: 0, phosphate: 0,
  storedProtein: 0, storedDna: 0,
});

/** Sæt af gen-id'er (data; fortolkes af systemerne). */
export const Genome = (genes = []) => ({ genes: new Set(genes) });

export const Metabolism = (strategy = 'ferment') => ({ strategy });

export const Motility = (type = 'none') => ({ type, state: 'idle', targetAngle: 0 });

/** Tolerance-ranges pr. miljøparameter: { temp: {optMin,optMax,lethalMin,lethalMax}, ... } */
export const Tolerance = (ranges = {}) => ({ ranges, comfort: 1 });

export const Lineage = (lineageId = 0, generation = 0) => ({ lineageId, colonyId: null, role: 'generalist', generation });

export const Combat = (hp = 100, dps = 0) => ({ hp, maxHp: hp, dps, target: null });

export const AIState = (policy = 'forage') => ({ policy, target: null });

export const PlayerControlled = () => ({ player: true });

export const Food = (kind = 'glucose') => ({ kind });

export const Vesicles = () => ({ items: [], max: 5 });
