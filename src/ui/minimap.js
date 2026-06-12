// Minimap: skaleret overblik over verden — mad, egne celler, fjender og spilleren.
// Se SPEC.md §10. Kun læsning. Tegner på et 2D-canvas hver frame.
export function createMinimap(canvas /* HTMLCanvasElement */) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  return {
    update(state) {
      const sx = W / state.width, sy = H / state.height;

      // Baggrund.
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a1822';
      ctx.fillRect(0, 0, W, H);

      let player = null;
      // Mad (svage prikker) først, så celler/fjender tegnes ovenpå.
      ctx.fillStyle = 'rgba(255,235,59,0.35)';
      for (const e of state.entities) {
        if (e.dead || !e.transform) continue;
        if (e.kind === 'food') ctx.fillRect(e.transform.x * sx, e.transform.y * sy, 1, 1);
      }

      for (const e of state.entities) {
        if (e.dead || !e.transform) continue;
        const x = e.transform.x * sx, y = e.transform.y * sy;
        if (e.kind === 'enemy') { ctx.fillStyle = '#ef5350'; ctx.fillRect(x - 1, y - 1, 3, 3); }
        else if (e.kind === 'cell') {
          if (e.control) { player = { x, y }; continue; } // spilleren tegnes til sidst
          ctx.fillStyle = '#42a5f5'; ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }

      // Spilleren øverst: grøn prik med ring.
      if (player) {
        ctx.fillStyle = '#4caf50';
        ctx.beginPath(); ctx.arc(player.x, player.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(player.x, player.y, 5, 0, Math.PI * 2); ctx.stroke();
      }

      // Kant.
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    },
  };
}
