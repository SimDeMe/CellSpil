from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the game
            page.goto("http://localhost:8080")

            # Wait for the canvas to be ready (Game container)
            page.wait_for_selector("#game-container")

            # Wait a bit for the game to start and player to spawn
            page.wait_for_timeout(3000)

            # Click the Debug button to open menu
            debug_btn = page.get_by_role("button", name="DEBUG")
            if debug_btn.is_visible():
                debug_btn.click()
                page.wait_for_timeout(500)

                # Toggle "Megacytosis" to see size change
                mega_chk = page.locator("#debug_mut_megacytosis")
                if mega_chk.is_visible():
                    mega_chk.check()
                    page.wait_for_timeout(500)

            # Take a screenshot
            page.screenshot(path="/home/jules/verification/game_screen.png")
            print("Screenshot taken at /home/jules/verification/game_screen.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
