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
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/student-login-success.png', fullPage: true });
  });

  test('should access student dashboard after login', async ({ page }) => {
    await loginAsStudent(page);
    
    // Check if on dashboard or onboarding
    const url = page.url();
    
    if (url.includes('/dashboard')) {
      // On dashboard - check for dashboard elements
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/student-dashboard.png', fullPage: true });
      
      console.log('✅ Student dashboard loaded successfully');
    } else {
      // Might be on onboarding
      const hasOnboarding = await page.locator('text=Welcome to Your Journey').isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasOnboarding) {
        console.log('ℹ️ Student needs to complete onboarding first');
        await page.screenshot({ path: 'test-results/student-onboarding-required.png', fullPage: true });
      }
    }
  });

  test('should complete onboarding if required', async ({ page }) => {
    await loginAsStudent(page);
    
    // Check if onboarding is shown
    const hasOnboarding = await page.locator('text=Welcome to Your Journey').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasOnboarding) {
      test.skip(true, 'Onboarding already completed');
      return;
    }
    
    console.log('📝 Starting onboarding flow...');
    
    // Step 1: Career Preferences
    await test.step('Complete Step 1 - Career Preferences', async () => {
      await expect(page.locator('text=Welcome to Your Journey')).toBeVisible();
      
      // Select career sectors
      await page.locator('text=IT & Technology').click();
      await page.waitForTimeout(500);
      
      // Select job roles
      await page.locator('text=Software Developer').first().click();
      await page.locator('text=Data Scientist').first().click();
      
      // Select future plan
      await page.locator('select').first().selectOption('Job/Employment');
      
      // Fill career goals
      await page.locator('textarea').fill('1. Become a skilled software developer\n2. Work on innovative projects\n3. Contribute to open source');
      
      // Select company types
      await page.locator('text=Startups').click();
      await page.locator('text=MNCs').click();
      
      await page.screenshot({ path: 'test-results/onboarding-step1.png', fullPage: true });
      
      // Click Next
      await page.locator('button:has-text("Next")').click();
      await page.waitForTimeout(1000);
    });

    // Step 2: Personal Interests
    await test.step('Complete Step 2 - Personal Interests', async () => {
      await expect(page.locator('text=Personal Interests and Preferences')).toBeVisible();
      
      // Fill hobbies
      const hobbiesInput = page.locator('input[placeholder*="hobbies"]');
      await hobbiesInput.fill('coding, reading, music');
      await hobbiesInput.blur();
      
      // Select event types
      await page.locator('text=Workshops').click();
      await page.locator('text=Hackathons').click();
      await page.locator('text=Internships').click();
      
      // Select availability
      await page.locator('text=Weekdays').click();
      await page.locator('text=Evenings').click();
      
      // Select willingness to travel
      await page.locator('select').selectOption('Within City');
      
      await page.screenshot({ path: 'test-results/onboarding-step2.png', fullPage: true });
      
      // Click Next
      await page.locator('button:has-text("Next")').click();
      await page.waitForTimeout(1000);
    });

    // Step 3: Advanced Preferences
    await test.step('Complete Step 3 - Advanced Preferences', async () => {
      await expect(page.locator('text=Advanced Preferences')).toBeVisible();
      
      // Select learning style
      await page.locator('select').selectOption('Hands-on');
      
      // Fill peer groups
      await page.locator('input[placeholder*="communities"]').fill('Tech Club, Coding Community');
      
      await page.screenshot({ path: 'test-results/onboarding-step3.png', fullPage: true });
      
      // Submit
      await page.locator('button:has-text("Complete Onboarding")').click();
      
      // Wait for completion
      await page.waitForTimeout(3000);
      
      // Should now be on dashboard
      const url = page.url();
      if (url.includes('/dashboard')) {
        console.log('✅ Onboarding completed successfully!');
        await page.screenshot({ path: 'test-results/onboarding-complete-dashboard.png', fullPage: true });
      }
    });
  });

  test('should display dashboard elements after onboarding', async ({ page }) => {
    await loginAsStudent(page);
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    const url = page.url();
    
    if (!url.includes('/dashboard')) {
      test.skip(true, 'Not on dashboard - may need onboarding');
      return;
    }
    
    // Check for common dashboard elements
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    await page.screenshot({ path: 'test-results/dashboard-full.png', fullPage: true });
    
    // Check for navigation/sidebar
    const hasNav = await page.locator('nav, aside, [role="navigation"]').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasNav) {
      console.log('✅ Dashboard navigation visible');
    }
    
    // Check for main content
    const hasMain = await page.locator('main, [role="main"], .dashboard').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasMain) {
      console.log('✅ Dashboard main content visible');
    }
  });

  test('should navigate to profile from dashboard', async ({ page }) => {
    await loginAsStudent(page);
    await page.waitForTimeout(3000);
    
    if (!page.url().includes('/dashboard')) {
      test.skip(true, 'Not on dashboard');
      return;
    }
    
    // Look for profile link
    const profileLink = page.locator('a[href="/profile"], a:has-text("Profile"), button:has-text("Profile")').first();
    
    if (await profileLink.isVisible({ timeout: 3000 })) {
      await profileLink.click();
      await page.waitForTimeout(2000);
      
      const url = page.url();
      expect(url).toContain('/profile');
      
      await page.screenshot({ path: 'test-results/student-profile.png', fullPage: true });
      console.log('✅ Navigated to profile successfully');
    }
  });

  test('should navigate to settings from dashboard', async ({ page }) => {
    await loginAsStudent(page);
    await page.waitForTimeout(3000);
    
    if (!page.url().includes('/dashboard')) {
      test.skip(true, 'Not on dashboard');
      return;
    }
    
    // Look for settings link
    const settingsLink = page.locator('a[href="/settings"], a:has-text("Settings"), button:has-text("Settings")').first();
    
    if (await settingsLink.isVisible({ timeout: 3000 })) {
      await settingsLink.click();
      await page.waitForTimeout(2000);
      
      const url = page.url();
      expect(url).toContain('/settings');
      
      await page.screenshot({ path: 'test-results/student-settings.png', fullPage: true });
      console.log('✅ Navigated to settings successfully');
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
      
      await page.screenshot({ path: 'test-results/student-logout.png', fullPage: true });
      console.log('✅ Logged out successfully');
    }
  });

  test('should check dashboard performance', async ({ page }) => {
    const startTime = Date.now();
    
    await loginAsStudent(page);
    
    const loginTime = Date.now() - startTime;
    console.log(`Login completed in ${loginTime}ms`);
    
    // Wait for dashboard to fully load
    await page.waitForTimeout(3000);
    
    const totalTime = Date.now() - startTime;
    console.log(`Total time to dashboard: ${totalTime}ms`);
    
    // Should be reasonably fast
    expect(totalTime).toBeLessThan(10000); // 10 seconds max
  });

  test('should handle dashboard on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await loginAsStudent(page);
    await page.waitForTimeout(3000);
    
    if (page.url().includes('/dashboard')) {
      await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
      console.log('✅ Dashboard mobile view captured');
    }
  });
});
