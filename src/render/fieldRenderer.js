// Tegner miljøet: diskret baggrundsstemning efter dybde (lyst/varmt øverst → mørkt dyb nederst).
// Se ENVIRONMENT.md §2(a,b). Kun læsning. Bygges én gang (statisk verden) og genbruges.
//
// Senere (når FieldGrid.step fylder felterne): byt til en blød tone fra fields.sample, og tilføj
// "linser" (heatmap af én parameter). Indtil da approksimerer vi dybde-gradienten fra config.

// Farvestop fra overflade (top) til bund — matcher ånden i Depth-config (lys/varme falder med dybden).
const BANDS = [
  { at: 0.0, color: 0x14323a }, // solbeskinnet lavvand
  { at: 0.5, color: 0x0f2530 }, // åbent vand
  { at: 0.8, color: 0x0a1822 }, // mørkt dyb
  { at: 1.0, color: 0x070f17 }, // iltfrit mudder
];

export function drawFields(state, camera, gfx) {
  if (gfx._fieldsBuilt) return;
  gfx._fieldsBuilt = true;

  const g = new gfx.PIXI.Graphics();
  const steps = 40;
  const bandH = state.height / steps;
  for (let i = 0; i < steps; i++) {
    const f = i / (steps - 1);
    g.rect(0, i * bandH, state.width, bandH + 1).fill({ color: lerpBand(f), alpha: 1 });
  }
  gfx.fieldLayer.addChild(g);
}

function lerpBand(f) {
  for (let i = 1; i < BANDS.length; i++) {
    if (f <= BANDS[i].at) {
      const a = BANDS[i - 1], b = BANDS[i];
      const k = (f - a.at) / (b.at - a.at);
      return lerpColor(a.color, b.color, k);
    }
  }
  return BANDS[BANDS.length - 1].color;
}

function lerpColor(c1, c2, k) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * k);
  const g = Math.round(g1 + (g2 - g1) * k);
  const b = Math.round(b1 + (b2 - b1) * k);
  return (r << 16) | (g << 8) | b;
}
