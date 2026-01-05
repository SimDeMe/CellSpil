from playwright.sync_api import sync_playwright

def verify_full_economy():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to game...")
            page.goto("http://localhost:8080/index.html")
            page.wait_for_selector("canvas", state="visible")
            page.wait_for_timeout(2000)

            print("Testing Economy Logic (Glucose -> Breakdown -> Amino -> Division)...")

            result = page.evaluate("""() => {
                const cell = window.activeCell;
                if (!cell) return "NO_CELL";

                // 1. Reset
                cell.atp = 1000; // Need energy for breakdown
                cell.aminoAcids = 0;
                cell.glucose = 10;
                cell.carbon = 0; // Starts empty
                cell.nitrogen = 100;
                cell.phosphate = 100;

                // 2. Test Breakdown (Catabolism)
                // Need to call catabolizeGlucose()
                const success = cell.catabolizeGlucose();
                if (!success) return "CATABOLISM_FAIL";

                if (cell.glucose !== 9) return "GLUCOSE_NOT_CONSUMED";
                if (cell.carbon !== 6) return "CARBON_NOT_PRODUCED";

                // 3. Test Synthesis (Anabolism)
                // Cost: 4C, 1N, 1ATP -> 1 Amino
                const synthSuccess = cell.anabolizeAmino();
                if (!synthSuccess) return "ANABOLISM_FAIL";

                if (cell.carbon !== 2) return "CARBON_NOT_USED_CORRECTLY";
                if (cell.aminoAcids !== 1) return "AMINO_NOT_PRODUCED";

                return "SUCCESS";
            }""")

            print(f"Economy Result: {result}")

            # Click Inspect to show tabs in screenshot
            page.click("#inspectBtn")
            page.wait_for_timeout(500)
            page.screenshot(path="verification/economy_inspect.png")
            print("Screenshot taken: verification/economy_inspect.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_full_economy()
