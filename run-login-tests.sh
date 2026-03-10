#!/bin/bash

# Login Functionality Test Runner Script
# This script runs the Playwright login tests for the Evenite application

echo "========================================"
echo "Evenite Login Functionality Test Runner"
echo "========================================"

# Navigate to project directory
cd "d:\ben\Project" || exit 1

echo ""
echo "Running login functionality tests..."
echo ""

# Run the login tests with Playwright
npx playwright test tests/login-functionality.spec.js

echo ""
echo "Test execution completed."
echo ""

# Check if test-results directory exists
if [ -d "test-results" ]; then
    echo "Screenshots and test artifacts are available in the test-results directory"
else
    echo "No test-results directory found"
fi

echo ""
echo "For detailed test results, check the HTML report:"
echo "npx playwright show-report"
echo ""