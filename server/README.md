# Student Event Portal - Server

## Overview

This is the backend server for the Student Event Portal, built with Node.js, Express, and MongoDB. It provides RESTful APIs for user authentication, event management, and other features.

## Features

### Authentication
- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Google OAuth integration
- Email and phone verification
- Password reset functionality

### User Management
- Student and host user types
- Profile management
- Profile picture and banner uploads
- Document verification for students
- Friend system
- User settings and preferences

### Event Management
- Event creation and management (for hosts)
- Event registration (for students)
- Event search and filtering
- Event categories and tags

### Social Features
- Friend requests and connections
- User profiles with badges and achievements
- Event reviews and ratings
- Certificate generation

### Cloudinary Integration
- Image uploads for profiles, banners, and documents
- Direct uploads to Cloudinary from client
- Automatic image optimization and transformations
- Secure signed URLs for uploads

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new student user
- `POST /api/auth/register-host` - Register a new host user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/upload-profile-pic` - Upload profile picture
- `POST /api/auth/upload-banner` - Upload profile banner

### Users
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/stats` - Get user statistics
- `GET /api/users/:id/attendance` - Get user attendance history
- `GET /api/users/:id/certificates` - Get user certificates

### Friends
- `GET /api/friends` - Get friend list
- `POST /api/friends/request` - Send friend request
- `PUT /api/friends/:id/accept` - Accept friend request
- `DELETE /api/friends/:id` - Remove friend

### Events
- `GET /api/host/public/events` - Get all public events
- `GET /api/host/public/events/:id` - Get specific event
- `POST /api/host/public/events/:id/register` - Register for event

### Reviews
- `POST /api/reviews` - Submit event review
- `GET /api/reviews/event/:id` - Get reviews for event

### Bookmarks
- `POST /api/bookmarks` - Bookmark event
- `DELETE /api/bookmarks/:id` - Remove bookmark
- `GET /api/bookmarks` - Get user bookmarks

### Certificates
- `POST /api/certificates/events/:id` - Generate event certificate

### Subscriptions
- `POST /api/subscriptions` - Subscribe to host
- `DELETE /api/subscriptions/:id` - Unsubscribe from host
- `GET /api/subscriptions` - Get user subscriptions

## Cloudinary Configuration

### Environment Variables
```env
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### Upload Folders
- **Profiles**: `student-events/profiles/`
- **Banners**: `student-events/banners/`
- **Documents**: `student-events/documents/`

### Image Transformations
- Profile pictures: `c_fill,w_200,h_200,g_face,c_thumb`
- Banners: `c_fill,w_1200,h_400`
- Documents: `c_fill,w_800,h_600`

## Database Models

### User
- username, fullname, email, phone
- profilePic, bannerUrl
- studentIdPath, secondDocPath
- role (student, host, admin)
- verification status
- settings and preferences

### Event
- title, description, date
- location, category
- host information
- registration details

### Review
- event reference
- user reference
- rating and comments
- custom fields

### Certificate
- event reference
- user reference
- issue date
- certificate URL

## Installation

1. Clone the repository
2. Navigate to the server directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables in `.env` file
5. Start the server:
   ```bash
   npm start
   ```

## Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=your-jwt-secret

# Email (Nodemailer)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Twilio SMS
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## Dependencies

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT implementation
- `bcryptjs` - Password hashing
- `multer` - File upload handling
- `cloudinary` - Cloudinary SDK
- `multer-storage-cloudinary` - Multer storage engine for Cloudinary
- `nodemailer` - Email sending
- `twilio` - SMS sending
- `cors` - CORS handling
- `dotenv` - Environment variables

## Development

### Running the Server
```bash
npm run dev
```

### Testing
```bash
npm test
```

## Deployment

The server can be deployed to any Node.js hosting platform like:
- Vercel
- Render
- Heroku
- DigitalOcean App Platform

Make sure to set all environment variables in your deployment environment.