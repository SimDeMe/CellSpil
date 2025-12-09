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

        // NPC Bevægelse
        this.moveAngle = Math.random() * Math.PI * 2; 
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
        if (this.isPlayer) {
            // SPILLER
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 1) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
                this.atp -= 0.02; 
            }
        } else {
            // NPC
            this.moveAngle += (Math.random() - 0.5) * 0.1; 
            const npcSpeed = this.speed * 0.3; 
            this.x += Math.cos(this.moveAngle) * npcSpeed;
            this.y += Math.sin(this.moveAngle) * npcSpeed;
            this.atp -= 0.005;
        }

        // 4. Brownske bevægelser
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