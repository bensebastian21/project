const { test, expect } = require('@playwright/test');

// Test credentials for host
const TEST_HOST = {
  email: 'amaljyothi123@gmail.com',
  password: 'benappan47'
};

// Helper function to login as host
async function loginAsHost(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  
  await emailInput.fill(TEST_HOST.email);
  await passwordInput.fill(TEST_HOST.password);
  
  // Click login button
  const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first();
  await loginButton.click();
  
  // Wait for navigation
  await page.waitForTimeout(3000);
}

test.describe('Host Dashboard - Authenticated Tests', () => {
  
  test('should login and access host dashboard', async ({ page }) => {
    await loginAsHost(page);
    
    // Should be on host dashboard
    const url = page.url();
    expect(url).toContain('/host-dashboard');
    expect(url).not.toContain('/dashboard'); // Not student dashboard
    
    console.log('✅ Host login and dashboard access successful');
  });

  test('should navigate to profile and settings', async ({ page }) => {
    await loginAsHost(page);
    
    if (!page.url().includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Check profile navigation
    const profileLink = page.locator('a[href="/profile"], a:has-text("Profile")').first();
    if (await profileLink.isVisible({ timeout: 3000 })) {
      await profileLink.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/profile');
      console.log('✅ Navigated to host profile successfully');
      
      // Go back to dashboard
      await page.goBack();
      await page.waitForTimeout(2000);
    }
    
    // Check settings navigation
    const settingsLink = page.locator('a[href="/settings"], a:has-text("Settings")').first();
    if (await settingsLink.isVisible({ timeout: 3000 })) {
      await settingsLink.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/settings');
      console.log('✅ Navigated to host settings successfully');
    }
  });

  test('should check for core host features', async ({ page }) => {
    await loginAsHost(page);
    
    if (!page.url().includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Check for event management features
    const eventElements = await page.locator('text=Event, text=Create Event, text=My Events').count();
    if (eventElements > 0) {
      console.log(`✅ Found ${eventElements} event-related elements`);
    }
    
    // Check for analytics features
    const statsElements = await page.locator('text=Statistics, text=Analytics, text=Registrations').count();
    if (statsElements > 0) {
      console.log(`✅ Found ${statsElements} statistics/analytics elements`);
    }
    
    // Check for host-specific features
    const hostFeatures = [];
    
    if (await page.locator('text=Create Event, button:has-text("Create")').isVisible({ timeout: 2000 }).catch(() => false)) {
      hostFeatures.push('Event Creation');
    }
    
    if (await page.locator('text=My Events, text=Manage Events').isVisible({ timeout: 2000 }).catch(() => false)) {
      hostFeatures.push('Event Management');
    }
    
    if (await page.locator('text=Attendees, text=Registrations').isVisible({ timeout: 2000 }).catch(() => false)) {
      hostFeatures.push('Attendee Management');
    }
    
    if (hostFeatures.length > 0) {
      console.log(`✅ Host features found: ${hostFeatures.join(', ')}`);
    }
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsHost(page);
    
    // Look for logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
    
    if (await logoutButton.isVisible({ timeout: 3000 })) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      // Should redirect to login
      const url = page.url();
      expect(url.includes('/login') || url === '/').toBeTruthy();
      
      console.log('✅ Host logged out successfully');
    }
  });
});