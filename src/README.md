# src/ — ny kodebase (skelet)

Realiserer lag-strukturen fra [../ARCHITECTURE.md](../ARCHITECTURE.md) under `src/`. Dette er
et **stillads**: mapper, komponent-typer og system-signaturer er på plads; logikken er TODO.

```
src/
  config/   re-eksporterer det fælles tal-lag (single source: ../balance/balance-config.js)
  core/     hovedløs simulation — kører uden grafik
    systems/  ét system pr. fil (rene funktioner over state)
  render/   PixiJS — læser state, tegner (browser)
  ui/       HUD, inspector, komfortpanel, minimap (browser)
  input/    mus/taster → intents
  game/     main.js — samler lagene + fast-tidsskridt-løkke (browser)
  smoke.js  hovedløs røgtest af kernen
```

## Kør røgtesten (verificerer at kernen kører uden grafik)
```bash
npm run smoke      # eller: node src/smoke.js
```

## Dataflow (énvejs)
`input → intents → core/systems muterer state → render/ui læser state`. Render og UI må
**aldrig** mutere simulationstilstanden.

## Sådan udbygges det
Tag ét system ad gangen i `core/systems/`, implementér det mod sit designdokument (se
tabellen i ARCHITECTURE.md §5), og hold tallene i `config/`. Brug `balance/`-simulatoren som
integrationstest af økonomien og kampen.
