const { test, expect } = require('@playwright/test');

// Test credentials for admin
const TEST_ADMIN = {
  email: 'bensebastian021@gmail.com',
  password: 'benappan47'
};

test.describe('Admin Login Functionality Test', () => {
  
  test('should login successfully with admin credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill credentials
    await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_ADMIN.email);
    await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_ADMIN.password);
    
    // Submit login form
    await page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first().click();
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // Verify successful login by checking URL
    const url = page.url();
    const isOnAdmin = url.includes('/admin') || url.includes('/dashboard');
    
    expect(isOnAdmin).toBeTruthy();
    
    // Log success message
    console.log('✅ Admin login successful');
  });

  test('should display login page elements correctly', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Check if login form elements are present
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first();
    
    // Verify all elements are visible
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
    
    console.log('✅ Login page displays all required elements');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill invalid credentials
    await page.locator('input[name="email"], input[type="email"]').first().fill('invalid@example.com');
    await page.locator('input[name="password"], input[type="password"]').first().fill('wrongpassword');
    
    // Submit login form
    await page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first().click();
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Should remain on login page
    const url = page.url();
    expect(url).toContain('/login');
    
    console.log('✅ Invalid credentials handling works correctly');
  });
});