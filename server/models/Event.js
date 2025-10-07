const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["registered", "cancelled"], default: "registered" }
});

const feedbackSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  shortDescription: { type: String, default: "" },
  date: { type: Date, required: true },
  endDate: { type: Date },
  location: { type: String, default: "" },
  address: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  pincode: { type: String, default: "" },
  capacity: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  currency: { type: String, default: "INR" },
  category: { type: String, default: "General" },
  tags: { type: [String], default: [] },
  requirements: { type: String, default: "" },
  agenda: { type: String, default: "" },
  contactEmail: { type: String, default: "" },
  contactPhone: { type: String, default: "" },
  website: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
  isOnline: { type: Boolean, default: false },
  meetingLink: { type: String, default: "" },
  isCompleted: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  registrations: { type: [registrationSchema], default: [] },
  feedbacks: { type: [feedbackSchema], default: [] },
  // Users who bookmarked this event (no separate collection)
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // Soft delete flags
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Helpful indexes for common queries
eventSchema.index({ isPublished: 1, isDeleted: 1, date: -1 });
eventSchema.index({ hostId: 1, isDeleted: 1, date: -1 });
eventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Event", eventSchema);
