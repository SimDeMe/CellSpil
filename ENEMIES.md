# CellSpil — Fjender & farer

> Beskrivelse af de levende fjender og miljøfarer, der gør verdenen fjendtlig.
> Vision (to-be). Hænger sammen med [ENVIRONMENT.md](ENVIRONMENT.md) (mikroklima),
> [EVOLUTION.md](EVOLUTION.md) (modtræk) og [SOCIAL.md](SOCIAL.md) (kolonier).

Et bærende princip: **mange farer afhænger af, hvem du er.** Iltfrit mudder er en dødsfælde
for en aerob celle, men et hjem for en methanogen — og omvendt er en iltet overflade gift for
methanogenen. Faren ligger i mismatchet mellem din identitet og din placering. Oven på det
ligger så de aktive, levende fjender.

---

## 1. Levende fjender

| Fjende | Trusselsniveau | Adfærd | Bedste modtræk |
|---|---|---|---|
| **Bacillus Simplex** | Lavt (pres) | Hurtig stavbakterie; konkurrerer om føden, samler sig i små flokke | Udkonkurrér eller forgift; vokse hurtigere |
| **Megabacillus** | Højt (rovdyr) | Stor og aggressiv; opsluger mindre celler — også dig | Flygt tidligt; flokjagt eller toksin sent |
| **Bakteriofag (virus)** | Højt mod flokke | Ikke-levende; inficerer en celle, kaprer den og sprænger den for at sprede sig | Spore/dvale, efflukspumper, **spredning** (tæt flok = epidemi) |
| **Rov-bakterie** (Bdellovibrio-type) | Mellem | Lille snylter; trænger ind i en større celle og fortærer den indefra | Tyk Gram-positiv væg eller glat slimkapsel |
| **Amøbe** | Mellem (områdefare) | Langsom, men omslutter alt på sin vej | Hold afstand; den er let at undvige, dødelig at røre |
| **Rivaliserende stamme** (biofilm-koloni) | Højt (sent) | En fjendtlig koloni, der holder territorium med biofilm og bakteriocin | Belejr, forgift zonen, eller udmanøvrér med egen koloni |

**Designnote:** den rivaliserende stamme og fagen er bevidst spejle af spillerens egne
systemer. Fagen straffer den, der klumper sammen (jf. prisen for kohæsion i [SOCIAL.md](SOCIAL.md)),
og rivalkolonien bruger samme sociale mekanik som dig — så fjenderne lærer spilleren systemet
ved at vende det imod ham.

---

## 2. Miljøfarer

Nogle er klassiske "zoner", andre er ekstremer i de fem miljøparametre fra
[ENVIRONMENT.md](ENVIRONMENT.md).

| Fare | Hvad den gør | Modtræk |
|---|---|---|
| **Toksin-zone** (grøn) | Dræber ubeskyttede celler | Gram-positiv væg; efflukspumper |
| **Antibiotika-zone** (blå) | Rammer specifikt Gram-negative (din startform) | Udvikl cellevæg *eller* efflukspumper |
| **pH-ekstrem** (sur/basisk lomme) | Skade uden for din pH-tolerance | Acidofil/alkalifil mutation; bred væg-tolerance |
| **Termisk ekstrem** (koldt dyb / skoldhed vent) | Skade uden for temperatur-tolerance | Termofil/psykrofil; vents er både fare *og* ressource |
| **Iltchok** | Iltet vand forgifter anaerober (methanogen m.fl.) | Katalase; flygt til iltfrit; eller vælg en aerob identitet |
| **Iltsvind (dødzone)** | Iltfrit vand kvæler aerober | Skift til gæring/anaerob respiration; flygt opad |
| **UV-flare ved overfladen** | For meget lys skader cellen oppe i lyset | Pigment/slimkapsel — risikoen ved at solbade for fotosyntese |
| **Lokal hungersnød** | En udpint plet (ofte efter overbefolkning) tømmes for føde | Spred flokken; mobilitet; skift til autotrofi |

---

## 3. Identitets-relativ fare (kerneidéen)

Den samme plet kan være paradis eller grav — alt efter dit build. Det gør udforskning til en
strategisk gåde frem for en huskeliste:

- En **aerob svømmer** elsker den iltede overflade, men kvæles i mudderet.
- En **methanogen** trives i mudderet, men dør i det iltede vand.
- En **fotosyntetiker** skal op i lyset — men møder dér UV og Megabacillus.
- En **svovl-specialist** ejer venten, hvor varmen ellers ville dræbe alle andre.

Fordi mutationer flytter dine tolerance-ranges, *ændrer du selv*, hvad der er farligt. At
udvikle sig er at omtegne sit eget farekort.

---

## 4. Modtræk-oversigt (farerne driver evolutionen)

Hver fare har et svar i evolutionstræet — det er sådan, truslerne giver retning til mutationer:

| Trussel | Driver spilleren mod |
|---|---|
| Antibiotika-zoner | Gram-positiv væg / efflukspumper |
| Gift & kemiske angreb | Efflukspumper, katalase, slimkapsel |
| Rovdyr (Megabacillus, amøbe) | Fart (motorik), væg, flokjagt, toksin |
| Fager & epidemier | Spore/dvale, spredning, resistens |
| Snyltere | Tyk væg, slimkapsel |
| Miljøekstremer | Tolerance-mutationer (termofil, acidofil …) |
| Hungersnød | Mobilitet, autotrofi, koloni-fødedeling |

---

## 5. Princip: fair fare, ikke vilkårlig død

Konsekvent med [SPEC.md](SPEC.md): alle farer **varsles tydeligt** før de rammer —
farvet zone, en advarselslyd, en markør på minimappet, cellens **trivsels-glød** der slår over
i gult. Spilleren skal altid kunne se faren komme og nå at reagere. Død er resultatet af et
dårligt valg eller for sen reaktion — aldrig af noget usynligt.

---

## 6. Optrapning over en session

Farerne skal vokse med spilleren, så spændingen holdes:

1. **Tidligt:** Bacillus-konkurrence og enkle giftzoner. Lær at overleve og bevæge dig.
2. **Mellem:** Megabacillus dukker op; antibiotika- og pH/temperatur-zoner tvinger forsvar frem.
3. **Sent:** Fager, snyltere og rivaliserende kolonier — trusler, der angriber din *flok* og
   din strategi, ikke kun din enkeltcelle.
4. **Topspil:** Du er selv blevet faren — apex-rovdyr eller en dominerende koloni, der jager
   det, der før jagede dig.

---

*Næste skridt, hvis ønsket: konkrete tal (skadesrater, spawn-tider, fjende-stats, fag-spredningshastighed)
til balance-laget i [BALANCE.md](BALANCE.md) — så fjenderne kan testes i simulatoren.*
