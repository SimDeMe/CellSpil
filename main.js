import { initInput, mouse, keys } from './Input.js';
import { activeCell, initPlayer, setActiveCell } from './Player.js';
import { GameConfig } from './GameConfig.js';
import {
    initEnvironment, updateEnvironment, drawEnvironment,
    checkCollisions, spawnSisterCell, otherCells, foodParticles, // [NEW] Import foodParticles
    getCellAtPosition, removeCellFromEnvironment, addCellToEnvironment,
    setMutationCallback, triggerInvasion, spawnToxinPulse, spawnProteasePulse,
    spawnMegabacillus, spawnSpecificFood, spawnBacillus, spawnBacillusChild,
    renderEnvironment, attemptMutation // [NEW]
} from './Environment.js';

// --- PIXI JS SETUP ---
// --- PIXI JS SETUP ---
const app = new PIXI.Application();

// Define World Dimensions Early
const worldWidth = GameConfig.World.width;
const worldHeight = GameConfig.World.height;

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

// Async Init
(async () => {
    await app.init({
        background: '#0d1117',
        resizeTo: window, // This handles canvas resizing
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1
    });

    // Append to container
    const container = document.getElementById('game-container');
    if (container) {
        container.appendChild(app.canvas);
    } else {
        document.body.appendChild(app.canvas);
    }

    // Init Environment Layers
    initEnvironment(app);

    // Init Player (Center of World)
    initPlayer(worldWidth, worldHeight);

    // Init Debug UI (Restored)
    initDebugUI();

    // Init Input (Crucial!)
    initInput();

    // Start Game Loop
    app.ticker.add((ticker) => {
        gameLoop(ticker.deltaTime); // Pixi passes ticker
    });
})();

// Helper to update dimensions (Pixi handles resizeTo, but we sync vars)
window.addEventListener('resize', () => {
    canvasWidth = app.screen.width;
    canvasHeight = app.screen.height;
});

// Camera object for logic references (if any)
const camera = { x: 0, y: 0 };

let isPaused = false;
let isInspecting = false;
let isObserverMode = false;
let generation = 1;
let gameStartTime = Date.now();
let invasionTriggered = false;
let godMode = false; // [NEW]

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

    // Vis/Skjul Modal
    const modal = document.getElementById('inspectorModal');
    if (modal) {
        if (isInspecting) {
            modal.classList.remove('hidden');
            updateInspectorContent(); // Load content immediately
        } else {
            modal.classList.add('hidden');
        }
    }
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
    // [FIX] Dont switch if we mutated the player directly (newCell === activeCell)
    if (newCell && newCell !== activeCell) {
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
    setupInspectorModal();

    // Setup Debug UI
    initDebugUI();
}

function initDebugUI() {
    if (!GameConfig.debugMode) return;

    const debugBtn = document.getElementById('debugBtn');
    const debugTimer = document.getElementById('debugTimer');
    const menu = document.getElementById('debugMenu');
    const closeBtn = document.getElementById('closeDebugBtn');

    if (debugBtn) {
        debugBtn.classList.remove('hidden');
        debugBtn.style.display = 'block';

        debugBtn.onclick = () => {
            menu.classList.remove('hidden');
            menu.style.display = 'flex';
            updateDebugMutations();
            if (!isPaused) togglePause();
        };
    }

    if (debugTimer) {
        debugTimer.classList.remove('hidden');
        debugTimer.style.display = 'flex';
    }

    if (closeBtn && menu) {
        closeBtn.onclick = () => {
            menu.classList.add('hidden');
            menu.style.display = 'none';
            if (isPaused) togglePause();
        };
    }

    // God Mode Checkbox
    const debugControls = document.querySelector('.debug-controls');
    // Check if God Mode checkbox already exists to avoid duplicates
    if (debugControls && !document.getElementById('godModeCb')) {
        const godModeLabel = document.createElement('label');
        godModeLabel.style.display = 'block';
        godModeLabel.style.marginTop = '10px';
        godModeLabel.style.color = '#FFD700'; // Gold

        const godModeCb = document.createElement('input');
        godModeCb.id = 'godModeCb';
        godModeCb.type = 'checkbox';
        godModeCb.style.marginRight = '5px';
        godModeCb.checked = godMode;
        godModeCb.onchange = (e) => {
            godMode = e.target.checked;
            console.log("God Mode:", godMode);
        };

        godModeLabel.appendChild(godModeCb);
        godModeLabel.appendChild(document.createTextNode("GOD MODE (Infinite Resources)"));
        debugControls.appendChild(godModeLabel);
    }

    // Populate Mutations
    renderDebugMutations();

    // Window Functions for HTML Buttons
    window.debugSpawn = function (type) {
        if (!activeCell) return;

        // Spawn near player
        const x = activeCell.x + (Math.random() - 0.5) * 200;
        const y = activeCell.y + (Math.random() - 0.5) * 200;

        if (type === 'glucose' || type === 'amino' || type === 'nucleotide') {
            spawnSpecificFood(type, x, y);
            console.log("Spawned " + type);
        } else if (type === 'bacillus') {
            // Dynamic import to avoid circular dependency issues if any
            import('./Bacillus.js').then(m => {
                const b = new m.Bacillus(x, y);
                addCellToEnvironment(b);
            });
        } else if (type === 'megabacillus') {
            import('./Bacillus.js').then(m => {
                const mb = new m.Bacillus(x, y, true);
                addCellToEnvironment(mb);
            });
        }
        console.log("Debug Spawn:", type);
    };
}

function renderDebugMutations() {
    const list = document.getElementById('debugMutationList');
    if (!list) return;

    list.innerHTML = '';
    const mutations = Object.keys(GameConfig.Player.mutationCosts);
    mutations.forEach(mut => {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.innerText = mut;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.mutation = mut;
        checkbox.style.marginRight = '10px';

        if (activeCell && activeCell.genes[mut]) {
            checkbox.checked = true;
        }

        checkbox.onchange = (e) => {
            if (activeCell) {
                activeCell.genes[mut] = e.target.checked;
                activeCell.updateMaxGrowth();
                console.log(`Toggled ${mut}: ${e.target.checked}`);
            }
        };

        label.prepend(checkbox);
        list.appendChild(label);
    });
}

function updateDebugMutations() {
    if (!activeCell) return;
    const checkboxes = document.querySelectorAll('#debugMutationList input');
    checkboxes.forEach(cb => {
        const mut = cb.dataset.mutation;
        cb.checked = !!activeCell.genes[mut];
    });
}

function handleCellSwitch() {
    // Konverter musens skærm-koordinater til verdens-koordinater
    const mouseWorldX = mouse.x + camera.x;
    const mouseWorldY = mouse.y + camera.y;

    if (mouse.clicked) {
        const clickedCell = getCellAtPosition(mouseWorldX, mouseWorldY);

        if (clickedCell) {
            // [FIX] Prevent clicking enemies unless in debug mode
            if (clickedCell.isBacillus && !GameConfig.debugMode) {
                return;
            }

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
    if (activeCell && keys.m && activeCell.aminoAcids >= activeCell.maxAminoAcids) {
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

            // 1. MUTATION: Try to evolve the MOTHER (Player)
            attemptMutation(mother);

            // 2. SPAWN SISTER: Clone of current genes (or pre-mutation? Logic uses mother.genes ref)
            // Since we mutated mother instantly, sister gets same genes. 
            // That's fine, evolved parent makes evolved offspring.
            if (mother.isBacillus) {
                spawnBacillusChild(mother.x, mother.y, mother.isMegabacillus);
            } else {
                spawnSisterCell(mother.x, mother.y, mother.genes, true);
            }

            // Reset moderen (Cost of division)
            mother.aminoAcids = 0;
            mother.aminoAcids = 0;
            mother.radius = mother.minRadius;
            // Shift mother slightly left/right against child?
            // Animation separates them, so logical shift is fine.
            mother.x -= 10;

            generation++;

            // Nulstil division state
            mother.finalizeDivision();
            keys.m = false; // Reset key to prevent double spawn
        }
    }
}

// --- MINIMAP FUNKTION ---


// --- NY SIDEBAR FUNKTION ---
// --- NY INSPECTOR MODAL LOGIC ---

function setupInspectorModal() {
    const modal = document.getElementById('inspectorModal');
    const closeBtn = document.getElementById('closeInspectBtn');
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    const tabContents = document.querySelectorAll('.modal-tab-content');

    if (!modal) return;

    // Close Button
    if (closeBtn) {
        closeBtn.onclick = () => {
            isInspecting = false;
            // Unpause if we were paused automatically? 
            // Better UX: keep paused, let user unpause manually via space/button, 
            // OR consistent with sidebar: close = unpause?
            // Let's stick to simple visibility toggle here.
            modal.classList.add('hidden');
            togglePause(); // Resume game
        };
    }

    // Tabs
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');

            // Force refresh content
            if (activeCell) updateInspectorContent();
        };
    });
}

// --- HUD UPDATE FUNCTION ---
function updateHUD() {
    // Opdater Gen & Population
    document.getElementById('hudGen').innerText = generation;
    const pop = otherCells.filter(c => !c.isBacillus && c.alive).length + (activeCell ? 1 : 0);
    document.getElementById('hudPop').innerText = pop;

    if (activeCell) {
        // ATP
        const atpPct = (activeCell.atp / activeCell.maxAtp) * 100;
        const atpBar = document.getElementById('hudAtpBar');
        if (atpBar) atpBar.style.width = atpPct + '%';
        const atpVal = document.getElementById('hudAtpVal');
        if (atpVal) atpVal.innerText = `${Math.floor(activeCell.atp)} / ${activeCell.maxAtp}`;

        // Amino
        const aminoPct = (activeCell.aminoAcids / activeCell.maxAminoAcids) * 100;
        const aminoBar = document.getElementById('hudAminoBar');
        if (aminoBar) aminoBar.style.width = aminoPct + '%';
        const aminoVal = document.getElementById('hudAminoVal');
        if (aminoVal) aminoVal.innerText = `${activeCell.aminoAcids} / ${activeCell.maxAminoAcids}`;

        // Nucleotides
        const nucleoPct = (activeCell.nucleotides / activeCell.maxNucleotides) * 100;
        const nucleoBar = document.getElementById('hudNucleoBar');
        if (nucleoBar) nucleoBar.style.width = nucleoPct + '%';
        const nucleoVal = document.getElementById('hudNucleoVal');
        if (nucleoVal) nucleoVal.innerText = `${activeCell.nucleotides} / ${activeCell.maxNucleotides}`;

    } else {
        // Observer Mode / Dead
        document.getElementById('hudAtpVal').innerText = "-";
        document.getElementById('hudAminoVal').innerText = "-";
        document.getElementById('hudNucleoVal').innerText = "-";
        if (document.getElementById('hudAtpBar')) document.getElementById('hudAtpBar').style.width = '0%';
        if (document.getElementById('hudAminoBar')) document.getElementById('hudAminoBar').style.width = '0%';
        if (document.getElementById('hudNucleoBar')) document.getElementById('hudNucleoBar').style.width = '0%';
    }
}

function updateInspectorContent() {
    if (!activeCell) return; // Kan ikke inspicere null

    // Determine active tab
    const activeTabContent = document.querySelector('.modal-tab-content.active');
    if (!activeTabContent) return;
    const tabId = activeTabContent.id;

    if (tabId === 'tabMutations') {
        renderMutationTab();
    } else if (tabId === 'tabMetabolism') {
        renderMetabolismTab();
    } else if (tabId === 'tabCells') {
        renderCellsTab();
    }
}

function renderMutationTab() {
    const container = document.getElementById('mutationTreeContainer');
    if (!container) return;
    container.innerHTML = ''; // Clear

    const g = activeCell.genes;

    // Helper to create nodes
    function createNode(title, unlocked, customClass = '') {
        const div = document.createElement('div');
        div.className = `tree-node ${unlocked ? 'acquired' : 'locked'} ${customClass}`;
        div.innerHTML = `
            <div class="tree-item">
                <span>${unlocked ? '✅' : '🔒'} ${title}</span>
            </div>`;
        return div;
    }

    function createTier(name) {
        const div = document.createElement('div');
        div.className = 'tree-tier-title';
        div.innerText = name;
        div.style.marginTop = '15px';
        return div;
    }

    // LISTE OVER ALLE MULIGE MUTATIONER (Hardcoded hierarchy visual)

    // TIER 1
    container.appendChild(createTier('TIER 1 (Movement)'));
    container.appendChild(createNode('Flagellum (Hale)', g.flagellum));
    container.appendChild(createNode('Type IV Pili (Gribekroge)', g.pili));

    // TIER 2
    container.appendChild(createTier('TIER 2 (Abilities)'));
    container.appendChild(createNode('Toxin (Giftudskillelse) [E]', g.toxin));
    container.appendChild(createNode('Protease (Lig-spisning) [R]', g.protease));
    container.appendChild(createNode('Gram Positiv (Cellevæg forvar)', g.gramPositive));

    // TIER 3
    container.appendChild(createTier('TIER 3 (Specialization)'));
    // Conditional display or just list all? Listing all shows potential.
    container.appendChild(createNode('High-Torque Flagel (Super Fart)', g.highTorque));
    container.appendChild(createNode('High-Speed Retraction (Hurtig Pili)', g.highSpeedRetraction));
    container.appendChild(createNode('Multiplex Pili (Flere Pili)', g.multiplexPili));
    container.appendChild(createNode('Megacytose (Kæmpe Vækst)', g.megacytosis));

    // TIER 4
    container.appendChild(createTier('TIER 4 (Apex Predator)'));
    container.appendChild(createNode('Endocytose (Spis levende celler)', g.endocytosis));
}

function renderMetabolismTab() {
    const container = document.getElementById('metabolismContainer');
    if (!container) return;
    container.innerHTML = '';

    // Lige nu er det statisk for vores simple celle, men struktur til fremtid
    const pathways = [
        { name: "Glykolyse", type: "Catabolic", desc: "Nedbryder glukose til pyruvat. Giver lidt ATP.", active: true },
        { name: "Mælkesyrefermentering", type: "Fermentation", desc: "Omdanner pyruvat til laktat for at genbruge NAD+. Ingen ilt kræves.", active: true },
        // Placeholder for future stuff
        { name: "Respiration (Aerob)", type: "Respiration", desc: "Kræver ilt. Giver MEGET ATP. (Ikke udviklet)", active: false },
        { name: "Fotosyntese", type: "Anabolic", desc: "Bruger lys til at lave sukker. (Ikke udviklet)", active: false }
    ];

    pathways.forEach(p => {
        const div = document.createElement('div');
        div.style.padding = "10px";
        div.style.marginBottom = "10px";
        div.style.background = p.active ? "rgba(105, 240, 174, 0.1)" : "rgba(255, 255, 255, 0.05)";
        div.style.borderLeft = p.active ? "3px solid #69F0AE" : "3px solid #555";
        div.style.opacity = p.active ? "1" : "0.5";

        div.innerHTML = `
            <h4 style="margin: 0 0 5px 0; color: ${p.active ? '#69F0AE' : '#888'}">${p.name}</h4>
            <p style="margin:0; font-size:12px; color: #ccc">${p.desc}</p>
        `;
        container.appendChild(div);
    });
}

function renderCellsTab() {
    const container = document.getElementById('cellListContainer');
    if (!container) return;
    container.innerHTML = '<h3>Tilgængelige Celler</h3>';

    // Find kandidater (Ikke Bacillus, Levende, Ikke aktiv spiller)
    const candidates = otherCells.filter(c => !c.isBacillus && c.alive && c !== activeCell);

    if (candidates.length === 0) {
        container.innerHTML += '<p style="color:#888;">Ingen andre overtagelige celler i nærheden.</p>';
        return;
    }

    candidates.forEach((cell, index) => {
        const item = document.createElement('div');
        item.className = 'cell-list-item';

        // Preview (Color dot)
        // Check for dominant gene for color/icon?
        let icon = "🦠";
        if (cell.genes.flagellum) icon = "🚩";
        else if (cell.genes.pili) icon = "🤏";

        // Info
        const info = document.createElement('div');
        info.className = 'cell-info';
        info.innerHTML = `
            <h4>Celle #${index + 1}</h4>
            <p>ATP: ${Math.floor(cell.atp)} | Amino: ${cell.aminoAcids}</p>
        `;

        // Actions
        const actions = document.createElement('div');
        actions.className = 'cell-actions';

        // TAKE OVER
        const btnTake = document.createElement('button');
        btnTake.className = 'action-btn';
        btnTake.innerText = "Overtag";
        btnTake.onclick = () => {
            // Switch Logic (reused from handleCellSwitch logic somewhat)
            const oldPlayer = activeCell;
            addCellToEnvironment(oldPlayer);
            removeCellFromEnvironment(cell); // Fjern fra otherCells
            setActiveCell(cell);

            // Overfør callback
            cell.onAction = oldPlayer.onAction;
            oldPlayer.onAction = null;

            // Close modal & Resume
            document.getElementById('inspectorModal').classList.add('hidden');
            isInspecting = false;
            isPaused = false;
            document.getElementById('pauseBtn').innerText = "⏸ PAUSE";

            console.log("Switched to cell via Inspector");
        };

        // DNA BUTTON
        const btnDna = document.createElement('button');
        btnDna.className = 'action-btn secondary';
        btnDna.innerText = "🧬";
        btnDna.title = "Vis Gener";

        // Container for DNA detail (hidden by default)
        const dnaDetail = document.createElement('div');
        dnaDetail.className = 'dna-details hidden';
        dnaDetail.style.display = 'none';

        btnDna.onclick = () => {
            if (dnaDetail.style.display === 'none') {
                dnaDetail.style.display = 'block';
                // Build gene string
                const g = cell.genes;
                const traits = [];
                if (g.flagellum) traits.push("Flagellum");
                if (g.pili) traits.push("Pili");
                if (g.toxin) traits.push("Toxin");
                if (g.protease) traits.push("Protease");
                if (g.megacytosis) traits.push("Megacytosis");
                // ... add others
                dnaDetail.innerText = traits.length > 0 ? traits.join(", ") : "Ingen mutationer";
            } else {
                dnaDetail.style.display = 'none';
            }
        };

        actions.appendChild(btnTake);
        actions.appendChild(btnDna);

        item.appendChild(info);
        item.appendChild(actions);

        // Wrap item + details
        const wrapper = document.createElement('div');
        wrapper.appendChild(item);
        wrapper.appendChild(dnaDetail);

        container.appendChild(wrapper);
    });
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

// Variable frame time is handled by Pixi ticker.deltaTime
function gameLoop(deltaTime) {
    if (isPaused) return;

    // Dimensions
    const width = app.screen.width;
    const height = app.screen.height;

    // --- GAME LOGIC ---
    if (activeCell) {
        // Player Input
        const input = {
            up: keys['w'] || keys['arrowup'],
            down: keys['s'] || keys['arrowdown'],
            left: keys['a'] || keys['arrowleft'],
            right: keys['d'] || keys['arrowright'],
            space: keys[' ']
        };

        // Logic updates use mouse x/y directly. 
        // We need to inverse transform the mouse (Screen -> World).
        // Since camera centers on player:
        // ScreenCenter = PlayerWorldPos.
        // ScreenMouse = Mouse.
        // WorldMouse - PlayerWorldPos = ScreenMouse - ScreenCenter.
        // WorldMouse = PlayerWorldPos + (ScreenMouse - ScreenCenter).

        const centerX = width / 2;
        const centerY = height / 2;
        const worldMouse = {
            x: activeCell.x + (mouse.x - centerX),
            y: activeCell.y + (mouse.y - centerY)
        };

        // Update Cell with WORLD dimensions, not screen dimensions
        activeCell.update(worldMouse, input, worldWidth, worldHeight, foodParticles, otherCells, height);

        checkCollisions(activeCell);
        handleDivision();

        // 3. Environment Update + VISUALS
        // Use Global World Dimensions for spawning, not screen size
        updateEnvironment(worldWidth, worldHeight, activeCell);
        renderEnvironment(activeCell); // [NEW] Pixi Sync
        handleCellSwitch(); // was processInput()

        // --- CAMERA UPDATE ---
        // Center on active cell
        // container.position = -cell + center
        // Pivot is usually 0,0. We move the container.
        const camX = centerX - activeCell.x;
        const camY = centerY - activeCell.y;

        if (window.setCameraPosition) {
            window.setCameraPosition(camX, camY);
        }
    }

    // UI Updates
    updateHUD();
    drawMinimap();

    // --- GOD MODE ---
    if (godMode && activeCell) {
        activeCell.atp = activeCell.maxAtp;
        activeCell.aminoAcids = activeCell.maxAminoAcids;
        activeCell.nucleotides = activeCell.maxNucleotides;
    }
}

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

        if (!cell.alive) {
            miniCtx.fillStyle = '#888'; // Lig
        } else if (cell.isBacillus) {
            miniCtx.fillStyle = '#FFEB3B'; // Enemy
        } else {
            miniCtx.fillStyle = '#4CAF50'; // Neutral/Green
        }
        miniCtx.fill();
    });

    // 4. Spilleren
    if (activeCell) {
        const px = activeCell.x * scale;
        const py = activeCell.y * scale;
        miniCtx.beginPath();
        miniCtx.arc(px, py, 3, 0, Math.PI * 2);
        miniCtx.fillStyle = '#4CAF50'; // Player Green
        miniCtx.fill();
        miniCtx.strokeStyle = '#FFF';
        miniCtx.lineWidth = 1;
        miniCtx.stroke();
    }

    // 5. Kamera Viewport
    miniCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    miniCtx.lineWidth = 1;
    // Camera isn't global object with w/h anymore in new loop, but we have app.screen
    // The camera 'x,y' logic in old main.js was 'top-left'. 
    // In new loop we calculate `camX, camY` as top-left of view.
    // We should probably expose `camera` object or store it.
    // For now, let's recalculate based on activeCell center.
    if (activeCell) {
        const camX = activeCell.x - app.screen.width / 2;
        const camY = activeCell.y - app.screen.height / 2;

        const rectX = camX * scale;
        const rectY = camY * scale;
        const rectW = app.screen.width * scale;
        const rectH = app.screen.height * scale;

        miniCtx.strokeRect(rectX, rectY, rectW, rectH);
    }
}

// Remove legacy init calls (The IIFE at top handles it)

// End of Game Loop