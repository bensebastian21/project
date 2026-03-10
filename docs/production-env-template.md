# Production Environment Variables Template
# Copy these values to your Vercel dashboard under Project Settings > Environment Variables

# =============================================================================
# BACKEND ENVIRONMENT VARIABLES (Add to your backend Vercel project)
# =============================================================================

# === Database ===
MONGODB_URI=mongodb+srv://admin:admin123@cluster0.nrc9jz.mongodb.net/student_event_db?retryWrites=true&w=majority&appName=Cluster0

# === Authentication ===
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# === Cloudinary (Image Uploads) ===
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# === Email Service (Optional) ===
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# === Twilio SMS (Optional) ===
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# === Google AI (Optional) ===
GOOGLE_API_KEY=your-google-api-key

# === Google OAuth ===
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# === CORS ===
CLIENT_ORIGIN=https://evenite21.vercel.app

# === Server Config ===
NODE_ENV=production
PORT=5000

# =============================================================================
# FRONTEND ENVIRONMENT VARIABLES (Add to your frontend Vercel project)
# =============================================================================

# API Configuration
REACT_APP_API_BASE_URL=https://evenite-ptz45k449-bensebastian21s-projects.vercel.app/api
REACT_APP_OAUTH_START_URL=https://evenite-ptz45k449-bensebastian21s-projects.vercel.app/api/auth/google

# Cloudinary (Frontend)
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset

# =============================================================================
# DEPLOYMENT INSTRUCTIONS
# =============================================================================

# 1. BACKEND SETUP (Vercel):
#    - Go to your backend project dashboard on Vercel
#    - Navigate to Settings > Environment Variables
#    - Add all the backend variables above (MONGODB_URI, JWT_SECRET, etc.)
#    - Make sure CLIENT_ORIGIN=https://evenite21.vercel.app

# 2. FRONTEND SETUP (Vercel):
#    - Go to your frontend project dashboard on Vercel
#    - Navigate to Settings > Environment Variables
#    - Add all the frontend variables above (REACT_APP_API_BASE_URL, etc.)
#    - Make sure REACT_APP_API_BASE_URL points to your backend URL

# 3. CORS CONFIGURATION:
#    - Your vercel.json already has CORS headers configured
#    - Access-Control-Allow-Origin is set to https://evenite21.vercel.app
#    - This matches your frontend URL

# 4. DEPLOYMENT:
#    - After adding environment variables, redeploy both projects
#    - Backend: vercel --prod (from your project root)
#    - Frontend: vercel --prod (from your frontend project)

# =============================================================================
# IMPORTANT NOTES
# =============================================================================

# - Replace all placeholder values (your-*) with actual values
# - Never commit this file to version control
# - Environment variables only take effect after redeployment
# - Test the connection after deployment
# - Check browser console for any CORS errors
