import asyncio
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:4000"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        print("1. Login as admin user...")
        await page.goto(f"{BASE_URL}/auth/login")
        await page.fill('input[type="email"]', 'test_feedback1@example.com')
        await page.fill('input[type="password"]', 'TestPassword123!')
        await page.click('button[type="submit"]')
        
        await page.wait_for_url(f"{BASE_URL}/dashboard")
        
        print("2. Navigate to /admin/feedback...")
        
        # Intercept network responses to capture the 404
        async def handle_response(response):
            if "ai-insights" in response.url:
                print(f"Network Request Caught:")
                print(f"URL: {response.url}")
                print(f"Status: {response.status}")
                if response.status >= 400:
                    try:
                        body = await response.text()
                        print(f"Body: {body}")
                    except:
                        print("Body: <could not read>")

        page.on("response", handle_response)
        
        await page.goto(f"{BASE_URL}/admin/feedback")
        
        # Wait a bit to let the page load and requests fire
        await page.wait_for_timeout(3000)
        
        await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\ai_insights_error.png")
        print("Screenshot captured.")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
