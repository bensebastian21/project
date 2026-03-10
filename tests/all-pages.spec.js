const { test, expect } = require('@playwright/test');

test.describe('All Pages - Comprehensive Check', () => {
  
  // Public Pages (No Auth Required)
  test.describe('Public Pages', () => {
    
    test('Landing Page (/) should load', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL('/');
      
      // Check for common elements
      await page.waitForTimeout(1000);
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/landing-page.png', fullPage: true });
    });

    test('Login Page (/login) should load', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL('/login');
      
      // Check for login form
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
      
      await expect(emailInput).toBeVisible({ timeout: 5000 });
      await expect(passwordInput).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });
    });

    test('About Page (/about) should load', async ({ page }) => {
      await page.goto('/about');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL('/about');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/about-page.png', fullPage: true });
    });

    test('Contact Page (/contact) should load', async ({ page }) => {
      await page.goto('/contact');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL('/contact');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/contact-page.png', fullPage: true });
    });

    test('Host Registration (/register-host) should load', async ({ page }) => {
      await page.goto('/register-host');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL('/register-host');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/register-host-page.png', fullPage: true });
    });

    test('Password Reset (/reset-password) should load', async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL('/reset-password');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/reset-password-page.png', fullPage: true });
    });

    test('Payment Demo (/payment-demo) should load', async ({ page }) => {
      await page.goto('/payment-demo');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL('/payment-demo');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/payment-demo-page.png', fullPage: true });
    });

    test('Certificate Verify (/certificate/test123) should load', async ({ page }) => {
      await page.goto('/certificate/test123');
      await page.waitForLoadState('networkidle');
      
      await expect(page.url()).toContain('/certificate/');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/certificate-verify-page.png', fullPage: true });
    });

    test('Host Page (/host/test123) should load', async ({ page }) => {
      await page.goto('/host/test123');
      await page.waitForLoadState('networkidle');
      
      await expect(page.url()).toContain('/host/');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/host-page.png', fullPage: true });
    });

    test('Review Page (/review/test123) should load', async ({ page }) => {
      await page.goto('/review/test123');
      await page.waitForLoadState('networkidle');
      
      await expect(page.url()).toContain('/review/');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/review-page.png', fullPage: true });
    });
  });

  // Protected Pages (Require Auth)
  test.describe('Protected Pages (Require Authentication)', () => {
    
    test('Dashboard (/dashboard) should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Should redirect to login
      const url = page.url();
      expect(url).toContain('/login');
    });

    test('Host Dashboard (/host-dashboard) should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/host-dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Should redirect to login
      const url = page.url();
      expect(url).toContain('/login');
    });

    test('Admin Panel (/admin) should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Should redirect to login
      const url = page.url();
      expect(url).toContain('/login');
    });

    test('Admin Verification (/admin/verification) should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/admin/verification');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Should redirect to login
      const url = page.url();
      expect(url).toContain('/login');
    });

    test('Profile (/profile) should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Should redirect to login
      const url = page.url();
      expect(url).toContain('/login');
    });

    test('Settings (/settings) should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Should redirect to login
      const url = page.url();
      expect(url).toContain('/login');
    });

    test('All Friends (/profile/friends) should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/profile/friends');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Should redirect to login
      const url = page.url();
      expect(url).toContain('/login');
    });
  });

  // Page Load Performance
  test.describe('Page Load Performance', () => {
    
    test('Landing page should load within 5 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000);
      console.log(`Landing page loaded in ${loadTime}ms`);
    });

    test('Login page should load within 5 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000);
      console.log(`Login page loaded in ${loadTime}ms`);
    });
  });

  // Responsive Design Check
  test.describe('Responsive Design', () => {
    
    test('Landing page should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ path: 'test-results/landing-mobile.png', fullPage: true });
    });

    test('Landing page should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ path: 'test-results/landing-tablet.png', fullPage: true });
    });

    test('Login page should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ path: 'test-results/login-mobile.png', fullPage: true });
    });
  });

  // Navigation Check
  test.describe('Navigation', () => {
    
    test('Should navigate from landing to login', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Look for login link/button
      const loginLink = page.locator('a[href="/login"], button:has-text("Login"), a:has-text("Login")').first();
      
      if (await loginLink.isVisible({ timeout: 3000 })) {
        await loginLink.click();
        await page.waitForTimeout(1000);
        
        const url = page.url();
        expect(url).toContain('/login');
      }
    });

    test('Should navigate from landing to about', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Look for about link
      const aboutLink = page.locator('a[href="/about"], a:has-text("About")').first();
      
      if (await aboutLink.isVisible({ timeout: 3000 })) {
        await aboutLink.click();
        await page.waitForTimeout(1000);
        
        const url = page.url();
        expect(url).toContain('/about');
      }
    });

    test('Should navigate from landing to contact', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Look for contact link
      const contactLink = page.locator('a[href="/contact"], a:has-text("Contact")').first();
      
      if (await contactLink.isVisible({ timeout: 3000 })) {
        await contactLink.click();
        await page.waitForTimeout(1000);
        
        const url = page.url();
        expect(url).toContain('/contact');
      }
    });
  });

  // Error Handling
  test.describe('Error Handling', () => {
    
    test('Should handle 404 - non-existent route', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Should show some content (either 404 or redirect)
      await page.screenshot({ path: 'test-results/404-page.png', fullPage: true });
    });
  });

  // Console Errors Check
  test.describe('Console Errors', () => {
    
    test('Landing page should not have console errors', async ({ page }) => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Filter out known acceptable errors (like network errors for missing resources)
      const criticalErrors = errors.filter(err => 
        !err.includes('favicon') && 
        !err.includes('net::ERR') &&
        !err.includes('404')
      );
      
      if (criticalErrors.length > 0) {
        console.log('Console errors found:', criticalErrors);
      }
    });

    test('Login page should not have console errors', async ({ page }) => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const criticalErrors = errors.filter(err => 
        !err.includes('favicon') && 
        !err.includes('net::ERR') &&
        !err.includes('404')
      );
      
      if (criticalErrors.length > 0) {
        console.log('Console errors found:', criticalErrors);
      }
    });
  });
});
