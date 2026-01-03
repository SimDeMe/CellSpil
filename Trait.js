
// Trait.js
// Base class and definitions for Traits
// Traits add properties, modify stats, and provide render instructions

/**
 * Base Trait Interface
 */
export class Trait {
    constructor(id, name, type) {
        this.id = id;
        this.name = name;
        this.type = type; // 'morphology', 'defense', 'locomotion', 'organelle'
        this.active = true;
    }

    /**
     * Called when the trait is attached to a cell
     * Use this to modify base stats (maxAtp, defense, etc.)
     * @param {Cell} cell
     */
    apply(cell) {
        // Override
    }

    /**
     * Called every frame/update
     * @param {Cell} cell
     * @param {number} dt
     */
    update(cell, dt) {
        // Override
    }

    /**
     * Returns render instructions or layers
     * @param {Cell} cell
     * @param {PIXI.Graphics} graphics
     */
    render(cell, graphics) {
        // Override
    }
}

// --- SPECIFIC TRAITS ---

export class GramPositiveWall extends Trait {
    constructor() {
        super('gram_positive', 'Gram Positive Wall', 'defense');
        this.thickness = 6;
        this.color = 0x5C4033; // Darker brown/purple
    }

    apply(cell) {
        cell.stats.defense += 5;
        cell.stats.permeability *= 0.8; // Harder to get stuff in
    }
}

export class GramNegativeEnvelope extends Trait {
    constructor() {
        super('gram_negative', 'Gram Negative Envelope', 'defense');
        this.innerColor = 0x8D6E63;
        this.outerColor = 0xF48FB1; // Pinkish (Gram Stain)
        this.thickness = 4;
    }

    apply(cell) {
        cell.stats.defense += 2;
        cell.stats.permeability *= 1.2; // Porins
    }
}

export class Flagellum extends Trait {
    constructor() {
        super('flagellum', 'Flagellum', 'locomotion');
        this.speedBonus = 2.0;
        this.cost = 0.5; // ATP per tick when moving
    }

    apply(cell) {
        cell.stats.speed += this.speedBonus;
    }

    render(cell, g) {
        // Render tail behind cell
        // Access cell.radius, cell.angle, etc.
    }
}

export class Nucleus extends Trait {
    constructor() {
        super('nucleus', 'Nucleus', 'organelle');
    }

    apply(cell) {
        cell.stats.storage *= 2; // More DNA/RNA storage
        cell.isEukaryote = true;
    }
}

export class Mitochondria extends Trait {
    constructor() {
        super('mitochondria', 'Mitochondria', 'organelle');
    }

    apply(cell) {
        cell.stats.energyGen *= 1.5;
        cell.stats.maxAtp *= 2;
    }
}
