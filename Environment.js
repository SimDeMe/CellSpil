import { Cell } from './Cell.js'; 

export const foodParticles = [];
export const otherCells = []; 

const maxFood = 150; 
let spawnTimer = 0;

export function initEnvironment(canvasWidth, canvasHeight) {
    foodParticles.length = 0; 
    otherCells.length = 0;

    for (let i = 0; i < 50; i++) {
        spawnFood(canvasWidth, canvasHeight);
    }
}

export function updateEnvironment(canvasWidth, canvasHeight) {
    spawnTimer++;
    if (spawnTimer > 40 && foodParticles.length < maxFood) {
        spawnFood(canvasWidth, canvasHeight);
        spawnTimer = 0; 
    }

    otherCells.forEach(cell => {
        // Her opdaterer vi NPC'erne
        cell.update(null, null, canvasWidth, canvasHeight);
    });
}

export function spawnSisterCell(x, y) {
    const sister = new Cell(x, y, false);
    sister.radius = 20; 
    otherCells.push(sister);
}

export function getCellAtPosition(mouseX, mouseY) {
    for (let cell of otherCells) {
        const dx = cell.x - mouseX;
        const dy = cell.y - mouseY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
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
        color: '#FFEB3B'
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