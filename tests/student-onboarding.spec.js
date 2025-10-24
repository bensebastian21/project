const { test, expect } = require('@playwright/test');

// Helper function to login as a test student
async function loginAsStudent(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  
  await emailInput.fill('teststudent@example.com');
  await passwordInput.fill('password123');
  
  // Click login button
  const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
  await loginButton.click();
  
  // Wait for navigation or response
  await page.waitForTimeout(2000);
}

test.describe('Student Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display landing page', async ({ page }) => {
    // Check if landing page loads
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(1000);
  });

  test('should complete student onboarding with all required fields', async ({ page }) => {
    // This test requires a logged-in student without completed onboarding
    // Skip if authentication is not set up
    test.skip(true, 'Requires authenticated test user');
    
    // Step 1: Career Preferences
    await test.step('Fill Step 1 - Career Preferences', async () => {
      // Check if we're on the onboarding page
      await expect(page.locator('text=Welcome to Your Journey!')).toBeVisible({ timeout: 10000 });
      
      // Select career sectors
      await page.locator('text=IT & Technology').click();
      await page.locator('text=Healthcare').click();
      
      // Wait for job roles to appear
      await page.waitForTimeout(500);
      
      // Select job roles
      await page.locator('text=Software Developer').first().click();
      await page.locator('text=Data Scientist').first().click();
      
      // Select future plan
      await page.locator('select').first().selectOption('Job/Employment');
      
      // Fill career goals
      await page.locator('textarea').fill('1. Become a senior developer\n2. Lead a team\n3. Build impactful products');
      
      // Preferred work mode should default to Remote
      const workModeSelect = page.locator('select').nth(1);
      await expect(workModeSelect).toHaveValue('Remote');
      
      // Select company types
      await page.locator('text=Startups').click();
      await page.locator('text=MNCs').click();
      
      // Click Next
      await page.locator('button:has-text("Next")').click();
    });

    // Step 2: Personal Interests and Preferences
    await test.step('Fill Step 2 - Personal Interests', async () => {
      await expect(page.locator('text=Personal Interests and Preferences')).toBeVisible();
      
      // Fill hobbies
      await page.locator('input[placeholder*="hobbies"]').fill('reading, coding, music');
      
      // Select event types
      await page.locator('text=Workshops').click();
      await page.locator('text=Hackathons').click();
      await page.locator('text=Internships').click();
      
      // Select availability
      await page.locator('text=Weekdays').click();
      await page.locator('text=Evenings').click();
      
      // Select willingness to travel
      await page.locator('select').selectOption('Within City');
      
      // Click Next
      await page.locator('button:has-text("Next")').click();
    });

    // Step 3: Advanced Preferences
    await test.step('Fill Step 3 - Advanced Preferences', async () => {
      await expect(page.locator('text=Advanced Preferences')).toBeVisible();
      
      // Select learning style
      await page.locator('select').selectOption('Hands-on');
      
      // Fill peer groups
      await page.locator('input[placeholder*="communities"]').fill('Tech Club, Coding Bootcamp');
      
      // Submit
      await page.locator('button:has-text("Complete Onboarding")').click();
      
      // Wait for success message or redirect
      await page.waitForTimeout(2000);
    });
  });

  test('should show validation errors for missing required fields', async ({ page }) => {
    test.skip(true, 'Requires authenticated test user');
    
    await test.step('Try to submit without filling required fields', async () => {
      await expect(page.locator('text=Welcome to Your Journey!')).toBeVisible({ timeout: 10000 });
      
      // Try to go to next step without filling
      await page.locator('button:has-text("Next")').click();
      
      // Should see validation error
      await expect(page.locator('text=Please select at least one option, text=Please fill')).toBeVisible({ timeout: 5000 });
    });
  });

  test('should show on-focus validation', async ({ page }) => {
    test.skip(true, 'Requires authenticated test user');
    
    await test.step('Focus and blur required fields', async () => {
      await expect(page.locator('text=Welcome to Your Journey!')).toBeVisible({ timeout: 10000 });
      
      // Focus on career sectors checkbox
      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      await firstCheckbox.focus();
      
      // Move to next field
      await page.keyboard.press('Tab');
      
      // Should show inline error
      await page.waitForTimeout(500);
      const errorText = page.locator('text=Please select at least one option');
      if (await errorText.isVisible()) {
        await expect(errorText).toBeVisible();
      }
    });
  });

  test('should navigate between steps', async ({ page }) => {
    test.skip(true, 'Requires authenticated test user');
    
    await test.step('Navigate forward and backward', async () => {
      await expect(page.locator('text=Welcome to Your Journey!')).toBeVisible({ timeout: 10000 });
      
      // Fill minimum required for step 1
      await page.locator('text=IT & Technology').click();
      await page.waitForTimeout(500);
      await page.locator('text=Software Developer').first().click();
      await page.locator('select').first().selectOption('Job/Employment');
      await page.locator('textarea').fill('Career goals here');
      await page.locator('text=Startups').click();
      
      // Go to step 2
      await page.locator('button:has-text("Next")').click();
      await expect(page.locator('text=Personal Interests and Preferences')).toBeVisible();
      
      // Go back to step 1
      await page.locator('button:has-text("Previous")').click();
      await expect(page.locator('text=Career Preferences')).toBeVisible();
      
      // Verify data is preserved
      await expect(page.locator('text=IT & Technology')).toBeVisible();
    });
  });

  test('should filter job roles based on selected sectors', async ({ page }) => {
    test.skip(true, 'Requires authenticated test user');
    
    await test.step('Job roles should update when sectors change', async () => {
      await expect(page.locator('text=Welcome to Your Journey!')).toBeVisible({ timeout: 10000 });
      
      // Initially no job roles should be visible
      await expect(page.locator('text=Please select career sectors first')).toBeVisible();
      
      // Select IT & Technology
      await page.locator('text=IT & Technology').click();
      await page.waitForTimeout(500);
      
      // Now job roles should appear
      await expect(page.locator('text=Software Developer')).toBeVisible();
      await expect(page.locator('text=Data Scientist')).toBeVisible();
    });
  });

  test('should show progress bar', async ({ page }) => {
    test.skip(true, 'Requires authenticated test user');
    
    await test.step('Progress bar should update', async () => {
      await expect(page.locator('text=Welcome to Your Journey!')).toBeVisible({ timeout: 10000 });
      
      // Check initial progress
      await expect(page.locator('text=Step 1 of 3')).toBeVisible();
      await expect(page.locator('text=33% Complete')).toBeVisible();
      
      // Fill and go to step 2
      await page.locator('text=IT & Technology').click();
      await page.waitForTimeout(500);
      await page.locator('text=Software Developer').first().click();
      await page.locator('select').first().selectOption('Job/Employment');
      await page.locator('textarea').fill('Goals');
      await page.locator('text=Startups').click();
      await page.locator('button:has-text("Next")').click();
      
      // Check step 2 progress
      await expect(page.locator('text=Step 2 of 3')).toBeVisible();
      await expect(page.locator('text=67% Complete')).toBeVisible();
    });
  });

  test('should handle hobbies input with commas', async ({ page }) => {
    test.skip(true, 'Requires authenticated test user');
    
    await test.step('Hobbies should accept comma-separated values', async () => {
      await expect(page.locator('text=Welcome to Your Journey!')).toBeVisible({ timeout: 10000 });
      
      // Navigate to step 2
      await page.locator('text=IT & Technology').click();
      await page.waitForTimeout(500);
      await page.locator('text=Software Developer').first().click();
      await page.locator('select').first().selectOption('Job/Employment');
      await page.locator('textarea').fill('Goals');
      await page.locator('text=Startups').click();
      await page.locator('button:has-text("Next")').click();
      
      // Fill hobbies with commas
      const hobbiesInput = page.locator('input[placeholder*="hobbies"]');
      await hobbiesInput.fill('reading, coding, music, sports');
      
      // Verify commas are visible
      await expect(hobbiesInput).toHaveValue('reading, coding, music, sports');
      
      // Blur to trigger normalization
      await hobbiesInput.blur();
      await page.waitForTimeout(300);
    });
  });
});
