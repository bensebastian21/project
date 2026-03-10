import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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
  ThumbsDown,
} from 'lucide-react';
import api from '../utils/api';

const bearer = () => {
  const token = localStorage.getItem('token');
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
    comment: '',
    isAnonymous: false,
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
      const eventData = eventRes.data.find((e) => e._id === eventId);
      setEvent(eventData);

      // Fetch review fields
      const fieldsRes = await api.get(`/api/reviews/events/${eventId}/fields`);
      setReviewFields(fieldsRes.data);

      // Initialize form data with fields
      const initialFields = fieldsRes.data.map((field) => ({
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        value: '',
        rating: 0,
      }));

      setFormData((prev) => ({
        ...prev,
        reviewFields: initialFields,
      }));

      // Check if user has existing review
      try {
        const reviewRes = await api.get(`/api/reviews/events/${eventId}/reviews/my`, {
          headers: bearer(),
        });
        setExistingReview(reviewRes.data);

        // Populate form with existing review data
        if (reviewRes.data) {
          setFormData({
            overallRating: reviewRes.data.overallRating,
            reviewFields: reviewRes.data.reviewFields || initialFields,
            comment: reviewRes.data.comment || '',
            isAnonymous: reviewRes.data.isAnonymous || false,
          });
        }
      } catch (err) {
        // User hasn't reviewed yet, that's fine
        console.log('No existing review found');
      }

      // Fetch all reviews for display
      const allReviewsRes = await api.get(`/api/reviews/events/${eventId}/reviews`);
      setReviews(allReviewsRes.data.reviews || []);
    } catch (err) {
      console.error('Error fetching event data:', err);
      toast.error('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (rating) => {
    setFormData((prev) => ({ ...prev, overallRating: rating }));
  };

  const handleFieldChange = (fieldName, value, rating = null) => {
    setFormData((prev) => {
      // Ensure the field exists in state; if not, add it
      const idx = prev.reviewFields.findIndex((f) => f.fieldName === fieldName);
      if (idx === -1) {
        const def = reviewFields.find((f) => f.fieldName === fieldName);
        const newEntry = {
          fieldName,
          fieldType: def?.fieldType || 'text',
          value: value ?? '',
          rating: rating ?? 0,
        };
        return { ...prev, reviewFields: [...prev.reviewFields, newEntry] };
      }
      // Update existing field; use nullish coalescing to preserve 0 ratings
      const updated = prev.reviewFields.map((f) =>
        f.fieldName === fieldName ? { ...f, value, rating: rating ?? f.rating } : f
      );
      return { ...prev, reviewFields: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canReview) {
      toast.info('Reviews will be available once the host marks this event as completed.');
      return;
    }

    if (formData.overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    // Check required fields
    for (const field of reviewFields) {
      if (field.isRequired) {
        const formField = formData.reviewFields.find((f) => f.fieldName === field.fieldName);
        if (
          !formField ||
          (field.fieldType === 'rating' ? formField.rating === 0 : !formField.value.trim())
        ) {
          toast.error(`Please fill in the required field: ${field.fieldName}`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      if (existingReview) {
        await api.put(`/api/reviews/events/${eventId}/reviews/my`, formData, { headers: bearer() });
        toast.success('✅ Review updated successfully!');
      } else {
        await api.post(`/api/reviews/events/${eventId}/reviews`, formData, { headers: bearer() });
        toast.success('✅ Review submitted successfully!');
      }

      // Refresh data
      await fetchEventData();
    } catch (err) {
      console.error('Error submitting review:', err);
      toast.error('❌ ' + (err?.response?.data?.error || 'Failed to submit review'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;

    try {
      await api.delete(`/api/reviews/events/${eventId}/reviews/my`, { headers: bearer() });
      toast.success('✅ Review deleted successfully!');
      await fetchEventData();
    } catch (err) {
      console.error('Error deleting review:', err);
      toast.error('❌ ' + (err?.response?.data?.error || 'Failed to delete review'));
    }
  };

  const renderStarRating = (rating, onRatingChange, size = 'w-6 h-6') => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`${size} transition-colors duration-200 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-400 hover:text-yellow-300'
            }`}
          >
            <Star />
          </button>
        ))}
      </div>
    );
  };

  const renderField = (field) => {
    const formField = formData.reviewFields.find((f) => f.fieldName === field.fieldName);

    switch (field.fieldType) {
      case 'rating':
        return (
          <div key={field.fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {field.fieldName} {field.isRequired && <span className="text-red-400">*</span>}
            </label>
            {renderStarRating(formField?.rating || 0, (rating) =>
              handleFieldChange(field.fieldName, '', rating)
            )}
          </div>
        );

      case 'text':
        return (
          <div key={field.fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {field.fieldName} {field.isRequired && <span className="text-red-400">*</span>}
            </label>
            <input
              type="text"
              value={formField?.value || ''}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
              placeholder={field.placeholder}
              className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {field.fieldName} {field.isRequired && <span className="text-red-400">*</span>}
            </label>
            <textarea
              value={formField?.value || ''}
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
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center font-sans tracking-tight">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
          <p className="font-black uppercase tracking-widest text-black">Loading...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center font-sans tracking-tight p-4">
        <div className="text-center bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full">
          <h1 className="text-3xl font-black uppercase tracking-widest text-black mb-6">
            Event not found
          </h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-6 py-4 bg-yellow-400 text-black font-black uppercase tracking-widest border-2 border-black hover:bg-yellow-300 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0 active:shadow-none"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-black font-sans tracking-tight">
      {/* Header */}
      <div className="bg-white border-b-2 border-black px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-3 bg-yellow-400 border-2 border-black hover:bg-yellow-300 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-widest text-black">
                Review Event
              </h1>
              <p className="text-neutral-500 font-bold tracking-widest text-sm uppercase">
                Share your experience
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Event Info */}
        <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-black text-black mb-3">{event.title}</h2>
              <div className="flex flex-wrap items-center gap-4 text-black text-sm mb-4 font-bold uppercase tracking-widest">
                <div className="flex items-center space-x-1 bg-yellow-100 border-2 border-black px-2 py-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(event.date).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1 bg-blue-100 border-2 border-black px-2 py-1">
                  <MapPin className="w-4 h-4" />
                  <span>{event.isOnline ? 'Online' : event.location}</span>
                </div>
                {event.isCompleted && (
                  <div className="flex items-center space-x-1 bg-emerald-100 border-2 border-black px-2 py-1 text-emerald-900">
                    <CheckCircle className="w-4 h-4" />
                    <span>Completed</span>
                  </div>
                )}
              </div>
              <p className="text-neutral-700 font-medium bg-neutral-50 p-4 border-2 border-dashed border-neutral-300">
                {event.shortDescription || event.description}
              </p>
            </div>
          </div>
        </div>

        {/* Review Form */}
        <div className="bg-white border-2 border-black p-6 lg:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-2xl font-black uppercase tracking-widest text-black mb-8 flex items-center border-b-2 border-black pb-4">
            <MessageSquare className="w-8 h-8 mr-3 text-black" />
            {existingReview ? 'Update Your Review' : 'Write a Review'}
          </h3>

          {!canReview && (
            <div className="mb-6 p-4 bg-yellow-100 border-2 border-black font-bold uppercase tracking-widest text-sm text-yellow-900">
              Reviews are disabled until the host marks this event as completed.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8" aria-disabled={!canReview}>
            {/* Overall Rating */}
            <div className="space-y-3 bg-neutral-50 p-6 border-2 border-black">
              <label className="block text-lg font-black uppercase tracking-widest text-black">
                Overall rating <span className="text-red-600">*</span>
              </label>
              <div className={canReview ? '' : 'opacity-60 pointer-events-none'}>
                {renderStarRating(
                  formData.overallRating,
                  (r) => canReview && handleRatingChange(r),
                  'w-10 h-10'
                )}
              </div>
              {formData.overallRating > 0 && (
                <div className="text-sm font-bold uppercase tracking-widest text-neutral-600">
                  You rated this {formData.overallRating} out of 5
                </div>
              )}
            </div>
            {/* Custom Fields */}
            {reviewFields.length > 0 && (
              <div className="space-y-6">
                <h4 className="text-lg font-black uppercase tracking-widest text-black">
                  Additional Feedback
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviewFields.map((f) => (
                    <div
                      key={f.fieldName}
                      className={
                        canReview
                          ? 'bg-white border-2 border-black p-4'
                          : 'opacity-60 pointer-events-none bg-white border-2 border-black p-4'
                      }
                    >
                      {renderField(f)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            <div className="space-y-3">
              <label className="block text-lg font-black uppercase tracking-widest text-black">
                Additional Comments
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) =>
                  canReview && setFormData((prev) => ({ ...prev, comment: e.target.value }))
                }
                placeholder="Share your detailed experience..."
                rows="4"
                disabled={!canReview}
                className="w-full p-4 bg-white border-2 border-black focus:ring-4 focus:ring-blue-400 focus:outline-none transition-all block text-black font-medium resize-none placeholder:text-neutral-400"
              />
            </div>

            {/* Anonymous Option */}
            <div className="flex items-center space-x-3 bg-neutral-50 p-4 border-2 border-black w-max cursor-pointer hover:bg-neutral-100 transition-colors">
              <input
                type="checkbox"
                id="isAnonymous"
                checked={formData.isAnonymous}
                onChange={(e) =>
                  canReview && setFormData((prev) => ({ ...prev, isAnonymous: e.target.checked }))
                }
                className="w-5 h-5 text-black bg-white border-2 border-black rounded-none focus:ring-2 focus:ring-black focus:ring-offset-2 appearance-none checked:bg-black relative
                  after:content-[''] after:absolute after:hidden checked:after:block after:left-[6px] after:top-[2px] after:w-[5px] after:h-[10px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45"
              />
              <label
                htmlFor="isAnonymous"
                className="font-bold uppercase tracking-widest text-sm text-black cursor-pointer"
              >
                Submit anonymously
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-6 mt-6 border-t-2 border-black">
              <button
                type="submit"
                disabled={submitting || !canReview}
                className="flex items-center space-x-2 px-8 py-4 bg-black text-white font-black uppercase tracking-widest border-2 border-transparent hover:bg-neutral-800 transition-colors hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:pointer-events-none"
              >
                <Send className="w-5 h-5" />
                <span>
                  {submitting
                    ? 'Submitting...'
                    : existingReview
                      ? 'Update Review'
                      : 'Submit Review'}
                </span>
              </button>

              {existingReview && (
                <button
                  type="button"
                  onClick={handleDeleteReview}
                  className="flex items-center space-x-2 px-8 py-4 bg-red-100 text-red-700 font-black uppercase tracking-widest border-2 border-red-700 hover:bg-red-200 transition-colors hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(185,28,28,1)] active:translate-y-0 active:shadow-none"
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
          <div className="bg-white border-2 border-black p-6 lg:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-8">
            <h3 className="text-2xl font-black uppercase tracking-widest text-black mb-8 flex items-center border-b-2 border-black pb-4">
              <Star className="w-8 h-8 mr-3 text-black" />
              Reviews ({reviews.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-50 border-2 border-black p-6 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col group"
                >
                  <div className="flex items-start justify-between mb-4 border-b-2 border-black pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white border-2 border-black rounded-full flex items-center justify-center overflow-hidden">
                        <User className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-widest text-black text-sm">
                          {review.isAnonymous
                            ? 'Anonymous'
                            : review.reviewerId?.fullname || 'Unknown'}
                        </p>
                        <p className="text-neutral-500 font-bold tracking-widest text-xs uppercase">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center space-x-1 mb-4">
                    {renderStarRating(review.overallRating, () => {}, 'w-5 h-5')}
                  </div>

                  {/* Custom Fields */}
                  {review.reviewFields && review.reviewFields.length > 0 && (
                    <div className="mb-4 bg-white border-2 border-black p-4 space-y-2">
                      {review.reviewFields.map((field, fieldIdx) => (
                        <div key={fieldIdx} className="flex items-center justify-between">
                          <span className="text-xs font-black text-black uppercase tracking-widest">
                            {field.fieldName}
                          </span>
                          {field.fieldType === 'rating' ? (
                            <div className="inline-flex items-center">
                              {renderStarRating(field.rating, () => {}, 'w-3 h-3')}
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-600 font-bold uppercase tracking-widest">
                              {field.value}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {review.comment && (
                    <div className="mt-auto pt-4 relative">
                      <div className="absolute left-0 top-4 bottom-0 w-1 bg-black"></div>
                      <p className="text-black text-sm font-medium leading-relaxed italic pl-4">
                        "{review.comment}"
                      </p>
                    </div>
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
