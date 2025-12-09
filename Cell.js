export class Cell {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer; // Er det denne vi styrer?

        // Størrelse
        this.radius = 20;
        this.minRadius = 20;
        this.maxRadius = 28;
        this.pulse = Math.random() * 10;
        
        // Fysik
        this.speed = 2.0; 
        
        // Ressourcer
        this.atp = 100;
        this.maxAtp = 100;
        this.aminoAcids = 0;
        this.maxAminoAcids = 5;
        this.alive = true;

        // Farve
        this.color = isPlayer ? '#4CAF50' : '#888888'; 
    }

    update(mouse, inputKeys) {
        if (!this.alive) return;

        // 1. Basal Stofskifte
        this.atp -= 0.01;

        // 2. Animation
        this.pulse += 0.05;

        // 3. Vækst logik
        const growthPercent = this.aminoAcids / this.maxAminoAcids;
        this.radius = this.minRadius + (this.maxRadius - this.minRadius) * growthPercent;

        // 4. Bevægelse
        if (this.isPlayer) {
            // HVIS DET ER SPILLEREN: Følg musen
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 1) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
                this.atp -= 0.02; // Bevægelse koster
            }
        } else {
            // HVIS DET ER NPC: Driv tilfældigt rundt
            this.x += (Math.random() - 0.5) * 0.2;
            this.y += (Math.random() - 0.5) * 0.2;
            
            // Simpel AI: Hvis de har nok energi, bevæger de sig lidt mere
            if (this.atp > 50) {
                 this.x += (Math.random() - 0.5) * 0.5;
                 this.y += (Math.random() - 0.5) * 0.5;
                 this.atp -= 0.005;
            }
        }

        // Brownske bevægelser (gælder alle)
        this.x += (Math.random() - 0.5) * 0.5;
        this.y += (Math.random() - 0.5) * 0.5;

        // Død
        if (this.atp <= 0) {
            this.atp = 0;
            this.alive = false;
            this.color = '#555';
        }
    }

    draw(ctx) {
        // Beregn radius med puls
        const r = this.radius + Math.sin(this.pulse) * 2;

        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);

        // Hvis klar til deling -> Glød
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

        // Kantfarve (Grøn for player, Grå for NPC, Sort for død)
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