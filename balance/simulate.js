// CellSpil — økonomi-simulator
// Headless model der bruger balance-config.js og regner ATP-ind/-ud, overlevelse,
// tid-til-deling og invariant-advarsler for et givet build i en given zone.
//
// Kør:  node balance/simulate.js              (eksempel-builds)
//       node balance/simulate.js --invariants (tjek invarianter på tværs af zoner)

import { Anchors, Cell, Metabolism, Motility, Tools, Zones,
         PlayerSize, Offense, Enemies, Defenses } from './balance-config.js';

const num = (v) => (Math.round(v * 100) / 100);

// Hvor godt opfylder zonen et krav-sæt? Returnerer 0..1 (eller false hvis hårdt krav brydes).
function meetsRequirements(req, zone) {
  if (!req) return 1;
  if (req.anoxic && !zone.anoxic) return 0;
  let factor = 1;
  for (const key of Object.keys(req)) {
    if (key === 'anoxic') continue;
    const have = zone[key] || 0;
    if (have < req[key]) return 0;        // hård tærskel ikke nået
    factor = Math.min(factor, have);      // ellers skalér med tilgængelighed
  }
  return factor;
}

function metabolicIncome(metKey, zone) {
  const m = Metabolism[metKey];
  if (!m) return { income: 0, toxic: false, note: 'ukendt metabolisme' };

  // Gæring = bunden: skalerer kun med føde.
  if (metKey === 'ferment') {
    return { income: m.maxIncome * (zone.food || 0), toxic: false };
  }

  // Ilt-giftighed (fx methanogen).
  const toxic = m.oxygenToxic != null && (zone.oxygen || 0) > m.oxygenToxic;

  const meets = meetsRequirements(m.requires, zone);
  if (meets > 0) {
    let income = m.maxIncome;
    for (const f of (m.scaleBy || [])) income *= (zone[f] != null ? zone[f] : 1);
    return { income, toxic };
  }

  // Uden for niche: fallback.
  if (m.fallback === 'ferment') {
    return { income: Metabolism.ferment.maxIncome * (zone.food || 0), toxic, note: 'gæringsbund' };
  }
  return { income: 0, toxic, note: 'inaktiv uden for niche' };
}

function divisionAtpCost(mutationCount) {
  const amino = Cell.divisionBase.amino + Cell.divisionPerMutation * mutationCount;
  const nucleo = Cell.divisionBase.nucleotide + Cell.divisionPerMutation * mutationCount;
  return amino * Cell.aminoAtpValue + nucleo * Cell.nucleotideAtpValue;
}

// build = { metabolism, motility, tools: [], moving: bool }
export function evaluate(build, zoneKey) {
  const zone = Zones[zoneKey];
  const tools = build.tools || [];

  // Mutationsantal = alt der ikke er "start"-konfigen (ferment + none).
  let mutationCount = tools.length;
  if (build.metabolism && build.metabolism !== 'ferment') mutationCount++;
  if (build.motility && build.motility !== 'none') mutationCount++;

  // Indtægt
  const inc = metabolicIncome(build.metabolism || 'ferment', zone);

  // Udgift
  let upkeep = Cell.basalUpkeep;
  const met = Metabolism[build.metabolism];
  if (met && met.upkeep) upkeep += met.upkeep;
  for (const t of tools) if (Tools[t]) upkeep += Tools[t].upkeep;
  const mot = Motility[build.motility || 'none'];
  upkeep += mot.upkeep || 0;

  const moveCost = mot.moveCost || 0;

  const restNet = inc.income - upkeep;
  const moveNet = inc.income - upkeep - moveCost;

  // Tid til deling (ideel, i hvile)
  const divCost = divisionAtpCost(mutationCount);
  const growthPerSec = restNet > 0 ? restNet * Cell.growthEfficiency : 0;
  const timeToDivision = growthPerSec > 0 ? divCost / growthPerSec : Infinity;

  // Tid til død hvis net < 0 (ingen ny føde)
  const timeToDeath = restNet < 0 ? Cell.maxAtp / (-restNet) : Infinity;

  // Pris i nukleotider
  let nucleotidePrice = 0;
  for (const t of tools) if (Tools[t]) nucleotidePrice += Tools[t].price;

  // Advarsler / invariant-flag
  const warnings = [];
  if (inc.toxic) warnings.push('⚠ O₂ er giftigt for denne metabolisme her — tager skade');
  if (restNet < 0) warnings.push(`☠ Net < 0 i hvile (${num(restNet)}/s) — dør om ~${num(timeToDeath)}s`);
  if (build.motility && build.motility !== 'none' && moveNet < 0)
    warnings.push(`⚠ Kan ikke betale for at bevæge sig (move-net ${num(moveNet)}/s)`);

  return {
    zone: zone.label, mutationCount,
    income: num(inc.income), upkeep: num(upkeep), moveCost: num(moveCost),
    restNet: num(restNet), moveNet: num(moveNet),
    divCost, timeToDivision: timeToDivision === Infinity ? Infinity : num(timeToDivision),
    nucleotidePrice, incomeNote: inc.note, warnings,
  };
}

// ---------- Rapportering ----------

function printEval(name, build, zoneKey) {
  const r = evaluate(build, zoneKey);
  const ttd = r.timeToDivision === Infinity ? 'aldrig' : `${r.timeToDivision}s`;
  console.log(`\n■ ${name}  @ ${r.zone}`);
  console.log(`  indtægt ${r.income}/s  − upkeep ${r.upkeep}/s  (move ${r.moveCost}/s)`);
  console.log(`  net hvile ${r.restNet}/s   net bevægelse ${r.moveNet}/s`);
  console.log(`  deling: ${r.divCost} ATP  →  tid-til-deling (ideel hvile): ${ttd}`);
  if (r.incomeNote) console.log(`  note: ${r.incomeNote}`);
  for (const w of r.warnings) console.log(`  ${w}`);
}

// ---------- Kamp & fjender ----------

function playerRadius(build) {
  return (build.tools || []).includes('megacytosis') ? PlayerSize.megacytosis : PlayerSize.base;
}

// Spillerens skade/s mod en bestemt fjende (vælger bedste gyldige våben + lysozym-bonus).
function playerDpsVs(build, enemy) {
  const tools = build.tools || [];
  let best = 0, bonus = 0;
  for (const t of tools) {
    const o = Offense[t];
    if (!o) continue;
    const applies =
      o.applies === 'all' ||
      (o.applies === 'bacteria' && enemy.type === 'bacteria') ||
      (o.applies === 'walled' && enemy.walled) ||
      (o.applies === 'engulf'); // håndteres separat (størrelse)
    if (!applies) continue;
    if (o.bonus) bonus += o.dps;            // lysozym lægges oven i
    else if (o.dps > best) best = o.dps;
  }
  return best + bonus;
}

function assessThreat(build, enemyKey) {
  const e = Enemies[enemyKey];
  const pr = playerRadius(build);
  const ps = Motility[build.motility || 'none'].speed;
  const php = Cell.maxAtp;
  const tools = build.tools || [];

  // Kan spilleren opsluge fjenden? (megacytose + endocytose + størrelsesovertag)
  const hasEndo = tools.includes('endocytosis');
  const canPlayerEngulf = hasEndo && pr >= e.radius * 1.2;

  // Kan fjenden opsluge/invadere spilleren? (med forsvars-fraskud)
  let engulfResist = 0, invadeResist = 0;
  for (const t of tools) {
    const d = Defenses[t];
    if (d) { engulfResist = Math.max(engulfResist, d.engulfResist || 0);
             invadeResist = Math.max(invadeResist, d.invadeResist || 0); }
  }
  const canEnemyEngulf = e.engulfBelowRadius > 0 && pr < e.engulfBelowRadius && engulfResist < 0.5;
  const canEnemyInvade = e.invades && pr >= e.invadeMinRadius && invadeResist < 0.5;

  // Skade begge veje
  const pdps = playerDpsVs(build, e);
  let edps = e.contactDps || 0;
  if (canEnemyInvade) edps = Math.max(edps, e.insideDps || 0);
  if (canEnemyEngulf) edps = Math.max(edps, (e.contactDps || 0) * 2); // opsluging = hurtig død

  const tKillEnemy = canPlayerEngulf ? 0 : (pdps > 0 ? e.hp / pdps : Infinity);
  const tKillPlayer = edps > 0 ? php / edps : Infinity;
  const canFlee = ps > e.speed;

  // Verdikt
  let verdict;
  if (canPlayerEngulf) verdict = '🍽  Du kan opsluge den';
  else if (tKillEnemy <= tKillPlayer && tKillEnemy !== Infinity) verdict = '⚔  Du vinder 1v1';
  else if (canFlee) verdict = '🏃 Tabt 1v1, men du kan flygte';
  else if (canEnemyEngulf || canEnemyInvade) verdict = '☠  Dødeligt — og du kan ikke flygte';
  else verdict = '☠  Taber 1v1, kan ikke flygte';

  return {
    enemy: e.label, php, pr, pdps: num(pdps), edps: num(edps),
    tKillEnemy: tKillEnemy === Infinity ? Infinity : num(tKillEnemy),
    tKillPlayer: tKillPlayer === Infinity ? Infinity : num(tKillPlayer),
    canFlee, canPlayerEngulf, canEnemyEngulf, canEnemyInvade, verdict,
  };
}

// Hvor mange flok-celler skal til for at nedlægge en fjende hurtigt (mål: drab på ~10s)?
function packSize(build, enemyKey, targetTime = 10) {
  const e = Enemies[enemyKey];
  const pdps = playerDpsVs(build, e);
  if (pdps <= 0) return Infinity;
  return Math.max(1, Math.ceil(e.hp / (targetTime * pdps)));
}

function printThreat(name, build, enemyKey) {
  const r = assessThreat(build, enemyKey);
  const te = r.tKillEnemy === Infinity ? '—' : `${r.tKillEnemy}s`;
  const tp = r.tKillPlayer === Infinity ? '—' : `${r.tKillPlayer}s`;
  console.log(`  vs ${r.enemy.padEnd(22)} din-dps ${String(r.pdps).padStart(4)}  drab ${te.padStart(5)} | fjende-dps ${String(r.edps).padStart(4)}  dit-drab ${tp.padStart(5)}  →  ${r.verdict}`);
}

function runEnemies() {
  console.log('\n=== FJENDER: TRUSSELSVURDERING (1v1) ===');

  const builds = {
    'Start (gæring, flagel, ubevæbnet)': { metabolism: 'ferment', motility: 'flagellum', tools: [] },
    'Jæger (aerob, flagel, toksin+harpun)': { metabolism: 'aerobic', motility: 'flagellum', tools: ['toxin', 'harpoon'] },
    'Apex (aerob, cilier, megacytose+endocytose)': { metabolism: 'aerobic', motility: 'cilia', tools: ['megacytosis', 'endocytosis', 'gram_positive'] },
    'Pansret (aerob, gliding, væg+kapsel+efflux)': { metabolism: 'aerobic', motility: 'gliding', tools: ['gram_positive', 'slime_capsule', 'efflux_pump'] },
  };

  for (const [name, build] of Object.entries(builds)) {
    console.log(`\n■ ${name}`);
    for (const ek of Object.keys(Enemies)) {
      if (ek === 'phage') continue; // fag håndteres separat
      printThreat(name, build, ek);
    }
  }

  // Flokjagt på Megabacillus
  console.log('\n=== FLOKJAGT: celler nødvendige for drab på ~10s ===');
  for (const [name, build] of Object.entries(builds)) {
    const n = packSize(build, 'megabacillus');
    console.log(`  ${name.padEnd(46)} → ${n === Infinity ? 'umuligt (intet våben)' : n + ' celler'}`);
  }

  // Fag-epidemi
  const ph = Enemies.phage;
  console.log('\n=== FAG-EPIDEMI ===');
  console.log(`  Inficeret celle: dræn ${ph.drainDps}/s, sprænger efter ${ph.infectionTime}s og spreder ${ph.burstCount} nye fager (radius ${ph.spreadRadius}).`);
  console.log(`  Tæt flok = hver burst rammer flere naboer → eksponentiel spredning. Spredt flok bryder kæden.`);
  console.log(`  Modtræk: spore (phageResist ${Defenses.spore.phageResist}) eller afstand mellem celler.`);
}

// ---------- Invariant-tjek på tværs af zoner ----------

function checkInvariants() {
  console.log('\n=== INVARIANT-TJEK ===');
  const zoneKeys = Object.keys(Zones);
  const autotrophs = ['photo_oxy', 'photo_anoxy', 'chemo_sulfur', 'nitrification', 'methanogen'];

  // Inv. 1: ingen gratis energi — autotrof uden input skal have net < 0 et sted.
  // Inv. 3: hver strategi har en dødszone (net<0 eller toksisk).
  // Inv. 5: hver strategi har en vinderzone (net>0).
  for (const metKey of Object.keys(Metabolism)) {
    if (metKey === 'ferment') continue;
    let hasWinner = false, hasDeath = false, freeEnergy = false;
    for (const zk of zoneKeys) {
      const r = evaluate({ metabolism: metKey, motility: 'none', tools: [] }, zk);
      if (r.restNet > 0) hasWinner = true;
      if (r.restNet < 0 || r.warnings.some(w => w.includes('giftigt'))) hasDeath = true;
      // gratis energi: autotrof med net>0 i en zone uden dens input
      const zone = Zones[zk];
      if (autotrophs.includes(metKey) && r.restNet > 0) {
        const m = Metabolism[metKey];
        const meets = (() => {
          if (!m.requires) return true;
          if (m.requires.anoxic && !zone.anoxic) return false;
          for (const k of Object.keys(m.requires)) {
            if (k === 'anoxic') continue;
            if ((zone[k] || 0) < m.requires[k]) return false;
          }
          return true;
        })();
        if (!meets) freeEnergy = true;
      }
    }
    const flags = [];
    flags.push(hasWinner ? '✓ vinderzone' : '✗ INGEN vinderzone');
    flags.push(hasDeath ? '✓ dødszone' : '✗ INGEN dødszone');
    if (freeEnergy) flags.push('✗ GRATIS ENERGI (inv.1 brudt)');
    console.log(`  ${Metabolism[metKey].label.padEnd(22)} ${flags.join('  ')}`);
  }
}

// ---------- Eksempler ----------

function runExamples() {
  console.log('=== EKSEMPEL-BUILDS (tempo-ankre: 1. deling ~' + Anchors.firstDivision + 's realistisk) ===');

  printEval('Start: gæringscelle (hvile)', { metabolism: 'ferment', motility: 'none', tools: [] }, 'open_water');
  printEval('Gæringscelle + flagel (svømmer)', { metabolism: 'ferment', motility: 'flagellum', tools: [], moving: true }, 'open_water');
  printEval('Aerob + flagel', { metabolism: 'aerobic', motility: 'flagellum', tools: [] }, 'sunlit_shallows');
  printEval('Aerob i iltfrit mudder (fallback)', { metabolism: 'aerobic', motility: 'flagellum', tools: [] }, 'anoxic_mud');
  printEval('Fotosyntese-drifter (gasvesikler)', { metabolism: 'photo_oxy', motility: 'gas_vesicle', tools: [] }, 'sunlit_shallows');
  printEval('Fotosyntese i mørke (taber)', { metabolism: 'photo_oxy', motility: 'gas_vesicle', tools: [] }, 'dark_deep');
  printEval('Methanogen i mudder', { metabolism: 'methanogen', motility: 'gliding', tools: ['biofilm'] }, 'anoxic_mud');
  printEval('Methanogen i ilt (død)', { metabolism: 'methanogen', motility: 'gliding', tools: ['biofilm'] }, 'sunlit_shallows');
  printEval('Svovl-baghold (glider, H₂S, kapsel)', { metabolism: 'sulfate', motility: 'gliding', tools: ['slime_capsule', 'toxin'] }, 'anoxic_mud');
  printEval('Apex-rovdyr (endocytose, cilier)', { metabolism: 'aerobic', motility: 'cilia', tools: ['endocytosis', 'gram_positive'] }, 'sunlit_shallows');
}

const arg = process.argv[2];
if (arg === '--invariants') checkInvariants();
else if (arg === '--enemies') runEnemies();
else { runExamples(); runEnemies(); checkInvariants(); }
