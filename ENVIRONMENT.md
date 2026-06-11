# CellSpil — Miljøsystemet

> Udvidet designbeskrivelse af det levende miljø: hvad der varierer i verdenen, hvordan det
> vises elegant, og hvordan cellen både tåler og påvirker sine omgivelser.
> Vision (to-be). Hænger tæt sammen med [EVOLUTION.md](EVOLUTION.md) (metabolisme) og [SPEC.md](SPEC.md).

Miljøet er ikke en kulisse — det er en medspiller. Hver plet i verdenen har sit eget lokale
**mikroklima**, og det afgør, hvilke metaboliske strategier der trives, hvor der er fare, og
hvor det betaler sig at slå sig ned. Samtidig **ændrer cellerne miljøet** med det, de
udskiller. Det skaber feedback-løkker og levende, foranderlige nicher.

---

## 1. De fem miljøparametre

Verdenen er gennemtrukket af fem parametre, der varierer glidende fra sted til sted:

| Parameter | Varierer typisk | Drives af | Betyder for spilleren |
|---|---|---|---|
| **Lys** | Stærkt ved overfladen (top), aftager mod dybet; evt. dag/nat | Position + tid | Brændstof for fotosyntese |
| **O₂ (ilt)** | Højt nær overflade og fotosyntese; lavt i dybe/iltfrie mudderzoner | Fotosyntese (kilde), respiration (dræn) | Krævet af aerob respiration |
| **CO₂** | Nogenlunde modsat O₂ — højt hvor der åndes, lavt hvor der fotosyntetiseres | Respiration (kilde), fotosyntese (dræn) | Råstof for autotrofer |
| **pH** | Sure lommer vs. neutrale/basiske områder | Gæringssyrer, kemi | Uden for tolerance → skade |
| **Temperatur** | Koldt i dybet, varmt ved vents og lavt vand | Zoner + vents | Styrer stofskiftets tempo; ekstremer skader |

Hertil kommer de **kemiske ressourcer** fra metabolisme-grenen (H₂S/svovl, nitrat, ammoniak,
jern, glukose), der ligeledes ligger som lokale gradienter og binder de eksotiske strategier
til bestemte nicher.

**Model:** hver parameter er et glat felt over kortet (et groft gitter af værdier, blødt
interpoleret), der opdateres over tid via **diffusion** (værdier udjævnes mod naboerne),
**kilder/dræn** (celler og zoner, der tilfører eller fjerner stof) og **faste gradienter**
(lys efter dybde, temperatur efter zone). Resultatet er et miljø, der både har stabil struktur
*og* reagerer levende på det, der sker i det.

---

## 2. Sådan vises miljøet — elegant, ikke rodet

Princippet er **lagdeling**: en konstant, diskret stemning i baggrunden, og dyb information
kun når spilleren beder om den. Aldrig fem heatmaps oven på hinanden.

**a) Stemningslag (altid på, diskret).** Baggrunden farves blødt af de mest "fysiske"
parametre: mørkere mod dybet (lys), kølig blå- vs. varm ravtone (temperatur). Det giver
intuitiv fornemmelse af, hvor man er, uden tal.

**b) Linse / overlay (slå til, én ad gangen).** Spilleren vælger én parameter og lægger et
fuldt **heatmap** over det synlige område — fx ilt som blå-til-rød. En lille farveskala-legende
forklarer skalaen, og minimappet viser samme linse i fugleperspektiv. Kun ét overlay ad
gangen holder billedet rent.

**c) Lokale målere (kompakt, ved HUD).** En lille klynge på fem mini-aflæsninger viser
parametrenes *aktuelle værdi lige der, hvor cellen er* — så man kan navigere efter dem uden at
åbne et overlay.

**d) Cellens "trivsels-glød" (øjeblikkelig).** Cellen bærer en blød aura, der skifter farve
efter, hvor godt den har det her og nu: **grøn** = i sit optimum, **gul** = stresset, **rød**
= tager skade. Det er den hurtige besked — detaljen ligger i komfortpanelet.

**e) Komfortpanel (i inspector).** Den fulde sandhed (se næste afsnit).

---

## 3. Cellens optimale betingelser & tolerance

Hver celle har for hver parameter en **tolerance-profil** med fire bånd:

- **Optimum** — cellen trives: bonus til stofskifte og vækst.
- **Tåleligt** — neutralt; ingen bonus, ingen straf.
- **Stress** — straf: langsommere stofskifte og et jævnt ATP-dræn.
- **Dødeligt** — hurtig skade og død.

**Komfortpanelet** viser dette som fem vandrette **tolerance-strimler** — én pr. parameter.
Hver strimmel er farvet rød → gul → grøn → gul → rød (dødelig → stress → optimum → stress →
dødelig), og en levende markør viser den *aktuelle lokale værdi*. Med ét blik ser man: "min
temperatur er fin, men jeg er ved at glide ud i for surt vand mod venstre." Optimums- og
dødsgrænserne er tydeligt markeret, så man kan planlægge.

Sådan ser man både hvor cellen *trives*, og hvor tæt på kanten den er — præcis som efterspurgt.

---

## 4. Mutationer flytter cellens ranges

Tolerance er ikke fast — den er en del af evolutionen. To slags gener påvirker den:

**Metaboliske gener sætter krav.** En metabolisk strategi flytter automatisk de relevante bånd:

- *Aerob respiration* gør lav-ilt til en stress-/dødszone (du skal bruge O₂).
- *Fotosyntese* gør mørke til stress (du skal bruge lys), men gør dig ligeglad med føde.
- *Methanogenese* vender det om: ilt bliver giftigt, og du trives kun i iltfrit, varmt dyb.

**Dedikerede tolerance-gener udvider eller forskyder bånd:**

| Mutation | Effekt på ranges |
|---|---|
| **Termofil** | Forskyder temperatur-optimum opad — trives ved vents, lider i kulden |
| **Psykrofil** | Optimum nedad — elsker det kolde dyb |
| **Acidofil / Alkalifil** | Flytter pH-optimum mod surt hhv. basisk |
| **Gram-positiv cellevæg** | *Udvider* alle stress-/dødsbånd — bredere tolerance hele vejen rundt (robust generalist) |
| **Sporedannelse / hvilestadie** | Lader cellen overleve kortvarigt i dødelige bånd ved at gå i dvale |

Det betyder, at to spillere kan stå i samme zone og opleve den modsat: et paradis for den ene,
en dødsfælde for den anden. Miljøet er først farligt, *når man ved, hvem man er*.

---

## 5. Cellen påvirker miljøet (niche-konstruktion)

Celler er ikke passive — de **udskiller stoffer**, der ændrer det lokale mikroklima. Det,
én celle udånder, bliver et andet væsens brændstof eller gift:

| Strategi / handling | Udskiller | Lokal effekt |
|---|---|---|
| Aerob respiration | CO₂ | Hæver CO₂, sænker O₂ |
| Iltende fotosyntese | O₂ | Iltet en lomme op — fodrer aerobe naboer (og dig selv) |
| Gæring | Organiske syrer | Sænker pH — forsurer nærområdet |
| Sulfatrespiration | H₂S | Giftigt for de fleste; brændstof for svovl-strategier |
| Nitrifikation | Nitrat | "Gøder" vandet — føde for nitrat-respiratorer |
| Toksin-evne | Gift | Akut skadesky (kortvarig) |

Konsekvensen er **levende feedback-løkker**: en klynge fotosyntetikere iltner et helt område og
gør det beboeligt for aerobe rovdyr; et felt af gærende celler forsurer vandet, til kun
acidofile kan klare det. Spilleren kan udnytte dette aktivt — *terraforme* en lomme til sin
egen fordel, eller forgifte en zone for at holde fjender ude. Senere (kolonier) bliver det til
ægte økosystem-ingeniørkunst.

---

## Designprincipper

1. **Miljøet skaber nicherne.** Uden gradienter er metabolismevalgene ligegyldige. De fem
   parametre er det, der gør "hvor du bor" til en strategi.
2. **Læsbarhed over alt.** Diskret stemning som standard; dybde kun på forespørgsel; én linse
   ad gangen; én glød-farve til den hurtige besked.
3. **Identitet farver oplevelsen.** Fordi mutationer flytter tolerance, oplever ingen to
   organismer den samme verden ens.
4. **Affald er aldrig bare affald.** Hver udskillelse ændrer miljøet og er brændstof eller
   våben for nogen — det binder metabolisme, miljø og senere kolonier sammen til ét system.

---

*Næste skridt, hvis ønsket: en konkret parameter-tabel (skalaer, default-tolerancer pr.
startcelle, kilde-/dræn-rater og diffusionshastighed) samt et UI-mockup af komfortpanelet og
linse-overlayet.*
