from playwright.sync_api import sync_playwright

def verify_console():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        try:
            # Navigate to the game
            page.goto("http://localhost:8080")

            # Wait for game container
            page.wait_for_selector("#game-container", timeout=5000)

            # Wait a bit
            page.wait_for_timeout(3000)

        except Exception as e:
            print(f"SCRIPT ERROR: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_console()
