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
            cilia: 2,
            flagellum: 3,
            megacytosis: 5,
            toxin: 1,
            protease: 2,
            highTorque: 5,
            endocytosis: 8 // [NEW] Dyr, kræver Megacytose
        },
        upkeep: {
            base: 0,
            cilia: 0.01,
            flagellum: 0.02,
            highTorque: 0.03,
            megacytosis: 0.02
        },
        moveCostOverride: {
            cilia: 0.015,
            flagellum: 0.025,
            highTorque: 0.04
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
    }
};
