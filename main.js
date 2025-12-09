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
let isInspecting = false;
let generation = 1;

// --- KNAPPER OG HÅNDTERING ---
try {
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    document.getElementById('apoBtn').addEventListener('click', triggerApoptosis);
    document.getElementById('inspectBtn').addEventListener('click', toggleInspect); 
} catch (e) {
    console.error("Kunne ikke finde knapperne. Husk at gemme index.html!");
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        togglePause();
    }
    // Håndter I-tast for inspektion
    if (e.code === 'KeyI' && !isInspecting && isPaused) {
        toggleInspect();
    } else if (e.code === 'KeyI' && isInspecting) {
        toggleInspect();
    }
});


function togglePause() {
    isPaused = !isPaused;
    // Hvis vi starter spillet igen, skal inspektionsvinduet lukkes
    if (!isPaused) {
        isInspecting = false; 
    }
    const btn = document.getElementById('pauseBtn');
    if(btn) btn.innerText = isPaused ? "▶ START" : "⏸ PAUSE";
}

function toggleInspect() {
    // Man kan kun inspicere, hvis spillet er pauset
    if (!isPaused && !isInspecting) {
        // Vi pauser automatisk
        togglePause(); 
    }
    isInspecting = !isInspecting;
    console.log("Inspektion: " + isInspecting);
}

function resetGame() {
    generation = 1;
    isPaused = false;
    isInspecting = false;
    const btn = document.getElementById('pauseBtn');
    if(btn) btn.innerText = "⏸ PAUSE";
    init(); 
}

function triggerApoptosis() {
    if (activeCell && activeCell.alive) {
        activeCell.kill();
        console.log("Apoptose udført.");
    }
}

// Første gang spillet starter
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
        }
    }
}

function handleDivision() {
    if (keys.d && activeCell.aminoAcids >= activeCell.maxAminoAcids) {
        spawnSisterCell(activeCell.x, activeCell.y);
        
        activeCell.aminoAcids = 0; 
        activeCell.radius = activeCell.minRadius; 
        activeCell.x += 30; 
        
        generation++;
    }
}

// --- NY FUNKTION: Tegn Inspektion (RENSES FOR BILLEDE-TAGS) ---
function drawInspectorWindow(cell) {
    // Sørg for at alt fryser i inspektionsmode
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const winWidth = 600;
    const winHeight = 500;
    const winX = canvas.width / 2 - winWidth / 2;
    const winY = canvas.height / 2 - winHeight / 2;

    // Baggrund og kant
    ctx.fillStyle = '#222';
    ctx.fillRect(winX, winY, winWidth, winHeight);
    ctx.strokeStyle = cell.color;
    ctx.lineWidth = 5;
    ctx.strokeRect(winX, winY, winWidth, winHeight);

    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText("🔬 CELLE-INSPEKTØR - GENERATION " + generation, winX + 20, winY + 40);

    // --- CELLE INDHOLD (VENSTRE SIDE) ---
    const contentX = winX + 40;
    let contentY = winY + 80;

    // Ribosomer (Proteinfabrikker)
    ctx.font = '16px Arial';
    ctx.fillStyle = '#C0C0C0';
    ctx.fillText("🏭 Ribosomer (Proteinfabrik): Aktive", contentX, contentY); 
    contentY += 25;

    // DNA
    ctx.fillStyle = '#FF4081';
    ctx.fillText("🧬 Cirkulært DNA: Intakt", contentX, contentY); 
    contentY += 25;

    // RNA
    ctx.fillStyle = '#B2FF59';
    ctx.fillText("📜 mRNA (Næste protein): Klar", contentX, contentY);
    contentY += 40;

    // --- MEMBRAN PROTEINER (HØJRE SIDE) ---
    ctx.font = '18px Arial bold';
    ctx.fillStyle = '#B3E5FC';
    ctx.fillText("🧪 MEMBRAN PROTEINER (Transport)", winX + 320, winY + 80);
    let membraneY = winY + 110;

    // Glukose Transport Protein (Passiv Diffusion)
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFEB3B';
    ctx.fillText("🔸 Glukose Transport: Passiv Diffusion", winX + 320, membraneY); 
    membraneY += 25;

    // Aminosyre Transport Protein (Aktiv Transport)
    ctx.fillStyle = '#2196F3';
    ctx.fillText("🔹 Aminosyre Transport: Aktiv Transport (ATP-krævende)", winX + 320, membraneY); 
    membraneY += 40;


    // --- STATUS ---
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(`ATP: ${Math.floor(cell.atp)}/${cell.maxAtp}`, contentX, winY + winHeight - 60);
    ctx.fillText(`Aminosyrer: ${cell.aminoAcids}/${cell.maxAminoAcids}`, contentX, winY + winHeight - 40);
    
    // Luk knap info
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Tryk 'I' eller 'INSPECT' for at lukke", canvas.width / 2, winY + winHeight - 20);
}

function drawUI() {
    // ... (Behold drawUI fra forrige besked) ...
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
        ctx.fillText("TRYK 'D' FOR AT DELE DIG", 230, canvas.height - 55);
    } else {
        ctx.fillStyle = '#2196F3'; 
    }
    ctx.fillRect(20, canvas.height - 70, aminoWidth, 20);
    
    ctx.fillStyle = '#FFF';
    ctx.fillText(`Vækst: ${activeCell.aminoAcids} / ${activeCell.maxAminoAcids}`, 25, canvas.height - 55);
    ctx.fillText(`Generation: ${generation} | Celler i alt: ${otherCells.length + 1}`, 20, 30);

    if (isPaused && !isInspecting) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("PAUSE", canvas.width/2, canvas.height/2);
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    handleCellSwitch(); 

    if (!isPaused) {
        // SIMULATION
        activeCell.update(mouse, keys, canvas.width, canvas.height);
        otherCells.forEach(cell => checkCollisions(cell)); 
        updateEnvironment(canvas.width, canvas.height);
        checkCollisions(activeCell);
        handleDivision();
    }

    // TEGNING
    drawEnvironment(ctx);
    if (activeCell) activeCell.draw(ctx);
    drawUI(); 

    // Inspektion skal tegnes sidst, men kun hvis vi er i inspektionsmode
    if (isInspecting) {
        drawInspectorWindow(activeCell);
    }

    requestAnimationFrame(gameLoop);
}

// RETTET: init() og gameLoop() skal kaldes her for at starte spillet.
init();
gameLoop();