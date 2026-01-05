from playwright.sync_api import sync_playwright

def verify_game_features():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to game...")
            page.goto("http://localhost:8080/index.html")
            page.wait_for_selector("canvas", state="visible")
            page.wait_for_timeout(2000) # Wait for init

            # 1. Test Production UI Logic (Buttons should be disabled initially)
            print("Testing UI Buttons...")
            disabled_toxin = page.evaluate("document.getElementById('btnToxin').disabled")
            disabled_enzyme = page.evaluate("document.getElementById('btnEnzyme').disabled")

            if not disabled_toxin:
                print("FAILURE: Toxin button should be disabled initially.")
            else:
                print("SUCCESS: Toxin button is disabled.")

            if not disabled_enzyme:
                print("FAILURE: Enzyme button should be disabled initially.")
            else:
                print("SUCCESS: Enzyme button is disabled.")

            # 2. Test Vesicle Logic via Console Injection
            print("Testing Vesicle Logic...")

            logic_result = page.evaluate("""() => {
                const cell = window.activeCell;
                if (!cell) return "NO_CELL";

                // Reset Genes for testing
                cell.genes.toxin = true;
                cell.genes.protease = true;

                // Reset Resources
                cell.atp = 1000;
                cell.aminoAcids = 1000;

                // Test Production Cap
                cell.vesicles = [];
                for(let i=0; i<10; i++) {
                    cell.produce('toxin');
                    // Fast forward timer
                    if(cell.production.state === 'producing') {
                         cell.production.timer = 100; // Finish
                         cell.update({}, {}, 1000, 1000, [], [], 600); // Trigger update logic to push to vesicles
                    }
                }

                if (cell.vesicles.length !== 5) return "CAP_FAIL: " + cell.vesicles.length;

                // Test Release
                cell.activateAbility();
                // Should be releasing
                if (cell.secretion.state !== 'releasing') return "RELEASE_FAIL";
                if (cell.vesicles.length !== 4) return "CONSUME_FAIL";

                return "SUCCESS";
            }""")

            print(f"Logic Test Result: {logic_result}")

            page.screenshot(path="verification/game_features.png")
            print("Screenshot taken: verification/game_features.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_game_features()
