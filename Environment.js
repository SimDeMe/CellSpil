import { Cell } from './Cell.js';
import { Bacillus } from './Bacillus.js';
import { GameConfig } from './GameConfig.js';
import { activeCell } from './Player.js';

export const foodParticles = [];
export const otherCells = [];

const crunchSound = new Audio('sounds/Crunch.mp3');

const maxFood = GameConfig.World.foodMax;
let spawnTimer = 0;

let onMutationCallback = null;

export function setMutationCallback(callback) {
    onMutationCallback = callback;
}

export function initEnvironment(canvasWidth, canvasHeight) {
    foodParticles.length = 0;
    otherCells.length = 0;

    // Spawn Mad
    for (let i = 0; i < 500; i++) {
        spawnFood(canvasWidth, canvasHeight);
    }
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

// Toxin System
export const toxinParticles = [];
export const proteaseParticles = [];

export function spawnToxinPulse(x, y) {
    // Spawn 20 partikler i en cirkel
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 / 20) * i;
        toxinParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 3, // Hurtig spredning
            vy: Math.sin(angle) * 3,
            life: 120, // 2 sekunder ved 60fps
            maxLife: 120
        });
    }
}

export function spawnProteasePulse(x, y) {
    // Proteaser spredes langsommere men lever længere
    for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 / 24) * i;
        proteaseParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 1.5,
            vy: Math.sin(angle) * 1.5,
            life: 180, // 3 sekunder
            maxLife: 180
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
                    cell.alive = false;
                    console.log("Celle dræbt af toxin!");
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
                // Ramt et lig!
                if (!cell.corpseHp) cell.corpseHp = 100; // Init corpse HP
                cell.corpseHp -= 5; // Proteaser er effektive

                // Visuel effekt? (Celle bliver mindre/gennemsigtig?)
                cell.radius *= 0.99;

                if (cell.corpseHp <= 0) {
                    // Opløs cellen til mad!
                    // Spawn 5 Glucose + 2 Amino
                    for (let k = 0; k < 5; k++) {
                        const f = {
                            x: cell.x + (Math.random() - 0.5) * 20,
                            y: cell.y + (Math.random() - 0.5) * 20,
                            type: 'glucose', radius: 3, color: '#FFEB3B',
                            vx: (Math.random() - 0.5), vy: (Math.random() - 0.5)
                        };
                        foodParticles.push(f);
                    }
                    for (let k = 0; k < 2; k++) {
                        const f = {
                            x: cell.x + (Math.random() - 0.5) * 20,
                            y: cell.y + (Math.random() - 0.5) * 20,
                            type: 'amino', radius: 4, color: '#2196F3',
                            vx: (Math.random() - 0.5), vy: (Math.random() - 0.5)
                        };
                        foodParticles.push(f);
                    }

                    console.log("Lig opløst!");
                    otherCells.splice(j, 1);
                }

                proteaseParticles.splice(i, 1); // Partikel brugt
                break;
            }
        }
    }
}

export function updateEnvironment(canvasWidth, canvasHeight) {
    spawnTimer++;
    if (spawnTimer > GameConfig.World.foodSpawnRate && foodParticles.length < maxFood) {
        spawnFood(canvasWidth, canvasHeight);
        spawnTimer = 0;
    }

    updateToxinParticles(canvasWidth, canvasHeight); // Toxin Update
    updateProteaseParticles(canvasWidth, canvasHeight); // Protease Update

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

    otherCells.forEach(cell => {
        // Her opdaterer vi NPC'erne (Bacillus og andre)
        // Send foodParticles med så Bacillus kan finde mad, og otherCells for separation
        cell.update(null, null, canvasWidth, canvasHeight, foodParticles, otherCells);

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
}

export function spawnSisterCell(x, y, motherGenes = null, isPlayerChild = false) {
    const sister = new Cell(x, y, false);
    sister.radius = 20;

    // Arv gener
    if (motherGenes) {
        sister.genes = { ...motherGenes };
    }

    // Mutation: 40% chance for en ny mutation (FREMADRETTET)
    let mutated = false;
    if (Math.random() < GameConfig.Player.mutationRate) {
        // Liste af mulige mutationer som cellen ikke har endnu
        const possibleMutations = [];
        const g = sister.genes;

        // Rækkefølge: Movement -> Toxin -> Protease
        if (!g.cilia && !g.flagellum) {
            // Ingen bevægelse endnu. 50/50 Chance for Flagel eller Cilier
            possibleMutations.push('cilia', 'flagellum');
        } else if (!g.toxin) {
            // Har bevægelse, men ikke toxin. Næste er toxin.
            possibleMutations.push('toxin');
        } else if (!g.protease) {
            // Har toxin, men ikke protease. Næste er Protease.
            possibleMutations.push('protease');
        } else if (!g.megacytosis) {
            // Har alt det andet? Så måske megacytosis til sidst.
            possibleMutations.push('megacytosis');
        }

        if (possibleMutations.length > 0) {
            const newMutation = possibleMutations[Math.floor(Math.random() * possibleMutations.length)];
            sister.genes[newMutation] = true;
            mutated = true;

            console.log("MUTATION! Ny gen: " + newMutation);

            // Vi venter med at kalde callback til cellen er færdig-konfigureret og pushet
        }
    }

    // Tilbagemutation: 20% chance for at MISTE et gen (hvis vi ikke lige har fået et)
    if (!mutated && Math.random() < GameConfig.Player.backMutationRate) {
        const activeGenes = Object.keys(sister.genes).filter(k => sister.genes[k]);
        if (activeGenes.length > 0) {
            const lostGene = activeGenes[Math.floor(Math.random() * activeGenes.length)];
            sister.genes[lostGene] = false;
            console.log("BACK-MUTATION! Mistet gen: " + lostGene);
            // Evt. popup for tabt gen? For nu nøjes vi med log.
        }
    }

    // VIGTIGT: Opdater max amino krav efter gener er ændret
    sister.updateMaxGrowth();

    // Tilføj til listen FØR vi kalder callback, så den kan findes og fjernes ved swap
    otherCells.push(sister);

    // Trigger UI popup hvis en mutation skete OG det er spillerens barn
    if (mutated && onMutationCallback && isPlayerChild) {
        // Send BÅDE mutationstype OG den nye søster-celle med
        console.log("Triggering mutation callback for player child");
        onMutationCallback(mutated ? (sister.genes.toxin ? 'toxin' : sister.genes.megacytosis ? 'megacytosis' : sister.genes.flagellum ? 'flagellum' : sister.genes.cilia ? 'cilia' : 'unknown') : null, sister);

        // Hov, min logik for mutationType string ovenfor var lidt doven.
        // Vi skal vide PRÆCIS hvilken mutation der skete.
        // Vi kan redde det ved at gemme mutationsnavnet i en variabel.
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

function spawnFood(width, height) {
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
    if (typeRandom > 0.8) {
        particle.type = 'amino';
        particle.color = '#2196F3';
        particle.radius = 4;
    }
    foodParticles.push(particle);
}

export function drawEnvironment(ctx) {
    foodParticles.forEach(food => {
        ctx.beginPath();
        if (food.type === 'glucose') ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
        else ctx.rect(food.x - food.radius, food.y - food.radius, food.radius * 2, food.radius * 2);
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
            }
        }
    }
}