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

    update(mouse, inputKeys, worldWidth, worldHeight) {
        if (!this.alive) return;

        // Basal stofskifte (lavere end Cell)
        this.atp -= 0.01;

        // Bevægelse: Simpel, langsom drift
        this.moveAngle += (Math.random() - 0.5) * 0.2;
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
