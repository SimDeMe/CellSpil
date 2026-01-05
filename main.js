import { initInput, mouse, keys } from './Input.js';
import { activeCell, initPlayer, setActiveCell } from './Player.js';
import { GameConfig } from './GameConfig.js';
import {
    initEnvironment, updateEnvironment, drawEnvironment,
    checkCollisions, spawnSisterCell, otherCells, foodParticles,
    getCellAtPosition, removeCellFromEnvironment, addCellToEnvironment,
    setMutationCallback, setEventCallback, setMute,
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
// Systems are initialized in init()

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        toggleGlobalPause();
    }
    // Shortcuts for Production
    if (e.key === '1') {
        if (activeCell && activeCell.genes.toxin) activeCell.produce('toxin');
    } else if (e.key === '2') {
        if (activeCell && activeCell.genes.protease) activeCell.produce('protease');
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
    setMute(isMuted);
    const btn = document.getElementById('muteBtn');
    if (btn) btn.innerText = isMuted ? "🔇" : "🔊";
}

function setupMuteButton() {
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
    const hud = document.getElementById('hud-stats');
    if (hud && !document.getElementById('gameTimerDisplay')) {
        const div = document.createElement('div');
        div.style.marginTop = '10px';
        div.innerHTML = 'Time: <span id="gameTimerDisplay">00:00</span>';
        div.style.color = '#FFF';
        div.style.fontSize = '1.2em';
        hud.prepend(div);
    }
    gameTimer = 0;
}

function setupProductionUI() {
    let container = document.getElementById('productionControls');
    if (!container) {
        container = document.createElement('div');
        container.id = 'productionControls';
        container.style.position = 'absolute';
        container.style.bottom = '20px';
        container.style.left = '20px'; // Bottom Left
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    } else {
        container.innerHTML = '';
    }

    const styleBtn = (btn, color) => {
        btn.className = 'hud-btn';
        btn.style.background = color;
        btn.style.color = '#000';
        btn.style.fontWeight = 'bold';
        btn.style.padding = '10px 15px';
        btn.style.border = 'none';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '0.9em';
        btn.style.textAlign = 'left';
    };

    const btnToxin = document.createElement('button');
    btnToxin.id = 'btnToxin';
    btnToxin.innerText = "[1] Synthesize Toxin (Release: E)";
    styleBtn(btnToxin, '#00E676');
    btnToxin.onclick = () => { if (activeCell) activeCell.produce('toxin'); };

    const btnEnzyme = document.createElement('button');
    btnEnzyme.id = 'btnEnzyme';
    btnEnzyme.innerText = "[2] Synthesize Enzyme (Release: R)";
    styleBtn(btnEnzyme, '#E91E63');
    btnEnzyme.onclick = () => { if (activeCell) activeCell.produce('protease'); };

    container.appendChild(btnToxin);
    container.appendChild(btnEnzyme);
}

function updateProductionButtons() {
    if (!activeCell) return;
    const btnToxin = document.getElementById('btnToxin');
    const btnEnzyme = document.getElementById('btnEnzyme');

    if (btnToxin) {
        if (activeCell.genes.toxin) {
            btnToxin.disabled = false;
            btnToxin.style.opacity = '1';
            btnToxin.style.filter = 'none';
        } else {
            btnToxin.disabled = true;
            btnToxin.style.opacity = '0.5';
            btnToxin.style.filter = 'grayscale(100%)';
        }
    }

    if (btnEnzyme) {
        if (activeCell.genes.protease) {
            btnEnzyme.disabled = false;
            btnEnzyme.style.opacity = '1';
            btnEnzyme.style.filter = 'none';
        } else {
            btnEnzyme.disabled = true;
            btnEnzyme.style.opacity = '0.5';
            btnEnzyme.style.filter = 'grayscale(100%)';
        }
    }
}

function updateGameTimer(dt) {
    if (isPaused) return;
    gameTimer += dt;

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
    setEventCallback(showEventPopup);

    initEnvironment(app);

    setupInspectorModal();
    setupDebugSystem();
    setupPauseSystem();
    setupResetSystem();
    setupTimerSystem();
    setupProductionUI();
    setupMuteButton();
}

function toggleInspect() {
    if (!activeCell) return;

    const modal = document.getElementById('inspectorModal');
    if (!modal) return;

    isInspecting = !isInspecting;

    if (isInspecting) {
        modal.classList.remove('hidden');
        if (!isPaused) toggleGlobalPause();
        updateInspectorContent();
        const activeTab = document.querySelector('.modal-tab-btn.active');
        if (!activeTab) {
            document.querySelector('[data-tab="tabMutations"]').click();
        }
    } else {
        modal.classList.add('hidden');
        if (isPaused) toggleGlobalPause();
    }
}

function updateInspectorContent() {
    if (!activeCell) return;
    const activeTabId = document.querySelector('.modal-tab-content.active').id;
    if (activeTabId === 'tabMutations') {
        renderMutationsTab();
    } else if (activeTabId === 'tabMetabolism') {
        renderMetabolismTab();
    } else if (activeTabId === 'tabCells') {
        renderCellsTab();
    } else if (activeTabId === 'tabKatabolisme') {
        renderKatabolismeTab();
    } else if (activeTabId === 'tabAnabolisme') {
        renderAnabolismeTab();
    }
}

function renderMutationsTab() {
    const container = document.getElementById('mutationTreeContainer');
    container.innerHTML = '';

    const genes = activeCell.genes;
    const tree = document.createElement('div');
    tree.className = 'mutation-list';

    const addItem = (key, name, desc) => {
        const val = genes[key];
        const hasGene = (typeof val === 'number') ? val > 0 : !!val;

        const item = document.createElement('div');
        item.className = `mutation-item ${hasGene ? 'unlocked' : 'locked'}`;

        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.innerText = hasGene ? '✅' : '🔒';

        let displayName = name;
        if (typeof val === 'number' && val > 0) {
            displayName += ` (Lvl ${val})`;
        }

        const info = document.createElement('div');
        info.className = 'info';
        info.innerHTML = `<strong>${displayName}</strong><br><span style="font-size:0.8em; color:#aaa;">${desc}</span>`;

        item.appendChild(icon);
        item.appendChild(info);
        tree.appendChild(item);
    };

    addItem('flagellum', 'Monotrichous Flagellum', 'En lang hale der giver kraftig fremdrift.');
    addItem('pili', 'Type IV Pili', 'Gribekroge til twitch-bevægelse.');
    addItem('toxin', 'Toxin Secretion (E)', 'Udskil gift skyer der dræber konkurrenter.');
    addItem('protease', 'Protease Enzym (R)', 'Opløs døde celler (lig) og konverter dem til mad.');
    addItem('photoreceptor', 'Photoreceptor', 'Kan registrere lys (ikke implementeret endnu).');
    addItem('antibioticResistance', 'Antibiotic Resistance', 'Modstandsdygtig overfor visse stoffer.');
    addItem('megacytosis', 'Megacytosis', 'Dobbel størrelse og HP.');
    addItem('multiplexPili', 'Multiplex Pili', 'Bedre pili rækkevidde.');
    addItem('highTorque', 'High-Torque Flagel', 'Hurtigere bevægelse.');
    addItem('highSpeedRetraction', 'High-Speed Retraction', 'Hurtigere pili træk.');

    addItem('atpStorage', 'ATP Lager', '+10% Max ATP per level (Max 5).');
    addItem('aminoStorage', 'Aminosyre Lager', '+10% Max Aminosyrer per level (Max 5).');
    // addItem('nucleotideStorage', 'Nukleotid Lager', '+10% Max Nukleotider per level (Max 5).'); // Removed

    addItem('endocytosis', 'Endocytosis', 'Spis mindre celler direkte.');
    addItem('gramPositive', 'Gram Positive', 'Tyk cellevæg (Defense).');

    container.appendChild(tree);
}

function renderMetabolismTab() {
    const container = document.getElementById('metabolismContainer');
    container.innerHTML = '';

    if (!activeCell) return;

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

    const details = document.createElement('div');
    const atpSurplus = activeCell.atp >= (activeCell.maxAtp * 0.9);
    const rateText = atpSurplus ?
        "<span style='color:orange'>Inhibited (ATP High)</span>" :
        "<span style='color:#00E676'>Active</span>";

    details.innerHTML = `
        <h3 style="margin-top:20px; border-bottom:1px solid #444; padding-bottom:5px;">Metabolism Details</h3>
        <p><strong>Glycolysis & Fermentation:</strong> ${rateText}</p>
        <p style="font-size:0.9em; color:#aaa;">Converts Glucose -> ATP automatically when ATP is low.</p>

        <div style="margin-top:10px; padding:10px; background:#1a1a1a; border-radius:5px;">
           <div><strong>Glucose (Yellow):</strong> Energy source.</div>
           <div><strong>Carbon (White):</strong> Backbone for Amino Acids.</div>
           <div><strong>Nitrogen (Blue):</strong> Required for Amino/DNA.</div>
           <div><strong>Phosphate (Red):</strong> Required for DNA/ATP.</div>
        </div>
    `;
    container.appendChild(details);
}

function renderCellsTab() {
    const container = document.getElementById('cellListContainer');
    container.innerHTML = '';

    const list = [...otherCells].sort((a, b) => {
        return (b.isBacillus ? 1 : 0) - (a.isBacillus ? 1 : 0);
    });

    if (list.length === 0) {
        container.innerHTML = "<p style='color:#777; padding:10px;'>Ingen andre celler i nærheden.</p>";
        return;
    }

    list.forEach(cell => {
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

        const btnTake = document.createElement('button');
        btnTake.className = 'action-btn';
        btnTake.innerText = "🎮";
        btnTake.title = "Overtag Styring";
        btnTake.onclick = () => {
            const oldPlayer = activeCell;
            addCellToEnvironment(oldPlayer);
            removeCellFromEnvironment(cell);
            setActiveCell(cell);

            cell.onAction = oldPlayer.onAction;
            oldPlayer.onAction = null;

            toggleInspect();
            console.log("Switched to cell via Inspector");
        };

        const btnDna = document.createElement('button');
        btnDna.className = 'action-btn secondary';
        btnDna.innerText = "🧬";
        btnDna.title = "Vis Gener";

        const dnaDetail = document.createElement('div');
        dnaDetail.className = 'dna-details hidden';
        dnaDetail.style.display = 'none';

        btnDna.onclick = () => {
            const isHidden = dnaDetail.style.display === 'none' || dnaDetail.classList.contains('hidden');
            if (isHidden) {
                dnaDetail.classList.remove('hidden');
                dnaDetail.style.display = 'block';
                dnaDetail.style.background = '#222';
                dnaDetail.style.padding = '8px';
                dnaDetail.style.borderRadius = '4px';
                dnaDetail.style.marginTop = '4px';
                dnaDetail.style.color = '#eee';
                dnaDetail.style.fontSize = '0.85em';
                dnaDetail.style.border = '1px solid #444';

                const active = [];
                for (const key in cell.genes) {
                    const val = cell.genes[key];
                    if (val) {
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

                        if (typeof val === 'number') {
                            name += ` (Lvl ${val})`;
                        }

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

    if (closeBtn) {
        closeBtn.onclick = () => {
            isInspecting = false;
            modal.classList.add('hidden');
            toggleGlobalPause();
        };
    }

    tabBtns.forEach(btn => {
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');

            if (activeCell) updateInspectorContent();
        };
    });
}

function renderKatabolismeTab() {
    const container = document.getElementById('katabolismeContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!activeCell) return;

    const addBtn = (label, action, enabled) => {
        const btn = document.createElement('button');
        btn.innerText = label;
        btn.className = 'action-btn';
        btn.disabled = !enabled;
        btn.style.width = '100%';
        btn.style.marginBottom = '10px';
        if (!enabled) btn.style.opacity = 0.5;

        btn.onclick = () => {
            if (action()) updateInspectorContent();
        };
        container.appendChild(btn);
    };

    addBtn(
        `Breakdown Glucose (1 ATP -> 6 C) [Stock: ${Math.floor(activeCell.glucose)}]`,
        () => activeCell.catabolizeGlucose(),
        activeCell.glucose >= 1 && activeCell.atp >= 1
    );

    addBtn(
        `Breakdown Protein (1 ATP -> 3 Amino) [Stock: ${activeCell.storedProtein}]`,
        () => activeCell.catabolizeProtein(),
        activeCell.storedProtein >= 1 && activeCell.atp >= 1
    );

    addBtn(
        `Breakdown DNA (2 ATP -> 3 Nucleo) [Stock: ${activeCell.storedDna}]`,
        () => activeCell.catabolizeDna(),
        activeCell.storedDna >= 1 && activeCell.atp >= 2
    );
}

function renderAnabolismeTab() {
    const container = document.getElementById('anabolismeContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!activeCell) return;

    const addBtn = (label, action, enabled) => {
        const btn = document.createElement('button');
        btn.innerText = label;
        btn.className = 'action-btn';
        btn.disabled = !enabled;
        btn.style.width = '100%';
        btn.style.marginBottom = '10px';
        if (!enabled) btn.style.opacity = 0.5;

        btn.onclick = () => {
            if (action()) updateInspectorContent();
        };
        container.appendChild(btn);
    };

    addBtn(
        `Synthesize Amino (4C, 1N, 1ATP)`,
        () => activeCell.anabolizeAmino(),
        activeCell.carbon >= 4 && activeCell.nitrogen >= 1 && activeCell.atp >= 1
    );

    addBtn(
        `Synthesize Nucleotide (10C, 3N, 1P, 5ATP)`,
        () => activeCell.anabolizeNucleotide(),
        activeCell.carbon >= 10 && activeCell.nitrogen >= 3 && activeCell.phosphate >= 1 && activeCell.atp >= 5
    );
}

function updateHUD() {
    document.getElementById('hudGen').innerText = generation;
    const pop = otherCells.filter(c => !c.isBacillus && c.alive).length + (activeCell ? 1 : 0);
    document.getElementById('hudPop').innerText = pop;

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
        const divCost = GameConfig.Player.divisionCost;
        const aminoPct = (activeCell.aminoAcids / activeCell.maxAminoAcids) * 100;
        const aminoBar = document.getElementById('hudAminoBar');
        if (aminoBar) aminoBar.style.width = aminoPct + '%';
        const aminoVal = document.getElementById('hudAminoVal');
        if (aminoVal) aminoVal.innerText = `${activeCell.aminoAcids} / ${activeCell.maxAminoAcids} (Div: ${divCost.amino})`;

        // Nucleotides
        const nucleoPct = (activeCell.nucleotides / activeCell.maxNucleotides) * 100;
        const nucleoBar = document.getElementById('hudNucleoBar');
        if (nucleoBar) nucleoBar.style.width = nucleoPct + '%';
        const nucleoVal = document.getElementById('hudNucleoVal');
        if (nucleoVal) nucleoVal.innerText = `${activeCell.nucleotides} / ${activeCell.maxNucleotides} (Div: ${divCost.nucleotide})`;

        // Glucose
        const glcMax = activeCell.maxGlucose || 100;
        const glcPct = (activeCell.glucose / glcMax) * 100;
        const glcBar = document.getElementById('hudGlucoseBar');
        if (glcBar) glcBar.style.width = glcPct + '%';
        const glcVal = document.getElementById('hudGlucoseVal');
        if (glcVal) glcVal.innerText = `${Math.floor(activeCell.glucose)} / ${glcMax}`;

        // Carbon
        const cMax = activeCell.maxCarbon || 100;
        const cPct = (activeCell.carbon / cMax) * 100;
        const cBar = document.getElementById('hudCarbonBar');
        if (cBar) cBar.style.width = cPct + '%';
        const cVal = document.getElementById('hudCarbonVal');
        if (cVal) cVal.innerText = `${Math.floor(activeCell.carbon)} / ${cMax}`;

        // Nitrogen
        const nMax = activeCell.maxNitrogen || 100;
        const nPct = (activeCell.nitrogen / nMax) * 100;
        const nBar = document.getElementById('hudNitrogenBar');
        if (nBar) nBar.style.width = nPct + '%';
        const nVal = document.getElementById('hudNitrogenVal');
        if (nVal) nVal.innerText = `${Math.floor(activeCell.nitrogen)} / ${nMax}`;

        // Phosphate
        const pMax = activeCell.maxPhosphate || 100;
        const pPct = (activeCell.phosphate / pMax) * 100;
        const pBar = document.getElementById('hudPhosphateBar');
        if (pBar) pBar.style.width = pPct + '%';
        const pVal = document.getElementById('hudPhosphateVal');
        if (pVal) pVal.innerText = `${Math.floor(activeCell.phosphate)} / ${pMax}`;

    } else {
        document.getElementById('hudAtpVal').innerText = "-";
        document.getElementById('hudAminoVal').innerText = "-";
        document.getElementById('hudNucleoVal').innerText = "-";
        if (document.getElementById('hudAtpBar')) document.getElementById('hudAtpBar').style.width = '0%';
        if (document.getElementById('hudAminoBar')) document.getElementById('hudAminoBar').style.width = '0%';
        if (document.getElementById('hudNucleoBar')) document.getElementById('hudNucleoBar').style.width = '0%';
    }
}

function updateUI() {
    if (!activeCell) return;
    updateProductionButtons();
}

function showInspectorSidebar(show) {
}

function updateCamera() {
    if (activeCell) {
        let targetX = activeCell.x - app.screen.width / 2;
        let targetY = activeCell.y - app.screen.height / 2;

        const smoothFactor = 0.05;
        camera.x += (targetX - camera.x) * smoothFactor;
        camera.y += (targetY - camera.y) * smoothFactor;

    } else {
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

    camera.x = Math.max(0, Math.min(camera.x, worldWidth - app.screen.width));
    camera.y = Math.max(0, Math.min(camera.y, worldHeight - app.screen.height));
}

function gameLoop(deltaTime) {
    if (isPaused) return;

    const width = app.screen.width;
    const height = app.screen.height;

    if (activeCell) {
        const input = {
            up: keys['w'] || keys['arrowup'],
            down: keys['s'] || keys['arrowdown'],
            left: keys['a'] || keys['arrowleft'],
            right: keys['d'] || keys['arrowright'],
            space: keys[' '],
            e: keys['e'],
            r: keys['r'],
            m: keys['m'],
            f: keys['f']
        };

        const worldMouse = {
            x: mouse.x + camera.x,
            y: mouse.y + camera.y
        };

        updateGameTimer(deltaTime / 60);

        activeCell.update(worldMouse, input, worldWidth, worldHeight, foodParticles, otherCells, height);

        checkCollisions(activeCell);
        handleDivision();

        updateEnvironment(worldWidth, worldHeight, activeCell);
        renderEnvironment(activeCell);

        updateCamera();

        if (window.setCameraPosition) {
            window.setCameraPosition(-camera.x, -camera.y);
        }
    } else {
        updateEnvironment(worldWidth, worldHeight, null);
        renderEnvironment(null);
        updateCamera();
        if (window.setCameraPosition) window.setCameraPosition(-camera.x, -camera.y);
    }

    handleCellSwitch();

    if (activeCell) window.activeCell = activeCell; // Expose for testing
    updateHUD();
    updateUI(); // [FIX] Update Production UI
    drawMinimap();

    if (godMode && activeCell) {
        activeCell.atp = activeCell.maxAtp;
        activeCell.aminoAcids = activeCell.maxAminoAcids;
        activeCell.nucleotides = activeCell.maxNucleotides;
    }
}

function handleCellSwitch() {
    // Logic to switch cells if needed (e.g., via hotkey or auto-switch on death)
    // Currently handled via UI or automatic logic in Environment.js
}

function handleDivision() {
    if (!activeCell) return;
    if (activeCell.isDividing) return;

    // Trigger division if 'm' is pressed and resources are sufficient
    if (keys['m']) {
        const cost = activeCell.getDivisionCost();
        if (activeCell.aminoAcids >= cost.amino && activeCell.nucleotides >= cost.nucleotide) {
            activeCell.startDivision();
        }
    }
}

function drawMinimap() {
    const miniCanvas = document.getElementById('minimapCanvas');
    if (!miniCanvas) return;
    const miniCtx = miniCanvas.getContext('2d');

    miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);

    const scale = miniCanvas.width / Math.max(worldWidth, worldHeight);

    miniCtx.fillStyle = '#000';
    miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

    const mapW = worldWidth * scale;
    const mapH = worldHeight * scale;
    miniCtx.strokeStyle = '#333';
    miniCtx.lineWidth = 1;
    miniCtx.strokeRect(0, 0, mapW, mapH);

    otherCells.forEach(cell => {
        const cx = cell.x * scale;
        const cy = cell.y * scale;
        miniCtx.beginPath();
        miniCtx.arc(cx, cy, 2, 0, Math.PI * 2);

        if (!cell.alive) {
            miniCtx.fillStyle = '#888';
        } else if (cell.isBacillus) {
            miniCtx.fillStyle = '#FFEB3B';
        } else {
            miniCtx.fillStyle = '#4CAF50';
        }
        miniCtx.fill();
    });

    if (activeCell) {
        const px = activeCell.x * scale;
        const py = activeCell.y * scale;
        miniCtx.beginPath();
        miniCtx.arc(px, py, 3, 0, Math.PI * 2);
        miniCtx.fillStyle = '#4CAF50';
        miniCtx.fill();
        miniCtx.strokeStyle = '#FFF';
        miniCtx.lineWidth = 1;
        miniCtx.stroke();
    }

    miniCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    miniCtx.lineWidth = 1;
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
