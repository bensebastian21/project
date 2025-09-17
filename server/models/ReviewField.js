const mongoose = require("mongoose");

const reviewFieldSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  fieldName: { type: String, required: true },
  fieldType: { type: String, enum: ["text", "rating", "textarea"], required: true },
  isRequired: { type: Boolean, default: false },
  placeholder: { type: String, default: "" },
  order: { type: Number, default: 0 }, // For ordering fields
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
reviewFieldSchema.index({ eventId: 1, order: 1 });

module.exports = mongoose.model("ReviewField", reviewFieldSchema);
