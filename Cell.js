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

        this.size = 1;
        this.radius = 20;
        this.minRadius = 20;
        this.maxRadius = 28;

        this.atp = this.stats.maxAtp;
        this.maxAtp = this.stats.maxAtp;

        // Refined Resources
        this.aminoAcids = 0;
        this.maxAminoAcids = this.stats.maxAmino;
        this.nucleotides = 0;
        this.baseMaxNucleotides = this.stats.maxNucleotides;
        this.maxNucleotides = this.stats.maxNucleotides;

        // Raw Materials (Metabolism)
        this.glucose = 0; // External Carbon Source
        this.carbon = 0;  // Internal C-atoms (from Catabolism)
        this.nitrogen = 0;
        this.phosphate = 0;

        // Complex Stores (from Predation)
        this.storedDna = 0;
        this.storedProtein = 0;

        this.alive = true;
        this.age = 0;
        this.color = isPlayer ? '#4CAF50' : '#888888';

        this.currentSpeed = 0;
        this.moveAngle = Math.random() * Math.PI * 2;
        this.angle = 0;

        this.piliState = 'idle';
        this.piliLength = 0;
        this.piliTargetAngle = 0;
        this.piliMaxLength = 30;

        this.isDividing = false;

        // Secretion & Production
        this.vesicles = []; // Stored vesicles (strings: 'toxin', 'protease')
        this.maxVesicles = 5;

        this.production = {
            state: 'idle', // idle, producing
            type: null,
            timer: 0,
            maxTimer: 30
        };

        this.secretion = {
            state: 'idle', // idle, releasing
            type: null,
            timer: 0,
            maxTimer: 10 // Animation time for release
        };

        this.onAction = null;
        this.engulfed = false;
        this.engulfedBy = null;
        this.shouldRemove = false;

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
            gramPositive: false,
            atpStorage: 0,
            aminoStorage: 0,
            nucleotideStorage: 0
        };

        this.updateMaxGrowth();
    }

    addTrait(trait) {
        if (this.traits.find(t => t.id === trait.id)) return;
        this.traits.push(trait);
        trait.apply(this);
    }

    removeTrait(traitId) {
        const index = this.traits.findIndex(t => t.id === traitId);
        if (index > -1) {
            this.traits.splice(index, 1);
            this.resetStats();
        }
    }

    resetStats() {
        this.stats.speed = GameConfig.Player.baseSpeed;
        this.stats.defense = 0;
        this.traits.forEach(t => t.apply(this));
    }

    updateMaxGrowth() {
        this.traits = [];
        this.resetStats();

        if (this.genes.gramPositive) this.addTrait(new GramPositiveWall());
        if (this.genes.flagellum) this.addTrait(new Flagellum());

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

        const atpMult = 1.0 + (this.genes.atpStorage || 0) * 0.1;
        const aminoMult = 1.0 + (this.genes.aminoStorage || 0) * 0.1;

        this.maxAminoAcids = cost * aminoMult;
        // Nucleotides cap matches division cost exactly (dynamic)
        const divCost = this.getDivisionCost();
        this.maxNucleotides = divCost.nucleotide;

        if (this.genes.megacytosis) {
            this.size = 2;
            this.minRadius = 40;
            this.maxRadius = 56;
            this.morphology.radius = 40;
        } else {
            this.size = 1;
            this.minRadius = 20;
            this.maxRadius = 28;
            this.morphology.radius = 20;
        }

        this.maxAtp = this.stats.maxAtp * atpMult;
    }

    getDivisionCost() {
        const base = GameConfig.Player.divisionCost;
        let mutationCount = 0;

        for (const k in this.genes) {
            const val = this.genes[k];
            if (typeof val === 'number') mutationCount += val;
            else if (val === true) mutationCount += 1;
        }

        return {
            amino: base.amino + mutationCount,
            nucleotide: base.nucleotide + mutationCount
        };
    }

    startDivision() {
        this.addTrait(new CellDivisionTrait());
    }

    produce(type) {
        // Check limits and state
        if (this.production.state !== 'idle') return;
        if (this.vesicles.length >= this.maxVesicles) return;

        let costAtp = 0;
        let costAmino = 0;

        if (type === 'toxin') { costAtp = 15; costAmino = 1; }
        else if (type === 'protease') { costAtp = 10; costAmino = 1; }

        if (this.atp >= costAtp && this.aminoAcids >= costAmino) {
            this.atp -= costAtp;
            this.aminoAcids -= costAmino;
            this.production.state = 'producing';
            this.production.type = type;
            this.production.timer = 0;
        }
    }

    activateAbility() {
        // Only release if idle and have ammo
        if (this.secretion.state === 'idle' && this.vesicles.length > 0) {
            const type = this.vesicles.shift(); // FIFO or LIFO? Shift is FIFO.
            this.secretion.state = 'releasing';
            this.secretion.type = type;
            this.secretion.timer = 0;
        }
    }

    kill() {
        this.atp = 0;
        this.alive = false;
        this.color = '#444';
    }

    update(mouse, inputKeys, worldWidth, worldHeight, foodParticles, otherCells, viewHeight = 600) {
        this.traits.forEach(t => t.update(this, 1));

        const dividing = this.traits.find(t => t.id === 'cell_division');
        if (dividing && dividing.state !== 'finished') {
             inputKeys = {};
        } else {
            this.age++;
        }

        this.isTakingDamage = false;

        this.metabolize();

        const morphDt = 0.2 + (this.currentSpeed * 2.0);
        this.morphology.update(morphDt);

        // Production Logic
        if (this.production.state === 'producing') {
            this.production.timer++;
            if (this.production.timer >= this.production.maxTimer) {
                this.vesicles.push(this.production.type);
                this.production.state = 'idle';
                this.production.timer = 0;
            }
        }

        // Secretion Release Logic
        if (this.secretion.state === 'releasing') {
            this.secretion.timer++;
            if (this.secretion.timer >= this.secretion.maxTimer) {
                // Fire
                if (this.onAction) {
                    const angle = (this.isPlayer && mouse)
                        ? Math.atan2(mouse.y - this.y, mouse.x - this.x)
                        : this.moveAngle;

                    const offset = this.radius + 5;
                    const sx = this.x + Math.cos(angle) * offset;
                    const sy = this.y + Math.sin(angle) * offset;

                    this.onAction(this.secretion.type, sx, sy, angle);
                }
                this.secretion.state = 'idle';
                this.secretion.timer = 0;
            }
        }

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

        let moveSpeed = 0.4;
        if (this.genes.megacytosis) moveSpeed *= 0.5;
        if (this.genes.flagellum) {
            moveSpeed += 2.0;
            if (this.genes.highTorque) moveSpeed += 2.0;
        }

        let piliMoveSpeed = 0;
        if (this.genes.pili && this.alive && this.isPlayer && mouse) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

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
                // Cheat
                if (inputKeys.s && inputKeys.c) {
                    this.atp = this.maxAtp;
                    this.aminoAcids = this.maxAminoAcids;
                }

                // Abilities (Activation)
                if (inputKeys.e && this.genes.toxin) {
                    this.activateAbility();
                    inputKeys.e = false;
                }
                if (inputKeys.r && this.genes.protease) {
                    this.activateAbility();
                    inputKeys.r = false;
                }

                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                let moveX = 0; let moveY = 0;
                if (inputKeys.up) moveY -= 1;
                if (inputKeys.down) moveY += 1;
                if (inputKeys.left) moveX -= 1;
                if (inputKeys.right) moveX += 1;

                if ((moveX !== 0 || moveY !== 0) && !this.genes.pili) {
                    this.moveAngle = Math.atan2(moveY, moveX);
                    this.angle = 0;
                    const len = Math.sqrt(moveX*moveX + moveY*moveY);
                    this.x += (moveX/len) * moveSpeed;
                    this.y += (moveY/len) * moveSpeed;
                    this.atp -= GameConfig.Player.moveCost;
                } else if (dist > this.radius && !this.genes.pili) {
                    this.moveAngle = Math.atan2(dy, dx);
                    this.angle = 0;
                    let speedFactor = Math.min(1, (dist - this.radius)/200);
                    const totalSpeed = moveSpeed * speedFactor;
                    this.currentSpeed = totalSpeed;
                    this.x += (dx/dist) * totalSpeed;
                    this.y += (dy/dist) * totalSpeed;
                    this.atp -= GameConfig.Player.moveCost * speedFactor;
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

        this.x += (Math.random() - 0.5) * 0.5;
        this.y += (Math.random() - 0.5) * 0.5;

        // Growth (Uses current resources, but max is dynamic)
        const divCost = this.getDivisionCost(); // Use dynamic cost for bar reference logic if needed, but growth check uses explicit check below

        let growthFactor = 0;
        if (this.maxAminoAcids > 0) {
             const aminoP = Math.min(1, this.aminoAcids / divCost.amino);
             const nucleoP = Math.min(1, this.nucleotides / divCost.nucleotide);
             growthFactor = (aminoP + nucleoP) / 2.0;
        }

        const grownRadius = this.minRadius * (1 + growthFactor * 0.5);
        this.morphology.radius = grownRadius;

        const baseR = this.morphology.radius;
        const speedFactor = Math.min(this.currentSpeed / 2.0, 1.5);
        const stretch = speedFactor * 10;
        this.radius = baseR + stretch;

        if (this.x - this.radius < 0) this.x = this.radius;
        else if (this.x + this.radius > worldWidth) this.x = worldWidth - this.radius;
        if (this.y - this.radius < 0) this.y = this.radius;
        else if (this.y + this.radius > worldHeight) this.y = worldHeight - this.radius;

        if (this.atp <= 0) this.kill();

        // Integer Enforcement - Removed to allow fractional drain
        // this.atp = Math.floor(this.atp);
        // this.aminoAcids = Math.floor(this.aminoAcids);
        // this.nucleotides = Math.floor(this.nucleotides);
    }

    metabolize() {
        const rates = GameConfig.Resources;

        // 1. Fermentation (Glucose -> ATP)
        // Glycolysis + Fermentation: 2 ATP per Glucose
        // Feedback Inhibition: Rate decreases as ATP nears max
        if (this.glucose > 0 && this.atp < this.maxAtp) {
            const inhibition = Math.max(0, 1 - (this.atp / this.maxAtp));
            const rate = rates.fermentationRate * inhibition;

            const amount = Math.min(this.glucose, rate);
            this.glucose -= amount;
            this.atp = Math.min(this.atp + amount * rates.fermentationYield, this.maxAtp);
        }
    }

    // --- KATABOLISME (Breakdown) ---

    catabolizeGlucose() {
        // 1 Glucose + 1 ATP -> 6 Carbon
        if (this.glucose >= 1 && this.atp >= 1) {
            this.glucose -= 1;
            this.atp -= 1;
            this.carbon += 6;
            return true;
        }
        return false;
    }

    catabolizeProtein() {
        // 1 Protein + 1 ATP -> 3 Amino Acids
        if (this.storedProtein >= 1 && this.atp >= 1) {
            this.storedProtein -= 1;
            this.atp -= 1;
            this.aminoAcids = Math.min(this.aminoAcids + 3, this.maxAminoAcids);
            return true;
        }
        return false;
    }

    catabolizeDna() {
        // 1 DNA + 2 ATP -> 3 Nucleotides
        if (this.storedDna >= 1 && this.atp >= 2) {
            this.storedDna -= 1;
            this.atp -= 2;
            this.nucleotides = Math.min(this.nucleotides + 3, this.maxNucleotides);
            return true;
        }
        return false;
    }

    // --- ANABOLISME (Synthesis) ---

    anabolizeAmino() {
        // 4 C + 1 N + 1 ATP -> 1 Amino Acid
        if (this.carbon >= 4 && this.nitrogen >= 1 && this.atp >= 1 && this.aminoAcids < this.maxAminoAcids) {
            this.carbon -= 4;
            this.nitrogen -= 1;
            this.atp -= 1;
            this.aminoAcids += 1;
            return true;
        }
        return false;
    }

    anabolizeNucleotide() {
        // 10 C + 3 N + 1 P + 5 ATP -> 1 Nucleotide
        if (this.carbon >= 10 && this.nitrogen >= 3 && this.phosphate >= 1 && this.atp >= 5 && this.nucleotides < this.maxNucleotides) {
            this.carbon -= 10;
            this.nitrogen -= 3;
            this.phosphate -= 1;
            this.atp -= 5;
            this.nucleotides += 1;
            return true;
        }
        return false;
    }

    draw(g) {
        CellRenderer.render(this, g);
        if (this.isDividing) {
             g.stroke({ width: 5, color: 0xFFFFFF });
        }
    }
}
