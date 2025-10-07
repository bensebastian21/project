const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  fullname: { type: String, required: true },
  institute: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  pincode: { type: String, required: true },
  age: { type: Number, required: true },
  course: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String, required: true },
  countryCode: { type: String, default: "+91" },
  password: { type: String, required: false }, // Optional for Firebase users
  studentIdPath: String,
  profilePic: String, // Path to profile picture

  // Verification flags
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  emailOTP: String,
  emailOTPExpires: Date,
  phoneOTP: String,
  phoneOTPExpires: Date,

  // ✅ Add role field
  role: { 
    type: String, 
    enum: ["student", "host", "admin"], 
    default: "student" 
  },

  // Password reset fields
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // Code-based reset fields
  resetCode: String,
  resetCodeExpires: Date,

  // Firebase fields
  firebaseUid: String,

  // Subscriptions (follow hosts) stored on user
  subscribedHosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Soft delete flags
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ firebaseUid: 1 });
userSchema.index({ resetCode: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ subscribedHosts: 1 });

module.exports = mongoose.model("User", userSchema);
