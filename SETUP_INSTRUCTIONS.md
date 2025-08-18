# Project Setup Instructions

## Prerequisites
- Node.js (v14 or higher)
- MongoDB running locally or accessible via connection string
- npm or yarn package manager

## Environment Setup

### 1. Create Environment File
Create a `.env` file in the `server/` directory with the following variables:

```env
MONGO_URI=mongodb://localhost:27017/your_database_name
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000

# Email Configuration (for password reset)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Google OAuth (Server-initiated)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
OAUTH_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
CLIENT_OAUTH_CALLBACK=http://localhost:3000/oauth-callback
```

**Important**: Replace the values with your actual MongoDB connection string and a secure JWT secret.

**Email Setup**: For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an "App Password" (not your regular password)
3. Use that app password in EMAIL_PASS

**Google OAuth Setup**:
1. Go to Google Cloud Console → Credentials → Create OAuth client ID (Web)
2. Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
3. Authorized JavaScript origin: `http://localhost:3000`
4. Copy Client ID/Secret into the env vars above

### 2. Install Dependencies

#### Server Dependencies
```bash
cd server
npm install
```

#### Client Dependencies
```bash
cd client
npm install
```

## Database Setup

### 1. Create Admin User
Run the admin creation script to set up the default admin account:

```bash
node create_admin.js
```

This will create an admin user with:
- Email: `admin@example.com`
- Password: `admin123`
- Role: `admin`

### 2. Verify MongoDB Connection
Ensure MongoDB is running and accessible. The server will log connection status on startup.

## Running the Application

### 1. Start the Server
```bash
cd server
npm start
```

The server should start on `http://localhost:5000`

### 2. Start the Client
```bash
cd client
npm start
```

The client should start on `http://localhost:3000`

## Testing the Application

### Admin Panel
1. Navigate to `http://localhost:3000`
2. Click "Login" 
3. Use the admin credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
4. You should be redirected to `/admin` and see the Admin Panel

### Forgot Password
1. Navigate to `http://localhost:3000`
2. Click "Login" then "Forgot Password?"
3. Enter your email address
4. Copy the generated reset token
5. Use the token to set a new password
6. Login with your new password

**Note**: The system now sends reset tokens via email. If email delivery fails, the token is displayed on screen as a fallback.

### Google Login (OAuth)
1. Click "Sign in with Google" on the login or register screen
2. Complete Google OAuth consent
3. You'll be redirected back to `/oauth-callback` and then to your dashboard/admin based on role
4. Tokens are stored in localStorage (`token`, `user`)

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check your connection string in `.env`
   - Verify network access if using remote MongoDB

2. **JWT Token Issues**
   - Ensure `JWT_SECRET` is set in `.env`
   - Check that the secret is consistent between server restarts

3. **Admin Access Denied**
   - Verify the admin user was created successfully
   - Check that the user has `role: "admin"` in MongoDB
   - Ensure the JWT token contains the correct role

4. **CORS Issues**
   - The server is configured to allow requests from `http://localhost:3000`
   - If using a different port, update the CORS configuration in `server/index.js`

5. **Email Issues**
   - Ensure EMAIL_USER and EMAIL_PASS are set in `.env`
   - For Gmail: Use app password, not regular password
   - Check if your email provider allows "less secure app access"
   - Test email sending with the `/api/auth/test-email` endpoint

### Debug Steps

1. Check server console for error messages
2. Check browser console for client-side errors
3. Verify localStorage contains `token` and `user` data after login
4. Use browser dev tools to inspect network requests

## Security Notes

- **Never commit `.env` files** to version control
- Use strong, unique JWT secrets in production
- Implement proper password policies for production use
- Consider adding rate limiting and additional security measures
- The current setup is for development - add proper security middleware for production
