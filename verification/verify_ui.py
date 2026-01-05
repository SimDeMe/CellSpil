from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate
        print("Navigating to game...")
        page.goto("http://localhost:8000")

        # Wait for game to load (canvas)
        page.wait_for_selector("canvas", timeout=10000)

        # 1. Verify HUD Labels exist (Bars might be 0 width initially)
        print("Checking HUD Labels...")
        page.wait_for_selector("text=Glucose:")
        page.wait_for_selector("text=Carbon (C):")
        page.wait_for_selector("text=Nitrogen (N):")
        page.wait_for_selector("text=Phosphate (P):")

        # Check if bar elements are attached to DOM
        if page.locator("#hudGlucoseBar").count() > 0:
            print("Glucose Bar found in DOM.")
        else:
            raise Exception("Glucose Bar missing from DOM")

        # Take Screenshot of HUD
        page.screenshot(path="verification/hud_visible.png")
        print("HUD Screenshot taken.")

        # 2. Open Inspector
        print("Opening Inspector...")
        page.click("#inspectBtn")
        page.wait_for_selector("#inspectorModal", state="visible")

        # 3. Click Katabolisme Tab
        print("Clicking Katabolisme Tab...")
        page.click("button[data-tab='tabKatabolisme']")
        # Wait for active class on the tab content
        page.wait_for_selector("#tabKatabolisme.active")

        # Check for buttons inside.
        # Note: If cell has 0 resources, buttons might be disabled but should be present.
        # Wait for at least one button
        try:
            page.wait_for_selector("#katabolismeContainer button", timeout=5000)
            print("Buttons found in Katabolisme Tab.")
        except:
            print("No buttons found in Katabolisme Tab! Logic error?")
            page.screenshot(path="verification/error_katabolisme.png")
            raise

        page.screenshot(path="verification/tab_katabolisme.png")
        print("Katabolisme Tab Screenshot taken.")

        # 4. Click Anabolisme Tab
        print("Clicking Anabolisme Tab...")
        page.click("button[data-tab='tabAnabolisme']")
        page.wait_for_selector("#tabAnabolisme.active")

        # Check for buttons inside
        try:
            page.wait_for_selector("#anabolismeContainer button", timeout=5000)
            print("Buttons found in Anabolisme Tab.")
        except:
            print("No buttons found in Anabolisme Tab! Logic error?")
            page.screenshot(path="verification/error_anabolisme.png")
            raise

        page.screenshot(path="verification/tab_anabolisme.png")
        print("Anabolisme Tab Screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_ui()
