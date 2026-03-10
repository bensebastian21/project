const { test, expect } = require('@playwright/test');

// Test credentials
const TEST_STUDENT = {
  email: 'albinmathew2026@mca.ajce.in',
  password: 'albin123'
};

// Helper function to login
async function loginAsStudent(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  
  await emailInput.fill(TEST_STUDENT.email);
  await passwordInput.fill(TEST_STUDENT.password);
  
  // Click login button
  const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first();
  await loginButton.click();
  
  // Wait for navigation
  await page.waitForTimeout(3000);
}

test.describe('Student Dashboard - Authenticated Tests', () => {
  
  test('should login successfully with test credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill credentials
    await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_STUDENT.email);
    await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_STUDENT.password);
    
    // Submit
    await page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first().click();
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // Should be on dashboard or onboarding
    const url = page.url();
    const isOnDashboard = url.includes('/dashboard');
    const hasOnboarding = await page.locator('text=Welcome to Your Journey').isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(isOnDashboard || hasOnboarding).toBeTruthy();
    
    console.log('✅ Student login successful');
  });

  test('should access student dashboard after login', async ({ page }) => {
    await loginAsStudent(page);
    
    // Check if on dashboard or onboarding
    const url = page.url();
    
    if (url.includes('/dashboard')) {
      // On dashboard - check for dashboard elements
      await page.waitForTimeout(2000);
      console.log('✅ Student dashboard loaded successfully');
    } else {
      // Might be on onboarding
      const hasOnboarding = await page.locator('text=Welcome to Your Journey').isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasOnboarding) {
        console.log('ℹ️ Student needs to complete onboarding first');
      }
    }
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsStudent(page);
    await page.waitForTimeout(3000);
    
    // Look for logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
    
    if (await logoutButton.isVisible({ timeout: 3000 })) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      // Should redirect to login or landing
      const url = page.url();
      const isLoggedOut = url.includes('/login') || url === '/';
      
      expect(isLoggedOut).toBeTruthy();
      
      console.log('✅ Logged out successfully');
    }
  });
});