"""
E-Commerce System QA Test Script
Tests the complete e-commerce application including:
- Login/logout flows
- Product browsing
- Cart operations
- Order management
- Admin/Sales features
"""

from playwright.sync_api import sync_playwright
import json
import os

OUTPUT_DIR = "c:/Users/13621/Desktop/网络应用开发/ecommerce/test-output"
SCREENSHOTS_DIR = f"{OUTPUT_DIR}/screenshots"

# Create output directories
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def test_customer_flow(page):
    """Test customer user flow"""
    print("Testing Customer Flow...")
    issues = []
    
    # Test 1: Homepage
    print("  - Testing Homepage...")
    page.goto("http://localhost:5173/")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/01_homepage.png")
    
    # Check for console errors on homepage
    errors = page.evaluate("() => window.__errors || []")
    if errors:
        issues.append({
            "page": "Homepage",
            "issue": f"Console errors detected: {errors}",
            "severity": "high"
        })
    
    # Test 2: Products page
    print("  - Testing Products page...")
    page.goto("http://localhost:5173/products")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/02_products.png")
    
    # Test 3: Login flow
    print("  - Testing Login...")
    page.goto("http://localhost:5173/login")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/03_login.png")
    
    # Fill login form
    page.fill("input[placeholder*='用户名' i], input[type='text']", "testuser")
    page.fill("input[type='password']", "test123")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/04_login_filled.png")
    page.click("button[type='submit']")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/05_after_login.png")
    
    # Test 4: Cart page
    print("  - Testing Cart page...")
    page.goto("http://localhost:5173/cart")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/06_cart.png")
    
    # Test 5: Orders page
    print("  - Testing Orders page...")
    page.goto("http://localhost:5173/orders")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/07_orders.png")
    
    return issues

def test_admin_flow(page):
    """Test admin user flow"""
    print("Testing Admin Flow...")
    issues = []
    
    # Login as admin
    print("  - Logging in as admin...")
    page.goto("http://localhost:5173/login")
    page.wait_for_load_state("networkidle")
    page.fill("input[placeholder*='用户名' i], input[type='text']", "admin")
    page.fill("input[type='password']", "admin123")
    page.click("button[type='submit']")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/08_admin_login.png")
    
    # Test Admin page
    print("  - Testing Admin page...")
    page.goto("http://localhost:5173/admin")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/09_admin_dashboard.png")
    
    # Check console errors
    console_logs = page.evaluate("() => JSON.stringify(window.__console_logs || [])")
    
    return issues

def test_sales_flow(page):
    """Test sales user flow"""
    print("Testing Sales Flow...")
    issues = []
    
    # Login as sales
    print("  - Logging in as sales...")
    page.goto("http://localhost:5173/login")
    page.wait_for_load_state("networkidle")
    page.fill("input[placeholder*='用户名' i], input[type='text']", "sales")
    page.fill("input[type='password']", "sales123")
    page.click("button[type='submit']")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/10_sales_login.png")
    
    # Test Sales page
    print("  - Testing Sales page...")
    page.goto("http://localhost:5173/sales")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/11_sales_dashboard.png")
    
    # Test Analytics page
    print("  - Testing Analytics page...")
    page.goto("http://localhost:5173/analytics")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/12_analytics.png")
    
    return issues

def test_registration_flow(page):
    """Test user registration"""
    print("Testing Registration Flow...")
    issues = []
    
    page.goto("http://localhost:5173/register")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/13_register.png")
    
    # Fill registration form with unique username
    import time
    unique_user = f"testuser_{int(time.time())}"
    page.fill("input[placeholder*='用户名' i], input[type='text']", unique_user)
    page.fill("input[type='email'], input[placeholder*='邮箱' i]", f"{unique_user}@test.com")
    page.fill("input[type='password']", "test123")
    page.screenshot(path=f"{SCREENSHOTS_DIR}/14_register_filled.png")
    
    return issues

def capture_console_errors(page):
    """Capture any console errors"""
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    return errors

def main():
    print("=" * 60)
    print("E-Commerce System QA Test")
    print("=" * 60)
    
    all_issues = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        
        # Capture console errors
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        
        try:
            # Test customer flow
            customer_issues = test_customer_flow(page)
            all_issues.extend(customer_issues)
            
            # Test registration
            reg_issues = test_registration_flow(page)
            all_issues.extend(reg_issues)
            
            # Test admin flow
            admin_issues = test_admin_flow(page)
            all_issues.extend(admin_issues)
            
            # Test sales flow
            sales_issues = test_sales_flow(page)
            all_issues.extend(sales_issues)
            
        except Exception as e:
            print(f"ERROR during testing: {e}")
            all_issues.append({
                "page": "General",
                "issue": f"Test execution error: {str(e)}",
                "severity": "critical"
            })
        
        # Print captured console errors
        if errors:
            print(f"\nCaptured {len(errors)} console errors:")
            for err in errors[:10]:
                print(f"  - {err[:200]}")
        
        browser.close()
    
    # Generate report
    print("\n" + "=" * 60)
    print("QA Test Report")
    print("=" * 60)
    print(f"Total issues found: {len(all_issues)}")
    
    if all_issues:
        print("\nIssues by severity:")
        high = [i for i in all_issues if i.get("severity") == "high"]
        medium = [i for i in all_issues if i.get("severity") == "medium"]
        low = [i for i in all_issues if i.get("severity") == "low"]
        print(f"  High: {len(high)}")
        print(f"  Medium: {len(medium)}")
        print(f"  Low: {len(low)}")
        
        print("\nDetailed issues:")
        for i, issue in enumerate(all_issues, 1):
            print(f"\n{i}. [{issue.get('severity', 'unknown').upper()}] {issue.get('page', 'Unknown')}")
            print(f"   {issue.get('issue', 'No description')}")
    
    print("\n" + "=" * 60)
    print(f"Screenshots saved to: {SCREENSHOTS_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    main()
