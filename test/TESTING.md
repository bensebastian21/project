# Playwright Testing Guide

## Overview
This project uses Playwright for end-to-end testing. The test suite covers the student onboarding flow and authentication.

## Setup
Playwright is already installed. If you need to reinstall:
```bash
npm install -D @playwright/test
npx playwright install chromium
```

## Running Tests

### Run all tests (headless mode)
```bash
npm test
```

### Run tests with browser visible
```bash
npm run test:headed
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### View test report
```bash
npm run test:report
```

### Run specific test file
```bash
npx playwright test tests/student-onboarding.spec.js
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

## Test Coverage

### Student Onboarding Tests (`tests/student-onboarding.spec.js`)
- ✅ Complete onboarding flow with all required fields
- ✅ Validation errors for missing required fields
- ✅ On-focus validation
- ✅ Navigation between steps
- ✅ Job roles filtering based on selected sectors
- ✅ Progress bar updates
- ✅ Hobbies input with comma-separated values

### Authentication Tests (`tests/auth.spec.js`)
- ✅ Display login page
- ✅ Validation for empty login fields
- ✅ Navigation to register page

## Test Structure

```
Project/
├── playwright.config.js       # Playwright configuration
├── tests/
│   ├── student-onboarding.spec.js
│   └── auth.spec.js
└── playwright-report/         # Generated after test runs
```

## Configuration

The tests are configured to:
- Run against `http://localhost:3000`
- Automatically start the dev server before tests
- Take screenshots on failure
- Generate HTML reports
- Use Chromium browser

## Before Running Tests

1. **Ensure the backend server is running:**
   ```bash
   cd server
   npm start
   ```

2. **The frontend will be started automatically by Playwright**

## Troubleshooting

### Port already in use
If port 3000 is already in use, Playwright will reuse the existing server.

### Tests timing out
Increase timeout in `playwright.config.js`:
```javascript
use: {
  timeout: 60000, // 60 seconds
}
```

### Browser not launching
Reinstall browsers:
```bash
npx playwright install --force
```

## Writing New Tests

Create a new test file in the `tests/` directory:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    // Your test code here
  });
});
```

## CI/CD Integration

To run tests in CI:
```bash
CI=true npm test
```

This will:
- Run tests with 2 retries
- Use a single worker
- Generate reports suitable for CI

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
