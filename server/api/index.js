const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('../routes/auth');
const hostRoutes = require('../routes/host');
const usersRoutes = require('../routes/users');
const friendsRoutes = require('../routes/friends');
const reviewRoutes = require('../routes/reviews');
const bookmarksRoutes = require('../routes/bookmarks');
const certificatesRoutes = require('../routes/certificates');
const subscriptionsRoutes = require('../routes/subscriptions');
const supportRoutes = require('../routes/support');
const chatRoutes = require('../routes/chat');
// Add the new events route
const eventsRoutes = require('../routes/events');

const { profileStorage, bannerStorage, documentStorage } = require('../utils/cloudinary');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Improve Mongoose debug visibility in development
if ((process.env.NODE_ENV || 'development') !== 'production') {
  mongoose.set('debug', false);
}

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/student-events',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Create Express app
const app = express();

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Configure multer with Cloudinary storage
const multer = require('multer');
const upload = multer({ storage: profileStorage });
const uploadBanner = multer({ storage: bannerStorage });
const uploadDocument = multer({ storage: documentStorage });

// Connect to database only when needed
// connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/chat', chatRoutes);

// Register the new events route
app.use('/api/events', eventsRoutes);

// Root route for debugging
app.get('/', (req, res) => {
  res.json({ message: 'Serverless function is working!', timestamp: new Date().toISOString() });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Serverless function is working!' });
});

// ======= Cloudinary Image Proxy (for backward compatibility with local images) =======
// This endpoint can be used to serve images from Cloudinary with transformations
app.get('/cloudinary/*', (req, res) => {
  // Capture everything after /cloudinary/ as the publicId
  const publicId = req.params[0];
  const transformations = req.query.t || 'c_fill,w_800,h_600';

  // If it's already a Cloudinary URL or full URL, redirect to it directly
  if (publicId.startsWith('http')) {
    return res.redirect(publicId);
  }

  // Construct Cloudinary URL
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return res.status(400).json({ error: 'Cloudinary not configured' });
  }

  const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
  res.redirect(cloudinaryUrl);
});

app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS test endpoint',
    origin: req.headers.origin,
    method: req.method,
    headers: req.headers,
  });
});

// 404 handler will be added after module.exports for serverless functions

module.exports = async (req, res) => {
  // Connect to database if not already connected
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Get origin from request
  const origin = req.headers.origin || req.headers.referer;

  // Log for debugging
  console.log('[WRAPPER] Request method:', req.method);
  console.log('[WRAPPER] Request origin:', origin);
  console.log('[WRAPPER] Request path:', req.url);

  // Enhanced CORS configuration for Vercel deployments
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://evenite21-d8e3acovz-bensebastian21s-projects.vercel.app',
    process.env.CLIENT_ORIGIN, // This should be set in Vercel environment variables
  ].filter(Boolean);

  // Set CORS headers IMMEDIATELY for ALL requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  // Set Access-Control-Allow-Origin based on origin
  if (origin) {
    // Check if origin is in allowed list or is a Vercel app
    if (
      allowedOrigins.includes(origin) ||
      origin.includes('vercel.app') ||
      origin.includes('evenite')
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      console.log('[WRAPPER] ✅ CORS headers set for origin:', origin);
    } else {
      // For any other origin, log it but still set the header to allow the request
      res.setHeader('Access-Control-Allow-Origin', origin);
      console.log('[WRAPPER] ⚠️  CORS headers set for unlisted origin:', origin);
    }
  } else {
    // For requests without origin, allow all origins temporarily
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log('[WRAPPER] ✅ CORS headers set for all origins (no origin header)');
  }

  // Handle OPTIONS preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log('[WRAPPER] ✅ OPTIONS preflight - returning 200');
    res.status(200).end();
    return;
  }

  // Pass to Express app
  console.log('[WRAPPER] Passing to Express app');
  return app(req, res);
};

// Add 404 handler for serverless functions
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// For local development, export the app
module.exports.app = app;
