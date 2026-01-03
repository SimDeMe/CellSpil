import { GameConfig } from './GameConfig.js';
import { Morphology } from './Morphology.js';
import { CellRenderer } from './CellRenderer.js';
import {
    GramPositiveWall,
    GramNegativeEnvelope,
    Flagellum,
    Nucleus,
    Mitochondria
} from './Trait.js';
import { CellDivisionTrait } from './CellDivisionTrait.js';

export class Cell {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;

        // --- NEW SYSTEM ---
        this.morphology = new Morphology();
        this.traits = [];
        this.stats = {
            speed: GameConfig.Player.baseSpeed,
            defense: 0,
            permeability: 1.0,
            maxAmino: GameConfig.Player.baseMaxAmino,
            maxAtp: GameConfig.Player.maxAtp,
            maxNucleotides: GameConfig.Player.baseMaxNucleotides,
            energyGen: 1.0,
            storage: 1.0
        };

        // --- LEGACY PROPS (Keep for compatibility with main.js/Environment.js logic for now) ---
        this.size = 1;
        this.radius = 20;
        this.minRadius = 20;
        this.maxRadius = 28;
        this.pulse = Math.random() * 10;

        this.atp = this.stats.maxAtp;
        this.maxAtp = this.stats.maxAtp;
        this.aminoAcids = 0;
        this.maxAminoAcids = this.stats.maxAmino;
        this.nucleotides = 0;
        this.baseMaxNucleotides = this.stats.maxNucleotides; // Legacy reference
        this.maxNucleotides = this.stats.maxNucleotides;

        this.alive = true;
        this.age = 0;
        this.color = isPlayer ? '#4CAF50' : '#888888';

        this.currentSpeed = 0;
        this.moveAngle = Math.random() * Math.PI * 2;
        this.angle = 0;

        // Pili State (Keeping distinct from Traits for now as it has complex logic in update)
        this.piliState = 'idle';
        this.piliLength = 0;
        this.piliTargetAngle = 0;
        this.piliMaxLength = 30;

        // Division State
        this.isDividing = false;
        this.divisionTimer = 0;
        this.divisionDuration = 60;

        // Secretion State (Animation)
        this.secretion = {
            state: 'idle', // idle, forming, releasing
            type: null,
            timer: 0,
            maxTimer: 40
        };

        // Action Callback
        this.onAction = null;
        this.engulfed = false;
        this.engulfedBy = null;
        this.shouldRemove = false;

        // --- GENES (Legacy Config -> Trait Mapper) ---
        // We keep this object so main.js/debug UI can still toggle boolean flags
        // In a full refactor, we would replace this with direct Trait manipulation
        this.genes = {
            flagellum: false,
            pili: false,
            highSpeedRetraction: false,
            multiplexPili: false,
            megacytosis: false,
            toxin: false,
            protease: false,
            highTorque: false,
            endocytosis: false,
            gramPositive: false, // New
            atpStorage: 0,       // Tier 3 (Level 0-5)
            aminoStorage: 0,     // Tier 3 (Level 0-5)
            nucleotideStorage: 0 // Tier 3 (Level 0-5)
        };

        // Proxy/Setter logic could go here, but for now we call updateMaxGrowth() which will sync traits
        this.updateMaxGrowth();
    }

    addTrait(trait) {
        // Prevent duplicates of same ID
        if (this.traits.find(t => t.id === trait.id)) return;

        this.traits.push(trait);
        trait.apply(this);
    }

    removeTrait(traitId) {
        const index = this.traits.findIndex(t => t.id === traitId);
        if (index > -1) {
            this.traits.splice(index, 1);
            // Re-apply all stats (simplest way to undo)
            this.resetStats();
        }
    }

    resetStats() {
        // Reset to base
        this.stats.speed = GameConfig.Player.baseSpeed;
        this.stats.defense = 0;
        // Re-apply all traits
        this.traits.forEach(t => t.apply(this));
    }

    // Overhauled to Sync Genes -> Traits
    updateMaxGrowth() {
        // 1. Reset Traits based on Genes (Simple Sync)
        this.traits = []; // Clear traits
        this.resetStats();

        // Base Trait (Default)
        // If not Gram Positive and not Gram Negative, maybe default is simple membrane?
        // Let's assume default is simple.

        // Apply Genes mapping
        if (this.genes.gramPositive) this.addTrait(new GramPositiveWall());
        if (this.genes.flagellum) this.addTrait(new Flagellum());

        // Legacy Cost Calculation (Keep this for game balance as is)
        let cost = GameConfig.Player.baseMaxAmino;
        if (this.genes.pili) cost += GameConfig.Player.mutationCosts.pili;
        if (this.genes.highSpeedRetraction) cost += GameConfig.Player.mutationCosts.highSpeedRetraction;
        if (this.genes.multiplexPili) cost += GameConfig.Player.mutationCosts.multiplexPili;
        if (this.genes.flagellum) cost += GameConfig.Player.mutationCosts.flagellum;
        if (this.genes.megacytosis) cost += GameConfig.Player.mutationCosts.megacytosis;
        if (this.genes.toxin) cost += GameConfig.Player.mutationCosts.toxin;
        if (this.genes.protease) cost += GameConfig.Player.mutationCosts.protease;
        if (this.genes.highTorque) cost += GameConfig.Player.mutationCosts.highTorque;
        if (this.genes.endocytosis) cost += GameConfig.Player.mutationCosts.endocytosis;

        // Apply Storage Multipliers (Tier 3)
        const atpMult = 1.0 + (this.genes.atpStorage || 0) * 0.1;
        const aminoMult = 1.0 + (this.genes.aminoStorage || 0) * 0.1;
        const nucleoMult = 1.0 + (this.genes.nucleotideStorage || 0) * 0.1;

        this.maxAminoAcids = cost * aminoMult;
        this.maxNucleotides = this.stats.maxNucleotides * nucleoMult;

        // Size Logic
        if (this.genes.megacytosis) {
            this.size = 2;
            this.minRadius = 40;
            this.maxRadius = 56;
            this.morphology.radius = 40; // Sync morphology
        } else {
            this.size = 1;
            this.minRadius = 20;
            this.maxRadius = 28;
            this.morphology.radius = 20;
        }

        // Sync Stats to Legacy props
        this.maxAtp = this.stats.maxAtp * atpMult;
        // speed is calculated per frame in update() usually, or baseSpeed mod.
    }

    startDivision() {
        // New Trait-based division
        this.addTrait(new CellDivisionTrait());
    }

    startSecretion(type) {
        if (this.secretion.state !== 'idle') return;
        this.secretion.state = 'forming';
        this.secretion.type = type;
        this.secretion.timer = 0;
        // Forming: 0-30. Releasing: 30-40.
        this.secretion.maxTimer = 40;
    }

    kill() {
        this.atp = 0;
        this.alive = false;
        this.color = '#444';
    }

    update(mouse, inputKeys, worldWidth, worldHeight, foodParticles, otherCells, viewHeight = 600) {
        // Update Traits
        this.traits.forEach(t => t.update(this, 1));

        // If dividing (via trait), we might want to skip movement logic?
        // Check if DivisionTrait is active and in a state that blocks movement.
        const dividing = this.traits.find(t => t.id === 'cell_division');
        if (dividing && dividing.state !== 'finished') {
             // Skip movement inputs
             inputKeys = {}; // Disable input
        } else {
            // Only update age if not dividing
            this.age++;
        }

        this.isTakingDamage = false;

        // Morphology Update
        // Use time or just a tick
        // Speed affects phase update (Whip speed)
        const morphDt = 0.2 + (this.currentSpeed * 2.0);
        this.morphology.update(morphDt);

        // Secretion Animation Logic
        if (this.secretion.state !== 'idle') {
            this.secretion.timer++;
            // Phase 1: Forming (0 -> 30)
            if (this.secretion.state === 'forming' && this.secretion.timer >= 30) {
                this.secretion.state = 'releasing';
            }
            // Phase 2: Releasing (30 -> 40)
            else if (this.secretion.state === 'releasing' && this.secretion.timer >= this.secretion.maxTimer) {
                // Trigger Action
                if (this.onAction) {
                    // Position: Front of cell relative to movement/mouse
                    const angle = (this.isPlayer && mouse)
                        ? Math.atan2(mouse.y - this.y, mouse.x - this.x)
                        : this.moveAngle;

                    const offset = this.radius + 5;
                    const sx = this.x + Math.cos(angle) * offset;
                    const sy = this.y + Math.sin(angle) * offset;

                    this.onAction(this.secretion.type, sx, sy, angle);
                }

                // Reset
                this.secretion.state = 'idle';
                this.secretion.timer = 0;
            }
        }

        // Endocytosis Animation
        if (this.engulfed) {
            this.radius *= 0.95;
            this.morphology.radius = this.radius;
            if (this.radius < 2) this.shouldRemove = true;
            if (this.engulfedBy) {
                this.x += (this.engulfedBy.x - this.x) * 0.1;
                this.y += (this.engulfedBy.y - this.y) * 0.1;
            }
            return;
        }

        // --- UPKEEP ---
        // (Simplified from original for brevity, but logic remains)
        let moveSpeed = 0.4;
        if (this.genes.megacytosis) moveSpeed *= 0.5;
        if (this.genes.flagellum) {
            moveSpeed += 2.0;
            if (this.genes.highTorque) moveSpeed += 2.0;
        }

        // Update Pili Logic (Legacy code integration)
        let piliMoveSpeed = 0;
        if (this.genes.pili && this.alive && this.isPlayer && mouse) {
             // ... [Logic preserved] ...
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Pili Params
            const extendSpeed = 5;
            let retractSpeed = 2;
            let maxLen = 30;
            if (this.genes.highSpeedRetraction) { retractSpeed = 6; maxLen = 45; }
            if (this.genes.multiplexPili) { retractSpeed = 8; maxLen = 60; }
            this.piliMaxLength = maxLen;

            if (this.piliState === 'idle') {
                if (dist > this.radius + 10) {
                    this.piliState = 'extending';
                    this.piliTargetAngle = Math.atan2(dy, dx);
                    this.piliLength = 0;
                    this.angle = this.piliTargetAngle;
                }
            } else if (this.piliState === 'extending') {
                this.piliLength += extendSpeed;
                moveSpeed *= 0.1;
                if (this.piliLength >= this.piliMaxLength || this.piliLength >= dist) {
                    this.piliState = 'retracting';
                }
            } else if (this.piliState === 'retracting') {
                this.piliLength -= retractSpeed;
                piliMoveSpeed = retractSpeed * 1.5;
                if (this.piliLength <= 0) {
                    this.piliLength = 0;
                    this.piliState = 'idle';
                }
            }
        }

        // MOVEMENT
        if (this.alive) {
            if (this.isPlayer && inputKeys) {
                // Abilities
                if (inputKeys.s && inputKeys.c) { // Cheat
                    this.atp = this.maxAtp;
                    this.aminoAcids = this.maxAminoAcids;
                }

                // Toxin (E)
                if (inputKeys.e && this.genes.toxin && this.onAction) {
                    // Start Animation if not already active
                    if (this.atp >= 15 && this.aminoAcids >= 1 && this.secretion.state === 'idle') {
                        this.startSecretion('toxin');
                        this.atp -= 15;
                        this.aminoAcids -= 1;
                        inputKeys.e = false; // Consume key press
                    }
                }

                // Protease (R)
                if (inputKeys.r && this.genes.protease && this.onAction) {
                    if (this.atp >= 10 && this.aminoAcids >= 1 && this.secretion.state === 'idle') {
                        this.startSecretion('protease');
                        this.atp -= 10;
                        this.aminoAcids -= 1;
                        inputKeys.r = false;
                    }
                }

                // Calc Movement
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                let moveX = 0; let moveY = 0;
                if (inputKeys.up) moveY -= 1;
                if (inputKeys.down) moveY += 1;
                if (inputKeys.left) moveX -= 1;
                if (inputKeys.right) moveX += 1;

                if ((moveX !== 0 || moveY !== 0) && !this.genes.pili) {
                    // Snail Mode: Don't rotate body, just set moveAngle
                    this.moveAngle = Math.atan2(moveY, moveX);
                    this.angle = 0; // Fix rotation

                    const len = Math.sqrt(moveX*moveX + moveY*moveY);
                    this.x += (moveX/len) * moveSpeed;
                    this.y += (moveY/len) * moveSpeed;
                    this.atp -= GameConfig.Player.moveCost; // [UPDATED] Use Config
                } else if (dist > this.radius && !this.genes.pili) {
                    // Snail Mode: Don't rotate body, just set moveAngle
                    this.moveAngle = Math.atan2(dy, dx);
                    this.angle = 0; // Fix rotation

                    let speedFactor = Math.min(1, (dist - this.radius)/200);

                    const totalSpeed = moveSpeed * speedFactor;
                    this.currentSpeed = totalSpeed;
                    this.x += (dx/dist) * totalSpeed;
                    this.y += (dy/dist) * totalSpeed;
                    this.atp -= GameConfig.Player.moveCost * speedFactor; // [UPDATED] Use Config
                } else if (this.genes.pili && this.piliState === 'retracting') {
                    const mx = Math.cos(this.piliTargetAngle) * piliMoveSpeed;
                    const my = Math.sin(this.piliTargetAngle) * piliMoveSpeed;
                    this.currentSpeed = piliMoveSpeed;
                    this.x += mx;
                    this.y += my;
                    this.atp -= 0.1;
                }
            } else {
                // NPC
                this.moveAngle += (Math.random() - 0.5) * 0.1;
                const npcSpeed = moveSpeed * 0.5;
                this.currentSpeed = npcSpeed;
                this.x += Math.cos(this.moveAngle) * npcSpeed;
                this.y += Math.sin(this.moveAngle) * npcSpeed;
                this.atp -= 0.01;
            }
        }

        // Brownian & Bounds
        this.x += (Math.random() - 0.5) * 0.5;
        this.y += (Math.random() - 0.5) * 0.5;

        // Growth Logic
        const divCost = GameConfig.Player.divisionCost;
        let growthFactor = 0;
        if (this.maxAminoAcids > 0) {
             const aminoP = Math.min(1, this.aminoAcids / divCost.amino);
             const nucleoP = Math.min(1, this.nucleotides / divCost.nucleotide);
             growthFactor = (aminoP + nucleoP) / 2.0;
        }

        const grownRadius = this.minRadius * (1 + growthFactor * 0.5);
        this.morphology.radius = grownRadius;

        // Dynamic Collision Radius
        const baseR = this.morphology.radius;
        const speedFactor = Math.min(this.currentSpeed / 2.0, 1.5);
        const stretch = speedFactor * 10;
        this.radius = baseR + stretch;

        if (this.x - this.radius < 0) this.x = this.radius;
        else if (this.x + this.radius > worldWidth) this.x = worldWidth - this.radius;
        if (this.y - this.radius < 0) this.y = this.radius;
        else if (this.y + this.radius > worldHeight) this.y = worldHeight - this.radius;

        if (this.atp <= 0) this.kill();
    }

    draw(g) {
        // --- NEW RENDER SYSTEM ---
        CellRenderer.render(this, g);

        // Division (Overlay)
        if (this.isDividing) {
             g.stroke({ width: 5, color: 0xFFFFFF });
        }
    }
}
