export const GameConfig = {
    debugMode: true, // [NEW] Debug Mode Flag
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
            toxin: 1, // Amino Cost
            protease: 1, // Amino Cost
            highTorque: 5,
            endocytosis: 8,
            highSpeedRetraction: 4, // [NEW] Upgrade for Pili
            multiplexPili: 6,       // [NEW] Upgrade for Pili
            gramPositive: 4         // [NEW] Toxin Resistance (Cell Wall)
        },
        upkeep: {
            base: 0,
            pili: 0.01,
            flagellum: 0.02,
            highTorque: 0.03,
            megacytosis: 0.02,
            highSpeedRetraction: 0.02,
            multiplexPili: 0.03,
            gramPositive: 0.01
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
    Megabacillus: {
        spawnTime: 30000, // 30 sekunder (DEBUG TEST TID, ellers 300000 = 5 min)
        count: 2,
        speedFactor: 1.0, // [UPDATED] Same speed as regular
        color: '#D32F2F', // Deep Red
        stats: {
            radius: 30, // Lidt større end max (28)
            maxAtp: 200,
            maxAmino: 50
        }
    },
    Resources: {
        glucoseEnergy: 20,
        aminoValue: 1,
        nucleotideValue: 1 // [NEW] Værdi pr. klump
    },
    SpawnRates: {
        aminoThreshold: 0.6,      // Hvis random > 0.8 -> Amino
        nucleotideThreshold: 0.8 // Hvis random > 0.95 -> Nucleotide
    },
    DangerZones: {
        spawnRate: 3600, // Frames (e.g. 60 sec at 60fps). 3600 = 1 min. User said "a few minutes". Let's say 2 mins = 7200. Debug: 1200 (20s).
        // User said "appear randomly after a few minutes", stay for a few minutes.
        // Let's go with spawn every ~2-3 minutes.
        spawnIntervalMin: 7200, // 2 min
        spawnIntervalMax: 10800, // 3 min
        duration: 3600, // 1 min duration before shrinking
        maxRadius: 400,
        growthSpeed: 0.5,
        damageRate: 0.5, // ATP/Amino per frame
        colors: {
            toxin: 'rgba(0, 255, 0, 0.15)', // Greenish
            antibiotic: 'rgba(0, 50, 255, 0.15)' // Blueish
        }
    }
};
