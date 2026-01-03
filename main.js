import { initInput, mouse, keys } from './Input.js';
import { activeCell, initPlayer, setActiveCell } from './Player.js';
import { GameConfig } from './GameConfig.js';
import {
    initEnvironment, updateEnvironment, drawEnvironment,
    checkCollisions, spawnSisterCell, otherCells, foodParticles,
    getCellAtPosition, removeCellFromEnvironment, addCellToEnvironment,
    setMutationCallback, setEventCallback, setMute, // [UPDATED]
    triggerInvasion, spawnToxinPulse, spawnProteasePulse,
    spawnMegabacillus, spawnSpecificFood, spawnBacillus, spawnBacillusChild,
    renderEnvironment, attemptMutation, performSplit
} from './Environment.js';

// --- PIXI JS SETUP ---
const app = new PIXI.Application();
const ambientMusic = new Audio('sounds/ambient_loop.mp3');
ambientMusic.loop = true;
ambientMusic.volume = 0.5;

function startMusic() {
    if (!ambientMusic.muted) {
        ambientMusic.play().catch(e => console.log("Click to start music", e));
    }
}
window.addEventListener('click', startMusic, { once: true });
window.addEventListener('keydown', startMusic, { once: true });

const worldWidth = GameConfig.World.width;
const worldHeight = GameConfig.World.height;

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

// Async Init
(async () => {
    await app.init({
        background: '#0d1117',
        resizeTo: window,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1
    });

    const container = document.getElementById('game-container');
    if (container) {
        container.appendChild(app.canvas);
    } else {
        document.body.appendChild(app.canvas);
    }

    init();

    app.ticker.add((ticker) => {
        gameLoop(ticker.deltaTime);
    });
})();

window.addEventListener('resize', () => {
    canvasWidth = app.screen.width;
    canvasHeight = app.screen.height;
});

const camera = { x: 0, y: 0 };

let isPaused = false;
let isInspecting = false;
let isObserverMode = false;
let generation = 1;
let gameStartTime = Date.now();
let invasionTriggered = false;
let godMode = false;
let gameTimer = 0;
let isMuted = false;

// --- NEW UI SYSTEMS ---
setupDebugSystem();
setupPauseSystem();
setupResetSystem();
setupTimerSystem();
setupProductionUI(); // [NEW]
setupMuteButton(); // [NEW]

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        toggleGlobalPause();
    }
});

function toggleGlobalPause() {
    isPaused = !isPaused;
    const btn = document.getElementById('pauseBtn');
    if (btn) btn.innerText = isPaused ? "▶ START" : "⏸ PAUSE";

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

function toggleMute() {
    isMuted = !isMuted;
    ambientMusic.muted = isMuted;
    setMute(isMuted); // Environment SFX
    const btn = document.getElementById('muteBtn');
    if (btn) btn.innerText = isMuted ? "🔇" : "🔊";
}

function setupMuteButton() {
    // Add to top-left controls area
    const controls = document.querySelector('.controls-top-left');
    if (controls && !document.getElementById('muteBtn')) {
        const btn = document.createElement('button');
        btn.id = 'muteBtn';
        btn.className = 'hud-btn';
        btn.innerText = "🔊";
        btn.onclick = toggleMute;
        controls.appendChild(btn);
    }
}

function setupPauseSystem() {
    const btn = document.getElementById('pauseBtn');
    if (btn) {
        btn.onclick = () => {
            toggleGlobalPause();
        };
    }
}

function setupResetSystem() {
    const btn = document.getElementById('resetBtn');
    if (btn) {
        btn.onclick = () => {
            if (confirm("Er du sikker på du vil genstarte?")) {
                location.reload();
            }
        };
    }
}

function setupTimerSystem() {
    // Add Timer Display to HUD
    const hud = document.getElementById('hud-stats');
    if (hud && !document.getElementById('gameTimerDisplay')) {
        const div = document.createElement('div');
        div.style.marginTop = '10px';
        div.innerHTML = 'Time: <span id="gameTimerDisplay">00:00</span>';
        div.style.color = '#FFF';
        div.style.fontSize = '1.2em';
        hud.prepend(div); // Add to top of stats
    }
    gameTimer = 0;
}

function setupProductionUI() {
    // Add Production Buttons
    let container = document.getElementById('productionControls');
    if (!container) {
        container = document.createElement('div');
        container.id = 'productionControls';
        container.style.position = 'absolute';
        container.style.bottom = '20px';
        container.style.right = '20px'; // Bottom Right
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    } else {
        container.innerHTML = ''; // Clear if re-setup
    }

    // Style helper
    const styleBtn = (btn, color) => {
        btn.className = 'hud-btn'; // Reuse class
        btn.style.background = color;
        btn.style.color = '#000';
        btn.style.fontWeight = 'bold';
        btn.style.padding = '10px 15px';
        btn.style.border = 'none';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '0.9em';
    };

    // Toxin Button
    const btnToxin = document.createElement('button');
    btnToxin.innerText = "Synthesize Toxin (15 ATP, 1 Amino)";
    styleBtn(btnToxin, '#00E676');
    btnToxin.onclick = () => { if (activeCell) activeCell.produce('toxin'); };

    // Enzyme Button
    const btnEnzyme = document.createElement('button');
    btnEnzyme.innerText = "Synthesize Enzyme (10 ATP, 1 Amino)";
    styleBtn(btnEnzyme, '#E91E63');
    btnEnzyme.onclick = () => { if (activeCell) activeCell.produce('protease'); };

    container.appendChild(btnToxin);
    container.appendChild(btnEnzyme);
}

function updateGameTimer(dt) {
    if (isPaused) return;
    gameTimer += dt; // Seconds

    const display = document.getElementById('gameTimerDisplay');
    if (display) {
        const m = Math.floor(gameTimer / 60);
        const s = Math.floor(gameTimer % 60);
        display.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
}

function setupDebugSystem() {
    if (!GameConfig.debugMode) return;

    const debugBtn = document.getElementById('debugBtn');
    const menu = document.getElementById('debugMenu');
    const closeBtn = document.getElementById('closeDebugBtn');
    const mutationList = document.getElementById('debugMutationList');
    const debugControls = document.querySelector('.debug-controls');

    if (debugBtn) {
        debugBtn.classList.remove('hidden');
        debugBtn.style.display = 'block';
        debugBtn.onclick = () => {
            menu.classList.remove('hidden');
            menu.style.display = 'flex';
            if (!isPaused) toggleGlobalPause();
            refreshDebugUI();
        };
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            menu.classList.add('hidden');
            menu.style.display = 'none';
            if (isPaused) toggleGlobalPause();
        };
    }

    window.debugSpawn = (type) => {
        if (!activeCell) return;
        const x = activeCell.x + (Math.random() - 0.5) * 300;
        const y = activeCell.y + (Math.random() - 0.5) * 300;

        if (['glucose', 'amino', 'nucleotide'].includes(type)) {
            spawnSpecificFood(type, x, y);
        } else if (type === 'bacillus') {
            import('./Bacillus.js').then(m => {
                addCellToEnvironment(new m.Bacillus(x, y));
            });
        } else if (type === 'megabacillus') {
            import('./Bacillus.js').then(m => {
                addCellToEnvironment(new m.Bacillus(x, y, true));
            });
        }
    };

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

    let mutRateInput = document.getElementById('mutRateInput');
    if (!mutRateInput && debugControls) {
        const row = document.createElement('div');
        row.style.marginBottom = "10px";
        row.style.borderBottom = "1px solid #444";
        row.style.paddingBottom = "10px";
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "10px";

        mutRateInput = document.createElement('input');
        mutRateInput.type = 'range';
        mutRateInput.id = 'mutRateInput';
        mutRateInput.min = "0";
        mutRateInput.max = "1";
        mutRateInput.step = "0.1";
        mutRateInput.value = GameConfig.Player.mutationRate;

        const label = document.createElement('label');
        label.id = 'mutRateLabel';
        label.style.color = "#FFF";
        label.innerText = `Mut. Rate: ${(GameConfig.Player.mutationRate * 100).toFixed(0)}%`;

        mutRateInput.oninput = (e) => {
             const val = parseFloat(e.target.value);
             GameConfig.Player.mutationRate = val;
             label.innerText = `Mut. Rate: ${(val * 100).toFixed(0)}%`;
        };

        row.appendChild(mutRateInput);
        row.appendChild(label);
        debugControls.appendChild(row);
    }

    if (godModeCb) {
        godModeCb.checked = godMode;
        godModeCb.onchange = (e) => {
            godMode = e.target.checked;
            if (godMode && activeCell) {
                activeCell.atp = activeCell.maxAtp;
                activeCell.aminoAcids = activeCell.maxAminoAcids;
            }
        };
    }

    if (mutationList) {
        mutationList.innerHTML = '';

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

            cb.onchange = (e) => {
                if (activeCell) {
                    activeCell.genes[m.key] = e.target.checked;
                    if (m.key === 'megacytosis') activeCell.updateMaxGrowth();
                }
            };

            div.appendChild(cb);
            div.appendChild(lbl);
            mutationList.appendChild(div);
        });
    }
}

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
    }
}

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
    } else if (mutationType === 'atpStorage') {
        title.innerText = "Ny Mutation: ATP Lager!";
        desc.innerText = "Tier 3. Øger max ATP med 10%. Kan stackes.";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.atpStorage} Aminosyrer.`;
    } else if (mutationType === 'aminoStorage') {
        title.innerText = "Ny Mutation: Aminosyre Lager!";
        desc.innerText = "Tier 3. Øger max Aminosyrer med 10%. Kan stackes.";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.aminoStorage} Aminosyrer.`;
    } else if (mutationType === 'nucleotideStorage') {
        title.innerText = "Ny Mutation: Nukleotid Lager!";
        desc.innerText = "Tier 3. Øger max Nukleotider med 10%. Kan stackes.";
        cost.innerText = `PRIS: +${GameConfig.Player.mutationCosts.nucleotideStorage} Aminosyrer.`;
    }

    if (newCell && newCell !== activeCell) {
        const oldPlayer = activeCell;
        if (oldPlayer) {
            addCellToEnvironment(oldPlayer);
        }
        removeCellFromEnvironment(newCell);
        setActiveCell(newCell);

        if (oldPlayer) {
            newCell.onAction = oldPlayer.onAction;
            oldPlayer.onAction = null;
        }

        updateCamera();
        console.log("Auto-switched to new mutated cell! Coords:", newCell.x, newCell.y);
    }

    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            popup.classList.add('hidden');
            popup.style.display = 'none';
        }, 500);
    }, 5000);
}

function showEventPopup(titleText, descText, costText) {
    const popup = document.getElementById('mutationPopup');
    const title = document.getElementById('mutTitle');
    const desc = document.getElementById('mutDesc');
    const cost = document.getElementById('mutCost');

    title.innerText = titleText;
    desc.innerText = descText;
    cost.innerText = costText;

    title.style.color = '#FF5252';
    popup.style.borderColor = '#FF5252';

    popup.classList.remove('hidden');
    popup.style.opacity = '1';
    popup.style.display = 'block';

    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            popup.classList.add('hidden');
            popup.style.display = 'none';
            title.style.color = '#69F0AE';
            popup.style.borderColor = '#69F0AE';
        }, 500);
    }, 8000);
}

function init() {
    initInput();
    initPlayer(worldWidth, worldHeight);

    if (activeCell) {
        activeCell.onAction = (action, x, y, angle) => {
            if (action === 'toxin') {
                spawnToxinPulse(x, y, angle);
            } else if (action === 'protease') {
                spawnProteasePulse(x, y, angle);
            }
        };
    }

    setMutationCallback(showMutationPopup);
    setEventCallback(showEventPopup); // [NEW]

    initEnvironment(app);

    setupInspectorModal();
    setupDebugSystem();
    setupPauseSystem();
    setupResetSystem();
    setupTimerSystem();
    setupProductionUI(); // [NEW]
    setupMuteButton(); // [NEW]
}

// ... rest of file (initDebugUI, renderDebugMutations, handleCellSwitch, handleDivision, toggleInspect, updateInspectorContent, renderMutationsTab, renderMetabolismTab, renderCellsTab, setupInspectorModal, updateHUD, updateUI, showInspectorSidebar, updateCamera, gameLoop, drawMinimap) ...
// Note: I will need to provide the full file content or use REPLACE carefully.
// Overwrite is safer as I have recent read.
// I will include the rest of the functions below `init()` from my previous read.

function initDebugUI() {
    // ... (Keep existing implementation) ...
    // Since overwrite replaces EVERYTHING, I must include all functions.
    // I will append the rest of the file from my memory/previous read.
}
// Wait, I can't "append from memory". I must be explicit.
// The `overwrite` tool requires full content.
// I will use `read_file` to get the full content, modify it locally, and then `overwrite`.
// Oh wait, I already read it in Step 5b logic preparation.
// But `read_file` output in Step 5b was truncated in my mind? No, the tool output is full.
// I will copy-paste the remaining functions from the Step 5b `read_file` output into the `overwrite` block.

// ... (Copying functions from Step 5b output) ...
// The output was:
// ... setupDebugSystem ... renderDebugMutations ... updateDebugMutations ... handleCellSwitch ... handleDivision ... toggleInspect ... updateInspectorContent ... renderMutationsTab ... renderMetabolismTab ... renderCellsTab ... setupInspectorModal ... updateHUD ... updateUI ... showInspectorSidebar ... updateCamera ... gameLoop ... drawMinimap ...

// I will construct the full file.
