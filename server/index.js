const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const hostRoutes = require("./routes/host");
const usersRoutes = require("./routes/users");
const friendsRoutes = require("./routes/friends");
const reviewRoutes = require("./routes/reviews");
const bookmarksRoutes = require("./routes/bookmarks");
const certificatesRoutes = require("./routes/certificates");
const subscriptionsRoutes = require("./routes/subscriptions");
const supportRoutes = require("./routes/support");
const chatRoutes = require("./routes/chat");
const path = require("path");

dotenv.config();
const app = express();

// Improve Mongoose debug visibility in development
if ((process.env.NODE_ENV || "development") !== "production") {
  mongoose.set("debug", false);
}


app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001", 
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:3004",
      "http://localhost:3005",
      "http://localhost:3006",
      "http://localhost:3007",
      "http://localhost:3008",
      "http://localhost:3009",
      process.env.CLIENT_ORIGIN
    ].filter(Boolean); // Remove any undefined values
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!process.env.MONGO_URI) {
  console.warn("⚠️ MONGO_URI is not set in environment. Using default.");
  process.env.MONGO_URI = "mongodb://localhost:27017/student_event_db";
}
if (!process.env.JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is not set in environment. Using default.");
  process.env.JWT_SECRET = "your_jwt_secret_key_here_change_this_in_production";
}

// ---------- Mongo connection (normalized URI + retry) ----------
function normalizeMongoUri(uri) {
  try {
    if (!uri) return "mongodb://localhost:27017/student_event_db";
    const noDbSpecified = /mongodb(\+srv)?:\/\/[^/]+\/?(\?[^#]*)?$/i.test(uri);
    if (noDbSpecified) {
      const hasQuery = uri.includes("?");
      const [base, query] = uri.split("?");
      const withDb = base.endsWith("/") ? `${base}student_event_db` : `${base}/student_event_db`;
      return query ? `${withDb}?${query}` : withDb;
    }
    return uri;
  } catch (_) {
    return uri;
  }
}

const mongoUri = normalizeMongoUri(process.env.MONGO_URI);
let mongoConnected = false;

async function connectWithRetry(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoUri);
      mongoConnected = true;
      console.log("✅ MongoDB Connected");
      console.log("MongoDB URI:", mongoUri);
      break;
    } catch (err) {
      mongoConnected = false;
      console.log(`❌ DB connection attempt ${attempt}/${retries} failed:`);
      console.log(err?.message || err);
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${Math.round(delayMs / 1000)}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        console.log("⚠️ Giving up after max retries. Server will continue without DB.");
      }
    }
  }
}

connectWithRetry();

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Simple health endpoint for readiness checks
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development",
    mongo: { connected: mongoConnected }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/host", hostRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/bookmarks", bookmarksRoutes);
app.use("/api/certificates", certificatesRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;
console.log("Starting server on port:", PORT);
console.log("Environment variables:");
console.log("- MONGO_URI:", mongoUri);
console.log("- JWT_SECRET:", process.env.JWT_SECRET ? "SET" : "NOT SET");
console.log("- CLIENT_ORIGIN:", process.env.CLIENT_ORIGIN || "http://localhost:3000");
console.log("- CORS: Allowing multiple localhost ports (3000-3009)");

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`CORS: Allowing localhost ports 3000-3009 and ${process.env.CLIENT_ORIGIN || "default origin"}`);
});
