import { initInput, mouse, keys } from './Input.js';
import { activeCell, initPlayer, setActiveCell } from './Player.js';
import { GameConfig } from './GameConfig.js';
import {
    initEnvironment, updateEnvironment, drawEnvironment,
    checkCollisions, spawnSisterCell, otherCells, foodParticles, // [NEW] Import foodParticles
    getCellAtPosition, removeCellFromEnvironment, addCellToEnvironment,
    setMutationCallback, triggerInvasion, spawnToxinPulse, spawnProteasePulse,
    spawnMegabacillus, spawnSpecificFood, spawnBacillus, spawnBacillusChild,
    renderEnvironment, attemptMutation, performSplit
} from './Environment.js';

// --- PIXI JS SETUP ---
// --- PIXI JS SETUP ---
const app = new PIXI.Application();
const ambientMusic = new Audio('sounds/ambient_loop.mp3');
ambientMusic.loop = true;
ambientMusic.volume = 0.5;

function startMusic() {
    ambientMusic.play().catch(e => console.log("Click to start music", e));
}
window.addEventListener('click', startMusic, { once: true });
window.addEventListener('keydown', startMusic, { once: true });


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

    // Init Environment Layers are done in init() now? 
    // Actually init() calls initEnvironment which needs 'app'. 
    // We should pass 'app' to init() or keep usage consistent.
    // Let's modify init() to take app? No, initEnvironment takes app.
    // Current init() code calls initEnvironment(app). 'app' is global-ish in module?
    // 'app' is const defined in implementation_plan at top. It is module-scoped.
    // So calling init() is safe.

    // CALL MASTER INIT
    init();

    // Start Game Loop

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
let gameTimer = 0; // [NEW - Moved here]

// --- NEW UI SYSTEMS ---
setupDebugSystem();
setupPauseSystem();
setupResetSystem();
setupTimerSystem();

// Global Key Listener for Pause
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        // Let pause system handle logic if exposed, or toggle global var
        toggleGlobalPause();
    }
});



// Global Pause Toggle Helper
function toggleGlobalPause() {
    isPaused = !isPaused;
    // Update Button Text if exists
    const btn = document.getElementById('pauseBtn');
    if (btn) btn.innerText = isPaused ? "▶ START" : "⏸ PAUSE";

    // Update Overlay
    const overlay = document.getElementById('statusOverlay');
    if (overlay) {
        if (isPaused) {
            overlay.innerText = "PAUSE";
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}


// --- REWRITTEN SYSTEMS ---

function setupPauseSystem() {
    const btn = document.getElementById('pauseBtn');
    if (btn) {
        // Clear old listeners by cloning (if needed) or just assigning onclick
        btn.onclick = () => {
            toggleGlobalPause();
        };
    }
}

function setupResetSystem() {
    const btn = document.getElementById('resetBtn');
    if (btn) {
        btn.onclick = () => {
            // Confirm?
            if (confirm("Er du sikker på du vil genstarte?")) {
                location.reload(); // Hard Reset is safest for stability
            }
        };
    }
}


function setupTimerSystem() {
    const timerDisplay = document.getElementById('debugTimer') || document.getElementById('timerDisplay');
    // Ensure it exists? If user deleted it maybe create one?
    // Assuming HTML exists based on previous code.
    gameTimer = 0;
}

// Called in GameLoop to update timer
function updateGameTimer(dt) {
    if (isPaused) return;
    gameTimer += dt;

    const totalSeconds = Math.floor(gameTimer / 60); // dt is likely frames or ms?
    // Pixi ticker.deltaTime is scalar (1 = 60fps target). We need real time.
    // Use app.ticker.lastTime or accumulate seconds.
    // Actually: ticker.deltaMS is better.

    // NOTE: gameLoop passes deltaTime relative to frame target.
    // Let's use global elapsed time tracking:
    // We update this via app.ticker element elsewhere if possible, or just estimate:
    // gameTimer += (1/60) * deltaTime; // seconds
}

function setupDebugSystem() {
    if (!GameConfig.debugMode) return;

    const debugBtn = document.getElementById('debugBtn');
    const menu = document.getElementById('debugMenu');
    const closeBtn = document.getElementById('closeDebugBtn');
    const mutationList = document.getElementById('debugMutationList');
    const debugControls = document.querySelector('.debug-controls');

    // 1. Show Button
    if (debugBtn) {
        debugBtn.classList.remove('hidden');
        debugBtn.style.display = 'block';
        debugBtn.onclick = () => {
            // Open Menu
            menu.classList.remove('hidden');
            menu.style.display = 'flex';
            if (!isPaused) toggleGlobalPause();
            refreshDebugUI(); // Sync state
        };
    }

    // 2. Close Button
    if (closeBtn) {
        closeBtn.onclick = () => {
            menu.classList.add('hidden');
            menu.style.display = 'none';
            if (isPaused) toggleGlobalPause();
        };
    }

    // 3. Global Spawning Functions (for HTML Buttons)
    window.debugSpawn = (type) => {
        if (!activeCell) return;
        const x = activeCell.x + (Math.random() - 0.5) * 300;
        const y = activeCell.y + (Math.random() - 0.5) * 300;

        if (['glucose', 'amino', 'nucleotide'].includes(type)) {
            spawnSpecificFood(type, x, y);
            console.log("Debug Spawned:", type);
        }
        else if (type === 'bacillus') {
            import('./Bacillus.js').then(m => {
                addCellToEnvironment(new m.Bacillus(x, y));
                console.log("Debug Spawned: Bacillus");
            });
        }
        else if (type === 'megabacillus') {
            import('./Bacillus.js').then(m => {
                addCellToEnvironment(new m.Bacillus(x, y, true));
                console.log("Debug Spawned: Megabacillus");
            });
        }
    };

    // 4. God Mode Toggle
    let godModeCb = document.getElementById('godModeCb');
    if (!godModeCb && debugControls) {
        const row = document.createElement('div');
        row.style.marginBottom = "10px";
        row.style.borderBottom = "1px solid #444";
        row.style.paddingBottom = "10px";

        godModeCb = document.createElement('input');
        godModeCb.type = 'checkbox';
        godModeCb.id = 'godModeCb';

        const label = document.createElement('label');
        label.innerText = " GOD MODE (Infinite Resources)";
        label.style.color = "#FFD700";
        label.style.fontWeight = "bold";
        label.prepend(godModeCb);

        row.appendChild(label);
        debugControls.prepend(row);
    }

    if (godModeCb) {
        godModeCb.checked = godMode;
        godModeCb.onchange = (e) => {
            godMode = e.target.checked;
            console.log("God Mode set to:", godMode);
            // Apply immediately if active
            if (godMode && activeCell) {
                activeCell.atp = activeCell.maxAtp;
                activeCell.aminoAcids = activeCell.maxAminoAcids;
            }
        };
    }

    // 5. Mutation List (Hardcoded & Reliable)
    if (mutationList) {
        mutationList.innerHTML = ''; // Start clean

        const mutations = [
            { key: 'flagellum', label: 'Flagellum (Move)' },
            { key: 'pili', label: 'Pili (Twitch)' },
            { key: 'toxin', label: 'Toxin [E]' },
            { key: 'protease', label: 'Protease [R]' },
            { key: 'megacytosis', label: 'Megacytosis (Big)' },
            { key: 'endocytosis', label: 'Endocytosis (Eat)' },
            { key: 'highTorque', label: 'High Torque' },
            { key: 'multiplexPili', label: 'Multiplex Pili' },
            { key: 'gramPositive', label: 'Gram Positive' }
        ];

        mutations.forEach(m => {
            const div = document.createElement('div');
            div.style.marginBottom = "4px";

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.dataset.key = m.key;
            cb.id = `debug_mut_${m.key}`;

            const lbl = document.createElement('label');
            lbl.htmlFor = cb.id;
            lbl.innerText = " " + m.label;
            lbl.style.cursor = "pointer";

            // Logic: Update Active Cell immediately
            cb.onchange = (e) => {
                if (activeCell) {
                    activeCell.genes[m.key] = e.target.checked;
                    if (m.key === 'megacytosis') activeCell.updateMaxGrowth();
                    console.log(`Mutation ${m.key} -> ${e.target.checked}`);
                }
            };

            div.appendChild(cb);
            div.appendChild(lbl);
            mutationList.appendChild(div);
        });
    }
}

// Helper to Update UI state when opening menu
function refreshDebugUI() {
    const godModeCb = document.getElementById('godModeCb');
    if (godModeCb) godModeCb.checked = !!godMode;

    if (activeCell) {
        const cbs = document.querySelectorAll('#debugMutationList input');
        cbs.forEach(cb => {
            const key = cb.dataset.key;
            if (key) {
                cb.checked = !!activeCell.genes[key];
            }
        });
    }
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

    // Setup Action Callback for Player (CRITICAL fix)
    if (activeCell) {
        activeCell.onAction = (action, x, y) => {
            if (action === 'toxin') {
                spawnToxinPulse(x, y);
            } else if (action === 'protease') {
                spawnProteasePulse(x, y);
            }
        };
    }

    // Register callback for mutationer
    setMutationCallback(showMutationPopup);

    // Initialize Environment (REQUIRED for cells/food)
    initEnvironment(app);

    // Setup All Systems
    setupInspectorModal();
    setupDebugSystem();
    setupPauseSystem();
    setupResetSystem();
    setupTimerSystem();
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

    // Explicit List of Mutations to ensure order and presence
    const mutations = [
        { key: 'flagellum', label: 'Flagellum (Movement)' },
        { key: 'pili', label: 'Pili (Twitch)' },
        { key: 'toxin', label: 'Toxin [E]' },
        { key: 'protease', label: 'Protease [R]' },
        { key: 'megacytosis', label: 'Megacytosis (Size)' },
        { key: 'endocytosis', label: 'Endocytosis (Eat Cells)' },
        { key: 'highTorque', label: 'High-Torque Flagel' },
        { key: 'highSpeedRetraction', label: 'Fast Pili' },
        { key: 'multiplexPili', label: 'Multiplex Pili' },
        { key: 'gramPositive', label: 'Gram Positive (Defense)' }
    ];

    mutations.forEach(mutObj => {
        const mut = mutObj.key;
        const labelText = mutObj.label;

        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.marginBottom = '5px';
        label.style.cursor = 'pointer';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.mutation = mut;
        checkbox.style.marginRight = '10px';

        // Initial State Check
        if (activeCell && activeCell.genes[mut]) {
            checkbox.checked = true;
        }

        checkbox.onchange = (e) => {
            if (activeCell) {
                // Determine value
                const val = e.target.checked;
                activeCell.genes[mut] = val;

                // Special updates if needed
                if (mut === 'megacytosis') {
                    // Update stats immediately if size changes
                    activeCell.updateMaxGrowth();
                }

                console.log(`Debug Toggle: ${mut} = ${val}`);
            }
        };

        label.prepend(checkbox);
        label.appendChild(document.createTextNode(labelText));
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
        // [NEW] Division handled by CellDivisionTrait + Environment.performSplit
        // We only need to check if we should trigger mutation just before split?
        // Or handle generation count?

        // Actually, performSplit handles killing parent.
        // So we should detect if split happened.
        // performSplit is called by gameLoop via check.
    }
}

// --- MINIMAP FUNKTION ---


// --- NY SIDEBAR FUNKTION ---
// --- NY INSPECTOR MODAL LOGIC ---

function toggleInspect() {
    if (!activeCell) return;

    const modal = document.getElementById('inspectorModal');
    if (!modal) return; // Sikkerhed

    isInspecting = !isInspecting;

    if (isInspecting) {
        modal.classList.remove('hidden');
        // Pause spillet mens vi inspicerer
        if (!isPaused) toggleGlobalPause();

        // Opdater indhold første gang
        updateInspectorContent();

        // Marker første tab som aktiv hvis ingen er valgt
        const activeTab = document.querySelector('.modal-tab-btn.active');
        if (!activeTab) {
            document.querySelector('[data-tab="tabMutations"]').click();
        }
    } else {
        modal.classList.add('hidden');
        // Resume spil
        if (isPaused) toggleGlobalPause();
    }
}

function updateInspectorContent() {
    if (!activeCell) return;

    // Tjek hvilken tab er aktiv
    const activeTabId = document.querySelector('.modal-tab-content.active').id;

    if (activeTabId === 'tabMutations') {
        renderMutationsTab();
    } else if (activeTabId === 'tabMetabolism') {
        renderMetabolismTab();
    } else if (activeTabId === 'tabCells') {
        renderCellsTab();
    }
}

function renderMutationsTab() {
    const container = document.getElementById('mutationTreeContainer');
    container.innerHTML = ''; // Ryd

    // Simple liste af nuværende gener + beskrivelse
    // Vi kunne lave et "Tree Layout", men en pæn liste er fint nu.
    const genes = activeCell.genes;
    const tree = document.createElement('div');
    tree.className = 'mutation-list';

    // Helper til at lave items
    const addItem = (key, name, desc) => {
        const hasGene = genes[key];
        const item = document.createElement('div');
        item.className = `mutation-item ${hasGene ? 'unlocked' : 'locked'}`;

        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.innerText = hasGene ? '✅' : '🔒';

        const info = document.createElement('div');
        info.className = 'info';
        info.innerHTML = `<strong>${name}</strong><br><span style="font-size:0.8em; color:#aaa;">${desc}</span>`;

        item.appendChild(icon);
        item.appendChild(info);
        tree.appendChild(item);
    };

    // Tier 1
    addItem('flagellum', 'Monotrichous Flagellum', 'En lang hale der giver kraftig fremdrift.');
    addItem('pili', 'Type IV Pili', 'Gribekroge til twitch-bevægelse.');

    // Tier 2
    addItem('toxin', 'Toxin Secretion (E)', 'Udskil gift skyer der dræber konkurrenter.');
    addItem('protease', 'Protease Enzym (R)', 'Opløs døde celler (lig) og konverter dem til mad.');
    addItem('photoreceptor', 'Photoreceptor', 'Kan registrere lys (ikke implementeret endnu).');
    addItem('antibioticResistance', 'Antibiotic Resistance', 'Modstandsdygtig overfor visse stoffer.');

    // Tier 3
    addItem('megacytosis', 'Megacytosis', 'Dobbel størrelse og HP.');
    addItem('multiplexPili', 'Multiplex Pili', 'Bedre pili rækkevidde.');
    addItem('highTorque', 'High-Torque Flagel', 'Hurtigere bevægelse.');
    addItem('highSpeedRetraction', 'High-Speed Retraction', 'Hurtigere pili træk.');

    // Tier 4
    addItem('endocytosis', 'Endocytosis', 'Spis mindre celler direkte.');
    addItem('gramPositive', 'Gram Positive', 'Tyk cellevæg (Defense).');

    container.appendChild(tree);
}

function renderMetabolismTab() {
    const container = document.getElementById('metabolismContainer');
    container.innerHTML = '';

    if (!activeCell) return;

    // Lav visualisering af ATP / Amino / Nukleotider
    // Vi kan genbruge "Bars" fra HUD men med mere info

    const createStat = (label, val, max, color) => {
        const group = document.createElement('div');
        group.className = 'stat-group';
        group.style.marginBottom = '15px';

        const lbl = document.createElement('label');
        lbl.innerText = `${label} (${Math.floor(val)} / ${max})`;
        lbl.style.display = 'block';
        lbl.style.marginBottom = '4px';

        const barBg = document.createElement('div');
        barBg.style.width = '100%';
        barBg.style.height = '20px';
        barBg.style.background = '#222';
        barBg.style.borderRadius = '10px';
        barBg.style.overflow = 'hidden';

        const barFill = document.createElement('div');
        const pct = Math.min(100, Math.max(0, (val / max) * 100));
        barFill.style.width = `${pct}%`;
        barFill.style.height = '100%';
        barFill.style.background = color;
        barFill.style.transition = "width 0.2s";

        barBg.appendChild(barFill);
        group.appendChild(lbl);
        group.appendChild(barBg);
        container.appendChild(group);
    };

    createStat("ATP (Energi)", activeCell.atp, activeCell.maxAtp, '#00E676');
    createStat("Aminosyrer (Byggesten)", activeCell.aminoAcids, activeCell.maxAminoAcids, '#2979FF');
    createStat("Nukleotider (DNA)", activeCell.nucleotides, activeCell.maxNucleotides, '#E040FB');

    // Stats Info
    const details = document.createElement('div');
    details.innerHTML = `
        <h3 style="margin-top:20px; border-bottom:1px solid #444; padding-bottom:5px;">Stats</h3>
        <p>Speed: <span style="color:#fff">${activeCell.genes.flagellum ? "High" : "Low"}</span></p>
        <p>Defense: <span style="color:#fff">${activeCell.genes.gramPositive ? "High" : "Normal"}</span></p>
        <p>Diet: <span style="color:#fff">Omnivore (Altædende)</span></p>
    `;
    container.appendChild(details);
}

function renderCellsTab() {
    const container = document.getElementById('cellListContainer');
    container.innerHTML = '';

    // List "Other Cells"
    // Sorter: Fjender (Bacillus) først, så andre.
    const list = [...otherCells].sort((a, b) => {
        return (b.isBacillus ? 1 : 0) - (a.isBacillus ? 1 : 0);
    });

    if (list.length === 0) {
        container.innerHTML = "<p style='color:#777; padding:10px;'>Ingen andre celler i nærheden.</p>";
        return;
    }

    list.forEach(cell => {
        // Kun vis levende celler? Eller også lig?
        // Vis alle.

        const item = document.createElement('div');
        item.className = 'cell-list-item';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.background = '#1a1a1a';
        item.style.padding = '10px';
        item.style.marginBottom = '5px';
        item.style.borderRadius = '4px';
        item.style.borderLeft = cell.isBacillus ? '4px solid #FFEB3B' : '4px solid #4CAF50';

        if (!cell.alive) {
            item.style.opacity = '0.5';
            item.style.borderLeft = '4px solid #888';
        }

        const info = document.createElement('div');
        let type = cell.isBacillus ? "Bacillus (Enemy)" : "Ukendt Celle";
        if (cell.isPlayer) type = "Spiller (Klon)";
        if (!cell.alive) type += " (DØD)";

        info.innerHTML = `<strong>${type}</strong><br><span style="font-size:0.8em; color:#aaa;">HP: ${Math.floor(cell.atp)}</span>`;

        const actions = document.createElement('div');

        // POSSESS BUTTON
        const btnTake = document.createElement('button');
        btnTake.className = 'action-btn';
        btnTake.innerText = "🎮";
        btnTake.title = "Overtag Styring";
        btnTake.onclick = () => {
            // Skift til denne celle
            // Logic similar to handleCellSwitch but explicit
            const oldPlayer = activeCell;
            addCellToEnvironment(oldPlayer);
            removeCellFromEnvironment(cell); // Fjern fra otherCells array
            setActiveCell(cell);

            // Hookup callbacks
            cell.onAction = oldPlayer.onAction;
            oldPlayer.onAction = null;

            // Opdater UI & Luk Modal
            toggleInspect();
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
                // Styles
                dnaDetail.style.background = '#222';
                dnaDetail.style.padding = '8px';
                dnaDetail.style.borderRadius = '4px';
                dnaDetail.style.marginTop = '4px';
                dnaDetail.style.color = '#eee';
                dnaDetail.style.fontSize = '0.85em';
                dnaDetail.style.border = '1px solid #444';

                // Debug
                console.log("Inspecting Cell Genes (Raw):", cell.genes);

                // Build list from keys
                const active = [];
                for (const key in cell.genes) {
                    if (cell.genes[key]) {
                        // Manual formatting map
                        let name = key;
                        if (key === 'flagellum') name = 'Flagellum';
                        else if (key === 'pili') name = 'Type IV Pili';
                        else if (key === 'toxin') name = 'Toxin';
                        else if (key === 'protease') name = 'Protease';
                        else if (key === 'gramPositive') name = 'Gram Positive';
                        else if (key === 'megacytosis') name = 'Megacytosis';
                        else if (key === 'endocytosis') name = 'Endocytosis';
                        else if (key === 'highTorque') name = 'High Torque';
                        else if (key === 'highSpeedRetraction') name = 'High Speed Retraction';
                        else if (key === 'multiplexPili') name = 'Multiplex Pili';

                        active.push("• " + name);
                    }
                }

                if (active.length > 0) {
                    dnaDetail.innerHTML = "<strong>Mutationer:</strong><br>" + active.join("<br>");
                } else {
                    dnaDetail.innerHTML = "<span style='color:#aaa'>Ingen mutationer fundet.</span>";
                }
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

function setupInspectorModal() {
    const modal = document.getElementById('inspectorModal');
    const closeBtn = document.getElementById('closeInspectBtn');
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    const tabContents = document.querySelectorAll('.modal-tab-content');

    if (!modal) return;

    const inspectBtn = document.getElementById('inspectBtn');
    if (inspectBtn) {
        inspectBtn.onclick = () => {
            toggleInspect();
        };
    }

    // Close Button
    if (closeBtn) {
        closeBtn.onclick = () => {
            isInspecting = false;
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

    // Status Overlay Logic
    const statusOverlay = document.getElementById('statusOverlay');
    if (isPaused && !isInspecting) {
        statusOverlay.innerText = "PAUSE";
        statusOverlay.classList.remove('hidden');
    } else if (isObserverMode) {
        statusOverlay.innerText = "OBSERVER MODE";
        statusOverlay.classList.remove('hidden');
    } else {
        statusOverlay.classList.add('hidden');
    }

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

function updateCamera() {
    if (activeCell) {
        // Beregn Target Position (Center)
        let targetX = activeCell.x - app.screen.width / 2;
        let targetY = activeCell.y - app.screen.height / 2;



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
        if (mouse.x > app.screen.width - edgeSize) camera.x += speed;
        if (mouse.y < edgeSize) camera.y -= speed;
        if (mouse.y > app.screen.height - edgeSize) camera.y += speed;
    }

    if (isNaN(camera.x) || isNaN(camera.y)) {
        console.error("CAMERA IS NAN!", camera);
        camera.x = 0;
        camera.y = 0;
    }

    // Hold kamera inden for verdenens grænser
    camera.x = Math.max(0, Math.min(camera.x, worldWidth - app.screen.width));
    camera.y = Math.max(0, Math.min(camera.y, worldHeight - app.screen.height));
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
            space: keys[' '],
            e: keys['e'],
            r: keys['r'],
            m: keys['m']
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
            x: mouse.x + camera.x,
            y: mouse.y + camera.y
        };

        // --- TIMER ---
        // Pixi's delta is "frame-dependent" (1 = 1 frame at 60fps). 
        // Approx 1/60th of a second per delta unit.
        updateGameTimer(deltaTime / 60);

        // Update Cell with WORLD dimensions, not screen dimensions
        activeCell.update(worldMouse, input, worldWidth, worldHeight, foodParticles, otherCells, height);

        checkCollisions(activeCell);
        handleDivision();

        // 3. Environment Update + VISUALS
        // Use Global World Dimensions for spawning, not screen size
        updateEnvironment(worldWidth, worldHeight, activeCell);
        renderEnvironment(activeCell); // [NEW] Pixi Sync

        // --- CAMERA UPDATE ---
        updateCamera();

        // Apply Camera to World Container
        if (window.setCameraPosition) {
            // Container position is inverse of camera (if camera moves right, world moves left)
            window.setCameraPosition(-camera.x, -camera.y);
        }
    } else {
        // [Observer Mode / No Player]
        // Still verify collisions/logic for NPCs? Maybe.
        // For now, at least update environment visuals
        updateEnvironment(worldWidth, worldHeight, null); // [NEW] visual update
        renderEnvironment(null);
        updateCamera();
        if (window.setCameraPosition) window.setCameraPosition(-camera.x, -camera.y);
    }

    // [MOVED] Input Handling (Switch/Possess) must happen ALWAYS
    handleCellSwitch();

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