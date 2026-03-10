# Environment Variables for Production Deployment

## Backend (Vercel) Environment Variables
# Add these in your Vercel dashboard under Project Settings > Environment Variables

# Database (use MONGODB_URI - this is the standard name)
MONGODB_URI=mongodb+srv://admin:admin123@cluster0.nrc9jz.mongodb.net/student_event_db?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Email Configuration (Nodemailer)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Client Origin (your Vercel frontend URL)
CLIENT_ORIGIN=https://evenite21.vercel.app

# Google Generative AI
GOOGLE_API_KEY=your-google-ai-api-key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

## Frontend (Render) Environment Variables
# Add these in your Render dashboard under Environment Variables

# API Base URL (your Vercel backend URL)
REACT_APP_API_BASE_URL=https://evenite-qg1y9k3gj-bensebastian21s-projects.vercel.app/api

# OAuth Start URL
REACT_APP_OAUTH_START_URL=https://evenite-qg1y9k3gj-bensebastian21s-projects.vercel.app/api/auth/google

# Cloudinary Configuration
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your-cloudinary-upload-preset

# Firebase Configuration (if using Firebase)
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
