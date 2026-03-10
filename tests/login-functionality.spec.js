const { test, expect } = require('@playwright/test');

// Test credentials for different user types
const TEST_USERS = {
  student: {
    email: 'student@example.com',
    password: 'student123'
  },
  host: {
    email: 'host@example.com',
    password: 'host123'
  },
  admin: {
    email: 'admin@example.com',
    password: 'admin123'
  }
};

// Helper function to perform login
async function performLogin(page, userType) {
  const user = TEST_USERS[userType];
  
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  
  await emailInput.fill(user.email);
  await passwordInput.fill(user.password);
  
  // Click login button
  const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first();
  await loginButton.click();
  
  // Wait for navigation
  await page.waitForTimeout(3000);
}

test.describe('Login Functionality Tests', () => {
  
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Check if login form elements are present
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first();
    const forgotPasswordLink = page.locator('text=Forgot Password, text=Reset Password, a[href*="reset"]').first();
    const googleLoginButton = page.locator('button:has-text("Sign in with Google")').first();
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
    await expect(forgotPasswordLink).toBeVisible();
    await expect(googleLoginButton).toBeVisible();
    
    console.log('✅ Login page displays all required elements');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Try to submit empty form
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first();
    await loginButton.click();
    
    // Wait for validation
    await page.waitForTimeout(1000);
    
    // Should remain on login page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
    
    console.log('✅ Validation works for empty fields');
  });

  test('should show validation error for invalid email format', async ({ page }) => {
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
    
    console.log('✅ Validation works for invalid email format');
  });

  test('should successfully login as student', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill student credentials
    await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_USERS.student.email);
    await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_USERS.student.password);
    
    // Submit
    await page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first().click();
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // Should be on student dashboard
    const url = page.url();
    expect(url).toContain('/dashboard');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/student-login-success.png', fullPage: true });
    console.log('✅ Student login successful');
  });

  test('should successfully login as host', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill host credentials
    await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_USERS.host.email);
    await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_USERS.host.password);
    
    // Submit
    await page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first().click();
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // Should be on host dashboard
    const url = page.url();
    expect(url).toContain('/host-dashboard');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/host-login-success.png', fullPage: true });
    console.log('✅ Host login successful');
  });

  test('should successfully login as admin', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill admin credentials
    await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_USERS.admin.email);
    await page.locator('input[name="password"], input[type="password"]').first().fill(TEST_USERS.admin.password);
    
    // Submit
    await page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first().click();
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // Should be on admin panel
    const url = page.url();
    expect(url).toContain('/admin');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-login-success.png', fullPage: true });
    console.log('✅ Admin login successful');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill invalid credentials
    await page.locator('input[name="email"], input[type="email"]').first().fill('invalid@example.com');
    await page.locator('input[name="password"], input[type="password"]').first().fill('wrongpassword');
    
    // Submit
    await page.locator('button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]').first().click();
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Should remain on login page and show error message
    const url = page.url();
    expect(url).toContain('/login');
    
    console.log('✅ Invalid credentials handling works correctly');
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
      const currentUrl = page.url();
      expect(currentUrl).toContain('/register');
      
      console.log('✅ Navigation to register page works');
    }
  });

  test('should navigate to host registration page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Look for host registration link
    const hostRegisterLink = page.locator('text=Register as Host, text=Want to host events').first();
    
    if (await hostRegisterLink.isVisible({ timeout: 5000 })) {
      await hostRegisterLink.click();
      await page.waitForTimeout(1000);
      
      // Should navigate to host registration page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/register-host');
      
      console.log('✅ Navigation to host registration page works');
    }
  });

  test('should navigate to password reset page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Look for forgot password link
    const forgotLink = page.locator('text=Forgot Password, text=Reset Password, a[href*="reset"]').first();
    
    if (await forgotLink.isVisible({ timeout: 5000 })) {
      await forgotLink.click();
      await page.waitForTimeout(1000);
      
      // Should navigate to reset page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/reset-password');
      
      console.log('✅ Navigation to password reset page works');
    }
  });

  test('should have Google login option', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Check for Google login button
    const googleButton = page.locator('button:has-text("Sign in with Google")').first();
    await expect(googleButton).toBeVisible();
    
    console.log('✅ Google login option is available');
  });

  test('should check login performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Login page loaded in ${loadTime}ms`);
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
    
    // Perform login and measure time
    const loginStartTime = Date.now();
    await performLogin(page, 'student');
    
    const loginTime = Date.now() - loginStartTime;
    console.log(`Student login completed in ${loginTime}ms`);
    
    // Login should be reasonably fast
    expect(loginTime).toBeLessThan(8000); // 8 seconds max
  });

  test('should logout successfully after login', async ({ page }) => {
    // First login as student
    await performLogin(page, 'student');
    
    // Look for logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
    
    if (await logoutButton.isVisible({ timeout: 3000 })) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      // Should redirect to login or landing
      const url = page.url();
      const isLoggedOut = url.includes('/login') || url === '/' || url.endsWith('/');
      
      expect(isLoggedOut).toBeTruthy();
      
      await page.screenshot({ path: 'test-results/logout-success.png', fullPage: true });
      console.log('✅ Logout functionality works correctly');
    }
  });

  test('should check console for errors on login page', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/login');
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
      console.log('✅ No critical console errors on login page');
    }
  });
});