// HUD: ressource-bjælker (ATP/amino/nukleotid), generation, population, komfort.
// Se SPEC.md §10 + ENVIRONMENT.md §2(c). Kun læsning; brugerhandlinger → intents (senere).
import { Cell } from '../config/index.js';

// Hvor mange byggesten en deling kræver (mål for byggesten-bjælkerne).
const NEED_AMINO = Cell.divisionBase.amino;
const NEED_NUCLEO = Cell.divisionBase.nucleotide;

export function createHud(root /* HTMLElement */) {
  root.innerHTML = '';
  const rows = {};

  // Udseendet ligger i CSS (se index.html) — her sættes kun klasser, så glas-stilen kan
  // ændres ét sted uden at røre spil-koden.
  root.appendChild(el('div', { textContent: 'CELLE', className: 'panel-title' }));

  rows.gen = stat(root, 'Generation', '0');
  rows.atp = bar(root, 'ATP', '#ffca28');
  rows.amino = bar(root, 'Aminosyrer', '#66bb6a');
  rows.nucleo = bar(root, 'Nukleotider', '#42a5f5');
  rows.comfort = bar(root, 'Komfort', '#26c6da');
  rows.pop = stat(root, 'Population', '0');
  rows.time = stat(root, 'Tid', '0s');
  rows.status = el('div', { className: 'hud-status' });
  root.appendChild(rows.status);

  return {
    update(state) {
      const player = state.entities.find((e) => e.control && !e.dead);
      const cells = state.entities.filter((e) => e.kind === 'cell');

      rows.pop.value.textContent = String(cells.length);
      rows.time.value.textContent = `${state.time.toFixed(0)}s`;

      if (!player) {
        rows.status.textContent = '☠ Ingen celle i live';
        setBar(rows.atp, 0); setBar(rows.amino, 0); setBar(rows.nucleo, 0); setBar(rows.comfort, 0);
        rows.gen.value.textContent = '–';
        return;
      }

      rows.status.textContent = '✓ I live';
      rows.gen.value.textContent = String(player.lineage?.generation ?? 0);

      const { atp, maxAtp } = player.energy;
      setBar(rows.atp, atp / maxAtp, `${atp.toFixed(0)}/${maxAtp}`);
      setBar(rows.amino, player.resources.amino / NEED_AMINO, `${player.resources.amino.toFixed(1)}/${NEED_AMINO}`);
      setBar(rows.nucleo, player.resources.nucleotide / NEED_NUCLEO, `${player.resources.nucleotide.toFixed(1)}/${NEED_NUCLEO}`);
      const comfort = player.tolerance?.comfort ?? 1;
      setBar(rows.comfort, comfort, `${Math.round(comfort * 100)}%`);
    },
  };
}

// --- små DOM-hjælpere ---
function el(tag, props = {}) {
  const e = document.createElement(tag);
  if (props.className) e.className = props.className;
  if (props.style) e.setAttribute('style', props.style);
  if (props.textContent != null) e.textContent = props.textContent;
  return e;
}

function stat(root, label, initial) {
  const wrap = el('div', { className: 'hud-stat' });
  wrap.appendChild(el('span', { textContent: label, className: 'hud-label' }));
  const value = el('span', { textContent: initial, className: 'hud-value' });
  wrap.appendChild(value);
  root.appendChild(wrap);
  return { value };
}

function bar(root, label, color) {
  const wrap = el('div', { className: 'hud-bar' });
  wrap.style.setProperty('--c', color); // bjælkens farve → CSS klarer selve udseendet
  const head = el('div', { className: 'hud-bar-head' });
  head.appendChild(el('span', { textContent: label, className: 'hud-label' }));
  const value = el('span', { textContent: '', className: 'hud-bar-value' });
  head.appendChild(value);
  wrap.appendChild(head);
  const track = el('div', { className: 'hud-track' });
  const fill = el('div', { className: 'hud-fill' });
  track.appendChild(fill);
  wrap.appendChild(track);
  root.appendChild(wrap);
  return { fill, value };
}

function setBar(row, frac, text) {
  const pct = Math.max(0, Math.min(1, frac)) * 100;
  row.fill.style.width = `${pct}%`;
  if (text != null) row.value.textContent = text;
}
