// Partikel-effekter: mad-crunch (når mad spises) og cytoplasma-sky (når en celle/fjende dør).
// Se SPEC.md §11. Kun læsning af state — vi udleder hændelser ved at se, hvilke entiteter der
// forsvandt siden sidste frame (mad væk = spist; celle/fjende væk = død).
//
// Alle partikler tegnes i ÉN PIXI.Graphics, som ryddes og gentegnes hver frame (billigt).

export function drawEffects(state, camera, alpha, gfx) {
  const PIXI = gfx.PIXI;

  // Engangs-opsætning af effekt-tilstand.
  if (!gfx._fx) {
    gfx._fx = { prev: new Map(), particles: [], lastTime: state.time };
    gfx._fxG = new PIXI.Graphics();
    gfx.effectLayer.addChild(gfx._fxG);
  }
  const fx = gfx._fx;
  const dt = Math.max(0, Math.min(0.1, state.time - fx.lastTime));
  fx.lastTime = state.time;

  // Hvilke entiteter findes nu? Sammenlign med sidste frame for at finde dem, der forsvandt.
  const current = new Set();
  for (const e of state.entities) {
    if (e.dead || !e.transform) continue;
    if (e.kind !== 'cell' && e.kind !== 'enemy' && e.kind !== 'food') continue;
    current.add(e.id);
    const p = fx.prev.get(e.id);
    if (p) { p.x = e.transform.x; p.y = e.transform.y; }
    else fx.prev.set(e.id, { x: e.transform.x, y: e.transform.y, kind: e.kind, radius: e.transform.radius });
  }
  for (const [id, p] of fx.prev) {
    if (current.has(id)) continue;
    // Entiteten er væk siden sidst → udløs en effekt på dens sidste position.
    if (p.kind === 'food') burst(fx, p.x, p.y, 6, 0xffeb3b, 3, 70);
    else burst(fx, p.x, p.y, 14, p.kind === 'enemy' ? 0xef5350 : 0x80cbc4, p.radius * 0.25, 110);
    fx.prev.delete(id);
  }

  // Opdater og tegn partiklerne.
  const g = gfx._fxG;
  g.clear();
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const pt = fx.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) { fx.particles.splice(i, 1); continue; }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.92; pt.vy *= 0.92; // små bremser, så skyen lægger sig
    const a = pt.life / pt.maxLife;
    g.circle(pt.x, pt.y, pt.r * (0.4 + a)).fill({ color: pt.color, alpha: a * 0.8 });
  }
}

function burst(fx, x, y, count, color, r, speed) {
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + Math.random();
    const sp = speed * (0.4 + Math.random() * 0.8);
    fx.particles.push({
      x, y,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      r: r * (0.6 + Math.random() * 0.8),
      color, life: 0.5 + Math.random() * 0.3, maxLife: 0.8,
    });
  }
}
