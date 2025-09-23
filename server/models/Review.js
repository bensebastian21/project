const mongoose = require("mongoose");

const reviewFieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  fieldType: { type: String, enum: ["text", "rating", "textarea"], required: true },
  isRequired: { type: Boolean, default: false },
  options: { type: [String], default: [] }, // For future dropdown/select fields
  placeholder: { type: String, default: "" }
});

const reviewSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  overallRating: { type: Number, min: 1, max: 5, required: true },
  reviewFields: [{
    fieldName: { type: String, required: true },
    fieldType: { type: String, enum: ["text", "rating", "textarea"], required: true },
    // value is only required for text/textarea; rating is required for rating fields
    value: { type: mongoose.Schema.Types.Mixed, required: function() { return this.fieldType !== 'rating'; } },
    rating: { type: Number, min: 1, max: 5, required: function() { return this.fieldType === 'rating'; } }
  }],
  comment: { type: String, default: "" },
  isAnonymous: { type: Boolean, default: false },
  // Soft delete flags
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
reviewSchema.index({ eventId: 1, reviewerId: 1 }, { unique: true }); // One review per user per event
reviewSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
