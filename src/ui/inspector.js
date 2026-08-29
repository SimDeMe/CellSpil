// Evolution-panel: mutations-træet i tre grene (Bevægelse · Metabolisme · Værktøjer). Køb sendes
// som intents via emitIntent({type:'buy-mutation', id}); mutationSystem anvender dem på spilleren.
// Metabolisme/motorik = skift (én aktiv; skift gratis mellem oplåste). Værktøjer = additive.
// Se EVOLUTION.md, BALANCE.md §2. Knapper bygges én gang; tilstanden opdateres hver frame.
import { Metabolism, Motility, Tools, Evolution } from '../config/index.js';
import { ownsMutation } from '../core/systems/mutationSystem.js';

const META = {
  metabolism: { src: Metabolism, title: '🧪 Metabolisme', activeField: (p) => p.metabolism?.strategy },
  motility: { src: Motility, title: '🏊 Bevægelse', activeField: (p) => p.motilityC?.type },
  tool: { src: Tools, title: '🛠 Værktøjer', activeField: () => null },
};

export function createInspector(root /* HTMLElement */, emitIntent) {
  root.innerHTML = '';

  // Udseendet ligger i CSS (se index.html) — her sættes kun klasser og tilstand.
  root.appendChild(el('div', { textContent: 'EVOLUTION', className: 'panel-title' }));

  // Valuta + nøgletal.
  const nucleo = el('div', { className: 'evo-currency' });
  root.appendChild(nucleo);
  const sub = el('div', { className: 'evo-sub' });
  root.appendChild(sub);

  // Byg de tre grene; gem rækkerne, så de kan opdateres hver frame.
  const rows = [];
  for (const branch of ['motility', 'metabolism', 'tool']) {
    root.appendChild(el('div', { textContent: META[branch].title, className: 'evo-branch' }));
    for (const id of Evolution.branches[branch]) {
      const btn = document.createElement('button');
      btn.className = 'evo-row';
      btn.title = Evolution.blurb[id] ?? '';
      const name = el('span', { textContent: META[branch].src[id]?.label ?? id, className: 'evo-name' });
      const status = el('span', { textContent: '', className: 'evo-status' });
      btn.append(name, status);
      btn.addEventListener('click', () => emitIntent({ type: 'buy-mutation', id }));
      root.appendChild(btn);
      rows.push({ branch, id, btn, status });
    }
  }

  return {
    update(state) {
      const p = state.entities.find((e) => e.control && !e.dead);
      if (!p) {
        nucleo.textContent = 'Ingen celle i live';
        sub.textContent = '';
        for (const r of rows) { r.btn.disabled = true; r.btn.dataset.state = 'locked'; }
        return;
      }
      const n = p.resources?.nucleotide ?? 0;
      nucleo.innerHTML = `Nukleotider: <b>${n.toFixed(1)}</b>`;
      sub.textContent = `Generation ${p.lineage?.generation ?? 0} · ${p.lineage?.mutations ?? 0} mutationer`;

      for (const r of rows) {
        const owned = ownsMutation(p, r.branch, r.id);
        const active = META[r.branch].activeField(p) === r.id;
        const price = META[r.branch].src[r.id]?.price ?? 0;
        styleRow(r, { owned, active, price, nucleotide: n, branch: r.branch });
      }
    },
  };
}

// Sætter rækkens TILSTAND (data-state) + statustekst. Farver/glas ligger i CSS.
//   active = den aktive metabolisme/motorik · owned = værktøj man ejer · switch = oplåst, kan
//   aktiveres gratis · buy = har råd · locked = for få nukleotider.
function styleRow(r, { owned, active, price, nucleotide, branch }) {
  const isTool = branch === 'tool';
  let state, txt, disabled = false;

  if (active) {
    state = 'active'; txt = '● Aktiv';
  } else if (owned) {
    if (isTool) { state = 'owned'; txt = '✓ Ejet'; disabled = true; }
    else { state = 'switch'; txt = 'Skift'; } // oplåst skift-gren: gratis at aktivere
  } else if (nucleotide < price) {
    state = 'locked'; txt = `🧬 ${price}`; disabled = true;
  } else {
    state = 'buy'; txt = `🧬 ${price}`;
  }

  r.btn.dataset.state = state;
  r.btn.disabled = disabled;
  r.status.textContent = txt;
}

function el(tag, props = {}) {
  const e = document.createElement(tag);
  if (props.className) e.className = props.className;
  if (props.textContent != null) e.textContent = props.textContent;
  return e;
}
