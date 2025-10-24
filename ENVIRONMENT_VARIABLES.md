# Environment Variables for Production Deployment

## Backend (Vercel) Environment Variables
# Add these in your Vercel dashboard under Project Settings > Environment Variables

# Database (use MONGODB_URI - this is the standard name)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/student-events?retryWrites=true&w=majority

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

# Client Origin (your Render frontend URL)
CLIENT_ORIGIN=https://your-app-name.onrender.com

# Google Generative AI
GOOGLE_API_KEY=your-google-ai-api-key

## Frontend (Render) Environment Variables
# Add these in your Render dashboard under Environment Variables

# API Base URL (your Vercel backend URL)
REACT_APP_API_BASE_URL=https://your-backend-name.vercel.app

# OAuth Start URL
REACT_APP_OAUTH_START_URL=https://your-backend-name.vercel.app/api/auth/google

# Firebase Configuration (if using Firebase)
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
