import RatingStars from "./RatingStars";

function initials(name) {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ReviewCard({ review, className = "" }) {
  const {
    author_display_name,
    rating,
    body,
    created_at,
    photos = [],
  } = review;

  const name = author_display_name || "Diner";

  return (
    <article
      className={`py-6 sm:py-7 border-b border-gray-100 last:border-0 ${className}`}
    >
      <div className="flex gap-4 sm:gap-5">
        <div
          className="shrink-0 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-700 border border-gray-300/60"
          aria-hidden
        >
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-bold text-gray-900 text-base">{name}</span>
            <time className="text-sm text-gray-500 font-medium" dateTime={created_at}>
              {formatDate(created_at)}
            </time>
          </div>
          <div className="mt-2">
            <RatingStars rating={rating} size="sm" />
          </div>
          {body ? (
            <p className="mt-3 text-[0.9375rem] sm:text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
              {body}
            </p>
          ) : null}
          {photos?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {photos.map((ph) => (
                <a
                  key={ph.id}
                  href={ph.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border border-gray-200 w-[5.5rem] h-[5.5rem] sm:w-28 sm:h-28 shrink-0 hover:opacity-90 hover:border-gray-300 transition-all duration-200 shadow-sm"
                >
                  <img
                    src={ph.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
