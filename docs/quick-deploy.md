# Quick Deployment Guide 🚀

## Step-by-Step Deployment (5 Minutes)

### 1️⃣ Deploy Backend

```bash
# Navigate to server folder
cd server

# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy backend
vercel
```

**Follow the prompts:**
- Project name: `student-events-api`
- Framework: Other
- Accept defaults

**After deployment:**
- Copy the deployment URL (e.g., `https://student-events-api.vercel.app`)

### 2️⃣ Add Backend Environment Variables

Go to: https://vercel.com/dashboard

1. Select your backend project
2. Settings → Environment Variables
3. Add these variables:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FRONTEND_URL=https://your-frontend.vercel.app
```

4. Redeploy from Deployments tab

### 3️⃣ Update Frontend Configuration

Edit `client/.env.production`:

```env
VITE_API_URL=https://student-events-api.vercel.app/api
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### 4️⃣ Deploy Frontend

```bash
# Navigate to client folder
cd client

# Deploy frontend
vercel
```

**Follow the prompts:**
- Project name: `student-events-frontend`
- Framework: Vite
- Build Command: `vite build`
- Output Directory: `dist`

### 5️⃣ Add Frontend Environment Variables

1. Go to frontend project in Vercel
2. Settings → Environment Variables
3. Add:

```env
VITE_API_URL=https://student-events-api.vercel.app/api
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

4. Redeploy

### 6️⃣ Update CORS in Backend

After getting your frontend URL, update backend environment:

```env
FRONTEND_URL=https://your-actual-frontend.vercel.app
```

Redeploy backend.

---

## ✅ Verification Checklist

- [ ] Backend accessible at: `https://student-events-api.vercel.app/api`
- [ ] Frontend accessible at: `https://student-events-frontend.vercel.app`
- [ ] Can login/register
- [ ] Can create events
- [ ] Images upload successfully
- [ ] All features working

---

## 🎉 Done!

Your application is now live on Vercel!

**Share these URLs:**
- Frontend: Your Vercel app URL
- API: Your backend URL

---

## 🆘 Need Help?

See the full guide: `VERCEL_DEPLOYMENT_GUIDE.md`
