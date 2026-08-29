# Kom godt i gang — byg CellSpil med Claude Code

En guide til dig, der **ikke** er programmør. Claude står for al koden. Din rolle er at være
instruktør: prøve spillet, sige hvad der føles rigtigt, og bede om ændringer i almindeligt sprog.

---

## 1. Åbn projektet i VS Code

I VS Code: **File → Open Folder…** og vælg mappen `CellSpil`. Nu kan Claude Code se alle
filerne — både beskrivelserne og kode-fundamentet, vi har lavet.

## 2. Start Claude CodeDe

## 3. Indsæt denne første besked

Kopiér hele teksten herunder og indsæt den som din allerførste besked til Claude Code:

> Hej Claude. Jeg bygger et 2D-spil, **CellSpil**, hvor man styrer en encellet bakterie i et
> mikroskopisk miljø. Jeg er **ikke programmør** — du står for al koden og forklarer undervejs
> i et sprog, jeg kan forstå.
>
> I mappen ligger der allerede:
> - **Designdokumenter:** `SPEC.md` (overblik), `EVOLUTION.md`, `ENVIRONMENT.md`, `SOCIAL.md`,
>   `ENEMIES.md` (spillets systemer), og `BALANCE.md` (alle tal og spillets tempo).
> - **`ARCHITECTURE.md`** beskriver, hvordan koden skal bygges op.
> - Et **kode-skelet** i mappen `src/` (tomme "systemer" med forklarende noter) og en
>   **balance-simulator** i `balance/`.
>
> Læs venligst `SPEC.md`, `ARCHITECTURE.md` og `BALANCE.md` først, og kig på `src/`, så du
> forstår strukturen, før du skriver kode.
>
> **Mit første mål:** få én celle til at *leve*. Den skal kunne spise, lave energi (ATP) og dø,
> hvis energien slipper op — efter tallene i `BALANCE.md`. Start med at udfylde
> `src/core/systems/metabolismSystem.js`. Hold alle tal i `config/`. Brug `src/smoke.js`
> (kommandoen `npm run smoke`) til at vise mig, at det virker.
>
> Arbejd i **små skridt**, forklar hvad du gør i klar tale, og **spørg mig**, hvis noget er
> uklart, i stedet for at gætte.

Det er nok til at sætte den godt i gang. Den vil læse dokumenterne og begynde at bygge.

## 4. Sådan ser du, at det virker

Tidligt i forløbet kører spillet endnu ikke som et billede på skærmen — det "lever" som tal.
Du kan altid bede Claude: *"kør npm run smoke og vis mig resultatet"*, så ser du, at cellen
lever, spiser og dør, som den skal. Når vi senere bygger grafikken, beder du bare:
*"vis mig spillet i browseren"*, og Claude hjælper dig med at åbne det.

## 5. Gode sætninger til at styre arbejdet

Du behøver ikke fagsprog. Disse virker fint:

- *"Forklar i almindeligt sprog, hvad du lige lavede."*
- *"Det går for hurtigt/langsomt — kan vi justere tempoet?"*
- *"Der kom en fejl — her er den: [indsæt teksten]."* (Claude retter den.)
- *"Lad os tage ét skridt ad gangen. Hvad er det næste lille mål?"*
- *"Gem det her, så vi kan fortsætte i morgen."*

## 6. Rækkefølgen vi anbefaler at bygge i

1. **Metabolisme** — cellen lever, spiser og dør (første mål ovenfor).
2. **Miljø & tolerance** — cellen mærker lys/ilt/temperatur og trives eller tager skade.
3. **Bevægelse** — cellen svømmer mod musen.
4. **Deling** — cellen kan dele sig og mutere.
5. **Grafik** — vi gør det synligt på skærmen.
6. Derefter: fjender, kolonier og resten af systemerne fra dokumenterne.

Tag dem ét ad gangen. Efter hvert skridt: prøv, mærk efter, og sig til, hvis noget skal føles
anderledes. Det er sådan, et godt spil bliver til.

---

*Alt, hvad vi har lavet, ligger i denne mappe og fortsætter, hvor vi slap. God fornøjelse — du
er instruktøren nu.*
