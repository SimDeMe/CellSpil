
// CellRenderer.js
// Procedural Renderer using PixiJS Graphics

export class CellRenderer {
    static render(cell, g) {
        g.clear();

        // Unwrap params
        const m = cell.morphology;
        const r = m.radius;
        const traits = cell.traits;

        // --- SNAIL MODE DEFORMATION CALCS ---
        // Calculate stretch based on speed and moveAngle
        // Body doesn't rotate (cell.angle is 0), so we deform relative to moveAngle.
        let moveAngle = cell.moveAngle || 0;
        let speed = cell.currentSpeed || 0;

        // Normalize speed to a factor (0 to 1+)
        const speedFactor = Math.min(speed / 2.0, 1.5); // Cap deformation

        // --- 1. FLAGELLA (Behind) ---
        // Flagellum trails behind movement
        const hasFlagellum = traits.find(t => t.id === 'flagellum');
        if (hasFlagellum) {
            drawFlagellum(g, cell, r, moveAngle);
        }

        // --- 2. BODY / CYTOPLASM ---
        const color = cell.color || 0xFFFFFF;

        if (m.shapeType === 'rod') {
            // Rod logic (if used)
            // For snail mode, we might want to rotate the rod to face movement?
            // Or just draw it. For now keeping basic rod.
            const width = r * m.aspectRatio * 2;
            const height = r * 2;
            g.roundRect(-width/2, -height/2, width, height, r);
        } else {
            // Circle / Blob with STRETCH
            g.beginPath();
            const segments = 32;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                let rad = m.getRadiusAt(angle);

                // STRETCH LOGIC
                // Elongate in direction of moveAngle
                // We are in local space (0 rotation).
                // So we compare 'angle' with 'moveAngle'.
                const diff = angle - moveAngle;
                const cos = Math.cos(diff);

                // Disable snail stretch if dividing (constriction > 0) to keep shape clean
                if (speedFactor > 0.05 && m.constriction === 0) {
                    const stretch = speedFactor * 10;

                    // Smooth deformation function (Cardioid-like) to avoid sharp edges.
                    // (cos(diff) + 1) goes from 0 to 2. Normalized 0..1 via /2.
                    // Pow 2 makes it sharper at the front but still smooth everywhere.

                    const factor = (Math.cos(diff) + 1) / 2; // 0..1 smooth
                    rad += Math.pow(factor, 2) * stretch;
                }

                const x = Math.cos(angle) * rad;
                const y = Math.sin(angle) * rad;
                if (i === 0) g.moveTo(x, y);
                else g.lineTo(x, y);
            }
            g.closePath();
        }

        g.fill({ color: color, alpha: 0.8 });

        // --- 2.5 SECRETION VESICLE ---
        if (cell.secretion && cell.secretion.state !== 'idle') {
            const sec = cell.secretion;
            // Direction: Use moveAngle (Cell front)
            // We draw in local space, so angle relative to body is just moveAngle?
            // No, body is 0 rotation. So global moveAngle is the direction vector in local space too.
            const dir = moveAngle;

            let dist = 0;
            let radius = r * 0.3;
            let alpha = 0.9;
            const color = (sec.type === 'toxin') ? 0x00E676 : 0xE91E63;

            if (sec.state === 'forming') {
                // Grow from center
                const t = sec.timer / 30; // 0..1
                dist = r * 0.2 * t;
                radius = (r * 0.1) + (r * 0.2 * t);
            } else if (sec.state === 'ready') {
                // Floating Pulse (Waiting for trigger)
                const pulse = Math.sin(Date.now() / 200) * 0.05;
                dist = r * 0.2;
                radius = (r * 0.3) * (1 + pulse);
                alpha = 0.9;
            } else {
                // Moving/Releasing (30 -> 40)
                const t = (sec.timer - 30) / 10; // 0..1
                // Move from inner (0.2r) to edge (r)
                dist = (r * 0.2) + (r * 0.8 * t);

                // Merge effect?
                if (t > 0.5) alpha = 1.0 - (t - 0.5); // Fade out as it bursts?
            }

            const vx = Math.cos(dir) * dist;
            const vy = Math.sin(dir) * dist;

            g.circle(vx, vy, radius);
            g.fill({ color: color, alpha: alpha });
            g.stroke({ width: 1, color: 0xFFFFFF, alpha: alpha });
        }

        // --- 3. MEMBRANE / WALL ---
        let strokeColor = 0xCCCCCC;
        let strokeWidth = 2;
        let hasOuter = false;

        const gp = traits.find(t => t.id === 'gram_positive');
        const gn = traits.find(t => t.id === 'gram_negative');

        if (gp) {
            strokeColor = gp.color;
            strokeWidth = gp.thickness;
        } else if (gn) {
            strokeColor = gn.innerColor;
            strokeWidth = 2;
            hasOuter = true;
        }

        g.stroke({ width: strokeWidth, color: strokeColor });

        // Outer Membrane (Gram Negative)
        if (hasOuter && gn) {
            g.stroke({ width: gn.thickness, color: gn.outerColor, alignment: 1 });
        }

        // --- 4. INTERNAL ORGANELLES ---
        // Nucleus
        const nucleus = traits.find(t => t.id === 'nucleus');
        if (nucleus) {
            // Nucleus floats in center, maybe slightly lagging?
            g.circle(r * 0.3, -r * 0.2, r * 0.4);
            g.fill({ color: 0x9575CD, alpha: 0.6 });
            g.stroke({ width: 1, color: 0x7E57C2 });
        }

        // Mitochondria
        const mito = traits.find(t => t.id === 'mitochondria');
        if (mito) {
            const count = 3;
            for(let i=0; i<count; i++) {
                const mx = (Math.random()-0.5) * r;
                const my = (Math.random()-0.5) * r;
                g.ellipse(mx, my, 6, 3);
                g.fill({ color: 0xFF5252, alpha: 0.7 });
            }
        }

        // --- 5. PILI ---
        if (cell.genes.pili && cell.alive && (cell.piliState === 'extending' || cell.piliState === 'retracting')) {
             const piliColor = 0xE0F7FA;
             const drawStrand = (offsetAngle) => {
                const currentRot = (cell.isPlayer ? cell.angle : cell.moveAngle) || 0;
                // Since cell.angle is 0 now, currentRot is 0.
                // But Pili logic in Cell.js uses piliTargetAngle (Global).
                // So local angle = piliTargetAngle.

                // Wait, if cell.angle is 0, then Local = Global.
                // So we just use cell.piliTargetAngle.

                const angle = cell.piliTargetAngle + offsetAngle;

                const startX = Math.cos(angle) * r;
                const startY = Math.sin(angle) * r;
                const endX = Math.cos(angle) * (r + cell.piliLength);
                const endY = Math.sin(angle) * (r + cell.piliLength);

                g.moveTo(startX, startY);
                g.lineTo(endX, endY);
                g.stroke({ width: 3, color: piliColor });
                g.circle(endX, endY, 4);
                g.fill({ color: piliColor });
             };

             if (cell.genes.multiplexPili) {
                 drawStrand(-0.25);
                 drawStrand(0.25);
             } else {
                 drawStrand(0);
             }
        }

        // --- 6. HIGHLIGHTS ---
        g.circle(-r*0.3, -r*0.3, r*0.15);
        g.fill({ color: 0xFFFFFF, alpha: 0.3 });
    }
}

function drawFlagellum(g, cell, r, moveAngle) {
    // 1. Setup
    const tailLen = r * 3.5;
    const segments = 30;
    // Phase comes from Cell.js (scaled by speed)
    // We multiply less here because the dt in Cell.js is already scaled
    const phase = cell.morphology.phase * 2.0;

    const angle = moveAngle + Math.PI; // Trail behind

    // Base position (on membrane)
    const startX = Math.cos(angle) * r;
    const startY = Math.sin(angle) * r;

    // Perpendicular vectors
    const perpX = Math.cos(angle + Math.PI/2);
    const perpY = Math.sin(angle + Math.PI/2);

    // 2. Draw Anchor (Membrane Protein)
    // Small dark box/circle at the base
    const anchorSize = 4;
    g.beginPath();
    // Draw centered at startX, startY
    g.circle(startX, startY, anchorSize);
    g.fill({ color: 0x555555 }); // Dark grey protein

    // 3. Draw Whip (Tapered)
    // We draw segment by segment to adjust line width (taper)

    let prevX = startX;
    let prevY = startY;

    for (let i = 1; i <= segments; i++) {
        const t = i / segments; // 0..1
        const dist = t * tailLen;

        // Base line
        const bx = startX + Math.cos(angle) * dist;
        const by = startY + Math.sin(angle) * dist;

        // Whip Physics:
        // Amplitude grows with distance (t) -> like a whip crack
        // Frequency: ~2 full waves along length
        // Phase moves wave OUTWARDS (-phase)
        const wave = Math.sin(t * 10 - phase);
        const amplitude = 5 + (t * 10); // 5 at base, 15 at tip

        const px = bx + perpX * (wave * amplitude);
        const py = by + perpY * (wave * amplitude);

        // Draw Segment
        g.beginPath();
        g.moveTo(prevX, prevY);
        g.lineTo(px, py);

        // Taper Width: 4px at base -> 1px at tip
        const width = 4 * (1 - t) + 1;
        g.stroke({ width: width, color: 0xDDDDDD, cap: 'round' });

        prevX = px;
        prevY = py;
    }
}
