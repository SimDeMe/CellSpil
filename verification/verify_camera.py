from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080")

        # Wait for game container
        page.wait_for_selector("#game-container canvas")

        # Take screenshot of initial state (should be centered on player)
        page.screenshot(path="verification/initial_state.png")

        browser.close()

if __name__ == "__main__":
    run()
