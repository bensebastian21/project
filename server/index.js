const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const hostRoutes = require("./routes/host");
const path = require("path");

dotenv.config();
const app = express();


app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!process.env.MONGO_URI) {
  console.warn("⚠️ MONGO_URI is not set in environment.");
}
if (!process.env.JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is not set in environment.");
}

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/dev_db")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/host", hostRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`CORS origin: ${process.env.CLIENT_ORIGIN || "http://localhost:3000"}`);
});
