# Environment Variables Template

This file contains all environment variables needed for deployment.
Copy these to your Vercel dashboard under Settings → Environment Variables.

## 🔧 Backend Environment Variables (Server)

Add these to your backend project in Vercel:

```env
# === Database ===
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/student-events?retryWrites=true&w=majority

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

# === CORS ===
FRONTEND_URL=https://your-frontend.vercel.app

# === Server Config ===
NODE_ENV=production
PORT=5000
```

---

## 🎨 Frontend Environment Variables (Client)

Add these to your frontend project in Vercel:

```env
# === API Configuration ===
VITE_API_URL=https://your-backend.vercel.app/api

# === Cloudinary (Frontend) ===
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset
```

---

## 📝 How to Get These Values

### 1. MongoDB URI
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `student-events`

### 2. JWT Secret
Generate a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Or use: https://randomkeygen.com/

### 3. Cloudinary Credentials
1. Go to https://cloudinary.com/
2. Sign up for free account
3. Dashboard shows:
   - Cloud Name
   - API Key
   - API Secret
4. Create upload preset:
   - Settings → Upload → Upload presets
   - Add upload preset (unsigned)
   - Copy preset name

### 4. Email Credentials (Gmail)
1. Use your Gmail account
2. Enable 2-Factor Authentication
3. Generate App Password:
   - Google Account → Security → App Passwords
   - Select "Mail" and your device
   - Copy the 16-character password

### 5. Twilio Credentials (Optional)
1. Go to https://www.twilio.com/
2. Sign up for free account
3. Dashboard shows:
   - Account SID
   - Auth Token
4. Get a phone number from console

### 6. Google AI API Key (Optional)
1. Go to https://makersuite.google.com/app/apikey
2. Create API key
3. Copy the key

---

## 🔐 Security Best Practices

1. **Never commit these to Git**
   - Add `.env` to `.gitignore`
   - Only store in Vercel dashboard

2. **Use strong secrets**
   - JWT_SECRET: minimum 32 characters
   - Use random generation tools

3. **Rotate keys regularly**
   - Change JWT_SECRET every 3-6 months
   - Regenerate API keys annually

4. **Limit CORS origins**
   - Only allow your actual frontend domains
   - Don't use wildcards in production

5. **Use environment-specific values**
   - Different values for development/production
   - Separate Cloudinary folders per environment

---

## 📋 Verification Checklist

Before deploying, ensure you have:

### Backend:
- [ ] MongoDB URI (valid connection string)
- [ ] JWT Secret (minimum 32 chars)
- [ ] Cloudinary credentials (3 values)
- [ ] Frontend URL (for CORS)
- [ ] Email credentials (if using email features)
- [ ] Twilio credentials (if using SMS features)

### Frontend:
- [ ] API URL (your backend Vercel URL)
- [ ] Cloudinary cloud name
- [ ] Cloudinary upload preset (unsigned)

---

## 🚨 Common Mistakes

❌ **Don't:**
- Commit `.env` files to Git
- Use development URLs in production
- Share API keys publicly
- Use weak JWT secrets
- Forget to add FRONTEND_URL

✅ **Do:**
- Store secrets only in Vercel dashboard
- Use production URLs
- Generate strong random secrets
- Test all integrations after deployment
- Update CORS after frontend deployment

---

## 🔄 Updating Environment Variables

After adding/updating variables in Vercel:

1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Wait for deployment to complete

Changes only take effect after redeployment!

---

## 📞 Support

If you need help:
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com/
- Cloudinary: https://cloudinary.com/documentation

---

*Keep this file secure and never commit to version control!*
