import { initInput, mouse, keys } from './Input.js';
import { activeCell, initPlayer, setActiveCell } from './Player.js';
import { GameConfig } from './GameConfig.js';
import {
    initEnvironment, updateEnvironment, drawEnvironment,
    checkCollisions, spawnSisterCell, otherCells,
    getCellAtPosition, removeCellFromEnvironment, addCellToEnvironment,
    setMutationCallback, triggerInvasion, spawnToxinPulse, spawnProteasePulse
} from './Environment.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- VERDEN & KAMERA ---
const worldWidth = GameConfig.World.width;
const worldHeight = GameConfig.World.height;

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
        title.innerText = "Ny Mutation: Monotrichous!";
        desc.innerText = "Tier 1 (Movement). En lang hale der giver kraftig fremdrift.";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.flagellum} Aminosyrer.`;
    } else if (mutationType === 'pili') {
        title.innerText = "Ny Mutation: Type IV Pili!";
        desc.innerText = "Tier 1 (Movement). Gribekroge til twitch-bevægelse.";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.pili} Aminosyrer.`;
    } else if (mutationType === 'highTorque') {
        title.innerText = "Ny Mutation: High-Torque Flagel!";
        desc.innerText = "Tier 3 (Upgrade). En super-tunet motor! Ekstrem fart.";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.highTorque} Aminosyrer.`;
    } else if (mutationType === 'highSpeedRetraction') {
        title.innerText = "Ny Mutation: High-Speed Retraction!";
        desc.innerText = "Tier 3 (Upgrade). Pili trækker dig meget hurtigere frem.";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.highSpeedRetraction} Aminosyrer.`;
    } else if (mutationType === 'multiplexPili') {
        title.innerText = "Ny Mutation: Multiplex Pili!";
        desc.innerText = "Tier 3 (Upgrade). Flere pili og længere rækkevidde!";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.multiplexPili} Aminosyrer.`;
    } else if (mutationType === 'megacytosis') {
        title.innerText = "Ny Mutation: Megacytose!";
        desc.innerText = "Tier 3 (Size). Du vokser til dobbelt størrelse! Mere HP.";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.megacytosis} Aminosyrer.`;
    } else if (mutationType === 'toxin') {
        title.innerText = "Ny Mutation: Toxin!";
        desc.innerText = "Tier 2 (Ability). Tryk 'E' for at udskille gift.";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.toxin} Aminosyrer.`;
    } else if (mutationType === 'protease') {
        title.innerText = "Ny Mutation: Proteaser!";
        desc.innerText = "Tier 2 (Ability). Tryk 'R' for at opløse lig til mad.";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.protease} Aminosyrer.`;
    } else if (mutationType === 'endocytosis') {
        title.innerText = "Ny Mutation: Endocytose!";
        desc.innerText = "Tier 4 (Apex). Du kan nu spise mindre celler!";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.endocytosis} Aminosyrer.`;
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
            } else if (action === 'protease') {
                spawnProteasePulse(x, y);
            }
        };
    }

    initEnvironment(worldWidth, worldHeight);

    // Reset timere
    gameStartTime = Date.now();
    invasionTriggered = false;

    // Register callback for mutationer
    setMutationCallback(showMutationPopup);

    // Setup UI Tabs (Inspector)
    setupInspectorTabs();
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
                    else if (action === 'protease') spawnProteasePulse(x, y);
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
    // 1. Check for Trigger (Key Press + Resources + Not already dividing)
    if (activeCell && keys.d && activeCell.aminoAcids >= activeCell.maxAminoAcids) {
        if (!activeCell.isDividing) {
            activeCell.startDivision();
            // Optional: Play a sound? "glop"
        }
    }

    // 2. Process Division State (Animation)
    if (activeCell && activeCell.isDividing) {
        // Check if animation is complete
        if (activeCell.divisionTimer >= activeCell.divisionDuration) {
            // --- SPAWN LOGIC ---
            const mother = activeCell;

            // Spawn søster (true = spillerens barn)
            spawnSisterCell(mother.x, mother.y, mother.genes, true);

            // Reset moderen
            mother.aminoAcids = 0;
            mother.radius = mother.minRadius;
            // Shift mother slightly left/right against child?
            // Animation separates them, so logical shift is fine.
            mother.x -= 10;

            generation++;

            // Nulstil division state
            mother.finalizeDivision();
            keys.d = false; // Reset key to prevent double spawn
        }
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

        // Farvelægning
        if (!cell.alive) {
            miniCtx.fillStyle = '#888'; // Lig (Grå)
        } else if (cell.isBacillus) {
            miniCtx.fillStyle = '#FFEB3B'; // Konkurrent (Gul)
        } else if (cell.isPlayer || cell.genes) {
            // Antager gamle spillerceller/børn er "grønne" eller ligner spilleren
            // Men i Environment.js er otherCells bare dem der ikke er den aktive.
            // Hvis vi vil have "Egne celler" grønne:
            // Tjek om de har 'isPlayer' flaget eller er børn?
            // Bacillus er isBacillus=true. 
            // Standard Cell er isPlayer=false (normalt), men hvis de er "vores" gamle kroppe...
            // Lad os sige alt der IKKE er Bacillus er "Vores" arter?
            miniCtx.fillStyle = '#4CAF50'; // Egne (Grøn)
        } else {
            miniCtx.fillStyle = '#FF5252'; // Ukendt/Fjende (Rød) - Fallback
        }

        miniCtx.fill();
    });

    // 4. Spilleren
    if (activeCell) {
        const px = activeCell.x * scale;
        const py = activeCell.y * scale;
        miniCtx.beginPath();
        miniCtx.arc(px, py, 3, 0, Math.PI * 2);
        miniCtx.fillStyle = '#4CAF50'; // Spiller (Grøn)
        miniCtx.fill();
        miniCtx.strokeStyle = '#FFF';
        miniCtx.lineWidth = 1;
        miniCtx.stroke();
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
// --- INSPECTOR TABS SETUP ---
function setupInspectorTabs() {
    const btnTree = document.getElementById('tabBtnTree');
    const btnMission = document.getElementById('tabBtnMission');
    const contentTree = document.getElementById('tabContentTree');
    const contentMission = document.getElementById('tabContentMission');

    if (!btnTree || !btnMission) return;

    btnTree.onclick = () => {
        btnTree.classList.add('active');
        btnMission.classList.remove('active');
        contentTree.classList.add('active');
        contentMission.classList.remove('active');
    };

    btnMission.onclick = () => {
        btnMission.classList.add('active');
        btnTree.classList.remove('active');
        contentMission.classList.add('active');
        contentTree.classList.remove('active');
        // Force refresh of mission content? It updates every frame anyway.
    };
}

// --- NY SIDEBAR FUNKTION (TABBED) ---
function updateInspectorSidebar(cell) {
    // Opdater DOM elementer (Stats)
    document.getElementById('inspGen').innerText = generation;

    // Population Counters
    const playerCount = otherCells.filter(c => !c.isBacillus && c.alive).length + (activeCell ? 1 : 0);
    const bacillusCount = otherCells.filter(c => c.isBacillus && c.alive).length;
    // (Vi har fjernet pop elementerne fra screen overlay, men hvis de fandtes: check if exist)
    // Hvis vi vil vise dem i sidebaren, skal vi tilføje dem i HTML. 
    // HTML koden fik dem ikke med i sidebar-content i denne omgang, men lad os fokusere på Tabs.

    if (cell) {
        // ATP
        const atpPct = (cell.atp / cell.maxAtp) * 100;
        document.getElementById('inspAtpBar').style.width = atpPct + '%';
        document.getElementById('inspAtpVal').innerText = `${Math.floor(cell.atp)} / ${cell.maxAtp}`;

        // Amino
        const aminoPct = (cell.aminoAcids / cell.maxAminoAcids) * 100;
        document.getElementById('inspAminoBar').style.width = aminoPct + '%';
        document.getElementById('inspAminoVal').innerText = `${cell.aminoAcids} / ${cell.maxAminoAcids}`;

        // Nucleotides
        const nucleoPct = (cell.nucleotides / cell.maxNucleotides) * 100;
        document.getElementById('inspNucleoBar').style.width = nucleoPct + '%';
        document.getElementById('inspNucleoVal').innerText = `${cell.nucleotides} / ${cell.maxNucleotides}`;

        // === TAB 1: EVOLUTION TREE ===
        const treeRoot = document.getElementById('inspTreeRoot');
        if (treeRoot && document.getElementById('tabContentTree').classList.contains('active')) {
            treeRoot.innerHTML = '';
            const g = cell.genes;

            function createNode(title, unlocked, lockedText = "Låst") {
                const div = document.createElement('div');
                div.className = `tree-node ${unlocked ? 'acquired' : 'locked'}`;
                div.innerHTML = `
                    <div class="tree-item">
                        <span>${unlocked ? '✅' : '🔒'} ${title}</span>
                    </div>
                 `;
                return div;
            }

            function createTier(name) {
                const div = document.createElement('div');
                div.className = 'tree-tier-title';
                div.innerText = name;
                return div;
            }

            // TIER 1
            const t1 = document.createElement('div');
            t1.appendChild(createTier('TIER 1 (Movement)'));
            if (g.pili) t1.appendChild(createNode('Type IV Pili', true));
            else if (g.flagellum) t1.appendChild(createNode('Flagellum', true));
            else {
                t1.appendChild(createNode('Ingen Mutation', false, "Vælg Pili eller Flagel (Auto)"));
            }
            treeRoot.appendChild(t1);

            // TIER 2
            const t2 = document.createElement('div');
            t2.appendChild(createTier('TIER 2 (Abilities)'));
            // Viser status for begge
            t2.appendChild(createNode('Toxin (E)', g.toxin));
            t2.appendChild(createNode('Protease (R)', g.protease));
            treeRoot.appendChild(t2);

            // TIER 3
            const t3 = document.createElement('div');
            t3.appendChild(createTier('TIER 3 (Upgrades)'));
            if (g.pili) {
                t3.appendChild(createNode('High-Speed Retraction', g.highSpeedRetraction));
                t3.appendChild(createNode('Multiplex Pili', g.multiplexPili));
            }
            if (g.flagellum) {
                t3.appendChild(createNode('High-Torque', g.highTorque));
            }
            t3.appendChild(createNode('Megacytose', g.megacytosis));
            treeRoot.appendChild(t3);

            // TIER 4
            const t4 = document.createElement('div');
            t4.appendChild(createTier('TIER 4 (Apex)'));
            t4.appendChild(createNode('Endocytosis', g.endocytosis));
            treeRoot.appendChild(t4);
        }

        // === TAB 2: MISSION ===
        const missionRoot = document.getElementById('inspMissionRoot');
        if (missionRoot && document.getElementById('tabContentMission').classList.contains('active')) {
            missionRoot.innerHTML = '';
            const g = cell.genes;

            function addMission(text, done) {
                const div = document.createElement('div');
                div.className = `mission-item ${done ? 'done' : ''}`;
                div.innerText = text;
                missionRoot.appendChild(div);
            }

            // Logic to determine Next Steps
            const hasMove = g.pili || g.flagellum;
            const hasT2 = g.toxin && g.protease;
            const hasSize = g.megacytosis;
            const hasEndo = g.endocytosis;

            addMission("1. Udvikl Bevægelse (Pili/Flagel)", hasMove);

            if (hasMove) {
                if (!hasT2) {
                    addMission("2. Udvikl Toxin (Angreb)", g.toxin);
                    addMission("3. Udvikl Protease (Spisning)", g.protease);
                    addMission("   (Du skal have BEGGE for at gå videre)", false);
                } else {
                    addMission("2. TIER 2 Fuldendt", true);

                    if (!hasSize) {
                        addMission("4. Voks dig stor (Megacytose)", false);
                        addMission("   (Du kan også opgradere din fart nu)", true);
                    } else {
                        addMission("4. Voks dig stor", true);

                        if (!hasEndo) {
                            addMission("5. BLIV APEX PREDATOR (Endocytose)", false);
                        } else {
                            addMission("5. APEX PREDATOR OPNÅET!", true);
                            addMission("   Spis alt. Overtag verden.", false);
                        }
                    }
                }
            }
        }

    } else {
        // Observe Mode
        document.getElementById('inspAtpVal').innerText = "-";
        // ... (clear tabs)
        const treeRoot = document.getElementById('inspTreeRoot');
        if (treeRoot) treeRoot.innerHTML = "<div style='padding:10px; color:#888'>Observe Mode<br>Klik på en celle for at overtage styringen.</div>";
    }
}

// Opdater UI (Kun de elementer der ikke er i sidebar - dvs. knapper/overlays hvis nødvendigt)
function updateUI() {
    if (!activeCell) return;

    // Vi har fjernet atpDisplay og aminoDisplay fra index.html da de er redundante.
    // Sidebar opdateres separat via updateInspectorSidebar().
}

function showInspectorSidebar(show) {
    const sidebar = document.getElementById('inspectorSidebar');
    // Sidebar håndteres nu via CSS (ingen hidden class)
}

function drawUI() {
    // UI tegnes OVENPÅ alt

    if (activeCell) {
        // ATP & Amino bars removed from bottom-left (Redundant)
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
        // Beregn Target Position (Center)
        let targetX = activeCell.x - canvas.width / 2;
        let targetY = activeCell.y - canvas.height / 2;

        // "Look Ahead" prediction removed: It caused sudden jerky jumps when state switched.
        // Instead, rely on a very lazy camera to absorb the twitch movement.

        // Smooth Camera (LERP)
        // 0.05 = Meget blød og tungt kamera. Glider roligt efter cellen.
        const smoothFactor = 0.05;
        camera.x += (targetX - camera.x) * smoothFactor;
        camera.y += (targetY - camera.y) * smoothFactor;

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
        if (!invasionTriggered && Date.now() - gameStartTime > GameConfig.World.invasionTime) {
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
            // Vi sender canvas.height med som 'viewHeight' for at beregne musens afstand ift skærmstørrelse
            activeCell.update(worldMouse, keys, worldWidth, worldHeight, null, null, canvas.height);
            checkCollisions(activeCell);
            handleDivision();
        }

        otherCells.forEach(cell => checkCollisions(cell));
        // Opdater miljøet (mad spawning, partikler)
        updateEnvironment(worldWidth, worldHeight, activeCell);
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