# CellSpil - Udviklingsplan & Forbedringsområder

Dette dokument skitserer mulige fremtidige forbedringer og udvidelse af spillet.

## 1. Gameplay & Mekanikker
*   **Nye Mutationer:**
    *   *Fotosyntese (Chloroplast):* Passiv ATP-generering (mindre behov for madjagt).
    *   *Bioluminescens:* Tiltrækker bytte (små celler), men også rovdyr.
    *   *Slimkapsel:* Gør det sværere for fjender at gribe fat eller spise dig.
*   **Flercellethed (Tier 5):** Mulighed for at danne kolonier eller differentiere celletyper (f.eks. en "hoved"-celle og "dræber"-celler).
*   **Miljø-dynamik:**
    *   *Strøm:* Vandstrømme, der påvirker bevægelse og flytter mad rundt.
    *   *Temperatur:* Zoner der påvirker metabolisme (koldt = langsommere, varmt = hurtigere men højere forbrug).

## 2. AI & Fjender
*   **Forbedret AI:**
    *   *Flok-mentalitet:* Små Bacillus bør søge sammen i grupper for beskyttelse.
    *   *Angst/Flugt:* Fjender bør flygte, hvis de tager skade eller ser en Megabacillus.
*   **Nye Fjendetyper:**
    *   *Virus:* Ikke levende, men inficerer celler og dræner ressourcer eller kaprer styringen.
    *   *Amoeba:* En langsom, men dødbringende fjende, der kan "omslutte" alt på sin vej.

## 3. Visuelt & Atmosfære
*   **Grafik-opdateringer:**
    *   *Parallax Baggrund:* Flere lag i baggrunden for at give dybdefornemmelse.
    *   *Deformations-fysik:* Celler bør blive "trykket" lidt sammen ved kollision eller høj fart (squash & stretch).
*   **Partikel-effekter:**
    *   Bedre "blod" (cytoplasma) effekt, når en celle dør.
    *   Bobler og strømhvirvler i vandet.

## 4. Lyd & Audio
*   **Ambience:** En dyb, rolig undervands-loop for at sætte stemningen.
*   **Feedback-lyde:**
    *   Advarselslyd ved lav energi eller gift-skade.
    *   Unikke lyde for hver mutation (f.eks. "zap" lyd for Toxin).

## 5. UI & Brugeroplevelse
*   **Tutorial:** En interaktiv guide de første 30 sekunder, der forklarer styring og formål.
*   **Genetisk Bibliotek:** En menu, hvor man kan læse dybdegående om de biologiske koncepter bag mutationerne (læringselement).
*   **Save/Load:** Mulighed for at gemme sin celles DNA-konfiguration og starte et nyt spil med en "avanceret" celle (New Game+).

## 6. Teknisk Optimering
*   **Performance:** Optimering af kollisions-tjek (Quadtree) hvis antallet af celler/partikler stiger markant.
*   **Mobil-understøttelse:** Tilføjelse af virtuelle joysticks eller touch-styring for at kunne spille på telefon/tablet.

## 7. Grafiske Muligheder & AI (Næste Niveau)
Dette afsnit beskriver mulighederne for at løfte spillets visuelle udtryk markant ved brug af moderne web-teknologier og AI.

### Teknologier
*   **WebGL / PIXI.js / Three.js:**
    *   *Hvorfor?* JavaScript's `Canvas 2D` API (som vi bruger nu) er god til simple former, men WebGL åbner for hardware-accelereret grafik.
    *   *Muligheder:*
        *   **Shaders (GLSL):** Programmer der kører på grafikkortet. Kan skabe "levende" cellemembraner der bølger, realistisk vand-forvrængning, og glødende neon-effekter.
        *   **Lighting:** Dynamisk lyssætning, så celler kaster skygger eller lyser omgivelserne op (bioluminescens).
        *   **Post-Processing:** Fuldskærms-effekter som "Bloom" (glød), kromatisk aberration (ved skade), eller undervands-sløring.
    
### Assets & Ressourcer
*   **Fra Simple Former til Sprites:**
    *   Udskift de nuværende cirkler og streger med detaljerede *Sprites* (billeder).
    *   Brug **Normal Maps** (tekstur-kort) til at give 2D-billeder dybde, så de reagerer realistisk på lyskilder.
*   **Vector Grafik (SVG):**
    *   Sikrer at cellerne forbliver knivskarpe uanset hvor meget man zoomer ind.

### AI's Rolle i Udviklingen
Kunstig Intelligens kan accelerere skabelsen af assets markant:
*   **Generative Teksturer:** AI (f.eks. DALL-E 3 eller Midjourney) kan generere sømløse, organiske teksturer til celle-overflader, baggrunde, og partikler.
*   **Sprite Generering:** AI kan skabe færdige designs til forskellige celletyper, fjender, og power-ups, som vi derefter kan animere.
*   **Shader Kode:** AI (som jeg) er særligt god til at skrive kompleks GLSL-shader kode, der ellers kræver dyb matematisk forståelse. Vi kan f.eks. bede om en "gooey membrane effect shader", og få koden leveret direkte.

