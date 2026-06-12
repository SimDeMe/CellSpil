// Tegner celler: organisk krop, kerne, trivsels-glød (tolerance.comfort), flagel-hale ved fart.
// Samt mad og fjender. Se SPEC.md §11 + ENVIRONMENT.md §2(d). Kun læsning af state.
//
// Sprite-pulje: vi genbruger ét PIXI.Graphics pr. entitet (nøgle = entitet-id) i stedet for at
// nybygge hver frame. Forsvundne entiteter får deres figur ryddet væk.
import { Food, Secretions } from '../config/index.js';

const ENEMY_COLORS = {
  bacillus: 0xef5350,
  megabacillus: 0xb71c1c,
  amoeba: 0xab47bc,
  bdello: 0xff9800,
  rival_colony: 0xd4a017,
  phage: 0x90a4ae,
};

export function drawCells(state, camera, alpha, gfx) {
  const { PIXI, cellLayer, sprites } = gfx;
  const t = state.time;
  const seen = new Set();

  for (const e of state.entities) {
    if (e.dead || !e.transform) continue;
    if (e.kind !== 'cell' && e.kind !== 'enemy' && e.kind !== 'food' && e.kind !== 'cloud') continue;
    seen.add(e.id);

    let g = sprites.get(e.id);
    if (!g) {
      g = new PIXI.Graphics();
      cellLayer.addChild(g);
      sprites.set(e.id, g);
      // Skyer får et blur-filter, så de bløde blobs smelter sammen til en rigtig gas-sky.
      if (e.kind === 'cloud') { try { g.filters = [new PIXI.BlurFilter({ strength: 8, quality: 3 })]; } catch (_) { /* ingen filter-støtte */ } }
    }
    g.clear();

    if (e.kind === 'cloud') drawCloud(g, e, t);
    else if (e.kind === 'food') drawFood(g, e);
    else if (e.kind === 'enemy') drawEnemy(g, e, t);
    else drawCell(g, e, t);

    g.position.set(e.transform.x, e.transform.y);
    g.rotation = e.transform.angle || 0;
  }

  // Ryd figurer for entiteter, der ikke længere findes (spist, død, despawnet).
  for (const [id, g] of sprites) {
    if (!seen.has(id)) { g.destroy(); sprites.delete(id); }
  }
}

function drawCloud(g, e, t) {
  const r = e.transform.radius;
  const color = Secretions[e.cloud?.type]?.color ?? 0x9ccc65;
  const life = Math.max(0, Math.min(1, (e.cloud?.life ?? 0) / (e.cloud?.maxLife ?? 1))); // falmer mod udløb
  const seed = e.id * 1.37;

  // En klynge bløde blobs i forskellige størrelser/positioner, der bølger langsomt med tiden.
  // (Sammen med blur-filteret giver det et puffet, gas-agtigt sky-look frem for en flad cirkel.)
  const blobs = 9;
  const baseA = (0.05 + 0.07 * life);
  for (let i = 0; i < blobs; i++) {
    const ang = (i / blobs) * Math.PI * 2 + seed;
    const wob = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 1.7 + seed);
    const dist = r * (0.15 + 0.55 * ((i * 7 % blobs) / blobs)) * (0.85 + 0.15 * wob);
    const bx = Math.cos(ang + t * 0.25) * dist;
    const by = Math.sin(ang + t * 0.25) * dist;
    const br = r * (0.45 + 0.3 * ((i * 5 % blobs) / blobs)) * (0.9 + 0.2 * wob);
    g.circle(bx, by, br).fill({ color, alpha: baseA });
  }
  // Lidt tættere kerne.
  g.circle(0, 0, r * 0.45).fill({ color, alpha: baseA * 1.2 });
}

function drawFood(g, e) {
  const r = e.transform.radius;
  const kind = e.food?.kind ?? 'glucose';
  const cfg = Food[kind] ?? {};

  // Substrat = en kæde af prikker (maltose 2, peptid 3-5), farvet som det produkt, det spaltes til.
  if (cfg.substrate) {
    const n = e.food?.n ?? cfg.parts ?? 2;
    const dotColor = Food[cfg.breaksInto]?.color ?? cfg.color ?? 0xffeb3b;
    const dotR = r * 0.55;
    const gap = dotR * 1.15;
    const span = (n - 1) * gap;
    for (let i = 0; i < n; i++) {
      const x = -span / 2 + i * gap;
      g.circle(x, 0, dotR).fill({ color: dotColor, alpha: 0.92 });
    }
    g.circle(-span / 2 - dotR * 0.2, -dotR * 0.4, dotR * 0.35).fill({ color: 0xffffff, alpha: 0.5 });
    return;
  }

  const color = cfg.color ?? 0xffeb3b;
  g.circle(0, 0, r).fill({ color, alpha: 0.9 });
  g.circle(-r * 0.3, -r * 0.3, r * 0.4).fill({ color: 0xffffff, alpha: 0.5 });
}

function drawCell(g, e, t) {
  const r = e.transform.radius;
  const isPlayer = !!e.control;
  const body = isPlayer ? 0x4caf50 : 0x42a5f5;     // spiller = grøn, AI-celle = blå
  const moving = e.motilityC?.state === 'moving';

  // Flagel-hale bag cellen, når den svømmer (bølger med tiden).
  if (moving) drawFlagellum(g, r, t);

  // Trivsels-glød: grøn ring når komforten er høj, falmer/bliver rødlig når den er lav.
  const comfort = e.tolerance?.comfort ?? 1;
  const glow = comfort > 0.5 ? 0x66bb6a : 0xff7043;
  g.circle(0, 0, r * 1.35).fill({ color: glow, alpha: 0.12 + 0.18 * comfort });

  // Krop + kerne.
  g.circle(0, 0, r).fill({ color: body, alpha: 0.85 }).stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
  g.circle(r * 0.25, -r * 0.2, r * 0.32).fill({ color: 0x9575cd, alpha: 0.5 }).stroke({ width: 1, color: 0x7e57c2, alpha: 0.6 });
  // Glanslys.
  g.circle(-r * 0.35, -r * 0.35, r * 0.15).fill({ color: 0xffffff, alpha: 0.35 });

  // Lav ATP-advarsel: rød kant, når energien er ved at slippe op.
  if (e.energy && e.energy.atp / e.energy.maxAtp < 0.25) {
    g.circle(0, 0, r + 2).stroke({ width: 2, color: 0xff5252, alpha: 0.8 });
  }
}

function drawEnemy(g, e, t) {
  const r = e.transform.radius;
  const color = ENEMY_COLORS[e.enemyType] ?? 0xef5350;
  const moving = e.motilityC?.state === 'moving';
  if (moving) drawFlagellum(g, r, t);
  g.circle(0, 0, r).fill({ color, alpha: 0.85 }).stroke({ width: 2, color: 0x000000, alpha: 0.4 });
  // "Fare"-kerne.
  g.circle(0, 0, r * 0.35).fill({ color: 0x000000, alpha: 0.35 });
}

// En blød, bølgende hale, der peger bagud (lokal -x) og vifter med tiden.
function drawFlagellum(g, r, t) {
  const segments = 8;
  const len = r * 1.8;
  g.moveTo(-r, 0);
  for (let i = 1; i <= segments; i++) {
    const f = i / segments;
    const x = -r - len * f;
    const y = Math.sin(t * 12 + f * 9) * r * 0.35 * f;
    g.lineTo(x, y);
  }
  g.stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
}
