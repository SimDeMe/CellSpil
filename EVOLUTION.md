# CellSpil — Evolutionssystemet

> Udvidet designbeskrivelse af mutationer, bevægelse og metabolisme.
> Vision (to-be), ikke nuværende kode. Hænger sammen med [SPEC.md](SPEC.md), afsnit 5.

Evolution er spillets hjerte. Du udvikler ikke "et bedre dyr" ad én lineær akse — du
**former en organisme** ved at vælge en metabolisk strategi, en måde at bevæge dig på,
og et sæt værktøjer til angreb/forsvar. Generne griber ind i hinanden og i miljøet, så
forskellige bygninger trives forskellige steder i verdenen.

Generne falder i tre grene:

- **A. Bevægelse** — *hvordan* du flytter dig.
- **B. Metabolisme** — *hvordan* du skaffer energi og kulstof. (Den dybeste gren.)
- **C. Værktøjer** — angreb, forsvar og prædation.

---

## A. Bevægelsesgrenen

Den rykvise "twitch"-bevægelse (pili) udgår — den var rodet at se på. I stedet tilbyder vi
flere *flydende* bevægelsesmåder, der hver giver en tydeligt forskellig følelse, så valget
af motorik bliver en del af din identitet.

| Gen | Følelse | Styrke | Pris/svaghed |
|---|---|---|---|
| **Flagel** (udgangspunkt for motilitet) | Jævn, retningsbestemt svømning mod musen | Hurtig, præcis, alsidig | Energikrævende; konstant upkeep |
| **Gliding (glidebevægelse)** | Langsom, lydløs glidning langs overflader, efterlader slimspor | Billig, effektiv, snigende — god til at ligge på lur | Lav fart; dårlig til flugt |
| **Spiralform (aksialfilament)** | Hele cellen snor sig som en proptrækker | Skærer gennem tykt/sejt miljø uden at sinkes; meget stabil | Langsommere i åbent vand; svær at vende brat |
| **Gasvesikler (opdrift)** | Styret op/ned-drift i vandsøjlen frem for aktiv svømning | Næsten gratis at holde i gang; perfekt til at finde lys eller flygte lodret | Ringe vandret kontrol — bedst som *supplement* |
| **Cilier (sent, eukaryot)** | Mange koordinerede fimrehår; meget glat og adræt | Høj fart *og* skarpe drej | Dyr i upkeep; sent tier |

**Chemotaksis** (sansning, ikke en motor): en opgradering der lægger sig oven på *enhver*
bevægelsesmåde og lader cellen automatisk styre mod nærende stoffer og væk fra fare. Gør
mikrostyring valgfri og belønner den, der investerer i "sanser".

Synergi: **gasvesikler + fotosyntese** = stig mod lyset om dagen, syng lavt om natten.
**Gliding + et giftvåben** = baghold. **Spiralform** trives i sej, kemisk tæt mudderzone,
hvor de kemoautotrofe strategier (se nedenfor) også bor.

> Pili kan overleve som et *ikke-bevægelses*-værktøj senere (vedhæftning, biofilm, DNA-tyveri),
> men det er bevidst skubbet til grenen for værktøjer, ikke motorik.

---

## B. Metabolismegrenen — fra simpel til kompleks

Her ligger den store udvidelse. Alle starter som det simplest mulige liv og kan **udvikle
deres stofskifte fra én primitiv reaktion til en kompleks motor** — og undervejs vælge, om de
vil æde (heterotrof), lave deres egen mad (autotrof) eller begge dele (mixotrof).

**Designidé:** hver metabolisk strategi er knyttet til *miljøet*. Verdenen har derfor
gradienter af **ilt** (iltede vs. iltfrie zoner), **lys** (oplyst overflade vs. mørke dyb)
og **kemi** (svovl/H₂S, nitrat, jern, ammoniak, CO₂). Det skaber nicher: en strategi, der er
overlegen ét sted, er hjælpeløs et andet. Det er dét, der gør valget interessant.

### Udgangspunkt — Gæring (anaerob heterotrof)

Du starter her: **glykolyse + gæring**. Du nedbryder sukker til en lille smule energi *uden
at skulle bruge ilt*. Virker overalt, men giver kun lidt ATP og efterlader organisk affald.
Svagt, men robust — det biologiske nulpunkt, alt andet bygger ovenpå.

### Heterotrofe veje (kulstof fra føde — du æder)

| Strategi | Hvad den gør | Kræver | Belønning / pris |
|---|---|---|---|
| **Aerob respiration** | Brænder sukker *med ilt* | Ilt i vandet | Enormt ATP-udbytte (mange gange gæring) — men dør/falder tilbage til gæring i iltfrie zoner |
| **Nitratrespiration** (denitrifikation) | Bruger nitrat som "ilt-erstatning" | Nitratrige, iltfrie zoner | Pænt udbytte uden ilt; binder dig til nitratnicher |
| **Sulfatrespiration** | Bruger sulfat i stedet for ilt; udskiller **H₂S** | Svovlrige mudderzoner | Mellem-udbytte *plus* en giftig udånding (H₂S skader naboer — offensiv synergi) |

### Autotrofe veje (kulstof fra CO₂ — du laver din egen mad)

| Strategi | Hvad den gør | Kræver | Belønning / pris |
|---|---|---|---|
| **Iltende fotosyntese** (cyanobakterie) | Lys + CO₂ + vand → sukker **+ ilt** | Lys | Passiv mad i lyset; *producerer ilt, der fodrer din egen aerobe respiration* |
| **Iltfri fotosyntese** (purpur/grønt svovl) | Lys + CO₂ + H₂S → sukker + svovl | Lys + H₂S, iltfrit | Fotosyntese i mørke, svovlede dyb hvor cyanobakterier ikke kan |
| **Svovloxidation** (kemoautotrof) | Vinder energi ved at oxidere H₂S/svovl | Svovlkilder (vents/mudder) | Lever af ren kemi — uafhængig af lys og føde, men bundet til svovlnicher |
| **Nitrifikation** | Vinder energi ved at oxidere ammoniak → nitrat | Ammoniak | Langsom men stabil; "gøder" miljøet med nitrat (fodrer nitrat-respiratorer) |
| **Methanogenese** (arkæa) | CO₂ + brint → metan + energi | Strengt iltfrit, brint | Hyper-specialist: effektiv i sin niche, hjælpeløs udenfor. Et helt andet livsdomæne — eksotisk smag |

### Mixotrofi — det bedste (og værste) fra begge verdener

En **mixotrof** bærer både en heterotrof *og* en autotrof strategi og kan skifte eller
kombinere: fotosyntetisér i lyset, æd i mørket. Maksimal fleksibilitet og overlevelse i
mange zoner — men til en pris i upkeep og effektivitet. Den klassiske "tusindkunstner, mester
i intet". Den ægte drøm er **iltende fotosyntese + aerob respiration**: lav ilt om dagen,
brænd den selv — en næsten selvforsynende motor, men dyr at vedligeholde.

### Bærende synergier (det, der gør træet sjovt)

- **Iltende fotosyntese → aerob respiration:** du laver din egen ilt og brænder den. Stærkt,
  men dobbelt så dyrt at vedligeholde.
- **Sulfatrespiration → svovloxidation / iltfri fotosyntese:** dit eget H₂S-affald bliver
  brændstof for en anden del af dit stofskifte (eller for din koloni senere).
- **Nitrifikation → nitratrespiration:** den ene laver det nitrat, den anden ånder.

Disse cykler er den biologiske virkelighed — og fremragende spilmekanik, fordi de belønner
spilleren for at *forstå* sammenhængen, ikke bare for at købe det dyreste gen.

---

## C. Værktøjsgrenen — våben & redskaber

Angreb, forsvar og prædation fletter sig ind i de to andre grene. Princippet er, at hvert
værktøj er et **verbum** — en ny ting du *gør* — ikke bare et passivt plus. De falder i fire
kategorier.

### C1. Angreb

| Værktøj | Hvordan det virker | Synergi / pris |
|---|---|---|
| **Toksin-sky** | Udskiller en giftsky i et område foran dig | Klassisk AoE; koster aminosyrer + ATP |
| **H₂S-udånding** | Passiv giftaura af svovlbrinte omkring dig | Gratis hvis du allerede laver sulfatrespiration; skader ikke svovl-tolerante |
| **Bakteriocin** | Målrettet gift, der *kun* rammer din egen/beslægtet art | Billig og præcis — perfekt mod konkurrenter, ufarlig for fremmede |
| **Harpun (Type VI-system)** | Et molekylært spyd, der injicerer gift i én nabocelle ved kontakt | Højt enkeltmåls-skade; kræver at du kommer helt tæt på |
| **Lysozym (vægopløser)** | Opløser fjenders cellevæg | Bonus mod *Gram-positive*, pansrede fjender — en panserbryder |
| **Antibiotika-produktion** | Renser langsomt et helt område for konkurrenter | Kræver, at du selv er resistent; områdekontrol, ikke burst |
| **Fag-slynge** | Affyrer vira, der inficerer en fjende og sprænger den efter en forsinkelse | Kan sprede sig fra offer til offer; uforudsigelig |

### C2. Prædation (måder at æde celler på)

| Værktøj | Hvordan det virker | Synergi / pris |
|---|---|---|
| **Megacytose → endocytose** | Bliv stor nok til at opsluge og fordøje mindre celler helt | Den reneste heterotrofe topstrategi; langsom og dyr at vedligeholde |
| **Pseudopodier (fagocytose)** | Stræk "arme" ud og opslug bytte på afstand | Mere adræt end endocytose; god til at fange flygtende bytte |
| **Invasiv prædation** (Bdellovibrio-stil) | *Lille* rovdyr: træng ind i et større bytte, æd det indefra, spræng ud | Lader små celler dræbe store — høj risiko, høj belønning |
| **Ektoparasit (sugetråd)** | Hæft dig på et bytte og dræn dets ressourcer over tid | Dræber ikke straks — du "malker" værten, men kan blive rystet af |

### C3. Forsvar

| Værktøj | Hvordan det virker | Synergi / pris |
|---|---|---|
| **Gram-positiv cellevæg** | Tyk væg; bred robusthed + modstand mod giftzoner | Udvider også miljø-tolerance (se [ENVIRONMENT.md](ENVIRONMENT.md)); tung |
| **Slimkapsel (glycocalyx)** | Glat overflade — svær at gribe, opsluge eller harpunere | Mild giftmodstand; lille fartstraf |
| **Efflukspumper** | Pumper gift og antibiotika ud igen | Modstand mod kemiske angreb *og* antibiotika-zoner; koster ATP at køre |
| **Katalase / antioxidant** | Neutraliserer gift- og iltskade | Lader anaerober tåle ilt kortvarigt — nøgle for en methanogen i farezone |
| **Biofilm** | Dine celler klistrer sammen til en beskyttet klynge | Delt skjold mod områdeeffekter; langsom, men meget sej i flok |
| **Spore / dvale** | Gå i dyb hvile og overlev dødelige forhold eller angreb | Kan intet, mens du sover — en nødbremse, ikke en livsstil |

### C4. Sansning, social & redskaber

| Værktøj | Hvordan det virker | Synergi / pris |
|---|---|---|
| **Chemotaksis** | Auto-styrer mod føde og væk fra fare | Ligger oven på enhver bevægelsesmåde (se gren A) |
| **Quorum sensing** | Mærker tætheden af din egen art | Lås koordineret adfærd op (fx biofilm/angreb først når I er mange nok) |
| **Bioluminescens** | Lys, der lokker småbytte til — eller signalerer til artsfæller | Tiltrækker også rovdyr; risiko mod belønning |
| **Konjugation (pili genfødt)** | Rør ved en anden celle og *kopiér et af dens gener* til dig selv | Horisontal genoverførsel: stjæl mutationer, du ikke selv har udviklet |
| **Siderofor** | Opsamler sjældent jern på afstand | Fodrer jern-oxidation; ressourceredskab i jernfattige zoner |
| **Magnetosom** | Læg dig på linje med feltlinjer for rolig, stabil navigation | Lille, billig navigationshjælp |

> Bemærk: **pili** vender tilbage her — ikke som den fjernede rykvise bevægelse, men som
> *konjugation*: et kontaktredskab til at stjæle gener. Det er biologisk korrekt og giver et
> helt nyt strategisk verbum (gen-tyveri) uden den grimme twitch-motorik.

**Designregel for værktøjer:** de skal danne *combos* på tværs af grenene. En glidende
(gren A) svovl-respirator (gren B) med H₂S-udånding og slimkapsel (gren C) bliver et lydløst
giftbaghold. En biofilm-dannende quorum-koloni bliver en uindtagelig fæstning. Det er i
krydsfeltet mellem de tre grene, identiteterne opstår.

---

## Sådan hænger det sammen — designprincipper

1. **Ingen kan tage alt.** Metaboliske strategier koster og har upkeep, så du tvinges til en
   identitet: solfanger, svovlæder, methan-eremit, iltbrænder eller alleslugende rovdyr.
2. **Miljøet bestemmer mester.** Fordi strategier er bundet til ilt/lys/kemi, afgør *hvor* du
   bor, hvad der er stærkt. Et gen er ikke godt eller dårligt — det er godt *et sted*.
3. **Affald er en ressource.** Det, én strategi udskiller (ilt, H₂S, nitrat, metan), er
   brændstof for en anden. Det åbner for både selv-synergier nu og kolonier/økosystemer senere.
4. **Fra én reaktion til en motor.** Spilleren skal kunne mærke rejsen fra en enkelt,
   svag gæringsreaktion til et rigt, sammenkoblet stofskifte — det er progressionens rygrad.

---

## Forslag til en typisk metabolisk rejse

1. **Gæring** — svag, universel start.
2. **Første forgrening:** Find ilt og tag *aerob respiration* (mere energi, men bundet til
   iltede zoner) — *eller* gå selvstændig med *fotosyntese* (uafhængig af føde, men bundet til lys).
3. **Specialisér:** dyrk din niche — svovl, nitrat, metan — eller saml en synergi-combo.
4. **Mixotrofi:** for den, der vil overleve overalt, kombinér to strategier mod en upkeep-straf.
5. **Topform:** parr metabolisme med bevægelse og værktøjer til en helstøbt organisme
   (fx solfanger-svømmer med gasvesikler, eller svovlædende baghold-glider med H₂S-våben).

---

*Næste skridt, hvis ønsket: en konkret balance-tabel (ATP-udbytter, omkostninger, upkeep,
zone-krav) per gen — og en opdatering af verdens-designet, så ilt-, lys- og kemizoner faktisk
findes på kortet og gør strategierne meningsfulde.*
