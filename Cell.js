import { GameConfig } from './GameConfig.js';

export class Cell {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;

        // Størrelse
        this.size = 1; // [NEW] 1 = Normal, 2 = Stor
        this.radius = 20;
        this.minRadius = 20;
        this.maxRadius = 28;
        this.pulse = Math.random() * 10;

        // --- INDSTILLINGER ---
        this.speed = GameConfig.Player.baseSpeed;

        // Vækst Modifiers (Nemt at redigere)
        this.baseMaxAmino = GameConfig.Player.baseMaxAmino;
        this.aminoCostCilia = GameConfig.Player.mutationCosts.cilia;
        this.aminoCostFlagellum = GameConfig.Player.mutationCosts.flagellum;
        this.aminoCostMegacytosis = GameConfig.Player.mutationCosts.megacytosis;
        this.aminoCostToxin = GameConfig.Player.mutationCosts.toxin;
        this.aminoCostProtease = GameConfig.Player.mutationCosts.protease;
        this.aminoCostHighTorque = GameConfig.Player.mutationCosts.highTorque;
        this.aminoCostEndocytosis = GameConfig.Player.mutationCosts.endocytosis;

        this.maxAminoAcids = this.baseMaxAmino; // Bliver opdateret af updateMaxGrowth()

        // Ressourcer
        this.atp = GameConfig.Player.maxAtp;
        this.maxAtp = GameConfig.Player.maxAtp;
        this.aminoAcids = 0;
        this.nucleotides = 0; // [NEW]
        this.baseMaxNucleotides = GameConfig.Player.baseMaxNucleotides;
        this.maxNucleotides = this.baseMaxNucleotides;

        this.alive = true;
        this.age = 0; // [NEW] Frames alive
        this.color = isPlayer ? '#4CAF50' : '#888888';

        // Gener
        this.genes = {
            flagellum: false,
            cilia: false,
            megacytosis: false,
            toxin: false,
            protease: false,
            highTorque: false,
            endocytosis: false
        };

        // Opdater hvis vi starter med gener (fx gemt spil)
        this.updateMaxGrowth();

        // NPC Bevægelse
        this.moveAngle = Math.random() * Math.PI * 2;
        this.angle = 0;

        this.onAction = null; // Callback for abilities

        // Endocytose Animation State
        this.engulfed = false;
        this.engulfedBy = null;
        this.shouldRemove = false;

        this.size = 1; // Default size tier
    }

    // Ny metode til at genberegne krav baseret på gener
    updateMaxGrowth() {
        let cost = this.baseMaxAmino;
        if (this.genes.cilia) cost += this.aminoCostCilia;
        if (this.genes.flagellum) cost += this.aminoCostFlagellum;
        if (this.genes.megacytosis) cost += this.aminoCostMegacytosis;
        if (this.genes.toxin) cost += this.aminoCostToxin;
        if (this.genes.protease) cost += this.aminoCostProtease;
        if (this.genes.highTorque) cost += this.aminoCostHighTorque;
        if (this.genes.protease) cost += this.aminoCostProtease;
        if (this.genes.highTorque) cost += this.aminoCostHighTorque;
        this.maxAminoAcids = cost;

        // Nucleotides scales roughly with complex genes too? 
        // For now, keep it simple: Base + 1 per complex gene?
        // Or fixed base. Let's start fixed.
        this.maxNucleotides = this.baseMaxNucleotides;
        if (this.genes.megacytosis) this.maxNucleotides += 2; // Bigger cell needs more DNA stuff

        // Megacytose effekt på størrelse (Instant update ved init)
        if (this.genes.megacytosis) {
            this.size = 2; // [NEW] Size class 2
            this.minRadius = 40; // 2x normal (20)
            this.maxRadius = 56; // 2x normal (28)
            this.radius = this.minRadius;
        } else {
            this.size = 1; // [NEW] Size class 1
            this.minRadius = 20;
            this.maxRadius = 28;
        }
    }

    update(mouse, inputKeys, worldWidth, worldHeight, foodParticles, otherCells, viewHeight = 600) {
        // Hvis engulfed, kør animation i stedet for normal update
        if (this.engulfed) {
            if (this.engulfedBy) {
                // Flyt mod maven på rovdyret
                const dx = this.engulfedBy.x - this.x;
                const dy = this.engulfedBy.y - this.y;
                this.x += dx * 0.1;
                this.y += dy * 0.1;

                // Skrump
                this.radius *= 0.9;

                // Fjern når den er lille nok
                if (this.radius < 2) {
                    this.shouldRemove = true;
                }
            } else {
                this.shouldRemove = true; // Fallback hvis predator er væk
            }
            return;
        }

        if (!this.alive && this.radius > 5) {
            // Optional: Decomposing visual logic here if needed, but keeping it simple for now
        }
        if (!this.alive) return;

        const width = worldWidth;
        const height = worldHeight;

        this.age++; // Increment age
        this.pulse += 0.1; // Animation pulse for flagellum

        // 3. Bevægelse
        // Base hastighed (alle kan bevæge sig lidt)
        let moveSpeed = 0.4; // Tunet til ca. 30-40 sekunder for krydsning

        // Gen-specifikke omkostninger (Passive)
        if (this.genes.megacytosis) this.atp -= GameConfig.Player.upkeep.megacytosis;
        if (this.genes.flagellum) this.atp -= GameConfig.Player.upkeep.flagellum;
        if (this.genes.highTorque) this.atp -= GameConfig.Player.upkeep.highTorque; // Ekstra dyr i drift
        if (this.genes.cilia) this.atp -= GameConfig.Player.upkeep.cilia;

        // Megacytose: Halv fart
        if (this.genes.megacytosis) moveSpeed *= 0.5;

        // Modifiers fra gener
        if (this.genes.flagellum) {
            moveSpeed += 2.0; // Stor bonus
            if (this.genes.highTorque) {
                moveSpeed += 2.0; // Yderligere kæmpe bonus (Total +4.0)
            }
        } else if (this.genes.cilia) {
            moveSpeed += 1.0; // Lille bonus
        }

        if (this.isPlayer && inputKeys) {
            // ... CHEAT ...
            if (inputKeys.s && inputKeys.m) {
                this.atp = this.maxAtp;
                this.aminoAcids = this.maxAminoAcids;
                console.log("CHEAT: Full Resources");
            }

            // ... TOXIN ...
            if (inputKeys.e && this.genes.toxin) {
                if (this.atp >= 15 && this.aminoAcids >= 1) {
                    if (this.onAction) {
                        this.onAction('toxin', this.x, this.y);
                        this.atp -= 15;
                        this.aminoAcids -= 1;
                        // Cooldown handled by key release ideally
                        inputKeys.e = false;
                    }
                }
            }

            // ... PROTEASE ...
            if (inputKeys.r && this.genes.protease) {
                if (this.atp >= 10 && this.aminoAcids >= 1) {
                    if (this.onAction) {
                        this.onAction('protease', this.x, this.y);
                        this.atp -= 10;
                        this.aminoAcids -= 1;
                        inputKeys.r = false;
                    }
                }
            }


            // SPILLER - Styrer mod musen
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Refined Control Logic
            const stopThreshold = this.radius; // Stop helt hvis musen er inden for cellen
            const maxSpeedDist = viewHeight * 0.5; // Topfart ved halv skærmhøjde

            if (distance > stopThreshold) {
                // Opdater kun vinkel hvis vi bevæger os
                this.angle = Math.atan2(dy, dx);

                // Beregn hastighedsfaktor (0.0 til 1.0)
                // Linear ramp fra stopThreshold op til maxSpeedDist
                let speedFactor = (distance - stopThreshold) / (maxSpeedDist - stopThreshold);
                // Clamp til max 1.0
                if (speedFactor > 1.0) speedFactor = 1.0;

                // Anvend faktor
                const currentSpeed = moveSpeed * speedFactor;

                this.x += (dx / distance) * currentSpeed;
                this.y += (dy / distance) * currentSpeed;

                // ATP omkostning (skaleret med fart?)
                // Lad os sige det koster mindre at bevæge sig langsomt
                let moveCost = GameConfig.Player.moveCost;
                if (this.genes.flagellum) {
                    moveCost = GameConfig.Player.moveCostOverride.flagellum;
                    if (this.genes.highTorque) moveCost = GameConfig.Player.moveCostOverride.highTorque; // Meget dyrt
                }
                else if (this.genes.cilia) moveCost = GameConfig.Player.moveCostOverride.cilia;

                // Hvis vi bevæger os langsomt (speedFactor < 1), er det billigere?
                // Ja, lad os belønne præcision
                // ATP cost skaleret med hvor meget vi rent faktisk bevæger os
                this.atp -= moveCost * speedFactor;
            } else {
                // Står stille - ingen rotation, ingen bevægelsesomkostning
                // (Men stadig basal stofskifte som sker øverst)
            }
        } else {
            // NPC - Bevæger sig tilfældigt
            this.moveAngle += (Math.random() - 0.5) * 0.1;
            const npcSpeed = moveSpeed * 0.5; // NPC'er er lidt langsommere
            this.x += Math.cos(this.moveAngle) * npcSpeed;
            this.y += Math.sin(this.moveAngle) * npcSpeed;

            let npcCost = 0.01;
            if (this.genes.megacytosis) npcCost *= 2;
            this.atp -= npcCost;
        }

        // 4. Brownske bevægelser (Simpel jitter)
        this.x += (Math.random() - 0.5) * 0.5;
        this.y += (Math.random() - 0.5) * 0.5;

        // 5. Grænsekontrol
        // Venstre
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            if (!this.isPlayer) this.moveAngle = Math.PI - this.moveAngle;
        }
        // Højre
        else if (this.x + this.radius > width) {
            this.x = width - this.radius;
            if (!this.isPlayer) this.moveAngle = Math.PI - this.moveAngle;
        }

        // Top
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            if (!this.isPlayer) this.moveAngle = -this.moveAngle;
        }
        // Bund
        else if (this.y + this.radius > height) {
            this.y = height - this.radius;
            if (!this.isPlayer) this.moveAngle = -this.moveAngle;
        }

        // 6. Død - Starvation
        if (this.atp <= 0) {
            this.kill();
        }
    }

    kill() {
        this.atp = 0;
        this.alive = false;
        this.color = '#444';
    }

    draw(ctx) {
        const r = this.radius + Math.sin(this.pulse) * 2;

        // Tegn Flagel (Hale) hvis den findes
        if (this.genes.flagellum && this.alive) {
            const tailLength = r * 1.5;
            const direction = this.isPlayer ? (this.angle || 0) : this.moveAngle;
            const angle = direction + Math.PI;

            ctx.beginPath();
            ctx.moveTo(this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r);

            for (let i = 0; i < tailLength; i += 2) {
                const wave = Math.sin(this.pulse * 2 + i * 0.2) * 5;
                ctx.lineTo(
                    this.x + Math.cos(angle) * (r + i) + Math.cos(angle + Math.PI / 2) * wave,
                    this.y + Math.sin(angle) * (r + i) + Math.sin(angle + Math.PI / 2) * wave
                );
            }
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Tegn Cilier (Hår) hvis den findes
        if (this.genes.cilia && this.alive) {
            const numCilia = 12;
            for (let i = 0; i < numCilia; i++) {
                const angle = (Math.PI * 2 / numCilia) * i + this.pulse * 0.5;
                const cX = this.x + Math.cos(angle) * r;
                const cY = this.y + Math.sin(angle) * r;
                const cEndX = this.x + Math.cos(angle) * (r + 5);
                const cEndY = this.y + Math.sin(angle) * (r + 5);

                ctx.beginPath();
                ctx.moveTo(cX, cY);
                ctx.lineTo(cEndX, cEndY);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);

        if (this.alive && this.aminoAcids >= this.maxAminoAcids && this.nucleotides >= this.maxNucleotides) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00BCD4'; // Cyan glow for ready to divide
            ctx.fillStyle = this.isPlayer ? '#69F0AE' : '#DDD';
        } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = this.color;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        if (this.alive) {
            ctx.strokeStyle = this.isPlayer ? '#81C784' : '#666';
        } else {
            ctx.strokeStyle = '#000';
        }

        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
    }
}
