// config/ — ét sandhedscentrum for tal (se ARCHITECTURE.md §7).
// Single source er pt. balance/balance-config.js, som både spillet og balance-simulatoren
// bruger. Re-eksporteres her, så ny kode importerer fra 'config/' uden at duplikere tal.
// (Kan flyttes helt hertil senere; behold ÉN kilde.)
export * from '../../balance/balance-config.js';
