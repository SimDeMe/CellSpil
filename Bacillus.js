import { Cell } from './Cell.js';
import { GameConfig } from './GameConfig.js';

export class Bacillus extends Cell {
    constructor(x, y, isMega = false) {
        super(x, y, false);
        this.isBacillus = true;
        this.isMegabacillus = isMega; // [NEW] Flag

        if (this.isMegabacillus) {
            // MEGABACILLUS STATS
            const cfg = GameConfig.Megabacillus;
            this.radius = cfg.stats.radius;
            this.minRadius = cfg.stats.radius;
            this.maxRadius = cfg.stats.radius + 5;
            this.color = cfg.color;
            this.speed = GameConfig.Bacillus.speed * cfg.speedFactor;
            this.maxAtp = cfg.stats.maxAtp;
            this.atp = cfg.stats.maxAtp;
            this.aminoAcids = 0; // Start empty? Or some buffer?
            this.maxAminoAcids = cfg.stats.maxAmino;

            // Gener (Megacytose + Endocytose)
            this.genes = {
                flagellum: true, // Har flagel for bevægelse
                pili: false,
                megacytosis: true,
                toxin: false,
                protease: false,
                endocytosis: true
            };
            this.size = 2; // Size Tier 2
        } else {
            // STANDARD BACILLUS
            this.radius = 15;
            this.minRadius = 15;
            this.maxRadius = 20;
            this.color = '#FF9800'; // Orange
            this.speed = GameConfig.Bacillus.speed;
            this.maxAtp = GameConfig.Bacillus.maxAtp;
            this.atp = GameConfig.Bacillus.maxAtp;

            // Ingen gener
            this.genes = {
                flagellum: false,
                pili: false, // Ingen Pili (før cilia)
                megacytosis: false,
                toxin: false
            };
            this.size = 1;
        }
    }

    update(mouse, inputKeys, worldWidth, worldHeight, foodParticles, otherCells, player) {
        // [FIX] If this Bacillus is controlled by the player, use standard Cell update logic
        // The 'player' argument here receives 'viewHeight' (number) when called from main.js game loop for the active cell.
        if (this.isPlayer) {
            super.update(mouse, inputKeys, worldWidth, worldHeight, foodParticles, otherCells, player);
            return;
        }

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
                    this.alive = false;
                    this.shouldRemove = true; // [FIX] Remove from environment
                }
            } else {
                this.alive = false;
                this.shouldRemove = true; // [FIX] Remove if invalid state
            }
            return;
        }

        if (!this.alive) return;

        // Basal stofskifte (lavere end Cell)
        this.atp -= GameConfig.Bacillus.passiveDecay;

        if (this.atp <= 0) {
            this.alive = false;
        }

        let targetFound = false;
        let separationAngle = 0;
        let separationWeight = 0;

        // 1. SEPARATION: Undgå andre
        if (otherCells) {
            let neighborCount = 0;
            let pushX = 0;
            let pushY = 0;
            const separationDist = this.radius * 2 + 10; // Dynamisk ift radius

            for (const other of otherCells) {
                if (other === this || !other.alive) continue;

                // Megabacillus ignorerer små Bacillus i separation (den vil spise dem)
                // Men den skal undgå andre store (Megabacillus eller Player)
                if (this.isMegabacillus && other.isBacillus && !other.isMegabacillus) {
                    continue;
                }

                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const dst = Math.sqrt(dx * dx + dy * dy);

                if (dst < separationDist) {
                    // Skub væk! Jo tættere, jo stærkere
                    const force = (separationDist - dst) / separationDist;
                    pushX += (dx / dst) * force;
                    pushY += (dy / dst) * force;
                    neighborCount++;
                }
            }

            if (neighborCount > 0) {
                separationAngle = Math.atan2(pushY, pushX);
                separationWeight = 2.0; // Meget høj prioritet at undgå kollision
            }
        }

        // 2. FOOD SEEKING
        let nearest = null;
        let minDst = Infinity;

        // --- MEGABACILLUS AI ---
        if (this.isMegabacillus) {
            // Priority 1: Opportunity Targets (Nearby Live Prey) - Range 250
            const opportunityRange = 250;
            let opportunityFound = null;
            let opportunityDst = Infinity;

            // Check Player (Opportunity)
            if (player && player.alive && !player.isMegabacillus && !player.engulfed && player.size < this.size) {
                const d = Math.hypot(player.x - this.x, player.y - this.y);
                if (d < opportunityRange) {
                    opportunityFound = player;
                    opportunityDst = d;
                }
            }
            // Check Other Cells (Opportunity)
            if (!opportunityFound && otherCells) {
                for (const other of otherCells) {
                    if (other !== this && other.alive && other.isBacillus && !other.engulfed && !other.isMegabacillus) {
                        const d = Math.hypot(other.x - this.x, other.y - this.y);
                        if (d < opportunityRange && d < opportunityDst) {
                            opportunityFound = other;
                            opportunityDst = d;
                        }
                    }
                }
            }

            if (opportunityFound) {
                nearest = opportunityFound;
                minDst = opportunityDst;
            } else {
                // Priority 2: Corpses (Global Range)
                let bestCorpse = null;
                let closestCorpseDst = Infinity;

                // Check Player Corpse
                if (player && !player.alive && !player.engulfed) {
                    const d = Math.hypot(player.x - this.x, player.y - this.y);
                    closestCorpseDst = d;
                    bestCorpse = player;
                }
                // Check Other Corpses
                if (otherCells) {
                    for (const other of otherCells) {
                        if (other !== this && !other.alive && !other.engulfed) {
                            // Ensure edible size for corpse too? Or just scavenge all?
                            // Let's assume scavenging doesn't have strict size check in game logic yet, but safe to target.
                            const d = Math.hypot(other.x - this.x, other.y - this.y);
                            if (d < closestCorpseDst) {
                                closestCorpseDst = d;
                                bestCorpse = other;
                            }
                        }
                    }
                }

                if (bestCorpse) {
                    nearest = bestCorpse;
                    minDst = closestCorpseDst;
                } else {
                    // Priority 3: Distant Live Prey
                    if (player && player.alive && !player.isMegabacillus && !player.engulfed && player.size < this.size) {
                        const d = Math.hypot(player.x - this.x, player.y - this.y);
                        if (d < minDst) { minDst = d; nearest = player; }
                    }
                    if (otherCells) {
                        for (const other of otherCells) {
                            if (other !== this && other.alive && other.isBacillus && !other.engulfed && !other.isMegabacillus) {
                                const d = Math.hypot(other.x - this.x, other.y - this.y);
                                if (d < minDst) { minDst = d; nearest = other; }
                            }
                        }
                    }
                }
            }

        } else {
            // --- STANDARD BACILLUS AI (Food & Player only) ---
            if (foodParticles) {
                for (const food of foodParticles) {
                    const d = Math.hypot(food.x - this.x, food.y - this.y);
                    if (d < minDst && d < 300) { // Vision range
                        minDst = d;
                        nearest = food;
                    }
                }
            }
        }

        // Common Fallback
        if (this.isMegabacillus && !nearest && foodParticles) {
            for (const food of foodParticles) {
                const d = Math.hypot(food.x - this.x, food.y - this.y);
                if (d < minDst && d < 300) {
                    minDst = d;
                    nearest = food;
                }
            }
        }

        if (nearest) {
            targetFound = true;
            // Stop rotation if very close to avoid spin
            if (minDst > 5) {
                const targetAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);

                // Mix angles
                let wantsToGo = targetAngle;

                // Hvis vi er for tæt på andre, ignorer mad og flygt!
                // MEN: Hvis vi er Megabacillus og jager et bytte, så ignorér separation fra byttet
                // (Separation logic ovenfor ignorerer allerede byttet)
                if (separationWeight > 0) {
                    wantsToGo = separationAngle;
                }

                // Drej mod målet (Smooth)
                let diff = wantsToGo - this.moveAngle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                this.moveAngle += diff * 0.1; // Lidt hurtigere drejning
            }

            // [NEW] EATING LOGIC
            // Check collision with 'nearest' (which is our target)
            if (minDst < this.radius + (nearest.radius || 5)) { // 5 is fallback if nearest has no radius (e.g. some obj)
                // CONSUME!
                if (nearest.isBacillus || nearest.isPlayer) {
                    // Eat Cell (Attack)
                    // Simple damage for now, or eat corpse
                    // For Corpse:
                    if (!nearest.alive) {
                        // Eat corpse
                        this.aminoAcids += nearest.maxAminoAcids * 0.1;
                        nearest.shouldRemove = true; // Gone
                        console.log("Bacillus ate corpse");
                    } else {
                        // Attack logic? Maybe later. Bacillus usually just eats food.
                        // Megabacillus attacks.
                        if (this.isMegabacillus) {
                            // Damage logic
                            // This requires accessing 'damage' method or reducing ATP directly
                            nearest.atp -= 10;
                            this.atp -= 1; // minor cost to attack
                        }
                    }
                } else {
                    // Eat Food Particle
                    // Remove from array (Environment.js handles this by 'life' or splicing? 
                    // Usually we splice the global array. 
                    // But here we rely on 'foodParticles' passed as arg. 
                    // We need to set 'shouldRemove' or splice it.
                    // Looking at Cell.js logic: it usually calls a helper or splices.
                    // Let's set a flag or life=0 if supported, or splice directly.

                    // Direct Splice (Risky if iterating? No, we are in update, logic loop usually safe if safe iteration used)
                    // But we are not iterating 'foodParticles' right here, 'nearest' is a reference.

                    // Find index
                    const idx = foodParticles.indexOf(nearest);
                    if (idx > -1) {
                        foodParticles.splice(idx, 1);

                        // Gain Resources
                        // Values from GameConfig
                        if (nearest.type === 'glucose') this.atp += GameConfig.Resources.glucoseEnergy;
                        if (nearest.type === 'amino') this.aminoAcids += GameConfig.Resources.aminoValue;
                        if (nearest.type === 'nucleotide') this.nucleotides = (this.nucleotides || 0) + 1;

                        this.atp = Math.min(this.atp, this.maxAtp);
                        this.aminoAcids = Math.min(this.aminoAcids, this.maxAminoAcids);

                        // Grow slightly?
                        this.pulse = 1; // Visual feedback
                    }
                }
            }
        }

        // Hvis vi bare drifter, men er tæt på andre -> Separer!
        if (!targetFound && separationWeight > 0) {
            let diff = separationAngle - this.moveAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.moveAngle += diff * 0.1;
        }

        if (!targetFound && separationWeight === 0) {
            // Bevægelse: Simpel, langsom drift
            this.moveAngle += (Math.random() - 0.5) * 0.2;
        }

        this.x += Math.cos(this.moveAngle) * this.speed;
        this.y += Math.sin(this.moveAngle) * this.speed;
        this.atp -= 0.005;

        // Animation
        this.pulse += 0.05;

        // Grænser
        if (this.x < 0 || this.x > worldWidth) {
            this.moveAngle = Math.PI - this.moveAngle;
            this.x = Math.max(0, Math.min(this.x, worldWidth));
        }
        if (this.y < 0 || this.y > worldHeight) {
            this.moveAngle = -this.moveAngle;
            this.y = Math.max(0, Math.min(this.y, worldHeight));
        }

        // Død
        if (this.atp <= 0) {
            this.kill();
        }

        // Reprodution (Megabacillus)
        if (this.isMegabacillus && this.aminoAcids >= this.maxAminoAcids) {
            // Check count cap (Prevent infinite growth)
            const megaCount = otherCells.filter(c => c.isMegabacillus && c.alive).length;
            if (megaCount < 10) { // Hard cap på 10 mega
                // Spawn Sister
                const bx = this.x + 40;
                const by = this.y + 40;
                const child = new Bacillus(bx, by, true); // True = Mega
                otherCells.push(child);
                this.aminoAcids = 0;
                console.log("Megabacillus divided!");
            }
        }
    }

    draw(g) {
        // Stavformet (Capsule shape)
        const r = this.radius;
        const len = this.isMegabacillus ? 80 : 40; // Mega len

        g.clear();

        // PixiJS handles position (x, y) and rotation in the parent container logic (Environment.js)
        // So we draw at 0,0 relative to the cell center.

        // HOWEVER, Environment.js sets `item.graphic.rotation = item.angle || item.moveAngle`.
        // So the graphic is already rotated? 
        // Let's check Environment.js:892 -> item.graphic.rotation = item.angle || item.moveAngle || 0;
        // Yes. So we draw 'up right' or 'horizontal' assuming 0 rotation matches logic.
        // Usually 0 rotation = facing East (Right).
        // Our capsule should be horizontal centered at 0,0.

        // [NEW] Damage Blink Logic
        let drawColor = this.color;
        if (this.isTakingDamage) {
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                drawColor = '#FF0000'; // Red Flash
            } else {
                drawColor = '#FFFFFF'; // White Flash
            }
        }

        // Body Color
        const bodyColor = this.alive ? (this.isMegabacillus ? '#FFAB91' : '#FFCC80') : '#555';

        // Use PixiJS RoundRect for capsule
        // x, y, w, h, radius
        g.roundRect(-len / 2, -r, len, r * 2, r);
        g.fill({ color: bodyColor });
        g.stroke({ width: 2, color: drawColor });

        // Inner detail?
        // g.circle(0, 0, r * 0.5);
        // g.fill({ color: '#FFF', alpha: 0.3 });
    }
}
