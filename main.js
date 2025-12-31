import { initInput, mouse, keys } from './Input.js';
import { activeCell, initPlayer, setActiveCell } from './Player.js';
import {
    initEnvironment, updateEnvironment, drawEnvironment,
    checkCollisions, spawnSisterCell, otherCells,
    getCellAtPosition, removeCellFromEnvironment, addCellToEnvironment,
    setMutationCallback, triggerInvasion, spawnToxinPulse
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
let isObserverMode = false;
let generation = 1;
let gameStartTime = Date.now();
let invasionTriggered = false;

// --- KNAPPER OG HÅNDTERING ---
try {
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    document.getElementById('apoBtn').addEventListener('click', triggerApoptosis);
    document.getElementById('inspectBtn').addEventListener('click', toggleInspect);
    document.getElementById('observeBtn').addEventListener('click', toggleObserve);

    // Minimap Click Logic
    const miniCanvas = document.getElementById('minimapCanvas');
    miniCanvas.addEventListener('mousedown', (e) => {
        if (!isObserverMode) return;

        const rect = miniCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Map minicanvas coords to world coords
        const scaleX = worldWidth / miniCanvas.width;
        const scaleY = worldHeight / miniCanvas.height;

        camera.x = (mx * scaleX) - camera.width / 2;
        camera.y = (my * scaleY) - camera.height / 2;

        // Clamp
        camera.x = Math.max(0, Math.min(camera.x, worldWidth - camera.width));
        camera.y = Math.max(0, Math.min(camera.y, worldHeight - camera.height));
    });
} catch (e) {
    console.error("Kunne ikke finde knapperne. Husk at gemme index.html!", e);
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

    // Vis/Skjul sidebar
    showInspectorSidebar(isInspecting);
}

function toggleObserve() {
    isObserverMode = !isObserverMode;
    const btn = document.getElementById('observeBtn');

    if (isObserverMode && activeCell) {
        // Gå ind i Observe Mode: Slip spilleren
        addCellToEnvironment(activeCell);
        activeCell.isPlayer = false; // Bliver NPC
        setActiveCell(null); // Ingen spiller

        btn.classList.add('active-observe');
        btn.innerText = "👁 SEEK";
        console.log("Observe Mode Activated");
    } else if (!isObserverMode) {
        // Ud af observe mode via knap?
        // Vi kan ikke bare 'blive' en spiller igen uden at vælge en.
        // Så hvis man klikker knappen for at slå fra, skal vi finde en tilfældig celle?
        // Eller bare vente til man klikker på en celle.
        // Lad os sige knappen kun virker 'ind', men man skal klikke for at komme 'ud'.
        // Men for god ordens skyld:
        btn.classList.remove('active-observe');
        btn.innerText = "👁 OBSERVE";
        // Vi forbliver 'null' indtil man klikker på en celle.
    }
}

function resetGame() {
    generation = 1;
    isPaused = false;
    isInspecting = false;
    isObserverMode = false;
    document.getElementById('observeBtn').classList.remove('active-observe');
    document.getElementById('observeBtn').innerText = "👁 OBSERVE";

    showInspectorSidebar(false); // Skjul
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

// --- MUTATION POPUP ---
function showMutationPopup(mutationType, newCell = null) {
    const popup = document.getElementById('mutationPopup');
    const title = document.getElementById('mutTitle');
    const desc = document.getElementById('mutDesc');
    const cost = document.getElementById('mutCost');

    popup.classList.remove('hidden');
    popup.style.opacity = '1';
    popup.style.display = 'block';

    if (mutationType === 'flagellum') {
        title.innerText = "Ny Mutation: Flagel!";
        desc.innerText = "En lang hale der giver kraftig fremdrift.";
        cost.innerText = "PRIS: +3 Aminosyrer, 2x ATP forbrug";
    } else if (mutationType === 'cilia') {
        title.innerText = "Ny Mutation: Cilier!";
        desc.innerText = "Små fimrehår der giver bedre kontrol.";
        cost.innerText = "PRIS: +2 Aminosyrer, 1.5x ATP forbrug";
    } else if (mutationType === 'megacytosis') {
        title.innerText = "Ny Mutation: Megacytose!";
        desc.innerText = "Du vokser til dobbelt størrelse! Mere HP, men langsommere.";
        cost.innerText = "PRIS: +5 Aminosyrer, 2x ATP (Stofskifte & Bevægelse), ½ Fart";
    } else if (mutationType === 'toxin') {
        title.innerText = "Ny Mutation: Toxin!";
        desc.innerText = "Tryk 'E' for at udskille gift der dræber konkurrenter.";
        cost.innerText = "PRIS: +1 Aminosyrer, 15 ATP pr. skud";
    }

    // AUTO-SWITCH: Hvis vi har fået en ny celle, skift til den!
    if (newCell) {
        // Gem den gamle spiller reference før vi skifter
        const oldPlayer = activeCell;

        if (oldPlayer) { // Kun hvis vi har en spiller
            // Gammel spiller til environment
            addCellToEnvironment(oldPlayer);
        }

        // Fjern ny celle fra environment (den blev tilføjet i spawnSisterCell)
        removeCellFromEnvironment(newCell);

        // Sæt som aktiv
        setActiveCell(newCell);

        // VIGTIGT: Overfør callback (så 'E' virker på den nye celle)
        if (oldPlayer) {
            newCell.onAction = oldPlayer.onAction;
            oldPlayer.onAction = null;
        }

        // Opdater kamera med det samme
        updateCamera();
        console.log("Auto-switched to new mutated cell! Coords:", newCell.x, newCell.y);
    }

    // Skjul efter 5 sekunder
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            popup.classList.add('hidden');
            popup.style.display = 'none';
        }, 500);
    }, 5000);
}

// --- EVENT POPUP ---
function showEventPopup(titleText, descText, costText) {
    const popup = document.getElementById('mutationPopup');
    const title = document.getElementById('mutTitle');
    const desc = document.getElementById('mutDesc');
    const cost = document.getElementById('mutCost');

    title.innerText = titleText;
    desc.innerText = descText;
    cost.innerText = costText; // Bruges som subtext/råd her

    // Styling til event (lidt anderledes farve?)
    title.style.color = '#FF5252'; // Rød alarm
    popup.style.borderColor = '#FF5252';

    popup.classList.remove('hidden');
    popup.style.opacity = '1';
    popup.style.display = 'block';

    // Skjul efter 8 sekunder (lidt længere tid)
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            popup.classList.add('hidden');
            popup.style.display = 'none';
            // Reset styles
            title.style.color = '#69F0AE';
            popup.style.borderColor = '#69F0AE';
        }, 500);
    }, 8000);
}

// Første gang spillet starter
function init() {
    initInput();
    // Vi initialiserer spilleren i midten af den store verden
    initPlayer(worldWidth, worldHeight);

    // Setup Action Callback for Player
    if (activeCell) {
        activeCell.onAction = (action, x, y) => {
            if (action === 'toxin') {
                spawnToxinPulse(x, y);
            }
        };
    }

    initEnvironment(worldWidth, worldHeight);

    // Reset timere
    gameStartTime = Date.now();
    invasionTriggered = false;

    // Register callback for mutationer
    setMutationCallback(showMutationPopup);
}

function handleCellSwitch() {
    // Konverter musens skærm-koordinater til verdens-koordinater
    const mouseWorldX = mouse.x + camera.x;
    const mouseWorldY = mouse.y + camera.y;

    if (mouse.clicked) {
        const clickedCell = getCellAtPosition(mouseWorldX, mouseWorldY);

        if (clickedCell) {
            // Hvis vi er i OBSERVE mode, så overtag cellen!
            if (isObserverMode || !activeCell) {
                removeCellFromEnvironment(clickedCell);
                setActiveCell(clickedCell);
                clickedCell.isPlayer = true;

                // Exit Observe Mode
                isObserverMode = false;
                const btn = document.getElementById('observeBtn');
                btn.classList.remove('active-observe');
                btn.innerText = "👁 OBSERVE";

                // Hook up actions
                clickedCell.onAction = (action, x, y) => {
                    if (action === 'toxin') spawnToxinPulse(x, y);
                };

                console.log("Possessed cell!", clickedCell);
            } else {
                // Alm. switch logic (hvis man klikker mens man spiller)
                const oldPlayer = activeCell;
                addCellToEnvironment(oldPlayer);
                removeCellFromEnvironment(clickedCell);
                setActiveCell(clickedCell);

                // Overfør callback
                clickedCell.onAction = oldPlayer.onAction;
                oldPlayer.onAction = null;
            }

            mouse.clicked = false;
        }
    }
}

function handleDivision() {
    if (activeCell && keys.d && activeCell.aminoAcids >= activeCell.maxAminoAcids) {
        // Gem reference til moderen, da activeCell kan ændre sig under spawnSisterCell (ved mutation swap)
        const mother = activeCell;

        // Spawn søster (true = spillerens barn)
        spawnSisterCell(mother.x, mother.y, mother.genes, true);

        // Reset moderen (selvom vi måske ikke styrer hende mere, skal hun nulstilles i verdenen)
        mother.aminoAcids = 0;
        mother.radius = mother.minRadius;
        // Flyt kun moderen lidt væk, så de ikke hænger sammen
        mother.x += 30;

        generation++;

        // Forhindr "maskingevær" deling ved at fjerne trykket
        keys.d = false;
    }
}

// --- MINIMAP FUNKTION ---
function drawMinimap() {
    const miniCanvas = document.getElementById('minimapCanvas');
    if (!miniCanvas) return;
    const miniCtx = miniCanvas.getContext('2d');

    // Ryd canvas
    miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);

    const scale = miniCanvas.width / Math.max(worldWidth, worldHeight);

    // 1. Baggrund
    miniCtx.fillStyle = '#000';
    miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

    // 2. Grænser (Verden)
    const mapW = worldWidth * scale;
    const mapH = worldHeight * scale;
    miniCtx.strokeStyle = '#333';
    miniCtx.lineWidth = 1;
    miniCtx.strokeRect(0, 0, mapW, mapH);

    // 3. Andre celler
    otherCells.forEach(cell => {
        const cx = cell.x * scale;
        const cy = cell.y * scale;
        miniCtx.beginPath();
        miniCtx.arc(cx, cy, 2, 0, Math.PI * 2);

        // Farv Bacillus orange, andre røde
        miniCtx.fillStyle = cell.isBacillus ? '#FF9800' : '#FF5252';
        miniCtx.fill();
    });

    // 4. Spilleren
    if (activeCell) {
        miniCtx.fillStyle = '#69F0AE'; // Grøn
        const px = activeCell.x * scale;
        const py = activeCell.y * scale;
        miniCtx.beginPath();
        miniCtx.arc(px, py, 3, 0, Math.PI * 2);
        miniCtx.fill();
    }

    // 5. Kamera Viewport
    miniCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    miniCtx.lineWidth = 1;
    const camRectX = camera.x * scale;
    const camRectY = camera.y * scale;
    const camRectW = camera.width * scale;
    const camRectH = camera.height * scale;
    miniCtx.strokeRect(camRectX, camRectY, camRectW, camRectH);
}

// --- NY SIDEBAR FUNKTION ---
function updateInspectorSidebar(cell) {
    // Opdater DOM elementer
    document.getElementById('inspGen').innerText = generation;

    if (cell) {
        // ATP
        const atpPct = (cell.atp / cell.maxAtp) * 100;
        document.getElementById('inspAtpBar').style.width = atpPct + '%';
        document.getElementById('inspAtpVal').innerText = `${Math.floor(cell.atp)} / ${cell.maxAtp}`;

        // Amino
        const aminoPct = (cell.aminoAcids / cell.maxAminoAcids) * 100;
        document.getElementById('inspAminoBar').style.width = aminoPct + '%';
        document.getElementById('inspAminoVal').innerText = `${cell.aminoAcids} / ${cell.maxAminoAcids}`;

        // Gener Liste
        const list = document.getElementById('inspGeneList');
        list.innerHTML = ''; // Start forfra

        // Helper function
        function addGeneItem(name, active, desc) {
            const li = document.createElement('li');
            li.className = active ? 'active' : '';
            li.innerHTML = `<strong>${name}</strong><br><span style="color:#aaa; font-size:12px;">${active ? desc : 'Ikke aktiv'}</span>`;
            list.appendChild(li);
        }

        addGeneItem('Flagel', cell.genes.flagellum, 'Høj fart (2.0), Dyr drift');
        addGeneItem('Cilier', cell.genes.cilia, 'Bedre kontrol, Medium drift');
        addGeneItem('Megacytose', cell.genes.megacytosis, '2x Størrelse, ½ Fart, +HP');
        addGeneItem('Toxin', cell.genes.toxin, 'Giftangreb (Tryk E)');
    } else {
        // Hvis ingen celle er aktiv (Observe Mode)
        document.getElementById('inspAtpVal').innerText = "-";
        document.getElementById('inspAminoVal').innerText = "-";
        document.getElementById('inspGeneList').innerHTML = "<li><em>Observer Mode</em></li>";
    }

    // Population Counters
    const playerCount = otherCells.filter(c => !c.isBacillus && c.alive).length + (activeCell ? 1 : 0);
    const bacillusCount = otherCells.filter(c => c.isBacillus && c.alive).length;

    document.getElementById('popPlayer').innerText = playerCount;
    document.getElementById('popBacillus').innerText = bacillusCount;
}

function showInspectorSidebar(show) {
    const sidebar = document.getElementById('inspectorSidebar');
    // Sidebar håndteres nu via CSS (ingen hidden class)
}

function drawUI() {
    // UI tegnes OVENPÅ alt

    if (activeCell) {
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
    } else {
        // OBSERVE MODE UI Overlay
        ctx.fillStyle = 'rgba(171, 71, 188, 0.2)';
        ctx.fillRect(0, canvas.height - 80, 250, 80);
        ctx.fillStyle = '#E1BEE7';
        ctx.font = 'bold 16px Arial';
        ctx.fillText("👁 OBSERVER MODE", 20, canvas.height - 50);
        ctx.font = '12px Arial';
        ctx.fillText("Klik på en celle for at overtage styringen", 20, canvas.height - 30);
    }

    ctx.fillStyle = '#FFF';
    ctx.fillText(`Generation: ${generation} | Celler i alt: ${otherCells.length + (activeCell ? 1 : 0)}`, 20, 30);

    // Debug info om verden
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(`World: ${worldWidth}x${worldHeight} | Cam: ${Math.floor(camera.x)},${Math.floor(camera.y)}`, 20, 70);

    if (isPaused && !isInspecting) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2);
    }

    // Tegn Minimap i sidebaren, ikke på main canvas
    drawMinimap();
}

function updateCamera() {
    if (activeCell) {
        // Center kamera på spilleren
        camera.x = activeCell.x - canvas.width / 2;
        camera.y = activeCell.y - canvas.height / 2;
    } else {
        // RTS Style Edge Scrolling
        const edgeSize = 50;
        const speed = 15;

        if (mouse.x < edgeSize) camera.x -= speed;
        if (mouse.x > canvas.width - edgeSize) camera.x += speed;
        if (mouse.y < edgeSize) camera.y -= speed;
        if (mouse.y > canvas.height - edgeSize) camera.y += speed;
    }

    if (isNaN(camera.x) || isNaN(camera.y)) {
        console.error("CAMERA IS NAN!", camera);
        camera.x = 0;
        camera.y = 0;
    }

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
        // Tids-baserede events (Invasion efter 60 sekunder)
        if (!invasionTriggered && Date.now() - gameStartTime > 60000) {
            triggerInvasion(worldWidth, worldHeight);
            invasionTriggered = true;
            showEventPopup(
                "ADVARSEL: INVASION!",
                "Bacillus simplex er ankommet. De spiser alt din mad!",
                "RÅD: Udvikl Toxin (E) eller bliv udkonkurreret!"
            );
            console.log("EVENT: Invasion triggered!");
        }

        // Opdater kamera position FØR vi tegner
        updateCamera();

        // SIMULATION (Brug verdens-dimensioner og verdens-mus)
        if (activeCell) {
            activeCell.update(worldMouse, keys, worldWidth, worldHeight);
            checkCollisions(activeCell);
            handleDivision();
        }

        otherCells.forEach(cell => checkCollisions(cell));
        updateEnvironment(worldWidth, worldHeight);
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

    // Sidebaren opdateres hver frame (altid aktiv nu) (Send activeCell eller null)
    updateInspectorSidebar(activeCell);

    requestAnimationFrame(gameLoop);
}

// RETTET: init() og gameLoop() skal kaldes her for at starte spillet.
init();
gameLoop();