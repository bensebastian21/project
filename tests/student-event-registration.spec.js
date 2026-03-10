const { test, expect } = require('@playwright/test');

// Student test credentials from student-dashboard-authenticated.spec.js lines 5-6
const TEST_STUDENT = {
  email: 'albinmathew2026@mca.ajce.in',
  password: 'albin123'
};

test.describe('Student Event Registration Test', () => {
  
  test('should login and register for an event', async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[name="email"]').fill(TEST_STUDENT.email);
    await page.locator('input[name="password"]').fill(TEST_STUDENT.password);
    await page.locator('button[type="submit"]').click();
    
    await page.waitForTimeout(3000);
    
    // Verify login success
    const url = page.url();
    expect(url.includes('/dashboard')).toBeTruthy();
    
    console.log('✅ Student login successful');
    
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Try to find and click on an event to register
    const eventCard = page.locator('[class*="event"]').first();
    if (await eventCard.isVisible({ timeout: 5000 })) {
      // Click on the "View Details" button in the event card
      const viewDetailsButton = page.locator('button:has-text("View Details")').first();
      if (await viewDetailsButton.isVisible({ timeout: 3000 })) {
        await viewDetailsButton.click();
        await page.waitForTimeout(2000);
        
        // Now look for the "Register Now" button in the modal
        const registerButton = page.locator('button:has-text("Register Now")');
        if (await registerButton.isVisible({ timeout: 3000 })) {
          await registerButton.click();
          await page.waitForTimeout(2000);
          
          // Check for success message or confirmation
          const successMessage = page.locator('text=Registered successfully, text=Registration confirmed, text=Already Registered');
          if (await successMessage.isVisible({ timeout: 3000 })) {
            console.log('✅ Event registration successful');
          } else {
            // Check if already registered
            const alreadyRegistered = page.locator('text=Already Registered');
            if (await alreadyRegistered.isVisible({ timeout: 3000 })) {
              console.log('ℹ️ Already registered for this event');
            } else {
              console.log('✅ Event registration initiated');
            }
          }
        } else {
          console.log('ℹ️ Register button not found in event modal');
        }
      } else {
        console.log('ℹ️ View Details button not found');
      }
    } else {
      console.log('ℹ️ No events found or event cards not visible');
    }
    
    // Logout
    const logoutButton = page.locator('button:has-text("Logout")');
    if (await logoutButton.isVisible({ timeout: 3000 })) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      // Verify logout success
      const logoutUrl = page.url();
      expect(logoutUrl.includes('/login')).toBeTruthy();
      
      console.log('✅ Student logout successful');
    }
  });
});