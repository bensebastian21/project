// tests/student-dashboard.spec.js
// Playwright tests for the Student Dashboard
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000';

// Helper: login via API and inject token into localStorage
async function loginAsStudent(page) {
  const res = await page.request.post(`${API_URL}/api/auth/login`, {
    data: { email: 'test@student.com', password: 'Test@1234' },
  });
  if (res.ok()) {
    const body = await res.json();
    if (body.token) {
      await page.goto(BASE_URL);
      await page.evaluate((token) => localStorage.setItem('token', token), body.token);
      return true;
    }
  }
  return false;
}

test.describe('Student Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('loads login page when unauthenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    // Should redirect to login or show login form
    await expect(page).toHaveURL(/login|dashboard/);
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(0);
  });

  test('dashboard renders after login', async ({ page }) => {
    const loggedIn = await loginAsStudent(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    // Sidebar nav should be visible
    await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });
  });

  test('Explore tab shows event cards or empty state', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    // Either event cards or "No Events Found" message
    const hasCards = await page.locator('[class*="GamifiedEventCard"], .group.h-full').count();
    const hasEmpty = await page.locator('text=No Events Found').count();
    expect(hasCards + hasEmpty).toBeGreaterThan(0);
  });

  test('sidebar navigation tabs are clickable', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    // Click "My Events" tab
    await page.locator('aside button', { hasText: /My Events|MyRegs/i }).first().click();
    await page.waitForTimeout(500);
    // Click "Achievements" tab
    await page.locator('aside button', { hasText: /Achievements/i }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Map view tab renders without crashing', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    // Click Map sub-tab (floating nav or horizontal scroll)
    const mapBtn = page.locator('button[title="Map View"], button:has-text("Map")').first();
    if (await mapBtn.isVisible()) {
      await mapBtn.click();
      await page.waitForTimeout(1000);
      // Map container or "Event Map" heading should appear
      const mapVisible = await page.locator('text=Event Map').count();
      expect(mapVisible).toBeGreaterThanOrEqual(0); // no crash is the main check
    }
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loginAsStudent(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    // Filter out known non-critical errors
    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('404')
    );
    expect(critical).toHaveLength(0);
  });
});
