
function formatCompactReviewCount(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (num >= 1_000) {
    const k = num / 1_000;
    const s = k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "");
    return `${s}k`;
  }
  return String(num);
}

export default function RatingStars({
  rating = 0,
  max = 5,
  size = "md",
  showNumber = false,
  reviewCount,
  compactReviewCount = false,
  variant = "default",
  className = "",
}) {
  const r = Math.min(max, Math.max(0, Number(rating) || 0));
  const full = Math.floor(r);
  const partial = r - full >= 0.5 ? 1 : 0;
  const empty = max - full - partial;

  const starClass =
    size === "sm"
      ? "h-4 w-4"
      : size === "lg"
        ? "h-8 w-8 sm:h-9 sm:w-9"
        : "h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5";

  const emptyStar =
    variant === "light" ? "text-white/40" : "text-gray-200";
  const numberClass =
    variant === "light" ? "text-white font-bold" : "text-gray-900 font-bold";
  const countClass =
    variant === "light" ? "text-white/90" : "text-gray-600";

  const Star = ({ fill }) => (
    <svg
      className={`${starClass} shrink-0 ${fill ? "text-yelp-red" : emptyStar}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="flex items-center gap-0.5" role="img" aria-label={`${r} out of ${max} stars`}>
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f-${i}`} fill />
        ))}
        {partial ? <Star key="p" fill /> : null}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e-${i}`} fill={false} />
        ))}
      </span>
      {showNumber ? (
        <span className={`text-sm sm:text-base ${numberClass}`}>{r.toFixed(1)}</span>
      ) : null}
      {reviewCount != null ? (
        <span className={`text-sm ${countClass}`}>
          (
          {compactReviewCount
            ? formatCompactReviewCount(reviewCount)
            : Number(reviewCount).toLocaleString()}{" "}
          {Number(reviewCount) === 1 ? "review" : "reviews"})
        </span>
      ) : null}
    </div>
  );
}
