# Deployment Guide: Backend on Vercel + Frontend on Render

## Prerequisites
- GitHub repository with your code
- MongoDB Atlas account (for database)
- Vercel account
- Render account
- Domain name (optional)

## Step 1: Prepare Your Repository

### 1.1 Update package.json scripts
The server/package.json has been updated with proper start script for production.

### 1.2 Environment Variables
Create a `.env` file locally with your environment variables (see ENVIRONMENT_VARIABLES.md for reference).

## Step 2: Deploy Backend to Vercel

### 2.1 Connect Repository to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Select the root directory (not the server folder)

### 2.2 Configure Vercel Settings
1. **Framework Preset**: Other
2. **Root Directory**: Leave as root
3. **Build Command**: Leave empty (Vercel will auto-detect)
4. **Output Directory**: Leave empty
5. **Install Command**: Leave empty

### 2.3 Set Environment Variables
In Vercel dashboard, go to Project Settings > Environment Variables and add:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/student-events
JWT_SECRET=your-super-secret-jwt-key-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CLIENT_ORIGIN=https://your-app-name.onrender.com
GOOGLE_API_KEY=your-google-ai-api-key
```

### 2.4 Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Note your Vercel URL (e.g., `https://your-backend-name.vercel.app`)

## Step 3: Deploy Frontend to Render

### 3.1 Connect Repository to Render
1. Go to [render.com](https://render.com) and sign in
2. Click "New +" > "Web Service"
3. Connect your GitHub repository
4. Select your repository

### 3.2 Configure Render Settings
1. **Name**: your-app-name (this will be your URL)
2. **Environment**: Static Site
3. **Build Command**: `cd client && npm install && npm run build`
4. **Publish Directory**: `client/build`
5. **Node Version**: 18

### 3.3 Set Environment Variables
In Render dashboard, go to Environment and add:

```
REACT_APP_API_BASE_URL=https://your-backend-name.vercel.app
REACT_APP_OAUTH_START_URL=https://your-backend-name.vercel.app/api/auth/google
```

### 3.4 Deploy
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Note your Render URL (e.g., `https://your-app-name.onrender.com`)

## Step 4: Update Backend CORS Settings

### 4.1 Update Vercel Environment Variables
Go back to Vercel and update the `CLIENT_ORIGIN` environment variable with your actual Render URL:

```
CLIENT_ORIGIN=https://your-app-name.onrender.com
```

### 4.2 Redeploy Backend
Trigger a new deployment in Vercel to apply the CORS changes.

## Step 5: Configure MongoDB Atlas

### 5.1 Create MongoDB Atlas Cluster
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a new cluster
3. Choose a free tier (M0)
4. Set up database access (username/password)
5. Configure network access (allow all IPs: 0.0.0.0/0)

### 5.2 Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your actual password
5. Update `MONGODB_URI` in Vercel with this string

## Step 6: Configure OAuth (Google)

### 6.1 Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client IDs

### 6.2 Configure OAuth Redirect URIs
Add these authorized redirect URIs:
- `https://your-backend-name.vercel.app/api/auth/google/callback`
- `http://localhost:5000/api/auth/google/callback` (for local development)

### 6.3 Update Environment Variables
Update these in Vercel:
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 7: Configure Email (Optional)

### 7.1 Gmail App Password
1. Enable 2-factor authentication on Gmail
2. Generate an app password
3. Use this password in `EMAIL_PASS` environment variable

### 7.2 Update Environment Variables
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Step 8: Configure SMS (Optional)

### 8.1 Twilio Setup
1. Sign up at [twilio.com](https://twilio.com)
2. Get your Account SID and Auth Token
3. Purchase a phone number

### 8.2 Update Environment Variables
```
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Step 9: Test Your Deployment

### 9.1 Test Backend
1. Visit `https://your-backend-name.vercel.app/api/health`
2. Should return: `{"status":"OK","timestamp":"..."}`

### 9.2 Test Frontend
1. Visit your Render URL
2. Try logging in with Google OAuth
3. Test basic functionality

## Step 10: Custom Domain (Optional)

### 10.1 Vercel Custom Domain
1. Go to Vercel project settings
2. Add your domain
3. Update DNS records as instructed

### 10.2 Render Custom Domain
1. Go to Render service settings
2. Add your domain
3. Update DNS records as instructed

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure `CLIENT_ORIGIN` in Vercel matches your Render URL exactly
2. **Database Connection**: Check MongoDB Atlas network access and connection string
3. **OAuth Issues**: Verify redirect URIs in Google Cloud Console
4. **Build Failures**: Check Node.js version compatibility
5. **Environment Variables**: Ensure all required variables are set in both platforms

### Debugging:
- Check Vercel function logs in the dashboard
- Check Render build logs
- Use browser developer tools for frontend issues
- Test API endpoints directly with tools like Postman

## Security Notes:
- Never commit `.env` files to Git
- Use strong, unique passwords
- Regularly rotate API keys
- Monitor usage and costs
- Set up proper CORS policies
- Use HTTPS everywhere

## Cost Optimization:
- Use free tiers where possible
- Monitor usage on both platforms
- Set up billing alerts
- Consider upgrading only when necessary

Your application should now be live and accessible!
