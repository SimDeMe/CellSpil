import { initInput, mouse, keys } from './Input.js';
import { activeCell, initPlayer, setActiveCell } from './Player.js';
import { 
    initEnvironment, updateEnvironment, drawEnvironment, 
    checkCollisions, spawnSisterCell, otherCells, 
    getCellAtPosition, removeCellFromEnvironment, addCellToEnvironment 
} from './Environment.js'; 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let isPaused = false;
let generation = 1;

// Knapper (Klik)
document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('resetBtn').addEventListener('click', resetGame);

// Knapper (Tastatur - Global Events)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        togglePause();
    }
});

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').innerText = isPaused ? "▶ START" : "⏸ PAUSE";
}

function resetGame() {
    generation = 1;
    isPaused = false;
    document.getElementById('pauseBtn').innerText = "⏸ PAUSE";
    init(); 
}

function init() {
    initInput();
    initPlayer(canvas.width, canvas.height);
    initEnvironment(canvas.width, canvas.height);
}

function handleCellSwitch() {
    if (mouse.clicked) {
        const clickedCell = getCellAtPosition(mouse.x, mouse.y);
        
        if (clickedCell) {
            const oldPlayer = activeCell;
            addCellToEnvironment(oldPlayer);
            removeCellFromEnvironment(clickedCell);
            setActiveCell(clickedCell);
            
            mouse.clicked = false; 
            console.log("Skiftede celle!");
        }
    }
}

function handleDivision() {
    // RETTET: Bruger nu 'D' tasten
    if (keys.d && activeCell.aminoAcids >= activeCell.maxAminoAcids) {
        spawnSisterCell(activeCell.x, activeCell.y);
        
        activeCell.aminoAcids = 0; 
        activeCell.radius = activeCell.minRadius; 
        activeCell.x += 30; 
        
        generation++;
    }
}

function drawUI() {
    // ATP Bar
    ctx.fillStyle = '#333';
    ctx.fillRect(20, canvas.height - 40, 200, 20);
    const atpWidth = (activeCell.atp / activeCell.maxAtp) * 200;
    ctx.fillStyle = '#FFC107'; 
    ctx.fillRect(20, canvas.height - 40, atpWidth, 20);
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText(`ATP: ${Math.floor(activeCell.atp)}`, 25, canvas.height - 25);

    // Amino Bar
    ctx.fillStyle = '#333';
    ctx.fillRect(20, canvas.height - 70, 200, 20);
    const aminoWidth = (activeCell.aminoAcids / activeCell.maxAminoAcids) * 200;
    
    if (activeCell.aminoAcids >= activeCell.maxAminoAcids) {
        ctx.fillStyle = '#00E676'; 
        // RETTET TEKST
        ctx.fillText("TRYK 'D' FOR AT DELE DIG", 230, canvas.height - 55);
    } else {
        ctx.fillStyle = '#2196F3'; 
    }
    ctx.fillRect(20, canvas.height - 70, aminoWidth, 20);
    
    ctx.fillStyle = '#FFF';
    ctx.fillText(`Vækst: ${activeCell.aminoAcids} / ${activeCell.maxAminoAcids}`, 25, canvas.height - 55);
    ctx.fillText(`Generation: ${generation} | Celler i alt: ${otherCells.length + 1}`, 20, 30);

    if (isPaused) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("PAUSE", canvas.width/2, canvas.height/2);
        ctx.font = '20px Arial';
        ctx.fillText("(Tryk Space for at fortsætte)", canvas.width/2, canvas.height/2 + 40);
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Interaktion (Altid aktiv)
    handleCellSwitch(); 

    // 2. Simulation (Kun når ikke pauset)
    if (!isPaused) {
        activeCell.update(mouse, keys);
        otherCells.forEach(cell => checkCollisions(cell)); 
        updateEnvironment(canvas.width, canvas.height);
        checkCollisions(activeCell);
        handleDivision();
    }

    // 3. Tegning
    drawEnvironment(ctx);
    if (activeCell) activeCell.draw(ctx);
    drawUI(); 

    requestAnimationFrame(gameLoop);
}

// Start
init();
gameLoop();