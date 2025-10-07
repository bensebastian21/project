const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Event", 
    required: true 
  },
  bookmarkedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure one bookmark per student-event pair
bookmarkSchema.index({ studentId: 1, eventId: 1 }, { unique: true });

// Add indexes for better performance
bookmarkSchema.index({ studentId: 1 });
bookmarkSchema.index({ eventId: 1 });
bookmarkSchema.index({ bookmarkedAt: -1 });

module.exports = mongoose.model("Bookmark", bookmarkSchema);
