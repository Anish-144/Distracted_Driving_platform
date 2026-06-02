import asyncio
import requests
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:4000"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        print("1. Login as admin user...")
        await page.goto(f"{BASE_URL}/auth/login")
        await page.fill('input[type="email"]', 'test_feedback1@example.com')
        await page.fill('input[type="password"]', 'TestPassword123!')
        await page.click('button[type="submit"]')
        
        # Admin is now redirected to /admin/dashboard
        await page.wait_for_url(f"{BASE_URL}/admin/dashboard", timeout=10000)
        print("SUCCESS: Logged in and redirected to Admin Dashboard.")
        
        await page.wait_for_selector('text="Executive Dashboard"')
        # Wait for charts/KPIs to load
        await page.wait_for_timeout(3000)
        
        await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\screenshot_admin_dashboard.png")
        print("SUCCESS: Saved Dashboard screenshot.")
        
        print("2. Navigate to Users Management...")
        await page.click('#sidebar-users')
        await page.wait_for_url(f"{BASE_URL}/admin/users", timeout=5000)
        
        await page.wait_for_selector('text="User Management"')
        await page.wait_for_timeout(2000)
        
        await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\screenshot_admin_users.png")
        print("SUCCESS: Saved Users screenshot.")

        await browser.close()
        print("ALL VERIFICATIONS PASSED!")

if __name__ == "__main__":
    asyncio.run(run())
