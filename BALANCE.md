# CellSpil — Balance & tal

> Fundamentet for spillets økonomi: tempo-ankre, ATP som fælles valuta, indtægts-/udgiftstal,
> kraft-budgetter for mutationer, invarianter og zoneprofiler.
> **Alle tal her er et første udkast** — meningen er, at de testes og tunes med simulatoren i
> `balance/` (se [README](balance/README.md)). Hænger sammen med [SPEC.md](SPEC.md),
> [EVOLUTION.md](EVOLUTION.md) og [ENVIRONMENT.md](ENVIRONMENT.md).

Enhederne er abstrakte "spil-ATP", ikke joule. Pointen er **indbyrdes** konsistens: at alt
kan sammenlignes på én skala, ikke at tallene er fysisk korrekte.

---

## 1. Tempo-ankre (alt udledes herfra)

Disse mål definerer "rigtigt" tempo. Når et tal skal vælges, vælges det, så disse holder.

| Milepæl | Måltid (realistisk spil) |
|---|---|
| Første deling | ~30 s |
| Første mutation | ~60 s |
| Stabil økonomi / fast deling | ~2 min |
| Specialiseret celle (egen identitet) | ~5 min |
| Topform (synergi-build) | ~10–15 min |

> Simulatoren regner på *ideelle* forhold (ressourcer altid til rådighed), så dens
> delingstider er **nedre grænser** — rigtigt spil med madjagt ligger oven på.

---

## 2. ATP — den fælles valuta

Vi udtrykker alt i ATP. Referencecellen (start: Gram-negativ gæringsheterotrof):

| Størrelse | Værdi |
|---|---|
| Max ATP | 100 |
| Start-ATP | 100 |
| Basal upkeep (bare at leve) | 1,0 ATP/s |
| Byggesten-værdi: 1 aminosyre | 2 ATP |
| Byggesten-værdi: 1 nukleotid | 5 ATP |
| Delingskrav (basis) | 3 amino + 3 nukleotid |
| Delingskrav (skalering) | +1 amino og +1 nukleotid pr. mutation |

Delingens **ATP-ækvivalent** = `(3 + m) × (2 + 5)` = `(3 + m) × 7`, hvor `m` = antal mutationer.
Basis (m=0): **21 ATP**. Det er prisen, overskuds-ATP skal "fylde op", før cellen kan dele sig.

**Vækst:** overskuds-ATP (når net > 0) omsættes til byggesten med en effektivitet på **0,5**.
Tid-til-deling (ideel) ≈ `delings-ATP / (net_overskud × 0,5)`.

---

## 3. Indtægt — metabolisme (ATP/s i gunstig zone)

Hver strategi yder fuldt i sin niche og lidt/intet udenfor. Heterotrofer har altid en
**gæringsbund** (de kan æde sukker, hvis det er der); autotrofer yder **0** uden deres input.

| Strategi | Maks ATP/s | Kræver | Uden for niche |
|---|---|---|---|
| Gæring (start) | 4 | Føde | — (er bunden) |
| Aerob respiration | 20 | O₂ ≥ 0,3 | Falder til gæring (4) |
| Nitratrespiration | 12 | Nitrat, iltfrit | Falder til gæring (4) |
| Sulfatrespiration | 10 | Svovl, iltfrit | Falder til gæring (4) |
| Iltende fotosyntese | 8 | Lys | 0 |
| Iltfri fotosyntese | 7 | Lys + H₂S, iltfrit | 0 |
| Svovloxidation | 6 | Svovl/H₂S | 0 |
| Nitrifikation | 5 | Ammoniak | 0 |
| Methanogenese | 10 | Brint, iltfrit | 0 — **og O₂ er giftigt** (skade) |

Indtægt skaleres lineært med den begrænsende faktor (fx fotosyntese = `8 × lysniveau`,
aerob = `20 × min(1, O₂/0,5) × fødeniveau`).

---

## 4. Udgift — upkeep, bevægelse, syntese

**Upkeep pr. gen (ATP/s, altid):**

| Gen | Upkeep |
|---|---|
| Basal (alle) | 1,0 |
| Aerob respiration | 1,0 |
| Nitrat-/sulfatrespiration | 0,8 |
| Fotosyntese | 1,5 |
| Svovloxidation / nitrifikation / methanogenese | 1,0 |
| Gram-positiv væg | 0,5 |
| Slimkapsel | 0,3 |
| Efflukspumpe | 0,5 |
| Biofilm | 0,2 |
| Megacytose | 1,0 |
| Endocytose | 1,5 |

**Bevægelse (ATP/s, kun mens man bevæger sig):**

| Motorik | Bevægelsesomkostning | Relativ fart |
|---|---|---|
| Flagel | 3,0 | 1,0 |
| Gliding | 0,5 | 0,4 |
| Spiralform | 1,5 | 0,7 (uændret i sejt miljø) |
| Gasvesikler (drift) | 0,2 | 0,3 (kun lodret) |
| Cilier | 4,0 | 1,3 |

**Syntese & evner (engangs-ATP):** aminosyre 2, nukleotid 5, toksin-salve 15, protease 10,
harpun 8, fag-slynge 20.

---

## 5. Mutationspriser (nukleotider, engang) — kraft-budget

Prisen afspejler kraften. Et dyrt gen *skal* betales enten i nukleotider, upkeep eller
miljøafhængighed — aldrig "gratis stærkt".

| Bevægelse | Pris | Metabolisme | Pris | Værktøj | Pris |
|---|---|---|---|---|---|
| Gliding | 2 | Aerob respiration | 4 | Toksin | 2 |
| Gasvesikler | 2 | Nitratrespiration | 4 | Bakteriocin | 2 |
| Flagel | 3 | Sulfatrespiration | 5 | Lysozym | 3 |
| Spiralform | 3 | Iltende fotosyntese | 6 | Harpun (T6SS) | 5 |
| Chemotaksis | 4 | Iltfri fotosyntese | 6 | Antibiotika-prod. | 6 |
| Cilier | 8 | Svovloxidation | 5 | Fag-slynge | 7 |
| | | Nitrifikation | 5 | Fagocytose | 5 |
| Forsvar | Pris | Methanogenese | 7 | Invasiv prædation | 6 |
| Slimkapsel | 3 | | | Ektoparasit | 4 |
| Katalase | 3 | Social/sans | Pris | Megacytose | 5 |
| Gram-positiv væg | 4 | Quorum sensing | 3 | Endocytose | 8 |
| Efflukspumpe | 4 | Bioluminescens | 3 | | |
| Biofilm | 4 | Konjugation | 4 | | |
| Spore | 5 | Siderofor | 3 | Magnetosom | 2 |

---

## 6. Invarianter — regler balancen SKAL overholde

Simulatoren tjekker disse og advarer ved brud:

1. **Ingen gratis energi.** En celle uden gyldigt metabolisk input i sin zone skal have
   net ATP < 0 (autotrof uden lys/kemi = dør).
2. **Magt koster upkeep.** Jo flere/stærkere gener, jo højere upkeep — man kan ikke stable alt.
3. **Hver strategi har en dødszone.** Mindst én zone, hvor strategien tager skade eller yder 0
   (fx methanogen i ilt).
4. **Motorik skal kunne betales.** Et flagel-build skal i sin bedste zone have net > 0
   *mens det svømmer* — ellers er bevægelse en fælde (advarsel, ikke nødvendigvis forbud).
5. **Hver strategi har en vinderzone.** Mindst ét sted, hvor netop denne strategi er bedst.

---

## 7. Zoneprofiler (miljøet balancerer for os)

| Zone | Lys | O₂ | Føde | Kemi | Hvem trives |
|---|---|---|---|---|---|
| Solbeskinnet lavvand | 1,0 | 0,8 | 1,0 | — | Fotosyntese, aerob |
| Åbent vand | 0,5 | 0,5 | 0,6 | — | Aerob, generalister |
| Mørkt dyb | 0,0 | 0,2 | 0,3 | — | Gæring, kemo (svagt) |
| Iltfrit mudder | 0,0 | 0,0 | 0,4 | svovl, brint, ammoniak | Sulfat, methanogen, kemo |
| Svovl-vent (varm) | 0,0 | 0,1 | 0,2 | svovl | Svovloxidation |
| Svovl-mikrobemåtte | 0,6 | 0,0 | 0,3 | svovl | Iltfri fotosyntese |

> *Tilføjet efter simulator-tjek:* mikrobemåtten (oplyst **men** iltfri og svovlrig) blev
> tilføjet, fordi invariant-tjekket afslørede, at iltfri fotosyntese ellers ikke havde nogen
> vinderzone. Et godt eksempel på, at simulatoren fanger huller, før de bliver til spilfejl.

Fordi indtægt afhænger af zonen, behøver vi ikke få tallene til at passe globalt — vi sikrer
bare, at hver strategi har sin vinder- og taberzone. Resten ordner geografien.

---

## 8. Fjender & kamp

Fjenderne lever i samme valuta: HP = effektiv ATP-pulje, skade i ATP/s, størrelse i radius.
Se [ENEMIES.md](ENEMIES.md) for adfærd og kontekst.

| Fjende | HP | Radius | Fart | Kontakt-dps | Særligt | Spawn |
|---|---|---|---|---|---|---|
| Bacillus Simplex | 50 | 14 | 0,5 | 1 | Konkurrent, flokke | ~60 s, hver 60 s |
| Megabacillus | 250 | 36 | 1,0 | 8 | Opsluger celler < radius 30 | ~5 min |
| Amøbe | 200 | 45 | 0,2 | 12 | Opsluger alt den rører; langsom | ~4 min |
| Rov-bakterie | 25 | 8 | 1,2 | (4 indefra) | Invaderer celler ≥ radius 16 | ~3 min |
| Rivaliserende koloni | 80/celle | 20 | 0,4 | 2 (+3 bakteriocin) | Biofilm-væg, 6 celler | ~6 min |
| Bakteriofag | 5 | 4 | 0 | 5 (dræn) | Sprænger efter 8 s → 4 nye | ~3,3 min |

**Spillerens våben (skade/s):** toksin 6 (alle), bakteriocin 8 (kun bakterier), harpun 10
(alle, kontakt), lysozym +6 (kun pansrede mål), endocytose = opslug (kræver radius ≥ 1,2×
byttets). Spiller-HP = max ATP (100); spiller-radius 20, eller 40 med megacytose.

**Kampmodellen** regner for hvert build mod hver fjende: din-dps → tid til drab, fjende-dps →
tid til dit drab, om du kan flygte (fart), og om nogen kan opsluge/invadere den anden. Den
oversætter til et verdikt (vind / flygt / dødeligt). Eksempel-resultater fra simulatoren:

- En **ubevæbnet** celle kan intet dræbe — kun flygte. Våben er en forudsætning for at slås.
- En **bevæbnet jæger** (toksin + harpun) vinder 1v1 mod de fleste, men dør mod Megabacillus
  solo → kræver en **flok på ~3 celler** for at fælde den på ~10 s. (Binder kamp til [SOCIAL.md](SOCIAL.md).)
- En **apex** med megacytose (radius 40) lander *lige under* tærsklen for at kunne opsluge
  Megabacillus (36 × 1,2 = 43,2) — bevidst: størrelse alene er ikke nok, du skal være markant større.
- Et **rent forsvars-build** (gliding) kan ikke engang flygte fra en Bacillus (0,4 < 0,5) —
  rent panser uden våben eller fart er en blindgyde.

> *Modellens grænse:* 1v1-tjekket er offensivt — det måler drab, ikke udholdenhed. Et
> forsvars-builds rigtige styrke (overleve længe, vente fjenden ud) undervurderes, så læs
> "taber 1v1" på et panser-build som "kan ikke afgøre kampen", ikke "dør straks".

---

## 9. Sådan tuner vi (arbejdsgang)

1. Hold tempo-ankrene (afsnit 1) hellige; juster tal, så de holder.
2. Skru kun på **én knap ad gangen**, og kør simulatoren igen.
3. Tæm den positive løkke (flere celler → mere føde → flere celler) med upkeep, crowding-straf
   og delings-skalering (afsnit 2), så den stabiliserer.
4. Hold "feel"-knapper (fart, animation) adskilt fra "økonomi"-knapper.
5. Når simulatoren ser sund ud: playtest, find degenererede strategier, gentag.

Kør kamp-/fjendetjek med `node balance/simulate.js --enemies` og økonomien alene med
`node balance/simulate.js --invariants`.

---

*Tallene ovenfor lever i `balance/balance-config.js` og kan køres/test­es med simulatoren.*
