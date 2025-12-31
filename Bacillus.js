import { Cell } from './Cell.js';

export class Bacillus extends Cell {
    constructor(x, y) {
        super(x, y, false);
        this.isBacillus = true;

        // Bacillus egenskaber
        this.radius = 15;
        this.minRadius = 15;
        this.maxRadius = 20;
        this.color = '#FF9800'; // Orange

        // Langsomme men effektive svømmere
        this.speed = 0.5;

        // Ingen gener
        this.genes = {
            flagellum: false,
            cilia: false,
            megacytosis: false,
            toxin: false
        };

        // Lavt basal stofskifte
        this.maxAtp = 150;
        this.atp = 150;
    }

    update(mouse, inputKeys, worldWidth, worldHeight, foodParticles, otherCells) {
        if (!this.alive) return;

        // Basal stofskifte (lavere end Cell)
        this.atp -= 0.01;

        let targetFound = false;
        let separationAngle = 0;
        let separationWeight = 0;

        // 1. SEPARATION: Undgå andre
        if (otherCells) {
            let neighborCount = 0;
            let pushX = 0;
            let pushY = 0;
            const separationDist = 40; // Hvor tæt må de være?

            for (const other of otherCells) {
                if (other === this || !other.alive) continue;

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
        if (foodParticles) {
            let nearest = null;
            let minDst = 300;

            for (const food of foodParticles) {
                const dx = food.x - this.x;
                const dy = food.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDst) {
                    minDst = dist;
                    nearest = food;
                }
            }

            if (nearest) {
                targetFound = true;
                const targetAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);

                // Mix angles
                let wantsToGo = targetAngle;

                // Hvis vi er for tæt på andre, ignorer mad og flygt!
                if (separationWeight > 0) {
                    // Mix: Mest separation, lidt mad
                    // En enkel måde er at lægge separation oveni
                    // Eller bare bruge weighted average logic

                    // Lad os sige: Hvis vi skubbes væk, så styrer vi væk.
                    // Vi 'blender' separation angle ind i target angle

                    // Simpel løsning: Drej mod separation
                    wantsToGo = separationAngle;
                }

                // Drej mod målet (Smooth)
                let diff = wantsToGo - this.moveAngle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                this.moveAngle += diff * 0.1; // Lidt hurtigere drejning
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
    }

    draw(ctx) {
        // Stavformet (Capsule shape)
        const r = this.radius;
        const len = 40; // Længde på staven

        ctx.translate(this.x, this.y);
        ctx.rotate(this.moveAngle);

        ctx.beginPath();
        // Tegn en "capsule" form: En rektangel med cirkler i enderne
        // Eller bare en tyk linje med round caps
        ctx.lineCap = "round";
        ctx.lineWidth = r * 2;
        ctx.strokeStyle = this.color;

        // Tegn krop
        ctx.moveTo(-len / 2, 0);
        ctx.lineTo(len / 2, 0);
        ctx.stroke();

        // Indre glød/farve
        ctx.lineWidth = r * 1.5;
        ctx.strokeStyle = this.alive ? '#FFCC80' : '#555';
        ctx.stroke();

        ctx.rotate(-this.moveAngle);
        ctx.translate(-this.x, -this.y);
    }
}
