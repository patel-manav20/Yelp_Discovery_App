import { Link } from "react-router-dom";
import RatingStars from "../reviews/RatingStars";
import { getRestaurantImageFallback } from "../../utils/restaurantImage";

function priceDots(level) {
  if (!level || level < 1) return null;
  return "$".repeat(Math.min(4, level));
}

function formatLocation(city, state) {
  if (!city) return "";
  return state ? `${city}, ${state}` : city;
}

function cuisineLine(tags) {
  if (!tags?.length) return null;
  return tags.slice(0, 3).join(" · ");
}

export default function RestaurantCard({
  restaurant,
  to,
  description,
  isFavorited = false,
  onFavoriteToggle,
  className = "",
}) {
  const {
    id,
    name,
    city,
    state,
    average_rating,
    review_count,
    price_level,
    cuisine_tags,
    primary_photo_url,
  } = restaurant;

  const href = to ?? `/restaurants/${id}`;
  const imgSrc = primary_photo_url || getRestaurantImageFallback(name, cuisine_tags);
  const snippet =
    description?.trim() ||
    (restaurant.description != null ? restaurant.description : null);

  return (
    <article
      className={`relative rounded-xl border border-gray-200 bg-white shadow-card hover:shadow-card-hover hover:border-gray-300 transition-all duration-200 overflow-hidden ${className}`}
    >
      <Link
        to={href}
        className="flex flex-col sm:flex-row sm:items-stretch group focus:outline-none focus-visible:ring-2 focus-visible:ring-yelp-red focus-visible:ring-offset-2 rounded-xl"
      >
        <div className="relative sm:w-[11.5rem] md:w-[13.5rem] lg:w-[15rem] shrink-0 aspect-[16/10] sm:aspect-auto sm:min-h-[152px] bg-gray-100">
          <img
            src={imgSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:opacity-[0.92] transition-opacity duration-200"
            loading="lazy"
          />
        </div>

        <div className="flex-1 p-4 sm:p-5 min-w-0 text-left flex flex-col justify-center">
          <div className="flex items-start justify-between gap-2 pr-11 sm:pr-12">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight group-hover:text-yelp-red transition-colors duration-200 line-clamp-2 leading-snug">
              {name}
            </h2>
          </div>

          <div className="mt-1.5">
            <RatingStars
              rating={average_rating}
              size="sm"
              reviewCount={review_count}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-gray-700 leading-snug">
            {(() => {
              const metas = [];
              const p = priceDots(price_level);
              if (p) metas.push({ key: "price", node: <span className="font-semibold text-gray-900">{p}</span> });
              const c = cuisineLine(cuisine_tags);
              if (c) metas.push({ key: "cuisine", node: <span className="text-gray-700">{c}</span> });
              const loc = formatLocation(city, state);
              if (loc) metas.push({ key: "loc", node: <span className="text-gray-600">{loc}</span> });
              return metas.flatMap((item, i) =>
                i === 0
                  ? [<span key={item.key}>{item.node}</span>]
                  : [
                      <span key={`dot-${item.key}`} className="text-gray-300 select-none" aria-hidden>
                        ·
                      </span>,
                      <span key={item.key}>{item.node}</span>,
                    ]
              );
            })()}
          </div>

          {snippet ? (
            <p className="mt-2.5 text-sm text-gray-600 leading-relaxed line-clamp-2">{snippet}</p>
          ) : null}
        </div>
      </Link>

      {onFavoriteToggle ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteToggle(id, !isFavorited);
          }}
          className="absolute top-3 right-3 z-10 p-2.5 rounded-full border border-gray-200 bg-white shadow-card hover:bg-red-50 hover:border-yelp-red/35 hover:shadow-md transition-all duration-200"
          aria-pressed={isFavorited}
          aria-label={isFavorited ? "Remove from favorites" : "Save restaurant"}
        >
          <svg
            className={`h-5 w-5 ${isFavorited ? "text-yelp-red fill-yelp-red" : "text-gray-500"}`}
            fill={isFavorited ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      ) : null}
    </article>
  );
}
