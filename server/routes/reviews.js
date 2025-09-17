const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const ReviewField = require("../models/ReviewField");
const Event = require("../models/Event");
const User = require("../models/User");

// Reuse auth helpers from auth routes
const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

// Get review fields for an event (public)
router.get("/events/:eventId/fields", async (req, res) => {
  try {
    const { eventId } = req.params;
    const fields = await ReviewField.find({ eventId }).sort({ order: 1 });
    res.json(fields);
  } catch (err) {
    console.error("Get review fields error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create/Update review fields for an event (host only)
router.post("/events/:eventId/fields", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { fields } = req.body;

    // Verify the user is the host of this event
    const event = await Event.findOne({ _id: eventId, hostId: req.user.id });
    if (!event) {
      return res.status(404).json({ error: "Event not found or access denied" });
    }

    // Delete existing fields
    await ReviewField.deleteMany({ eventId });

    // Create new fields
    const newFields = fields.map((field, index) => ({
      eventId,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      isRequired: field.isRequired || false,
      placeholder: field.placeholder || "",
      order: index
    }));

    const createdFields = await ReviewField.insertMany(newFields);
    res.json({ message: "✅ Review fields updated", fields: createdFields });
  } catch (err) {
    console.error("Create review fields error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Submit a review for an event
router.post("/events/:eventId/reviews", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { overallRating, reviewFields, comment, isAnonymous } = req.body;

    const { Types } = require("mongoose");
    if (!Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }
    const eid = new Types.ObjectId(eventId);

    // Check if event exists and is completed
    const event = await Event.findOne({ _id: eid, isCompleted: true });
    if (!event) {
      return res.status(404).json({ error: "Event not found or not completed yet" });
    }

    // Check if user has already reviewed this event
    const existingReview = await Review.findOne({ eventId: eid, reviewerId: req.user.id });
    if (existingReview) {
      return res.status(400).json({ error: "You have already reviewed this event" });
    }

    // Validate review fields
    const eventFields = await ReviewField.find({ eventId: eid }).sort({ order: 1 });
    const validatedFields = [];

    for (const field of eventFields) {
      const submittedField = (reviewFields || []).find(f => f.fieldName === field.fieldName);
      
      if (field.isRequired && !submittedField) {
        return res.status(400).json({ error: `Field '${field.fieldName}' is required` });
      }

      if (submittedField) {
        // Validate field value based on type
        if (field.fieldType === "rating") {
          if (typeof submittedField.rating !== "number" || submittedField.rating < 1 || submittedField.rating > 5) {
            return res.status(400).json({ error: `Field '${field.fieldName}' must be a rating between 1-5` });
          }
        } else if (field.fieldType === "text" || field.fieldType === "textarea") {
          if (typeof submittedField.value !== "string" || submittedField.value.trim().length === 0) {
            return res.status(400).json({ error: `Field '${field.fieldName}' cannot be empty` });
          }
        }

        // Push only relevant keys to match schema requirements
        const fieldDoc = { fieldName: field.fieldName, fieldType: field.fieldType };
        if (field.fieldType === "rating") {
          fieldDoc.rating = submittedField.rating;
        } else {
          fieldDoc.value = submittedField.value;
        }
        validatedFields.push(fieldDoc);
      }
    }

    // Create the review
    const review = new Review({
      eventId: eid,
      reviewerId: req.user.id,
      overallRating,
      reviewFields: validatedFields,
      comment: comment || "",
      isAnonymous: isAnonymous || false
    });

    await review.save();

    // Populate reviewer info for response
    await review.populate("reviewerId", "fullname email");

    res.json({ message: "✅ Review submitted successfully", review });
  } catch (err) {
    console.error("Submit review error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get reviews for an event (public)
router.get("/events/:eventId/reviews", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Normalize pagination params
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const { Types } = require("mongoose");
    const isValidId = Types.ObjectId.isValid(eventId);

    // Build filter with safe casting
    const filter = isValidId ? { eventId: new Types.ObjectId(eventId) } : { eventId };

    let reviews = [];
    let total = 0;

    // Fetch reviews with pagination and count
    try {
      reviews = await Review.find(filter)
        .populate("reviewerId", "fullname email")
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);

      total = await Review.countDocuments(filter);
    } catch (findErr) {
      console.error("Reviews find/count error:", findErr);
      return res.json({
        reviews: [],
        totalPages: 0,
        currentPage: pageNum,
        totalReviews: 0,
        averageRating: 0
      });
    }

    // Calculate average rating robustly
    let averageRating = 0;
    if (isValidId) {
      try {
        const agg = await Review.aggregate([
          { $match: { eventId: new Types.ObjectId(eventId) } },
          { $group: { _id: null, average: { $avg: "$overallRating" } } }
        ]);
        averageRating = agg?.[0]?.average || 0;
      } catch (aggErr) {
        console.error("Reviews average aggregate error:", aggErr);
        if (reviews.length > 0) {
          averageRating = reviews.reduce((s, r) => s + (r.overallRating || 0), 0) / reviews.length;
        }
      }
    } else {
      // Fallback: compute average from fetched page if ID is not a valid ObjectId
      if (reviews.length > 0) {
        averageRating = reviews.reduce((s, r) => s + (r.overallRating || 0), 0) / reviews.length;
      }
    }

    return res.json({
      reviews,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      totalReviews: total,
      averageRating
    });
  } catch (err) {
    console.error("Get reviews error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Get user's review for an event
router.get("/events/:eventId/reviews/my", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const review = await Review.findOne({ eventId, reviewerId: req.user.id })
      .populate("reviewerId", "fullname email");

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json(review);
  } catch (err) {
    console.error("Get my review error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update user's review
router.put("/events/:eventId/reviews/my", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { overallRating, reviewFields, comment, isAnonymous } = req.body;

    const review = await Review.findOne({ eventId, reviewerId: req.user.id });
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Validate review fields (same logic as create)
    const eventFields = await ReviewField.find({ eventId }).sort({ order: 1 });
    const validatedFields = [];

    for (const field of eventFields) {
      const submittedField = reviewFields.find(f => f.fieldName === field.fieldName);
      
      if (field.isRequired && !submittedField) {
        return res.status(400).json({ error: `Field '${field.fieldName}' is required` });
      }

      if (submittedField) {
        if (field.fieldType === "rating") {
          if (typeof submittedField.rating !== "number" || submittedField.rating < 1 || submittedField.rating > 5) {
            return res.status(400).json({ error: `Field '${field.fieldName}' must be a rating between 1-5` });
          }
        } else if (field.fieldType === "text" || field.fieldType === "textarea") {
          if (typeof submittedField.value !== "string" || submittedField.value.trim().length === 0) {
            return res.status(400).json({ error: `Field '${field.fieldName}' cannot be empty` });
          }
        }

        validatedFields.push({
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          value: submittedField.value,
          rating: submittedField.rating
        });
      }
    }

    // Update the review
    review.overallRating = overallRating;
    review.reviewFields = validatedFields;
    review.comment = comment || "";
    review.isAnonymous = isAnonymous || false;
    review.updatedAt = new Date();

    await review.save();
    await review.populate("reviewerId", "fullname email");

    res.json({ message: "✅ Review updated successfully", review });
  } catch (err) {
    console.error("Update review error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete user's review
router.delete("/events/:eventId/reviews/my", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const deleted = await Review.findOneAndDelete({ eventId, reviewerId: req.user.id });
    
    if (!deleted) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json({ message: "✅ Review deleted successfully" });
  } catch (err) {
    console.error("Delete review error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get event review statistics (host only)
router.get("/events/:eventId/reviews/stats", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify the user is the host of this event
    const event = await Event.findOne({ _id: eventId, hostId: req.user.id });
    if (!event) {
      return res.status(404).json({ error: "Event not found or access denied" });
    }

    const { Types } = require("mongoose");
    let stats = [];
    if (Types.ObjectId.isValid(eventId)) {
      stats = await Review.aggregate([
        { $match: { eventId: Types.ObjectId(eventId) } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: "$overallRating" },
            ratingDistribution: { $push: "$overallRating" }
          }
        }
      ]);
    } else {
      // Fallback for non-ObjectId IDs
      const list = await Review.find({ eventId }).select("overallRating");
      stats = [{
        totalReviews: list.length,
        averageRating: list.length ? (list.reduce((s, r) => s + (r.overallRating || 0), 0) / list.length) : 0,
        ratingDistribution: list.map(r => r.overallRating || 0)
      }];
    }

    // Calculate rating distribution
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (stats[0]?.ratingDistribution) {
      stats[0].ratingDistribution.forEach(rating => {
        ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
      });
    }

    res.json({
      totalReviews: stats[0]?.totalReviews || 0,
      averageRating: stats[0]?.averageRating || 0,
      ratingDistribution: ratingCounts
    });
  } catch (err) {
    console.error("Get review stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
