
import { Cell } from './Cell.js';
import { Bacillus } from './Bacillus.js';
import { GameConfig } from './GameConfig.js';
import { activeCell, setActiveCell } from './Player.js';

export const foodParticles = [];
export const otherCells = [];

const crunchSound = new Audio('sounds/Crunch.mp3');

const maxFood = GameConfig.World.foodMax;
let spawnTimer = 0;

let onMutationCallback = null;

export function setMutationCallback(callback) {
    onMutationCallback = callback;
}

// Helper for Pixi Sync
function syncParticles(list, layer, drawFn) {
    for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (!p.graphic) {
            p.graphic = new PIXI.Graphics();
            drawFn(p.graphic, p);
            layer.addChild(p.graphic);
        }
        p.graphic.x = p.x;
        p.graphic.y = p.y;
    }
}

// --- PIXI CONTAINERS ---
export let worldContainer;
let foodLayer, toxinLayer, proteaseLayer, zoneLayer, cellLayer, dangerZoneLayer;
let appInstance; // Ref to pixi app if needed

export function initEnvironment(app) {
    appInstance = app;

    // cleanup previous world if exists
    if (worldContainer) {
        app.stage.removeChild(worldContainer);
        worldContainer.destroy({ children: true });
    }

    // Create World Container (Camera pivot)
    worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);

    // [NEW] Background / World Boundary
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, GameConfig.World.width, GameConfig.World.height);
    bg.fill({ color: 0x111111 }); // Very dark grey, visible against black space
    bg.stroke({ width: 2, color: 0x444444 });
    worldContainer.addChild(bg);

    // Create Layers (Order matters!)
    zoneLayer = new PIXI.Container();
    foodLayer = new PIXI.Container();
    toxinLayer = new PIXI.Container();
    proteaseLayer = new PIXI.Container();
    cellLayer = new PIXI.Container(); // Enemies & Player

    worldContainer.addChild(zoneLayer);
    worldContainer.addChild(foodLayer);
    worldContainer.addChild(toxinLayer);
    worldContainer.addChild(proteaseLayer);
    worldContainer.addChild(cellLayer);

    // Init Logic
    foodParticles.length = 0;
    otherCells.length = 0;
    dangerZones.length = 0;
    toxinParticles.length = 0; // [FIX] Clear Toxins
    proteaseParticles.length = 0; // [FIX] Clear Proteases

    // Spawn Initial Food
    // Spawn Initial Food (Clumped)
    spawnClumpedFood(GameConfig.World.width, GameConfig.World.height, 500);

    // Expose Camera Helper
    window.setCameraPosition = (x, y) => {
        worldContainer.position.set(x, y);
    }
}

export function spawnBacillus(canvasWidth, canvasHeight) {
    const x = Math.random() * canvasWidth;
    const y = Math.random() * canvasHeight;
    const bac = new Bacillus(x, y);
    otherCells.push(bac);
}

export function triggerInvasion(canvasWidth, canvasHeight) {
    // Spawn Bacillus (20 stk)
    for (let i = 0; i < 20; i++) {
        const bx = Math.random() * canvasWidth;
        const by = Math.random() * canvasHeight;
        const bac = new Bacillus(bx, by);
        otherCells.push(bac);
    }
}

export function spawnMegabacillus(canvasWidth, canvasHeight) {
    const count = GameConfig.Megabacillus.count;
    for (let i = 0; i < count; i++) {
        const x = Math.random() * canvasWidth;
        const y = Math.random() * canvasHeight;
        const mega = new Bacillus(x, y, true); // true = Megabacillus
        otherCells.push(mega);
    }
    console.log("WARNING: Megabacillus Spawned!");
}

// Toxin System
export const toxinParticles = [];
export const proteaseParticles = [];
export const dangerZones = []; // [NEW] Environmental Hazards
let dangerZoneSpawnTimer = 0;
let nextZoneSpawnTime = 600; // Start fast for debug/first spawn

export function spawnToxinPulse(x, y) {
    console.log("Environment: Spawning Toxin at", x, y);
    // Spawn 20 partikler i en cirkel
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 / 20) * i;
        toxinParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 3, // Hurtig spredning
            vy: Math.sin(angle) * 3,
            life: 120, // 2 sekunder ved 60fps
            maxLife: 120,
            type: 'toxin', // VISUAL HELPER
            color: '#00E676'
        });
    }
}

export function spawnProteasePulse(x, y) {
    console.log("Environment: Spawning Protease at", x, y);
    // Proteaser spredes langsommere men lever længere
    for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 / 24) * i;
        proteaseParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 1.5,
            vy: Math.sin(angle) * 1.5,
            life: 180, // 3 sekunder
            maxLife: 180,
            type: 'protease', // VISUAL HELPER
            color: '#E91E63'
        });
    }
}

function updateToxinParticles(canvasWidth, canvasHeight) {
    for (let i = toxinParticles.length - 1; i >= 0; i--) {
        const p = toxinParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        // Fjern døde
        if (p.life <= 0) {
            toxinParticles.splice(i, 1);
            continue;
        }

        // Tjek kollision med andre celler (især Bacillus)
        for (let j = otherCells.length - 1; j >= 0; j--) {
            const cell = otherCells[j];
            if (!cell.alive) continue;

            const dx = p.x - cell.x;
            const dy = p.y - cell.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < cell.radius) {
                // Skade!
                if (!cell.isPlayer) {
                    // [NEW] Gram Positive (Defense)
                    if (cell.genes && cell.genes.gramPositive) {
                        // Immune to toxin!
                    } else {
                        cell.alive = false;
                        if (cell.isMegabacillus) {
                            console.log("Megabacillus dræbt af toxin!");
                        } else {
                            console.log("Celle dræbt af toxin!");
                        }
                    }
                }

                toxinParticles.splice(i, 1); // Partikel brugt
                break;
            }
        }
    }
}

function updateProteaseParticles(canvasWidth, canvasHeight) {
    for (let i = proteaseParticles.length - 1; i >= 0; i--) {
        const p = proteaseParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.life <= 0) {
            proteaseParticles.splice(i, 1);
            continue;
        }

        // Tjek kollision med DØDE celler
        for (let j = otherCells.length - 1; j >= 0; j--) {
            const cell = otherCells[j];
            if (cell.alive) continue; // Ignorer levende celler

            const dx = p.x - cell.x;
            const dy = p.y - cell.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < cell.radius) {
                // Ramt et lig eller en ikke-dekomponerende celle
                if (cell.isDecomposing) {
                    // Allerede i gang, fjern bare partiklen (hjælper måske?)
                    proteaseParticles.splice(i, 1);
                    continue;
                }

                // Start nedbrydning!
                cell.isDecomposing = true;
                cell.decompositionTimer = 120; // 2 sekunder (60 fps)

                // Partiklen "hæfter" sig (forsvinder visuelt ind i cellen)
                proteaseParticles.splice(i, 1);
                break;
            }
        }
    }
}

function updateDangerZones(width, height) {
    // 1. Spawning
    dangerZoneSpawnTimer++;
    if (dangerZoneSpawnTimer > nextZoneSpawnTime) {
        dangerZoneSpawnTimer = 0;
        nextZoneSpawnTime = GameConfig.DangerZones.spawnIntervalMin + Math.random() * (GameConfig.DangerZones.spawnIntervalMax - GameConfig.DangerZones.spawnIntervalMin);

        // Spawn
        const type = Math.random() > 0.5 ? 'toxin' : 'antibiotic';
        dangerZones.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: 0,
            state: 'growing', // growing, stable, shrinking
            timer: 0,
            type: type,
            maxRadius: GameConfig.DangerZones.maxRadius * (0.5 + Math.random() * 0.5) // Varieret størrelse
        });
        console.log(`Spawned Danger Zone: ${type} `);
    }

    // 2. Updates & Collisions
    for (let i = dangerZones.length - 1; i >= 0; i--) {
        const zone = dangerZones[i];

        // Lifecycle
        if (zone.state === 'growing') {
            zone.radius += GameConfig.DangerZones.growthSpeed;
            if (zone.radius >= zone.maxRadius) {
                zone.radius = zone.maxRadius;
                zone.state = 'stable';
                zone.timer = GameConfig.DangerZones.duration;
            }
        } else if (zone.state === 'stable') {
            zone.timer--;
            if (zone.timer <= 0) {
                zone.state = 'shrinking';
            }
        } else if (zone.state === 'shrinking') {
            zone.radius -= GameConfig.DangerZones.growthSpeed;
            if (zone.radius <= 0) {
                dangerZones.splice(i, 1);
                continue;
            }
        }

        // Collisions / Damage
        // Check ALL cells (Player + NPCs)
        // We need access to 'otherCells' (global here) AND 'activeCell' (passed to updateEnvironment)
        // Let's make a helper or just iterate here.
        // We will do it in 'checkAllZoneCollisions' called below, or inline here.
        // Inline here is efficient since we have the zone loop.
    }
}

function checkZoneDamage(cell, zone) {
    if (!cell.alive) return;

    const dx = cell.x - zone.x;
    const dy = cell.y - zone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < zone.radius) {
        // HIT! Check Immunity (Gram Positive protects against BOTH)
        if (cell.genes && cell.genes.gramPositive) {
            return; // Immune
        }

        // Apply Damage
        const dmg = GameConfig.DangerZones.damageRate;
        cell.atp -= dmg;
        cell.aminoAcids -= dmg;
        cell.isTakingDamage = true; // For visual blink
    }
}

export function updateEnvironment(canvasWidth, canvasHeight, activeCell) {
    spawnTimer++;
    if (spawnTimer > GameConfig.World.foodSpawnRate && foodParticles.length < maxFood) {
        spawnFood(canvasWidth, canvasHeight);
        spawnTimer = 0;
    }

    updateToxinParticles(canvasWidth, canvasHeight); // Toxin Update
    updateProteaseParticles(canvasWidth, canvasHeight); // Protease Update
    updateDangerZones(canvasWidth, canvasHeight); // [NEW]

    // Collision Check for Zones (Separate loop to be clean or inside updateDangerZones?)
    // Inside updateDangerZones we only iterated zones. checking collisions there means N_zones * N_cells.
    // Let's do it there.
    dangerZones.forEach(z => {
        if (activeCell) checkZoneDamage(activeCell, z);
        otherCells.forEach(c => checkZoneDamage(c, z));
    });

    // --- MEGABACILLUS SPAWN CHECK ---
    if (!triggerInvasion.megaSpawned && GameConfig.Megabacillus) {
        // Use a static property or global to track if spawned? 
        // Better: triggerInvasion is a function, we can hang a prop on it or use a separate flag.
        // Let's use a module-level variable defined above.
    }

    // Check Timer
    // Environment doesn't track game time directly, main.js does.
    // However, updateEnvironment is called every frame.
    // Let's handle spawning in main.js where gameStartTime is, OR pass time delta here.
    // Actually, Environment.js has 'spawnTimer' for food, so it has frame counting.
    // But 'gameStartTime' is in main.js.
    // Let's add a `spawnMegabacillus` function and call it from main.js when time matches.

    // [NEW] Handle Division (Trait Signal)
    if (activeCell && activeCell.isReadyToSplit) {
        performSplit(activeCell);
    }
    for (let i = 0; i < otherCells.length; i++) {
        if (otherCells[i].isReadyToSplit) {
            performSplit(otherCells[i]);
        }
    }

    if (activeCell) {
        resolveCollisions(activeCell, otherCells);
    }
    // Håndter Kollisioner
    // Vi skal bruge main.js activeCell reference? Hmm Environment kender ikke activeCell direkte her i funktionen.
    // Men updateEnvironment kaldes fra main.js hvor activeCell er.
    // Vi må ændre signaturen på updateEnvironment eller håndtere det i main.js.
    // Vent, Environment.js eksporterer funcions, men har ikke state om Playeren (udover hvad der sendes ind).
    // Men Cell.js metoder tager 'otherCells' som argument.
    // Bedste sted: Main Game Loop i main.js ELLER send player med ind i updateEnvironment.
    // Let's check main.js call site.

    // Diffusion for næring
    foodParticles.forEach(food => {
        food.x += (Math.random() - 0.5) * 0.5;
        food.y += (Math.random() - 0.5) * 0.5;
        // Grænser
        if (food.x < 0) food.x = 0;
        if (food.x > canvasWidth) food.x = canvasWidth;
        if (food.y < 0) food.y = 0;
        if (food.y > canvasHeight) food.y = canvasHeight;
    });

    otherCells.forEach((cell, index) => {
        // Håndter nedbrydning (Protease effekt)
        if (cell.isDecomposing) {
            cell.decompositionTimer--;

            // Blink effekt håndteres i draw(), men vi kan ændre farve her
            if (cell.decompositionTimer % 10 < 5) {
                cell.color = '#E91E63'; // Protease farve
            } else {
                cell.color = '#444'; // Død farve
            }

            if (cell.decompositionTimer <= 0) {
                // OPLØS NU!
                console.log("Lig opløst efter timer!");

                // Random 1-3 Amino
                const aminoCount = Math.floor(Math.random() * 3) + 1;
                for (let k = 0; k < aminoCount; k++) {
                    foodParticles.push({
                        x: cell.x + (Math.random() - 0.5) * 10,
                        y: cell.y + (Math.random() - 0.5) * 10,
                        type: 'amino', radius: 4, color: '#2196F3',
                        vx: (Math.random() - 0.5), vy: (Math.random() - 0.5)
                    });
                }

                // Random 1-3 Glucose
                const glucoseCount = Math.floor(Math.random() * 3) + 1;
                for (let k = 0; k < glucoseCount; k++) {
                    foodParticles.push({
                        x: cell.x + (Math.random() - 0.5) * 10,
                        y: cell.y + (Math.random() - 0.5) * 10,
                        type: 'glucose', radius: 3, color: '#FFEB3B',
                        vx: (Math.random() - 0.5), vy: (Math.random() - 0.5)
                    });
                }

                // Fjern cellen
                // Note: Vi muterer arrayet mens vi itererer, men forEach er robust nok i JS arrays normalt, 
                // men det er bedre at markere for sletning eller bruge filter.
                // Hack: Sæt alive=false (hvis den ikke allerede er) og lad en cleanup process tage den?
                // Eller bare splice forsigtigt.
                // Da vi bruger index, kan vi splice, men vi skal passe på loopet.
                // Bedste måde i dette setup: Set en flag 'removed' og filter bagefter?
                // Eller simpler: Vi fjerner den bare her, og browserens JS engine håndterer det oftest ok,
                // men index kan skride.
                // Lad os bruge en 'markedForDeletion' strategi hvis vi vil være sikre,
                // men her: otherCells.splice(index, 1) vil ødelægge iterationen for næste element.
                // Løsning: Iterer baglæns!
                // Men forEach itererer forlæns.
                // Jeg ændrer loopet nedenfor til reverse for loop i næste step hvis nødvendigt.
                // Men vent, for at undgå at omskrive hele loopet nu:
                cell.shouldRemove = true;
            }
        }

        // Her opdaterer vi NPC'erne (Bacillus og andre)
        // Send foodParticles med så Bacillus kan finde mad, og otherCells for separation
        // [NEW] Send activeCell med så Megabacillus kan jage spilleren
        cell.update(null, null, canvasWidth, canvasHeight, foodParticles, otherCells, activeCell);

        // Division Logic
        if (cell.alive) {
            // Bacillus Division
            if (cell.isBacillus && cell.aminoAcids >= 3) {
                // Tjek max antal (50)
                const bacillusCount = otherCells.filter(c => c.isBacillus && c.alive).length;
                if (bacillusCount < GameConfig.Bacillus.populationCap) {
                    const bx = cell.x + 20;
                    const by = cell.y + 20;
                    const child = new Bacillus(bx, by);
                    otherCells.push(child);
                    // Reset mor
                    cell.aminoAcids = 0;
                }
            }
            // Normal Celle Division (NPC)
            else if (!cell.isBacillus && cell.aminoAcids >= cell.maxAminoAcids) {
                spawnSisterCell(cell.x, cell.y, cell.genes);
                cell.aminoAcids = 0;
                cell.radius = cell.minRadius;
            }
        }
    });

    // Cleanup fjernede celler
    for (let i = otherCells.length - 1; i >= 0; i--) {
        if (otherCells[i].shouldRemove) {
            otherCells.splice(i, 1);
        }
    }
}

export function spawnBacillusChild(x, y, isMega) {
    // [NEW] Helper for possessed Bacillus division
    const child = new Bacillus(x, y, isMega);
    // Inherit stats? Bacillus stats are fixed by type usually, maybe genes?
    // For now, new fresh Bacillus is fine.
    otherCells.push(child);
}

export function spawnSisterCell(x, y, motherGenes = null, isPlayerChild = false) {
    const sister = new Cell(x, y, false);
    sister.radius = 20;

    // Arv gener
    if (motherGenes) {
        sister.genes = { ...motherGenes };
    }


    // Mutation: 40% chance for en ny mutation (FREMADRETTET)
    // Simplified Spawn
    sister.updateMaxGrowth();

    if (!sister.isPlayer) {
        otherCells.push(sister);
    }
}

export function attemptMutation(cell) {
    let mutated = false;
    if (Math.random() < GameConfig.Player.mutationRate) {
        const possibleMutations = [];
        const g = cell.genes;

        // TIER 1: MOVEMENT
        if (!g.pili && !g.flagellum) {
            // [MOD] Pili disabled temporarily
            possibleMutations.push('flagellum');
        }
        else if (!g.toxin || !g.protease || !g.gramPositive) {
            // TIER 2: Abilities
            if (!g.toxin) possibleMutations.push('toxin');
            if (!g.protease) possibleMutations.push('protease');
            if (!g.gramPositive) possibleMutations.push('gramPositive');
        }
        else {
            // TIER 3: Upgrades
            /* [MOD] Pili Upgrades Disabled
            if (g.pili) {
                if (!g.highSpeedRetraction) possibleMutations.push('highSpeedRetraction');
                if (!g.multiplexPili) possibleMutations.push('multiplexPili');
            }
            */
            if (g.flagellum) {
                if (!g.highTorque) possibleMutations.push('highTorque');
            }
            if (!g.megacytosis) possibleMutations.push('megacytosis');
            if (g.flagellum) {
                if (!g.highTorque) possibleMutations.push('highTorque');
            }
            if (!g.megacytosis) possibleMutations.push('megacytosis');

            // TIER 4
            if (g.megacytosis && !g.endocytosis) {
                possibleMutations.push('endocytosis');
            }
        }

        if (possibleMutations.length > 0) {
            const newMutation = possibleMutations[Math.floor(Math.random() * possibleMutations.length)];
            cell.genes[newMutation] = true;
            mutated = true; // Unused var but good for tracking

            console.log("MUTATION ON ACTIVE CELL! New gene: " + newMutation);

            if (onMutationCallback) {
                onMutationCallback(newMutation, cell);
            }
        }

        // Update stats
        cell.updateMaxGrowth();
    }
}

export function getCellAtPosition(mouseX, mouseY) {
    for (let cell of otherCells) {
        const dx = cell.x - mouseX;
        const dy = cell.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Returner cellen hvis vi rammer den og den lever
        if (dist < cell.radius && cell.alive) {
            return cell;
        }
    }
    return null;
}

export function removeCellFromEnvironment(cellToRemove) {
    const index = otherCells.indexOf(cellToRemove);
    if (index > -1) {
        otherCells.splice(index, 1);
    }
}

export function addCellToEnvironment(cellToAdd) {
    otherCells.push(cellToAdd);
}

export function performSplit(parent) {
    // Logic to spawn two new cells (avoiding circular deps in Trait)
    // Offset along division axis (X axis local)
    const offset = parent.morphology.radius * 0.8;

    // Helper to create copy
    // Use parent.constructor to handle Bacillus subclassing
    const createDaughter = (x, y) => {
        // We use 'new parent.constructor'
        // If Bacillus, it takes (x, y, isMega). We assume standard constructor sig for now.
        // If parent was Mega, we should spawn Mega?
        // Bacillus constructor: (x, y, isMega)

        let d;
        if (parent.isBacillus) {
            d = new parent.constructor(x, y, parent.isMegabacillus);
        } else {
            d = new parent.constructor(x, y, false);
        }

        // Copy genes/traits
        d.genes = { ...parent.genes };
        d.updateMaxGrowth(); // Sync traits

        // Reset Morphology
        d.morphology.aspectRatio = 1.0;
        d.morphology.constriction = 0;
        d.radius = parent.minRadius;

        // Resources (50%)
        d.atp = parent.atp / 2;
        d.aminoAcids = parent.aminoAcids / 2;
        d.nucleotides = parent.nucleotides / 2;

        return d;
    };

    const d1 = createDaughter(parent.x - offset, parent.y);
    const d2 = createDaughter(parent.x + offset, parent.y);

    // Add to World
    addCellToEnvironment(d1);
    addCellToEnvironment(d2);

    // Handle Player Transfer
    if (parent.isPlayer) {
        d1.isPlayer = true;
        // setActiveCell imports from Player.js (added to imports)
        setActiveCell(d1);
        // Ensure d1 is removed from otherCells (setActiveCell usually handles this if called correctly?
        // setActiveCell sets activeCell reference. It does NOT remove from otherCells.
        // But addCellToEnvironment adds to otherCells.
        // So we should remove d1 from otherCells?
        // Let's check setActiveCell logic.
        // It just sets the pointer.
        // Logic in handleCellSwitch: removeCellFromEnvironment(clicked); setActiveCell(clicked).
        // So we must remove d1 from otherCells if we make it player.
        removeCellFromEnvironment(d1);
    }

    // Kill Parent
    parent.kill();
    // If parent is in otherCells, remove it.
    if (!parent.isPlayer) {
        removeCellFromEnvironment(parent);
    }
    // If parent was activeCell, setActiveCell(d1) replaced it.
}

export function spawnSpecificFood(type, x, y) {
    const particle = {
        x: x,
        y: y,
        type: type, // 'glucose', 'amino', 'nucleotide'
        radius: (type === 'glucose') ? 3 : 4,
        color: (type === 'glucose') ? '#FFEB3B' : (type === 'amino' ? '#2196F3' : '#F44336'),
        driftAngle: Math.random() * Math.PI * 2,
        vx: 0,
        vy: 0
    };
    foodParticles.push(particle);
}

// [NEW] Clumped Spawning Logic
export function spawnClumpedFood(mapWidth, mapHeight, totalCount) {
    // 1. Definer antal klynger (clusters)
    const clusterCount = 20;
    const particlesPerCluster = Math.floor(totalCount / clusterCount);
    const wanderCount = totalCount % clusterCount; // Resterende spredes tilfældigt

    // 2. Generer cluster centre
    const clusters = [];
    for (let i = 0; i < clusterCount; i++) {
        clusters.push({
            x: Math.random() * mapWidth,
            y: Math.random() * mapHeight,
            radius: 300 + Math.random() * 400 // Radius 300-700
        });
    }

    // 3. Spawn partikler omkring centrene
    for (let c = 0; c < clusterCount; c++) {
        const cluster = clusters[c];
        for (let p = 0; p < particlesPerCluster; p++) {
            // Tilfældig position i cirklen (bruger kvadratrod for jævn fordeling, men vi vil faktisk gerne have det tættere i midten for 'clump' effekt, så vi undlader sqrt eller bruger gaussian hvis vi ville være fancy. Simpel random * random er ok)
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * cluster.radius;

            let px = cluster.x + Math.cos(angle) * dist;
            let py = cluster.y + Math.sin(angle) * dist;

            // Clamp til verden
            px = Math.max(0, Math.min(px, mapWidth));
            py = Math.max(0, Math.min(py, mapHeight));

            spawnRandomFoodAt(px, py);
        }
    }

    // 4. Spawn 'wanderers' (tilfældigt over hele kortet)
    for (let i = 0; i < wanderCount; i++) {
        spawnFood(mapWidth, mapHeight);
    }
}

function spawnRandomFoodAt(x, y) {
    const typeRandom = Math.random();
    let type = 'glucose';

    if (typeRandom > GameConfig.SpawnRates.nucleotideThreshold) {
        type = 'nucleotide';
    } else if (typeRandom > GameConfig.SpawnRates.aminoThreshold) {
        type = 'amino';
    }

    spawnSpecificFood(type, x, y);
}

export function spawnFood(width, height) {
    const typeRandom = Math.random();
    let particle = {
        x: Math.random() * width,
        y: Math.random() * height,
        type: 'glucose',
        radius: 3,
        color: '#FFEB3B',
        driftAngle: Math.random() * Math.PI * 2, // Start vinkel
        vx: 0,
        vy: 0
    };

    if (typeRandom > GameConfig.SpawnRates.nucleotideThreshold) {
        particle.type = 'nucleotide';
        particle.color = '#F44336'; // Red
        particle.radius = 4;
    } else if (typeRandom > GameConfig.SpawnRates.aminoThreshold) {
        particle.type = 'amino';
        particle.color = '#2196F3'; // Blue
        particle.radius = 4;
    }

    foodParticles.push(particle);
}

export function drawEnvironment(ctx) {
    // [NEW] Draw Danger Zones first (Background)
    dangerZones.forEach(zone => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
        ctx.fillStyle = GameConfig.DangerZones.colors[zone.type] || 'rgba(0,0,0,0.1)';
        ctx.fill();
        // Soft edge? Radial gradient would be nice but expensive. keeping simple for now.
        ctx.restore();
    });

    // Draw Food
    foodParticles.forEach(food => {
        ctx.beginPath();
        if (food.type === 'glucose') {
            ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
        } else {
            // Amino (Blue) & Nucleotides (Cyan) are squares
            ctx.rect(food.x - food.radius, food.y - food.radius, food.radius * 2, food.radius * 2);
        }
        ctx.fillStyle = food.color;
        ctx.fill();
    });

    // Tegn Toxin (Grøn)
    toxinParticles.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = '#00E676';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });

    // Tegn Protease (Lilla/Rød)
    proteaseParticles.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = '#E91E63'; // Pink ish
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });

    otherCells.forEach(cell => {
        cell.draw(ctx);
    });
}

export function checkCollisions(cell) {
    if (!cell.alive) return;

    for (let i = foodParticles.length - 1; i >= 0; i--) {
        const food = foodParticles[i];
        const dx = cell.x - food.x;
        const dy = cell.y - food.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < cell.radius + food.radius) {
            foodParticles.splice(i, 1);

            // Afspil lyd hvis det er spilleren der spiser
            if (activeCell && cell === activeCell) {
                crunchSound.currentTime = 0; // Reset for hurtig gentagelse
                crunchSound.play().catch(e => console.log("Audio play failed:", e));
            }

            if (food.type === 'glucose') {
                cell.atp = Math.min(cell.atp + GameConfig.Resources.glucoseEnergy, cell.maxAtp);
            } else if (food.type === 'amino') {
                cell.aminoAcids = Math.min(cell.aminoAcids + GameConfig.Resources.aminoValue, cell.maxAminoAcids);
            } else if (food.type === 'nucleotide') {
                // [NEW]
                cell.nucleotides = Math.min(cell.nucleotides + GameConfig.Resources.nucleotideValue, cell.maxNucleotides);
            }
        }
    }
}

// Elastisk Kollision Logic
export function resolveCollisions(player, others) {
    const allCells = [player, ...others];

    for (let i = 0; i < allCells.length; i++) {
        for (let j = i + 1; j < allCells.length; j++) {
            const c1 = allCells[i];
            const c2 = allCells[j];

            if (!c1.alive && !c2.alive) continue; // Ignorer kun hvis BEGGE er døde
            if (c1.engulfed || c2.engulfed) continue; // Ignorer hvis en af dem allerede bliver spist

            const dx = c2.x - c1.x;
            const dy = c2.y - c1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = c1.radius + c2.radius;

            if (dist < minDist) {
                // Kollision!

                // --- ENDOCYTOSE (Spisning af mindre celler) ---
                let eaten = false;

                // Tjek om c1 spiser c2
                // Krav: Endocytose gen, c1 > c2 i size tier, c2 er (Bacillus eller Død), Mindre radius, Ikke Player, (Age check kun hvis levende og ikke Bacillus? Let's simplificere: Spis alt valid som ikke er Player)
                // Diet: Kun Bacillus eller Døde celler.
                const validPreyC2 = (c2.isBacillus || !c2.alive);
                if (c1.genes.endocytosis && c1.alive && validPreyC2 && c1.size > c2.size && c2.radius < c1.radius * 0.7 && !c2.isPlayer) {
                    if (c2.alive) {
                        // Kun alderstjek på levende bacillus for at undgå instant-spawn kill (valgfrit) -> Vi fjerner age check her da Bacillus er fjende
                    }

                    // Start engulfment animation i stedet for instant kill
                    c2.engulfed = true;
                    c2.engulfedBy = c1;

                    // Giv ressourcer med det samme (kun én gang da vi ignorerer engulfed i loopet fremover)
                    c1.atp += 20;
                    c1.aminoAcids += 1;
                    c1.nucleotides += 1;
                    eaten = true;
                    console.log("Endocytose: C1 spiste C2 (Animation Started)");
                }
                // Tjek om c2 spiser c1
                else if (c2.genes.endocytosis && c2.alive && (c1.isBacillus || !c1.alive) && c2.size > c1.size && c1.radius < c2.radius * 0.7 && !c1.isPlayer) {
                    c1.engulfed = true;
                    c1.engulfedBy = c2;

                    c2.atp += 20;
                    c2.aminoAcids += 1;
                    c2.nucleotides += 1;
                    eaten = true;
                    console.log("Endocytose: C2 spiste C1 (Animation Started)");
                }

                if (!eaten) {
                    // 1. Skub dem fra hinanden (Position Correction)

                    // 1. Skub dem fra hinanden (Position Correction) for at undgå overlap
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDist - dist;
                    const pushX = Math.cos(angle) * overlap * 0.5;
                    const pushY = Math.sin(angle) * overlap * 0.5;

                    // Opdater positioner direkte
                    c1.x -= pushX;
                    c1.y -= pushY;
                    c2.x += pushX;
                    c2.y += pushY;
                }
            }
        }
    }
}

// --- VISUAL RENDERING (PIXI) ---
let renderFrameId = 0;

export function renderEnvironment(activeCell) {
    renderFrameId++;

    // 1. Sync Layers
    // 1. Sync Layers
    // zoneLayer is used via named variable below

    // Wait, accessing worldContainer.children by index is risky if order changes.
    // Better to export layers or expose them? 
    // `initEnvironment` creates them local variables.
    // I should update `initEnvironment` to export them, or just use `worldContainer.children` if I know the order.
    // Order was: zone, food, toxin, cell.
    // 0: Zone, 1: Food, 2: Toxin, 3: Cell (activeCell + others)

    // BUT, wait. Accessing local vars `foodLayer` etc from `initEnvironment` scope?
    // They are defined at module level (lines 36).
    // So I can access them directly!
    // 'let foodLayer, toxinLayer...' are at line 36.

    // HOWEVER, I cannot easily see them in the snippet above (lines 770+).
    // I recall viewing the file earlier and they were at top.
    // Yes, Step 205 showed they are module scope:
    // 36: let foodLayer, toxinLayer, zoneLayer, cellLayer, dangerZoneLayer;

    // So I can just use them.

    syncLayer(dangerZones, zoneLayer, drawDangerZone);
    syncLayer(foodParticles, foodLayer, drawFood);
    syncLayer(toxinParticles, toxinLayer, drawToxin);
    syncLayer(foodParticles, foodLayer, drawFood);
    syncLayer(toxinParticles, toxinLayer, drawToxin);
    syncLayer(proteaseParticles, proteaseLayer, drawProtease);

    // Cells (Player + NPCs)
    const allCells = [...otherCells];
    if (activeCell) allCells.push(activeCell);

    // Update animation phases
    allCells.forEach(cell => {
        // Base freq 0.2 + speed factor
        const speed = cell.currentSpeed || 0;
        const freq = 0.2 + speed * 0.2;
        cell._wavePhase = (cell._wavePhase || 0) + freq;
    });

    syncLayer(allCells, cellLayer, drawCell);
}

function syncLayer(dataList, layer, drawFunc) {
    if (!layer) return; // Safety

    // 1. Mark & Update/Create
    for (let i = 0; i < dataList.length; i++) {
        const item = dataList[i];
        item._renderFrame = renderFrameId;

        if (!item.graphic) {
            item.graphic = new PIXI.Graphics();
            item.graphic.dataObject = item; // Link back
            layer.addChild(item.graphic);
            // Initial Draw
            drawFunc(item.graphic, item, true);
        } else {
            // Update Draw (Optimized: Only redraw if needed? For now redraw dynamic stuff)
            drawFunc(item.graphic, item, false);
        }

        // Position Update
        item.graphic.x = item.x;
        item.graphic.y = item.y;
        // Respect explicit 0 angle
        item.graphic.rotation = (typeof item.angle === 'number') ? item.angle : (item.moveAngle || 0);
    }

    // 2. Sweep (Remove unused graphics)
    for (let i = layer.children.length - 1; i >= 0; i--) {
        const child = layer.children[i];
        if (child.dataObject && child.dataObject._renderFrame !== renderFrameId) {
            child.destroy({ children: true });
        }
    }
}

// --- DRAW FUNCTIONS ---

function drawFood(g, p, initial) {
    if (initial) {
        g.clear();
        // PixiJS shape drawing
        if (p.type === 'glucose') {
            g.circle(0, 0, p.radius);
        } else {
            g.rect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
        }
        g.fill({ color: p.color });
    }
}

function drawToxin(g, p, initial) {
    g.clear();
    g.alpha = p.life / p.maxLife;
    g.circle(0, 0, 4);
    g.fill({ color: '#00E676' });
}

function drawProtease(g, p, initial) {
    g.clear();
    g.alpha = p.life / p.maxLife;
    g.circle(0, 0, 3);
    g.fill({ color: '#E91E63' });
}

function drawDangerZone(g, z, initial) {
    g.clear();
    g.circle(0, 0, z.radius);
    g.fill({ color: GameConfig.DangerZones.colors[z.type] || 'rgba(0,0,0,0.1)' });
}

function drawCell(g, cell, initial) {
    if (cell.draw) {
        cell.draw(g);
    } else {
        // Fallback
        g.clear();
        g.circle(0, 0, cell.radius || 20);
        g.fill({ color: cell.color || '#888' });
    }
}