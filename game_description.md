# CellSpil - Spilmanual & Beskrivelse

## 1. Overordnet Beskrivelse
CellSpil er et overlevelses- og evolutionsspil, hvor du styrer en encellet organisme i et mikroskopisk miljø. Målet er at samle ressourcer, vokse, dele sig, og udvikle nye genetiske egenskaber for at klare dig mod miljøets farer og konkurrerende bakterier (*Bacillus*).

## 2. Gameplay & Mekanikker

### Ressourcer
Din celle har brug for tre hovedressourcer for at overleve og udvikle sig:
*   **ATP (Energi):** Forbruges ved bevægelse og brug af evner. Hvis du løber tør, dør cellen. Du får ATP ved at spise glukose (gule partikler).
*   **Aminosyrer (Byggesten):** Bruges til vækst og celledeling. Du får dem ved at spise proteiner (blå partikler) eller ved at fordøje andre celler.
*   **Nukleotider (DNA):** Bruges til at købe mutationer (upgrades).

### Livscyklus
1.  **Spis:** Saml madpartikler eller jagt andre celler.
2.  **Voks:** Når du har nok aminosyrer, kan du dele dig (Tryk **D**).
3.  **Udvikl:** Brug nukleotider til at tilføje nye gener til din celle (via menuerne).

### Fjender & Farer
*   **Bacillus Simplex:** En hurtig, stavformet bakterie, der konkurrerer om maden.
*   **Megabacillus:** En enorm, aggressiv variant, der kan spise mindre celler (inklusiv dig!) via endocytose.
*   **Farezoner (Danger Zones):**
    *   **Toxin Zoner (Grøn):** Giftige områder, der dræber alle ubeskyttede celler.
    *   **Antibiotika Zoner (Blå):** Områder, der specifikt dræber Gram-negative bakterier (din startform).
    *   *Forsvar:* Udvikling af "Gram Positiv" (Cellevæg) giver immunitet.

## 3. Celle-Egenskaber & Mutationer
Spilleren kan udvikle sin celle gennem 4 niveauer (Tiers):

*   **Tier 1: Bevægelse**
    *   *Flagellum:* En hale, der giver konstant, hurtig fremdrift.
    *   *Pili:* Gribekroge, der kan skyde ud og trække cellen hurtigt fremad (Twitch motility).

*   **Tier 2: Evner**
    *   *Toxin [E]:* Udstøder en giftsky, der dræber nærliggende fjender.
    *   *Protease [R]:* Udstøder enzymer, der opløser døde celler til mad (aminosyrer).
    *   *Gram Positiv (Cellevæg):* Giver en tyk cellevæg, der beskytter mod alle giftzoner og antibiotika.

*   **Tier 3: Specialisering**
    *   *High-Torque Flagel:* Markant hurtigere svømmehastighed.
    *   *High-Speed Retraction:* Hurtigere Pili.
    *   *Multiplex Pili:* Flere Pili ad gangen for bedre kontrol.
    *   *Megacytose:* Gør cellen dobbelt så stor (nødvendig for at spise andre celler).

*   **Tier 4: Apex Predator**
    *   *Endocytose:* Gør det muligt at opsluge og fordøje mindre celler ved kontakt.

## 4. Styring & Interface

### Kontrolmuligheder
*   **Musen:** Styrer retningen. Cellen svømmer eller trækker sig mod markøren.
    *   *Pili-styring:* Cellen skyder tråde ud mod musen.
    *   *Flagel-styring:* Cellen svømmer jævnt mod musen.
*   **E:** Aktiver Toxin (hvis udviklet).
*   **R:** Aktiver Protease (hvis udviklet).
*   **D:** Del cellen (hvis nok aminosyrer).
*   **Debug Mode (Aktiveres i kode/menu):**
    *   Klik på fjender for at overtage kontrollen med dem.

### Interface (HUD)
*   **Venstre side:** Ressource-bjælker for ATP (Oliven), Aminosyrer (Blå/Lilla) og Nukleotider (Orange).
*   **Højre side:** Mutations-træet, hvor du kan købe opgraderinger.
*   **Minimap:** Viser et overblik over verdenen, fjender (røde/gule), og din position (grøn).
*   **Notifikationer:** Pop-ups ved vigtige hændelser (f.eks. invasioner).
*   **Visuel Feedback:**
    *   Cellen blinker **Rødt/Hvidt**, når den tager skade.
    *   Cellens indre glød viser livetilstand.

## 5. Grafik & Lyd
*   **Grafik:** Spillet bruger HTML5 Canvas til at rendere simple, men tydelige 2D-former.
    *   *Spiller:* Rund celle med en kerne og evt. flagel/pili.
    *   *Bacillus:* Aflange, stavformede bakterier.
    *   *Effekter:* Partikelsystemer for gift, mad og enzymer.
*   **Lyd:**
    *   "Crunch"-lyd, når man spiser.
    *   (Planlagt: Atmosfærisk baggrundslyd).
