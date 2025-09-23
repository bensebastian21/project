const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const hostRoutes = require("./routes/host");
const reviewRoutes = require("./routes/reviews");
const path = require("path");

dotenv.config();
const app = express();


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

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/dev_db")
  .then(() => {
    console.log("✅ MongoDB Connected");
    console.log("MongoDB URI:", process.env.MONGO_URI || "mongodb://localhost:27017/dev_db");
  })
  .catch(err => {
    console.log("❌ DB Error:", err);
    console.log("⚠️ Continuing without database connection...");
    // Don't exit, let the server start anyway
  });

app.use("/api/auth", authRoutes);
app.use("/api/host", hostRoutes);
app.use("/api/reviews", reviewRoutes);

const PORT = process.env.PORT || 5000;
console.log("Starting server on port:", PORT);
console.log("Environment variables:");
console.log("- MONGO_URI:", process.env.MONGO_URI || "mongodb://localhost:27017/dev_db");
console.log("- JWT_SECRET:", process.env.JWT_SECRET ? "SET" : "NOT SET");
console.log("- CLIENT_ORIGIN:", process.env.CLIENT_ORIGIN || "http://localhost:3000");
console.log("- CORS: Allowing multiple localhost ports (3000-3009)");

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`CORS: Allowing localhost ports 3000-3009 and ${process.env.CLIENT_ORIGIN || "default origin"}`);
});
