import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { 
  Star, 
  ArrowLeft, 
  Send, 
  Edit3, 
  Trash2, 
  User, 
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import api from "../utils/api";

const bearer = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function ReviewPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [reviewFields, setReviewFields] = useState([]);
  const [existingReview, setExistingReview] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    overallRating: 0,
    reviewFields: [],
    comment: "",
    isAnonymous: false
  });

  const canReview = Boolean(event?.isCompleted);

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const eventRes = await api.get(`/api/host/public/events`);
      const eventData = eventRes.data.find(e => e._id === eventId);
      setEvent(eventData);

      // Fetch review fields
      const fieldsRes = await api.get(`/api/reviews/events/${eventId}/fields`);
      setReviewFields(fieldsRes.data);

      // Initialize form data with fields
      const initialFields = fieldsRes.data.map(field => ({
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        value: "",
        rating: 0
      }));
      
      setFormData(prev => ({
        ...prev,
        reviewFields: initialFields
      }));

      // Check if user has existing review
      try {
        const reviewRes = await api.get(`/api/reviews/events/${eventId}/reviews/my`, { headers: bearer() });
        setExistingReview(reviewRes.data);
        
        // Populate form with existing review data
        if (reviewRes.data) {
          setFormData({
            overallRating: reviewRes.data.overallRating,
            reviewFields: reviewRes.data.reviewFields || initialFields,
            comment: reviewRes.data.comment || "",
            isAnonymous: reviewRes.data.isAnonymous || false
          });
        }
      } catch (err) {
        // User hasn't reviewed yet, that's fine
        console.log("No existing review found");
      }

      // Fetch all reviews for display
      const allReviewsRes = await api.get(`/api/reviews/events/${eventId}/reviews`);
      setReviews(allReviewsRes.data.reviews || []);

    } catch (err) {
      console.error("Error fetching event data:", err);
      toast.error("Failed to load event data");
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (rating) => {
    setFormData(prev => ({ ...prev, overallRating: rating }));
  };

  const handleFieldChange = (fieldName, value, rating = null) => {
    setFormData(prev => {
      // Ensure the field exists in state; if not, add it
      const idx = prev.reviewFields.findIndex(f => f.fieldName === fieldName);
      if (idx === -1) {
        const def = reviewFields.find(f => f.fieldName === fieldName);
        const newEntry = {
          fieldName,
          fieldType: def?.fieldType || "text",
          value: value ?? "",
          rating: rating ?? 0
        };
        return { ...prev, reviewFields: [...prev.reviewFields, newEntry] };
      }
      // Update existing field; use nullish coalescing to preserve 0 ratings
      const updated = prev.reviewFields.map(f => 
        f.fieldName === fieldName 
          ? { ...f, value, rating: (rating ?? f.rating) }
          : f
      );
      return { ...prev, reviewFields: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canReview) {
      toast.info("Reviews will be available once the host marks this event as completed.");
      return;
    }
    
    if (formData.overallRating === 0) {
      toast.error("Please provide an overall rating");
      return;
    }

    // Check required fields
    for (const field of reviewFields) {
      if (field.isRequired) {
        const formField = formData.reviewFields.find(f => f.fieldName === field.fieldName);
        if (!formField || (field.fieldType === "rating" ? formField.rating === 0 : !formField.value.trim())) {
          toast.error(`Please fill in the required field: ${field.fieldName}`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      
      if (existingReview) {
        await api.put(`/api/reviews/events/${eventId}/reviews/my`, formData, { headers: bearer() });
        toast.success("✅ Review updated successfully!");
      } else {
        await api.post(`/api/reviews/events/${eventId}/reviews`, formData, { headers: bearer() });
        toast.success("✅ Review submitted successfully!");
      }
      
      // Refresh data
      await fetchEventData();
      
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error("❌ " + (err?.response?.data?.error || "Failed to submit review"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!window.confirm("Are you sure you want to delete your review?")) return;
    
    try {
      await api.delete(`/api/reviews/events/${eventId}/reviews/my`, { headers: bearer() });
      toast.success("✅ Review deleted successfully!");
      await fetchEventData();
    } catch (err) {
      console.error("Error deleting review:", err);
      toast.error("❌ " + (err?.response?.data?.error || "Failed to delete review"));
    }
  };

  const renderStarRating = (rating, onRatingChange, size = "w-6 h-6") => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`${size} transition-colors duration-200 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-400 hover:text-yellow-300"
            }`}
          >
            <Star />
          </button>
        ))}
      </div>
    );
  };

  const renderField = (field) => {
    const formField = formData.reviewFields.find(f => f.fieldName === field.fieldName);
    
    switch (field.fieldType) {
      case "rating":
        return (
          <div key={field.fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {field.fieldName} {field.isRequired && <span className="text-red-400">*</span>}
            </label>
            {renderStarRating(formField?.rating || 0, (rating) => handleFieldChange(field.fieldName, "", rating))}
          </div>
        );
      
      case "text":
        return (
          <div key={field.fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {field.fieldName} {field.isRequired && <span className="text-red-400">*</span>}
            </label>
            <input
              type="text"
              value={formField?.value || ""}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              placeholder={field.placeholder}
              className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        );
      
      case "textarea":
        return (
          <div key={field.fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {field.fieldName} {field.isRequired && <span className="text-red-400">*</span>}
            </label>
            <textarea
              value={formField?.value || ""}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              placeholder={field.placeholder}
              rows="3"
              className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Event not found</h1>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Review Event
              </h1>
              <p className="text-gray-400">Share your experience</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Event Info */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{event.title}</h2>
              <div className="flex items-center space-x-4 text-gray-400 text-sm mb-3">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>{new Date(event.date).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span>{event.isOnline ? "Online" : event.location}</span>
                </div>
                {event.isCompleted && (
                  <div className="flex items-center space-x-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Completed</span>
                  </div>
                )}
              </div>
              <p className="text-gray-300">{event.shortDescription || event.description}</p>
            </div>
          </div>
        </div>

        {/* Review Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-xl font-semibold mb-6 flex items-center">
            <MessageSquare className="w-6 h-6 mr-2 text-blue-400" />
            {existingReview ? "Update Your Review" : "Write a Review"}
          </h3>

          {!canReview && (
            <div className="mb-4 p-4 rounded-xl border border-yellow-700/50 bg-yellow-900/30 text-yellow-200">
              Reviews are disabled until the host marks this event as completed.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" aria-disabled={!canReview}>
            {/* Overall Rating */}
            <div className="space-y-2">
              <label className="block text-lg font-medium text-gray-300">
                Overall rating <span className="text-red-400">*</span>
              </label>
              <div className={canReview ? "" : "opacity-60 pointer-events-none"}>
                {renderStarRating(formData.overallRating, (r) => canReview && handleRatingChange(r), "w-7 h-7")}
              </div>
              {formData.overallRating > 0 && (
                <div className="text-sm text-gray-400">You rated this {formData.overallRating} out of 5</div>
              )}
            </div>
            {/* Custom Fields */}
            {reviewFields.length > 0 && (
              <div className="space-y-6">
                <h4 className="text-lg font-medium text-gray-300">Additional Feedback</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviewFields.map((f) => (
                    <div key={f.fieldName} className={canReview ? "" : "opacity-60 pointer-events-none"}>
                      {renderField(f)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            <div className="space-y-3">
              <label className="block text-lg font-medium text-gray-300">
                Additional Comments
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => canReview && setFormData(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Share your detailed experience..."
                rows="4"
                disabled={!canReview}
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
            </div>

            {/* Anonymous Option */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isAnonymous"
                checked={formData.isAnonymous}
                onChange={(e) => canReview && setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isAnonymous" className="text-gray-300">
                Submit anonymously
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center space-x-4 pt-6">
              <button
                type="submit"
                disabled={submitting || !canReview}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                <span>{submitting ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}</span>
              </button>
              
              {existingReview && (
                <button
                  type="button"
                  onClick={handleDeleteReview}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-600/80 hover:bg-red-700 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete Review</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Reviews Display */}
        {reviews.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Star className="w-6 h-6 mr-2 text-yellow-400" />
              Reviews ({reviews.length})
            </h3>
            
            <div className="space-y-4">
              {reviews.map((review, idx) => (
                <div key={idx} className="bg-gray-700/50 rounded-xl p-6 border border-gray-600/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {review.isAnonymous ? "Anonymous" : review.reviewerId?.fullname || "Unknown"}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {renderStarRating(review.overallRating, () => {}, "w-4 h-4")}
                    </div>
                  </div>
                  
                  {/* Custom Fields */}
                  {review.reviewFields && review.reviewFields.length > 0 && (
                    <div className="mb-4">
                      {review.reviewFields.map((field, fieldIdx) => (
                        <div key={fieldIdx} className="mb-2">
                          <span className="text-sm font-medium text-gray-400">{field.fieldName}:</span>
                          {field.fieldType === "rating" ? (
                            <div className="inline-flex items-center ml-2">
                              {renderStarRating(field.rating, () => {}, "w-3 h-3")}
                            </div>
                          ) : (
                            <span className="text-gray-300 ml-2">{field.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {review.comment && (
                    <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
