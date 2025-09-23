# Environment Setup Instructions

## Quick Fix for Current Issues

### 1. Create Environment File
Create a file named `.env` in the `server` directory with the following content:

```env
# Database
MONGO_URI=mongodb://localhost:27017/student_event_db

# JWT Secret (change this in production)
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production

# Client Origin (for CORS)
CLIENT_ORIGIN=http://localhost:3000

# Google OAuth (optional - leave empty if not using Google login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth Redirect URI
OAUTH_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
CLIENT_OAUTH_CALLBACK=http://localhost:3000/oauth-callback

# Email Configuration (optional - for password reset emails)
EMAIL_USER=
EMAIL_PASS=

# Server Port
PORT=5000
```

### 2. Restart Your Server
After creating the `.env` file, restart your server to apply the changes.

### 3. Google OAuth Setup (Optional)
If you want to use Google login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:5000/api/auth/google/callback` to authorized redirect URIs
6. Copy Client ID and Client Secret to your `.env` file

### 4. Current Status
- ✅ CORS issue fixed (allows ports 3000-3009)
- ✅ AdminPanel `fetchHostApplications` function added
- ✅ Google OAuth error handling improved
- ⚠️ Google OAuth requires credentials to be configured

### 5. Test the Application
1. Start your server: `npm run start --prefix server`
2. Start your client: `npm run start --prefix client`
3. Try host registration - it should work now
4. Admin panel should load without errors
