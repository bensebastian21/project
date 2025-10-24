@echo off
echo 🚀 Starting deployment preparation...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

echo ✅ Found project root directory

REM Create necessary directories
echo 📁 Creating deployment directories...
if not exist "server\api" mkdir "server\api"
if not exist "client\build" mkdir "client\build"

REM Check if required files exist
echo 🔍 Checking required files...

if exist "vercel.json" (
    echo ✅ vercel.json exists
) else (
    echo ❌ vercel.json is missing
)

if exist "render.yaml" (
    echo ✅ render.yaml exists
) else (
    echo ❌ render.yaml is missing
)

if exist "client\Dockerfile" (
    echo ✅ client\Dockerfile exists
) else (
    echo ❌ client\Dockerfile is missing
)

if exist "docker-compose.yml" (
    echo ✅ docker-compose.yml exists
) else (
    echo ❌ docker-compose.yml is missing
)

if exist "ENVIRONMENT_VARIABLES.md" (
    echo ✅ ENVIRONMENT_VARIABLES.md exists
) else (
    echo ❌ ENVIRONMENT_VARIABLES.md is missing
)

if exist "DEPLOYMENT_GUIDE.md" (
    echo ✅ DEPLOYMENT_GUIDE.md exists
) else (
    echo ❌ DEPLOYMENT_GUIDE.md is missing
)

echo.
echo 📋 Next Steps:
echo 1. Set up MongoDB Atlas database
echo 2. Configure Google OAuth credentials
echo 3. Set up Twilio account (optional)
echo 4. Configure email settings (optional)
echo 5. Follow DEPLOYMENT_GUIDE.md for detailed instructions
echo.
echo 🔗 Important URLs to configure:
echo - MongoDB Atlas: https://mongodb.com/atlas
echo - Google Cloud Console: https://console.cloud.google.com
echo - Vercel: https://vercel.com
echo - Render: https://render.com
echo.
echo 📖 Read ENVIRONMENT_VARIABLES.md for all required environment variables
echo 📖 Read DEPLOYMENT_GUIDE.md for step-by-step deployment instructions
echo.
echo 🎉 Deployment preparation complete!
pause
