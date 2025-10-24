#!/bin/bash

# Quick Deployment Setup Script
# This script helps prepare your project for deployment

echo "🚀 Starting deployment preparation..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Found project root directory"

# Create necessary directories
echo "📁 Creating deployment directories..."
mkdir -p server/api
mkdir -p client/build

# Check if required files exist
echo "🔍 Checking required files..."

required_files=(
    "vercel.json"
    "render.yaml"
    "client/Dockerfile"
    "docker-compose.yml"
    "ENVIRONMENT_VARIABLES.md"
    "DEPLOYMENT_GUIDE.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
    fi
done

# Check if server package.json has correct start script
echo "🔧 Checking server package.json..."
if grep -q '"start": "node index.js"' server/package.json; then
    echo "✅ Server package.json has correct start script"
else
    echo "❌ Server package.json needs start script update"
fi

# Check if client has build script
echo "🔧 Checking client package.json..."
if grep -q '"build": "react-scripts build"' client/package.json; then
    echo "✅ Client package.json has build script"
else
    echo "❌ Client package.json missing build script"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Set up MongoDB Atlas database"
echo "2. Configure Google OAuth credentials"
echo "3. Set up Twilio account (optional)"
echo "4. Configure email settings (optional)"
echo "5. Follow DEPLOYMENT_GUIDE.md for detailed instructions"
echo ""
echo "🔗 Important URLs to configure:"
echo "- MongoDB Atlas: https://mongodb.com/atlas"
echo "- Google Cloud Console: https://console.cloud.google.com"
echo "- Vercel: https://vercel.com"
echo "- Render: https://render.com"
echo ""
echo "📖 Read ENVIRONMENT_VARIABLES.md for all required environment variables"
echo "📖 Read DEPLOYMENT_GUIDE.md for step-by-step deployment instructions"
echo ""
echo "🎉 Deployment preparation complete!"
