require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3006',
  'http://localhost:3007',
  'http://localhost:3008',
  'http://localhost:3009',
  CLIENT_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

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
app.use('/api/host', hostRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/chat', chatRoutes);

// ======= Cloudinary Image Proxy (for backward compatibility with local images) =======
// This endpoint can be used to serve images from Cloudinary with transformations
app.get('/cloudinary/:publicId', (req, res) => {
  const { publicId } = req.params;
  const transformations = req.query.t || 'c_fill,w_800,h_600';
  
  // If it's already a Cloudinary URL, redirect to it directly
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

// ======= Start Server =======
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${MONGO_URI}`);
  console.log(`JWT_SECRET: ${JWT_SECRET ? 'SET' : 'NOT SET'}`);
  console.log(`CORS: Allowing ${allowedOrigins.join(', ')}`);
});