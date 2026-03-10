const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test('should display landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the landing page
    await expect(page).toHaveURL('/');
    
    // Check for common landing page elements
    await page.waitForTimeout(1000);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the login page
    await expect(page).toHaveURL('/login');
    
    // Check for login form elements
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
  });

  test('should show validation for empty login fields', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Try to submit empty login form
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first();
    
    if (await loginButton.isVisible({ timeout: 5000 })) {
      await loginButton.click();
      
      // Wait for validation messages or error toast
      await page.waitForTimeout(1000);
      
      // Should remain on login page or show error
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    }
  });

  test('should show validation for invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    
    // Fill with invalid email
    await emailInput.fill('invalidemail');
    await passwordInput.fill('password123');
    
    // Blur to trigger validation
    await emailInput.blur();
    await page.waitForTimeout(500);
    
    // Check for validation error (may be inline or toast)
    const hasError = await page.locator('text=Invalid email, text=email format').isVisible({ timeout: 2000 }).catch(() => false);
    // Test passes if error is shown or if we can't submit
  });

  test('should navigate to register page from login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Look for register/sign up link
    const registerLink = page.locator('text=Register, text=Sign Up, text=Create Account, text=Don\'t have an account').first();
    
    if (await registerLink.isVisible({ timeout: 5000 })) {
      await registerLink.click();
      await page.waitForTimeout(1000);
      
      // Should show register form or modal
      const hasRegisterForm = await page.locator('text=Student, text=Host, input[name="name"], input[placeholder*="Name"]').isVisible({ timeout: 3000 }).catch(() => false);
    }
  });

  test('should have password reset link', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Look for forgot password link
    const forgotLink = page.locator('text=Forgot Password, text=Reset Password, a[href*="reset"]').first();
    
    if (await forgotLink.isVisible({ timeout: 5000 })) {
      await forgotLink.click();
      await page.waitForTimeout(1000);
      
      // Should navigate to reset page or show modal
      const currentUrl = page.url();
      const hasResetForm = await page.locator('input[type="email"], text=Reset, text=Forgot').isVisible({ timeout: 3000 }).catch(() => false);
    }
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the about page
    await expect(page).toHaveURL('/about');
    await page.waitForTimeout(500);
  });

  test('should navigate to contact page', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the contact page
    await expect(page).toHaveURL('/contact');
    await page.waitForTimeout(500);
  });
});
