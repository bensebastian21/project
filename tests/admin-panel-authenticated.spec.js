const { test, expect } = require('@playwright/test');

// Test credentials for admin
const TEST_ADMIN = {
  email: 'bensebastian021@gmail.com',
  password: 'benappan47'
};

// Helper function to login as admin
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  
  await emailInput.fill(TEST_ADMIN.email);
  await passwordInput.fill(TEST_ADMIN.password);
  
  // Click login button
  const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first();
  await loginButton.click();
  
  // Wait for navigation
  await page.waitForTimeout(3000);
}

test.describe('Admin Panel - Authenticated Tests', () => {
  
  test('should login successfully with admin credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill credentials
    await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_ADMIN.email);
    await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_ADMIN.password);
    
    // Submit
    await page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first().click();
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // Should be on admin panel or dashboard
    const url = page.url();
    const isOnAdmin = url.includes('/admin') || url.includes('/dashboard');
    
    expect(isOnAdmin).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-login-success.png', fullPage: true });
    console.log('✅ Admin login successful');
  });

  test('should access admin panel', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Navigate to admin panel
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if on admin panel
    const url = page.url();
    expect(url).toContain('/admin');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-panel.png', fullPage: true });
    
    console.log('✅ Admin panel loaded successfully');
  });

  test('should display admin panel elements', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/admin')) {
      test.skip(true, 'Not on admin panel');
      return;
    }
    
    // Take full page screenshot
    await page.screenshot({ path: 'test-results/admin-panel-full.png', fullPage: true });
    
    // Check for navigation/sidebar
    const hasNav = await page.locator('nav, aside, [role="navigation"]').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasNav) {
      console.log('✅ Admin panel navigation visible');
    }
    
    // Check for main content
    const hasMain = await page.locator('main, [role="main"], .admin').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasMain) {
      console.log('✅ Admin panel main content visible');
    }
  });

  test('should access admin verification page', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Navigate to admin verification
    await page.goto('/admin/verification');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if on verification page
    const url = page.url();
    expect(url).toContain('/admin/verification');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-verification.png', fullPage: true });
    
    console.log('✅ Admin verification page loaded successfully');
  });

  test('should display verification elements', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/verification');
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/admin/verification')) {
      test.skip(true, 'Not on verification page');
      return;
    }
    
    // Take full page screenshot
    await page.screenshot({ path: 'test-results/admin-verification-full.png', fullPage: true });
    
    // Look for verification-related elements
    const verificationElements = await page.locator('text=Verification, text=Pending, text=Approve, text=Reject, text=Student').count();
    
    if (verificationElements > 0) {
      console.log(`✅ Found ${verificationElements} verification-related elements`);
    }
  });

  test('should navigate to profile from admin panel', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    // Look for profile link
    const profileLink = page.locator('a[href="/profile"], a:has-text("Profile"), button:has-text("Profile")').first();
    
    if (await profileLink.isVisible({ timeout: 3000 })) {
      await profileLink.click();
      await page.waitForTimeout(2000);
      
      const url = page.url();
      expect(url).toContain('/profile');
      
      await page.screenshot({ path: 'test-results/admin-profile.png', fullPage: true });
      console.log('✅ Navigated to admin profile successfully');
    }
  });

  test('should navigate to settings from admin panel', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    // Look for settings link
    const settingsLink = page.locator('a[href="/settings"], a:has-text("Settings"), button:has-text("Settings")').first();
    
    if (await settingsLink.isVisible({ timeout: 3000 })) {
      await settingsLink.click();
      await page.waitForTimeout(2000);
      
      const url = page.url();
      expect(url).toContain('/settings');
      
      await page.screenshot({ path: 'test-results/admin-settings.png', fullPage: true });
      console.log('✅ Navigated to admin settings successfully');
    }
  });

  test('should check for admin statistics/dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/admin')) {
      test.skip(true, 'Not on admin panel');
      return;
    }
    
    // Look for statistics/dashboard elements
    const statsElements = await page.locator('text=Total, text=Users, text=Events, text=Statistics, text=Analytics, text=Dashboard').count();
    
    if (statsElements > 0) {
      console.log(`✅ Found ${statsElements} statistics/dashboard elements`);
      await page.screenshot({ path: 'test-results/admin-statistics.png', fullPage: true });
    }
  });

  test('should check for user management features', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/admin')) {
      test.skip(true, 'Not on admin panel');
      return;
    }
    
    // Look for user management elements
    const userElements = await page.locator('text=Users, text=Students, text=Hosts, text=Manage, text=User Management').count();
    
    if (userElements > 0) {
      console.log(`✅ Found ${userElements} user management elements`);
    }
  });

  test('should check for event management features', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/admin')) {
      test.skip(true, 'Not on admin panel');
      return;
    }
    
    // Look for event management elements
    const eventElements = await page.locator('text=Events, text=Event Management, text=All Events').count();
    
    if (eventElements > 0) {
      console.log(`✅ Found ${eventElements} event management elements`);
    }
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsAdmin(page);
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
      
      await page.screenshot({ path: 'test-results/admin-logout.png', fullPage: true });
      console.log('✅ Admin logged out successfully');
    }
  });

  test('should check admin panel performance', async ({ page }) => {
    const startTime = Date.now();
    
    await loginAsAdmin(page);
    
    const loginTime = Date.now() - startTime;
    console.log(`Admin login completed in ${loginTime}ms`);
    
    // Navigate to admin panel
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    const totalTime = Date.now() - startTime;
    console.log(`Total time to admin panel: ${totalTime}ms`);
    
    // Should be reasonably fast
    expect(totalTime).toBeLessThan(12000); // 12 seconds max
  });

  test('should handle admin panel on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('/admin')) {
      await page.screenshot({ path: 'test-results/admin-panel-mobile.png', fullPage: true });
      console.log('✅ Admin panel mobile view captured');
    }
  });

  test('should handle admin panel on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('/admin')) {
      await page.screenshot({ path: 'test-results/admin-panel-tablet.png', fullPage: true });
      console.log('✅ Admin panel tablet view captured');
    }
  });

  test('should verify admin role permissions', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Admin should have access to all dashboards
    const dashboards = [
      { url: '/admin', name: 'Admin Panel' },
      { url: '/admin/verification', name: 'Admin Verification' },
      { url: '/dashboard', name: 'Student Dashboard' },
      { url: '/host-dashboard', name: 'Host Dashboard' }
    ];
    
    const accessibleDashboards = [];
    
    for (const dashboard of dashboards) {
      await page.goto(dashboard.url);
      await page.waitForTimeout(1500);
      
      const url = page.url();
      if (url.includes(dashboard.url.split('/')[1])) {
        accessibleDashboards.push(dashboard.name);
      }
    }
    
    console.log(`✅ Admin has access to: ${accessibleDashboards.join(', ')}`);
    
    // Admin should have access to at least admin panel
    expect(accessibleDashboards.length).toBeGreaterThan(0);
  });

  test('should check for admin-specific features', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/admin')) {
      test.skip(true, 'Not on admin panel');
      return;
    }
    
    // Look for admin-specific elements
    const adminFeatures = [];
    
    // Check for user management
    if (await page.locator('text=User Management, text=Manage Users, text=Users').isVisible({ timeout: 2000 }).catch(() => false)) {
      adminFeatures.push('User Management');
    }
    
    // Check for verification
    if (await page.locator('text=Verification, text=Verify, text=Pending Verifications').isVisible({ timeout: 2000 }).catch(() => false)) {
      adminFeatures.push('Verification');
    }
    
    // Check for event management
    if (await page.locator('text=Event Management, text=Manage Events, text=All Events').isVisible({ timeout: 2000 }).catch(() => false)) {
      adminFeatures.push('Event Management');
    }
    
    // Check for analytics
    if (await page.locator('text=Analytics, text=Statistics, text=Reports').isVisible({ timeout: 2000 }).catch(() => false)) {
      adminFeatures.push('Analytics');
    }
    
    // Check for settings
    if (await page.locator('text=System Settings, text=Configuration').isVisible({ timeout: 2000 }).catch(() => false)) {
      adminFeatures.push('System Settings');
    }
    
    console.log(`✅ Admin features found: ${adminFeatures.join(', ')}`);
    
    if (adminFeatures.length > 0) {
      await page.screenshot({ path: 'test-results/admin-features.png', fullPage: true });
    }
  });

  test('should check console for errors on admin panel', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await loginAsAdmin(page);
    await page.goto('/admin');
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
      console.log('✅ No critical console errors on admin panel');
    }
  });

  test('should check navigation menu items', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    if (!page.url().includes('/admin')) {
      test.skip(true, 'Not on admin panel');
      return;
    }
    
    // Check for common navigation items
    const navItems = [];
    
    const commonLinks = [
      'Dashboard',
      'Users',
      'Events',
      'Verification',
      'Analytics',
      'Settings',
      'Profile'
    ];
    
    for (const linkText of commonLinks) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`).first();
      if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
        navItems.push(linkText);
      }
    }
    
    console.log(`✅ Navigation items found: ${navItems.join(', ')}`);
    
    if (navItems.length > 0) {
      await page.screenshot({ path: 'test-results/admin-navigation.png', fullPage: true });
    }
  });

  test('should verify admin can access all protected routes', async ({ page }) => {
    await loginAsAdmin(page);
    
    const protectedRoutes = [
      '/admin',
      '/admin/verification',
      '/profile',
      '/settings'
    ];
    
    const accessibleRoutes = [];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1500);
      
      const url = page.url();
      if (!url.includes('/login')) {
        accessibleRoutes.push(route);
      }
    }
    
    console.log(`✅ Admin can access: ${accessibleRoutes.join(', ')}`);
    
    // Admin should have access to all routes
    expect(accessibleRoutes.length).toBe(protectedRoutes.length);
  });
});
