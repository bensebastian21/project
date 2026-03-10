# Deployment Troubleshooting Guide 🔧

Common issues and solutions when deploying to Vercel.

---

## 🚨 Backend Issues

### Issue 1: "Cannot find module 'express'"

**Cause:** Dependencies not installed

**Solution:**
```bash
cd server
npm install
```

Ensure `package.json` has all dependencies. Vercel will install them automatically.

---

### Issue 2: MongoDB Connection Failed

**Error:** `MongoServerError: bad auth`

**Solution:**
1. Check MongoDB URI format:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/dbname
   ```
2. Verify password is URL-encoded (special characters)
3. Whitelist IP `0.0.0.0/0` in MongoDB Atlas
4. Ensure database user has correct permissions

**Test Connection:**
```javascript
// Add to index.js temporarily
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));
```

---

### Issue 3: "CORS Error" in Browser

**Error:** `Access to fetch has been blocked by CORS policy`

**Solution:**

Update `server/index.js`:
```javascript
const cors = require('cors');

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000'
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

Ensure `FRONTEND_URL` is set in Vercel environment variables.

---

### Issue 4: Environment Variables Not Working

**Cause:** Variables not loaded or wrong naming

**Solution:**
1. Check variable names exactly match code
2. Add variables in Vercel Dashboard → Settings → Environment Variables
3. Redeploy after adding variables
4. Variables only work after redeployment!

**Debug:**
```javascript
// Add temporarily to see what's loaded
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ Missing',
  JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing',
});
```

---

### Issue 5: "Function execution timed out"

**Cause:** Long-running operations, database connection issues

**Solution:**
1. Optimize database queries
2. Add indexes to frequently queried fields
3. Use connection pooling
4. Check MongoDB Atlas isn't paused

**Vercel timeout limits:**
- Free: 10 seconds
- Pro: 60 seconds

---

### Issue 6: "404 Not Found" on API Routes

**Cause:** Incorrect vercel.json routing

**Solution:**

Ensure `server/vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ]
}
```

---

## 🎨 Frontend Issues

### Issue 1: "404 on Page Refresh"

**Cause:** SPA routing not configured

**Solution:**

Create `client/vercel.json`:
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

This ensures all routes go to index.html for React Router.

---

### Issue 2: Build Fails

**Error:** `Build failed` or compilation errors

**Solution:**
1. Test build locally:
   ```bash
   cd client
   npm run build
   ```
2. Fix any TypeScript/ESLint errors
3. Check all imports are correct
4. Ensure all dependencies in `package.json`

**Common fixes:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

### Issue 3: API Calls Return 404

**Cause:** Wrong API URL

**Solution:**

Check `client/src/config.js`:
```javascript
const config = {
  apiBaseUrl: import.meta.env.VITE_API_URL || 
              'http://localhost:5000/api',
};

export default config;
```

Ensure `.env.production`:
```env
VITE_API_URL=https://your-backend.vercel.app/api
```

Add in Vercel environment variables.

---

### Issue 4: Images Not Loading from Cloudinary

**Cause:** Wrong Cloudinary configuration

**Solution:**

1. Verify environment variables:
   ```env
   REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
   REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_preset
   ```

2. Check upload preset is "unsigned":
   - Cloudinary Dashboard → Settings → Upload
   - Upload Presets → Check "Unsigned"

3. Test upload:
   ```javascript
   console.log('Cloudinary:', {
     cloudName: import.meta.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
     preset: import.meta.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET
   });
   ```

---

### Issue 5: Blank Page After Deployment

**Cause:** Build assets not loading, console errors

**Solution:**

1. Open browser DevTools → Console
2. Check for errors
3. Common issues:
   - API URL incorrect
   - Missing environment variables
   - CORS errors

**Debug:**
```javascript
// Add to App.jsx temporarily
useEffect(() => {
  console.log('Config:', {
    apiUrl: config.apiBaseUrl,
    env: import.meta.env.MODE
  });
}, []);
```

---

### Issue 6: Environment Variables Not Working

**Cause:** Vite requires `VITE_` prefix

**Solution:**

In Vite projects, use `VITE_` prefix:
```env
VITE_API_URL=https://backend.vercel.app/api
VITE_CUSTOM_VAR=value
```

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

**NOT** `process.env` in Vite!

---

## 🔄 General Issues

### Issue 1: Changes Not Reflecting

**Cause:** Cache or old deployment

**Solution:**
1. Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Check deployment timestamp in Vercel
3. Verify correct branch deployed
4. Clear browser cache

---

### Issue 2: Slow Performance

**Cause:** Cold starts, unoptimized code

**Solution:**

Backend:
1. Use connection pooling for MongoDB
2. Add caching headers
3. Optimize database queries
4. Consider Vercel Pro for faster cold starts

Frontend:
1. Lazy load components:
   ```javascript
   const Component = lazy(() => import('./Component'));
   ```
2. Optimize images (use Cloudinary transformations)
3. Code splitting
4. Use Vercel Analytics to identify bottlenecks

---

### Issue 3: Cannot Connect to Database from Vercel

**Cause:** IP whitelist or network security

**Solution:**

MongoDB Atlas:
1. Network Access → Add IP Address
2. Add `0.0.0.0/0` (allows all - Vercel uses dynamic IPs)
3. Or use MongoDB's "Allow access from anywhere"

---

### Issue 4: File Upload Not Working

**Cause:** Vercel filesystem is read-only

**Solution:**

✅ **Use Cloudinary** (already configured in your project)

❌ **Don't** save files to local filesystem in Vercel

Ensure all uploads go through Cloudinary:
```javascript
// Use multer with Cloudinary storage
const { CloudinaryStorage } = require('multer-storage-cloudinary');
```

---

## 🔍 Debugging Tools

### View Logs in Vercel

```bash
# CLI
vercel logs [deployment-url]

# Or in Dashboard
Deployments → Select deployment → Logs
```

### Test API Endpoints

```bash
# Test backend health
curl https://your-backend.vercel.app/api/health

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-backend.vercel.app/api/events
```

### Check Environment Variables

In Vercel Dashboard:
1. Settings → Environment Variables
2. Verify all required variables present
3. Check no typos in names
4. Ensure values are correct

---

## 📊 Health Check Endpoint

Add to `server/index.js`:

```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env_check: {
      mongodb: !!process.env.MONGODB_URI,
      jwt: !!process.env.JWT_SECRET,
      cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME
    }
  });
});
```

Test: `https://your-backend.vercel.app/api/health`

---

## 🆘 Getting Help

### 1. Check Vercel Logs
- Most errors show in logs
- Look for stack traces
- Check timestamps

### 2. Test Locally First
```bash
# Backend
cd server
npm start

# Frontend
cd client
npm run build
npm run preview
```

### 3. Use Browser DevTools
- Console for errors
- Network tab for API calls
- Application tab for storage

### 4. Community Support
- Vercel Discord: https://vercel.com/discord
- Stack Overflow: Tag `vercel`
- GitHub Issues: Check Vercel docs repo

---

## ✅ Deployment Success Checklist

After fixing issues:

- [ ] Backend health endpoint returns 200
- [ ] Frontend loads without console errors
- [ ] Can login/register
- [ ] Can perform CRUD operations
- [ ] Images upload successfully
- [ ] No CORS errors
- [ ] All features working
- [ ] Performance acceptable
- [ ] Mobile responsive

---

## 🎯 Prevention Tips

1. **Test locally before deploying**
   ```bash
   npm run build && npm run preview
   ```

2. **Use environment variables correctly**
   - Backend: `process.env.VAR_NAME`
   - Vite: `import.meta.env.VITE_VAR_NAME`

3. **Keep dependencies updated**
   ```bash
   npm outdated
   npm update
   ```

4. **Monitor deployments**
   - Set up Vercel notifications
   - Check deployment status regularly

5. **Version control**
   - Commit working code
   - Use branches for experiments
   - Tag production releases

---

*Keep this guide handy during deployment!*
