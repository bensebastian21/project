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
  secondDocPath: String,
  // Manual student verification fields
  isStudentIdVerified: { type: Boolean, default: false },
  studentIdVerifiedAt: { type: Date, default: null },
  studentIdNotes: { type: String, default: "" },
  agreeVerification: { type: Boolean, default: false },
  ocrRaw: { type: String, default: "" },
  ocrMismatch: { type: Boolean, default: false },
  profilePic: String, // Path to profile picture
  // Interests used for social/friends suggestions
  interests: [{ type: String }],
  // Host presentation fields (optional)
  website: { type: String, default: "" },
  bannerUrl: { type: String, default: "" },
  socials: {
    twitter: { type: String, default: "" },
    instagram: { type: String, default: "" },
    linkedin: { type: String, default: "" }
  },
  // User-selected badges to display (max 3)
  displayBadges: [{ type: String }],

  // Settings / preferences
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      eventReminders: { type: Boolean, default: true },
      newFromFollowedHosts: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
    },
    privacy: {
      onlyFriendsCanViewProfile: { type: Boolean, default: false },
      allowFriendRequests: { type: Boolean, default: true },
      searchableByEmail: { type: Boolean, default: true },
      showBadgesPublic: { type: Boolean, default: true },
    },
    ui: {
      theme: { type: String, enum: ["system","light","dark"], default: "system" },
      density: { type: String, enum: ["comfortable","compact"], default: "comfortable" },
      sidebarCollapsedDefault: { type: Boolean, default: false },
    },
    connectedApps: {
      googleLinked: { type: Boolean, default: false },
    },
    recommendations: {
      personalizeUsingOnboarding: { type: Boolean, default: true },
      showTrendingFirst: { type: Boolean, default: true },
    }
  },

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

  // Student onboarding completion tracking
  onboardingCompleted: { type: Boolean, default: false },
  onboardingData: {
    // Career preferences
    preferredCareerSectors: [{ type: String }],
    preferredJobRoles: [{ type: String }],
    futurePlan: { type: String },
    careerGoals: { type: String },
    skillsToDevelop: [{ type: String }],
    preferredWorkMode: { type: String },
    preferredCompanyType: [{ type: String }],
    
    // Personal interests and preferences
    hobbies: [{ type: String }],
    eventTypesInterested: [{ type: String }],
    pastEventsAttended: [{ type: String }],
    feedbackInterestLevel: { type: Number, min: 1, max: 5 },
    availabilityPreferences: [{ type: String }],
    willingnessToTravel: { type: String },
    
    // Advanced preferences
    personalityType: { type: String },
    preferredLearningStyle: { type: String },
    motivationLevel: { type: Number, min: 1, max: 10 },
    peerGroups: [{ type: String }]
  },

  // Soft delete flags
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better performance
userSchema.index({ email: 1 }, { unique: true });
// Ensure phone numbers are unique when provided (allow multiple empty strings)
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string", $ne: "" } } }
);
userSchema.index({ role: 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ firebaseUid: 1 });
userSchema.index({ resetCode: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ subscribedHosts: 1 });

module.exports = mongoose.model("User", userSchema);

