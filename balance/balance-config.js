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
  divisionMinAtpFraction: 0.15, // celle skal blot have mindst denne andel ATP for at turde dele sig
                                // (lav, så det er BYGGESTEN der afgør delingen — ikke en skjult ATP-mur)
};

// --- METABOLISME ---
// maxIncome: ATP/s i fuldt gunstig zone.
// requires: betingelser for at yde fuldt (ellers fallback/0).
// fallback: 'ferment' (heterotrof bund) eller 0 (autotrof).
// oxygenToxic: true => O2 over tærskel giver skade.
// price = mutationspris i nukleotider (0 = start-strategi, gratis). Se Evolution.
export const Metabolism = {
  ferment:            { label: 'Gæring',              maxIncome: 4,  upkeep: 0,   scaleBy: ['food'], fallback: 'self', price: 0 },
  aerobic:            { label: 'Aerob respiration',   maxIncome: 20, upkeep: 1.0, requires: { oxygen: 0.3 }, scaleBy: ['oxygen', 'food'], fallback: 'ferment', price: 6 },
  nitrate:            { label: 'Nitratrespiration',   maxIncome: 12, upkeep: 0.8, requires: { nitrate: 0.5, anoxic: true }, scaleBy: ['food'], fallback: 'ferment', price: 6 },
  sulfate:            { label: 'Sulfatrespiration',   maxIncome: 10, upkeep: 0.8, requires: { sulfur: 0.5, anoxic: true }, scaleBy: ['food'], fallback: 'ferment', price: 6 },
  photo_oxy:          { label: 'Iltende fotosyntese', maxIncome: 8,  upkeep: 1.5, requires: { light: 0.1 }, scaleBy: ['light'], fallback: 0, price: 7 },
  photo_anoxy:        { label: 'Iltfri fotosyntese',  maxIncome: 7,  upkeep: 1.5, requires: { light: 0.1, sulfur: 0.5, anoxic: true }, scaleBy: ['light'], fallback: 0, price: 8 },
  chemo_sulfur:       { label: 'Svovloxidation',      maxIncome: 6,  upkeep: 1.0, requires: { sulfur: 0.3 }, scaleBy: ['sulfur'], fallback: 0, price: 6 },
  nitrification:      { label: 'Nitrifikation',       maxIncome: 5,  upkeep: 1.0, requires: { ammonia: 0.3 }, scaleBy: ['ammonia'], fallback: 0, price: 6 },
  methanogen:         { label: 'Methanogenese',       maxIncome: 10, upkeep: 1.0, requires: { hydrogen: 0.3, anoxic: true }, scaleBy: ['hydrogen'], fallback: 0, oxygenToxic: 0.1, price: 8 },
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

// --- DYBDE-GRADIENT (miljøet ændrer sig lodret: overflade → dyb) ---
// Cellens lokale miljø afhænger af dens y-position. at = brøkdel af verdenens højde
// (0 = top/overflade, 1 = bund). Mellem to stop interpoleres lineært. anoxic (iltfrit) slår
// til under anoxicBelow. Værdierne følger Zones: lavvand → åbent vand → mørkt dyb → iltfrit mudder.
// temp/ph i 0..1: temp 0 = frysende, 1 = skoldhed; ph 0 = sur, 1 = basisk. Overfladen er varm,
// dybet koldt; pH er stort set neutralt (sure/basiske lommer hører til farezoner senere).
export const Depth = {
  anoxicBelow: 0.8, // under 80% dybde er vandet iltfrit (mudder/vent)
  stops: [
    { at: 0.0, light: 1.0, oxygen: 0.8, food: 1.0, temp: 0.60, ph: 0.50, sulfur: 0.0, nitrate: 0.0, ammonia: 0.0, hydrogen: 0.0 }, // solbeskinnet lavvand
    { at: 0.5, light: 0.5, oxygen: 0.5, food: 0.6, temp: 0.45, ph: 0.50, sulfur: 0.0, nitrate: 0.0, ammonia: 0.0, hydrogen: 0.0 }, // åbent vand
    { at: 0.8, light: 0.0, oxygen: 0.2, food: 0.3, temp: 0.25, ph: 0.50, sulfur: 0.3, nitrate: 0.2, ammonia: 0.1, hydrogen: 0.2 }, // mørkt dyb
    { at: 1.0, light: 0.0, oxygen: 0.0, food: 0.4, temp: 0.15, ph: 0.45, sulfur: 1.0, nitrate: 0.6, ammonia: 0.5, hydrogen: 1.0 }, // iltfrit mudder
  ],
};

// --- TOLERANCE (miljø vs. cellens komfort-vinduer) ---
// defaultRanges (0..1): standard-cellen er mesofil (temperatur) og neutrofil (pH). Inden for
// opt-vinduet er der ingen skade; mellem opt og lethal stiger skaden lineært; uden for lethal
// er skaden fuld. stressDamage/lethalDamage er ATP/s. oxygenToxicDamage rammer anaerobe
// strategier (Metabolism.*.oxygenToxic) i for meget ilt — dæmpes af katalase (Defenses).
export const Tolerance = {
  defaultRanges: {
    temp: { optMin: 0.35, optMax: 0.65, lethalMin: 0.10, lethalMax: 0.90 },
    ph:   { optMin: 0.35, optMax: 0.65, lethalMin: 0.10, lethalMax: 0.90 },
  },
  stressDamage: 0.5,
  lethalDamage: 2.0,
  oxygenToxicDamage: 2.0,
};

// --- BEVÆGELSE ---
// price = mutationspris i nukleotider (flagellum er start, gratis). Se Evolution.
export const Motility = {
  none:        { label: 'Drift',       moveCost: 0.0, speed: 0.0, upkeep: 0, price: 0 },
  flagellum:   { label: 'Flagel',      moveCost: 3.0, speed: 1.0, upkeep: 0, price: 0 },
  gliding:     { label: 'Gliding',     moveCost: 0.5, speed: 0.4, upkeep: 0, price: 3 },
  spiral:      { label: 'Spiralform',  moveCost: 1.5, speed: 0.7, upkeep: 0, price: 5 },
  gas_vesicle: { label: 'Gasvesikler', moveCost: 0.2, speed: 0.3, upkeep: 0, price: 4 },
  cilia:       { label: 'Cilier',      moveCost: 4.0, speed: 1.3, upkeep: 0, price: 9 },
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
  colonyMax: 40, // loft over antal slægts-celler: afkom holder op med at dele sig her (undgår eksplosion)
};

// --- FØDE (hvad en mad-partikel giver, når en celle æder den) ---
// reach: ekstra rækkevidde ud over cellens radius for at "røre" maden.
// Pr. type: pakke af ATP og byggesten (amino/nukleotid). ATP fyldes op til maxAtp; overskud
// spildes. Byggesten lægges oven i og tæller med til deling. Flere typer kan tilføjes senere.
// Pr. type: payload (atp + byggesten), color (render-farve), weight (relativ spawn-hyppighed),
// requires (et enzym-gen cellen SKAL have for at kunne optage typen). Biologi-tanken:
//   glukose (gul) → energi/kulstof · ammonium (blå, N) → aminosyrer · fosfat (rød, P) → nukleotider.
//   maltose (to gule der sidder sammen) = dobbelt-sukker; kræver enzymet maltase at spalte/optage.
export const Food = {
  reach: 6,
  // DIREKTE føde (optages ved kontakt). weight = relativ spawn-hyppighed.
  glucose:   { label: 'Glukose',   atp: 3, amino: 0.5, nucleotide: 0.5, color: 0xffeb3b, weight: 6 },
  ammonium:  { label: 'Ammonium',  amino: 1.5,                          color: 0x42a5f5, weight: 3 },
  phosphate: { label: 'Fosfat',    nucleotide: 1.5,                     color: 0xef5350, weight: 3 },
  aminoacid: { label: 'Aminosyre', amino: 1.2,                          color: 0xffa726, weight: 1 }, // sjælden
  // SUBSTRATER (kan IKKE optages direkte) — nedbrydes udvendigt af en enzym-sky over ~breakTime sek.
  //   maltose → maltase → glukose ·  peptid → peptidase → aminosyrer.
  // parts / partsMin..partsMax = kædelængde: antal prikker i kæden = antal produkter ved spaltning.
  maltose:   { label: 'Maltose', substrate: true, enzyme: 'maltase',   breaksInto: 'glucose',   parts: 2,                  color: 0xffeb3b, weight: 2, breakTime: 2 },
  peptide:   { label: 'Peptid',  substrate: true, enzyme: 'peptidase', breaksInto: 'aminoacid', partsMin: 3, partsMax: 5, color: 0xffa726, weight: 1, breakTime: 2 },
};

// --- UDSKILLELSER (sky-evner: cellen udskiller en sky med en områdeeffekt) ---
// Kræver det tilsvarende gen (samme id). radius = skyens størrelse, life = levetid i sekunder,
// costAtp/costAmino = pris ved udskillelse. toxin/bacteriocin er skade-skyer (skade + hvem de rammer
// hentes fra Offense, så tallene står ét sted). maltase er en enzym-sky, der nedbryder 'converts'.
export const Secretions = {
  toxin:       { label: 'Toksin-sky',      radius: 95,  life: 5, costAtp: 8, costAmino: 1, color: 0x9ccc65 },
  bacteriocin: { label: 'Bakteriocin-sky', radius: 95,  life: 5, costAtp: 6, costAmino: 1, color: 0xba68c8 },
  // Enzym-skyer: nedbryder de substrater, hvis Food.enzyme matcher denne id (over substratets breakTime).
  maltase:     { label: 'Maltase-sky',     radius: 120, life: 4, costAtp: 4,                color: 0xfff176, enzyme: true },
  peptidase:   { label: 'Peptidase-sky',   radius: 120, life: 4, costAtp: 4,                color: 0xff8a65, enzyme: true },
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
  maltase:       { label: 'Maltase',          upkeep: 0.1, price: 3 }, // enzym-sky: maltose → glukose
  peptidase:     { label: 'Peptidase',        upkeep: 0.1, price: 3 }, // enzym-sky: peptid → aminosyrer
};

// --- SPILLERENS STØRRELSE (radius) ---
export const PlayerSize = {
  base: 20,
  megacytosis: 40, // megacytose-genet
};

// --- EVOLUTION (mutations-træet: hvad man kan udvikle, og hvad det koster i nukleotider) ---
// Tre grene. Priserne bor i kilde-config'en (Metabolism/Motility.price, Tools.price), så de står
// ÉT sted. Metabolisme og motorik er SKIFT-grene (én aktiv ad gangen; man kan skifte gratis mellem
// dem, man har låst op). Værktøjer er ADDITIVE (man ejer dem, de stabler). startStrategy/startMotility
// er gratis fra start. Vi lister kun mutationer med EN FAKTISK virkning i de nuværende systemer —
// resten (quorum, biolum, konjugation, siderofor, magnetosom, antibiotika, fag-slynge, spore,
// chemotaksis) kommer, når deres systemer bygges.
export const Evolution = {
  startStrategy: 'ferment',
  startMotility: 'flagellum',
  branches: {
    // Stofskifte — virker via metabolismSystem (indtægt afhænger af miljø/krav).
    metabolism: ['ferment', 'aerobic', 'nitrate', 'sulfate', 'photo_oxy', 'photo_anoxy', 'chemo_sulfur', 'nitrification', 'methanogen'],
    // Bevægelse — virker via movementSystem (fart/omkostning pr. type).
    motility: ['flagellum', 'gliding', 'spiral', 'gas_vesicle', 'cilia'],
    // Værktøjer — virker via combatSystem (Offense/Defenses), toleranceSystem (katalase),
    // metabolismSystem (upkeep) og størrelse (megacytose → radius → opsluging).
    tool: ['gram_positive', 'slime_capsule', 'efflux_pump', 'catalase', 'biofilm',
      'megacytosis', 'endocytosis', 'toxin', 'bacteriocin', 'lysozyme', 'harpoon', 'maltase', 'peptidase'],
  },
  // Korte forklaringer til menuen (hvad mutationen gør i spillet).
  blurb: {
    ferment: 'Universel start. Lidt energi, virker overalt.',
    aerobic: 'Meget energi — men kun hvor der er ilt.',
    nitrate: 'Energi i iltfrie, nitratrige zoner.',
    sulfate: 'Energi i svovlrigt mudder.',
    photo_oxy: 'Lav din egen mad af lys (i lyset).',
    photo_anoxy: 'Fotosyntese i mørkt, svovlet dyb.',
    chemo_sulfur: 'Lev af ren svovl-kemi.',
    nitrification: 'Energi af ammoniak.',
    methanogen: 'Specialist: stærk i strengt iltfrit dyb, hjælpeløs i ilt.',
    flagellum: 'Hurtig, præcis svømning. Energikrævende.',
    gliding: 'Langsom, billig glidning — god til baghold.',
    spiral: 'Snor sig stabilt gennem sejt miljø.',
    gas_vesicle: 'Næsten gratis op/ned-drift.',
    cilia: 'Meget hurtig og adræt, men dyr.',
    gram_positive: 'Tyk væg: svær at opsluge/invadere.',
    slime_capsule: 'Glat: svær at gribe, opsluge, harpunere.',
    efflux_pump: 'Pumper gift ud — kemisk modstand.',
    catalase: 'Neutraliserer iltskade (vigtig for anaerobe i ilt).',
    biofilm: 'Delt skjold mod områdeeffekter.',
    megacytosis: 'Bliv stor (radius 40) — sværere at æde, lettere at opsluge.',
    endocytosis: 'Opslug og fordøj mindre celler ved kontakt.',
    toxin: 'Udskil en giftsky, der skader alt i området.',
    bacteriocin: 'Udskil en sky, der kun rammer bakterier (billig, stærk).',
    lysozyme: 'Panserbryder: ekstra skade mod celler med væg.',
    harpoon: 'Højt enkeltmåls-skade ved kontakt.',
    maltase: 'Udskil en maltase-sky, der over et par sekunder nedbryder maltose (dobbelt-sukker) til glukose.',
    peptidase: 'Udskil en peptidase-sky, der over et par sekunder nedbryder peptider (kæder) til aminosyrer.',
  },
};

// --- ANGREB (spillerens våben: skade pr. sekund + hvem de rammer) ---
// applies: 'all' | 'bacteria' (kun bakterier) | 'walled' (kun cellevæg) | 'engulf' (størrelse)
export const Offense = {
  toxin:       { dps: 6,  applies: 'all', secreted: true },       // virker som sky (Secretions), ikke ved kontakt
  bacteriocin: { dps: 8,  applies: 'bacteria', secreted: true },  // virker som sky (Secretions), ikke ved kontakt
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
