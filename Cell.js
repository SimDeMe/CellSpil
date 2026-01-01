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
        this.aminoCostPili = GameConfig.Player.mutationCosts.pili;
        this.aminoCostHighSpeed = GameConfig.Player.mutationCosts.highSpeedRetraction;
        this.aminoCostMultiplex = GameConfig.Player.mutationCosts.multiplexPili;
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
            pili: false, // Replaces cilia
            highSpeedRetraction: false,
            multiplexPili: false,
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

        // --- PILI (Twitch Motility) STATE ---
        this.piliState = 'idle'; // 'idle', 'extending', 'retracting'
        this.piliLength = 0;
        this.piliTargetAngle = 0;
        this.piliMaxLength = 60; // Base length
    }

    // Ny metode til at genberegne krav baseret på gener
    updateMaxGrowth() {
        let cost = this.baseMaxAmino;
        if (this.genes.pili) cost += this.aminoCostPili;
        if (this.genes.highSpeedRetraction) cost += this.aminoCostHighSpeed;
        if (this.genes.multiplexPili) cost += this.aminoCostMultiplex;
        // if (this.genes.cilia) { /* Legacy check cleanup? No, just replace */ }
        if (this.genes.flagellum) cost += this.aminoCostFlagellum;
        if (this.genes.megacytosis) cost += this.aminoCostMegacytosis;
        if (this.genes.toxin) cost += this.aminoCostToxin;
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
        // ... (Engulfed logic remains the same) ...
        if (this.engulfed) { /* ... */ return; }
        if (!this.alive) return;

        const width = worldWidth;
        const height = worldHeight;

        // ... (Age, Pulse, Upkeep remain the same) ...

        this.age++;
        this.pulse += 0.1;

        // --- BEVÆGELSE ---
        let moveSpeed = 0.4; // Base drift

        // Upkeep (Passive)
        if (this.genes.megacytosis) this.atp -= GameConfig.Player.upkeep.megacytosis;
        if (this.genes.flagellum) this.atp -= GameConfig.Player.upkeep.flagellum;
        if (this.genes.highTorque) this.atp -= GameConfig.Player.upkeep.highTorque;
        if (this.genes.pili) this.atp -= GameConfig.Player.upkeep.pili;
        if (this.genes.highSpeedRetraction) this.atp -= GameConfig.Player.upkeep.highSpeedRetraction;
        if (this.genes.multiplexPili) this.atp -= GameConfig.Player.upkeep.multiplexPili;

        // Modifiers
        if (this.genes.megacytosis) moveSpeed *= 0.5;

        // --- FLAGELLUM MOVEMENT (Continuous) ---
        if (this.genes.flagellum) {
            moveSpeed += 2.0;
            if (this.genes.highTorque) moveSpeed += 2.0;
        }

        // --- PILI MOVEMENT (Twitch Motility) ---
        // Pili overrules normal movement when active? Or adds to it?
        // Let's say Pili provides BURST movement.

        let piliMoveSpeed = 0;

        if (this.genes.pili && this.alive && this.isPlayer) {
            // 1. Calculate Target (Mouse)
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Params based on upgrades
            const extendSpeed = 5; // How fast it shoots out
            let retractSpeed = 2; // Base pull speed
            let maxLen = 60;

            if (this.genes.highSpeedRetraction) {
                retractSpeed = 6; // Much faster pull
                maxLen = 80;
            }
            if (this.genes.multiplexPili) {
                retractSpeed = 8; // Even faster
                maxLen = 100;
            }
            this.piliMaxLength = maxLen;

            // State Machine
            if (this.piliState === 'idle') {
                if (dist > this.radius + 10) {
                    // Start extending towards mouse
                    this.piliState = 'extending';
                    this.piliTargetAngle = Math.atan2(dy, dx);
                    this.piliLength = 0;
                    // Lock angle for this twitch
                    this.angle = this.piliTargetAngle;
                }
            }
            else if (this.piliState === 'extending') {
                this.piliLength += extendSpeed;
                // Stop moving while extending (anchor)
                moveSpeed *= 0.1;

                if (this.piliLength >= this.piliMaxLength || this.piliLength >= dist) {
                    this.piliState = 'retracting';
                }
            }
            else if (this.piliState === 'retracting') {
                this.piliLength -= retractSpeed;
                // PULL THE CELL!
                // The cell moves towards the tip of the pili
                piliMoveSpeed = retractSpeed * 1.5; // Cell moves faster than retraction to catch up? No, 1:1 usually.
                // Let's make it add significant speed.

                if (this.piliLength <= 0) {
                    this.piliLength = 0;
                    this.piliState = 'idle';
                }
            }
        }

        // Apply Movement
        if (this.isPlayer && inputKeys) {
            // ... (Cheats and Abilities logic) ...
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

            // Player Movement Calculation
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > this.radius && !this.genes.pili) {
                // NORMAL MOVEMENT (Flagellum or Drift)
                this.angle = Math.atan2(dy, dx);
                let speedFactor = (distance - this.radius) / (viewHeight * 0.5 - this.radius);
                if (speedFactor > 1) speedFactor = 1;

                const totalSpeed = moveSpeed * speedFactor;
                this.x += (dx / distance) * totalSpeed;
                this.y += (dy / distance) * totalSpeed;

                // ATP Cost
                let cost = GameConfig.Player.moveCost;
                if (this.genes.flagellum) cost = GameConfig.Player.moveCostOverride.flagellum;
                this.atp -= cost * speedFactor;

            }
            else if (this.genes.pili) {
                // PILI MOVEMENT APPLY
                // Use saved angle, not current mouse angle (it locks on fire)
                if (this.piliState === 'retracting') {
                    const moveX = Math.cos(this.piliTargetAngle) * piliMoveSpeed;
                    const moveY = Math.sin(this.piliTargetAngle) * piliMoveSpeed;
                    this.x += moveX;
                    this.y += moveY;

                    // ATP Cost for Pili Pull
                    let cost = GameConfig.Player.moveCostOverride.pili;
                    if (this.genes.highSpeedRetraction) cost = GameConfig.Player.moveCostOverride.highSpeedRetraction;
                    if (this.genes.multiplexPili) cost = GameConfig.Player.moveCostOverride.multiplexPili;
                    this.atp -= cost;
                }
            }
        }
        else {
            // NPC Movement (Random)
            // ...
            this.moveAngle += (Math.random() - 0.5) * 0.1;
            const npcSpeed = moveSpeed * 0.5;
            this.x += Math.cos(this.moveAngle) * npcSpeed;
            this.y += Math.sin(this.moveAngle) * npcSpeed;
            this.atp -= 0.01;
        }

        // ... (Brownian, Boundary, Death) ...
        this.x += (Math.random() - 0.5) * 0.5;
        this.y += (Math.random() - 0.5) * 0.5;
        // ... (Boundary checks) ...
        if (this.x - this.radius < 0) this.x = this.radius; // etc
        // ...
        if (this.atp <= 0) this.kill();

        // 5. Grænsekontrol (Simplified for replace)
        if (this.x - this.radius < 0) this.x = this.radius;
        else if (this.x + this.radius > width) this.x = width - this.radius;
        if (this.y - this.radius < 0) this.y = this.radius;
        else if (this.y + this.radius > height) this.y = height - this.radius;
    }

    kill() {
        this.atp = 0;
        this.alive = false;
        this.color = '#444';
    }

    draw(ctx) {
        const r = this.radius + Math.sin(this.pulse) * 2;

        // Flagellum Draw
        if (this.genes.flagellum && this.alive) {
            // ... (Flagellum draw code) ...
            const tailLength = r * 1.5;
            const direction = this.isPlayer ? (this.angle || 0) : this.moveAngle;
            const angle = direction + Math.PI;
            ctx.beginPath();
            ctx.moveTo(this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r);
            for (let i = 0; i < tailLength; i += 2) {
                const wave = Math.sin(this.pulse * 2 + i * 0.2) * 5;
                ctx.lineTo(this.x + Math.cos(angle) * (r + i) + Math.cos(angle + Math.PI / 2) * wave,
                    this.y + Math.sin(angle) * (r + i) + Math.sin(angle + Math.PI / 2) * wave);
            }
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // PILI DRAW (Twitch Motility)
        if (this.genes.pili && this.alive) {
            if (this.piliState === 'extending' || this.piliState === 'retracting') {
                // Draw the grappling hook line
                const startX = this.x + Math.cos(this.piliTargetAngle) * r;
                const startY = this.y + Math.sin(this.piliTargetAngle) * r;
                const endX = this.x + Math.cos(this.piliTargetAngle) * (r + this.piliLength);
                const endY = this.y + Math.sin(this.piliTargetAngle) * (r + this.piliLength);

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = '#E0F7FA'; // Bright Cyan-ish
                ctx.lineWidth = this.genes.multiplexPili ? 3 : 1; // Thicker if multiplex
                ctx.stroke();

                // Draw tip/hook?
                ctx.beginPath();
                ctx.arc(endX, endY, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#E0F7FA';
                ctx.fill();
            }
        }

        // Body
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        // ... (Shadow/Glow logic) ...
        if (this.alive && this.aminoAcids >= this.maxAminoAcids && this.nucleotides >= this.maxNucleotides) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00BCD4';
            ctx.fillStyle = this.isPlayer ? '#69F0AE' : '#DDD';
        } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = this.color;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Border
        if (this.alive) ctx.strokeStyle = this.isPlayer ? '#81C784' : '#666';
        else ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
    }
}
