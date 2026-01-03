
import { Trait } from './Trait.js';

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
        cell.isDividing = true; // Flag for external logic
        cell.isReadyToSplit = false;
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
            // Phase 3: Signal split to the engine
            cell.isReadyToSplit = true;
            this.state = 'finished';
        }
    }
}
