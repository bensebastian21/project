require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const hostRoutes = require('./routes/host');
const usersRoutes = require('./routes/users');
const friendsRoutes = require('./routes/friends');
const reviewRoutes = require('./routes/reviews');
const bookmarksRoutes = require('./routes/bookmarks');
const certificatesRoutes = require('./routes/certificates');
const subscriptionsRoutes = require('./routes/subscriptions');
const supportRoutes = require('./routes/support');
const chatRoutes = require('./routes/chat');
const knnRoutes = require('./routes/knn');
const bayesianRoutes = require('./routes/bayesian');
const decisionTreeRoutes = require('./routes/decisiontree');
const genloopRoutes = require('./routes/genloop');
const memoriesRoutes = require('./routes/memories');
const marketingRoutes = require('./routes/marketing');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// ======= Environment Variables =======
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

// Fail fast if critical env vars are missing
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is required!');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is required!');
  process.exit(1);
}

// ======= CORS Setup =======
// Manual CORS implementation for Vercel serverless compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;

  console.log('[CORS] Incoming request from origin:', origin);
  console.log('[CORS] Request method:', req.method);
  console.log('[CORS] Request path:', req.path);

  // Enhanced CORS configuration for Vercel deployments
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://evenite21-d8e3acovz-bensebastian21s-projects.vercel.app',
    process.env.CLIENT_ORIGIN // This should be set in Vercel environment variables
  ].filter(Boolean);

  // Headers that are always safe to set
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Set Access-Control-Allow-Origin based on origin
  if (origin) {
    // Check if origin is in allowed list or is a Vercel app
    if (allowedOrigins.includes(origin) || origin.includes('vercel.app') || origin.includes('evenite')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      console.log('[CORS] ✅ CORS headers SET for origin:', origin);
    } else {
      // For any other origin, log it but still set the header to allow the request
      // CAUTION: Setting credentials true with arbitrary origin is risky, 
      // but if we want to allow it we must echo back the origin, NOT use *
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      console.log('[CORS] ⚠️  CORS headers SET for unlisted origin:', origin);
    }
  } else {
    console.log('[CORS] ❌ No origin found in request');
    // Requests without origin (postman, mobile apps, direct browser navigation)
    // usually don't need credentials in the CORS sense, or just need *
    res.setHeader('Access-Control-Allow-Origin', '*');
    // DO NOT set Access-Control-Allow-Credentials: true when Origin is *
  }

  // Handle OPTIONS preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log('[CORS] ✅ OPTIONS preflight - returning 200');
    return res.status(200).end();
  }

  next();
});

// ======= Body Parsing =======
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ======= Static Files =======
// Keep local uploads for backward compatibility, but Cloudinary is now preferred
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ======= MongoDB Connection =======
let mongoConnected = false;

async function connectWithRetry(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      mongoConnected = true;
      console.log('✅ MongoDB Connected');
      break;
    } catch (err) {
      mongoConnected = false;
      console.log(`❌ DB connection attempt ${attempt}/${retries} failed:`);
      console.log(err.message || err);
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        console.log('⚠️ Max retries reached. Server will continue without DB.');
      }
    }
  }
}

// Connect immediately
connectWithRetry();

// MongoDB events
mongoose.connection.on('error', err => console.error('❌ MongoDB connection error:', err));
mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected. Retrying...'));
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));

// ======= Health Check =======
app.get('/', (req, res) => {
  res.json({
    message: 'Evenite API Server',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/*'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
    mongo: { connected: mongoConnected },
    timestamp: new Date().toISOString()
  });
});

// ======= API Routes =======
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/squads', require('./routes/squads'));
app.use('/api/reviews', reviewRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/chat', chatRoutes); // AI Chat
app.use('/api/p2p-chat', require('./routes/p2pChat')); // P2P Encrypted Chat
app.use('/api/knn', knnRoutes);
app.use('/api/bayesian', bayesianRoutes);
app.use('/api/decision-tree', decisionTreeRoutes);
app.use('/api/genloop', genloopRoutes);
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/memories', memoriesRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/goals', require('./routes/goals'));
app.use('/api/circles', require('./routes/circles'));
app.use('/api', require('./routes/contact')); // Contact Form

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

// ======= Error Handling =======
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export for Vercel serverless
module.exports = app;

// Start server only in local development
if (require.main === module) {
  // Wrap express app in HTTP server for Socket.io
  const http = require('http');
  const server = http.createServer(app);
  const { initSocket } = require('./socket');

  // Initialize Socket.io
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`MongoDB URI: ${MONGO_URI}`);
    console.log(`JWT_SECRET: ${JWT_SECRET ? 'SET' : 'NOT SET'}`);
    console.log(`💬 Socket.io initialized`);
  });
}

// Force restart trigger 2