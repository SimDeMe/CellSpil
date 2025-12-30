import { Cell } from './Cell.js';

export const foodParticles = [];
export const otherCells = [];

const maxFood = 1500;
let spawnTimer = 0;

export function initEnvironment(canvasWidth, canvasHeight) {
    foodParticles.length = 0;
    otherCells.length = 0;

    for (let i = 0; i < 500; i++) {
        spawnFood(canvasWidth, canvasHeight);
    }
}

export function updateEnvironment(canvasWidth, canvasHeight) {
    spawnTimer++;
    if (spawnTimer > 40 && foodParticles.length < maxFood) {
        spawnFood(canvasWidth, canvasHeight);
        spawnTimer = 0;
    }

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
        // Her opdaterer vi NPC'erne
        cell.update(null, null, canvasWidth, canvasHeight);

        // NPC Division
        if (cell.alive && cell.aminoAcids >= cell.maxAminoAcids) {
            spawnSisterCell(cell.x, cell.y, cell.genes);
            cell.aminoAcids = 0;
            cell.radius = cell.minRadius;
        }
    });
}

export function spawnSisterCell(x, y, motherGenes = null) {
    const sister = new Cell(x, y, false);
    sister.radius = 20;

    // Arv gener
    if (motherGenes) {
        sister.genes = { ...motherGenes };
    }

    // Mutation: 20% chance for en ny mutation
    if (Math.random() < 0.2) {
        // Liste af mulige mutationer som cellen ikke har endnu
        const possibleMutations = [];
        if (!sister.genes.cilia && !sister.genes.flagellum) {
            // Hvis man ingen bevægelse har, kan man få cilier eller flagel
            possibleMutations.push('cilia');
            possibleMutations.push('flagellum');
        } else if (sister.genes.cilia && !sister.genes.flagellum) {
            // Hvis man har cilier, kan man opgradere til flagel
            possibleMutations.push('flagellum');
        }

        if (possibleMutations.length > 0) {
            const newMutation = possibleMutations[Math.floor(Math.random() * possibleMutations.length)];
            sister.genes[newMutation] = true;
            // Hvis vi får flagel, overskriver det cilier (funktionelt) eller vi kan beholde begge,
            // men logikken i Cell.js prioriterer flagel.
            console.log("MUTATION! Ny gen: " + newMutation);
        }
    }

    // VIGTIGT: Opdater max amino krav efter gener er ændret
    sister.updateMaxGrowth();

    otherCells.push(sister);
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
            if (food.type === 'glucose') {
                cell.atp = Math.min(cell.atp + 20, cell.maxAtp);
            } else if (food.type === 'amino') {
                cell.aminoAcids = Math.min(cell.aminoAcids + 1, cell.maxAminoAcids);
            }
        }
    }
}