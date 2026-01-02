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
        this.piliMaxLength = 30; // [TUNED]: Halved from 60 for better control

        // --- DIVISION ANIMATION STATE ---
        this.isDividing = false;
        this.divisionTimer = 0;
        this.divisionDuration = 60; // 60 frames = approx 1 second
    }

    startDivision() {
        this.isDividing = true;
        this.divisionTimer = 0;
    }

    finalizeDivision() {
        this.isDividing = false;
        this.divisionTimer = 0;
        return true; // Signal to main.js to perform actual spawn
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
        const width = worldWidth;
        const height = worldHeight;

        // --- DIVISION ANIMATION TICK ---
        // Block all updates if dividing
        if (this.isDividing) {
            this.divisionTimer++;
            // We don't stop strictly at duration, we let main.js detect completion to trigger spawn
            return;
        }

        this.age++;
        this.isTakingDamage = false; // [NEW] Reset damage flag for this frame

        // --- ENDOCYTOSIS ANIMATION ---
        if (this.engulfed) {
            // ... existing engulfment logic ...
            this.radius *= 0.95;
            if (this.radius < 2) this.shouldRemove = true;
            if (this.engulfedBy) {
                this.x += (this.engulfedBy.x - this.x) * 0.1;
                this.y += (this.engulfedBy.y - this.y) * 0.1;
            }
            return; // Stop other updates
        }

        // --- UPKEEP & RESOURCES ---
        // (Cost logic from before...)

        if (this.genes.pili) this.atp -= GameConfig.Player.upkeep.pili;
        if (this.genes.highSpeedRetraction) this.atp -= GameConfig.Player.upkeep.highSpeedRetraction;
        if (this.genes.multiplexPili) this.atp -= GameConfig.Player.upkeep.multiplexPili;

        let moveSpeed = 0.4; // Base drift

        // Modifiers
        if (this.genes.megacytosis) moveSpeed *= 0.5;

        // --- FLAGELLUM MOVEMENT (Continuous) ---
        if (this.genes.flagellum) {
            moveSpeed += 2.0;
            if (this.genes.highTorque) moveSpeed += 2.0;
        }

        // --- PILI MOVEMENT (Twitch Motility) ---
        let piliMoveSpeed = 0;

        if (this.genes.pili && this.alive && this.isPlayer) {
            // 1. Calculate Target (Mouse)
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Params based on upgrades
            const extendSpeed = 5; // How fast it shoots out
            let retractSpeed = 2; // Base pull speed

            // [TUNED] Shorter lengths for better control
            let maxLen = 30; // Reduced from 60

            if (this.genes.highSpeedRetraction) {
                retractSpeed = 6; // Much faster pull
                maxLen = 45; // Reduced from 80
            }
            if (this.genes.multiplexPili) {
                retractSpeed = 8; // Even faster
                maxLen = 60; // Reduced from 100
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
            if (inputKeys.s && inputKeys.c) { // S + C = Cheat
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

            // 1. Check for Key Input (Priority over Mouse)
            let moveX = 0;
            let moveY = 0;
            if (inputKeys && (inputKeys.up || inputKeys.down || inputKeys.left || inputKeys.right)) {
                if (inputKeys.up) moveY -= 1;
                if (inputKeys.down) moveY += 1;
                if (inputKeys.left) moveX -= 1;
                if (inputKeys.right) moveX += 1;
            }

            if ((moveX !== 0 || moveY !== 0) && !this.genes.pili) {
                // KEYBOARD MOVEMENT
                this.angle = Math.atan2(moveY, moveX);

                // Normalize vector
                const len = Math.sqrt(moveX * moveX + moveY * moveY);
                // Apply full speed immediately for responsive feel
                const totalSpeed = moveSpeed;

                this.x += (moveX / len) * totalSpeed;
                this.y += (moveY / len) * totalSpeed;

                // ATP Cost
                let cost = GameConfig.Player.moveCost;
                if (this.genes.flagellum) cost = GameConfig.Player.moveCostOverride.flagellum;
                this.atp -= cost;

            } else if (distance > this.radius && !this.genes.pili) {
                // MOUSE FOLLOWER (Fallback if no keys pressed)
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
        // --- DIVISION ANIMATION ---
        if (this.isDividing) {
            // Calculate deformation
            // 0 -> 0.3: Elongate (Stretch)
            // 0.3 -> 1.0: Constrict (Pinch)
            const progress = this.divisionTimer / this.divisionDuration;
            const r = this.radius;

            // Separation distance (0 to r*1.2)
            const separation = progress * r * 1.5;

            // Constriction radius (r to 0) - starts after 30%
            let constriction = r;
            if (progress > 0.3) {
                const constrictProgress = (progress - 0.3) / 0.7;
                constriction = r * (1 - constrictProgress * 0.8); // Don't go to 0 completely, just thin
            }

            // Draw as two overlapping circles that move apart
            // To make it look "gooey", we draw a rect or lines connecting them if we want, 
            // but just two circles moving apart with a "skin" is easier to start.

            // For simplicity in this style: Draw two circles.
            // Center is (this.x, this.y). We move them along X axis (for now, or random angle?)
            // Let's use current Angle or just Horizontal. Horizontal is 0.
            const angle = this.angle;

            const x1 = this.x + Math.cos(angle) * -separation;
            const y1 = this.y + Math.sin(angle) * -separation;

            const x2 = this.x + Math.cos(angle) * separation;
            const y2 = this.y + Math.sin(angle) * separation;

            ctx.fillStyle = this.color;
            ctx.strokeStyle = this.isPlayer ? '#81C784' : '#666';
            ctx.lineWidth = 3;

            // Circle 1
            ctx.beginPath();
            ctx.arc(x1, y1, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Circle 2
            ctx.beginPath();
            ctx.arc(x2, y2, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Connector (The Pinch) - Only if not fully separated
            if (progress < 0.9) {
                ctx.beginPath();
                const perpAngle = angle + Math.PI / 2;
                // Draw a bridge...
                // This is complex to get perfect without metabolab library, 
                // but just overlapping circles often looks good enough for "cell division".
                // We rely on the two circles overlapping.
            }
            return; // Skip normal draw
        }


        const r = this.radius + Math.sin(this.pulse) * 2;

        // Flagellum Draw
        if (this.genes.flagellum && this.alive) {
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
                ctx.strokeStyle = '#E0F7FA'; // Bright Cyan-ish
                ctx.lineWidth = 1;
                ctx.fillStyle = '#E0F7FA';

                // Helper to draw one strand
                const drawStrand = (offsetAngle) => {
                    const angle = this.piliTargetAngle + offsetAngle;
                    const startX = this.x + Math.cos(angle) * r;
                    const startY = this.y + Math.sin(angle) * r;
                    const endX = this.x + Math.cos(angle) * (r + this.piliLength);
                    const endY = this.y + Math.sin(angle) * (r + this.piliLength);

                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();

                    // Tip
                    ctx.beginPath();
                    ctx.arc(endX, endY, 2, 0, Math.PI * 2);
                    ctx.fill();
                };

                if (this.genes.multiplexPili) {
                    // Two strands, angled +/- 15 degrees (0.26 rad)
                    drawStrand(-0.25);
                    drawStrand(0.25);
                } else {
                    // Single strand
                    drawStrand(0);
                }
            }
        }

        // Body
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        // Shadow/Glow logic
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
