import asyncio
import os
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:4000"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        print("1. Login as normal user...")
        await page.goto(f"{BASE_URL}/auth/login")
        await page.fill('input[type="email"]', 'e2e_1a3203@example.com')
        await page.fill('input[type="password"]', 'Test1234!')
        await page.click('button[type="submit"]')
        
        await page.wait_for_url(f"{BASE_URL}/dashboard")
        await page.wait_for_selector('#user-menu-btn')
        
        print("2. Open user dropdown (normal)...")
        await page.click('#user-menu-btn')
        await page.wait_for_timeout(500) # wait for animation
        
        print("3. Capturing normal user dropdown...")
        await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\normal_user_dropdown.png")
        
        admin_link = await page.query_selector('text="Admin Feedback"')
        if admin_link:
            print("ERROR: Admin Feedback IS visible for normal user!")
        else:
            print("SUCCESS: Admin Feedback is NOT visible for normal user.")
            
        print("Logging out normal user...")
        await page.click('#logout-btn')
        await page.wait_for_url(f"{BASE_URL}/auth/login")

        print("4. Login as admin user...")
        await page.fill('input[type="email"]', 'test_feedback1@example.com')
        await page.fill('input[type="password"]', 'TestPassword123!')
        await page.click('button[type="submit"]')
        
        await page.wait_for_url(f"{BASE_URL}/dashboard")
        await page.wait_for_selector('#user-menu-btn')
        
        print("5. Open user dropdown (admin)...")
        await page.click('#user-menu-btn')
        await page.wait_for_timeout(500)
        
        print("6. Capturing admin user dropdown...")
        await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\admin_user_dropdown.png")
        
        admin_link = await page.query_selector('text="Admin Feedback"')
        if not admin_link:
            print("ERROR: Admin Feedback is NOT visible for admin user!")
        else:
            print("SUCCESS: Admin Feedback IS visible for admin.")
            
            print("7. Click Admin Feedback...")
            await admin_link.click()
            
            print("8. Verify navigation to /admin/feedback...")
            await page.wait_for_url(f"{BASE_URL}/admin/feedback")
            await page.wait_for_timeout(1000)
            await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\admin_dashboard.png")
            print(f"SUCCESS: Reached {page.url}")
            
            print("9. Refresh page...")
            await page.reload()
            await page.wait_for_selector('#user-menu-btn')
            print("10. Confirm user remains admin...")
            await page.click('#user-menu-btn')
            await page.wait_for_timeout(500)
            await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\admin_dropdown_after_refresh.png")
            if await page.query_selector('text="Admin Feedback"'):
                print("SUCCESS: Link remains visible after refresh.")
            else:
                print("ERROR: Link disappeared after refresh!")
                
            print("11. Logout...")
            await page.click('#logout-btn')
            await page.wait_for_url(f"{BASE_URL}/auth/login")
            
            print("12. Login again...")
            await page.fill('input[type="email"]', 'test_feedback1@example.com')
            await page.fill('input[type="password"]', 'TestPassword123!')
            await page.click('button[type="submit"]')
            await page.wait_for_url(f"{BASE_URL}/dashboard")
            
            print("13. Confirm link still appears...")
            await page.click('#user-menu-btn')
            await page.wait_for_timeout(500)
            await page.screenshot(path="C:\\Users\\Mr.Darshan Shukla\\.gemini\\antigravity-ide\\brain\\d510b7e4-fd31-4125-8529-bcdbf437605a\\admin_dropdown_after_relogin.png")
            if await page.query_selector('text="Admin Feedback"'):
                print("SUCCESS: Link remains visible after re-login.")
            else:
                print("ERROR: Link disappeared after re-login!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
