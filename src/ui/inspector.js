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

  root.appendChild(el('div', { textContent: 'EVOLUTION', style: 'font-weight:700;font-size:13px;letter-spacing:.08em;color:#8b949e;margin-bottom:6px;' }));

  // Valuta + nøgletal.
  const nucleo = el('div', { style: 'font-size:13px;margin-bottom:2px;' });
  root.appendChild(nucleo);
  const sub = el('div', { style: 'font-size:11px;color:#8b949e;margin-bottom:10px;' });
  root.appendChild(sub);

  // Byg de tre grene; gem rækkerne, så de kan opdateres hver frame.
  const rows = [];
  for (const branch of ['motility', 'metabolism', 'tool']) {
    root.appendChild(el('div', { textContent: META[branch].title, style: 'font-size:12px;color:#c9d1d9;margin:8px 0 4px;font-weight:600;' }));
    for (const id of Evolution.branches[branch]) {
      const btn = document.createElement('button');
      btn.setAttribute('style', rowStyle());
      btn.title = Evolution.blurb[id] ?? '';
      const name = el('span', { textContent: META[branch].src[id]?.label ?? id, style: 'text-align:left;' });
      const status = el('span', { textContent: '', style: 'font-size:11px;white-space:nowrap;margin-left:8px;' });
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
        for (const r of rows) { r.btn.disabled = true; r.btn.style.opacity = '0.4'; }
        return;
      }
      const n = p.resources?.nucleotide ?? 0;
      nucleo.innerHTML = `Nukleotider: <b style="color:#42a5f5">${n.toFixed(1)}</b>`;
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

function styleRow(r, { owned, active, price, nucleotide, branch }) {
  const isTool = branch === 'tool';
  let border = '#30363d', bg = '#161b22', txt = '', opacity = '1', disabled = false;

  if (active) {
    border = '#4caf50'; bg = 'rgba(76,175,80,0.15)'; txt = '● Aktiv';
  } else if (owned) {
    if (isTool) { border = '#30363d'; txt = '✓ Ejet'; opacity = '0.7'; disabled = true; }
    else { border = '#58a6ff'; txt = 'Skift'; } // oplåst skift-gren: gratis at aktivere
  } else {
    txt = `🧬 ${price}`;
    if (nucleotide < price) { opacity = '0.45'; disabled = true; }
  }

  r.btn.style.borderColor = border;
  r.btn.style.background = bg;
  r.btn.style.opacity = opacity;
  r.btn.disabled = disabled;
  r.btn.style.cursor = disabled ? 'default' : 'pointer';
  r.status.textContent = txt;
  r.status.style.color = active ? '#81c784' : owned && isTool ? '#8b949e' : nucleotide < price && !owned ? '#f85149' : '#c9d1d9';
}

function rowStyle() {
  return 'display:flex;justify-content:space-between;align-items:center;width:100%;' +
    'background:#161b22;color:#e6edf3;border:1px solid #30363d;border-radius:7px;' +
    'padding:6px 9px;margin:3px 0;font-size:12px;cursor:pointer;';
}

function el(tag, props = {}) {
  const e = document.createElement(tag);
  if (props.style) e.setAttribute('style', props.style);
  if (props.textContent != null) e.textContent = props.textContent;
  return e;
}
