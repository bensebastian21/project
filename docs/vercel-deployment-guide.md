# Vercel Deployment Guide 🚀

Complete guide for deploying your Student Event Management Platform on Vercel.

## 📋 Prerequisites

- Vercel account (sign up at [vercel.com](https://vercel.com))
- GitHub repository with your code
- MongoDB Atlas account (for database)
- Cloudinary account (for images)

---

## 🎯 Deployment Strategy

We'll use **separate deployments** for frontend and backend:
- **Backend:** Deployed as Vercel Serverless Functions
- **Frontend:** Deployed as Static Site with React

---

## 🔧 Part 1: Backend Deployment

### Step 1: Prepare Backend

✅ **Already Created:** `server/vercel.json`

### Step 2: Environment Variables

Create a `.env` file in `server/` folder (for local dev):

```env
# MongoDB
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (if using)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Twilio (if using SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone

# Google AI (if using)
GOOGLE_API_KEY=your_google_api_key

# Frontend URL (CORS)
FRONTEND_URL=https://your-frontend.vercel.app
```

### Step 3: Deploy Backend to Vercel

#### Option A: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to server folder
cd server

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set project name (e.g., "student-events-api")
# - Confirm settings
```

#### Option B: Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. **Root Directory:** Set to `server`
4. **Framework Preset:** Other
5. **Build Command:** Leave empty
6. **Output Directory:** Leave empty
7. Click **"Deploy"**

### Step 4: Add Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Add all variables from `.env` file:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `EMAIL_USER`
   - `EMAIL_PASS`
   - `TWILIO_ACCOUNT_SID` (if using)
   - `TWILIO_AUTH_TOKEN` (if using)
   - `TWILIO_PHONE_NUMBER` (if using)
   - `GOOGLE_API_KEY` (if using)
   - `FRONTEND_URL`

4. Click **Save**
5. Redeploy for changes to take effect

### Step 5: Note Your Backend URL

Your backend will be available at:
```
https://student-events-api.vercel.app
```

Or your custom domain if configured.

---

## 🎨 Part 2: Frontend Deployment

### Step 1: Update Frontend Configuration

Update `client/src/config.js`:

```javascript
const config = {
  // Use environment variable in production, fallback to local in dev
  apiBaseUrl: import.meta.env.VITE_API_URL || 
              (import.meta.env.MODE === 'production' 
                ? 'https://student-events-api.vercel.app/api' 
                : 'http://localhost:5000/api'),
};

export default config;
```

### Step 2: Create `.env.production` in `client/` folder

```env
VITE_API_URL=https://student-events-api.vercel.app/api

# Cloudinary (Frontend)
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### Step 3: Update `client/package.json` Scripts

Ensure you have:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Step 4: Create `vercel.json` in `client/` folder

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Step 5: Deploy Frontend to Vercel

#### Option A: Via Vercel CLI

```bash
# Navigate to client folder
cd client

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set project name (e.g., "student-events-frontend")
# - Framework: Vite
# - Build Command: npm run build (or vite build)
# - Output Directory: dist
# - Confirm settings
```

#### Option B: Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. **Root Directory:** Set to `client`
4. **Framework Preset:** Vite
5. **Build Command:** `npm run build` or `vite build`
6. **Output Directory:** `dist`
7. **Install Command:** `npm install`
8. Click **"Deploy"**

### Step 6: Add Frontend Environment Variables

1. Go to frontend project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Add:
   - `VITE_API_URL` = `https://student-events-api.vercel.app/api`
   - `REACT_APP_CLOUDINARY_CLOUD_NAME`
   - `REACT_APP_CLOUDINARY_UPLOAD_PRESET`
4. Click **Save**
5. Redeploy

---

## 🔐 Part 3: CORS Configuration

### Update Backend CORS Settings

In `server/index.js`, update CORS configuration:

```javascript
const cors = require('cors');

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-frontend.vercel.app', // Replace with your actual frontend URL
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

---

## 🗄️ Part 4: Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Cluster

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist IP: `0.0.0.0/0` (allows all IPs - for Vercel)

### Step 2: Get Connection String

1. Click **Connect**
2. Choose **Connect your application**
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Add database name: `mongodb+srv://user:pass@cluster.mongodb.net/student-events`

### Step 3: Add to Vercel

Add `MONGODB_URI` environment variable in backend Vercel project.

---

## ✅ Deployment Checklist

### Backend Checklist:
- [ ] `vercel.json` created in `server/`
- [ ] All environment variables added in Vercel
- [ ] MongoDB Atlas connection string configured
- [ ] Cloudinary credentials added
- [ ] Backend deployed successfully
- [ ] API endpoints accessible

### Frontend Checklist:
- [ ] `config.js` updated with production API URL
- [ ] `.env.production` created with variables
- [ ] `vercel.json` created in `client/`
- [ ] Build command set to `vite build`
- [ ] Output directory set to `dist`
- [ ] Environment variables added in Vercel
- [ ] Frontend deployed successfully
- [ ] Can access the site

### Integration Checklist:
- [ ] CORS configured correctly
- [ ] Frontend can call backend API
- [ ] Login/Register works
- [ ] Image upload works (Cloudinary)
- [ ] Database operations work
- [ ] All features functional

---

## 🚨 Common Issues & Solutions

### Issue 1: 404 on Page Refresh

**Solution:** Ensure `vercel.json` with rewrites is in `client/` folder.

### Issue 2: CORS Errors

**Solution:** 
1. Check CORS origin in backend includes your frontend URL
2. Add `FRONTEND_URL` environment variable in backend
3. Redeploy backend

### Issue 3: Environment Variables Not Working

**Solution:**
1. Ensure all variables are added in Vercel Dashboard
2. Redeploy after adding variables
3. Check variable names match exactly

### Issue 4: Build Fails

**Solution:**
1. Check build logs in Vercel
2. Ensure all dependencies are in `package.json`
3. Test build locally: `npm run build`

### Issue 5: API Calls Failing

**Solution:**
1. Verify API URL in frontend config
2. Check backend is deployed and running
3. Test API endpoint directly in browser
4. Check network tab for errors

### Issue 6: Images Not Uploading

**Solution:**
1. Verify Cloudinary credentials
2. Check upload preset is unsigned
3. Ensure CORS is configured in Cloudinary dashboard

---

## 📊 Monitoring & Logs

### View Logs:

**Backend Logs:**
```bash
vercel logs [deployment-url]
```

**Frontend Logs:**
- Available in Vercel Dashboard → Deployments → Logs

### Real-time Monitoring:

1. Go to Vercel Dashboard
2. Select your project
3. Click **Analytics** for usage stats
4. Click **Deployments** for deployment history

---

## 🔄 Continuous Deployment

### Setup Auto-Deploy from GitHub:

1. Link repository in Vercel
2. Every push to `main` branch auto-deploys
3. Pull requests create preview deployments

### Branch Configuration:

- **Production:** `main` branch
- **Preview:** Other branches (staging, dev)

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain:

1. Go to project **Settings** → **Domains**
2. Add your domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

---

## 📱 Environment-Specific Builds

### Development:
```bash
npm run dev
```

### Production Build (Local Test):
```bash
npm run build
npm run preview
```

### Vercel Deployment:
- Automatic on push to GitHub

---

## 🔑 Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use strong JWT secrets** - Generate with: `openssl rand -base64 32`
3. **Rotate API keys** regularly
4. **Enable Vercel Authentication** for admin routes if needed
5. **Use HTTPS only** (Vercel provides this automatically)
6. **Limit CORS origins** to your actual domains

---

## 💡 Performance Tips

1. **Enable caching** in API responses
2. **Use CDN** for static assets (Cloudinary)
3. **Optimize images** before upload
4. **Enable compression** in Express
5. **Use Vercel Edge Functions** for faster response (optional)

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **MongoDB Atlas Docs:** https://docs.atlas.mongodb.com/
- **Cloudinary Docs:** https://cloudinary.com/documentation
- **Vite Docs:** https://vitejs.dev/guide/

---

## 🎉 Post-Deployment

After successful deployment:

1. **Test all features** on production
2. **Share URLs** with team
3. **Monitor logs** for errors
4. **Set up alerts** in Vercel
5. **Document any custom configurations**

---

## 📝 Quick Reference Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls

# Environment variables
vercel env add
vercel env ls
```

---

## 🔗 Your Deployment URLs

After deployment, you'll have:

**Backend API:**
```
https://student-events-api.vercel.app/api
```

**Frontend:**
```
https://student-events-frontend.vercel.app
```

**Example API Endpoints:**
- `GET /api/events` - Get all events
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

---

## ✨ Success!

Your application is now live on Vercel! 🎊

**Next Steps:**
1. Share with users
2. Gather feedback
3. Monitor performance
4. Iterate and improve

---

*Last Updated: 2025-10-25*
