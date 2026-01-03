from playwright.sync_api import sync_playwright

def verify_division():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the game
            page.goto("http://localhost:8080")

            # Wait for game container
            page.wait_for_selector("#game-container")
            page.wait_for_timeout(2000)

            # Force show debug button via JS if hidden
            page.evaluate("document.getElementById('debugBtn').classList.remove('hidden')")

            # Enable God Mode via Debug
            page.click("#debugBtn")
            page.wait_for_timeout(500)

            # Check God Mode
            # Locator might fail if ID is wrong, check main.js logic for checkbox creation
            # It has id='godModeCb'
            page.click("#godModeCb")
            page.click("#closeDebugBtn")
            page.wait_for_timeout(500)

            # Trigger Division (Press 'M')
            print("Triggering Division...")
            page.keyboard.press("m")

            # Wait for animation (elongation -> constriction)
            # Total duration 180 frames = ~3s.
            # Take screenshot at 1.5s (constriction phase)
            page.wait_for_timeout(1500)

            page.screenshot(path="/home/jules/verification/division_mid.png")
            print("Screenshot taken at /home/jules/verification/division_mid.png")

            # Wait for finish (separation)
            page.wait_for_timeout(2000)

            page.screenshot(path="/home/jules/verification/division_done.png")
            print("Screenshot taken at /home/jules/verification/division_done.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_division()
