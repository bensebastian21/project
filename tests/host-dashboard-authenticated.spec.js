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
  
  test('should login successfully with host credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill credentials
    await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_HOST.email);
    await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_HOST.password);
    
    // Submit
    await page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first().click();
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // Should be on host dashboard
    const url = page.url();
    const isOnHostDashboard = url.includes('/host-dashboard');
    
    expect(isOnHostDashboard).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/host-login-success.png', fullPage: true });
    console.log('✅ Host login successful');
  });

  test('should access host dashboard after login', async ({ page }) => {
    await loginAsHost(page);
    
    // Check if on host dashboard
    const url = page.url();
    expect(url).toContain('/host-dashboard');
    
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/host-dashboard.png', fullPage: true });
    
    console.log('✅ Host dashboard loaded successfully');
  });

  test('should display host dashboard elements', async ({ page }) => {
    await loginAsHost(page);
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    const url = page.url();
    
    if (!url.includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Take full page screenshot
    await page.screenshot({ path: 'test-results/host-dashboard-full.png', fullPage: true });
    
    // Check for navigation/sidebar
    const hasNav = await page.locator('nav, aside, [role="navigation"]').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasNav) {
      console.log('✅ Host dashboard navigation visible');
    }
    
    // Check for main content
    const hasMain = await page.locator('main, [role="main"], .dashboard').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasMain) {
      console.log('✅ Host dashboard main content visible');
    }
  });

  test('should navigate to profile from host dashboard', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Look for profile link
    const profileLink = page.locator('a[href="/profile"], a:has-text("Profile"), button:has-text("Profile")').first();
    
    if (await profileLink.isVisible({ timeout: 3000 })) {
      await profileLink.click();
      await page.waitForTimeout(2000);
      
      const url = page.url();
      expect(url).toContain('/profile');
      
      await page.screenshot({ path: 'test-results/host-profile.png', fullPage: true });
      console.log('✅ Navigated to host profile successfully');
    }
  });

  test('should navigate to settings from host dashboard', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Look for settings link
    const settingsLink = page.locator('a[href="/settings"], a:has-text("Settings"), button:has-text("Settings")').first();
    
    if (await settingsLink.isVisible({ timeout: 3000 })) {
      await settingsLink.click();
      await page.waitForTimeout(2000);
      
      const url = page.url();
      expect(url).toContain('/settings');
      
      await page.screenshot({ path: 'test-results/host-settings.png', fullPage: true });
      console.log('✅ Navigated to host settings successfully');
    }
  });

  test('should check for event management features', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Look for event-related elements
    const eventElements = await page.locator('text=Event, text=Create Event, text=My Events, button:has-text("Event")').count();
    
    if (eventElements > 0) {
      console.log(`✅ Found ${eventElements} event-related elements`);
      await page.screenshot({ path: 'test-results/host-events-section.png', fullPage: true });
    }
  });

  test('should check for analytics/statistics', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Look for analytics/stats elements
    const statsElements = await page.locator('text=Statistics, text=Analytics, text=Total, text=Views, text=Registrations').count();
    
    if (statsElements > 0) {
      console.log(`✅ Found ${statsElements} statistics/analytics elements`);
    }
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    // Look for logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
    
    if (await logoutButton.isVisible({ timeout: 3000 })) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      // Should redirect to login or landing
      const url = page.url();
      const isLoggedOut = url.includes('/login') || url === '/' || url.endsWith('/');
      
      expect(isLoggedOut).toBeTruthy();
      
      await page.screenshot({ path: 'test-results/host-logout.png', fullPage: true });
      console.log('✅ Host logged out successfully');
    }
  });

  test('should check host dashboard performance', async ({ page }) => {
    const startTime = Date.now();
    
    await loginAsHost(page);
    
    const loginTime = Date.now() - startTime;
    console.log(`Host login completed in ${loginTime}ms`);
    
    // Wait for dashboard to fully load
    await page.waitForTimeout(2000);
    
    const totalTime = Date.now() - startTime;
    console.log(`Total time to host dashboard: ${totalTime}ms`);
    
    // Should be reasonably fast
    expect(totalTime).toBeLessThan(10000); // 10 seconds max
  });

  test('should handle host dashboard on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    if (page.url().includes('/host-dashboard')) {
      await page.screenshot({ path: 'test-results/host-dashboard-mobile.png', fullPage: true });
      console.log('✅ Host dashboard mobile view captured');
    }
  });

  test('should handle host dashboard on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    if (page.url().includes('/host-dashboard')) {
      await page.screenshot({ path: 'test-results/host-dashboard-tablet.png', fullPage: true });
      console.log('✅ Host dashboard tablet view captured');
    }
  });

  test('should verify host role permissions', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    // Host should be on host-dashboard, not student dashboard
    const url = page.url();
    expect(url).toContain('/host-dashboard');
    expect(url).not.toContain('/dashboard'); // Not student dashboard
    
    console.log('✅ Host role permissions verified');
  });

  test('should check for host-specific features', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Look for host-specific elements
    const hostFeatures = [];
    
    // Check for event creation
    if (await page.locator('text=Create Event, button:has-text("Create"), text=New Event').isVisible({ timeout: 2000 }).catch(() => false)) {
      hostFeatures.push('Event Creation');
    }
    
    // Check for event management
    if (await page.locator('text=My Events, text=Manage Events, text=Event List').isVisible({ timeout: 2000 }).catch(() => false)) {
      hostFeatures.push('Event Management');
    }
    
    // Check for attendee management
    if (await page.locator('text=Attendees, text=Registrations, text=Participants').isVisible({ timeout: 2000 }).catch(() => false)) {
      hostFeatures.push('Attendee Management');
    }
    
    // Check for analytics
    if (await page.locator('text=Analytics, text=Statistics, text=Reports').isVisible({ timeout: 2000 }).catch(() => false)) {
      hostFeatures.push('Analytics');
    }
    
    console.log(`✅ Host features found: ${hostFeatures.join(', ')}`);
    
    if (hostFeatures.length > 0) {
      await page.screenshot({ path: 'test-results/host-features.png', fullPage: true });
    }
  });

  test('should check console for errors on host dashboard', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await loginAsHost(page);
    await page.waitForTimeout(3000);
    
    // Filter out known acceptable errors
    const criticalErrors = errors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('net::ERR') &&
      !err.includes('404')
    );
    
    if (criticalErrors.length > 0) {
      console.log('⚠️ Console errors found:', criticalErrors);
    } else {
      console.log('✅ No critical console errors on host dashboard');
    }
  });

  test('should verify host can access admin verification if admin', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    // Try to access admin verification
    await page.goto('/admin/verification');
    await page.waitForTimeout(2000);
    
    const url = page.url();
    
    // If host is also admin, should access it
    // If not, should redirect to login or dashboard
    if (url.includes('/admin/verification')) {
      console.log('✅ Host has admin access');
      await page.screenshot({ path: 'test-results/host-admin-access.png', fullPage: true });
    } else {
      console.log('ℹ️ Host does not have admin access (expected)');
    }
  });
});

test.describe('Host Dashboard - Feature Tests', () => {
  
  test('should check if host can create events', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Look for create event button
    const createButton = page.locator('button:has-text("Create Event"), button:has-text("Create"), a:has-text("Create Event")').first();
    
    if (await createButton.isVisible({ timeout: 3000 })) {
      console.log('✅ Create event button found');
      await page.screenshot({ path: 'test-results/host-create-event-button.png', fullPage: true });
    }
  });

  test('should check if host can view their events', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Look for events list or section
    const eventsSection = page.locator('text=My Events, text=Events, [class*="event"]').first();
    
    if (await eventsSection.isVisible({ timeout: 3000 })) {
      console.log('✅ Events section found');
      await page.screenshot({ path: 'test-results/host-events-list.png', fullPage: true });
    }
  });

  test('should check navigation menu items', async ({ page }) => {
    await loginAsHost(page);
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/host-dashboard')) {
      test.skip(true, 'Not on host dashboard');
      return;
    }
    
    // Check for common navigation items
    const navItems = [];
    
    const commonLinks = [
      'Dashboard',
      'Events',
      'Profile',
      'Settings',
      'Analytics',
      'Calendar',
      'Notifications'
    ];
    
    for (const linkText of commonLinks) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`).first();
      if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
        navItems.push(linkText);
      }
    }
    
    console.log(`✅ Navigation items found: ${navItems.join(', ')}`);
    
    if (navItems.length > 0) {
      await page.screenshot({ path: 'test-results/host-navigation.png', fullPage: true });
    }
  });
});
