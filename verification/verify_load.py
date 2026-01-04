from playwright.sync_api import sync_playwright

def verify_game_load():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        page.goto("http://localhost:8000")

        # Wait for the canvas to be present
        try:
            page.wait_for_selector("canvas", timeout=5000)
            print("Canvas element found.")
        except Exception as e:
            print(f"Canvas not found: {e}")

        # Wait a bit for initialization
        page.wait_for_timeout(2000)

        # Check for console errors
        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        # Take a screenshot
        page.screenshot(path="verification/game_load.png")
        print("Screenshot saved to verification/game_load.png")

        browser.close()

if __name__ == "__main__":
    verify_game_load()
