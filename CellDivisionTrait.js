
import { Trait } from './Trait.js';
import { Cell } from './Cell.js';
import { addCellToEnvironment, removeCellFromEnvironment } from './Environment.js';
import { setActiveCell } from './Player.js';

export class CellDivisionTrait extends Trait {
    constructor() {
        super('cell_division', 'Cell Division', 'process');

        // State Machine
        this.state = 'idle'; // idle, elongation, constriction, separation
        this.progress = 0;
        this.duration = 180; // Total frames (3 seconds at 60fps)
    }

    apply(cell) {
        // Start division
        this.state = 'elongation';
        this.progress = 0;
        cell.isDividing = true; // Flag legacy logic if needed
    }

    update(cell, dt) {
        if (this.state === 'idle') return;

        this.progress += dt;
        const t = Math.min(1, this.progress / this.duration);

        if (this.state === 'elongation') {
            // Phase 1: Elongation (0 -> 0.5)
            // Stretch aspectRatio from 1.0 to 2.0
            const phaseT = Math.min(1, t * 2);
            cell.morphology.aspectRatio = 1.0 + phaseT * 1.0; // Ends at 2.0

            // Slightly start constriction late in this phase
            if (phaseT > 0.8) {
                this.state = 'constriction';
            }
        }
        else if (this.state === 'constriction') {
            // Phase 2: Constriction (0.5 -> 1.0)
            const phaseT = (t - 0.4) / 0.6; // Normalize remaining time

            // Ensure aspectRatio stays high
            cell.morphology.aspectRatio = 2.0;

            // Ramp up constriction from 0 to 1
            cell.morphology.constriction = Math.max(0, Math.min(1, phaseT));

            if (t >= 1) {
                this.state = 'separation';
            }
        }
        else if (this.state === 'separation') {
            // Phase 3: Split
            this.finalizeDivision(cell);
            this.state = 'finished';
        }
    }

    finalizeDivision(parent) {
        // Logic to spawn two new cells
        // Offset along division axis (X axis local)
        const offset = parent.morphology.radius * 0.8;

        // Create Daughter 1
        const d1 = new Cell(parent.x - offset, parent.y);
        this.copyTraits(parent, d1);
        d1.morphology.aspectRatio = 1.0;
        d1.morphology.constriction = 0;
        d1.radius = parent.minRadius; // Reset size
        d1.updateMaxGrowth(); // Recalc stats

        // Create Daughter 2
        const d2 = new Cell(parent.x + offset, parent.y);
        this.copyTraits(parent, d2);
        d2.morphology.aspectRatio = 1.0;
        d2.morphology.constriction = 0;
        d2.radius = parent.minRadius;
        d2.updateMaxGrowth();

        // Transfer Resources (Split 50/50)
        d1.atp = parent.atp / 2;
        d2.atp = parent.atp / 2;
        // ... other resources

        // Add to World
        addCellToEnvironment(d1);
        addCellToEnvironment(d2);

        // Handle Player
        if (parent.isPlayer) {
            d1.isPlayer = true;
            setActiveCell(d1);
            // Move camera etc handled by main loop tracking activeCell
        }

        // Remove Parent
        parent.kill();
        removeCellFromEnvironment(parent);
    }

    copyTraits(source, target) {
        // Copy genes/traits
        // Since Cell uses 'genes' object primarily for config:
        target.genes = { ...source.genes };
        // If there are dynamic traits not in genes, copy them here?
        // Current system syncs traits from genes in updateMaxGrowth()
    }
}
