import { initInput, keys } from './Input.js'; // HUSK at importere 'keys'
import { initPlayer, updatePlayer, drawPlayer, playerCell } from './Player.js';
// HUSK at importere spawnSisterCell
import { initEnvironment, updateEnvironment, drawEnvironment, checkCollisions, spawnSisterCell } from './Environment.js'; 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let generation = 1; // Tæl hvor mange gange vi har delt os

function init() {
    initInput();
    initPlayer(canvas.width, canvas.height);
    initEnvironment(canvas.width, canvas.height);
    gameLoop();
}

function handleDivision() {
    // Hvis Space er trykket NED, og vi har nok aminosyrer
    if (keys.space && playerCell.aminoAcids >= playerCell.maxAminoAcids) {
        
        // 1. Lav en kopi (Søster-cellen) der hvor vi er nu
        spawnSisterCell(playerCell.x, playerCell.y, playerCell.minRadius, '#888');

        // 2. Nulstil spilleren (Vi bliver til den ene dattercelle)
        playerCell.aminoAcids = 0; // Brug alle byggestenene
        playerCell.radius = playerCell.minRadius; // Bliv lille igen
        
        // Skub spilleren lidt væk, så de ikke starter oven i hinanden
        playerCell.x += 30; 
        
        generation++;
        console.log("Celledeling succesfuld! Generation: " + generation);
        
        // Lille hack for at undgå at den deler sig 60 gange i sekundet mens knappen holdes nede
        keys.space = false; 
    }
}

function drawUI() {
    // ATP Bar
    ctx.fillStyle = '#333';
    ctx.fillRect(20, canvas.height - 40, 200, 20);
    const atpWidth = (playerCell.atp / playerCell.maxAtp) * 200;
    ctx.fillStyle = '#FFC107'; 
    ctx.fillRect(20, canvas.height - 40, atpWidth, 20);
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText("ATP (Energi)", 25, canvas.height - 25);

    // Amino Bar
    ctx.fillStyle = '#333';
    ctx.fillRect(20, canvas.height - 70, 200, 20);
    const aminoWidth = (playerCell.aminoAcids / playerCell.maxAminoAcids) * 200;
    
    // Skift farve på baren når den er fuld
    if (playerCell.aminoAcids >= playerCell.maxAminoAcids) {
        ctx.fillStyle = '#00E676'; // Klar grøn "KLAR!" farve
        ctx.fillText("TRYK MELLEMRUM FOR AT DELE DIG", 230, canvas.height - 55);
    } else {
        ctx.fillStyle = '#2196F3'; // Blå
    }
    
    ctx.fillRect(20, canvas.height - 70, aminoWidth, 20);
    ctx.fillStyle = '#FFF';
    ctx.fillText("Vækst: " + Math.floor(playerCell.aminoAcids) + " / " + playerCell.maxAminoAcids, 25, canvas.height - 55);
    
    // Generation tæller i toppen
    ctx.fillText("Generation: " + generation, 20, 30);

    if (!playerCell.alive) {
        ctx.fillStyle = 'red';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("CELLEDØD", canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop() {
    updatePlayer();
    updateEnvironment(canvas.width, canvas.height);
    checkCollisions(playerCell);
    
    // NYT: Tjek for celledeling
    handleDivision();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawEnvironment(ctx);
    drawPlayer(ctx);
    drawUI(); 

    requestAnimationFrame(gameLoop);
}

init();