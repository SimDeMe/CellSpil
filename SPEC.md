# CellSpil — Designvision

> En overordnet specifikation af, hvad CellSpil skal være, og hvad det skal kunne.
> Dette er en *vision* (to-be), ikke en beskrivelse af den nuværende kode. Den beskriver
> det færdige spil, vi sigter efter — så vi har en fælles retning at bygge og rydde op imod.

---

## 1. Pitch

Du er én bakterie i en dråbe vand. Alt liv omkring dig vil æde, forgifte eller udkonkurrere
dig. Du overlever ved at finde mad, omdanne den til energi og byggesten, dele dig — og
langsomt udvikle nye gener, der gør dig til alt fra en hurtig svømmer til et mikroskopisk
rovdyr. CellSpil er et **overlevelses- og evolutionsspil** om at gå fra sårbar enkeltcelle
til dominerende organisme.

Spillet er samtidig et **læringsspil**: mekanikkerne afspejler ægte cellebiologi
(metabolisme, mutationer, Gram-positiv/negativ, fagocytose), så man uden at mærke det lærer,
hvordan en celle faktisk fungerer.

## 2. Designsøjler

Disse tre principper afgør, om en idé hører hjemme i spillet:

1. **Forståeligt før realistisk.** Biologien er inspiration, ikke en lærebog. Når realisme
   og læsbarhed støder sammen, vinder læsbarheden. Spilleren skal altid kunne se *hvorfor*
   noget skete.
2. **Få ressourcer, dybe valg.** Hellere et lille antal ressourcer, som spilleren forstår
   til bunds, end mange, der gør HUD'et til et regneark. Dybden kommer fra *valgene*, ikke
   fra antallet af tal.
3. **Hvert gen ændrer spillemåden.** En mutation skal mærkbart ændre, *hvordan* man spiller
   — ikke bare give "+10 %". Et nyt gen er en ny strategi.

## 3. Kernesløjfe (core loop)

Den ene sætning spilleren skal kunne mærke hele tiden:

> **Spis → Omsæt → Voks → Del dig → Muter → (gentag, men stærkere)**

- **Spis:** Saml næring i miljøet, eller jagt og fordøj andre celler.
- **Omsæt:** Cellen omdanner næring til energi (ATP) og byggesten via sin metabolisme.
- **Voks:** Nok byggesten gør cellen klar til deling.
- **Del dig:** Du bliver til to. Det er sådan, du både overlever tab og kan mutere.
- **Muter:** Ved deling kan en ny genetisk egenskab opstå — din vej til at blive stærkere.

Sløjfen skal kunne loopes på 20–40 sekunder tidligt i spillet, så fremgang føles konstant.

## 4. Ressourcer

Spilleren skal kunne holde styr på økonomien i hovedet. Vi sigter mod **tre kerne­ressourcer**
som det, spilleren aktivt styrer efter:

- **ATP (energi).** Brændstof. Brugt til bevægelse, evner og syntese. Løber den tør, dør cellen.
- **Aminosyrer (byggesten).** Bruges til at vokse og dele sig.
- **Nukleotider (DNA).** Bruges til mutationer.

Bag kulisserne kan der findes et **metabolisme-lag** (råstoffer som glukose, kulstof,
kvælstof, fosfat, der omdannes til de tre ovenfor). Visionen er, at dette lag skal være
*valgfrit at mikrostyre*: en ny spiller skal kunne klare sig på autopilot, mens en
øvet spiller kan optimere omsætningen for at få et forspring. Det må aldrig blive en
forudsætning for at have det sjovt.

## 5. Evolution & mutationer

Det er spillets hjerte. Generne falder i tre grene — **bevægelse**, **metabolisme** og
**værktøjer** — der hver tilbyder reelle strategiske valg frem for lineære opgraderinger.

- **Bevægelse.** Flere *flydende* måder at flytte sig på (flagel, gliding, spiralform,
  gasvesikler, cilier) — hver med sin egen følelse. Den tidligere rykvise pili-bevægelse er
  fjernet, fordi den var rodet at se på.
- **Metabolisme.** Den dybeste gren: udvikl dit stofskifte fra simpel gæring til komplekse
  strategier og bliv *heterotrof* (æder), *autotrof* (laver egen mad via fotosyntese eller
  kemosyntese) eller *mixotrof* (begge dele).
- **Værktøjer.** Et bredt katalog af våben og redskaber i fire kategorier — angreb (toksin,
  bakteriocin, harpun, lysozym, fag-slynge), prædation (endocytose, fagocytose, invasiv
  prædation), forsvar (cellevæg, slimkapsel, efflukspumper, biofilm, spore) og sansning/social
  (chemotaksis, quorum sensing, bioluminescens, konjugation).

**Designregel:** man skal ikke kunne tage alt. Mutationer skal koste nok (og evt. øge
deling/upkeep), så spilleren tvinges til at forme en *identitet* — en solfangende svømmer,
et giftigt baghold-rovdyr, en pansret overlever — i stedet for en alvidende supercelle.

> Den fulde, udvidede beskrivelse af evolutionssystemet ligger i [EVOLUTION.md](EVOLUTION.md).

## 6. Fjender & farer

Verden skal føles levende og fjendtlig, men læsbar. **Mange farer afhænger af, hvem du er** —
iltfrit mudder dræber en aerob celle, men er hjem for en methanogen.

Levende fjender spænder fra **Bacillus** (mild konkurrent) og **Megabacillus** (rovdyr, der
opsluger dig) til **fager** (vira, der hærger tætte flokke), **rov-bakterier** (snyltere, der
æder dig indefra), **amøber** (langsom områdefare) og **rivaliserende kolonier** (sene
modspillere, der bruger samme sociale mekanik som dig). Miljøfarer går fra klassiske gift- og
antibiotika-zoner til ekstremer i de fem miljøparametre — pH, temperatur, iltchok, iltsvind,
UV ved overfladen og lokal hungersnød.

Hver fare har et modtræk i evolutionstræet, så truslerne *driver* udviklingen. Og alt varsles
tydeligt (farve, lyd, minimap, trivsels-glød) — død er altid et dårligt valg, aldrig vilkårligt.

> Den fulde beskrivelse ligger i [ENEMIES.md](ENEMIES.md).

## 7. Miljøet (mikroklima)

Verdenen er et levende miljø, ikke en kulisse. Fem parametre — **lys, ilt (O₂), CO₂, pH og
temperatur** — varierer glidende fra sted til sted og giver hver plet sit eget mikroklima.
Det afgør, hvilke metaboliske strategier der trives hvor, og hvor der er fare.

Hver celle har en **tolerance-profil**: et optimum, hvor den trives, og stress-/dødszoner
udenfor. Mutationer flytter disse ranges (termofil, acidofil, bred cellevæg-tolerance osv.),
så samme zone kan være paradis for én organisme og dødsfælde for en anden. Cellerne
**udskiller også stoffer** (ilt, CO₂, syrer, H₂S), der ændrer det lokale miljø — så man kan
terraforme en lomme til sin fordel eller forgifte en zone for at holde fjender ude.

Miljøet vises lagdelt og roligt: en diskret stemning i baggrunden, valgbare heatmap-"linser"
(én ad gangen), lokale målere ved HUD, en trivsels-glød på cellen (grøn/gul/rød) og et fuldt
komfortpanel i inspectoren.

> Den fulde beskrivelse ligger i [ENVIRONMENT.md](ENVIRONMENT.md).

## 8. Det sociale system (kolonier)

Du spiller ikke en celle — du spiller en **slægt**. Når du deler dig, vælger du, hvilken celle
du vil styre; resten lever videre som autonome kloner, der følger en **adfærdspolitik** (saml,
forager, forsvar, jagt), du sætter. Dør din aktive celle, overgår styringen til en anden i
stammen — flokken er dine ekstra liv.

Det skal kunne **betale sig at holde sammen**: tilstødende celler deler ressourcer, bytter
metaboliske biprodukter i en intern fødekæde (ilt ↔ CO₂, H₂S ↔ svovl), terraformer deres
mikroklima hurtigere, danner biofilm-forsvar og låser quorum-evner op. Men tæthed har en pris
(lokal udpining, epidemier, synlighed), så spredning er et legitimt modsvar. Det lange mål er
ægte **flercellethed**: celler, der specialiserer sig i roller (føde, soldat, reproducent) og
bliver til en proto-organisme.

> Den fulde beskrivelse ligger i [SOCIAL.md](SOCIAL.md).

## 9. Spillerens rejse (progression)

En typisk session skal have en mærkbar bue:

1. **Skrøbelig start.** Lille Gram-negativ celle. Find mad, undgå at dø, lær styringen.
2. **Første mutation.** Bevægelse eller forsvar — det første rigtige valg.
3. **Etablering.** Stabil økonomi, regelmæssig deling, en voksende "stamme" af dine celler.
4. **Specialisering.** Du forpligter dig til en identitet (rovdyr / overlever / ådselæder).
5. **Dominans.** Du tackler Megabacillus og farezonerne på dine egne præmisser.

Der er ikke nødvendigvis en "you win"-skærm — målet er at se, hvor langt og hvor specialiseret
en organisme man kan udvikle, før verden indhenter en. (En valgfri sejrsbetingelse —
f.eks. "nå Tier 4" eller "udslet alle Megabacillus" — kan tilføjes senere.)

## 10. Styring & interface

- **Mus** styrer retning — cellen svømmer eller rykker mod markøren.
- **Få taster** til aktive evner og deling (f.eks. *D* = del, *E*/*R* = evner).
- **HUD** viser de tre kerneressourcer som bjælker, generation, population og et **minimap**.
- En **inspector** giver adgang til mutationstræet og (for den nysgerrige) det dybere
  metabolisme-lag — uden at fylde hovedskærmen.

Princippet: **hovedskærmen er ren; dybden ligger ét klik væk.**

## 11. Stemning, grafik & lyd

- **Look:** rene 2D-former med organisk liv — celler, der bølger og deformeres ved fart
  og kollision. Køligt, mikroskop-agtigt farveskema med få, klare signalfarver
  (grøn = dig, rød = fare).
- **Lyd:** rolig undervands-ambience som bund, klare feedback-lyde for vigtige hændelser
  (spis, skade, mutation, lav energi).
- **Følelse:** stille og koncentreret, med korte spidser af spænding, når et rovdyr eller
  en giftzone nærmer sig.

## 12. Teknisk retning

- **Web-spil** i JavaScript, der kører i browseren uden installation.
- **Komponent-baseret cellemodel:** en celle er en kerne plus et sæt *traits/gener*, så nye
  egenskaber kan tilføjes uden at omskrive alt.
- **Datadrevet balance:** alle tal (omkostninger, hastigheder, spawn-rater) bør ligge ét
  centralt sted, så spillet kan finjusteres uden at røre spil-logikken.
- **Ydelse** skal kunne holde til mange celler og partikler på skærmen samtidig.

## 13. Bevidst uden for scope (i første omgang)

For at undgå at sløjfen drukner igen, holder vi følgende som *senere* idéer, ikke krav:
vandstrøm, gemme/indlæse DNA (New Game+), mobil-styring og avanceret WebGL-grafik. (Det
sociale spor designes nu, men dets mest avancerede del — fuld celle-**differentiering** til en
proto-organisme — er det fjerne endemål, ikke et førstekrav.) De er velkomne — men først når
kernen er sjov og stabil.

---

*Dette dokument er en levende vision. Når vi er enige om den, kan næste skridt være en
gap-analyse: hvad i den nuværende kode passer til visionen, hvad mangler, og hvad bør rives ned.*
