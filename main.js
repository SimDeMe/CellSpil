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

// --- VERDEN & KAMERA ---
const worldWidth = 5000;
const worldHeight = 5000;

const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height
};

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
    if (btn) btn.innerText = isPaused ? "▶ START" : "⏸ PAUSE";
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
    if (btn) btn.innerText = "⏸ PAUSE";
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
    // Vi initialiserer spilleren i midten af den store verden
    initPlayer(worldWidth, worldHeight);
    initEnvironment(worldWidth, worldHeight);
}

function handleCellSwitch() {
    // Konverter musens skærm-koordinater til verdens-koordinater
    const mouseWorldX = mouse.x + camera.x;
    const mouseWorldY = mouse.y + camera.y;

    if (mouse.clicked) {
        const clickedCell = getCellAtPosition(mouseWorldX, mouseWorldY);

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
        spawnSisterCell(activeCell.x, activeCell.y, activeCell.genes);

        activeCell.aminoAcids = 0;
        activeCell.radius = activeCell.minRadius;
        activeCell.x += 30;

        generation++;
    }
}

// --- MINIMAP FUNKTION ---
function drawMinimap() {
    const mapSize = 200; // Pixel størrelse på skærmen
    const scale = mapSize / Math.max(worldWidth, worldHeight);

    const margin = 20;
    const mapX = canvas.width - mapSize - margin;
    const mapY = canvas.height - mapSize - margin;

    // 1. Baggrund
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);

    // 2. Kant
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);

    // 3. Andre celler
    ctx.fillStyle = '#FF5252'; // Rødlig for fjender/NPC
    otherCells.forEach(cell => {
        const cx = mapX + cell.x * scale;
        const cy = mapY + cell.y * scale;
        // Tegn kun hvis indenfor kortet (burde de altid være)
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // 4. Spilleren
    if (activeCell) {
        ctx.fillStyle = '#69F0AE'; // Grøn
        const px = mapX + activeCell.x * scale;
        const py = mapY + activeCell.y * scale;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // 5. Kamera Viewport (Hvid firkant)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    const camRectX = mapX + camera.x * scale;
    const camRectY = mapY + camera.y * scale;
    const camRectW = camera.width * scale;
    const camRectH = camera.height * scale;
    ctx.strokeRect(camRectX, camRectY, camRectW, camRectH);
}

// --- NY FUNKTION: Tegn Inspektion (RENSES FOR BILLEDE-TAGS) ---
function drawInspectorWindow(cell) {
    // Sørg for at alt fryser i inspektionsmode
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Tegn overlay på skærmen (ikke verden)

    const winWidth = 600;
    const winHeight = 500;
    const winX = canvas.width / 2 - winWidth / 2;
    const winY = canvas.height / 2 - winHeight / 2;

    // Baggrund og kant
    ctx.fillStyle = '#111';
    ctx.fillRect(winX, winY, winWidth, winHeight);
    ctx.strokeStyle = cell.color;
    ctx.lineWidth = 5;
    ctx.strokeRect(winX, winY, winWidth, winHeight);

    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("🔬 DNA ANALYSE & MUTATIONER", winX + winWidth / 2, winY + 40);

    // --- DNA CIRKEL ---
    const circleX = winX + winWidth / 2;
    const circleY = winY + winHeight / 2 - 20;
    const circleR = 100;

    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#FF4081'; // DNA farve
    ctx.stroke();

    // Pynt på DNA
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 64, 129, 0.5)';
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 / 20) * i;
        const innerR = circleR - 7;
        const outerR = circleR + 7;
        ctx.beginPath();
        ctx.moveTo(circleX + Math.cos(angle) * innerR, circleY + Math.sin(angle) * innerR);
        ctx.lineTo(circleX + Math.cos(angle) * outerR, circleY + Math.sin(angle) * outerR);
        ctx.stroke();
    }

    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.fillText("DNA STRUKTUR", circleX, circleY + 5);

    // --- GENER / MUTATIONER LISTE ---
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFF';
    ctx.font = '18px Arial bold';
    ctx.fillText("AKTIVE GENER:", winX + 40, winY + 100);

    let geneY = winY + 140;

    // Flagel
    if (cell.genes.flagellum) {
        ctx.fillStyle = '#69F0AE';
        ctx.fillText("✅ Flagel (Svømning)", winX + 40, geneY);
    } else {
        ctx.fillStyle = '#555';
        ctx.fillText("❌ Flagel (Ingen)", winX + 40, geneY);
    }
    geneY += 30;

    // Cilier
    if (cell.genes.cilia) {
        ctx.fillStyle = '#69F0AE';
        ctx.fillText("✅ Cilier (Langsom bevægelse)", winX + 40, geneY);
    } else {
        ctx.fillStyle = '#555';
        ctx.fillText("❌ Cilier (Ingen)", winX + 40, geneY);
    }
    geneY += 30;

    // --- HØJRE SIDE INFO ---
    const infoX = winX + 350;
    let infoY = winY + 100;
    ctx.fillStyle = '#B3E5FC';
    ctx.fillText("STATUS:", infoX, infoY);
    infoY += 40;

    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText(`Generation: ${generation}`, infoX, infoY);
    infoY += 25;
    ctx.fillText(`ATP: ${Math.floor(cell.atp)}/${cell.maxAtp}`, infoX, infoY);
    infoY += 25;
    ctx.fillText(`Aminosyrer: ${cell.aminoAcids}/${cell.maxAminoAcids}`, infoX, infoY);

    // Luk knap info
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888';
    ctx.fillText("Tryk 'I' eller 'INSPECT' for at lukke", canvas.width / 2, winY + winHeight - 20);
}

function drawUI() {
    // UI tegnes OVENPÅ alt (ingen camera transform her da vi resetter context før kald)

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

    // Debug info om verden
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(`World: ${worldWidth}x${worldHeight} | Cam: ${Math.floor(camera.x)},${Math.floor(camera.y)}`, 20, 50);


    if (isPaused && !isInspecting) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2);
    }

    // Tegn Minimap til sidst i UI
    drawMinimap();
}

function updateCamera() {
    if (!activeCell) return;

    // Center kamera på spilleren
    camera.x = activeCell.x - canvas.width / 2;
    camera.y = activeCell.y - canvas.height / 2;

    // Hold kamera inden for verdenens grænser
    camera.x = Math.max(0, Math.min(camera.x, worldWidth - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, worldHeight - canvas.height));
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Logik opdateringer
    handleCellSwitch();

    // Opret et midlertidigt mouse objekt til logic updates som tager højde for kamera
    const worldMouse = {
        x: mouse.x + camera.x,
        y: mouse.y + camera.y
    };

    if (!isPaused) {
        // Opdater kamera position FØR vi tegner
        updateCamera();

        // SIMULATION (Brug verdens-dimensioner og verdens-mus)
        activeCell.update(worldMouse, keys, worldWidth, worldHeight);
        otherCells.forEach(cell => checkCollisions(cell));
        updateEnvironment(worldWidth, worldHeight);
        checkCollisions(activeCell);
        handleDivision();
    }

    // 2. Tegning - Verden (Med Kamera Transform)
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Tegn en baggrund eller grænse for verden
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, worldWidth, worldHeight);

    drawEnvironment(ctx);
    if (activeCell) activeCell.draw(ctx);

    ctx.restore(); // Gå tilbage til skærm-koordinater

    // 3. Tegning - UI (Ingen Transform - tegnes fast på skærmen)
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