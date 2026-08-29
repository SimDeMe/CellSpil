// Inspect-panel: "inde i cellen". Faner: Mutationer (læs om dem du har), Metabolisme (overblik
// over indtægt/upkeep/miljø). Katabolisme + Anabolisme er blanke indtil videre (i HTML).
// Kun læsning. Opdaterer kun, mens panelet er åbent. Se EVOLUTION.md + BALANCE.md.
import { Metabolism, Motility, Tools, Evolution, Cell } from '../config/index.js';
import { incomeFor, upkeepFor } from '../core/systems/metabolismSystem.js';
import { ownsMutation } from '../core/systems/mutationSystem.js';

export function createCellInspect({ modal, mutations, metabolism }) {
  return {
    update(state) {
      if (modal.classList.contains('hidden')) return; // spar arbejde, når panelet er lukket
      const p = state.entities.find((e) => e.control && !e.dead);
      mutations.innerHTML = renderMutations(p);
      metabolism.innerHTML = renderMetabolism(state, p);
    },
  };
}

// --- Fanen: Mutationer (hvad cellen ER lige nu + hvad den kan) ---
function renderMutations(p) {
  if (!p) return '<div class="muted">Ingen celle i live.</div>';
  const out = [];

  const ms = p.metabolism?.strategy;
  out.push('<div class="ih">Aktiv metabolisme</div>');
  out.push(mut(Metabolism[ms]?.label ?? ms, Evolution.blurb[ms]));

  const mo = p.motilityC?.type;
  out.push('<div class="ih">Aktiv bevægelse</div>');
  out.push(mut(Motility[mo]?.label ?? mo, Evolution.blurb[mo]));

  // Oplåste (men ikke aktive) skift-gener.
  const otherMeta = Evolution.branches.metabolism.filter((id) => id !== ms && ownsMutation(p, 'metabolism', id) && p.genome?.genes.has(id));
  const otherMoto = Evolution.branches.motility.filter((id) => id !== mo && ownsMutation(p, 'motility', id) && p.genome?.genes.has(id));
  if (otherMeta.length || otherMoto.length) {
    out.push('<div class="ih">Oplåst (kan skifte til)</div>');
    for (const id of otherMeta) out.push(mut(Metabolism[id]?.label ?? id, Evolution.blurb[id]));
    for (const id of otherMoto) out.push(mut(Motility[id]?.label ?? id, Evolution.blurb[id]));
  }

  const tools = Evolution.branches.tool.filter((id) => p.genome?.genes.has(id));
  out.push('<div class="ih">Værktøjer</div>');
  if (tools.length) for (const id of tools) out.push(mut(Tools[id]?.label ?? id, Evolution.blurb[id]));
  else out.push('<div class="muted">Ingen endnu — køb dem i 🧬 Evolution.</div>');

  return out.join('');
}

// --- Fanen: Metabolisme (tallene motoren faktisk bruger) ---
function renderMetabolism(state, p) {
  if (!p) return '<div class="muted">Ingen celle i live.</div>';
  const env = p.localEnv ?? state.environment ?? {};
  const stratId = p.metabolism?.strategy;
  const strat = Metabolism[stratId] ?? {};

  const income = incomeFor(stratId, env);
  const upkeep = upkeepFor(p);
  const net = income - upkeep;

  const basal = Cell.basalUpkeep;
  const stratUp = strat.upkeep ?? 0;
  const genesUp = upkeep - basal - stratUp;

  const out = [];
  out.push('<div class="ih">Aktiv strategi</div>');
  out.push(row('Strategi', strat.label ?? stratId));
  out.push(row('Indtægt', `${income.toFixed(2)} ATP/s`, '#66bb6a'));
  out.push(row('Vedligehold', `${upkeep.toFixed(2)} ATP/s`, '#ff7043'));
  out.push(`<div class="sub">basal ${basal.toFixed(1)} · strategi ${stratUp.toFixed(1)} · gener ${genesUp.toFixed(1)}</div>`);
  out.push(row('Netto', `${net >= 0 ? '+' : ''}${net.toFixed(2)} ATP/s`, net >= 0 ? '#66bb6a' : '#f85149'));

  // Krav: opfylder miljøet her strategiens betingelser?
  if (strat.requires) {
    out.push('<div class="ih">Krav her</div>');
    for (const [k, need] of Object.entries(strat.requires)) {
      const ok = k === 'anoxic' ? env.anoxic === true : (env[k] ?? 0) >= need;
      const have = k === 'anoxic' ? (env.anoxic ? 'iltfrit' : 'ilt til stede') : (env[k] ?? 0).toFixed(2);
      out.push(row(k, `${have} ${ok ? '✓' : '✗'}`, ok ? '#66bb6a' : '#f85149'));
    }
  }

  out.push('<div class="ih">Miljø her (dybde)</div>');
  for (const k of ['light', 'oxygen', 'food', 'temp', 'ph']) {
    if (env[k] != null) out.push(row(k, (env[k]).toFixed(2)));
  }
  out.push(row('iltfrit (anoxic)', env.anoxic ? 'ja' : 'nej'));

  return out.join('');
}

// --- små HTML-byggere ---
function mut(title, desc) {
  return `<div class="mut"><div class="t">${esc(title)}</div>${desc ? `<div class="d">${esc(desc)}</div>` : ''}</div>`;
}
function row(label, value, color) {
  const c = color ? ` style="color:${color}"` : '';
  return `<div class="mrow"><span>${esc(label)}</span><b${c}>${esc(value)}</b></div>`;
}
function esc(s) {
  return String(s).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}
