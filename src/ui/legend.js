// ui/legend.js — lille forklaring nederst til venstre: hvilket stof er hvilken farve på kortet?
//
// BEVIDST KUN farve + navn. Spillet er lavet til biologer, der ved hvad stofferne er, så der
// står ikke noget om hvad de giver, eller hvordan de optages — dét hører hjemme i spillet selv
// (og de regler skal alligevel laves om).
//
// Listen bygges ÉN gang ud fra Food-config'en (balance/balance-config.js), så den altid passer
// med det, der rent faktisk spawner. Tilføjer man en ny madtype i config'en, dukker den
// automatisk op her — man skal ikke rette to steder.
//
// Prikkerne tegnes som i spillet (se render/cellRenderer.js drawFood):
//   enkelt stof = én prik i stoffets egen farve
//   polymer     = en kæde af prikker i farven på monomeren, den består af
import { Food } from '../config/index.js';

/** 0xffeb3b → '#ffeb3b' (PIXI bruger tal, CSS bruger tekst). */
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

/** Hvor mange prikker har kæden? Varierer den (partsMin..partsMax), vises den længste. */
const chainLength = (cfg) => cfg.partsMax ?? cfg.parts ?? 2;

/** Én række: prik(ker) + navn. */
function row(doc, kind, cfg) {
  const el = doc.createElement('div');
  el.className = 'lg-row';

  const dots = doc.createElement('span');
  dots.className = 'lg-dots';
  if (cfg.substrate) {
    // Kæde af prikker, farvet som monomeren (præcis som i spillet).
    const color = hex(Food[cfg.breaksInto]?.color ?? cfg.color);
    for (let i = 0; i < chainLength(cfg); i++) {
      const d = doc.createElement('i');
      d.className = 'lg-dot sm';
      d.style.background = color;
      d.style.color = color; // CSS bruger currentColor til prikkens lille glød
      dots.appendChild(d);
    }
  } else {
    const d = doc.createElement('i');
    d.className = 'lg-dot';
    d.style.background = hex(cfg.color);
    d.style.color = hex(cfg.color); // CSS bruger currentColor til prikkens lille glød
    dots.appendChild(d);
  }

  const name = doc.createElement('span');
  name.className = 'lg-name';
  name.textContent = cfg.label ?? kind;

  el.append(dots, name);
  return el;
}

/**
 * Byg forklaringen ind i `root`. Statisk — den ændrer sig ikke undervejs i spillet,
 * så der er ingen update() at kalde hver frame.
 */
export function createLegend(root) {
  if (!root) return null;
  const doc = root.ownerDocument;

  const head = doc.createElement('div');
  head.className = 'lg-head';
  head.textContent = 'PÅ KORTET';
  root.replaceChildren(head);

  for (const [kind, cfg] of Object.entries(Food)) {
    if (!cfg || typeof cfg !== 'object') continue; // Food.reach er et tal, ikke en madtype
    root.appendChild(row(doc, kind, cfg));
  }

  return { root };
}
