
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

                // If aligned (cos near 1), stretch.
                // If perpendicular (cos near 0), squeeze slightly?
                // Stretch forward (+cos) and backward (-cos)?
                // Or "Snail" = Drag effect?
                // Usually "Snail" means elongating the body along the axis of travel.

                if (speedFactor > 0.05) {
                    // Simple Ellipse-like stretch along movement axis
                    // Stretch amount
                    const stretch = speedFactor * 10; // e.g. +10px at max speed
                    // Squeeze amount (preserve area approx)
                    const squeeze = -speedFactor * 3;

                    // Cos^2 for axis alignment (both front and back stretch)
                    // Or just Cos for front-heavy?
                    // User said "membranen der strækker sig i den retning".
                    // Let's bias forward.

                    const deformation = (Math.cos(diff) * stretch);
                    // This stretches front, shrinks back.
                    // To keep back from shrinking too much into negative, maybe scale.
                    // Better: Ellipse distortion.
                    // Radial offset = stretch * cos(diff) -> Moves center? No.

                    // Let's add to radius.
                    // Front (diff=0) -> +stretch. Back (diff=PI) -> -stretch.
                    // This shifts the shape forward.
                    // We want to STRETCH, i.e., elongate.
                    // So Front extends, Back extends (or stays).

                    // Let's use: rad += stretch * Math.abs(Math.cos(diff));
                    // This makes it an oval.

                    // User "Strækker sig i den retning" -> "Extends in that direction".
                    // Maybe asymmetrical? Like a teardrop?
                    // Front extends, back stays round?

                    if (Math.abs(diff) < Math.PI/2) {
                        // Front half
                        rad += Math.cos(diff) * stretch;
                    } else {
                        // Back half - maybe trailing effect?
                        // rad += Math.cos(diff) * stretch * 0.2;
                    }
                }

                const x = Math.cos(angle) * rad;
                const y = Math.sin(angle) * rad;
                if (i === 0) g.moveTo(x, y);
                else g.lineTo(x, y);
            }
            g.closePath();
        }

        g.fill({ color: color, alpha: 0.8 });


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
    const tailLen = r * 2.5;
    const segments = 10;
    const phase = cell.morphology.phase * 5;

    // Orient opposite to movement
    // moveAngle is direction of travel. Tail is at moveAngle + PI.
    const angle = moveAngle + Math.PI;

    g.beginPath();

    // Start at body edge
    const startX = Math.cos(angle) * r;
    const startY = Math.sin(angle) * r;
    g.moveTo(startX, startY);

    // Draw tail
    for (let i = 0; i <= segments; i++) {
        const dist = (i/segments) * tailLen;
        // Base line
        const bx = startX + Math.cos(angle) * dist;
        const by = startY + Math.sin(angle) * dist;

        // Wave offset (perpendicular)
        const perpX = Math.cos(angle + Math.PI/2);
        const perpY = Math.sin(angle + Math.PI/2);

        const wave = Math.sin(i + phase) * 5;

        const px = bx + perpX * wave;
        const py = by + perpY * wave;

        g.lineTo(px, py);
    }

    g.stroke({ width: 2, color: 0xAAAAAA });
}
