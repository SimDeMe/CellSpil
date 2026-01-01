export const GameConfig = {
    World: {
        width: 5000,
        height: 5000,
        foodMax: 1500,
        foodSpawnRate: 40, // Frames between spawns
        invasionTime: 60000, // ms
    },
    Player: {
        baseSpeed: 2,
        maxAtp: 100,
        baseMaxAmino: 3,
        baseMaxNucleotides: 3, // [NEW] DNA byggesten
        moveCost: 0.001,
        mutationRate: 1.0,
        backMutationRate: 0.0,
        mutationCosts: {
            pili: 2, // Replaces Cilia
            flagellum: 3,
            megacytosis: 5,
            toxin: 1,
            protease: 2,
            highTorque: 5,
            endocytosis: 8,
            highSpeedRetraction: 4, // [NEW] Upgrade for Pili
            multiplexPili: 6        // [NEW] Upgrade for Pili
        },
        upkeep: {
            base: 0,
            pili: 0.01,
            flagellum: 0.02,
            highTorque: 0.03,
            megacytosis: 0.02,
            highSpeedRetraction: 0.02,
            multiplexPili: 0.03
        },
        moveCostOverride: {
            pili: 0.015,
            flagellum: 0.025,
            highTorque: 0.04,
            highSpeedRetraction: 0.02, // More efficient per speed unit? or just higher cost?
            multiplexPili: 0.025
        }
    },
    Bacillus: { // The Enemy
        speed: 0.5,
        maxAtp: 150,
        passiveDecay: 0.01,
        populationCap: 50
    },
    Resources: {
        glucoseEnergy: 20,
        aminoValue: 1,
        nucleotideValue: 1 // [NEW] Værdi pr. klump
    },
    SpawnRates: {
        aminoThreshold: 0.7,      // Hvis random > 0.8 -> Amino
        nucleotideThreshold: 0.8 // Hvis random > 0.95 -> Nucleotide
    }
};
