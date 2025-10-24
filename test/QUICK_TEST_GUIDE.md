# Quick Test Guide 🚀

## Run Tests

```bash
# Run all tests (headless)
npm test

# Run with visible browser
npm run test:headed

# Interactive UI mode
npm run test:ui

# View last report
npm run test:report
```

## Current Status

✅ **9 tests passing**  
⏭️ **7 tests skipped** (need authenticated user)  
❌ **0 tests failing**  

## Test Files

- `tests/auth.spec.js` - Authentication flows (8 tests, all passing)
- `tests/student-onboarding.spec.js` - Onboarding flow (8 tests, 1 passing, 7 skipped)

## Quick Commands

```bash
# Run specific file
npx playwright test tests/auth.spec.js

# Run specific test
npx playwright test -g "should navigate to login"

# Debug mode
npx playwright test --debug

# Generate new selectors
npx playwright codegen http://localhost:3000
```

## What's Tested

✅ Landing page  
✅ Login page & form  
✅ Form validation  
✅ Register navigation  
✅ Password reset  
✅ About page  
✅ Contact page  

## What's Ready (Needs Auth)

⏭️ Complete onboarding flow  
⏭️ Multi-step navigation  
⏭️ Form validation (on-focus)  
⏭️ Job roles filtering  
⏭️ Progress tracking  
⏭️ Data persistence  
⏭️ Comma-separated inputs  

## Enable Onboarding Tests

1. Create test student account:
   ```javascript
   {
     email: "teststudent@example.com",
     password: "password123",
     role: "student",
     onboardingCompleted: false,
     isStudentIdVerified: true
   }
   ```

2. Remove `test.skip()` from onboarding tests

3. Add login in `beforeEach`:
   ```javascript
   test.beforeEach(async ({ page }) => {
     await page.goto('/login');
     await page.fill('input[name="email"]', 'teststudent@example.com');
     await page.fill('input[name="password"]', 'password123');
     await page.click('button[type="submit"]');
     await page.waitForURL('/dashboard');
   });
   ```

## View Results

```bash
# Open HTML report
npx playwright show-report

# Report location
playwright-report/index.html
```

## Troubleshooting

**Port in use?** Playwright reuses existing server on port 3000.

**Tests timeout?** Increase timeout in `playwright.config.js`:
```javascript
use: { timeout: 60000 }
```

**Browser issues?** Reinstall:
```bash
npx playwright install --force
```

## Documentation

- `TESTING.md` - Complete testing guide
- `TEST_SUCCESS_SUMMARY.md` - Detailed results
- `TEST_RESULTS.md` - Historical results

## Success! 🎉

All runnable tests passing. Zero failures. Ready for CI/CD.
