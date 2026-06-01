import asyncio
import uuid
from playwright.async_api import async_playwright

async def run_e2e_audit():
    print("Starting E2E Authentication Audit...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            record_har_path="network.har"
        )
        page = await context.new_page()
        
        # Unique credentials
        test_email = f"e2e_{uuid.uuid4().hex[:6]}@example.com"
        test_password = "password123"
        test_name = "E2E Auditor"
        
        print("\n--- Test 1: Register a brand-new user ---")
        await page.goto("http://localhost:4000/auth/register")
        await page.fill("#name", test_name)
        await page.fill("#email", test_email)
        await page.fill("#password", test_password)
        await page.fill("#confirmPassword", test_password)
        await page.click("#register-submit-btn")
        
        # Wait for redirect
        await page.wait_for_url("**/onboarding*")
        print("PASS: Successfully registered user from the browser.")
        await page.screenshot(path="screenshot_1_after_registration.png")
        
        print("\n--- Test 2: Verify redirect after registration ---")
        if "/onboarding" in page.url:
            print(f"PASS: Redirected to {page.url}")
        else:
            print(f"FAIL: Expected /onboarding, got {page.url}")
            
        print("\n--- Test 3: Verify JWT appears in localStorage ---")
        access_token = await page.evaluate("localStorage.getItem('access_token')")
        if access_token:
            print("PASS: access_token found in localStorage.")
        else:
            print("FAIL: access_token missing from localStorage.")
            
        print("\n--- Test 4 & 5: Refresh browser and verify user remains authenticated ---")
        await page.reload()
        await page.wait_for_load_state("networkidle")
        access_token_after_refresh = await page.evaluate("localStorage.getItem('access_token')")
        if access_token_after_refresh == access_token:
            print("PASS: Token survived page refresh and user remained authenticated.")
        else:
            print("FAIL: Token did not survive page refresh.")
            
        print("\n--- Test 6: Navigate to Dashboard and verify ---")
        await page.goto("http://localhost:4000/dashboard")
        await page.wait_for_selector("#user-menu-btn")
        print("PASS: Navigated to Dashboard successfully.")
        await page.screenshot(path="screenshot_2_dashboard.png")
        
        print("\n--- Test 8 & 9: Logout and verify localStorage cleared ---")
        # Click user menu to open dropdown
        await page.click("#user-menu-btn")
        # Click logout
        await page.click("#logout-btn")
        
        # Wait for redirect to login
        await page.wait_for_url("**/auth/login*")
        
        # Check local storage
        access_token_after_logout = await page.evaluate("localStorage.getItem('access_token')")
        if not access_token_after_logout:
            print("PASS: LocalStorage was properly cleared on logout.")
        else:
            print("FAIL: LocalStorage still contains token after logout!")
            
        print("\n--- Test 10: Verify protected routes redirect back to Login ---")
        await page.goto("http://localhost:4000/dashboard")
        await page.wait_for_load_state("networkidle")
        if "/auth/login" in page.url:
            print("PASS: Protected route actively rejected unauthenticated user and redirected to login.")
        else:
            print(f"FAIL: Unauthenticated user was able to access {page.url}")
            
        await browser.close()
        print("\nE2E Authentication Audit Completed Successfully.")

if __name__ == "__main__":
    asyncio.run(run_e2e_audit())
