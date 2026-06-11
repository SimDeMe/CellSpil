// CellSpil — balance-config (matcher BALANCE.md, første udkast)
// Alle tal i abstrakte "spil-ATP". Ændr her, kør simulatoren, tjek tempo-ankre.

export const Anchors = {
  // Måltider i sekunder (realistisk spil). Simulatoren regner IDEELT => nedre grænser.
  firstDivision: 30,
  firstMutation: 60,
};

export const Cell = {
  maxAtp: 100,
  basalUpkeep: 1.0,        // ATP/s bare for at leve
  aminoAtpValue: 2,        // ATP-værdi pr. aminosyre
  nucleotideAtpValue: 5,   // ATP-værdi pr. nukleotid
  divisionBase: { amino: 3, nucleotide: 3 },
  divisionPerMutation: 1,  // +1 amino og +1 nukleotid pr. mutation
  growthEfficiency: 0.5,   // andel af net-overskud der bliver til vækst
  divisionMinAtpFraction: 0.5, // celle skal have mindst denne andel ATP for at turde dele sig
};

// --- METABOLISME ---
// maxIncome: ATP/s i fuldt gunstig zone.
// requires: betingelser for at yde fuldt (ellers fallback/0).
// fallback: 'ferment' (heterotrof bund) eller 0 (autotrof).
// oxygenToxic: true => O2 over tærskel giver skade.
export const Metabolism = {
  ferment:            { label: 'Gæring',              maxIncome: 4,  upkeep: 0,   scaleBy: ['food'], fallback: 'self' },
  aerobic:            { label: 'Aerob respiration',   maxIncome: 20, upkeep: 1.0, requires: { oxygen: 0.3 }, scaleBy: ['oxygen', 'food'], fallback: 'ferment' },
  nitrate:            { label: 'Nitratrespiration',   maxIncome: 12, upkeep: 0.8, requires: { nitrate: 0.5, anoxic: true }, scaleBy: ['food'], fallback: 'ferment' },
  sulfate:            { label: 'Sulfatrespiration',   maxIncome: 10, upkeep: 0.8, requires: { sulfur: 0.5, anoxic: true }, scaleBy: ['food'], fallback: 'ferment' },
  photo_oxy:          { label: 'Iltende fotosyntese', maxIncome: 8,  upkeep: 1.5, requires: { light: 0.1 }, scaleBy: ['light'], fallback: 0 },
  photo_anoxy:        { label: 'Iltfri fotosyntese',  maxIncome: 7,  upkeep: 1.5, requires: { light: 0.1, sulfur: 0.5, anoxic: true }, scaleBy: ['light'], fallback: 0 },
  chemo_sulfur:       { label: 'Svovloxidation',      maxIncome: 6,  upkeep: 1.0, requires: { sulfur: 0.3 }, scaleBy: ['sulfur'], fallback: 0 },
  nitrification:      { label: 'Nitrifikation',       maxIncome: 5,  upkeep: 1.0, requires: { ammonia: 0.3 }, scaleBy: ['ammonia'], fallback: 0 },
  methanogen:         { label: 'Methanogenese',       maxIncome: 10, upkeep: 1.0, requires: { hydrogen: 0.3, anoxic: true }, scaleBy: ['hydrogen'], fallback: 0, oxygenToxic: 0.1 },
};

// --- MILJØ ---
// ambient = standard-miljøet (åbent vand) en celle befinder sig i, indtil environmentSystem
// fylder de rigtige felter pr. position. Værdier 0..1 (anoxic = bool). Matcher Zones.open_water.
// Brugt af metabolismSystem som cellens lokale miljø i denne tidlige fase.
export const Environment = {
  ambient: {
    light: 0.5, oxygen: 0.5, food: 0.6, anoxic: false,
    sulfur: 0, nitrate: 0, ammonia: 0, hydrogen: 0,
  },
};

// --- BEVÆGELSE ---
export const Motility = {
  none:        { label: 'Drift',       moveCost: 0.0, speed: 0.0, upkeep: 0 },
  flagellum:   { label: 'Flagel',      moveCost: 3.0, speed: 1.0, upkeep: 0 },
  gliding:     { label: 'Gliding',     moveCost: 0.5, speed: 0.4, upkeep: 0 },
  spiral:      { label: 'Spiralform',  moveCost: 1.5, speed: 0.7, upkeep: 0 },
  gas_vesicle: { label: 'Gasvesikler', moveCost: 0.2, speed: 0.3, upkeep: 0 },
  cilia:       { label: 'Cilier',      moveCost: 4.0, speed: 1.3, upkeep: 0 },
};

// Hvor mange verdens-enheder pr. sekund en relativ fart på 1.0 (flagel) svarer til.
// Skru op = hurtigere celler i hele spillet. arriveSlack: ekstra afstand (ud over egen
// radius) før cellen regnes som "fremme" og holder op med at svømme.
export const Movement = { speedScale: 150, arriveSlack: 2 };

// --- VERDEN / SPAWN ---
// foodMax: højeste antal mad-partikler i verden. foodPerSecond: hvor mange der dukker op pr.
// sekund (op til cap). enemySafeRadius: fjender spawner mindst så langt fra spilleren (fair
// varsel — aldrig oven i dig). Fjendernes egne spawn-tider/interval/cap står i Enemies.
export const World = {
  foodMax: 600,
  foodPerSecond: 8,
  enemySafeRadius: 600,
};

// --- AI (hvad autonome celler/fjender sigter efter) ---
// huntVision: hvor langt en jæger ser sit bytte. forageVision: hvor langt en forager ser mad.
// followKeep: forager/følger holder sig inden for denne afstand af lederen.
// roamRadius: hvor langt væk et tilfældigt strejf-mål sættes, når der intet bytte er.
// roamArrive: skift strejf-mål, når man er kommet så tæt på det.
export const AI = {
  huntVision: 600,
  forageVision: 400,
  followKeep: 200,
  roamRadius: 300,
  roamArrive: 40,
};

// --- VÆRKTØJ (upkeep + mutationspris i nukleotider) ---
export const Tools = {
  gram_positive: { label: 'Gram-positiv væg', upkeep: 0.5, price: 4 },
  slime_capsule: { label: 'Slimkapsel',       upkeep: 0.3, price: 3 },
  efflux_pump:   { label: 'Efflukspumpe',     upkeep: 0.5, price: 4 },
  catalase:      { label: 'Katalase',         upkeep: 0.2, price: 3 },
  biofilm:       { label: 'Biofilm',          upkeep: 0.2, price: 4 },
  spore:         { label: 'Spore',            upkeep: 0.0, price: 5 },
  megacytosis:   { label: 'Megacytose',       upkeep: 1.0, price: 5 },
  endocytosis:   { label: 'Endocytose',       upkeep: 1.5, price: 8 },
  toxin:         { label: 'Toksin',           upkeep: 0.0, price: 2 },
  bacteriocin:   { label: 'Bakteriocin',      upkeep: 0.0, price: 2 },
  lysozyme:      { label: 'Lysozym',          upkeep: 0.0, price: 3 },
  harpoon:       { label: 'Harpun (T6SS)',    upkeep: 0.1, price: 5 },
  antibiotic:    { label: 'Antibiotika-prod', upkeep: 0.3, price: 6 },
  phage_sling:   { label: 'Fag-slynge',       upkeep: 0.0, price: 7 },
  quorum:        { label: 'Quorum sensing',   upkeep: 0.0, price: 3 },
  biolum:        { label: 'Bioluminescens',   upkeep: 0.2, price: 3 },
  conjugation:   { label: 'Konjugation',      upkeep: 0.0, price: 4 },
  siderophore:   { label: 'Siderofor',        upkeep: 0.0, price: 3 },
  magnetosome:   { label: 'Magnetosom',       upkeep: 0.0, price: 2 },
  chemotaxis:    { label: 'Chemotaksis',      upkeep: 0.1, price: 4 },
};

// --- SPILLERENS STØRRELSE (radius) ---
export const PlayerSize = {
  base: 20,
  megacytosis: 40, // megacytose-genet
};

// --- ANGREB (spillerens våben: skade pr. sekund + hvem de rammer) ---
// applies: 'all' | 'bacteria' (kun bakterier) | 'walled' (kun cellevæg) | 'engulf' (størrelse)
export const Offense = {
  toxin:       { dps: 6,  applies: 'all' },
  bacteriocin: { dps: 8,  applies: 'bacteria' },
  harpoon:     { dps: 10, applies: 'all' },
  lysozyme:    { dps: 6,  applies: 'walled', bonus: true }, // lægges oven i mod pansrede mål
  phage_sling: { dps: 0,  applies: 'all', seedsPhage: true },
  endocytosis: { applies: 'engulf' },                       // størrelsesbaseret opsluging
};

// --- FJENDER ---
// hp: effektiv ATP-pulje. radius: størrelse. speed: relativ (1.0 = flagel).
// contactDps: skade/s ved kontakt. engulfBelowRadius: opsluger celler mindre end dette.
// type/walled: bruges af spillerens våben-filtre. spawn: pacing i sekunder.
export const Enemies = {
  bacillus: {
    label: 'Bacillus Simplex', type: 'bacteria', walled: false,
    hp: 50, radius: 14, speed: 0.5, contactDps: 1, engulfBelowRadius: 0,
    spawnAfter: 60, spawnInterval: 60, popCap: 50,
  },
  megabacillus: {
    label: 'Megabacillus', type: 'bacteria', walled: false,
    hp: 250, radius: 36, speed: 1.0, contactDps: 8, engulfBelowRadius: 30,
    spawnAfter: 300, spawnInterval: 180, popCap: 4,
  },
  amoeba: {
    label: 'Amøbe', type: 'eukaryote', walled: false,
    hp: 200, radius: 45, speed: 0.2, contactDps: 12, engulfBelowRadius: 999, // opsluger alt
    spawnAfter: 240, spawnInterval: 240, popCap: 3,
  },
  bdello: {
    label: 'Rov-bakterie', type: 'bacteria', walled: false,
    hp: 25, radius: 8, speed: 1.2, contactDps: 0, invades: true, invadeMinRadius: 16, insideDps: 4,
    spawnAfter: 180, spawnInterval: 90, popCap: 8,
  },
  rival_colony: {
    label: 'Rivaliserende koloni', type: 'bacteria', walled: true,
    hp: 80, radius: 20, speed: 0.4, contactDps: 2, bacteriocinDps: 3, cellCount: 6, biofilmDefense: 0.5,
    spawnAfter: 360, spawnInterval: 0, popCap: 2,
  },
  phage: {
    label: 'Bakteriofag', type: 'virus', walled: false,
    hp: 5, radius: 4, speed: 0.0, infectionTime: 8, drainDps: 5, burstCount: 4, spreadRadius: 60,
    baseInfectChance: 0.6, spawnAfter: 200, spawnInterval: 120, popCap: 30,
  },
};

// Forsvar der reducerer specifikke trusler (multiplikatorer / fraskud).
export const Defenses = {
  gram_positive: { engulfResist: 0.3, invadeResist: 0.6, toxinResist: 0.4 }, // tykkere = sværere at æde/invadere
  slime_capsule: { engulfResist: 0.4, invadeResist: 0.7, harpoonResist: 0.5 },
  efflux_pump:   { toxinResist: 0.6, antibioticResist: 0.7 },
  catalase:      { oxygenDamageResist: 0.8 },
  spore:         { phageResist: 0.9, survivesLethal: true },
  biofilm:       { areaResist: 0.5 },
};

// --- ZONER ---
// Flag: light, oxygen, food, sulfur, nitrate, ammonia, hydrogen (0..1), anoxic (bool).
export const Zones = {
  sunlit_shallows: { label: 'Solbeskinnet lavvand', light: 1.0, oxygen: 0.8, food: 1.0, anoxic: false },
  open_water:      { label: 'Åbent vand',           light: 0.5, oxygen: 0.5, food: 0.6, anoxic: false },
  dark_deep:       { label: 'Mørkt dyb',            light: 0.0, oxygen: 0.2, food: 0.3, anoxic: false },
  anoxic_mud:      { label: 'Iltfrit mudder',       light: 0.0, oxygen: 0.0, food: 0.4, sulfur: 1.0, hydrogen: 1.0, nitrate: 0.6, ammonia: 0.5, anoxic: true },
  sulfur_vent:     { label: 'Svovl-vent (varm)',    light: 0.0, oxygen: 0.1, food: 0.2, sulfur: 1.0, anoxic: true },
  microbial_mat:   { label: 'Svovl-mikrobemåtte',   light: 0.6, oxygen: 0.0, food: 0.3, sulfur: 1.0, anoxic: true }, // oplyst MEN iltfrit + svovl: hjem for iltfri fotosyntese
};
