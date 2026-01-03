from playwright.sync_api import sync_playwright

def verify_frontend_rendering():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the game
            page.goto("http://localhost:8080")

            # Wait for game container
            page.wait_for_selector("#game-container")

            # Wait for initialization
            page.wait_for_timeout(2000)

            # Start the game (Unpause if paused by default or by debug)
            # Check if "PAUSE" overlay is visible
            pause_overlay = page.locator("#statusOverlay")
            if pause_overlay.is_visible():
                # Click the PAUSE/START button to unpause
                # The button ID is "pauseBtn"
                page.click("#pauseBtn")
                page.wait_for_timeout(500)

            # Now enable a visible trait via Debug menu quickly
            debug_btn = page.get_by_role("button", name="DEBUG")
            if debug_btn.is_visible():
                debug_btn.click()
                page.wait_for_timeout(500)

                # Check "Gram Positive" (visible color change) and "Flagellum" (visible tail)
                page.locator("#debug_mut_gramPositive").check()
                page.locator("#debug_mut_flagellum").check()

                # Close debug menu
                page.locator("#closeDebugBtn").click()
                page.wait_for_timeout(500)

            # Ensure game is unpaused again (Debug menu might pause it)
            if pause_overlay.is_visible():
                page.click("#pauseBtn")
                page.wait_for_timeout(1000)

            # Take a screenshot of the center where the player is
            page.screenshot(path="/home/jules/verification/game_render.png")
            print("Screenshot taken at /home/jules/verification/game_render.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend_rendering()
