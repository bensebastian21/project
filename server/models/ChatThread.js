const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["system", "user", "assistant"], required: true },
  content: { type: String, required: true },
  at: { type: Date, default: Date.now }
}, { _id: false });

const chatThreadSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ["student", "host", "admin"], required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, default: "New Chat" },
  messages: { type: [messageSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

chatThreadSchema.index({ ownerType: 1, ownerId: 1, updatedAt: -1 });

chatThreadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("ChatThread", chatThreadSchema);
