// Evne-bjælke: én knap pr. udskillelse (sky), du har genet til. Klik (eller tal-tast) → udskil.
// Knappen vises kun, når cellen ejer genet, og dæmpes, hvis du ikke har råd. Se Secretions-config.
import { Secretions } from '../config/index.js';

export function createAbilityBar(root /* HTMLElement */, emitIntent) {
  root.innerHTML = '';
  const rows = [];
  let i = 0;

  for (const id of Object.keys(Secretions)) {
    const cfg = Secretions[id];
    const key = String(++i); // tal-tast 1,2,3 matcher input.js
    const btn = document.createElement('button');
    btn.className = 'ability';
    btn.style.display = 'none';
    btn.textContent = `${key} · ${cfg.label}`;
    btn.title = `${cfg.label} — koster ${cfg.costAtp ?? 0} ATP${cfg.costAmino ? ` + ${cfg.costAmino} amino` : ''}`;
    btn.addEventListener('click', () => emitIntent && emitIntent({ type: 'use-ability', ability: id }));
    root.appendChild(btn);
    rows.push({ id, cfg, btn });
  }

  return {
    update(state) {
      const p = state.entities.find((e) => e.control && !e.dead);
      for (const r of rows) {
        const owned = !!p?.genome?.genes.has(r.id);
        r.btn.style.display = owned ? '' : 'none';
        if (!owned) continue;
        const afford = (p.energy?.atp ?? 0) >= (r.cfg.costAtp ?? 0) &&
          (p.resources?.amino ?? 0) >= (r.cfg.costAmino ?? 0);
        r.btn.disabled = !afford;
        r.btn.style.opacity = afford ? '1' : '0.5';
        r.btn.style.cursor = afford ? 'pointer' : 'default';
      }
    },
  };
}
