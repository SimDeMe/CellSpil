import { Cell } from './Cell.js';

// Vi gemmer objektet her, men det er en instans af Cell klassen
export let activeCell = null;

export function initPlayer(canvasWidth, canvasHeight) {
    // Opret en ny celle som spiller
    activeCell = new Cell(canvasWidth / 2, canvasHeight / 2, true);
}

// Funktion til at skifte krop!
export function setActiveCell(newCell) {
    // Gør den gamle til NPC
    if (activeCell) {
        activeCell.isPlayer = false;
        activeCell.color = '#888888';
    }

    // Gør den nye til Spiller
    activeCell = newCell;
    if (activeCell) {
        activeCell.isPlayer = true;
        activeCell.color = '#4CAF50';
    }
}