export const foodParticles = [];
// NYT: Liste til andre celler (NPC'er)
export const otherCells = []; 

const maxFood = 150; 
const spawnRate = 40; 
let spawnTimer = 0;

export function initEnvironment(canvasWidth, canvasHeight) {
    for (let i = 0; i < 50; i++) {
        spawnFood(canvasWidth, canvasHeight);
    }
}

export function updateEnvironment(canvasWidth, canvasHeight) {
    spawnTimer++;
    if (spawnTimer > spawnRate && foodParticles.length < maxFood) {
        spawnFood(canvasWidth, canvasHeight);
        spawnTimer = 0; 
    }

    // NYT: Opdater også søster-cellerne (få dem til at flyde lidt)
    otherCells.forEach(cell => {
        cell.x += (Math.random() - 0.5) * 0.5; // Brownske bevægelser
        cell.y += (Math.random() - 0.5) * 0.5;
        // Simpel animation af deres form
        cell.pulse += 0.05;
    });
}

// NYT: Funktion til at skabe en søster-celle
export function spawnSisterCell(x, y, radius, color) {
    otherCells.push({
        x: x,
        y: y,
        radius: radius, // De starter store (halvdelen af moderen, men vi snyder lidt visuelt)
        color: color,
        pulse: Math.random() * 10 // Start animation et tilfældigt sted
    });
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
    // 1. Tegn Mad
    foodParticles.forEach(food => {
        ctx.beginPath();
        if (food.type === 'glucose') {
            ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
        } else {
            ctx.rect(food.x - food.radius, food.y - food.radius, food.radius * 2, food.radius * 2);
        }
        ctx.fillStyle = food.color;
        ctx.fill();
        ctx.closePath();
    });

    // 2. NYT: Tegn Søster-celler
    otherCells.forEach(cell => {
        // Beregn pulserende størrelse
        const r = cell.radius + Math.sin(cell.pulse) * 2;
        
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#888'; // Gør dem grå for at vise de er "NPC'er"
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
    });
}

export function checkCollisions(player) {
    if (!player.alive) return;

    for (let i = foodParticles.length - 1; i >= 0; i--) {
        const food = foodParticles[i];
        const dx = player.x - food.x;
        const dy = player.y - food.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.currentRadius + food.radius) {
            foodParticles.splice(i, 1);
            
            if (food.type === 'glucose') {
                player.atp += 20; 
                if (player.atp > player.maxAtp) player.atp = player.maxAtp;
            } else if (food.type === 'amino') {
                player.aminoAcids += 1;
                if (player.aminoAcids > player.maxAminoAcids) player.aminoAcids = player.maxAminoAcids;
            }
        }
    }
}