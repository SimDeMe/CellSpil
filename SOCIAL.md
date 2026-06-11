# CellSpil — Det sociale system (kolonier)

> Designbeskrivelse af, hvordan man styrer "at være flere", og hvad der gør det til en
> fordel at holde cellerne sammen. Vision (to-be).
> Hænger tæt sammen med [EVOLUTION.md](EVOLUTION.md) (metabolisme + værktøjer) og
> [ENVIRONMENT.md](ENVIRONMENT.md) (mikroklima).

Det centrale skift: **du spiller ikke en celle — du spiller en slægt (en stamme).** Når du
deler dig, vokser flokken af kloner, der alle deler dine gener. De fleste klarer sig selv;
én styrer du direkte. Spørgsmålet er så: hvorfor skulle man holde dem sammen i stedet for at
sprede dem? Svaret er, at **synergierne fra metabolisme, miljø og værktøjer kun udløses tæt på
hinanden** — en enlig celle får intet ud af dem.

---

## 1. Styringsmodellen

Bygger videre på din idé: ved deling vælger du, hvilken celle du vil styre, og resten bliver
autonome. Men "autonom" betyder ikke "tilfældig" — de følger en **adfærdspolitik**, du sætter,
så flokken kan optræde samlet uden mikrostyring.

- **Direkte styring (én celle).** Musen styrer den aktive celle som altid.
- **Skift celle.** Klik på en af dine egne celler for at overtage den; den forrige falder
  tilbage til sin politik. (Den "observér/overtag"-mekanik, der allerede findes i debug,
  bliver et kernekontrolværktøj.)
- **Ved deling vælger du:** behold styringen af den *muterede* datter (og lad moderen rejse
  videre på sin politik) — eller bliv i moderen og send den nye, muterede celle ud i flokken.
- **Adfærdspolitik for flokken** (få, globale tilstande — ikke RTS-mikro):
  - *Saml (følg):* hold sig tæt på dig / klyngen.
  - *Forager:* spred ud og høst føde i området.
  - *Forsvar:* hold position, dan biofilm.
  - *Jagt:* sværm mod et mål, du udpeger.
- **Kald sammen (rally).** Ét tryk samler flokken ved din position — bygger på quorum sensing.
- **Arv ved død.** Dør din aktive celle, overgår styringen automatisk til en anden celle i
  slægten. **Flokken er dine ekstra liv.** En nær klynge kan endda redde en døende celle
  (se ressourcedeling) — så sammenhold giver både fortsættelse *og* førstehjælp.

---

## 2. Hvorfor holde sammen? — fordelene ved kohæsion

Dette er kernen i din forespørgsel. Hver mekanisme belønner nærhed, og flere af dem trækker
direkte på systemer, vi allerede har designet.

| Mekanisme | Hvad den gør | Trækker på |
|---|---|---|
| **Ressourcedeling (nanorør)** | Tilstødende klon-celler deler ATP og byggesten gennem broer; en sulten celle reddes af en rig nabo | — |
| **Intern fødekæde (cross-feeding)** | Forskellige metaboliske roller bytter biprodukter: fotosyntese-cellens **ilt** fodrer respiratoren ved siden af; sulfatreduktorens **H₂S** fodrer svovl-oxidatoren | [EVOLUTION.md](EVOLUTION.md) B |
| **Forstærket niche-konstruktion** | En klynge ændrer sit mikroklima langt hurtigere end én celle — iltner, forsurer eller opvarmer en stabil "boble", I trives i | [ENVIRONMENT.md](ENVIRONMENT.md) |
| **Biofilm (delt skjold)** | Sammenklistrede celler får fælles slimforsvar mod gift, antibiotika og rovdyr | [EVOLUTION.md](EVOLUTION.md) C |
| **Flokjagt** | Mange celler kan sammen nedlægge en Megabacillus, der ville æde en enlig celle | — |
| **Quorum-låste evner** | Visse evner (koordineret toksin-salve, bioluminescens, biofilm) tænder *først*, når nok artsfæller er tæt på | [EVOLUTION.md](EVOLUTION.md) C |
| **Genspredning** | Via konjugation breder en god mutation sig hurtigt gennem en tæt klynge | [EVOLUTION.md](EVOLUTION.md) C |

**Den vigtigste pointe — den interne fødekæde.** Fordi biprodukter (ilt, CO₂, H₂S, nitrat)
diffunderer væk i det åbne, men forbliver koncentrerede *mellem* celler, der står tæt, bliver
en **blandet koloni af forskellige metaboliske roller** dramatisk mere effektiv end de samme
celler spredt. Det er her, sammenhold går fra "rart" til "en motor". En solfanger + en
respirator + en sulfatreduktor, der står sammen, danner et lille selvforsynende kredsløb.

---

## 3. Prisen for at klumpe sammen (så det er et reelt valg)

Kohæsion må ikke være gratis-bedst, ellers forsvinder valget. Tæthed har sine egne farer:

- **Lokal udpining.** En tæt klynge tømmer hurtigt sin egen plet for føde/lys — uden
  ressourcedeling eller rolledeling sulter I hinanden ihjel.
- **Epidemi.** En **fag-slynge** eller toksinsky rammer en tæt klynge langt hårdere — sygdom
  og gift spreder sig fra celle til celle.
- **Synlighed.** En stor koloni (især en, der lyser med bioluminescens) er et tydeligt mål for
  rovdyr.

Så valget bliver ægte: **spred ud** for mere total føde og sikkerhed i adskillelse, men som
skrøbelige enkeltceller — eller **klump sammen** for synergi, forsvar og kollektiv magt, men
sårbar over for sult, sygdom og opmærksomhed. Verden afgør, hvad der er klogest hvornår.

---

## 4. Rolledeling & differentiering (det avancerede mål)

Belønningen for at mestre sammenhold er ægte **flercellethed**: celler, der ikke længere bare
er kloner, men *specialiserer* sig til roller — en proto-organisme.

- **Føde-celler** — optimeret til at høste/metabolisere og dele ressourcer ud til flokken.
- **Soldater** — bærer angreb/forsvar, beskytter klyngens kerne.
- **Reproducenter** — celler, der primært deler sig og vokser flokken.
- **Specialister** (biologisk forbillede: cyanobakteriers *heterocyster*) — fx en
  iltfølsom kvælstoffikserende celle, som naboerne beskytter mod ilt. Et rendyrket eksempel på,
  at helheden kan, hvad den enkelte ikke kan.

Differentiering er en bevidst handling: ved deling kan du give datteren en **rolle**, der
ændrer dens adfærd (og udseende). En koloni med fornuftig rollefordeling er CellSpils svar på
at gå fra encellet til organisme — det naturlige endemål for det sociale spor.

---

## 5. Interface til at styre flokken

Princippet fra SPEC'en holder: **hovedskærmen er ren; styringen er let.**

- **Aktiv celle** styres med musen som altid; en tydelig markør viser, hvem du er.
- **Politik-vælger** — en lille knaprække (Saml / Forager / Forsvar / Jagt) + "Kald sammen".
- **Slægts-panel** (i inspectoren) — overblik over dine celler: rolle, helbred, metabolisk type;
  klik for at overtage eller tildele rolle.
- **Klynge-visning** — når celler er forbundet i en koloni, vises de delte broer/biofilm
  diskret, så man kan *se* synergien virke.

---

## Designprincipper

1. **Du er en slægt, ikke en celle.** Død er ikke game over, så længe stammen lever — det gør
   modet til at eksperimentere billigt.
2. **Synergi kræver nærhed.** Alle kollektive fordele falder med afstand, så sammenhold er en
   aktiv, belønnet beslutning — ikke en passiv bonus.
3. **Sammenhold koster.** Sult, sygdom og synlighed gør spredning til et legitimt modsvar.
4. **Mangfoldighed slår ensartethed.** En koloni af *forskellige* metaboliske roller er stærkere
   end mange ens — det binder det sociale system til hele metabolisme- og miljødesignet.
5. **Fra flok til organisme.** Rolledeling er den lange belønning: encellethed → koloni →
   differentieret proto-organisme.

---

*Næste skridt, hvis ønsket: konkrete tal (nanorør-delingsrate, kohæsionsradius og bonus-kurve,
quorum-tærskler, crowding-straf) samt et UI-mockup af politik-vælgeren og slægts-panelet.*
