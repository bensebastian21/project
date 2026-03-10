@echo off
REM Login Functionality Test Runner Script
REM This script runs the Playwright login tests for the Evenite application

echo ========================================
echo Evenite Login Functionality Test Runner
echo ========================================

REM Navigate to project directory
cd /d "d:\ben\Project"

echo.
echo Running login functionality tests...
echo.

REM Run the login tests with Playwright
npx playwright test tests/login-functionality.spec.js

echo.
echo Test execution completed.
echo.

REM Check if test-results directory exists
if exist "test-results" (
    echo Screenshots and test artifacts are available in the test-results directory
) else (
    echo No test-results directory found
)

echo.
echo For detailed test results, check the HTML report:
echo npx playwright show-report
echo.

pause