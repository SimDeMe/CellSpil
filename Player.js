import { mouse } from './Input.js';

export const playerCell = {
    x: 0, 
    y: 0,
    radius: 20,          // Start radius
    minRadius: 20,       // Minimum størrelse
    maxRadius: 28,       // Størrelse ved deling (ca. dobbelt areal)
    color: '#4CAF50',
    pulse: 0,
    speed: 0.4, 
    currentRadius: 20,

    atp: 100,         
    maxAtp: 100,      
    basalCost: 0.01,  
    moveCost: 0.02,   
    alive: true,

    aminoAcids: 0,
    maxAminoAcids: 50 
};

export function initPlayer(canvasWidth, canvasHeight) {
    playerCell.x = canvasWidth / 2;
    playerCell.y = canvasHeight / 2;
    playerCell.atp = 100;
    playerCell.aminoAcids = 0;
    playerCell.alive = true;
    playerCell.color = '#4CAF50';
}

export function updatePlayer() {
    if (!playerCell.alive) return;

    // --- NYT: VÆKST LOGIK ---
    // Hvor mange procent fyldt er vi med aminosyrer? (0.0 til 1.0)
    const growthPercent = playerCell.aminoAcids / playerCell.maxAminoAcids;
    
    // Beregn ny basis radius baseret på vækst
    // Hvis 0% -> radius 20. Hvis 100% -> radius 28.
    playerCell.radius = playerCell.minRadius + (playerCell.maxRadius - playerCell.minRadius) * growthPercent;

    // Animation (Pulsering oveni den nye størrelse)
    playerCell.pulse += 0.05;
    playerCell.currentRadius = playerCell.radius + Math.sin(playerCell.pulse) * 2;

    // --- Bevægelse og ATP (uændret) ---
    const dx = mouse.x - playerCell.x;
    const dy = mouse.y - playerCell.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    playerCell.atp -= playerCell.basalCost;

    if (distance > 1) {
        const dirX = dx / distance;
        const dirY = dy / distance;
        playerCell.x += dirX * playerCell.speed;
        playerCell.y += dirY * playerCell.speed;
        playerCell.atp -= playerCell.moveCost;
    }

    // Brownske bevægelser
    playerCell.x += (Math.random() - 0.5) * 0.5;
    playerCell.y += (Math.random() - 0.5) * 0.5;

    // Død
    if (playerCell.atp <= 0) {
        playerCell.atp = 0;
        playerCell.alive = false;
        playerCell.color = '#555555';
    }
}

export function drawPlayer(ctx) {
    ctx.beginPath();
    ctx.arc(playerCell.x, playerCell.y, playerCell.currentRadius, 0, Math.PI * 2);
    
    // NYT: Skift farve lidt når vi er klar til at dele os
    if (playerCell.aminoAcids >= playerCell.maxAminoAcids) {
        ctx.fillStyle = '#69F0AE'; // Lysende klar grøn
        ctx.shadowBlur = 20;       // Glød effekt
        ctx.shadowColor = '#69F0AE';
    } else {
        ctx.fillStyle = playerCell.color;
        ctx.shadowBlur = 0;
    }
    
    ctx.fill();
    ctx.shadowBlur = 0; // Nulstil skygge

    ctx.strokeStyle = playerCell.alive ? '#81C784' : '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();
}