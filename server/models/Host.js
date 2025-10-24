const mongoose = require("mongoose");

const hostSchema = new mongoose.Schema({
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
  password: { type: String, required: true },
  
  // Host-specific fields
  documentPath: { type: String, required: true }, // Uploaded document for verification
  approvalStatus: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin who approved
  approvedAt: { type: Date },
  rejectionReason: { type: String }, // Reason for rejection if applicable
  
  // Password reset fields
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  resetCode: String,
  resetCodeExpires: Date,

  // Firebase fields
  firebaseUid: String,

  // Soft delete flags
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better performance
hostSchema.index({ email: 1 }, { unique: true });
// Ensure phone numbers are unique when provided (allow multiple empty strings)
hostSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string", $ne: "" } } }
);
hostSchema.index({ approvalStatus: 1 });
hostSchema.index({ isDeleted: 1 });
hostSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Host", hostSchema);
