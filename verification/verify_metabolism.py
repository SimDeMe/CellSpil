from playwright.sync_api import sync_playwright

def verify_metabolism():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to game...")
            page.goto("http://localhost:8080/index.html")
            page.wait_for_selector("canvas", state="visible")
            page.wait_for_timeout(2000)

            # Inject Resources and Test Metabolism
            print("Testing Metabolism Logic...")

            result = page.evaluate("""() => {
                const cell = window.activeCell;
                if (!cell) return "NO_CELL";

                // 1. Reset Stats
                cell.atp = 0;
                cell.aminoAcids = 0;
                cell.nucleotides = 0;
                cell.carbon = 0;
                cell.nitrogen = 0;
                cell.phosphate = 0;

                // 2. Test Fermentation (C -> ATP)
                cell.carbon = 100;
                // Run update loop manually a few times
                for(let i=0; i<100; i++) {
                    cell.metabolize();
                }

                if (cell.atp <= 0) return "FERMENTATION_FAIL: ATP " + cell.atp;
                if (cell.carbon >= 100) return "FERMENTATION_FAIL: Carbon " + cell.carbon;

                const atpAfterFerm = cell.atp;

                // 3. Test Synthesis (Amino)
                // Needs C, N, ATP
                cell.carbon = 100;
                cell.nitrogen = 100;
                cell.atp = 1000;
                const startAmino = cell.aminoAcids;

                // Force synthesis chance
                // We can't force Math.random easily without mocking, but if we run enough iterations it should hit 10%
                let synthesized = false;
                for(let i=0; i<500; i++) {
                    cell.metabolize();
                    if (cell.aminoAcids > startAmino) {
                        synthesized = true;
                        break;
                    }
                }

                if (!synthesized) return "SYNTHESIS_AMINO_FAIL";

                // 4. Test Synthesis (Nucleo)
                // Needs C, N, P, ATP
                cell.nucleotides = 0;
                cell.carbon = 100;
                cell.nitrogen = 100;
                cell.phosphate = 100;
                cell.atp = 1000;

                synthesized = false;
                for(let i=0; i<500; i++) {
                    cell.metabolize();
                    if (cell.nucleotides > 0) {
                        synthesized = true;
                        break;
                    }
                }

                if (!synthesized) return "SYNTHESIS_NUCLEO_FAIL";

                return "SUCCESS";
            }""")

            print(f"Metabolism Result: {result}")

            page.screenshot(path="verification/metabolism_ui.png")
            print("Screenshot taken: verification/metabolism_ui.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_metabolism()
