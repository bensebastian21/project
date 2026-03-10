# Vercel Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. Serverless Function Timeout
**Problem**: Functions timing out after 10 seconds
**Solution**: 
- Added `maxDuration: 30` in vercel.json
- Optimized database connection handling
- Added proper error handling

### 2. Database Connection Issues
**Problem**: MongoDB connection failing in serverless environment
**Solution**:
- Use `MONGODB_URI` environment variable (not `MONGO_URI`)
- Added connection retry logic
- Proper mongoose connection options

### 3. CORS Issues
**Problem**: Frontend can't connect to backend
**Solution**:
- Set `CLIENT_ORIGIN` environment variable in Vercel
- Include your Render frontend URL in allowed origins
- Test with: `https://your-app-name.onrender.com`

### 4. Environment Variables Not Loading
**Problem**: Environment variables not accessible
**Solution**:
- Use `MONGODB_URI` instead of `MONGO_URI`
- Ensure all variables are set in Vercel dashboard
- Redeploy after adding new environment variables

### 5. Static File Serving Issues
**Problem**: Uploads/images not accessible
**Solution**:
- Added `/uploads/(.*)` route in vercel.json
- Files are served from `/uploads` endpoint
- Consider using cloud storage for production

## Testing Your Deployment

### 1. Health Check
Test your backend is running:
```bash
curl https://your-backend-name.vercel.app/health
```

Expected response:
```json
{
  "ok": true,
  "uptime": 123.456,
  "env": "production",
  "mongo": { "connected": true },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. API Endpoint Test
Test a simple API endpoint:
```bash
curl https://your-backend-name.vercel.app/api/auth/test
```

### 3. CORS Test
Test CORS from your frontend:
```javascript
fetch('https://your-backend-name.vercel.app/health')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('CORS Error:', error));
```

## Environment Variable Checklist

### Required for Vercel:
- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - JWT signing secret
- [ ] `CLIENT_ORIGIN` - Your Render frontend URL

### Optional but Recommended:
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth
- [ ] `EMAIL_USER` - Email service
- [ ] `EMAIL_PASS` - Email service
- [ ] `TWILIO_ACCOUNT_SID` - SMS service
- [ ] `TWILIO_AUTH_TOKEN` - SMS service
- [ ] `TWILIO_PHONE_NUMBER` - SMS service
- [ ] `GOOGLE_API_KEY` - AI features

## Debugging Steps

### 1. Check Vercel Function Logs
1. Go to Vercel dashboard
2. Select your project
3. Go to "Functions" tab
4. Click on your function
5. Check "Logs" tab for errors

### 2. Test Locally with Vercel CLI
```bash
npm install -g vercel
vercel dev
```

### 3. Check Environment Variables
```bash
vercel env ls
```

### 4. Test Database Connection
Add this to your server code temporarily:
```javascript
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('Connection state:', mongoose.connection.readyState);
```

## Performance Optimization

### 1. Database Connection Pooling
- Vercel handles connection pooling automatically
- Don't create multiple connections
- Use connection state checks

### 2. Cold Start Optimization
- Minimize dependencies
- Use connection caching
- Optimize imports

### 3. Memory Usage
- Monitor function memory usage
- Optimize large operations
- Use streaming for large responses

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use Vercel's environment variable system
- Rotate secrets regularly

### 2. CORS Configuration
- Only allow necessary origins
- Use HTTPS in production
- Validate all inputs

### 3. Database Security
- Use MongoDB Atlas with proper access controls
- Enable IP whitelisting
- Use strong passwords

## Monitoring and Alerts

### 1. Vercel Analytics
- Enable Vercel Analytics
- Monitor function performance
- Set up alerts for errors

### 2. Database Monitoring
- Use MongoDB Atlas monitoring
- Set up alerts for connection issues
- Monitor query performance

### 3. Error Tracking
- Consider adding Sentry or similar
- Log all errors properly
- Set up error notifications

## Common Error Messages

### "Function timeout"
- Increase `maxDuration` in vercel.json
- Optimize database queries
- Check for infinite loops

### "CORS error"
- Check `CLIENT_ORIGIN` environment variable
- Verify frontend URL is correct
- Test with browser developer tools

### "Database connection failed"
- Check `MONGODB_URI` format
- Verify MongoDB Atlas access
- Check network connectivity

### "Environment variable not found"
- Verify variable name spelling
- Check Vercel environment settings
- Redeploy after adding variables

## Getting Help

1. Check Vercel documentation: https://vercel.com/docs
2. MongoDB Atlas documentation: https://docs.atlas.mongodb.com
3. Vercel community forum: https://github.com/vercel/vercel/discussions
4. Check function logs in Vercel dashboard
5. Test with Vercel CLI locally
