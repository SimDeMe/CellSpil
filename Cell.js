export class Cell {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;

        // Størrelse
        this.radius = 20;
        this.minRadius = 20;
        this.maxRadius = 28;
        this.pulse = Math.random() * 10;

        // --- INDSTILLINGER ---
        this.speed = 1.5;
        this.maxAminoAcids = 3;

        // Ressourcer
        this.atp = 100;
        this.maxAtp = 100;
        this.aminoAcids = 0;
        this.alive = true;
        this.color = isPlayer ? '#4CAF50' : '#888888';

        // Gener
        this.genes = {
            flagellum: false,
            cilia: false
        };

        // NPC Bevægelse
        this.moveAngle = Math.random() * Math.PI * 2;
        this.angle = 0;
    }

    update(mouse, inputKeys) {
        if (!this.alive) return;

        // Vi henter skærmstørrelsen direkte fra browseren
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 1. Basal Stofskifte
        this.atp -= 0.01;

        // 2. Animation
        this.pulse += 0.05;
        const growthPercent = this.aminoAcids / this.maxAminoAcids;
        this.radius = this.minRadius + (this.maxRadius - this.minRadius) * growthPercent;

        // 3. Bevægelse
        // Base hastighed (alle kan bevæge sig lidt)
        let moveSpeed = 0.4; // Tunet til ca. 30-40 sekunder for krydsning

        // Modifiers fra gener
        if (this.genes.flagellum) {
            moveSpeed += 2.0; // Stor bonus
        } else if (this.genes.cilia) {
            moveSpeed += 1.0; // Lille bonus
        }

        if (this.isPlayer) {
            // SPILLER - Styrer mod musen
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            this.angle = Math.atan2(dy, dx);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 1) {
                this.x += (dx / distance) * moveSpeed;
                this.y += (dy / distance) * moveSpeed;

                // ATP omkostning (kun for ekstra fart)
                if (this.genes.flagellum) this.atp -= 0.02;
                else if (this.genes.cilia) this.atp -= 0.01;
                else this.atp -= 0.005;
            }
        } else {
            // NPC - Bevæger sig tilfældigt
            this.moveAngle += (Math.random() - 0.5) * 0.1;
            const npcSpeed = moveSpeed * 0.5; // NPC'er er lidt langsommere
            this.x += Math.cos(this.moveAngle) * npcSpeed;
            this.y += Math.sin(this.moveAngle) * npcSpeed;
            this.atp -= 0.005;
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

        // 6. Død
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

        if (this.alive && this.aminoAcids >= this.maxAminoAcids) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.isPlayer ? '#69F0AE' : '#FFF';
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
