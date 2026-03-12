const mongoose = require('mongoose');
const BayesianClassifier = require('../utils/bayesianClassifier');

// Create a global classifier instance
const eventClassifier = new BayesianClassifier();

// Load pre-trained model if it exists
const path = require('path');
const modelPath = path.join(__dirname, '..', 'data', 'eventClassifierModel.json');
try {
  eventClassifier.loadModel(modelPath);
} catch (err) {
  console.log('No pre-trained model found, starting with a fresh classifier');
}

const registrationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  squadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Squad', default: null }, // Optional squad reference
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['registered', 'cancelled'], default: 'registered' },
  attended: { type: Boolean, default: false },
});

const feedbackSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const qaSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: { type: String, default: 'Anonymous' },
  question: { type: String, required: true },
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track upvoters
  answered: { type: Boolean, default: false },
  reply: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const pollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [pollOptionSchema],
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Prevent duplicate voting
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});


const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  shortDescription: { type: String, default: '' },
  date: { type: Date, required: true },
  endDate: { type: Date },
  registrationDeadline: { type: Date },
  location: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  capacity: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },

  // Team Registration Fields
  isTeamEvent: { type: Boolean, default: false },
  minTeamSize: { type: Number, default: 1 },
  maxTeamSize: { type: Number, default: 4 },
  category: { type: String, default: 'General' },
  tags: { type: [String], default: [] },
  requirements: { type: String, default: '' },
  agenda: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  website: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  images: { type: [String], default: [] },
  isOnline: { type: Boolean, default: false },
  platform: { type: String, default: 'Google Meet' },
  meetingLink: { type: String, default: '' },
  isCompleted: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coHosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  registrations: { type: [registrationSchema], default: [] },
  feedbacks: { type: [feedbackSchema], default: [] },
  // Users who bookmarked this event (no separate collection)
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Waiting list for full events
  waitingList: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  // Geo-location
  coordinates: {
    type: [Number], // [longitude, latitude]
    index: '2dsphere',
  },

  // Live Engagement Features (Q&A / Polls)
  liveEngagement: {
    isQaActive: { type: Boolean, default: false },
    qaList: [qaSchema],
    polls: [pollSchema]
  },

  // GenLoop AI Features
  ai: {
    posterUrl: { type: String, default: null }, // Stores the base64 or S3 link to the LCM generated image
    generatedDescription: { type: String, default: null }, // The copy from llama.cpp
    engagementScore: { type: Number, default: 0 }, // Score from Scikit-Learn
    keywords: { type: [String], default: [] }
  },

  // Viral Loop Feedback Metrics
  metrics: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    registrations: { type: Number, default: 0 }
  },

  // AI Suggested Gamification
  gamificationRewards: { type: [String], default: [] },

  // Soft delete flags
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Helper method to get combined text for classification
eventSchema.methods.getClassificationText = function () {
  // Combine title, description, tags, and other relevant text fields
  const texts = [
    this.title || '',
    this.description || '',
    this.shortDescription || '',
    (this.tags || []).join(' '),
    this.category || '',
  ];

  return texts.filter((text) => text.length > 0).join(' ');
};

// Method to classify event category using Bayesian classifier
eventSchema.methods.classifyCategory = function () {
  const text = this.getClassificationText();
  if (text.trim().length === 0) {
    return { category: 'General', confidence: 0 };
  }

  try {
    return eventClassifier.classify(text);
  } catch (err) {
    console.error('Error classifying event:', err);
    return { category: this.category || 'General', confidence: 0 };
  }
};

// Method to get top categories for the event
eventSchema.methods.getTopCategories = function (n = 3) {
  const text = this.getClassificationText();
  if (text.trim().length === 0) {
    return [{ category: 'General', probability: 1 }];
  }

  try {
    return eventClassifier.getTopCategories(text, n);
  } catch (err) {
    console.error('Error getting top categories:', err);
    return [{ category: this.category || 'General', probability: 1 }];
  }
};

// Static method to train the classifier
eventSchema.statics.trainClassifier = function (events) {
  // Reset classifier
  const classifier = new BayesianClassifier();

  events.forEach((event) => {
    const text = event.getClassificationText();
    if (text.trim().length > 0 && event.category) {
      classifier.train(text, event.category);
    }
  });

  // Save the trained model
  try {
    const modelPath = path.join(__dirname, '..', 'data', 'eventClassifierModel.json');
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    classifier.saveModel(modelPath);
  } catch (err) {
    console.error('Error saving classifier model:', err);
  }

  return classifier;
};

// Static method to get the global classifier
eventSchema.statics.getClassifier = function () {
  return eventClassifier;
};

// Helpful indexes for common queries
eventSchema.index({ coHosts: 1 });
eventSchema.index({ isPublished: 1, isDeleted: 1, date: -1 });
eventSchema.index({ hostId: 1, isDeleted: 1, date: -1 });
eventSchema.index({ createdAt: -1 });

// Full-text search index for NLP & Semantic broad retrieval
eventSchema.index(
  {
    title: 'text',
    description: 'text',
    shortDescription: 'text',
    category: 'text',
    tags: 'text'
  },
  {
    weights: {
      title: 10,
      tags: 5,
      category: 3,
      shortDescription: 2,
      description: 1
    },
    name: 'SemanticTextIndex'
  }
);

module.exports = mongoose.model('Event', eventSchema);
