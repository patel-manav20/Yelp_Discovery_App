import { useState } from "react";
import RestaurantPhotoUploadSection from "../restaurants/RestaurantPhotoUploadSection";

const MAX_PHOTOS = 5;
const MAX_BODY = 5000;

export default function ReviewForm({
  initialRating = 0,
  initialBody = "",
  initialPhotoUrls = [],
  onSubmit,
  submitting = false,
  submitLabel = "Post review",
  className = "",
}) {
  const [rating, setRating] = useState(initialRating);
  const [body, setBody] = useState(initialBody);
  const [photoUrls, setPhotoUrls] = useState(initialPhotoUrls.slice(0, MAX_PHOTOS));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) return;
    const urls = photoUrls.map((u) => u.trim()).filter(Boolean).slice(0, MAX_PHOTOS);
    onSubmit?.({
      rating,
      body: body.trim() || null,
      photo_urls: urls,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm ${className}`}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Write a review</h3>

      <div className="mb-4">
        <span className="block text-sm font-medium text-gray-700 mb-2">Rating</span>
        <div className="flex gap-1" role="group" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-yelp-red ${
                star <= rating ? "text-yelp-red" : "text-gray-200"
              }`}
              aria-pressed={star <= rating}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              <svg className="h-8 w-8 sm:h-9 sm:w-9" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
        {rating === 0 ? (
          <p className="text-xs text-gray-500 mt-1">Select a star rating to continue.</p>
        ) : null}
      </div>

      <div className="mb-4">
        <label htmlFor="review-body" className="block text-sm font-medium text-gray-700 mb-2">
          Your review
        </label>
        <textarea
          id="review-body"
          rows={5}
          maxLength={MAX_BODY}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your experience…"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red resize-y min-h-[120px]"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{body.length} / {MAX_BODY}</p>
      </div>

      <div className="mb-4">
        <span className="block text-sm font-medium text-gray-700 mb-2">
          Photos (optional, max {MAX_PHOTOS})
        </span>
        <RestaurantPhotoUploadSection
          urls={photoUrls}
          onUrlsChange={setPhotoUrls}
          maxPhotos={MAX_PHOTOS}
          disabled={submitting}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || rating < 1}
        className="w-full sm:w-auto px-6 py-2.5 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
      >
        {submitting ? "Posting…" : submitLabel}
      </button>
    </form>
  );
}
