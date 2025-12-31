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


export function updateEnvironment(canvasWidth, canvasHeight, activeCell) {
    spawnTimer++;
    if (spawnTimer > GameConfig.World.foodSpawnRate && foodParticles.length < maxFood) {
        spawnFood(canvasWidth, canvasHeight);
        spawnTimer = 0;
    }

    updateToxinParticles(canvasWidth, canvasHeight); // Toxin Update
    updateProteaseParticles(canvasWidth, canvasHeight); // Protease Update

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

    // Cleanup fjernede celler
    for (let i = otherCells.length - 1; i >= 0; i--) {
        if (otherCells[i].shouldRemove) {
            otherCells.splice(i, 1);
        }
    }
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
        // Rækkefølge: Movement -> Toxin -> Protease
        if (!g.cilia && !g.flagellum) {
            // Ingen bevægelse endnu. 50/50 Chance for Monotrichous eller Cilier
            possibleMutations.push('cilia', 'flagellum');
        } else if (!g.toxin) {
            // Har bevægelse, men ikke toxin. Næste er toxin.
            possibleMutations.push('toxin');
        } else if (!g.protease) {
            // Har toxin, men ikke protease. Næste er Protease.
            possibleMutations.push('protease');
        } else {
            // Mutation Tree: Avancerede opgraderinger
            if (g.flagellum && !g.highTorque) {
                possibleMutations.push('highTorque');
            }

            if (!g.megacytosis) {
                // Har alt det andet? Så måske megacytosis til sidst.
                possibleMutations.push('megacytosis');
            }
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
        onMutationCallback(mutated ? (sister.genes.highTorque ? 'highTorque' : sister.genes.toxin ? 'toxin' : sister.genes.megacytosis ? 'megacytosis' : sister.genes.flagellum ? 'flagellum' : sister.genes.cilia ? 'cilia' : 'unknown') : null, sister);

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

            if (!c1.alive || !c2.alive) continue; // Ingen kollision med døde

            const dx = c2.x - c1.x;
            const dy = c2.y - c1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = c1.radius + c2.radius;

            if (dist < minDist) {
                // Kollision!

                // --- ENDOCYTOSE (Spisning af mindre celler) ---
                let eaten = false;

                // Tjek om c1 spiser c2
                if (c1.genes.endocytosis && c2.radius < c1.radius * 0.7 && c1.alive && c2.alive) {
                    c2.kill();
                    c1.atp += 20;
                    c1.aminoAcids += 1;
                    c1.nucleotides += 1;
                    eaten = true;
                    console.log("Endocytose: C1 spiste C2");
                }
                // Tjek om c2 spiser c1
                else if (c2.genes.endocytosis && c1.radius < c2.radius * 0.7 && c1.alive && c2.alive) {
                    c1.kill();
                    c2.atp += 20;
                    c2.aminoAcids += 1;
                    c2.nucleotides += 1;
                    eaten = true;
                    console.log("Endocytose: C2 spiste C1");
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