const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  hostId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  subscribedAt: { 
    type: Date, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  // Track last notification sent to avoid spam
  lastNotificationSent: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure one subscription per student-host pair
subscriptionSchema.index({ studentId: 1, hostId: 1 }, { unique: true });

// Add indexes for better performance
subscriptionSchema.index({ studentId: 1 });
subscriptionSchema.index({ hostId: 1 });
subscriptionSchema.index({ isActive: 1 });
subscriptionSchema.index({ subscribedAt: -1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
