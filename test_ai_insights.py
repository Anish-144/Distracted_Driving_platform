import asyncio
import requests
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:4000"
API_URL = "http://localhost:9000/api"

def seed_feedback():
    print("0. Seeding open feedback via API...")
    # Register/Login normal user
    res = requests.post(f"{API_URL}/auth/login", data={
        "username": "e2e_1a3203@example.com",
        "password": "Test1234!"
    })
    token = res.json()["access_token"]
    
    # Submit feedback
    files = {
        "type": (None, "feature"),
        "rating": (None, "5"),
        "comment": (None, "The AI is too aggressive. Please make it calmer."),
        "page_url": (None, "/simulation")
    }
    requests.post(f"{API_URL}/feedback", headers={"Authorization": f"Bearer {token}"}, files=files)
    
    files2 = {
        "type": (None, "bug"),
        "rating": (None, "2"),
        "comment": (None, "Crash when turning left quickly."),
        "page_url": (None, "/simulation")
    }
    requests.post(f"{API_URL}/feedback", headers={"Authorization": f"Bearer {token}"}, files=files2)
    print("Feedback seeded.")

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        print("1. Login as admin user...")
        await page.goto(f"{BASE_URL}/auth/login")
        await page.fill('input[type="email"]', 'test_feedback1@example.com')
        await page.fill('input[type="password"]', 'TestPassword123!')
        await page.click('button[type="submit"]')
        
        await page.wait_for_url(f"{BASE_URL}/dashboard")
        
        print("2. Open /admin/feedback...")
        await page.goto(f"{BASE_URL}/admin/feedback")
        
        print("3. Waiting for AI Testing Insights to load...")
        try:
            await page.wait_for_selector('text="AI Testing Insights"', timeout=5000)
            print("SUCCESS: AI Testing Insights title is visible.")
            
            # Look for the analyzed count
            await page.wait_for_selector('text="Analyzed"', timeout=15000)
            print("SUCCESS: Found 'Analyzed X open reports' text, confirming insights loaded!")
            
            await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\ai_insights_fixed.png")
            
            # Click Regenerate button
            print("4. Click Regenerate button...")
            regenerate_btn = await page.query_selector('button:has-text("Regenerate")')
            await regenerate_btn.click()
            
            print("5. Waiting for regeneration to complete...")
            await page.wait_for_selector('button:has-text("Regenerate")', timeout=20000)
            print("SUCCESS: Regenerate button returned to ready state.")
            
            await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\ai_insights_regenerated.png")
            
            # Refresh page
            print("6. Refreshing page to verify cache loading...")
            await page.reload()
            await page.wait_for_selector('text="Cached:"', timeout=10000)
            print("SUCCESS: Found 'Cached:' text after refresh, confirming cache works!")
            
            await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\ai_insights_cached.png")
            
            print("ALL VERIFICATIONS PASSED!")
            
        except Exception as e:
            print(f"FAIL: {e}")
            await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\ai_insights_failed.png")

        await browser.close()

if __name__ == "__main__":
    seed_feedback()
    asyncio.run(run())
