from playwright.sync_api import sync_playwright

def verify_game_load():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the game
            page.goto("http://localhost:8080/index.html")

            # Wait for the canvas to be present (game initialized)
            page.wait_for_selector("canvas", state="visible")

            # Wait for HUD elements to check if UI is loaded
            page.wait_for_selector("#gameHUD", state="visible")
            page.wait_for_selector("#hudGen", state="visible")

            # Wait a bit to ensure no immediate crash
            page.wait_for_timeout(2000)

            # Take a screenshot
            page.screenshot(path="verification/game_load.png")
            print("Screenshot taken: verification/game_load.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_game_load()
