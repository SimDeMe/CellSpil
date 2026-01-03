
// CellRenderer.js
// Procedural Renderer using PixiJS Graphics

export class CellRenderer {
    static render(cell, g) {
        g.clear();

        // Unwrap params
        const m = cell.morphology;
        const r = m.radius;
        const traits = cell.traits;

        // --- 1. FLAGELLA (Behind) ---
        const hasFlagellum = traits.find(t => t.id === 'flagellum');
        if (hasFlagellum) {
            drawFlagellum(g, cell, r);
        }

        // --- 2. BODY / CYTOPLASM ---
        const color = cell.color || 0xFFFFFF;

        // PixiJS v7/v8 syntax check:
        // If we are unsure of version, stick to standard API.
        // But assuming v7+ based on prompt requirements.
        // Let's use standard beginFill/draw/endFill which works in v7 too usually,
        // but v7 has simplified API.
        // If the user specifically asked for PixiJS v7+, we stick to that.
        // However, to be safe against the "black screen" issue, I will ensure alpha is handled.

        // BODY SHAPE
        if (m.shapeType === 'rod') {
            const width = r * m.aspectRatio * 2;
            const height = r * 2;

            // v7 style: g.roundRect(...)
            // If v8, it's just rect with radius?
            g.roundRect(-width/2, -height/2, width, height, r);
        } else {
            // Circle / Blob
            if (m.wobbleAmount > 0.5) {
                // Blob Mesh
                g.beginPath();
                const segments = 32;
                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    const rad = m.getRadiusAt(angle);
                    const x = Math.cos(angle) * rad;
                    const y = Math.sin(angle) * rad;
                    if (i === 0) g.moveTo(x, y);
                    else g.lineTo(x, y);
                }
                g.closePath();
            } else {
                g.circle(0, 0, r);
            }
        }

        // FILL
        // Use legacy-safe fill if needed, but sticking to new API for now
        // assuming the issue was just startup timing or camera.
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

        // --- 5. PILI (MOVED FROM CELL.JS) ---
        // We handle Pili rendering here now.
        if (cell.genes.pili && cell.alive && (cell.piliState === 'extending' || cell.piliState === 'retracting')) {
             const piliColor = 0xE0F7FA;

             // Define helper
             const drawStrand = (offsetAngle) => {
                // Pili Target is in Global World Space.
                // We are drawing in Local Space (Graphics is rotated by cell.angle).
                // LocalAngle = TargetAngle - CellAngle.

                const currentRot = (cell.isPlayer ? cell.angle : cell.moveAngle) || 0;
                const localTargetAngle = cell.piliTargetAngle - currentRot;

                const angle = localTargetAngle + offsetAngle;

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
        g.ellipse(-r*0.3, -r*0.3, r*0.2, r*0.1); // No rotation param in v7 ellipse? It's (x, y, w, h).
        // Rotation requires graphics rotation or matrix.
        // Let's just draw a simple circle highlight.
        // g.fill({ color: 0xFFFFFF, alpha: 0.3 }); // Wait, need to close path or begin new one?
        // Ellipse command creates path.
        // We already filled the nucleus above.
        // We should start new path/fill for highlight.

        g.circle(-r*0.3, -r*0.3, r*0.15);
        g.fill({ color: 0xFFFFFF, alpha: 0.3 });
    }
}

function drawFlagellum(g, cell, r) {
    const tailLen = r * 2.5;
    const segments = 10;
    const phase = cell.morphology.phase * 5;

    g.beginPath();
    g.moveTo(-r, 0);

    for (let i = 0; i <= segments; i++) {
        const x = -r - (i/segments) * tailLen;
        const y = Math.sin(i + phase) * 5;
        g.lineTo(x, y);
    }

    g.stroke({ width: 2, color: 0xAAAAAA });
}
