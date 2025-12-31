export const GameConfig = {
    World: {
        width: 5000,
        height: 5000,
        foodMax: 1500,
        foodSpawnRate: 40, // Frames between spawns
        invasionTime: 60000, // ms
    },
    Player: {
        baseSpeed: 1.5,
        maxAtp: 100,
        baseMaxAmino: 3,
        moveCost: 0.01,
        mutationRate: 0.4,
        backMutationRate: 0.2,
        mutationCosts: {
            cilia: 2,
            flagellum: 3,
            megacytosis: 5,
            toxin: 1,
            protease: 2
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
        aminoValue: 1
    }
};
