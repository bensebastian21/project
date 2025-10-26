# Hybrid Database Authentication for Student Event Portal

## Features Implemented

### 1. Hybrid Database System
- **Firebase Authentication**: Email/password login and registration
- **Firebase Google Authentication**: Sign in/sign up with Google accounts
- **Dual Data Storage**: User data stored in BOTH Firebase Firestore AND MongoDB
- **Hybrid Password Reset**: Firebase sends emails + MongoDB stores reset tokens
- **Data Redundancy**: Ensures data availability and backup

### 2. Component Architecture
- **Separated Components**: Login, Registration, and Password Reset are separate components
- **Clean Code Structure**: Better organization and maintainability
- **Reusable Components**: Modular design for easier updates

### 3. Database Features
- **Firebase Firestore**: Primary user data storage with real-time updates
- **MongoDB**: Secondary data storage for redundancy and password reset tokens
- **Data Synchronization**: Automatic data storage in both databases
- **Fallback System**: If one database fails, data is retrieved from the other

### 4. User Data Management
- **Complete Profiles**: All registration fields stored in both databases
- **Data Persistence**: User data persists across sessions and databases
- **Profile Updates**: Easy to update and manage user information
- **Secure Storage**: Data stored securely in both Firebase and MongoDB

### 5. Cloudinary Integration
- **Image Uploads**: Profile pictures, banners, and documents stored in Cloudinary
- **Scalable Storage**: Cloud-based image storage with CDN delivery
- **Image Transformations**: Automatic image optimization and resizing
- **Secure Uploads**: Direct uploads to Cloudinary with signed URLs
- **Fallback Support**: Backward compatibility with local uploads

## Component Structure

### HomePage.jsx
- Main container component
- Handles switching between Login, Register, and Password Reset modes
- Contains background animation
- Clean, focused responsibility

### Login.jsx
- Dedicated login component
- Firebase email/password authentication
- Firebase Google authentication
- Dual database data retrieval
- Forgot password functionality (triggers hybrid reset)
- Form validation and error handling

### Register.jsx
- Dedicated registration component
- Comprehensive user profile form
- Firebase user creation
- Dual database data storage
- Google sign-up option
- Advanced form validation
- File upload handling

### PasswordReset.jsx
- Dedicated password reset component
- Uses MongoDB reset tokens for verification
- Secure password update process
- Form validation and error handling

### Dashboard.jsx
- User dashboard after authentication
- Firebase authentication state management
- User profile display from dual databases
- Logout functionality

## Authentication Flow

### Firebase Email/Password Authentication
1. **Registration**: User fills form → Firebase creates account → Data stored in BOTH Firebase AND MongoDB
2. **Login**: User authenticates → Firebase validates → Data loaded from both databases (prioritizing Firebase)
3. **Session**: Firebase handles authentication state → Automatic session management
4. **Logout**: Firebase sign-out → Session cleared → Redirect to login

### Firebase Google Authentication
1. **Google Sign-in**: User clicks Google button → Firebase popup → Authentication
2. **Profile Creation**: User data automatically stored in both databases
3. **Session Management**: Firebase handles authentication state
4. **Seamless Integration**: Works alongside email/password authentication

### Hybrid Password Reset System
1. **Request Reset**: User enters email → Firebase sends reset email + MongoDB stores reset token
2. **Email Link**: User clicks link in email → Firebase handles email delivery
3. **Token Verification**: User enters reset token → MongoDB verifies token validity
4. **Password Update**: New password hashed and stored in MongoDB
5. **Database Sync**: Password update reflected in both systems

## Database Services Used

- **Firebase Authentication**: User login, registration, and session management
- **Firestore**: Primary user profile data storage and retrieval
- **MongoDB**: Secondary user profile data storage, password reset tokens, and backup
- **Google Auth Provider**: Google sign-in integration
- **Security Rules**: Built-in data protection in both systems
- **Cloudinary**: Cloud-based image storage and delivery

## Data Storage Strategy

### Registration Process
1. **Firebase Auth**: Creates user account
2. **Firestore**: Stores complete user profile
3. **MongoDB**: Stores complete user profile + Firebase UID (backup)
4. **Cloudinary**: Stores profile pictures, banners, and documents
5. **Success Message**: Shows which databases were successfully updated

### Login Process
1. **Firebase Auth**: Authenticates user
2. **Data Retrieval**: Attempts to get data from Firebase first
3. **Fallback**: If Firebase fails, retrieves from MongoDB
4. **User Experience**: Shows which database the data came from

### Password Reset Process
1. **Firebase**: Sends password reset email to user
2. **MongoDB**: Generates and stores secure reset token with expiration
3. **Token Verification**: MongoDB validates reset token
4. **Password Update**: New password hashed and stored in MongoDB
5. **Security**: Reset tokens expire after 1 hour for security

## Cloudinary Integration Details

### Image Upload Process
1. **Direct Upload**: Files uploaded directly to Cloudinary from the browser
2. **Signed URLs**: Secure uploads using upload presets
3. **Automatic Optimization**: Images automatically optimized for web delivery
4. **Transformations**: Real-time image resizing, cropping, and formatting
5. **CDN Delivery**: Fast global delivery through Cloudinary's CDN

### Supported Image Types
- **Profile Pictures**: JPG, PNG, GIF formats
- **Banners**: JPG, PNG formats with automatic resizing
- **Documents**: JPG, PNG, PDF formats for verification

### Folders Structure
- **Profiles**: `/student-events/profiles/`
- **Banners**: `/student-events/banners/`
- **Documents**: `/student-events/documents/`

## Usage

### Registration
1. Click "Register" tab
2. Fill out the comprehensive registration form
3. Click "Register" to create account with Firebase
4. User data automatically stored in BOTH Firebase AND MongoDB
5. Success message shows which databases were updated
6. Form switches to login mode

### Login
1. Click "Login" tab
2. Enter email and password
3. Click "Login" to authenticate with Firebase
4. Successful login redirects to dashboard
5. User data loaded from both databases (Firebase prioritized)
6. Toast message shows which database provided the data

### Password Reset
1. Enter email address in login form
2. Click "Forgot Password?" button
3. Firebase sends password reset email
4. MongoDB stores reset token and expiration
5. User clicks email link and enters reset token
6. New password securely updated in MongoDB

### Google Authentication
1. Click "Sign in with Google" button
2. Google popup opens for authentication
3. User data automatically stored in both databases
4. Seamless integration with existing system

### Image Uploads
1. Select image file in profile or registration forms
2. File automatically uploaded to Cloudinary
3. Cloudinary URL stored in user profile
4. Images displayed with automatic optimization

## Error Handling

The app provides specific error messages for common scenarios:
- Invalid email format
- Weak passwords
- User not found
- Wrong password
- Email already in use
- Database storage failures
- Invalid or expired reset tokens
- Too many failed attempts
- Account disabled
- Network errors
- Image upload failures
- Cloudinary configuration errors

## Dependencies

- `firebase`: Core Firebase SDK for authentication and Firestore
- `react-toastify`: For user notifications
- `react-router-dom`: For navigation
- `cloudinary`: Cloudinary SDK for image management
- `multer-storage-cloudinary`: Multer storage engine for Cloudinary

## Benefits of Hybrid Database Approach

1. **Data Redundancy**: User data stored in two locations for safety
2. **High Availability**: If one database fails, data is still accessible
3. **Performance**: Firebase provides real-time updates, MongoDB provides backup
4. **Scalability**: Both systems can scale independently
5. **Flexibility**: Can switch between databases based on needs
6. **Disaster Recovery**: Data loss protection through dual storage
7. **Migration Path**: Easy to migrate between systems if needed
8. **Enhanced Security**: Password reset tokens stored securely in MongoDB
9. **Email Delivery**: Firebase handles reliable email delivery
10. **Token Management**: Secure token generation and validation
11. **Cloud Storage**: Scalable image storage with Cloudinary
12. **Image Optimization**: Automatic image optimization and delivery
13. **Global CDN**: Fast image delivery worldwide

## Database Priority

1. **Primary**: Firebase Firestore (real-time, immediate access)
2. **Secondary**: MongoDB (backup, fallback access, password reset tokens)
3. **Image Storage**: Cloudinary (scalable image storage and delivery)
4. **Fallback**: Basic user info from Firebase Auth

This hybrid approach ensures maximum data availability, user experience reliability, and secure password reset functionality.