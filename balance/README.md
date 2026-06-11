# balance/ — økonomi-simulator

Et lille headless-værktøj til at teste spillets tal **uden at spille**. Bruger samme
referencetal som [../BALANCE.md](../BALANCE.md).

## Filer
- `balance-config.js` — alle tal (metabolisme, bevægelse, værktøj, zoner). **Skru her.**
- `simulate.js` — motoren: regner ATP-ind/-ud, overlevelse, tid-til-deling og invarianter.

## Kør
```bash
node balance/simulate.js              # økonomi-eksempler + fjender + invariant-tjek
node balance/simulate.js --invariants # kun invariant-tjek på tværs af zoner
node balance/simulate.js --enemies    # kun trusselsvurdering, flokjagt og fag-epidemi
```

## Hvad den svarer på
For et **build** (én metabolisme + én bevægelse + valgfrie værktøjer) i en **zone**:
- indtægt, upkeep og bevægelsesomkostning pr. sekund,
- net-ATP i hvile og under bevægelse (overlever den? bløder den?),
- tid-til-deling (ideel — altså en *nedre grænse*, da ressourcer antages altid til rådighed),
- advarsler: dør her / kan ikke betale for at bevæge sig / ilt er giftig her.

## Invarianterne den tjekker
1. **Ingen gratis energi** — autotrof uden input i en zone må ikke have net > 0.
2. **Hver strategi har en dødszone** (net < 0 eller toksisk et sted).
3. **Hver strategi har en vinderzone** (net > 0 et sted).

## Arbejdsgang
Skru på **én** værdi i `balance-config.js` → kør → tjek at tempo-ankrene og invarianterne
stadig holder. Tilføj egne builds/zoner nederst i `simulate.js`.
